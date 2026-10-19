import { describe, expect, test, beforeEach } from 'bun:test'
import {
  AGE_GROUPS,
  AGE_STORAGE_KEY,
  ADULT_COMPRESSION,
  TEEN_COPY,
  createAgeMemoryBackend,
  isAgeGroup,
  isTeen,
  loadAgeGroup,
  saveAgeGroup,
  setAgeBackend,
  type AgeBackend,
} from '../lib/ageGroup'
import {
  allVerifiedCases,
  badgeForCase,
  caseForDate,
  caseMatchesAge,
  hasValidAgeGroups,
  orderedCases,
  personAdjacentPairs,
  resolveKind,
  rotationForAge,
  spreadPersons,
} from '../lib/dailyCases'
import { GUIDE_ARTICLES, allGuideAgeGroupsValid, guidesForAge } from '../lib/guides'
import { FREE_WORKOUTS, ONBOARDING, TEEN_WORKOUTS } from '../lib/content'
import { FIT_GUIDE_SECTIONS } from '../lib/proContent'

describe('ageGroups tagging (cases)', () => {
  test('every case has a non-empty, valid, duplicate-free ageGroups array', () => {
    const bad = allVerifiedCases()
      .filter((c) => !hasValidAgeGroups(c))
      .map((c) => c.id)
    expect(bad).toEqual([])
    expect(allVerifiedCases().length).toBeGreaterThanOrEqual(42)
  })

  test('알아두기 from medical organisations / guidelines (sourceTier medical-org) target all age groups', () => {
    for (const c of allVerifiedCases()) {
      if (c.sourceTier === 'medical-org') {
        expect(badgeForCase(c), c.id).toBe('알아두기')
        expect([...c.ageGroups].sort(), c.id).toEqual([...AGE_GROUPS].sort())
      }
    }
  })

  test('puberty / adolescence (non-info) cases include 10대', () => {
    for (const c of allVerifiedCases()) {
      if (c.type === 'pubertal') expect(c.ageGroups, c.id).toContain('10s')
    }
  })

  test('medication-related cases include 40~50대 (teen-patient exception documented)', () => {
    const TEEN_PATIENT_EXCEPTIONS = new Set(['dc-033'])
    for (const c of allVerifiedCases()) {
      if (c.type !== 'drug-induced' || TEEN_PATIENT_EXCEPTIONS.has(c.id)) continue
      expect(c.ageGroups, c.id).toContain('40-50s')
    }
    const teenDrug = allVerifiedCases().find((c) => c.id === 'dc-033')
    expect(teenDrug?.ageGroups).toContain('10s')
  })

  test('every age group has at least one matching case', () => {
    for (const g of AGE_GROUPS) {
      expect(orderedCases().some((c) => caseMatchesAge(c, g)), g).toBe(true)
    }
  })
})

describe('age-filtered rotation', () => {
  test('filtered rotation contains exactly the matching cases', () => {
    for (const g of AGE_GROUPS) {
      const rot = rotationForAge(g)
      const expected = orderedCases().filter((c) => caseMatchesAge(c, g))
      expect(rot.map((c) => c.id).sort()).toEqual(expected.map((c) => c.id).sort())
      expect(rot.every((c) => c.ageGroups.includes(g))).toBe(true)
    }
  })

  test('deterministic: same Seoul date + group => same case, and case matches group', () => {
    for (const g of AGE_GROUPS) {
      const a = caseForDate(new Date('2026-10-19T01:00:00+09:00'), g)
      const b = caseForDate(new Date('2026-10-19T23:00:00+09:00'), g)
      expect(a?.id).toBe(b?.id)
      expect(a?.ageGroups).toContain(g)
      expect(rotationForAge(g).map((c) => c.id)).toEqual(rotationForAge(g).map((c) => c.id))
    }
  })

  test('no group arg keeps the original global rotation', () => {
    const d = new Date('2026-10-19T09:00:00+09:00')
    expect(caseForDate(d)?.id).toBe(caseForDate(d, null)?.id)
  })

  test('filtered rotation keeps 실제 사례 adjacency at the unavoidable minimum', () => {
    for (const g of AGE_GROUPS) {
      const rot = rotationForAge(g)
      const p = rot.filter((c) => resolveKind(c) === 'person').length
      const o = rot.length - p
      expect(personAdjacentPairs(rot).length, g).toBeLessThanOrEqual(Math.max(0, p - o))
    }
  })

  test('spreadPersons keeps relative order within persons and within others', () => {
    const src = orderedCases()
    const out = spreadPersons(src)
    const isP = (id: string) => resolveKind(src.find((c) => c.id === id)!) === 'person'
    expect(out.map((c) => c.id).filter(isP)).toEqual(src.map((c) => c.id).filter(isP))
    expect(out.map((c) => c.id).filter((id) => !isP(id))).toEqual(
      src.map((c) => c.id).filter((id) => !isP(id)),
    )
    expect(out).toHaveLength(src.length)
  })
})

describe('v0.5.0 non-drug / non-surgery evidence additions (dc-043+)', () => {
  const added = allVerifiedCases().filter((c) => Number(c.id.slice(3)) >= 43)
  test('appended cases are 연구 결과 or 알아두기 only, never 실제 사례', () => {
    expect(added.length).toBeGreaterThanOrEqual(9)
    for (const c of added) {
      expect(['연구 결과', '알아두기'], c.id).toContain(badgeForCase(c))
      expect(resolveKind(c), c.id).not.toBe('person')
    }
    const last = orderedCases()[orderedCases().length - 1]
    expect(resolveKind(last)).not.toBe('person')
  })
  test('pubertal research additions are 10대-only', () => {
    for (const c of added.filter((c) => badgeForCase(c) === '연구 결과')) {
      expect(c.ageGroups, c.id).toEqual(['10s'])
    }
  })
})

describe('ageGroups tagging (guides)', () => {
  test('guide articles, onboarding stages and fit guide all carry valid ageGroups', () => {
    expect(allGuideAgeGroupsValid()).toBe(true)
    for (const s of ONBOARDING) {
      expect(s.ageGroups.length).toBeGreaterThan(0)
      expect(s.ageGroups.every((g) => isAgeGroup(g))).toBe(true)
    }
    for (const s of FIT_GUIDE_SECTIONS) {
      expect(s.ageGroups.length).toBeGreaterThan(0)
      expect(s.ageGroups.every((g) => isAgeGroup(g))).toBe(true)
    }
  })

  test('each age group gets at least one guide first; others hold the rest', () => {
    for (const g of AGE_GROUPS) {
      const { mine, others } = guidesForAge(g)
      expect(mine.length).toBeGreaterThan(0)
      expect(mine.length + others.length).toBe(GUIDE_ARTICLES.length)
      expect(mine.every((a) => a.ageGroups.includes(g))).toBe(true)
    }
    expect(guidesForAge(null).mine.length).toBe(GUIDE_ARTICLES.length)
  })
})

describe('age group storage (localStorage only, code only)', () => {
  let mem: AgeBackend
  beforeEach(() => {
    mem = createAgeMemoryBackend()
    setAgeBackend(mem)
  })

  test('roundtrip stores only the group code under one key', () => {
    expect(loadAgeGroup()).toBeNull()
    const writes: Array<[string, string]> = []
    setAgeBackend({
      getItem: (k) => mem.getItem(k),
      setItem: (k, v) => {
        writes.push([k, v])
        mem.setItem(k, v)
      },
      removeItem: (k) => mem.removeItem(k),
    })
    saveAgeGroup('20-30s')
    expect(loadAgeGroup()).toBe('20-30s')
    expect(writes).toEqual([[AGE_STORAGE_KEY, '20-30s']])
  })

  test('invalid stored value is ignored', () => {
    mem.setItem(AGE_STORAGE_KEY, '1990-01-01')
    expect(loadAgeGroup()).toBeNull()
    expect(isTeen('10s')).toBe(true)
    expect(isTeen('20-30s')).toBe(false)
    expect(isTeen(null)).toBe(false)
  })
})

describe('teen mode copy & softened guidance', () => {
  const teenTexts = [
    ...Object.values(TEEN_COPY),
    ...Object.values(ADULT_COMPRESSION),
    ...TEEN_WORKOUTS.flatMap((w) => [w.title, w.reps, w.note, ...w.cues]),
    ...GUIDE_ARTICLES.flatMap((a) => [a.title, ...a.paragraphs]),
  ]

  test('guardian + 소아청소년과 notice and 보호자 동의 message present', () => {
    expect(TEEN_COPY.guardianTitle).toContain('보호자')
    expect(TEEN_COPY.guardianTitle).toContain('소아청소년과')
    expect(TEEN_COPY.guardianNotice).toContain('소아청소년과')
    expect(TEEN_COPY.proBlockedTitle).toContain('보호자 동의')
    expect(TEEN_COPY.proBlocked).toContain('결제')
  })

  test('teen workouts are lower intensity than the Free default', () => {
    for (const t of TEEN_WORKOUTS) {
      const base = FREE_WORKOUTS.find((f) => f.id === t.id)!
      expect(t.sets).toBeLessThan(base.sets)
      expect(t.restSec).toBeGreaterThan(base.restSec)
    }
    expect(TEEN_COPY.compression).toContain('권하지 않아요')
  })

  test('new copy: 해요체 endings, no 코칭, no hype words', () => {
    for (const s of teenTexts) {
      expect(s).not.toMatch(/코칭/)
      expect(s).not.toMatch(/완치|기적|보장|100%/)
      expect(s.trim()).not.toMatch(/다\.\s*$/)
    }
  })
})
