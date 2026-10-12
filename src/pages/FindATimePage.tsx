import { useQueryClient } from '@tanstack/react-query'
import { useDeferredValue, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { seedLoadTest } from '../api/mockServer'
import { useAvailability, usePeople } from '../features/find-a-time/queries'
import Timeline, { type AttendeeBusy } from '../features/find-a-time/Timeline'
import BookingDialog from '../features/find-a-time/BookingDialog'
import { freeSlotsFromMerged, mergeIntervals, type Interval } from '../lib/freeSlots'
import { todayIso } from '../lib/time'
import '../features/find-a-time/find-a-time.css'

const DURATIONS = [15, 30, 45, 60, 90, 120]
const DEFAULT_DURATION = 30

function parseDate(value: string | null): string | undefined {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value))) {
    return value
  }
  return undefined
}

function parseDuration(value: string | null): number {
  const duration = Number(value)
  return DURATIONS.includes(duration) ? duration : DEFAULT_DURATION
}

function parsePeople(value: string | null): string[] {
  return value ? [...new Set(value.split(',').filter(Boolean))].sort() : []
}

function FindATimePage() {
  const [params, setParams] = useSearchParams()
  const [today] = useState(() => todayIso())
  // The slot being booked: start, plus the end we computed from the duration at click time.
  const [booking, setBooking] = useState<Interval | null>(null)

  const date = parseDate(params.get('date')) ?? today
  const duration = parseDuration(params.get('d'))
  const selected = parsePeople(params.get('people'))

  const queryClient = useQueryClient()
  const people = usePeople()
  const availability = useAvailability(date, selected)

  const attendees = useMemo<AttendeeBusy[]>(
    () =>
      (availability.data ?? []).map(({ email, bookings }) => ({
        email,
        name: people.data?.find((person) => person.email === email)?.name ?? email,
        busy: mergeIntervals(bookings),
      })),
    [availability.data, people.data],
  )
  // Merge once per response; changing the duration only re-filters the gaps.
  const merged = useMemo(() => mergeIntervals(attendees.flatMap((a) => a.busy)), [attendees])
  const deferredDuration = useDeferredValue(duration)
  const slots = useMemo(
    () => freeSlotsFromMerged(merged, deferredDuration),
    [merged, deferredDuration],
  )

  function loadTestData() {
    const emails = seedLoadTest(date)
    void queryClient.invalidateQueries({ queryKey: ['people'] })
    updateParams({ people: emails })
  }

  function updateParams(changes: { date?: string; d?: number; people?: string[] }) {
    setParams(
      {
        date: changes.date ?? date,
        d: String(changes.d ?? duration),
        people: (changes.people ?? selected).join(','),
      },
      { replace: true },
    )
  }

  function togglePerson(email: string) {
    updateParams({
      people: selected.includes(email)
        ? selected.filter((other) => other !== email)
        : [...selected, email],
    })
  }

  return (
    <section className="find-a-time">
      <h1>Find a Time</h1>

      <div className="filters">
        <label>
          Date
          <input
            type="date"
            value={date}
            onChange={(event) => {
              const next = parseDate(event.target.value)
              if (next) updateParams({ date: next })
            }}
          />
        </label>
        <label>
          Duration
          <select
            value={duration}
            onChange={(event) => updateParams({ d: Number(event.target.value) })}
          >
            {DURATIONS.map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutes} minutes
              </option>
            ))}
          </select>
        </label>
      </div>

      <fieldset className="people">
        <legend>Attendees</legend>
        {people.isPending && <span className="muted">Loading people…</span>}
        {people.isError && <span role="alert">Could not load people.</span>}
        {people.data?.map((person) => (
          <label key={person.email} className="checkbox">
            <input
              type="checkbox"
              checked={selected.includes(person.email)}
              onChange={() => togglePerson(person.email)}
            />
            {person.name}
          </label>
        ))}
      </fieldset>

      {import.meta.env.DEV && (
        <p>
          <button type="button" onClick={loadTestData}>
            Load 30×20 test data
          </button>
        </p>
      )}

      {selected.length === 0 && <p className="muted">Select at least one attendee.</p>}
      {selected.length > 0 && availability.isPending && <p className="muted">Loading availability…</p>}
      {availability.isError && <p role="alert">Could not load availability.</p>}
      {availability.data && (
        <>
          <Timeline
            attendees={attendees}
            slots={slots}
            onSelectSlot={(slot) =>
              setBooking({ start: slot.start, end: slot.start + deferredDuration })
            }
          />
          {slots.length === 0 && (
            <p className="muted">
              No common free time of {deferredDuration} minutes on this day.
            </p>
          )}
        </>
      )}

      {booking && (
        <BookingDialog
          date={date}
          start={booking.start}
          end={booking.end}
          attendees={attendees}
          onClose={() => setBooking(null)}
        />
      )}
    </section>
  )
}

export default FindATimePage
