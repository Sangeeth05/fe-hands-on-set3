export interface Room {
  id: string
  name: string
}

export interface Booking {
  id: string
  roomId: string
  /** ISO date, YYYY-MM-DD */
  date: string
  title: string
  /** 24h time, HH:MM */
  start: string
  end: string
  attendees: string[]
}

export type NewBooking = Omit<Booking, 'id'>
