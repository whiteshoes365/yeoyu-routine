/**
 * Age-group preference (v0.5.0). Stored ONLY in localStorage under AGE_STORAGE_KEY.
 * Only the group code is stored — no birthdate, name, or any other personal info.
 */

export const AGE_GROUPS = ['10s', '20-30s', '40-50s', '60s+'] as const
export type AgeGroup = (typeof AGE_GROUPS)[number]

export const AGE_LABELS: Record<AgeGroup, string> = {
  '10s': '10대',
  '20-30s': '20~30대',
  '40-50s': '40~50대',
  '60s+': '60대 이상',
}

export const AGE_STORAGE_KEY = 'yeoyu-routine-age-v1'

export function isAgeGroup(v: unknown): v is AgeGroup {
  return typeof v === 'string' && (AGE_GROUPS as readonly string[]).includes(v)
}

export function isTeen(g: AgeGroup | null | undefined): boolean {
  return g === '10s'
}

export type AgeBackend = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

function memoryBackend(): AgeBackend {
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

let backend: AgeBackend = typeof localStorage !== 'undefined' ? localStorage : memoryBackend()

export function setAgeBackend(b: AgeBackend): void {
  backend = b
}

export function createAgeMemoryBackend(): AgeBackend {
  return memoryBackend()
}

export function loadAgeGroup(): AgeGroup | null {
  try {
    const raw = backend.getItem(AGE_STORAGE_KEY)
    return isAgeGroup(raw) ? raw : null
  } catch {
    return null
  }
}

/** Persists only the group code string (e.g. "20-30s"). */
export function saveAgeGroup(g: AgeGroup): void {
  backend.setItem(AGE_STORAGE_KEY, g)
}

export function clearAgeGroup(): void {
  backend.removeItem(AGE_STORAGE_KEY)
}

/** Teen-mode copy (해요체, no doses / product names). */
export const TEEN_COPY = {
  guardianNotice:
    '10대라면 몸이 아직 자라는 중이에요. 가슴 변화가 걱정되면 혼자 고민하지 말고 보호자와 함께 소아청소년과에서 먼저 상담해 보세요. 사춘기에 생기는 변화는 시간이 지나며 저절로 줄어드는 경우가 많아요.',
  guardianTitle: '보호자 및 소아청소년과 상담 안내',
  workoutNote:
    '10대용 가벼운 버전이에요. 무게를 들거나 횟수를 늘리는 무리한 운동은 하지 말고, 숨이 차거나 아프면 바로 멈춰요. 운동은 몸을 바꾸는 치료가 아니라 기분과 자세를 돌보는 습관이에요.',
  compressionTitle: '압박 의류 안내 (10대)',
  compression:
    '10대에게는 압박티 같은 꽉 조이는 옷을 권하지 않아요. 오래 입으면 숨쉬기와 피부, 자라는 몸에 부담이 될 수 있어요. 어깨가 맞는 편한 옷과 레이어링으로 충분해요. 꼭 입고 싶다면 먼저 보호자와 소아청소년과에 물어봐요.',
  proBlockedTitle: '보호자 동의 안내',
  proBlocked:
    '10대는 앱 안에서 Pro 결제를 할 수 없어요. 결제가 필요하다면 보호자와 먼저 상의해 주세요. Free 기능(오늘루틴·오늘의 사례·가이드·익명저널)은 그대로 쓸 수 있어요.',
} as const

/** General (non-teen) compression note — anti-hype, no product names. */
export const ADULT_COMPRESSION = {
  title: '압박 의류 안내',
  body:
    '압박 의류는 치료가 아니라 옷맵시를 위한 선택일 뿐이에요. 입는다면 숨쉬기 편한 정도로 고르고, 하루 종일 오래 입는 것은 피하세요. 통증·피부 자극·숨 답답함이 있으면 바로 벗고, 걱정되면 의료 전문가와 상의하세요.',
} as const
