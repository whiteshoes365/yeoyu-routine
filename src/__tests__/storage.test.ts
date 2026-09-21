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
