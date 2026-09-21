import type { AppData, DailyEntry, JournalEntry } from './types'
import { STORAGE_KEY } from './types'

export type StorageBackend = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

function defaultBackend(): StorageBackend {
  if (typeof localStorage !== 'undefined') return localStorage
  const mem = new Map<string, string>()
  return {
    getItem: (k) => (mem.has(k) ? mem.get(k)! : null),
    setItem: (k, v) => {
      mem.set(k, v)
    },
    removeItem: (k) => {
      mem.delete(k)
    },
  }
}

let backend: StorageBackend = defaultBackend()

export function setStorageBackend(b: StorageBackend): void {
  backend = b
}

export function resetStorageBackend(): void {
  backend = defaultBackend()
}

export function createMemoryBackend(): StorageBackend {
  const mem = new Map<string, string>()
  return {
    getItem: (k) => (mem.has(k) ? mem.get(k)! : null),
    setItem: (k, v) => {
      mem.set(k, v)
    },
    removeItem: (k) => {
      mem.delete(k)
    },
  }
}

export function emptyData(): AppData {
  return {
    version: 1,
    onboardingDone: false,
    onboardingStage: 0,
    dailies: {},
    journals: [],
    hospitalChecks: {},
  }
}

export function loadData(): AppData {
  try {
    const raw = backend.getItem(STORAGE_KEY)
    if (!raw) return emptyData()
    const parsed = JSON.parse(raw) as Partial<AppData>
    return {
      version: 1,
      onboardingDone: Boolean(parsed.onboardingDone),
      onboardingStage: Math.min(2, Math.max(0, Number(parsed.onboardingStage) || 0)),
      dailies: (parsed.dailies && typeof parsed.dailies === 'object'
        ? parsed.dailies
        : {}) as Record<string, DailyEntry>,
      journals: Array.isArray(parsed.journals)
        ? (parsed.journals as Array<JournalEntry & { confidence?: number }>).map((j) => ({
            ...j,
            stress: j.stress ?? j.confidence ?? 3,
          }))
        : [],
      hospitalChecks:
        parsed.hospitalChecks && typeof parsed.hospitalChecks === 'object'
          ? (parsed.hospitalChecks as Record<string, boolean>)
          : {},
    }
  } catch {
    return emptyData()
  }
}

export function saveData(data: AppData): void {
  backend.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function getOrCreateDaily(
  data: AppData,
  date: string,
): { data: AppData; entry: DailyEntry } {
  const existing = data.dailies[date]
  if (existing) return { data, entry: existing }
  const entry: DailyEntry = {
    date,
    pushupDone: false,
    backDone: false,
    clothingConfidence: 0,
  }
  const next = {
    ...data,
    dailies: { ...data.dailies, [date]: entry },
  }
  return { data: next, entry }
}
