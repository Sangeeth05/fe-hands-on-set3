export interface Person {
  email: string
  name: string
}

export interface Booking {
  id: string
  title: string
  /** ISO date, YYYY-MM-DD */
  date: string
  /** Minutes since midnight, half-open [start, end) */
  start: number
  end: number
  attendees: string[]
  roomId?: string
}

export interface Room {
  id: string
  name: string
  capacity: number
}

export interface NewBooking {
  title: string
  date: string
  start: number
  end: number
  attendees: string[]
  roomId: string
}

export interface PersonBookings {
  email: string
  bookings: Booking[]
}
