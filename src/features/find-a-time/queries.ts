import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ApiError,
  createBooking,
  getAvailableRooms,
  getBookingsForPeople,
  getPeople,
} from '../../api/mockServer'
import type { NewBooking } from '../../api/types'
import { usePageVisible } from '../../hooks/usePageVisible'

export function usePeople() {
  return useQuery({ queryKey: ['people'], queryFn: ({ signal }) => getPeople(signal) })
}

/**
 * The key includes the date and the sorted selection, so a new selection is a new query:
 * it shows loading rather than another selection's data (no placeholderData on purpose),
 * and TanStack aborts the superseded request through `signal`.
 */
export function useAvailability(date: string, people: string[]) {
  const sortedPeople = [...people].sort()
  const visible = usePageVisible()

  return useQuery({
    queryKey: ['availability', date, sortedPeople],
    queryFn: ({ signal }) => getBookingsForPeople(sortedPeople, date, signal),
    enabled: sortedPeople.length > 0,
    // Poll only while someone can see it. TanStack's focus manager listens to
    // visibilitychange, so returning to the tab also refetches straight away.
    refetchInterval: visible ? 10_000 : false,
    refetchOnWindowFocus: true,
  })
}

export function useAvailableRooms(date: string, start: number, end: number, minCapacity: number) {
  return useQuery({
    queryKey: ['rooms', date, start, end, minCapacity],
    queryFn: ({ signal }) => getAvailableRooms(date, start, end, minCapacity, signal),
  })
}

export function useCreateBooking() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (booking: NewBooking) => createBooking(booking),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['availability'] })
      void queryClient.invalidateQueries({ queryKey: ['bookings'] })
    },
    onError: (error) => {
      if (!(error instanceof ApiError)) return
      // The server knows better than our (possibly stale) view: recalculate what it disagreed with.
      const key = error.code === 'CONFLICT' ? 'availability' : 'rooms'
      void queryClient.invalidateQueries({ queryKey: [key] })
    },
  })
}
