/** Pro-only local content — no server AI, no coaching, no medical promises. */

export type PlanLevel = 'beginner' | 'intermediate' | 'maintain'
export type PlanFrequency = 'daily' | '3x'

export type DayPlan = {
  day: string
  focus: string
  detail: string
}

export type WeekPlan = {
  week: number
  title: string
  foodNote: string
  days: DayPlan[]
}

export type PlanTemplate = {
  id: PlanLevel
  label: string
  weeks: number
  summary: string
  foodGuide: string
  schedule: WeekPlan[]
}

const DAYS_FULL = ['월', '화', '수', '목', '금', '토', '일'] as const
const DAYS_3X = ['월', '수', '금'] as const

function weekBlock(
  week: number,
  title: string,
  foodNote: string,
  frequency: PlanFrequency,
  pushSets: string,
  backSets: string,
  restLabel: string,
): WeekPlan {
  const daysSrc = frequency === 'daily' ? DAYS_FULL : DAYS_3X
  const days: DayPlan[] = daysSrc.map((day) => {
    if (frequency === 'daily' && (day === '토' || day === '일')) {
      return {
        day,
        focus: '회복·옷맵시',
        detail: '가벼운 산책 또는 휴식. 다크티·레이어링으로 자신감 1–5만 기록.',
      }
    }
    return {
      day,
      focus: '푸시업 + 등',
      detail: `푸시업 ${pushSets} · 등 ${backSets} · 세트 간 ${restLabel}. 폼 우선, 통증 시 중단.`,
    }
  })
  return { week, title, foodNote, days }
}

function buildSchedule(
  level: PlanLevel,
  frequency: PlanFrequency,
  weekCount: number,
): WeekPlan[] {
  const specs: Record<
    PlanLevel,
    { push: string[]; back: string[]; rest: string; titles: string[] }
  > = {
    beginner: {
      push: ['3×6–8', '3×7–9', '3×8–10', '3×8–10'],
      back: ['3×10', '3×10–12', '3×12', '3×12'],
      rest: '60초',
      titles: ['기초 적응', '호흡·폼 안정', '반복 익숙해지기', '유지·점검'],
    },
    intermediate: {
      push: ['4×8–10', '4×9–11', '4×10–12', '4×10–12', '4×11–13', '4×12'],
      back: ['4×10–12', '4×12', '4×12–14', '4×12–14', '4×14', '4×14'],
      rest: '45–60초',
      titles: [
        '볼륨 올리기',
        '자세 강화',
        '중반 점검',
        '안정 구간',
        '약간 도전',
        '정리·유지',
      ],
    },
    maintain: {
      push: ['3×8–12', '3×8–12', '3×8–12', '3×8–12'],
      back: ['3×10–12', '3×10–12', '3×10–12', '3×10–12'],
      rest: '45–60초',
      titles: ['습관 유지', '폼 리셋', '리듬 유지', '가벼운 점검'],
    },
  }
  const s = specs[level]
  const out: WeekPlan[] = []
  for (let i = 0; i < weekCount; i++) {
    const pi = Math.min(i, s.push.length - 1)
    out.push(
      weekBlock(
        i + 1,
        s.titles[pi] ?? `주 ${i + 1}`,
        i % 2 === 0
          ? '한식: 밥 적당 · 나물·단백질 충분 · 국물 절제. (치료식 아님)'
          : '한식: 야식·당음료 줄이기 · 주 1회 집밥 한 상. (일반 습관 팁)',
        frequency,
        s.push[pi],
        s.back[pi],
        s.rest,
      ),
    )
  }
  return out
}

export const PLAN_TEMPLATES: PlanTemplate[] = [
  {
    id: 'beginner',
    label: '초급 (4주)',
    weeks: 4,
    summary: '주 3회 또는 평일 중심. 무릎 푸시업·짧은 등 루틴으로 시작.',
    foodGuide:
      '4주 한식 요약: 거르지 않기 → 나물·두부/생선 추가 → 국물·야식 줄이기 → 주말만 느슨히. 효과 보장 없음.',
    schedule: [], // filled by getPlanForPrefs
  },
  {
    id: 'intermediate',
    label: '중급 (8–12주)',
    weeks: 8,
    summary: '세트·횟수를 천천히 올립니다. 통증 있으면 이전 주로 되돌리세요.',
    foodGuide:
      '중급 한식 요약: 단백질원 매끼 소량 · 음료 무가당 · 회식 날 구이·나물 우선. 치료·감량 약속 없음.',
    schedule: [],
  },
  {
    id: 'maintain',
    label: '유지 (4주 순환)',
    weeks: 4,
    summary: '이미 익숙한 분용. 같은 강도를 꾸준히, 옷맵시 기록과 함께.',
    foodGuide:
      '유지 한식 요약: 평소 구성을 유지하되 주 1회만 「과식 점검일」. 완치·체형 보장 아님.',
    schedule: [],
  },
]

export function getPlanForPrefs(level: PlanLevel, frequency: PlanFrequency): PlanTemplate {
  const base = PLAN_TEMPLATES.find((t) => t.id === level) ?? PLAN_TEMPLATES[0]
  const weeks = level === 'intermediate' ? 8 : 4
  return {
    ...base,
    weeks,
    schedule: buildSchedule(level, frequency, weeks),
  }
}

/** Pro weekly progression overlay for Free workout cards */
export function proWorkoutOverlay(
  level: PlanLevel,
  weekIndex0: number,
): { pushLabel: string; backLabel: string } {
  const plan = getPlanForPrefs(level, '3x')
  const w = plan.schedule[Math.min(weekIndex0, plan.schedule.length - 1)]
  const sample = w?.days.find((d) => d.focus.includes('푸시업'))
  if (!sample) return { pushLabel: '3×8–10', backLabel: '3×10–12' }
  const m = sample.detail.match(/푸시업 ([^·]+) · 등 ([^·]+)/)
  return {
    pushLabel: m?.[1]?.trim() ?? '3×8–10',
    backLabel: m?.[2]?.trim() ?? '3×10–12',
  }
}

export type FitSection = {
  id: string
  title: string
  paragraphs: string[]
}

export const FIT_GUIDE_SECTIONS: FitSection[] = [
  {
    id: 'dark-tee',
    title: '다크티 가이드',
    paragraphs: [
      '네이비·차콜·블랙 단색 티는 밝은 파스텔보다 실루엣을 차분하게 보이게 하는 선택이 많습니다.',
      '어깨선이 맞고 소매·기장이 자연스러운 레귤러 핏을 우선하세요. 한 치수 작은 타이트는 부담이 커질 수 있습니다.',
      '가슴 중앙의 큰 가로 로고·가로 스트라이프보다, 무로고·작은 로고·미세한 세로 텍스처가 시선 분산에 쓰이기도 합니다.',
      '기본 다크티 2–3장을 루틴용으로 두고, 세탁 후 변형된 옷은 홈트용으로 돌리세요.',
      '제휴·구매 링크는 「임시 은폐」 상태(#)입니다. 패션 정보이며 치료·의료 목적이 아닙니다.',
    ],
  },
  {
    id: 'layering',
    title: '레이어링 가이드',
    paragraphs: [
      '얇은 이너 + 셔츠/가디건/라이트 자켓 한 겹이 기본 공식입니다. 「한 겹」이 실루엣을 부드럽게 보이게 하는 경우가 많습니다.',
      '셔츠는 위·아래 단추만 잠그고 가운데를 여유 있게 두거나, 가디건 앞선을 세로 라인으로 활용해 보세요.',
      '계절별: 여름은 통기성 이너+오픈 셔츠, 환절기는 니트 조끼·얇은 자켓, 겨울은 코트 안에서 다크 이너를 유지.',
      '레이어링은 옷맵시 팁이지, 압박·패치류 「은폐 치료」가 아닙니다. 여유루틴은 압박 완치 주장을 하지 않습니다.',
      '제휴 고지: 슬롯 링크는 마케팅 확정 전 # · 임시 은폐 · 치료 아님.',
    ],
  },
  {
    id: 'inner',
    title: '이너 가이드',
    paragraphs: [
      '이너는 겉옷 비침·주름을 줄이는 역할입니다. 너무 두꺼우면 답답하고, 너무 타이트하면 라인이 강조될 수 있습니다.',
      '소재: 면·모달 등 부드러운 단색. 땀 나는 날은 속건 소재를 홈트용으로 분리해 두세요.',
      '넥라인은 겉옷과 맞춤 — 겉이 라운드면 이너도 라운드, 셔츠면 이너가 비치지 않게.',
      '이너만으로 「체형 교정」을 기대해서는 마세요. 편안함·자신감 기록이 이 앱의 목적입니다.',
      '구매 유도 링크는 임시 은폐(#). 제휴일 수 있으나 치료 제품이 아닙니다.',
    ],
  },
  {
    id: 'training',
    title: '트레이닝웨어 가이드',
    paragraphs: [
      '푸시업·등 루틴 날: 팔 움직임이 자유로운 상의, 미끄럽지 않은 바닥·매트.',
      '외출 전환: 땀이 식은 뒤 깨끗한 다크티로 갈아입으면 「옷·자신감」 체크와 잘 맞습니다.',
      '바지·숏츠는 무릎 푸시업 시 쓸리지 않는 길이. 벨트·두꺼운 주머니는 엎드림에 방해가 됩니다.',
      '트레이닝웨어는 운동 편의용입니다. 「착용만으로 교정·완치」 같은 주장은 이 앱에 없습니다.',
      '제휴 슬롯 「트레이닝 웨어」는 정보성 · 임시 은폐 · 제휴 고지 · 치료 아님.',
    ],
  },
]

export type QuizQuestion = {
  id: string
  prompt: string
  choices: string[]
  /** index of best answer */
  answer: number
  explain: string
}

/** Education review — NOT a medical exam. ≥10 questions. */
export const REVIEW_QUIZ: QuizQuestion[] = [
  {
    id: 'qz1',
    prompt: '이 앱의 주된 용도는?',
    choices: ['의학적 진단', '생활 관리·기록·옷맵시 습관', '수술 예약', '약 처방'],
    answer: 1,
    explain: '여유루틴은 로컬 생활 관리·기록용이며 진단·치료가 아닙니다.',
  },
  {
    id: 'qz2',
    prompt: '가성·진성·혼합 표현에 대해 맞는 설명은?',
    choices: [
      '앱이 자동으로 진단해 준다',
      '일상 표현이며 감별은 의료 전문가 영역',
      '운동하면 무조건 진성이 가성으로 바뀐다',
      '패치로 구분할 수 있다',
    ],
    answer: 1,
    explain: '앱은 분류·진단하지 않습니다. 교육용 일반 정보만 제공합니다.',
  },
  {
    id: 'qz3',
    prompt: '패치·압박티에 대한 앱의 입장은?',
    choices: [
      '적극 추천·판매',
      '추천·판매하지 않으며 상술 비판을 안내',
      '병원 순위와 함께 판매',
      '완치 보장 제품으로 소개',
    ],
    answer: 1,
    explain: '안티하입 고지를 유지합니다. 패치·압박 완치 주장을 하지 않습니다.',
  },
  {
    id: 'qz4',
    prompt: 'Free 오늘루틴에 포함되지 않는 것은?',
    choices: ['푸시업·등 체크', '한식·옷 tip', '병원 순위 추천', '자신감 1–5'],
    answer: 2,
    explain: '병원명·순위·예약을 제공하지 않습니다.',
  },
  {
    id: 'qz5',
    prompt: '한식 tip의 성격은?',
    choices: ['치료식·처방', '일반 식습관 팁', '수술 전 필수 식이', '약물과 병용 지침'],
    answer: 1,
    explain: '일반 생활 팁이며 치료·완치를 약속하지 않습니다.',
  },
  {
    id: 'qz6',
    prompt: '옷맵시(다크티·레이어링) 가이드의 목적은?',
    choices: ['의학적 체형 교정', '자신감·실루엣 정리 팁', '압박 치료', '병원 시술 대체'],
    answer: 1,
    explain: '패션·자신감 팁입니다. 치료 목적이 아닙니다.',
  },
  {
    id: 'qz7',
    prompt: '데이터가 저장되는 곳은?',
    choices: ['여유루틴 서버', '이 기기 localStorage', '제휴 쇼핑몰', '병원 EMR'],
    answer: 1,
    explain: '계정·서버 업로드 없는 로컬 전용 PWA입니다.',
  },
  {
    id: 'qz8',
    prompt: '제휴 샵 배지에 들어가는 안내는?',
    choices: [
      '완치 보장',
      '임시 은폐 · 제휴 고지 · 치료 아님',
      '병원 1위 제휴',
      '개인 상담 배정',
    ],
    answer: 1,
    explain: '링크는 # 이며 패션·운동 정보성입니다.',
  },
  {
    id: 'qz9',
    prompt: 'Pro 맞춤 플랜은 어떻게 고르나요?',
    choices: [
      '서버 AI가 진단 후 배정',
      '로컬에서 초급/중급/유지·빈도를 직접 선택',
      '병원이 원격으로 처방',
      '결제 후에만 랜덤',
    ],
    answer: 1,
    explain: '로컬 선호 설정 기반이며 서버 AI·원격 상담이 없습니다.',
  },
  {
    id: 'qz10',
    prompt: '운동 중 통증이 있으면?',
    choices: ['참고 더 한다', '즉시 중단하고 필요 시 의료 상담', '압박티를 세게 신다', '세트를 두 배로'],
    answer: 1,
    explain: '통증 시 중단이 원칙입니다. 앱은 의료 처방이 아닙니다.',
  },
  {
    id: 'qz11',
    prompt: '병원 체크리스트의 쓰임은?',
    choices: ['자동 예약', '상담 전 스스로 정리하는 질문 메모', '보험 청구 대행', '진단서 발급'],
    answer: 1,
    explain: '상담 전 메모용이며 진단·치료가 아닙니다.',
  },
  {
    id: 'qz12',
    prompt: '월 ₩4,900 Pro CTA가 의미하는 것은?',
    choices: [
      '1:1 원격 상담 포함',
      '맞춤 플랜·핏 가이드·진행 로그 등 Pro 기능',
      '수술비 할인',
      '약물 배송',
    ],
    answer: 1,
    explain: '클리닉 리드·원격 상담 없이 습관·가이드 기능입니다. 지금은 로컬 목 구독.',
  },
]

export const PREFS_STORAGE_KEY = 'yeoyu-routine-prefs-v1'

export type UserPrefs = {
  level: PlanLevel
  frequency: PlanFrequency
  /** 0-based week into current plan template */
  planWeek: number
  quizBest?: number
}

export const DEFAULT_PREFS: UserPrefs = {
  level: 'beginner',
  frequency: '3x',
  planWeek: 0,
}

export type PrefsBackend = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

let prefsBackend: PrefsBackend =
  typeof localStorage !== 'undefined'
    ? localStorage
    : {
        getItem: () => null,
        setItem: () => {},
      }

export function setPrefsBackend(b: PrefsBackend): void {
  prefsBackend = b
}

export function loadPrefs(): UserPrefs {
  try {
    const raw = prefsBackend.getItem(PREFS_STORAGE_KEY)
    if (!raw) return { ...DEFAULT_PREFS }
    const p = JSON.parse(raw) as Partial<UserPrefs>
    const level: PlanLevel =
      p.level === 'intermediate' || p.level === 'maintain' || p.level === 'beginner'
        ? p.level
        : 'beginner'
    const frequency: PlanFrequency = p.frequency === 'daily' ? 'daily' : '3x'
    const planWeek = Math.max(0, Math.min(11, Number(p.planWeek) || 0))
    const quizBest =
      typeof p.quizBest === 'number' && Number.isFinite(p.quizBest) ? p.quizBest : undefined
    return { level, frequency, planWeek, quizBest }
  } catch {
    return { ...DEFAULT_PREFS }
  }
}

export function savePrefs(prefs: UserPrefs): void {
  prefsBackend.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs))
}
