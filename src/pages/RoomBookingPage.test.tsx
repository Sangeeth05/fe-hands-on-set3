import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import * as api from '../features/room-booking/api'
import type { Booking } from '../features/room-booking/types'
import RoomBookingPage from './RoomBookingPage'

vi.mock('../features/room-booking/api', async (importOriginal) => ({
  ...(await importOriginal<typeof api>()),
  fetchRooms: vi.fn(),
  fetchBookings: vi.fn(),
  createBooking: vi.fn(),
  cancelBooking: vi.fn(),
}))

const DATE = '2026-10-12'

const teamSync: Booking = {
  id: 'b1',
  roomId: 'r1',
  date: DATE,
  title: 'Team sync',
  start: '10:00',
  end: '11:00',
  attendees: [],
}

let serverBookings: Booking[]

beforeEach(() => {
  serverBookings = [teamSync]
  vi.mocked(api.fetchRooms).mockResolvedValue([
    { id: 'r1', name: 'Aspen' },
    { id: 'r2', name: 'Birch' },
  ])
  vi.mocked(api.fetchBookings).mockImplementation(async () => serverBookings)
})

function renderPage(url = `/booking?room=r1&date=${DATE}`) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[url]}>
        <RoomBookingPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

async function fillForm(
  user: ReturnType<typeof userEvent.setup>,
  { title, start, end }: { title: string; start: string; end: string },
) {
  await screen.findByText('Team sync')
  await user.type(screen.getByLabelText(/^title/i), title)
  await user.selectOptions(screen.getByLabelText(/^start/i), start)
  await user.selectOptions(screen.getByLabelText(/^end/i), end)
}

describe('RoomBookingPage', () => {
  it('shows the room and date from the URL', async () => {
    renderPage(`/booking?room=r2&date=${DATE}`)

    await waitFor(() => expect(api.fetchBookings).toHaveBeenCalledWith('r2', DATE))
    expect(screen.getByLabelText(/^room/i)).toHaveValue('r2')
    expect(screen.getByLabelText(/^date/i)).toHaveValue(DATE)
  })

  describe('booking form', () => {
    it('blocks a booking that overlaps an existing one and allows a back-to-back one', async () => {
      const user = userEvent.setup()
      vi.mocked(api.createBooking).mockResolvedValue({ ...teamSync, id: 'b2', title: 'Retro' })
      renderPage()

      await fillForm(user, { title: 'Retro', start: '10:30', end: '11:30' })
      await user.click(screen.getByRole('button', { name: 'Book room' }))

      expect(await screen.findByText(/overlaps with "Team sync" \(10:00–11:00\)/i)).toBeVisible()
      expect(api.createBooking).not.toHaveBeenCalled()

      await user.selectOptions(screen.getByLabelText(/^start/i), '11:00')
      await user.selectOptions(screen.getByLabelText(/^end/i), '12:00')
      expect(screen.queryByText(/overlaps/i)).not.toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Book room' }))
      await waitFor(() =>
        expect(api.createBooking).toHaveBeenCalledWith({
          roomId: 'r1',
          date: DATE,
          title: 'Retro',
          start: '11:00',
          end: '12:00',
          attendees: [],
        }),
      )
    })

    it('blocks a booking that completely covers an existing one', async () => {
      const user = userEvent.setup()
      serverBookings = [{ ...teamSync, start: '10:00', end: '10:30' }]
      renderPage()

      await fillForm(user, { title: 'All morning', start: '09:00', end: '12:00' })
      await user.click(screen.getByRole('button', { name: 'Book room' }))

      expect(await screen.findByText(/overlaps with "Team sync"/i)).toBeVisible()
      expect(api.createBooking).not.toHaveBeenCalled()
    })

    it('adds and removes attendees, rejecting invalid and duplicate emails', async () => {
      const user = userEvent.setup()
      renderPage()
      await screen.findByText('Team sync')

      const input = screen.getByPlaceholderText('name@example.com')
      const add = screen.getByRole('button', { name: 'Add attendee' })

      await user.type(input, 'nope')
      await user.click(add)
      expect(screen.getByRole('alert')).toHaveTextContent(/not a valid email/i)

      await user.clear(input)
      await user.type(input, 'sam@example.com')
      await user.click(add)
      await user.type(input, 'SAM@example.com')
      await user.click(add)
      expect(screen.getByRole('alert')).toHaveTextContent(/already been added/i)

      await user.click(screen.getByRole('button', { name: 'Remove sam@example.com' }))
      expect(screen.queryByRole('button', { name: 'Remove sam@example.com' })).not.toBeInTheDocument()
    })

    it('shows the API rejection reason and keeps what the user typed', async () => {
      const user = userEvent.setup()
      vi.mocked(api.createBooking).mockRejectedValue(new Error('Room was just booked.'))
      renderPage()

      await fillForm(user, { title: 'Retro', start: '12:00', end: '13:00' })
      await user.click(screen.getByRole('button', { name: 'Book room' }))

      expect(await screen.findByText(/room was just booked/i)).toBeVisible()
      expect(screen.getByLabelText(/^title/i)).toHaveValue('Retro')
      expect(screen.getByLabelText(/^start/i)).toHaveValue('12:00')
      expect(screen.getByLabelText(/^end/i)).toHaveValue('13:00')
    })
  })

  describe('cancelling a booking', () => {
    it('does nothing when the confirmation is dismissed', async () => {
      const user = userEvent.setup()
      vi.spyOn(window, 'confirm').mockReturnValue(false)
      renderPage()

      await user.click(await screen.findByRole('button', { name: /cancel team sync/i }))

      expect(api.cancelBooking).not.toHaveBeenCalled()
      expect(screen.getByText('Team sync')).toBeVisible()
    })

    it('removes the booking immediately and puts it back with an error if the API fails', async () => {
      const user = userEvent.setup()
      vi.spyOn(window, 'confirm').mockReturnValue(true)
      let rejectCancel: (error: Error) => void = () => {}
      vi.mocked(api.cancelBooking).mockReturnValue(
        new Promise((_resolve, reject) => {
          rejectCancel = reject
        }),
      )
      renderPage()

      await user.click(await screen.findByRole('button', { name: /cancel team sync/i }))

      // Gone while the request is still in flight.
      await waitFor(() => expect(screen.queryByText('Team sync')).not.toBeInTheDocument())

      rejectCancel(new Error('Server error'))

      expect(await screen.findByText('Team sync')).toBeVisible()
      expect(screen.getByText(/could not cancel the booking: server error/i)).toBeVisible()
    })

    it('keeps the booking removed when the API succeeds', async () => {
      const user = userEvent.setup()
      vi.spyOn(window, 'confirm').mockReturnValue(true)
      vi.mocked(api.cancelBooking).mockImplementation(async () => {
        serverBookings = []
      })
      renderPage()

      await user.click(await screen.findByRole('button', { name: /cancel team sync/i }))

      expect(await screen.findByText('No bookings for this day.')).toBeVisible()
      expect(within(document.body).queryByText('Team sync')).not.toBeInTheDocument()
    })
  })
})
