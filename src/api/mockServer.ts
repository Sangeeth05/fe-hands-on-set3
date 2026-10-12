import { toMinutes, todayIso } from '../lib/time'
import type { Booking, Person, PersonBookings } from './types'

export interface MockCall {
  name: 'getPeople' | 'getBookingsForPeople'
  emails?: string[]
  date?: string
}

export interface MockServerConfig {
  /** Milliseconds to wait for a given call. Tests use this to make one call slower than another. */
  delay: (call: MockCall) => number
}

const MIN_DELAY_MS = 300
const MAX_DELAY_MS = 800

const defaultConfig: MockServerConfig = {
  delay: () => MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS),
}

let config: MockServerConfig = defaultConfig

export function configureMockServer(overrides: Partial<MockServerConfig>) {
  config = { ...config, ...overrides }
}

function seedPeople(): Person[] {
  return [
    { email: 'alice@acme.com', name: 'Alice' },
    { email: 'bob@acme.com', name: 'Bob' },
    { email: 'carol@acme.com', name: 'Carol' },
    { email: 'dave@acme.com', name: 'Dave' },
    { email: 'erin@acme.com', name: 'Erin' },
    { email: 'frank@acme.com', name: 'Frank' },
  ]
}

function seedBookings(): Booking[] {
  const date = todayIso()
  const booking = (
    id: string,
    title: string,
    start: string,
    end: string,
    attendees: string[],
  ): Booking => ({ id, title, date, start: toMinutes(start), end: toMinutes(end), attendees })

  return [
    // Alice and Bob match the acceptance example.
    booking('b1', 'Design review', '10:00', '11:00', ['alice@acme.com']),
    booking('b2', 'Planning', '09:30', '10:30', ['alice@acme.com']),
    booking('b3', 'Customer call', '13:00', '14:00', ['bob@acme.com']),
    booking('b4', 'Quick sync', '13:15', '13:45', ['bob@acme.com']),
    booking('b5', 'Interview', '11:30', '12:30', ['carol@acme.com']),
    booking('b6', 'Roadmap', '15:00', '16:30', ['dave@acme.com']),
    booking('b7', 'Standup', '09:00', '10:00', ['erin@acme.com']),
    booking('b8', 'Lunch and learn', '12:00', '13:00', ['frank@acme.com']),
  ]
}

let people = seedPeople()
let bookings = seedBookings()

/** Restores seed data and default config. Used by tests. */
export function resetMockServer() {
  config = defaultConfig
  people = seedPeople()
  bookings = seedBookings()
}

function abortError(): DOMException {
  return new DOMException('The request was aborted', 'AbortError')
}

/** Waits for the configured delay, rejecting as soon as `signal` aborts. */
function wait(call: MockCall, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError())
      return
    }

    const onAbort = () => {
      clearTimeout(timer)
      reject(abortError())
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, config.delay(call))
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

export async function getPeople(signal?: AbortSignal): Promise<Person[]> {
  await wait({ name: 'getPeople' }, signal)
  return people.map((person) => ({ ...person }))
}

/** Each requested person's bookings on `date`, in the order the emails were given. */
export async function getBookingsForPeople(
  emails: string[],
  date: string,
  signal?: AbortSignal,
): Promise<PersonBookings[]> {
  await wait({ name: 'getBookingsForPeople', emails, date }, signal)
  return emails.map((email) => ({
    email,
    bookings: bookings
      .filter((b) => b.date === date && b.attendees.includes(email))
      .map((b) => ({ ...b, attendees: [...b.attendees] })),
  }))
}
