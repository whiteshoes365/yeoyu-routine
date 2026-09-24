/** Confirmed marketing paywall copy — do not invent coaching offers. */
export const PAYWALL = {
  headline: '오늘부터, 옷맵시 루틴만 정리해 보세요.',
  freeBullets: '7일 기본 루틴 체크 · 핏 체크리스트 1종 · 주 1회 리마인더',
  proBullets:
    '맞춤 루틴·주간 플랜 · 다크티·레이어링 핏 가이드 · 진행 로그·복습 퀴즈',
  freeCta: 'Free 시작하기',
  proCta: 'Pro 시작 · 월 ₩4,900',
  /** Local preview only — not a Paddle trial until configured in dashboard. */
  trialCta: '로컬 미리보기 · 7일',
  priceLabel: 'Pro · 월 ₩4,900',
  annualPlaceholder: '연간 미지원',
  footnote:
    '여유루틴은 운동·옷맵시·생활 습관 가이드입니다. 의료 상담·시술·치료 효과를 약속하지 않습니다.',
  /** Settings note when mock switcher is visible (dev / sandbox / keys missing). */
  mockSubNote:
    '개발·샌드박스용 목업 — 카드 없이 Free·체험·Pro 상태만 바꿉니다.',
  manageCta: '구독 관리 · 취소',
  lockedFeatures: [
    {
      id: 'custom-plan',
      title: '맞춤 4–12주 플랜',
      desc: '맞춤 루틴·주간 플랜 (Pro)',
    },
    {
      id: 'history',
      title: '장기 진행 로그',
      desc: '진행 로그·복습 퀴즈 · 장기 기록 (Pro)',
    },
    {
      id: 'fit-pack',
      title: '프리미엄 핏 가이드 팩',
      desc: '다크티·레이어링 핏 가이드 (Pro)',
    },
  ],
} as const
