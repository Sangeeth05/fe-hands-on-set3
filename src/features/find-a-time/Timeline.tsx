import { memo, useRef, useState, type KeyboardEvent } from 'react'
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

const AttendeeRow = memo(function AttendeeRow({ name, busy }: AttendeeBusy) {
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
})

interface FreeSlotsProps {
  slots: Interval[]
  onSelectSlot: (slot: Interval) => void
}

const NEXT_KEYS = ['ArrowRight', 'ArrowDown']
const PREVIOUS_KEYS = ['ArrowLeft', 'ArrowUp']

/** A listbox with a roving tabindex: one Tab stop, arrow keys move, Enter books. */
function FreeSlots({ slots, onSelectSlot }: FreeSlotsProps) {
  const [active, setActive] = useState(0)
  const optionRefs = useRef<(HTMLDivElement | null)[]>([])
  const activeIndex = Math.min(active, Math.max(slots.length - 1, 0))

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>, index: number) {
    let next: number | undefined
    if (NEXT_KEYS.includes(event.key)) next = (index + 1) % slots.length
    if (PREVIOUS_KEYS.includes(event.key)) next = (index - 1 + slots.length) % slots.length
    if (event.key === 'Home') next = 0
    if (event.key === 'End') next = slots.length - 1

    if (next !== undefined) {
      event.preventDefault()
      setActive(next)
      optionRefs.current[next]?.focus()
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSelectSlot(slots[index])
    }
  }

  return (
    <div
      className="timeline-track"
      role="listbox"
      aria-label="Common free slots"
      aria-orientation="horizontal"
    >
      {slots.map((slot, index) => (
        <div
          key={slot.start}
          ref={(element) => {
            optionRefs.current[index] = element
          }}
          role="option"
          aria-selected={index === activeIndex}
          aria-label={`Free ${formatTime(slot.start)} to ${formatTime(slot.end)}`}
          tabIndex={index === activeIndex ? 0 : -1}
          className="free-slot"
          style={blockStyle(slot)}
          onFocus={() => setActive(index)}
          onClick={() => onSelectSlot(slot)}
          onKeyDown={(event) => handleKeyDown(event, index)}
        />
      ))}
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
        <FreeSlots slots={slots} onSelectSlot={onSelectSlot} />
      </div>
      <p role="status" className="visually-hidden">
        {slots.length === 1 ? '1 free slot' : `${slots.length} free slots`}
      </p>

      {attendees.map((attendee) => (
        <AttendeeRow key={attendee.email} {...attendee} />
      ))}
    </div>
  )
}

export default Timeline
