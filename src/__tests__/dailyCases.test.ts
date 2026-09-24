import { describe, expect, test } from 'bun:test'
import {
  CASE_ORDER,
  PERSON_CASE_IDS,
  allVerifiedCases,
  badgeForCase,
  caseForDate,
  caseIndexForSeoulDate,
  dayNumberFromSeoulDate,
  buildOrderedList,
  orderedCases,
  resolveKind,
  seoulDateKey,
  type DailyCase,
} from '../lib/dailyCases'

const BANNED = ['완치', '기적', '보장', '100%'] as const
/** Fields shown verbatim on the card. */
const RENDER_FIELDS = [
  'titleKo',
  'personLabel',
  'summaryKo',
  'whatHelpedKo',
  'durationKo',
  'cautionKo',
  'sourceTitle',
] as const

/**
 * Known curated-data offenders to soft-skip (DO NOT edit research JSON).
 * Populate with `${id}.${field}` entries + TODO if a future sync trips the ban list.
 */
const BANNED_WORD_SKIP: ReadonlySet<string> = new Set([
  // e.g. 'dc-000.titleKo', // TODO: content team reword
])

describe('dailyCases rotation', () => {
  test('same Seoul date => same id', () => {
    const a = caseForDate(new Date('2026-09-24T01:00:00+09:00'))
    const b = caseForDate(new Date('2026-09-24T23:59:00+09:00'))
    expect(a?.id).toBe(b?.id)
    expect(a?.id).toBeTruthy()
  })

  test('UTC 2026-09-23T16:00Z is Seoul 2026-09-24', () => {
    const key = seoulDateKey(new Date('2026-09-23T16:00:00Z'))
    expect(key).toBe('2026-09-24')
    const list = orderedCases()
    const idx = caseIndexForSeoulDate(key, list.length)
    expect(caseForDate(new Date('2026-09-23T16:00:00Z'))?.id).toBe(list[idx]?.id)
  })

  test('wrap-around uses mod length', () => {
    const list = orderedCases()
    const n = list.length
    expect(n).toBeGreaterThan(0)
    const base = dayNumberFromSeoulDate('2026-09-24')
    expect(caseIndexForSeoulDate('2026-09-24', n)).toBe(base % n)
    const far = new Date(Date.UTC(2026, 8, 24 + n))
    const farKey = `${far.getUTCFullYear()}-${String(far.getUTCMonth() + 1).padStart(2, '0')}-${String(far.getUTCDate()).padStart(2, '0')}`
    expect(caseIndexForSeoulDate(farKey, n)).toBe(caseIndexForSeoulDate('2026-09-24', n))
  })
})

describe('dailyCases order', () => {
  test('no two person cases adjacent including wrap', () => {
    const list = orderedCases()
    const ids = list.map((c) => c.id)
    expect(ids.length).toBeGreaterThan(1)
    for (let i = 0; i < ids.length; i++) {
      const a = ids[i]!
      const b = ids[(i + 1) % ids.length]!
      expect(PERSON_CASE_IDS.has(a) && PERSON_CASE_IDS.has(b)).toBe(false)
    }
  })

  test('CASE_ORDER covers current 23 and positions stay first', () => {
    const list = orderedCases()
    expect(CASE_ORDER).toHaveLength(23)
    expect(list.slice(0, CASE_ORDER.length).map((c) => c.id)).toEqual([...CASE_ORDER])
  })

  test('appended unknown id goes to the end', () => {
    const verified = allVerifiedCases()
    const known = new Set(CASE_ORDER)
    const extras = verified.filter((c) => !known.has(c.id))
    const list = orderedCases()
    if (extras.length === 0) {
      expect(list.map((c) => c.id)).toEqual([...CASE_ORDER])
    } else {
      expect(list.slice(CASE_ORDER.length).map((c) => c.id)).toEqual(extras.map((c) => c.id))
    }
    const stub: DailyCase = {
      ...verified[0]!,
      id: 'dc-999-future',
      verified: true,
    }
    const withExtra = buildOrderedList(CASE_ORDER, [...verified, stub])
    expect(withExtra.map((c) => c.id).slice(0, CASE_ORDER.length)).toEqual([...CASE_ORDER])
    expect(withExtra[withExtra.length - 1]?.id).toBe('dc-999-future')
  })
})

describe('dailyCases badges', () => {
  test('badge mapping for all 23 ids', () => {
    const list = orderedCases()
    expect(list).toHaveLength(23)
    const expectedResearch = new Set(['dc-009', 'dc-011', 'dc-012', 'dc-016', 'dc-021'])
    for (const c of list) {
      const badge = badgeForCase(c)
      if (PERSON_CASE_IDS.has(c.id)) {
        expect(badge).toBe('실제 사례')
        expect(resolveKind(c)).toBe('person')
      } else if (expectedResearch.has(c.id)) {
        expect(badge).toBe('연구 결과')
      } else if (c.sourceTier === 'medical-org') {
        expect(badge).toBe('알아두기')
      } else if (c.sourceTier === 'news/interview') {
        expect(badge).toBe('실제 사례')
      } else if (c.sourceTier === 'case-report') {
        expect(badge).toBe('연구 결과')
      }
    }
  })
})

describe('dailyCases data integrity', () => {
  test('all required fields present and sourceUrl is https', () => {
    const required = [
      'id',
      'type',
      'sourceTier',
      'personLabel',
      'titleKo',
      'summaryKo',
      'whatHelpedKo',
      'cautionKo',
      'sourceTitle',
      'sourceUrl',
      'verified',
    ] as const
    for (const c of allVerifiedCases()) {
      for (const k of required) {
        expect(c[k as keyof DailyCase], `${c.id}.${k}`).toBeDefined()
        if (k !== 'verified') {
          expect(String(c[k as keyof DailyCase]).length, `${c.id}.${k} empty`).toBeGreaterThan(0)
        }
      }
      expect(c.verified).toBe(true)
      expect(c.sourceUrl.startsWith('https'), `${c.id} sourceUrl`).toBe(true)
    }
  })

  test('rendered fields must not contain banned hype words', () => {
    const failures: string[] = []
    for (const c of allVerifiedCases()) {
      for (const field of RENDER_FIELDS) {
        const skipKey = `${c.id}.${field}`
        if (BANNED_WORD_SKIP.has(skipKey)) {
          // TODO: curated data still contains a banned token — content team must reword; do not edit JSON here.
          continue
        }
        const val = c[field]
        if (typeof val !== 'string' || !val) continue
        for (const ban of BANNED) {
          if (val.includes(ban)) {
            failures.push(`${skipKey} contains "${ban}"`)
          }
        }
      }
    }
    expect(failures).toEqual([])
  })
})
