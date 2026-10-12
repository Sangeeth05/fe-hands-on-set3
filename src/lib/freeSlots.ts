/** Half-open range [start, end) in minutes since midnight. */
export interface Interval {
  start: number
  end: number
}

export const DAY_START = 9 * 60
export const DAY_END = 18 * 60

/**
 * Clamps intervals to the working day, drops empty ones, sorts, and merges any that
 * overlap or touch. Returns new objects; the input is not mutated.
 */
export function mergeIntervals(
  intervals: Interval[],
  dayStart = DAY_START,
  dayEnd = DAY_END,
): Interval[] {
  const clamped = intervals
    .map(({ start, end }) => ({ start: Math.max(start, dayStart), end: Math.min(end, dayEnd) }))
    .filter(({ start, end }) => start < end)
    .sort((a, b) => a.start - b.start)

  const merged: Interval[] = []
  for (const interval of clamped) {
    const last = merged[merged.length - 1]
    if (last && interval.start <= last.end) {
      last.end = Math.max(last.end, interval.end)
    } else {
      merged.push(interval)
    }
  }
  return merged
}

/** Gaps of at least `duration` minutes between already-merged busy intervals. */
export function freeSlotsFromMerged(
  merged: Interval[],
  duration: number,
  dayStart = DAY_START,
  dayEnd = DAY_END,
): Interval[] {
  if (duration <= 0) return []

  const slots: Interval[] = []
  let cursor = dayStart
  for (const busy of merged) {
    if (busy.start - cursor >= duration) slots.push({ start: cursor, end: busy.start })
    cursor = busy.end
  }
  if (dayEnd - cursor >= duration) slots.push({ start: cursor, end: dayEnd })
  return slots
}

/** Each slot is a whole gap, not a duration-sized chunk of it. */
export function freeSlots(
  busy: Interval[],
  duration: number,
  dayStart = DAY_START,
  dayEnd = DAY_END,
): Interval[] {
  return freeSlotsFromMerged(mergeIntervals(busy, dayStart, dayEnd), duration, dayStart, dayEnd)
}
