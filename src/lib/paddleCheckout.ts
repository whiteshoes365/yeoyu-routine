/**
 * Paddle Billing overlay checkout (client-side only).
 * Uses `@paddle/paddle-js` → initializePaddle (no API secrets in the browser).
 */
import { initializePaddle, type Paddle, type CheckoutEventsData } from '@paddle/paddle-js'
import { loadSubscription, saveSubscription, type SubRecord } from './subscription'

export type PaddleEnv = 'sandbox' | 'production'

export type OpenProCheckoutHandlers = {
  onToast: (msg: string) => void
  onUnlocked: (rec: SubRecord) => void
  /** Operator-facing vs end-user when keys missing */
  isOperator?: boolean
}

function readToken(): string {
  return (import.meta.env.VITE_PADDLE_CLIENT_TOKEN as string | undefined)?.trim() || ''
}

function readPriceId(): string {
  return (import.meta.env.VITE_PADDLE_PRICE_ID_PRO_MONTHLY as string | undefined)?.trim() || ''
}

export function getPaddleEnv(): PaddleEnv {
  const v = (import.meta.env.VITE_PADDLE_ENV as string | undefined)?.trim().toLowerCase()
  return v === 'production' ? 'production' : 'sandbox'
}

export function getCustomerPortalUrl(): string {
  return (import.meta.env.VITE_PADDLE_CUSTOMER_PORTAL_URL as string | undefined)?.trim() || ''
}

/** Token must be test_/live_ and price id pri_… */
export function isPaddleConfigured(
  token: string = readToken(),
  priceId: string = readPriceId(),
): boolean {
  const tok = token.trim()
  const pri = priceId.trim()
  const tokenOk = tok.startsWith('test_') || tok.startsWith('live_')
  const priceOk = pri.startsWith('pri_')
  return tokenOk && priceOk
}

/**
 * Mock subscription switcher: DEV, VITE_ALLOW_MOCK_SUB=true, or Paddle not configured.
 */
export function isMockSubUiEnabled(): boolean {
  if (import.meta.env.DEV) return true
  if (import.meta.env.VITE_ALLOW_MOCK_SUB === 'true') return true
  return !isPaddleConfigured()
}

export const PADDLE_COPY = {
  endUserUnavailable: '지금은 결제를 받을 수 없어요.',
  operatorKeysMissing:
    'Paddle 키를 설정에 넣어야 합니다. VITE_PADDLE_CLIENT_TOKEN(test_/live_)과 VITE_PADDLE_PRICE_ID_PRO_MONTHLY(pri_)를 확인하세요.',
  checkoutOpened: '결제 창을 열었습니다.',
  checkoutSuccess: 'Pro 구독이 활성화되었습니다. 감사합니다.',
  checkoutError: '결제 창을 열지 못했어요. 잠시 후 다시 시도해 주세요.',
  portalMissing: '포털 링크는 설정 후 표시',
} as const

let paddlePromise: Promise<Paddle | undefined> | null = null
let completionHandler: ((data: CheckoutEventsData | undefined) => void) | null = null

function extractIds(data: CheckoutEventsData | undefined): {
  paddleCustomerId?: string
  paddleTransactionId?: string
  paddleSubscriptionId?: string
} {
  if (!data) return {}
  const customerId =
    typeof data.customer?.id === 'string' && data.customer.id.startsWith('ctm_')
      ? data.customer.id
      : undefined
  const transactionId =
    typeof data.transaction_id === 'string' && data.transaction_id.startsWith('txn_')
      ? data.transaction_id
      : undefined
  // subscription id is not always on checkout.completed; accept if present on payload
  const anyData = data as CheckoutEventsData & { subscription_id?: string | null }
  const subscriptionId =
    typeof anyData.subscription_id === 'string' && anyData.subscription_id.startsWith('sub_')
      ? anyData.subscription_id
      : undefined
  return {
    paddleCustomerId: customerId,
    paddleTransactionId: transactionId,
    paddleSubscriptionId: subscriptionId,
  }
}

async function ensurePaddle(): Promise<Paddle | undefined> {
  if (!paddlePromise) {
    const token = readToken()
    const environment = getPaddleEnv()
    paddlePromise = initializePaddle({
      environment,
      token,
      eventCallback: (event) => {
        if (event.name === 'checkout.completed') {
          completionHandler?.(event.data)
        }
      },
    }).catch((err) => {
      console.error('[paddle] initialize failed', err)
      paddlePromise = null
      return undefined
    })
  }
  return paddlePromise
}

/** Reset cached Paddle instance (tests / re-init after env change). */
export function resetPaddleClient(): void {
  paddlePromise = null
  completionHandler = null
}

export async function openProCheckout(handlers: OpenProCheckoutHandlers): Promise<void> {
  const token = readToken()
  const priceId = readPriceId()

  if (!isPaddleConfigured(token, priceId)) {
    if (handlers.isOperator) {
      handlers.onToast(PADDLE_COPY.operatorKeysMissing)
    } else {
      handlers.onToast(PADDLE_COPY.endUserUnavailable)
    }
    return
  }

  completionHandler = (data) => {
    const ids = extractIds(data)
    const prev = loadSubscription()
    const next: SubRecord = {
      ...prev,
      status: 'pro',
      ...ids,
    }
    saveSubscription(next)
    handlers.onUnlocked(next)
    handlers.onToast(PADDLE_COPY.checkoutSuccess)
  }

  try {
    const paddle = await ensurePaddle()

    if (!paddle) {
      handlers.onToast(PADDLE_COPY.checkoutError)
      return
    }

    paddle.Checkout.open({
      items: [{ priceId, quantity: 1 }],
    })
  } catch (err) {
    console.error('[paddle] checkout open failed', err)
    handlers.onToast(PADDLE_COPY.checkoutError)
  }
}
