import { todayIso } from '../lib/time'
import {
  configureMockServer,
  createBooking,
  getAvailableRooms,
  getBookingsForPeople,
  resetMockServer,
} from './mockServer'

afterEach(() => {
  resetMockServer()
})

describe('getBookingsForPeople', () => {
  it("returns each person's bookings for the date", async () => {
    configureMockServer({ delay: () => 0 })

    const result = await getBookingsForPeople(['alice@acme.com', 'bob@acme.com'], todayIso())

    expect(result.map((p) => [p.email, p.bookings.length])).toEqual([
      ['alice@acme.com', 2],
      ['bob@acme.com', 2],
    ])
  })

  it('returns no bookings on a day with none', async () => {
    configureMockServer({ delay: () => 0 })

    const result = await getBookingsForPeople(['alice@acme.com'], '2000-01-01')

    expect(result).toEqual([{ email: 'alice@acme.com', bookings: [] }])
  })

  it('rejects as soon as the signal aborts', async () => {
    configureMockServer({ delay: () => 10_000 })
    const controller = new AbortController()

    const request = getBookingsForPeople(['alice@acme.com'], todayIso(), controller.signal)
    controller.abort()

    await expect(request).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('rejects immediately when the signal is already aborted', async () => {
    const controller = new AbortController()
    controller.abort()

    await expect(
      getBookingsForPeople(['alice@acme.com'], todayIso(), controller.signal),
    ).rejects.toMatchObject({ name: 'AbortError' })
  })
})

describe('getAvailableRooms', () => {
  it('only offers rooms that seat the whole group', async () => {
    configureMockServer({ delay: () => 0 })

    const rooms = await getAvailableRooms(todayIso(), 11 * 60, 12 * 60, 6)

    expect(rooms.map((room) => room.name)).toEqual(['Birch', 'Cedar', 'Atrium'])
  })

  it('excludes rooms that are already booked during the range', async () => {
    configureMockServer({ delay: () => 0, conflictRate: 0 })
    const date = todayIso()
    await createBooking({
      title: 'Hold',
      date,
      start: 11 * 60,
      end: 12 * 60,
      attendees: ['dave@acme.com'],
      roomId: 'r1',
    })

    const overlapping = await getAvailableRooms(date, 11 * 60 + 30, 12 * 60 + 30, 1)
    const backToBack = await getAvailableRooms(date, 12 * 60, 13 * 60, 1)

    expect(overlapping.map((room) => room.name)).not.toContain('Aspen')
    expect(backToBack.map((room) => room.name)).toContain('Aspen')
  })
})

describe('createBooking', () => {
  const slot = { date: todayIso(), start: 11 * 60, end: 11 * 60 + 30 }

  it('creates a booking when everyone is free', async () => {
    configureMockServer({ delay: () => 0, conflictRate: 0 })

    const booking = await createBooking({
      ...slot,
      title: 'Sync',
      attendees: ['alice@acme.com', 'bob@acme.com'],
      roomId: 'r2',
    })

    const [alice] = await getBookingsForPeople(['alice@acme.com'], slot.date)
    expect(alice.bookings.map((b) => b.id)).toContain(booking.id)
  })

  it('rejects with CONFLICT naming an attendee who is already busy', async () => {
    configureMockServer({ delay: () => 0, conflictRate: 0 })

    await expect(
      createBooking({ ...slot, start: 10 * 60 + 30, title: 'Sync', attendees: ['alice@acme.com'], roomId: 'r2' }),
    ).rejects.toMatchObject({ code: 'CONFLICT', message: expect.stringContaining('Alice') })
  })

  it('injects an external booking and rejects with CONFLICT at the configured rate', async () => {
    configureMockServer({ delay: () => 0, conflictRate: 1 })

    await expect(
      createBooking({ ...slot, title: 'Sync', attendees: ['carol@acme.com'], roomId: 'r2' }),
    ).rejects.toMatchObject({ code: 'CONFLICT', message: expect.stringContaining('Carol') })

    const [carol] = await getBookingsForPeople(['carol@acme.com'], slot.date)
    expect(carol.bookings.some((b) => b.title === 'External meeting')).toBe(true)
  })

  it('rejects when the room is too small', async () => {
    configureMockServer({ delay: () => 0, conflictRate: 0 })

    await expect(
      createBooking({
        ...slot,
        title: 'Sync',
        attendees: ['carol@acme.com', 'dave@acme.com', 'erin@acme.com', 'frank@acme.com', 'bob@acme.com'],
        roomId: 'r1',
      }),
    ).rejects.toMatchObject({ code: 'ROOM_UNAVAILABLE' })
  })
})
