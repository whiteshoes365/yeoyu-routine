export type TabId = 'onboarding' | 'routine' | 'journal' | 'settings'

export type DailyEntry = {
  date: string // YYYY-MM-DD local
  weight?: number
  pushupDone: boolean
  backDone: boolean
  clothingConfidence: number // 1-5, 0 = unset
}

export type JournalEntry = {
  id: string
  date: string
  createdAt: string
  text: string
  mood: number // 1-5
  stress: number // 1-5 (legacy key: confidence)
  routineDone?: boolean
}

export type AppData = {
  version: 1
  onboardingDone: boolean
  onboardingStage: number // 0-2
  dailies: Record<string, DailyEntry>
  journals: JournalEntry[]
  hospitalChecks: Record<string, boolean>
}

export const STORAGE_KEY = 'yeoyu-routine-v1'
