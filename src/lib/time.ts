/** "HH:mm" to minutes since midnight. */
export function toMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

/** Minutes since midnight to "HH:mm". */
export function formatTime(minutes: number): string {
  const hours = String(Math.floor(minutes / 60)).padStart(2, '0')
  const mins = String(minutes % 60).padStart(2, '0')
  return `${hours}:${mins}`
}

/** Local date as YYYY-MM-DD. */
export function todayIso(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}
