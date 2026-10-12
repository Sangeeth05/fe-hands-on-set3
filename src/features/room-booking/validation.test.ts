import type { Booking } from './types'
import { validateBooking, validateEmail, type BookingFormValues } from './validation'

const existing: Booking[] = [
  {
    id: 'b1',
    roomId: 'r1',
    date: '2026-10-12',
    title: 'Team sync',
    start: '10:00',
    end: '11:00',
    attendees: [],
  },
]

function values(overrides: Partial<BookingFormValues>): BookingFormValues {
  return { title: 'Planning', start: '12:00', end: '13:00', attendees: [], ...overrides }
}

describe('validateBooking', () => {
  it('accepts a booking that does not clash with existing ones', () => {
    expect(validateBooking(values({}), existing)).toEqual({})
  })

  it('blocks a booking that overlaps the end of an existing one', () => {
    const errors = validateBooking(values({ start: '10:30', end: '11:30' }), existing)
    expect(errors.range).toMatch(/overlaps with "Team sync"/i)
  })

  it('allows back-to-back bookings on either side', () => {
    expect(validateBooking(values({ start: '11:00', end: '12:00' }), existing)).toEqual({})
    expect(validateBooking(values({ start: '09:00', end: '10:00' }), existing)).toEqual({})
  })

  it('blocks a booking that completely covers an existing one', () => {
    const shortBooking = [{ ...existing[0], start: '10:00', end: '10:30' }]
    const errors = validateBooking(values({ start: '09:00', end: '12:00' }), shortBooking)
    expect(errors.range).toMatch(/overlaps/i)
  })

  it('blocks a booking that sits inside an existing one', () => {
    const errors = validateBooking(values({ start: '10:15', end: '10:45' }), existing)
    expect(errors.range).toMatch(/overlaps/i)
  })

  it('requires start to be before end', () => {
    expect(validateBooking(values({ start: '13:00', end: '13:00' }), []).range).toMatch(/before/i)
    expect(validateBooking(values({ start: '14:00', end: '13:00' }), []).range).toMatch(/before/i)
  })

  it('keeps bookings within 09:00-18:00', () => {
    expect(validateBooking(values({ start: '08:45', end: '09:30' }), []).range).toMatch(/between/i)
    expect(validateBooking(values({ start: '17:30', end: '18:15' }), []).range).toMatch(/between/i)
    expect(validateBooking(values({ start: '17:00', end: '18:00' }), [])).toEqual({})
  })

  it('limits a booking to 4 hours', () => {
    expect(validateBooking(values({ start: '09:00', end: '13:00' }), [])).toEqual({})
    expect(validateBooking(values({ start: '09:00', end: '13:15' }), []).range).toMatch(/4 hours/)
  })

  it('requires a title, start and end', () => {
    const errors = validateBooking(values({ title: '  ', start: '', end: '' }), [])
    expect(errors.title).toBeDefined()
    expect(errors.start).toBeDefined()
    expect(errors.end).toBeDefined()
  })

  it('rejects invalid and duplicate attendee emails', () => {
    expect(validateBooking(values({ attendees: ['not-an-email'] }), []).attendees).toMatch(/valid/)
    expect(validateBooking(values({ attendees: ['a@x.com', 'A@x.com'] }), []).attendees).toMatch(
      /already/,
    )
    expect(validateBooking(values({ attendees: ['a@x.com', 'b@x.com'] }), [])).toEqual({})
  })
})

describe('validateEmail', () => {
  it('flags an email that is already in the list, ignoring case', () => {
    expect(validateEmail('Sam@Example.com', ['sam@example.com'])).toMatch(/already/)
  })
})
