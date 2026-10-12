import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { cancelBooking, createBooking, fetchBookings, fetchRooms } from './api'
import type { Booking } from './types'

const bookingsKey = (roomId: string, date: string) => ['bookings', roomId, date] as const

export function useRooms() {
  return useQuery({ queryKey: ['rooms'], queryFn: fetchRooms })
}

export function useBookings(roomId: string | undefined, date: string) {
  return useQuery({
    queryKey: bookingsKey(roomId ?? '', date),
    queryFn: () => fetchBookings(roomId!, date),
    enabled: roomId !== undefined,
  })
}

export function useCreateBooking(roomId: string, date: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createBooking,
    // Refetch on success and failure: a rejection may mean the schedule is stale.
    onSettled: () => queryClient.invalidateQueries({ queryKey: bookingsKey(roomId, date) }),
  })
}

export function useCancelBooking(roomId: string, date: string) {
  const queryClient = useQueryClient()
  const key = bookingsKey(roomId, date)

  return useMutation({
    mutationFn: cancelBooking,
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<Booking[]>(key)
      queryClient.setQueryData<Booking[]>(key, (old) => old?.filter((b) => b.id !== id))
      return { previous }
    },
    onError: (_error, _id, context) => {
      queryClient.setQueryData(key, context?.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })
}
