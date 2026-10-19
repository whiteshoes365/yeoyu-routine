import rawCases from '../data/daily-cases.json'
import { isAgeGroup, type AgeGroup } from './ageGroup'

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
  'dc-024',
  'dc-025',
  'dc-026',
  'dc-027',
  'dc-028',
  'dc-029',
  'dc-030',
  'dc-031',
  'dc-032',
  'dc-033',
  'dc-034',
  'dc-036',
  'dc-039',
  'dc-041',
])

export type CaseKind = 'person' | 'research' | 'info'

export type DailyCase = {
  id: string
  type: string
  sourceTier: string
  region: string
  /** v0.5.0: target age groups (codes from AGE_GROUPS). Required, non-empty. */
  ageGroups: AgeGroup[]
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

export function caseForDate(d: Date = new Date(), group: AgeGroup | null = null): DailyCase | null {
  const list = group ? rotationForAge(group) : orderedCases()
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

/** True when the case carries a non-empty, valid ageGroups array. */
export function hasValidAgeGroups(c: DailyCase): boolean {
  return (
    Array.isArray(c.ageGroups) &&
    c.ageGroups.length > 0 &&
    c.ageGroups.every((g) => isAgeGroup(g)) &&
    new Set(c.ageGroups).size === c.ageGroups.length
  )
}

export function caseMatchesAge(c: DailyCase, group: AgeGroup): boolean {
  return Array.isArray(c.ageGroups) && c.ageGroups.includes(group)
}

function isPersonCase(c: DailyCase): boolean {
  return resolveKind(c) === 'person'
}

/**
 * Deterministic re-spacing for a filtered rotation. Keeps the relative order of
 * 실제 사례 and of the other cases (each as in the global rotation), and places the
 * j-th 실제 사례 at index floor(j·N/P). When P ≤ N/2 no two 실제 사례 touch (incl. wrap);
 * otherwise adjacency is the unavoidable minimum P − (N − P). Global CASE_ORDER is untouched.
 */
export function spreadPersons(list: readonly DailyCase[]): DailyCase[] {
  const persons = list.filter((c) => isPersonCase(c))
  const others = list.filter((c) => !isPersonCase(c))
  const n = list.length
  const p = persons.length
  if (p === 0 || others.length === 0) return [...list]
  const personSlots = new Set<number>()
  for (let j = 0; j < p; j++) personSlots.add(Math.floor((j * n) / p))
  const out: DailyCase[] = []
  let pi = 0
  let oi = 0
  for (let i = 0; i < n; i++) {
    if (personSlots.has(i)) out.push(persons[pi++]!)
    else out.push(others[oi++]!)
  }
  return out
}

/**
 * Rotation for one age group: cases tagged with the group, in global rotation order,
 * re-spaced so 실제 사례 are not adjacent where possible. Falls back to the full
 * rotation when no case matches.
 */
export function rotationForAge(group: AgeGroup): DailyCase[] {
  const all = orderedCases()
  const filtered = all.filter((c) => caseMatchesAge(c, group))
  if (filtered.length === 0) return all
  return spreadPersons(filtered)
}

/** Adjacent 실제 사례 pairs (incl. wrap) in a rotation — for tests / diagnostics. */
export function personAdjacentPairs(list: readonly DailyCase[]): string[] {
  const pairs: string[] = []
  if (list.length < 2) return pairs
  for (let i = 0; i < list.length; i++) {
    const a = list[i]!
    const b = list[(i + 1) % list.length]!
    if (isPersonCase(a) && isPersonCase(b)) pairs.push(`${a.id}|${b.id}`)
  }
  return pairs
}
