/**
 * v0.5.0 연령대별 가이드 글. 일반 정보이며 진단·치료·처방이 아니에요.
 * 규칙: 해요체 · 용량/제품명 없음 · 병원 추천 없음.
 */
import { AGE_GROUPS, type AgeGroup } from './ageGroup'

export type GuideArticle = {
  id: string
  title: string
  ageGroups: AgeGroup[]
  paragraphs: string[]
}

export const GUIDE_ARTICLES: GuideArticle[] = [
  {
    id: 'g-teen-puberty',
    title: '10대: 사춘기 가슴 변화, 이렇게 지켜봐요',
    ageGroups: ['10s'],
    paragraphs: [
      '사춘기에는 호르몬 균형이 잠시 흔들리면서 가슴에 멍울이 생기거나 살짝 커질 수 있어요. 많은 경우 1~2년 안에 저절로 줄어들어요.',
      '혼자 고민하지 말고 보호자에게 먼저 이야기해요. 걱정되면 보호자와 함께 소아청소년과에서 상담받아요.',
      '운동은 가볍게, 무게나 횟수를 무리하게 늘리지 않아요. 굶거나 극단적으로 먹는 양을 줄이는 다이어트는 하지 않아요.',
      '압박티처럼 꽉 조이는 옷은 권하지 않아요. 편한 옷과 레이어링으로 충분해요.',
      '인터넷에서 파는 호르몬제·보충제·패치는 쓰지 않아요. 몸에 해가 될 수 있어요.',
    ],
  },
  {
    id: 'g-young-habits',
    title: '20~30대: 생활 습관과 운동 보조제 점검',
    ageGroups: ['20-30s'],
    paragraphs: [
      '20~30대에는 체중 변화, 음주, 운동 보조제나 근육 키우는 약물 사용이 가슴 변화와 관련될 수 있어요.',
      '근육 키우는 약물이나 출처가 불분명한 보조제는 가슴 변화를 일으킨 사례가 보고돼 있어요. 쓰고 있다면 의사와 상의해요.',
      '탈모약 등 복용 중인 약이 있다면 임의로 끊지 말고 처방 의사에게 가슴 변화를 알려요.',
      '꾸준한 운동과 식습관 관리는 지방형(가성) 여유증의 겉모습에 도움이 될 수 있지만, 치료를 약속하지는 않아요.',
    ],
  },
  {
    id: 'g-mid-meds',
    title: '40~50대: 복용 중인 약부터 확인해요',
    ageGroups: ['40-50s', '60s+'],
    paragraphs: [
      '중년 이후에는 혈압약·이뇨제·위장약·전립선약 등 여러 약이 가슴 변화와 관련될 수 있어요.',
      '약 때문이 의심되면 스스로 끊지 말고, 처방 의사와 중단이나 다른 약으로의 교체를 상의해요. 실제로 교체 후 좋아진 사례가 여러 건 보고돼 있어요.',
      '간·콩팥·갑상선 질환이 원인일 때는 그 질환 치료가 먼저예요.',
      '진료 전에 먹고 있는 약과 보충제 목록을 메모해 가면 상담이 수월해요.',
    ],
  },
  {
    id: 'g-senior-check',
    title: '60대 이상: 새로 생긴 변화는 진료로 확인해요',
    ageGroups: ['60s+'],
    paragraphs: [
      '나이가 들면 남성호르몬이 줄면서 가슴 변화가 흔해질 수 있어요. 그래도 새로 생긴 변화는 한 번 진료로 확인하는 것이 좋아요.',
      '한쪽만 단단하게 커지거나, 유두에서 피가 섞인 분비물이 나오면 바로 병원을 찾아요.',
      '여러 약을 함께 먹고 있다면 어떤 약이 영향을 줄 수 있는지 의사·약사와 함께 점검해요.',
      '운동은 관절과 체력에 맞춰 가볍게, 아프면 멈춰요.',
    ],
  },
  {
    id: 'g-weight',
    title: '체중·생활 관리: 지방형(가성)과 구분해요',
    ageGroups: ['20-30s', '40-50s', '60s+'],
    paragraphs: [
      '지방이 늘어 가슴이 도드라져 보이는 경우(가성)는 체중 관리와 운동으로 겉모습이 나아지기도 해요.',
      '유선 조직이 커진 경우(진성)는 체중만으로 줄지 않을 수 있어요. 구분은 의료 전문가의 영역이에요.',
      '한식 위주로 밥 양을 조금 줄이고, 나물·단백질을 충분히 먹고, 야식·당 음료를 줄이는 작은 습관부터 시작해요.',
    ],
  },
  {
    id: 'g-all-signals',
    title: '모든 연령: 병원에 가볼 신호',
    ageGroups: ['10s', '20-30s', '40-50s', '60s+'],
    paragraphs: [
      '갑자기 아프거나 붓는 경우, 분비물이 나오는 경우, 한쪽만 빠르게 커지는 경우에는 의료 상담을 먼저 받아요.',
      '이 앱의 내용은 일반 정보예요. 진단·치료·처방을 대신하지 않아요.',
      '패치·압박 제품이나 「단기간에 없앤다」는 광고는 근거가 약한 경우가 많아요.',
    ],
  },
]

/** Split into my age group's articles first, then the rest (stable order). */
export function guidesForAge(group: AgeGroup | null): {
  mine: GuideArticle[]
  others: GuideArticle[]
} {
  if (!group) return { mine: [...GUIDE_ARTICLES], others: [] }
  const mine = GUIDE_ARTICLES.filter((a) => a.ageGroups.includes(group))
  const others = GUIDE_ARTICLES.filter((a) => !a.ageGroups.includes(group))
  return { mine, others }
}

export function allGuideAgeGroupsValid(): boolean {
  return GUIDE_ARTICLES.every(
    (a) =>
      a.ageGroups.length > 0 && a.ageGroups.every((g) => (AGE_GROUPS as readonly string[]).includes(g)),
  )
}
