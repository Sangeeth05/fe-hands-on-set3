import type { Booking } from './types'

interface BookingListProps {
  bookings: Booking[]
}

function BookingList({ bookings }: BookingListProps) {
  if (bookings.length === 0) {
    return <p className="muted">No bookings for this day.</p>
  }

  return (
    <ul className="booking-list">
      {bookings.map((booking) => (
        <li key={booking.id} className="booking">
          <div className="booking-time">
            {booking.start}–{booking.end}
          </div>
          <div>
            <div className="booking-title">{booking.title}</div>
            {booking.attendees.length > 0 && (
              <div className="muted">{booking.attendees.join(', ')}</div>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}

export default BookingList
