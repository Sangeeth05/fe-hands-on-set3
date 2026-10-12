import type { Booking, NewBooking, Room } from './types'
import { rangesOverlap, toMinutes } from './time'

const MIN_DELAY_MS = 300
const MAX_DELAY_MS = 800
const CREATE_FAILURE_RATE = 0.1

const rooms: Room[] = [
  { id: 'r1', name: 'Aspen' },
  { id: 'r2', name: 'Birch' },
  { id: 'r3', name: 'Cedar' },
]

export function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

const today = toIsoDate(new Date())

let nextId = 4
let bookings: Booking[] = [
  {
    id: 'b1',
    roomId: 'r1',
    date: today,
    title: 'Team sync',
    start: '10:00',
    end: '11:00',
    attendees: ['alex@example.com', 'sam@example.com'],
  },
  {
    id: 'b2',
    roomId: 'r1',
    date: today,
    title: 'Design review',
    start: '14:00',
    end: '15:30',
    attendees: ['jo@example.com'],
  },
  {
    id: 'b3',
    roomId: 'r2',
    date: today,
    title: 'Interview loop',
    start: '09:30',
    end: '10:30',
    attendees: [],
  },
]

function delay(): Promise<void> {
  const ms = MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS)
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function byStart(a: Booking, b: Booking): number {
  return toMinutes(a.start) - toMinutes(b.start)
}

export async function fetchRooms(): Promise<Room[]> {
  await delay()
  return rooms.map((room) => ({ ...room }))
}

export async function fetchBookings(roomId: string, date: string): Promise<Booking[]> {
  await delay()
  return bookings
    .filter((booking) => booking.roomId === roomId && booking.date === date)
    .sort(byStart)
    .map((booking) => ({ ...booking }))
}

export async function createBooking(input: NewBooking): Promise<Booking> {
  await delay()

  if (Math.random() < CREATE_FAILURE_RATE) {
    throw new Error('The booking service is unavailable. Please try again.')
  }

  // The server re-checks overlaps, since the room may have been booked since the page loaded.
  const conflict = bookings.find(
    (booking) =>
      booking.roomId === input.roomId &&
      booking.date === input.date &&
      rangesOverlap(
        toMinutes(input.start),
        toMinutes(input.end),
        toMinutes(booking.start),
        toMinutes(booking.end),
      ),
  )
  if (conflict) {
    throw new Error(
      `The room was just booked by someone else for ${conflict.start}–${conflict.end} ("${conflict.title}").`,
    )
  }

  const booking: Booking = { ...input, id: `b${nextId++}` }
  bookings = [...bookings, booking]
  return { ...booking }
}

export async function cancelBooking(id: string): Promise<void> {
  await delay()

  if (!bookings.some((booking) => booking.id === id)) {
    throw new Error('This booking no longer exists.')
  }
  bookings = bookings.filter((booking) => booking.id !== id)
}
