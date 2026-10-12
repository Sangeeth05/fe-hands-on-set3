import { freeSlots, mergeIntervals, type Interval } from './freeSlots'

const t = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}
const iv = (start: string, end: string): Interval => ({ start: t(start), end: t(end) })

describe('freeSlots', () => {
  it('finds the common gaps for two people with overlapping bookings', () => {
    const busy = [
      iv('10:00', '11:00'), // A
      iv('09:30', '10:30'), // A
      iv('13:00', '14:00'), // B
      iv('13:15', '13:45'), // B
    ]

    expect(freeSlots(busy, 30)).toEqual([
      iv('09:00', '09:30'),
      iv('11:00', '13:00'),
      iv('14:00', '18:00'),
    ])
  })

  it('returns the whole day when nobody is busy', () => {
    expect(freeSlots([], 60)).toEqual([iv('09:00', '18:00')])
  })

  it('returns nothing when the day is fully booked', () => {
    expect(freeSlots([iv('09:00', '18:00')], 15)).toEqual([])
    expect(freeSlots([iv('09:00', '13:00'), iv('13:00', '18:00')], 15)).toEqual([])
  })

  it('treats a booking inside another as one busy block', () => {
    expect(freeSlots([iv('10:00', '12:00'), iv('10:30', '11:00')], 30)).toEqual([
      iv('09:00', '10:00'),
      iv('12:00', '18:00'),
    ])
  })

  it('handles unsorted input without mutating it', () => {
    const busy = [iv('14:00', '15:00'), iv('09:00', '10:00'), iv('11:00', '12:00')]
    const copy = busy.map((b) => ({ ...b }))

    expect(freeSlots(busy, 30)).toEqual([
      iv('10:00', '11:00'),
      iv('12:00', '14:00'),
      iv('15:00', '18:00'),
    ])
    expect(busy).toEqual(copy)
  })

  it('includes a gap exactly equal to the duration', () => {
    expect(freeSlots([iv('09:00', '10:00'), iv('10:30', '18:00')], 30)).toEqual([
      iv('10:00', '10:30'),
    ])
  })

  it('excludes a gap one minute shorter than the duration', () => {
    expect(freeSlots([iv('09:00', '10:00'), iv('10:29', '18:00')], 30)).toEqual([])
  })

  it('returns nothing for a non-positive duration', () => {
    expect(freeSlots([], 0)).toEqual([])
    expect(freeSlots([], -15)).toEqual([])
  })

  it('treats touching bookings as one block, leaving no zero-length gap', () => {
    expect(freeSlots([iv('10:00', '11:00'), iv('11:00', '12:00')], 15)).toEqual([
      iv('09:00', '10:00'),
      iv('12:00', '18:00'),
    ])
  })
})

describe('mergeIntervals', () => {
  it('clamps to the working day and drops intervals outside it', () => {
    expect(
      mergeIntervals([iv('08:00', '09:30'), iv('17:30', '19:00'), iv('06:00', '08:00')]),
    ).toEqual([iv('09:00', '09:30'), iv('17:30', '18:00')])
  })

  it('drops empty and inverted intervals', () => {
    expect(mergeIntervals([iv('10:00', '10:00'), iv('12:00', '11:00')])).toEqual([])
  })
})
