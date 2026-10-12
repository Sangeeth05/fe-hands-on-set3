import { useEffect, useRef, useState, type FormEvent } from 'react'
import { formatTime } from '../../lib/time'
import { useAvailableRooms, useCreateBooking } from './queries'

interface BookingDialogProps {
  date: string
  start: number
  end: number
  attendees: { email: string; name: string }[]
  onClose: () => void
}

function BookingDialog({ date, start, end, attendees, onClose }: BookingDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [title, setTitle] = useState('')
  const [chosenRoom, setChosenRoom] = useState('')
  const [titleError, setTitleError] = useState<string>()

  const rooms = useAvailableRooms(date, start, end, attendees.length)
  const createBooking = useCreateBooking()

  // Fall back to the first free room until the user picks one that is still free.
  const roomId = rooms.data?.some((room) => room.id === chosenRoom)
    ? chosenRoom
    : (rooms.data?.[0]?.id ?? '')

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!title.trim()) {
      setTitleError('Title is required')
      return
    }
    setTitleError(undefined)
    createBooking.mutate(
      { title: title.trim(), date, start, end, attendees: attendees.map((a) => a.email), roomId },
      { onSuccess: () => dialogRef.current?.close() },
    )
  }

  return (
    <dialog ref={dialogRef} onClose={onClose} aria-labelledby="booking-dialog-title">
      <form onSubmit={handleSubmit} noValidate className="booking-dialog">
        <h2 id="booking-dialog-title">Book a meeting</h2>
        <p>
          {date}, {formatTime(start)}–{formatTime(end)}
        </p>

        <label>
          Title
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            aria-invalid={titleError !== undefined}
          />
        </label>
        {titleError && <p role="alert">{titleError}</p>}

        <p>Attendees: {attendees.map((attendee) => attendee.name).join(', ')}</p>

        <label>
          Room
          <select
            value={roomId}
            onChange={(event) => setChosenRoom(event.target.value)}
            disabled={!rooms.data || rooms.data.length === 0}
          >
            {rooms.isPending && <option value="">Loading rooms…</option>}
            {rooms.data?.length === 0 && <option value="">No room available</option>}
            {rooms.data?.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name} (seats {room.capacity})
              </option>
            ))}
          </select>
        </label>
        {rooms.isError && <p role="alert">Could not load rooms.</p>}

        {createBooking.isError && <p role="alert">{createBooking.error.message}</p>}

        <div className="dialog-actions">
          <button type="button" onClick={() => dialogRef.current?.close()}>
            Cancel
          </button>
          <button type="submit" className="primary" disabled={!roomId || createBooking.isPending}>
            {createBooking.isPending ? 'Booking…' : 'Book'}
          </button>
        </div>
      </form>
    </dialog>
  )
}

export default BookingDialog
