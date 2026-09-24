import rawCases from '../data/daily-cases.json'

/** Fixed interleaved order: person cases never adjacent (incl. wrap). */
export const CASE_ORDER: readonly string[] = [
  'dc-001',
  'dc-007',
  'dc-018',
  'dc-004',
  'dc-008',
  'dc-020',
  'dc-014',
  'dc-009',
  'dc-002',
  'dc-011',
  'dc-010',
  'dc-006',
  'dc-016',
  'dc-015',
  'dc-012',
  'dc-013',
  'dc-003',
  'dc-019',
  'dc-005',
  'dc-017',
  'dc-021',
  'dc-022',
  'dc-023',
] as const

/** Real-person case ids (명시 목록). */
export const PERSON_CASE_IDS: ReadonlySet<string> = new Set([
  'dc-001',
  'dc-002',
  'dc-003',
  'dc-004',
  'dc-005',
  'dc-006',
  'dc-014',
  'dc-015',
  'dc-022',
])

export type CaseKind = 'person' | 'research' | 'info'

export type DailyCase = {
  id: string
  type: string
  sourceTier: string
  region: string
  personLabel: string
  titleKo: string
  summaryKo: string
  whatHelpedKo: string
  durationKo?: string | null
  cautionKo: string
  sourceTitle: string
  sourceUrl: string
  sourceLang: string
  verified: boolean
  notes?: string
  /** Optional override for badge kind. */
  kind?: CaseKind
}

export type CaseBadge = '실제 사례' | '연구 결과' | '알아두기'

export const CASE_CAUSE_LINE = '원인에 따라 경과가 달라요.' as const

const TYPE_LABELS: Record<string, string> = {
  pubertal: '사춘기',
  'drug-induced': '약물',
  'hormonal/medical-treatment': '호르몬·내과치료',
  'pseudo/fat': '지방형',
  lifestyle: '생활습관',
}

const allRaw = rawCases as DailyCase[]

/** Verified cases only, keyed by id. */
export function casesById(): Map<string, DailyCase> {
  const map = new Map<string, DailyCase>()
  for (const c of allRaw) {
    if (c.verified === true) map.set(c.id, c)
  }
  return map
}

/**
 * Pure order builder: fixed order first, then unknowns in `jsonOrder` sequence.
 * Exported for unit tests (appended id never reshuffles existing positions).
 */
export function buildOrderedList(
  fixedOrder: readonly string[],
  verified: DailyCase[],
): DailyCase[] {
  const byId = new Map(verified.map((c) => [c.id, c]))
  const seen = new Set<string>()
  const out: DailyCase[] = []
  for (const id of fixedOrder) {
    const c = byId.get(id)
    if (!c) continue
    out.push(c)
    seen.add(id)
  }
  for (const c of verified) {
    if (seen.has(c.id)) continue
    out.push(c)
    seen.add(c.id)
  }
  return out
}

/**
 * Ordered list for rotation: CASE_ORDER first (existing positions stable),
 * then any verified ids present in JSON but not in CASE_ORDER, in JSON file order.
 */
export function orderedCases(): DailyCase[] {
  return buildOrderedList(CASE_ORDER, allVerifiedCases())
}

/** YYYY-MM-DD in Asia/Seoul for the given instant. */
export function seoulDateKey(d: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(d)
}

/** Day number (UTC midnight of the Seoul calendar date). */
export function dayNumberFromSeoulDate(dateKey: string): number {
  const parts = dateKey.split('-').map(Number)
  const y = parts[0] ?? 0
  const m = parts[1] ?? 1
  const day = parts[2] ?? 1
  return Math.floor(Date.UTC(y, m - 1, day) / 86_400_000)
}

export function caseIndexForSeoulDate(dateKey: string, len: number): number {
  if (len <= 0) return 0
  return dayNumberFromSeoulDate(dateKey) % len
}

export function caseForDate(d: Date = new Date()): DailyCase | null {
  const list = orderedCases()
  if (list.length === 0) return null
  const key = seoulDateKey(d)
  const idx = caseIndexForSeoulDate(key, list.length)
  return list[idx] ?? null
}

export function resolveKind(c: DailyCase): CaseKind {
  if (c.kind === 'person' || c.kind === 'research' || c.kind === 'info') {
    return c.kind
  }
  if (PERSON_CASE_IDS.has(c.id)) return 'person'
  if (c.sourceTier === 'medical-org') return 'info'
  if (c.sourceTier === 'case-report') return 'research'
  if (c.sourceTier === 'news/interview') return 'person'
  return 'info'
}

export function badgeForCase(c: DailyCase): CaseBadge {
  const kind = resolveKind(c)
  if (kind === 'person') return '실제 사례'
  if (kind === 'research') return '연구 결과'
  return '알아두기'
}

export function typeLabel(type: string): string {
  return TYPE_LABELS[type] ?? type
}

export function hasDuration(c: DailyCase): boolean {
  return typeof c.durationKo === 'string' && c.durationKo.trim().length > 0
}

/** All verified cases (JSON file order). */
export function allVerifiedCases(): DailyCase[] {
  return allRaw.filter((c) => c.verified === true)
}
