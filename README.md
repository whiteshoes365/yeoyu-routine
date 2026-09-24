# 여유루틴 (yeoyu-routine)

로컬 전용 PWA — **온보딩교육 · 오늘루틴 · 익명저널**.

> **면책**: 일반 정보·생활 관리 기록용이며 의학적 진단·치료·처방이 아닙니다.  
> 가성/진성/혼합 설명은 교육용이며, 개인 상태를 분류하지 않습니다.  
> 약·수술 판매, 병원 순위/알선, AI 사진 진단을 하지 않습니다.

## 개발

```bash
bun install
bun run dev
bun test
bun run build
```

데이터는 `localStorage` (`yeoyu-routine-v1`)에만 저장됩니다. 서버 업로드 없음.

## 클릭 스루 (3화면)

1. **온보딩교육** — 3단(가성·진성·혼합 → 생활 범위 → 사용법) → 「오늘 루틴 시작」
2. **오늘루틴** — 체중·푸시업/등·옷 자신감, 주간 도트, 한식/옷 tip, 병원 체크리스트
3. **익명저널** — 한 줄 + 기분/스트레스 (기기 안에만 저장)

## 스택

Vite + TypeScript + vite-plugin-pwa · Vercel 정적 + `/api` 서버리스

## Paddle Billing (Pro · 월 ₩4,900)

Paddle **Billing** (Toss/Stripe 아님). 프론트는 `@paddle/paddle-js` (`initializePaddle` + overlay checkout).

### 현재 Pro 언락 방식

- **언락**: 브라우저 `checkout.completed` → `localStorage` 구독 상태 `pro` (+ optional Paddle ids)
- **웹훅** (`/api/paddle-webhook`): 서명 검증 + `subscription.created|updated|canceled`, `transaction.completed` 수신·로그 골격. 계정 DB가 없어 **서버 측 언락/취소는 아직 없음**

자세한 체크리스트: [docs/PADDLE.md](./docs/PADDLE.md)

### 대시보드에서 할 일 (주인님)

1. Sandbox 계정 생성 → Product **여유루틴 Pro** → Price **₩4,900 KRW** monthly recurring
2. Client-side token (`test_…`) + Price id (`pri_…`) 복사
3. Vercel Project env (Production + Preview)에 `.env.example` 이름들 설정
4. Website approval: `yeoyu-routine.vercel.app` (+ sandbox용 `localhost`)
5. KR 결제: Payment methods에서 Korean local cards / Kakao Pay / Naver Pay, 통화 **KRW**
6. Webhook: `https://yeoyu-routine.vercel.app/api/paddle-webhook` — `subscription.*`, `transaction.completed`
7. KFTC: `subscription.updated`의 `consent_requirements`는 핸들러가 acknowledge
8. Go-live: `VITE_PADDLE_ENV=production`, `live_` 토큰, live price id, live webhook secret

### Env (이름만)

| 변수 | 위치 | 설명 |
|------|------|------|
| `VITE_PADDLE_CLIENT_TOKEN` | 클라이언트 | `test_` / `live_` |
| `VITE_PADDLE_PRICE_ID_PRO_MONTHLY` | 클라이언트 | `pri_…` |
| `VITE_PADDLE_ENV` | 클라이언트 | `sandbox` (기본) \| `production` |
| `VITE_PADDLE_CUSTOMER_PORTAL_URL` | 클라이언트 | 구독 관리·취소 포털 |
| `VITE_ALLOW_MOCK_SUB` | 클라이언트 | `true`면 설정에 목업 스위치 표시 |
| `PADDLE_API_KEY` | 서버 | 향후 API용 (현재 미사용) |
| `PADDLE_WEBHOOK_SECRET` | 서버 | 웹훅 HMAC 검증 |

키 없이도 `bun run build` 성공. 미설정 시 Pro CTA는 「지금은 결제를 받을 수 없어요.」

### 목업 토글 정책

설정 「개발·샌드박스용 목업」은 다음 중 하나일 때만 표시:

- `import.meta.env.DEV`
- `VITE_ALLOW_MOCK_SUB=true`
- Paddle 미설정 (`isPaddleConfigured() === false`)

로컬 7일 미리보기 CTA도 동일 조건. Paddle trial을 주장하지 않음.
