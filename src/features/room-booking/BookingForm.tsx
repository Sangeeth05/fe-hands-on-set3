import { useState, type FormEvent, type KeyboardEvent } from 'react'
import { useCreateBooking } from './queries'
import { DAY_END, DAY_START, STEP_MINUTES, timeOptions } from './time'
import type { Booking } from './types'
import { validateBooking, validateEmail } from './validation'

interface BookingFormProps {
  roomId: string
  date: string
  /** The room's current bookings for `date`, used to block overlaps. */
  bookings: Booking[]
}

const START_OPTIONS = timeOptions(DAY_START, DAY_END - STEP_MINUTES)
const END_OPTIONS = timeOptions(DAY_START + STEP_MINUTES, DAY_END)

function BookingForm({ roomId, date, bookings }: BookingFormProps) {
  const [title, setTitle] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [attendees, setAttendees] = useState<string[]>([])
  const [emailInput, setEmailInput] = useState('')
  const [emailError, setEmailError] = useState<string>()
  // Errors only appear after the first submit, then stay in sync with the fields.
  const [submitted, setSubmitted] = useState(false)

  const createBooking = useCreateBooking(roomId, date)

  const errors = submitted ? validateBooking({ title, start, end, attendees }, bookings) : {}
  const attendeesError = emailError ?? errors.attendees

  function addAttendee() {
    const email = emailInput.trim()
    if (!email) return

    const error = validateEmail(email, attendees)
    if (error) {
      setEmailError(error)
      return
    }
    setAttendees([...attendees, email])
    setEmailInput('')
    setEmailError(undefined)
  }

  function handleEmailKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      addAttendee()
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitted(true)
    if (Object.keys(validateBooking({ title, start, end, attendees }, bookings)).length > 0) return

    createBooking.mutate(
      { roomId, date, title: title.trim(), start, end, attendees },
      {
        onSuccess: () => {
          setTitle('')
          setStart('')
          setEnd('')
          setAttendees([])
          setEmailInput('')
          setSubmitted(false)
        },
      },
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="booking-form">
      <h2>Book this room</h2>

      <label>
        Title
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          aria-invalid={errors.title !== undefined}
        />
      </label>
      {errors.title && <p role="alert">{errors.title}</p>}

      <div className="filters">
        <label>
          Start
          <select
            value={start}
            onChange={(event) => setStart(event.target.value)}
            aria-invalid={errors.start !== undefined || errors.range !== undefined}
          >
            <option value="">Select…</option>
            {START_OPTIONS.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>
          {errors.start && <span role="alert">{errors.start}</span>}
        </label>
        <label>
          End
          <select
            value={end}
            onChange={(event) => setEnd(event.target.value)}
            aria-invalid={errors.end !== undefined || errors.range !== undefined}
          >
            <option value="">Select…</option>
            {END_OPTIONS.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>
          {errors.end && <span role="alert">{errors.end}</span>}
        </label>
      </div>
      {errors.range && <p role="alert">{errors.range}</p>}

      <label>
        Attendees
        <div className="attendee-input">
          <input
            type="email"
            value={emailInput}
            placeholder="name@example.com"
            onChange={(event) => {
              setEmailInput(event.target.value)
              setEmailError(undefined)
            }}
            onKeyDown={handleEmailKeyDown}
            aria-invalid={attendeesError !== undefined}
          />
          <button type="button" onClick={addAttendee}>
            Add attendee
          </button>
        </div>
      </label>
      {attendeesError && <p role="alert">{attendeesError}</p>}
      {attendees.length > 0 && (
        <ul className="attendee-list">
          {attendees.map((email) => (
            <li key={email}>
              {email}
              <button
                type="button"
                aria-label={`Remove ${email}`}
                onClick={() => setAttendees(attendees.filter((other) => other !== email))}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {createBooking.isError && (
        <p role="alert">Could not create the booking: {createBooking.error.message}</p>
      )}

      <button type="submit" className="primary" disabled={createBooking.isPending}>
        {createBooking.isPending ? 'Booking…' : 'Book room'}
      </button>
    </form>
  )
}

export default BookingForm
