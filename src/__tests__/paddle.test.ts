import { describe, expect, test, beforeEach } from 'bun:test'
import {
  isPaddleConfigured,
  isMockSubUiEnabled,
  PADDLE_COPY,
} from '../lib/paddleCheckout'
import {
  createSubMemoryBackend,
  loadSubscription,
  saveSubscription,
  setSubStorageBackend,
} from '../lib/subscription'
import { PAYWALL } from '../lib/paywall'
import {
  handlePaddleWebhookEvent,
  parsePaddleSignature,
  verifyPaddleSignature,
} from '../lib/paddleWebhook'
import { createHmac } from 'node:crypto'

describe('isPaddleConfigured', () => {
  test('true for test_ + pri_', () => {
    expect(isPaddleConfigured('test_abc', 'pri_01xyz')).toBe(true)
  })
  test('true for live_ + pri_', () => {
    expect(isPaddleConfigured('live_abc', 'pri_01xyz')).toBe(true)
  })
  test('false when token missing prefix', () => {
    expect(isPaddleConfigured('sandbox_abc', 'pri_01xyz')).toBe(false)
    expect(isPaddleConfigured('', 'pri_01xyz')).toBe(false)
  })
  test('false when price missing pri_', () => {
    expect(isPaddleConfigured('test_abc', 'price_01')).toBe(false)
    expect(isPaddleConfigured('test_abc', '')).toBe(false)
  })
})

describe('SubRecord paddle ids round-trip', () => {
  beforeEach(() => {
    setSubStorageBackend(createSubMemoryBackend())
  })

  test('stores and loads paddle ids', () => {
    saveSubscription({
      status: 'pro',
      paddleCustomerId: 'ctm_01abc',
      paddleSubscriptionId: 'sub_01def',
      paddleTransactionId: 'txn_01ghi',
    })
    const loaded = loadSubscription()
    expect(loaded.status).toBe('pro')
    expect(loaded.paddleCustomerId).toBe('ctm_01abc')
    expect(loaded.paddleSubscriptionId).toBe('sub_01def')
    expect(loaded.paddleTransactionId).toBe('txn_01ghi')
  })

  test('rejects non-prefixed ids', () => {
    saveSubscription({
      status: 'pro',
      paddleCustomerId: 'bad',
      paddleSubscriptionId: 'also-bad',
      paddleTransactionId: 'txn_ok',
    })
    const loaded = loadSubscription()
    expect(loaded.paddleCustomerId).toBeUndefined()
    expect(loaded.paddleSubscriptionId).toBeUndefined()
    expect(loaded.paddleTransactionId).toBe('txn_ok')
  })
})

describe('paywall CTA strings', () => {
  test('price and banned phrases', () => {
    expect(PAYWALL.proCta).toContain('₩4,900')
    expect(PAYWALL.priceLabel).toContain('₩4,900')
    const blob = JSON.stringify(PAYWALL)
    for (const bad of ['플레이스홀더', '곧 공개', '연동 예정', '결제 준비 중']) {
      expect(blob).not.toContain(bad)
    }
    expect(blob).not.toMatch(/코칭/)
  })

  test('trial is local preview label', () => {
    expect(PAYWALL.trialCta).toMatch(/로컬/)
  })
})

describe('mock UI gate', () => {
  test('helper is boolean', () => {
    expect(typeof isMockSubUiEnabled()).toBe('boolean')
  })

  test('PADDLE_COPY has end-user message', () => {
    expect(PADDLE_COPY.endUserUnavailable).toContain('결제를 받을 수 없어요')
    expect(PADDLE_COPY.operatorKeysMissing).toContain('Paddle')
  })
})

describe('paddle webhook signature', () => {
  const secret = 'pdl_ntfset_test_secret_key'
  const body = JSON.stringify({
    event_id: 'evt_01',
    event_type: 'subscription.created',
    data: { id: 'sub_01' },
  })
  const ts = '1700000000'

  function sign(tsStr: string, raw: string): string {
    const payload = `${tsStr}:${raw}`
    const h1 = createHmac('sha256', secret).update(payload, 'utf8').digest('hex')
    return `ts=${tsStr};h1=${h1}`
  }

  test('parse header', () => {
    const p = parsePaddleSignature('ts=123;h1=abc')
    expect(p).toEqual({ ts: '123', h1: ['abc'] })
  })

  test('accepts valid signature', () => {
    const header = sign(ts, body)
    const result = verifyPaddleSignature(body, header, secret, {
      nowSec: Number(ts),
      toleranceSec: 60,
    })
    expect(result.ok).toBe(true)
  })

  test('rejects bad signature', () => {
    const header = `ts=${ts};h1=${'0'.repeat(64)}`
    const result = verifyPaddleSignature(body, header, secret, {
      nowSec: Number(ts),
      toleranceSec: 60,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('signature_mismatch')
  })

  test('rejects missing signature', () => {
    const result = verifyPaddleSignature(body, null, secret)
    expect(result.ok).toBe(false)
  })

  test('handles subscription.updated consent_requirements', () => {
    const r = handlePaddleWebhookEvent({
      event_type: 'subscription.updated',
      data: { consent_requirements: { payment_method_reuse: true } },
    })
    expect(r.acknowledged).toBe(true)
    expect(r.consentRequired).toBe(true)
  })
})
