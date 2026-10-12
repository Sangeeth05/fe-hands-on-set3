export const DAY_START = 9 * 60
export const DAY_END = 18 * 60
export const STEP_MINUTES = 15
export const MAX_DURATION = 4 * 60

export function toMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

export function toTimeString(minutes: number): string {
  const hours = String(Math.floor(minutes / 60)).padStart(2, '0')
  const mins = String(minutes % 60).padStart(2, '0')
  return `${hours}:${mins}`
}

/** Times from `from` to `to` (inclusive) in 15-minute steps, as HH:MM strings. */
export function timeOptions(from: number, to: number): string[] {
  const options: string[] = []
  for (let minutes = from; minutes <= to; minutes += STEP_MINUTES) {
    options.push(toTimeString(minutes))
  }
  return options
}

/** Ranges that merely touch (one ends when the other starts) do not overlap. */
export function rangesOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd
}
