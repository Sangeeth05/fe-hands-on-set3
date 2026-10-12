import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from './App'

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

describe('App routing', () => {
  it('redirects / to the room booking page', () => {
    renderAt('/')
    expect(screen.getByRole('heading', { name: 'Room Booking' })).toBeInTheDocument()
  })

  it('renders the find a time page at /find-a-time', () => {
    renderAt('/find-a-time')
    expect(screen.getByRole('heading', { name: 'Find a Time' })).toBeInTheDocument()
  })

  it('links to both pages from the nav', () => {
    renderAt('/booking')
    const nav = screen.getByRole('navigation')
    expect(nav).toHaveTextContent('Room Booking')
    expect(nav).toHaveTextContent('Find a Time')
  })
})
