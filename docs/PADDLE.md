# Paddle Billing — 여유루틴 Pro

월 ₩4,900 KRW 구독. 클라이언트: `@paddle/paddle-js` (`initializePaddle` + overlay checkout).

## 현재 동작

| 경로 | 역할 |
|------|------|
| `checkout.completed` (브라우저) | Pro 언락 → `localStorage` (`yeoyu-routine-sub-v1`) |
| `/api/paddle-webhook` | 서명 검증 + `subscription.*` / `transaction.completed` 로그 골격. 계정 DB 없음 → 서버 언락 없음 |

## 대시보드 체크리스트

1. Sandbox 계정 → Product **여유루틴 Pro** → Price **₩4,900 KRW** monthly recurring → `pri_…`
2. Developer tools → Authentication → Client-side token `test_…` (live는 `live_…`)
3. Checkout → Website approval: `yeoyu-routine.vercel.app`, `localhost` (sandbox)
4. Payment methods: Korean local cards / Kakao Pay / Naver Pay, currency **KRW**
5. Notifications → URL `https://yeoyu-routine.vercel.app/api/paddle-webhook`  
   Events: `subscription.created`, `subscription.updated`, `subscription.canceled`, `transaction.completed`
6. Customer portal URL → `VITE_PADDLE_CUSTOMER_PORTAL_URL`
7. Go-live: `VITE_PADDLE_ENV=production`, `live_` token, live `pri_`, live webhook secret

## KR / KFTC

`subscription.updated`에 `consent_requirements`가 올 수 있음. 웹훅은 acknowledge·로그. UI 플래그는 계정 연동 후.

## 목업 정책

설정 「개발·샌드박스용 목업」은 `import.meta.env.DEV` **또는** `VITE_ALLOW_MOCK_SUB=true` **또는** Paddle 미설정일 때만 표시.

## Env

`.env.example` 참고. 서버 시크릿은 `PADDLE_*` only (no `VITE_`).
