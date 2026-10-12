import type { Booking } from './types'

interface BookingListProps {
  bookings: Booking[]
  onCancel: (booking: Booking) => void
}

function BookingList({ bookings, onCancel }: BookingListProps) {
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
          <div className="booking-details">
            <div className="booking-title">{booking.title}</div>
            {booking.attendees.length > 0 && (
              <div className="muted">{booking.attendees.join(', ')}</div>
            )}
          </div>
          <button type="button" onClick={() => onCancel(booking)}>
            Cancel
            <span className="visually-hidden"> {booking.title}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}

export default BookingList
