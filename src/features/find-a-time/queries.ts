import { useQuery } from '@tanstack/react-query'
import { getBookingsForPeople, getPeople } from '../../api/mockServer'

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

  return useQuery({
    queryKey: ['availability', date, sortedPeople],
    queryFn: ({ signal }) => getBookingsForPeople(sortedPeople, date, signal),
    enabled: sortedPeople.length > 0,
  })
}
