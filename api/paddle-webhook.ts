/**
 * Paddle Billing webhook endpoint (self-contained for Vercel serverless).
 *
 * Verifies `Paddle-Signature` (HMAC-SHA256) with server-only `PADDLE_WEBHOOK_SECRET`.
 * Pro unlock today is still client-side (checkout.completed → localStorage).
 * Logic mirrored in src/lib/paddleWebhook.ts for unit tests.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createHmac, timingSafeEqual } from 'node:crypto'

export const config = {
  api: {
    bodyParser: false,
  },
}

type PaddleWebhookEvent = {
  event_id?: string
  event_type?: string
  occurred_at?: string
  data?: Record<string, unknown>
}

const DEFAULT_TOLERANCE_SEC = 300

function parsePaddleSignature(header: string): { ts: string; h1: string[] } | null {
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

function verifyPaddleSignature(
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

function handlePaddleWebhookEvent(event: PaddleWebhookEvent): {
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
      notes.push(
        'subscription.created received — client unlock still via checkout.completed until accounts exist',
      )
      break
    case 'subscription.updated': {
      notes.push('subscription.updated received')
      const data = event.data || {}
      const consent =
        data.consent_requirements ??
        (data as { scheduled_change?: { consent_requirements?: unknown } }).scheduled_change
          ?.consent_requirements
      if (consent != null) {
        consentRequired = true
        notes.push(
          'consent_requirements present (KR/KFTC) — acknowledged; surface in settings when auth exists',
        )
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

async function readRawBody(req: VercelRequest): Promise<string> {
  if (typeof req.body === 'string') return req.body
  if (Buffer.isBuffer(req.body)) return req.body.toString('utf8')
  if (req.body && typeof req.body === 'object') {
    return JSON.stringify(req.body)
  }
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }
  return Buffer.concat(chunks).toString('utf8')
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  const secret = process.env.PADDLE_WEBHOOK_SECRET || ''
  const signature =
    (req.headers['paddle-signature'] as string | undefined) ||
    (req.headers['Paddle-Signature'] as string | undefined) ||
    null

  let rawBody: string
  try {
    rawBody = await readRawBody(req)
  } catch (err) {
    console.error('[paddle-webhook] body read failed', err)
    return res.status(400).json({ error: 'invalid_body' })
  }

  const verified = verifyPaddleSignature(rawBody, signature, secret)
  if (!verified.ok) {
    console.warn('[paddle-webhook] signature rejected', verified.reason)
    return res.status(401).json({ error: 'invalid_signature', reason: verified.reason })
  }

  let event: PaddleWebhookEvent
  try {
    event = JSON.parse(rawBody) as PaddleWebhookEvent
  } catch {
    return res.status(400).json({ error: 'invalid_json' })
  }

  const result = handlePaddleWebhookEvent(event)
  console.log(
    '[paddle-webhook]',
    JSON.stringify({
      event_id: event.event_id,
      event_type: result.eventType,
      notes: result.notes,
      consentRequired: result.consentRequired ?? false,
    }),
  )

  return res.status(200).json({
    ok: true,
    eventType: result.eventType,
    unlock: 'client_checkout_completed',
  })
}
