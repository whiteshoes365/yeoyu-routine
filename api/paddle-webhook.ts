/**
 * Paddle Billing webhook endpoint.
 *
 * Verifies `Paddle-Signature` (HMAC-SHA256) with server-only `PADDLE_WEBHOOK_SECRET`.
 * Pro unlock today is still client-side (checkout.completed → localStorage).
 * This handler acknowledges subscription.* / transaction.completed and logs
 * KR consent_requirements when present — no user auth DB yet.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  handlePaddleWebhookEvent,
  verifyPaddleSignature,
  type PaddleWebhookEvent,
} from '../src/lib/paddleWebhook'

export const config = {
  api: {
    bodyParser: false,
  },
}

async function readRawBody(req: VercelRequest): Promise<string> {
  if (typeof req.body === 'string') return req.body
  if (Buffer.isBuffer(req.body)) return req.body.toString('utf8')
  if (req.body && typeof req.body === 'object') {
    // Fallback if body was already parsed — signature may fail; prefer raw
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
    // Honest: unlock is still client-side until accounts exist
    unlock: 'client_checkout_completed',
  })
}
