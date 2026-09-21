export type SubscriptionStatus = 'free' | 'trial' | 'pro'

export const SUB_STORAGE_KEY = 'yeoyu-routine-sub-v1'

/** Free users see only the most recent N journal entries (long-term history is Pro). */
export const FREE_JOURNAL_LIMIT = 7

export type SubRecord = {
  status: SubscriptionStatus
  /** ISO date when trial started (local mock) */
  trialStartedAt?: string
}

export type SubStorageBackend = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

const DEFAULT: SubRecord = { status: 'free' }

function memoryBackend(): SubStorageBackend {
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

let backend: SubStorageBackend =
  typeof localStorage !== 'undefined' ? localStorage : memoryBackend()

export function setSubStorageBackend(b: SubStorageBackend): void {
  backend = b
}

export function createSubMemoryBackend(): SubStorageBackend {
  return memoryBackend()
}

export function emptySub(): SubRecord {
  return { ...DEFAULT }
}

export function loadSubscription(): SubRecord {
  try {
    const raw = backend.getItem(SUB_STORAGE_KEY)
    if (!raw) return emptySub()
    const parsed = JSON.parse(raw) as Partial<SubRecord>
    const status = parsed.status
    if (status !== 'free' && status !== 'trial' && status !== 'pro') {
      return emptySub()
    }
    return {
      status,
      trialStartedAt:
        typeof parsed.trialStartedAt === 'string' ? parsed.trialStartedAt : undefined,
    }
  } catch {
    return emptySub()
  }
}

export function saveSubscription(rec: SubRecord): void {
  backend.setItem(SUB_STORAGE_KEY, JSON.stringify(rec))
}

/** trial · pro unlock paid UI */
export function hasProAccess(status: SubscriptionStatus): boolean {
  return status === 'trial' || status === 'pro'
}

export function statusLabel(status: SubscriptionStatus): string {
  switch (status) {
    case 'pro':
      return 'Pro'
    case 'trial':
      return '7일 체험 중'
    default:
      return 'Free'
  }
}
