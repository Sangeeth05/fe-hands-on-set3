import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toIsoDate } from '../features/room-booking/api'
import BookingList from '../features/room-booking/BookingList'
import { useBookings, useRooms } from '../features/room-booking/queries'

function parseDate(value: string | null): string | undefined {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value))) {
    return value
  }
  return undefined
}

function RoomBookingPage() {
  const [params, setParams] = useSearchParams()
  const [today] = useState(() => toIsoDate(new Date()))
  const rooms = useRooms()

  const date = parseDate(params.get('date')) ?? today
  const roomId = rooms.data?.find((room) => room.id === params.get('room'))?.id ?? rooms.data?.[0]?.id
  const bookings = useBookings(roomId, date)

  // Write the resolved room and date into the URL so a refresh or shared link shows the same view.
  useEffect(() => {
    if (roomId && (params.get('room') !== roomId || params.get('date') !== date)) {
      setParams({ room: roomId, date }, { replace: true })
    }
  }, [roomId, date, params, setParams])

  return (
    <section>
      <h1>Room Booking</h1>

      <div className="filters">
        <label>
          Room
          <select
            value={roomId ?? ''}
            disabled={!rooms.data}
            onChange={(event) => setParams({ room: event.target.value, date })}
          >
            {rooms.data?.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Date
          <input
            type="date"
            value={date}
            onChange={(event) => {
              const nextDate = parseDate(event.target.value)
              if (nextDate && roomId) setParams({ room: roomId, date: nextDate })
            }}
          />
        </label>
      </div>

      <h2>Schedule</h2>
      {rooms.isError && <p role="alert">Could not load rooms.</p>}
      {bookings.isPending && !rooms.isError && <p className="muted">Loading…</p>}
      {bookings.isError && <p role="alert">Could not load bookings.</p>}
      {bookings.data && <BookingList bookings={bookings.data} />}
    </section>
  )
}

export default RoomBookingPage
