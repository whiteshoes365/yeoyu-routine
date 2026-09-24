/**
 * Paddle Billing webhook signature verification (HMAC-SHA256).
 * Shared by api/paddle-webhook and unit tests.
 *
 * Header: `Paddle-Signature: ts=<unix>;h1=<hex>`
 * Signed payload: `${ts}:${rawBody}`
 */
import { createHmac, timingSafeEqual } from 'node:crypto'

export type PaddleWebhookEvent = {
  event_id?: string
  event_type?: string
  occurred_at?: string
  data?: Record<string, unknown>
}

const DEFAULT_TOLERANCE_SEC = 300

export function parsePaddleSignature(header: string): { ts: string; h1: string[] } | null {
  if (!header || !header.includes('=')) return null
  const parts = header.split(';').map((p) => p.trim()).filter(Boolean)
  let ts = ''
  const h1: string[] = []
  for (const part of parts) {
    const eq = part.indexOf('=')
    if (eq < 0) continue
    const key = part.slice(0, eq)
    const val = part.slice(eq + 1)
    if (key === 'ts') ts = val
    if (key === 'h1' && val) h1.push(val)
  }
  if (!ts || h1.length === 0) return null
  return { ts, h1 }
}

export function verifyPaddleSignature(
  rawBody: string,
  signatureHeader: string | null | undefined,
  secret: string,
  opts?: { toleranceSec?: number; nowSec?: number },
): { ok: true } | { ok: false; reason: string } {
  if (!secret) return { ok: false, reason: 'missing_secret' }
  if (!signatureHeader) return { ok: false, reason: 'missing_signature' }
  if (typeof rawBody !== 'string') return { ok: false, reason: 'invalid_body' }

  const parsed = parsePaddleSignature(signatureHeader)
  if (!parsed) return { ok: false, reason: 'malformed_signature' }

  const tsNum = Number(parsed.ts)
  if (!Number.isFinite(tsNum)) return { ok: false, reason: 'invalid_timestamp' }

  const nowSec = opts?.nowSec ?? Math.floor(Date.now() / 1000)
  const tolerance = opts?.toleranceSec ?? DEFAULT_TOLERANCE_SEC
  if (Math.abs(nowSec - tsNum) > tolerance) {
    return { ok: false, reason: 'timestamp_out_of_tolerance' }
  }

  const signedPayload = `${parsed.ts}:${rawBody}`
  const expected = createHmac('sha256', secret).update(signedPayload, 'utf8').digest('hex')

  const expectedBuf = Buffer.from(expected, 'utf8')
  let match = false
  for (const sig of parsed.h1) {
    const got = Buffer.from(sig, 'utf8')
    if (got.length === expectedBuf.length && timingSafeEqual(got, expectedBuf)) {
      match = true
      break
    }
  }

  if (!match) return { ok: false, reason: 'signature_mismatch' }
  return { ok: true }
}

/** Handle known event types; returns a structured log object (no user DB unlock). */
export function handlePaddleWebhookEvent(event: PaddleWebhookEvent): {
  acknowledged: boolean
  eventType: string
  notes: string[]
  consentRequired?: boolean
} {
  const eventType = event.event_type || 'unknown'
  const notes: string[] = []
  let consentRequired = false

  switch (eventType) {
    case 'subscription.created':
      notes.push('subscription.created received — client unlock still via checkout.completed until accounts exist')
      break
    case 'subscription.updated': {
      notes.push('subscription.updated received')
      const data = event.data || {}
      // KR/KFTC: consent_requirements may appear on updates for renewals
      const consent = data.consent_requirements ?? (data as { scheduled_change?: { consent_requirements?: unknown } }).scheduled_change?.consent_requirements
      if (consent != null) {
        consentRequired = true
        notes.push('consent_requirements present (KR/KFTC) — acknowledged; surface in settings when auth exists')
      }
      break
    }
    case 'subscription.canceled':
      notes.push('subscription.canceled received — no server-side revoke yet (localStorage client)')
      break
    case 'transaction.completed':
      notes.push('transaction.completed received — logged; Pro unlock remains client-side')
      break
    default:
      notes.push(`unhandled event_type=${eventType}`)
  }

  return { acknowledged: true, eventType, notes, consentRequired: consentRequired || undefined }
}
