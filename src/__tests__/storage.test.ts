import { describe, expect, test, beforeEach } from 'bun:test'
import {
  createMemoryBackend,
  emptyData,
  loadData,
  saveData,
  setStorageBackend,
  getOrCreateDaily,
} from '../lib/storage'
import { isDailyComplete, todayKey, weekKeys } from '../lib/day'
import { tipIndexForDate } from '../lib/content'

beforeEach(() => {
  setStorageBackend(createMemoryBackend())
})

describe('storage', () => {
  test('roundtrip onboardingDone', () => {
    const d = emptyData()
    d.onboardingDone = true
    d.onboardingStage = 2
    saveData(d)
    const loaded = loadData()
    expect(loaded.onboardingDone).toBe(true)
    expect(loaded.onboardingStage).toBe(2)
  })

  test('getOrCreateDaily creates entry', () => {
    let data = emptyData()
    const { data: next, entry } = getOrCreateDaily(data, '2026-09-22')
    expect(entry.date).toBe('2026-09-22')
    expect(next.dailies['2026-09-22']).toBeDefined()
    data = next
    const again = getOrCreateDaily(data, '2026-09-22')
    expect(again.entry.pushupDone).toBe(false)
  })
})

describe('day', () => {
  test('todayKey format', () => {
    expect(todayKey(new Date('2026-09-22T12:00:00'))).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  test('weekKeys length 7 monday-first', () => {
    const keys = weekKeys(new Date('2026-09-22T12:00:00')) // Tue
    expect(keys).toHaveLength(7)
    expect(keys[0]).toBe('2026-09-21') // Mon
    expect(keys[6]).toBe('2026-09-27') // Sun
  })

  test('isDailyComplete', () => {
    expect(isDailyComplete(undefined)).toBe(false)
    expect(
      isDailyComplete({ pushupDone: true, backDone: true, clothingConfidence: 3 }),
    ).toBe(true)
    expect(
      isDailyComplete({ pushupDone: true, backDone: false, clothingConfidence: 3 }),
    ).toBe(false)
  })
})

describe('content', () => {
  test('tipIndex stable', () => {
    expect(tipIndexForDate('2026-09-22', 3)).toBe(tipIndexForDate('2026-09-22', 3))
    expect(tipIndexForDate('2026-09-22', 3)).toBeGreaterThanOrEqual(0)
    expect(tipIndexForDate('2026-09-22', 3)).toBeLessThan(3)
  })
})

import {
  createSubMemoryBackend,
  emptySub,
  hasProAccess,
  loadSubscription,
  saveSubscription,
  setSubStorageBackend,
  statusLabel,
  FREE_JOURNAL_LIMIT,
} from '../lib/subscription'
import { PAYWALL } from '../lib/paywall'
import { AFFILIATE_SLOTS, AFFILIATE_DISCLOSURE, AFFILIATE_BADGE, AFFILIATE_BANNER } from '../lib/affiliate'

describe('subscription', () => {
  beforeEach(() => {
    setSubStorageBackend(createSubMemoryBackend())
  })

  test('default free', () => {
    expect(loadSubscription().status).toBe('free')
    expect(hasProAccess('free')).toBe(false)
    expect(hasProAccess('trial')).toBe(true)
    expect(hasProAccess('pro')).toBe(true)
  })

  test('roundtrip trial/pro', () => {
    saveSubscription({ status: 'trial', trialStartedAt: '2026-09-22T00:00:00.000Z' })
    const loaded = loadSubscription()
    expect(loaded.status).toBe('trial')
    expect(loaded.trialStartedAt).toBe('2026-09-22T00:00:00.000Z')
    saveSubscription({ status: 'pro' })
    expect(loadSubscription().status).toBe('pro')
    expect(statusLabel('pro')).toBe('Pro')
    expect(emptySub().status).toBe('free')
    expect(FREE_JOURNAL_LIMIT).toBe(7)
  })
})

describe('paywall copy', () => {
  test('confirmed marketing + price', () => {
    expect(PAYWALL.headline).toContain('옷맵시')
    expect(PAYWALL.priceLabel).toBe('Pro · 월 ₩4,900')
    expect(PAYWALL.freeCta).toBe('Free 시작하기')
    expect(PAYWALL.proCta).toBe('Pro 시작 · 월 ₩4,900')
    expect(PAYWALL.proBullets).not.toMatch(/1:1|그룹 코칭/)
    expect(PAYWALL.footnote).not.toMatch(/코칭/)
    expect(PAYWALL.footnote).toContain('의료 상담')
  })
})

describe('affiliate slots', () => {
  test('three informational slots', () => {
    expect(AFFILIATE_SLOTS).toHaveLength(3)
    expect(AFFILIATE_SLOTS[0].title).toContain('다크')
    expect(AFFILIATE_SLOTS.every((s) => s.href === '#')).toBe(true)
    expect(AFFILIATE_DISCLOSURE).toContain('임시 은폐')
    expect(AFFILIATE_BADGE).toContain('임시 은폐')
    expect(AFFILIATE_BANNER).toContain('임시 은폐')
    expect(AFFILIATE_DISCLOSURE).toContain('제휴 링크')
    expect(AFFILIATE_DISCLOSURE).toContain('치료·의료 목적')
  })
})
