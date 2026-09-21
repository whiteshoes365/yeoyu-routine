/** Local calendar date YYYY-MM-DD */
export function todayKey(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Monday-first week keys for the week containing `d` */
export function weekKeys(d = new Date()): string[] {
  const day = d.getDay() // 0 Sun
  const mondayOffset = day === 0 ? -6 : 1 - day
  const monday = new Date(d)
  monday.setDate(d.getDate() + mondayOffset)
  monday.setHours(12, 0, 0, 0)
  const keys: string[] = []
  for (let i = 0; i < 7; i++) {
    const x = new Date(monday)
    x.setDate(monday.getDate() + i)
    keys.push(todayKey(x))
  }
  return keys
}

export const WEEK_LABELS = ['월', '화', '수', '목', '금', '토', '일'] as const

export function isDailyComplete(entry: {
  pushupDone: boolean
  backDone: boolean
  clothingConfidence: number
} | undefined): boolean {
  if (!entry) return false
  return entry.pushupDone && entry.backDone && entry.clothingConfidence >= 1
}
