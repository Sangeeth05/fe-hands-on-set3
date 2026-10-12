import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
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
