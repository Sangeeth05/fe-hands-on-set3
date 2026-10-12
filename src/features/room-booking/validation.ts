import type { Booking } from './types'
import { DAY_END, DAY_START, MAX_DURATION, rangesOverlap, toMinutes, toTimeString } from './time'

export interface BookingFormValues {
  title: string
  start: string
  end: string
  attendees: string[]
}

export interface BookingFormErrors {
  title?: string
  start?: string
  end?: string
  /** Problems with the start/end combination, including overlaps. */
  range?: string
  attendees?: string
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Returns an error message if `email` is invalid or already in `existing`. */
export function validateEmail(email: string, existing: string[]): string | undefined {
  const value = email.trim()
  if (!EMAIL_PATTERN.test(value)) {
    return `"${value}" is not a valid email address`
  }
  if (existing.some((other) => other.toLowerCase() === value.toLowerCase())) {
    return `"${value}" has already been added`
  }
  return undefined
}

function validateRange(start: string, end: string, existing: Booking[]): string | undefined {
  const startMinutes = toMinutes(start)
  const endMinutes = toMinutes(end)

  if (startMinutes >= endMinutes) {
    return 'Start time must be before end time'
  }
  if (startMinutes < DAY_START || endMinutes > DAY_END) {
    return `Bookings must be between ${toTimeString(DAY_START)} and ${toTimeString(DAY_END)}`
  }
  if (endMinutes - startMinutes > MAX_DURATION) {
    return 'A booking can last at most 4 hours'
  }

  const conflict = existing.find((booking) =>
    rangesOverlap(startMinutes, endMinutes, toMinutes(booking.start), toMinutes(booking.end)),
  )
  if (conflict) {
    return `Overlaps with "${conflict.title}" (${conflict.start}–${conflict.end})`
  }
  return undefined
}

export function validateBooking(values: BookingFormValues, existing: Booking[]): BookingFormErrors {
  const errors: BookingFormErrors = {}

  if (!values.title.trim()) {
    errors.title = 'Title is required'
  }
  if (!values.start) {
    errors.start = 'Choose a start time'
  }
  if (!values.end) {
    errors.end = 'Choose an end time'
  }
  if (values.start && values.end) {
    const rangeError = validateRange(values.start, values.end, existing)
    if (rangeError) {
      errors.range = rangeError
    }
  }

  const accepted: string[] = []
  for (const email of values.attendees) {
    const emailError = validateEmail(email, accepted)
    if (emailError) {
      errors.attendees = emailError
      break
    }
    accepted.push(email)
  }

  return errors
}
