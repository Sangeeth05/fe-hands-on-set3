import { todayIso } from '../lib/time'
import { configureMockServer, getBookingsForPeople, resetMockServer } from './mockServer'

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
