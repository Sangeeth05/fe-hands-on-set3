import { formatTime, toMinutes, todayIso } from '../lib/time'
import type { Booking, NewBooking, Person, PersonBookings, Room } from './types'

export interface MockCall {
  name: 'getPeople' | 'getBookingsForPeople' | 'getAvailableRooms' | 'createBooking'
  emails?: string[]
  date?: string
}

export interface MockServerConfig {
  /** Milliseconds to wait for a given call. Tests use this to make one call slower than another. */
  delay: (call: MockCall) => number
  /** Chance (0-1) that createBooking finds one attendee was just booked by someone else. */
  conflictRate: number
}

const MIN_DELAY_MS = 300
const MAX_DELAY_MS = 800

const defaultConfig: MockServerConfig = {
  delay: () => MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS),
  conflictRate: 0.25,
}

let config: MockServerConfig = defaultConfig

export function configureMockServer(overrides: Partial<MockServerConfig>) {
  config = { ...config, ...overrides }
}

export type ApiErrorCode = 'CONFLICT' | 'ROOM_UNAVAILABLE'

export class ApiError extends Error {
  code: ApiErrorCode

  constructor(code: ApiErrorCode, message: string) {
    super(message)
    this.name = 'ApiError'
    this.code = code
  }
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

function seedRooms(): Room[] {
  return [
    { id: 'r1', name: 'Aspen', capacity: 4 },
    { id: 'r2', name: 'Birch', capacity: 8 },
    { id: 'r3', name: 'Cedar', capacity: 12 },
    { id: 'r4', name: 'Atrium', capacity: 40 },
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
let rooms = seedRooms()
let bookings = seedBookings()
let nextBookingId = 100

/** Restores seed data and default config. Used by tests. */
export function resetMockServer() {
  config = defaultConfig
  people = seedPeople()
  rooms = seedRooms()
  bookings = seedBookings()
  nextBookingId = 100
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

function nameOf(email: string): string {
  return people.find((person) => person.email === email)?.name ?? email
}

function overlaps(booking: Booking, date: string, start: number, end: number): boolean {
  return booking.date === date && booking.start < end && start < booking.end
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

/** Rooms that are big enough and free for the whole range. */
export async function getAvailableRooms(
  date: string,
  start: number,
  end: number,
  minCapacity: number,
  signal?: AbortSignal,
): Promise<Room[]> {
  await wait({ name: 'getAvailableRooms', date }, signal)
  return rooms
    .filter((room) => room.capacity >= minCapacity)
    .filter((room) => !bookings.some((b) => b.roomId === room.id && overlaps(b, date, start, end)))
    .map((room) => ({ ...room }))
}

/**
 * Re-checks everything on the server, because the client's availability can be stale.
 * Rejects with CONFLICT when an attendee is busy, or ROOM_UNAVAILABLE for the room.
 */
export async function createBooking(input: NewBooking): Promise<Booking> {
  await wait({ name: 'createBooking', emails: input.attendees, date: input.date })

  const busyAttendee = input.attendees.find((email) =>
    bookings.some(
      (b) => b.attendees.includes(email) && overlaps(b, input.date, input.start, input.end),
    ),
  )
  if (busyAttendee) {
    throw new ApiError('CONFLICT', `${nameOf(busyAttendee)} is no longer free at that time.`)
  }

  if (input.attendees.length > 0 && Math.random() < config.conflictRate) {
    // Simulate someone else booking one of the attendees while the dialog was open.
    const victim = input.attendees[Math.floor(Math.random() * input.attendees.length)]
    bookings = [
      ...bookings,
      {
        id: `b${nextBookingId++}`,
        title: 'External meeting',
        date: input.date,
        start: input.start,
        end: input.end,
        attendees: [victim],
      },
    ]
    throw new ApiError(
      'CONFLICT',
      `${nameOf(victim)} was just booked for ${formatTime(input.start)}-${formatTime(input.end)}.`,
    )
  }

  const room = rooms.find((r) => r.id === input.roomId)
  const roomTaken = bookings.some(
    (b) => b.roomId === input.roomId && overlaps(b, input.date, input.start, input.end),
  )
  if (!room || room.capacity < input.attendees.length || roomTaken) {
    throw new ApiError('ROOM_UNAVAILABLE', 'That room is no longer available. Pick another one.')
  }

  const booking: Booking = { ...input, id: `b${nextBookingId++}` }
  bookings = [...bookings, booking]
  return { ...booking, attendees: [...booking.attendees] }
}

/**
 * Dev-only helper: adds 30 people with 20 short bookings each on `date`, staggered so the
 * common free time is fragmented. Returns the new people's emails.
 */
export function seedLoadTest(date: string): string[] {
  const emails: string[] = []
  for (let p = 1; p <= 30; p++) {
    const email = `load${String(p).padStart(2, '0')}@acme.com`
    emails.push(email)
    if (!people.some((person) => person.email === email)) {
      people = [...people, { email, name: `Load tester ${p}` }]
    }
    for (let b = 0; b < 20; b++) {
      const start = 9 * 60 + b * 27 + (p % 9)
      bookings = [
        ...bookings,
        { id: `b${nextBookingId++}`, title: 'Load test', date, start, end: start + 15, attendees: [email] },
      ]
    }
  }
  return emails
}
