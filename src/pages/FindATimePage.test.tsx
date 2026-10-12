import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { configureMockServer, resetMockServer } from '../api/mockServer'
import FindATimePage from './FindATimePage'

afterEach(() => {
  resetMockServer()
})

function renderPage(url = '/find-a-time') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[url]}>
        <FindATimePage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

describe('FindATimePage availability', () => {
  it('ignores a slow response for a selection the user has already left', async () => {
    const user = userEvent.setup()
    configureMockServer({
      delay: (call) => {
        if (call.name !== 'getBookingsForPeople') return 0
        return call.emails?.includes('alice@acme.com') ? 500 : 20
      },
    })
    renderPage()

    await user.click(await screen.findByRole('checkbox', { name: 'Alice' }))
    // Switch to Bob while Alice's slow request is still in flight.
    await user.click(screen.getByRole('checkbox', { name: 'Alice' }))
    await user.click(screen.getByRole('checkbox', { name: 'Bob' }))

    expect(await screen.findByRole('group', { name: 'Bob' })).toBeVisible()

    // Wait well past the point where Alice's response would have arrived.
    await sleep(600)

    expect(screen.getByRole('group', { name: 'Bob' })).toBeVisible()
    expect(screen.queryByRole('group', { name: 'Alice' })).not.toBeInTheDocument()
  })

  it('shows loading, not the previous selection, while a new selection loads', async () => {
    const user = userEvent.setup()
    configureMockServer({
      delay: (call) => (call.name === 'getBookingsForPeople' ? 100 : 0),
    })
    renderPage('/find-a-time?people=alice@acme.com')

    expect(await screen.findByRole('group', { name: 'Alice' })).toBeVisible()

    await user.click(screen.getByRole('checkbox', { name: 'Bob' }))

    expect(screen.queryByRole('group', { name: 'Alice' })).not.toBeInTheDocument()
    expect(screen.getByText('Loading availability…')).toBeVisible()
    expect(await screen.findByRole('group', { name: 'Bob' })).toBeVisible()
    expect(screen.getByRole('group', { name: 'Alice' })).toBeVisible()
  })
})

describe('FindATimePage booking', () => {
  const url = '/find-a-time?people=alice@acme.com,bob@acme.com&d=30'

  it('books a slot in a free room and recalculates availability', async () => {
    const user = userEvent.setup()
    configureMockServer({ delay: () => 0, conflictRate: 0 })
    renderPage(url)

    await user.click(await screen.findByRole('option', { name: 'Free 11:00 to 13:00' }))

    const dialog = await screen.findByRole('dialog', { name: 'Book a meeting' })
    expect(dialog).toHaveTextContent('11:00–11:30')
    expect(dialog).toHaveTextContent('Attendees: Alice, Bob')
    await waitFor(() => expect(within(dialog).getByLabelText('Room')).toHaveValue('r1'))

    await user.type(within(dialog).getByLabelText('Title'), 'Sync')
    await user.click(within(dialog).getByRole('button', { name: 'Book' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(await screen.findByRole('option', { name: 'Free 11:30 to 13:00' })).toBeVisible()
  })

  it('shows a conflict and recalculates the free slots', async () => {
    const user = userEvent.setup()
    configureMockServer({ delay: () => 0, conflictRate: 1 })
    renderPage(url)

    await user.click(await screen.findByRole('option', { name: 'Free 11:00 to 13:00' }))
    const dialog = await screen.findByRole('dialog', { name: 'Book a meeting' })
    await waitFor(() => expect(within(dialog).getByLabelText('Room')).toHaveValue('r1'))
    await user.type(within(dialog).getByLabelText('Title'), 'Sync')
    await user.click(within(dialog).getByRole('button', { name: 'Book' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(/was just booked/)
    expect(await screen.findByRole('option', { name: 'Free 11:30 to 13:00' })).toBeVisible()
  })

  it('opens the dialog from the keyboard with the focused slot', async () => {
    const user = userEvent.setup()
    configureMockServer({ delay: () => 0 })
    renderPage(url)

    const first = await screen.findByRole('option', { name: 'Free 09:00 to 09:30' })
    expect(screen.getByRole('status')).toHaveTextContent('3 free slots')
    first.focus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('option', { name: 'Free 11:00 to 13:00' })).toHaveFocus()
    await user.keyboard('{ArrowRight}{ArrowRight}{ArrowLeft}')
    expect(screen.getByRole('option', { name: 'Free 14:00 to 18:00' })).toHaveFocus()
    await user.keyboard('{ArrowLeft}{Enter}')

    expect(await screen.findByRole('dialog', { name: 'Book a meeting' })).toHaveTextContent(
      '11:00–11:30',
    )
  })
})
