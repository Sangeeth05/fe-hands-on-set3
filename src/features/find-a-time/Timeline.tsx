import { DAY_END, DAY_START, type Interval } from '../../lib/freeSlots'
import { formatTime } from '../../lib/time'

export interface AttendeeBusy {
  email: string
  name: string
  /** Merged busy intervals for this person. */
  busy: Interval[]
}

const DAY_LENGTH = DAY_END - DAY_START
const HOURS = Array.from({ length: (DAY_END - DAY_START) / 60 + 1 }, (_, i) => DAY_START / 60 + i)

function percent(minutes: number): number {
  return ((minutes - DAY_START) / DAY_LENGTH) * 100
}

function blockStyle({ start, end }: Interval) {
  return { left: `${percent(start)}%`, width: `${percent(end) - percent(start)}%` }
}

function AttendeeRow({ name, busy }: AttendeeBusy) {
  return (
    <div className="timeline-row" role="group" aria-label={name}>
      <div className="timeline-label" aria-hidden="true">
        {name}
      </div>
      <div className="timeline-track">
        {busy.map((interval) => (
          <div
            key={interval.start}
            className="busy-block"
            style={blockStyle(interval)}
            title={`Busy ${formatTime(interval.start)} to ${formatTime(interval.end)}`}
          />
        ))}
      </div>
    </div>
  )
}

interface TimelineProps {
  attendees: AttendeeBusy[]
  slots: Interval[]
  onSelectSlot: (slot: Interval) => void
}

function Timeline({ attendees, slots, onSelectSlot }: TimelineProps) {
  return (
    <div className="timeline">
      <div className="timeline-row">
        <div className="timeline-label" />
        <div className="timeline-hours" aria-hidden="true">
          {HOURS.map((hour) => (
            <span key={hour} style={{ left: `${percent(hour * 60)}%` }}>
              {String(hour).padStart(2, '0')}:00
            </span>
          ))}
        </div>
      </div>

      <div className="timeline-row timeline-free">
        <div className="timeline-label">Everyone free</div>
        <div className="timeline-track">
          {slots.map((slot) => (
            <button
              key={slot.start}
              type="button"
              className="free-slot"
              style={blockStyle(slot)}
              aria-label={`Free ${formatTime(slot.start)} to ${formatTime(slot.end)}`}
              onClick={() => onSelectSlot(slot)}
            />
          ))}
        </div>
      </div>

      {attendees.map((attendee) => (
        <AttendeeRow key={attendee.email} {...attendee} />
      ))}
    </div>
  )
}

export default Timeline
