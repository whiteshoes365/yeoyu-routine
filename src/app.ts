import {
  ANTI_HYPE_NOTICE,
  CLOTHING_TIPS,
  DISCLAIMER,
  FOOD_TIPS,
  FREE_WORKOUTS,
  HOSPITAL_QUESTIONS,
  ONBOARDING,
  tipIndexForDate,
  type WorkoutCard,
} from './lib/content'
import { AFFILIATE_BADGE, AFFILIATE_BANNER, AFFILIATE_DISCLOSURE, AFFILIATE_SLOTS } from './lib/affiliate'
import { isDailyComplete, todayKey, WEEK_LABELS, weekKeys } from './lib/day'
import { PAYWALL } from './lib/paywall'
import {
  FIT_GUIDE_SECTIONS,
  REVIEW_QUIZ,
  getPlanForPrefs,
  loadPrefs,
  proWorkoutOverlay,
  savePrefs,
  type PlanFrequency,
  type PlanLevel,
  type UserPrefs,
} from './lib/proContent'
import {
  FREE_JOURNAL_LIMIT,
  hasProAccess,
  loadSubscription,
  saveSubscription,
  statusLabel,
  type SubRecord,
  type SubscriptionStatus,
} from './lib/subscription'
import { getOrCreateDaily, loadData, saveData } from './lib/storage'
import type { JournalEntry, TabId } from './lib/types'
import {
  CASE_CAUSE_LINE,
  badgeForCase,
  caseForDate,
  hasDuration,
  resolveKind,
  typeLabel,
  type DailyCase,
} from './lib/dailyCases'

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function mountApp(root: HTMLElement): void {
  let data = loadData()
  let sub: SubRecord = loadSubscription()
  let prefs: UserPrefs = loadPrefs()
  let tab: TabId = data.onboardingDone ? 'routine' : 'onboarding'
  let journalDraft = ''
  let journalMood = 3
  let journalStress = 3
  let showPaywall = false
  let toastMsg: string | null = null
  let toastTimer: ReturnType<typeof setTimeout> | null = null
  let fitOpenId: string | null = FIT_GUIDE_SECTIONS[0]?.id ?? null
  let quizAnswers: Record<string, number> = {}
  let quizSubmitted = false

  function persist(): void {
    saveData(data)
  }

  function persistSub(): void {
    saveSubscription(sub)
  }

  function persistPrefs(): void {
    savePrefs(prefs)
  }

  function isPro(): boolean {
    return hasProAccess(sub.status)
  }

  function setTab(next: TabId): void {
    tab = next
    showPaywall = false
    render()
  }

  function showToast(msg: string): void {
    toastMsg = msg
    if (toastTimer) clearTimeout(toastTimer)
    toastTimer = setTimeout(() => {
      toastMsg = null
      toastTimer = null
      render()
    }, 3200)
    render()
  }

  function openPaywall(): void {
    showPaywall = true
    render()
  }

  function closePaywall(): void {
    showPaywall = false
    render()
  }

  function setStatus(status: SubscriptionStatus): void {
    sub = {
      status,
      trialStartedAt:
        status === 'trial' ? sub.trialStartedAt || new Date().toISOString() : sub.trialStartedAt,
    }
    persistSub()
    render()
  }

  function renderDisclaimer(prominent: boolean): string {
    return `<aside class="disclaimer${prominent ? ' disclaimer--focus' : ''}" role="note">${escapeHtml(DISCLAIMER)}</aside>`
  }

  function renderAntiHypeNotice(): string {
    return `<aside class="anti-hype" role="note"><strong>제품 추천·판매 없음</strong><p>${escapeHtml(ANTI_HYPE_NOTICE)}</p></aside>`
  }

  function renderDailyCaseCard(): string {
    const c: DailyCase | null = caseForDate()
    if (!c) return ''
    const badge = badgeForCase(c)
    const kind = resolveKind(c)
    const typeChip = typeLabel(c.type)
    const personLine =
      kind === 'person'
        ? `<p class="case-person">${escapeHtml(c.personLabel)}</p>`
        : `<p class="case-subject muted tiny">대상 · ${escapeHtml(c.personLabel)}</p>`
    const durationBlock = hasDuration(c)
      ? `<p class="tiny"><strong>기간</strong> — ${escapeHtml(c.durationKo!.trim())}</p>`
      : ''
    const sourceTitle = c.sourceTitle
      ? `<span class="muted tiny case-source-title">${escapeHtml(c.sourceTitle)}</span>`
      : ''
    return `
      <article class="card stack daily-case" aria-label="오늘의 사례">
        <div class="row between wrap case-head">
          <h3 class="tight">오늘의 사례</h3>
          <div class="case-badges">
            <span class="badge case-badge">${escapeHtml(badge)}</span>
            <span class="badge-soft">${escapeHtml(typeChip)}</span>
          </div>
        </div>
        <h4 class="case-title tight">${escapeHtml(c.titleKo)}</h4>
        ${personLine}
        <p class="tiny">${escapeHtml(c.summaryKo)}</p>
        <p class="tiny"><strong>도움이 된 것</strong> — ${escapeHtml(c.whatHelpedKo)}</p>
        ${durationBlock}
        <p class="tiny case-caution">${escapeHtml(c.cautionKo)}</p>
        <p class="muted tiny case-cause">${escapeHtml(CASE_CAUSE_LINE)}</p>
        <p class="case-source">
          <a class="btn link" href="${escapeHtml(c.sourceUrl)}" target="_blank" rel="noopener noreferrer">출처 보기</a>
          ${sourceTitle}
        </p>
      </article>`
  }

  function renderToast(): string {
    if (!toastMsg) return ''
    return `<div class="toast" role="status">${escapeHtml(toastMsg)}</div>`
  }

  function renderPaywallModal(): string {
    if (!showPaywall) return ''
    return `
      <div class="modal-backdrop" data-action="paywall-close" role="presentation">
        <div class="modal card stack" role="dialog" aria-labelledby="paywall-title" data-stop>
          <h2 id="paywall-title" class="tight">${escapeHtml(PAYWALL.headline)}</h2>
          <p class="price-tag">${escapeHtml(PAYWALL.priceLabel)}</p>
          <p class="muted tiny">${escapeHtml(PAYWALL.annualPlaceholder)}</p>
          <div class="tier-box">
            <strong>Free</strong>
            <p class="tiny">${escapeHtml(PAYWALL.freeBullets)}</p>
          </div>
          <div class="tier-box tier-box--pro">
            <strong>Pro</strong>
            <p class="tiny">${escapeHtml(PAYWALL.proBullets)}</p>
          </div>
          <div class="row wrap">
            <button type="button" class="btn ghost" data-action="paywall-free">${escapeHtml(PAYWALL.freeCta)}</button>
            <button type="button" class="btn primary" data-action="paywall-pro">${escapeHtml(PAYWALL.proCta)}</button>
          </div>
          <button type="button" class="btn link" data-action="paywall-trial">${escapeHtml(PAYWALL.trialCta)}</button>
          <p class="muted tiny footnote">${escapeHtml(PAYWALL.footnote)}</p>
          <button type="button" class="btn ghost" data-action="paywall-close">닫기</button>
        </div>
      </div>`
  }

  function renderLockedCard(title: string, desc: string): string {
    return `
      <article class="card locked-card stack">
        <div class="row between">
          <strong>${escapeHtml(title)}</strong>
          <span class="badge pro-badge">Pro</span>
        </div>
        <p class="muted tiny">${escapeHtml(desc)}</p>
        <button type="button" class="btn primary" data-action="open-paywall">잠금 해제 · ${escapeHtml(PAYWALL.priceLabel)}</button>
      </article>`
  }

  function renderAffiliateShop(): string {
    const slots = AFFILIATE_SLOTS.map(
      (s) => `
        <a class="affiliate-slot" href="${escapeHtml(s.href)}" data-affiliate="${escapeHtml(s.id)}">
          <div class="row between">
            <strong>${escapeHtml(s.title)}</strong>
            <span class="badge affiliate-badge">${escapeHtml(AFFILIATE_BADGE)}</span>
          </div>
          <p class="muted tiny">${escapeHtml(s.blurb)}</p>
        </a>`,
    ).join('')
    return `
      <article class="card stack">
        <h3>제휴 샵 (정보성)</h3>
        <aside class="anti-hype" role="note"><strong>임시 은폐</strong><p>${escapeHtml(AFFILIATE_BANNER)}</p></aside>
        <p class="muted tiny">패션·운동 용품 슬롯입니다. 치료·의료 제품이 아닙니다. 링크는 # 입니다.</p>
        <div class="affiliate-grid">${slots}</div>
        <p class="muted tiny disclose">${escapeHtml(AFFILIATE_DISCLOSURE)}</p>
      </article>`
  }

  function renderTabs(): string {
    const items: { id: TabId; label: string }[] = [
      { id: 'onboarding', label: '온보딩교육' },
      { id: 'routine', label: '오늘루틴' },
      { id: 'journal', label: '익명저널' },
      { id: 'settings', label: '설정' },
    ]
    return `<nav class="tabs" aria-label="주요 화면">${items
      .map(
        (t) =>
          `<button type="button" class="tab${tab === t.id ? ' active' : ''}" data-tab="${t.id}">${t.label}</button>`,
      )
      .join('')}</nav>`
  }

  function renderWorkoutCard(card: WorkoutCard, overlay?: { label: string }): string {
    const level = overlay
      ? `${card.levelLabel.replace('초급 고정 (Free)', 'Pro 주간 진행')} · ${overlay.label}`
      : card.levelLabel
    return `
      <article class="card workout-card stack">
        <div class="row between">
          <h3 class="tight">${escapeHtml(card.title)}</h3>
          <span class="badge-soft">${escapeHtml(level)}</span>
        </div>
        <p class="workout-meta"><strong>${card.sets}세트</strong> · ${escapeHtml(overlay?.label ?? card.reps)} · 휴식 ${card.restSec}초</p>
        <ul class="edu-list">
          ${card.cues.map((c) => `<li>${escapeHtml(c)}</li>`).join('')}
        </ul>
        <p class="muted tiny">${escapeHtml(card.note)}</p>
      </article>`
  }

  function renderWorkoutCards(): string {
    const pro = isPro()
    const overlay = pro ? proWorkoutOverlay(prefs.level, prefs.planWeek) : null
    return FREE_WORKOUTS.map((c) => {
      if (c.id === 'pushup' && overlay) {
        return renderWorkoutCard(c, { label: overlay.pushLabel })
      }
      if (c.id === 'back' && overlay) {
        return renderWorkoutCard(c, { label: overlay.backLabel })
      }
      return renderWorkoutCard(c)
    }).join('')
  }

  function weeklyCompletionRate(): { done: number; total: number; pct: number } {
    const keys = weekKeys()
    let done = 0
    for (const k of keys) {
      if (isDailyComplete(data.dailies[k])) done++
    }
    const total = keys.length
    const pct = total === 0 ? 0 : Math.round((done / total) * 100)
    return { done, total, pct }
  }

  function renderProPlan(): string {
    const plan = getPlanForPrefs(prefs.level, prefs.frequency)
    const weekIdx = Math.min(prefs.planWeek, plan.schedule.length - 1)
    const week = plan.schedule[weekIdx]
    const levelBtns: { id: PlanLevel; label: string }[] = [
      { id: 'beginner', label: '초급' },
      { id: 'intermediate', label: '중급' },
      { id: 'maintain', label: '유지' },
    ]
    const freqBtns: { id: PlanFrequency; label: string }[] = [
      { id: '3x', label: '주 3회' },
      { id: 'daily', label: '월–일' },
    ]
    const tableRows = week.days
      .map(
        (d) => `<tr>
          <th scope="row">${escapeHtml(d.day)}</th>
          <td><strong>${escapeHtml(d.focus)}</strong><br /><span class="muted tiny">${escapeHtml(d.detail)}</span></td>
        </tr>`,
      )
      .join('')

    return `
      <article class="card stack pro-unlocked">
        <div class="row between">
          <strong>맞춤 4–12주 플랜</strong>
          <span class="badge ok">${escapeHtml(statusLabel(sub.status))}</span>
        </div>
        <p class="tiny">${escapeHtml(plan.summary)}</p>
        <div class="field">
          <span>수준 (로컬 선택 · 서버 AI 없음)</span>
          <div class="scale" role="group" aria-label="플랜 수준">
            ${levelBtns
              .map(
                (b) =>
                  `<button type="button" class="scale-btn${prefs.level === b.id ? ' on' : ''}" data-pref-level="${b.id}">${b.label}</button>`,
              )
              .join('')}
          </div>
        </div>
        <div class="field">
          <span>빈도</span>
          <div class="scale" role="group" aria-label="운동 빈도">
            ${freqBtns
              .map(
                (b) =>
                  `<button type="button" class="scale-btn${prefs.frequency === b.id ? ' on' : ''}" data-pref-freq="${b.id}">${b.label}</button>`,
              )
              .join('')}
          </div>
        </div>
        <div class="row between wrap">
          <strong>${escapeHtml(plan.label)} · ${week.week}주차 · ${escapeHtml(week.title)}</strong>
          <div class="row">
            <button type="button" class="btn ghost" data-action="plan-week-prev" ${weekIdx === 0 ? 'disabled' : ''}>이전 주</button>
            <button type="button" class="btn ghost" data-action="plan-week-next" ${weekIdx >= plan.schedule.length - 1 ? 'disabled' : ''}>다음 주</button>
          </div>
        </div>
        <div class="table-wrap">
          <table class="plan-table">
            <thead><tr><th>요일</th><th>내용</th></tr></thead>
            <tbody>${tableRows}</tbody>
          </table>
        </div>
        <p class="tiny"><strong>이번 주 한식</strong> — ${escapeHtml(week.foodNote)}</p>
        <p class="muted tiny">${escapeHtml(plan.foodGuide)}</p>
        <p class="muted tiny">치료·완치·체형 보장이 아닙니다. 통증 시 중단하세요.</p>
      </article>`
  }

  function renderProFitGuide(): string {
    const sections = FIT_GUIDE_SECTIONS.map((sec) => {
      const open = fitOpenId === sec.id
      return `
        <div class="fit-sec">
          <button type="button" class="fit-toggle${open ? ' open' : ''}" data-fit="${escapeHtml(sec.id)}" aria-expanded="${open}">
            ${escapeHtml(sec.title)}
          </button>
          ${
            open
              ? `<div class="fit-body">
                  ${sec.paragraphs.map((p) => `<p class="tiny">${escapeHtml(p)}</p>`).join('')}
                </div>`
              : ''
          }
        </div>`
    }).join('')
    return `
      <article class="card stack pro-unlocked">
        <div class="row between">
          <strong>프리미엄 핏 가이드 팩</strong>
          <span class="badge ok">${escapeHtml(statusLabel(sub.status))}</span>
        </div>
        <p class="muted tiny">다크티 · 레이어링 · 이너 · 트레이닝웨어. 패션 정보이며 치료·의료가 아닙니다.</p>
        ${sections}
        <p class="muted tiny disclose">${escapeHtml(AFFILIATE_DISCLOSURE)}</p>
      </article>`
  }

  function renderProProgress(): string {
    const { done, total, pct } = weeklyCompletionRate()
    const score = quizSubmitted
      ? REVIEW_QUIZ.reduce((acc, q) => acc + (quizAnswers[q.id] === q.answer ? 1 : 0), 0)
      : null
    const quizBlock = REVIEW_QUIZ.map((q) => {
      const chosen = quizAnswers[q.id]
      return `
        <div class="quiz-q">
          <p class="tiny"><strong>${escapeHtml(q.prompt)}</strong></p>
          <div class="quiz-choices">
            ${q.choices
              .map((c, i) => {
                let cls = 'quiz-choice'
                if (quizSubmitted) {
                  if (i === q.answer) cls += ' correct'
                  else if (chosen === i) cls += ' wrong'
                } else if (chosen === i) cls += ' picked'
                return `<button type="button" class="${cls}" data-quiz="${escapeHtml(q.id)}" data-qi="${i}" ${quizSubmitted ? 'disabled' : ''}>${escapeHtml(c)}</button>`
              })
              .join('')}
          </div>
          ${
            quizSubmitted
              ? `<p class="muted tiny">${escapeHtml(q.explain)}</p>`
              : ''
          }
        </div>`
    }).join('')

    return `
      <article class="card stack pro-unlocked">
        <div class="row between">
          <strong>장기 진행 로그 · 복습 퀴즈</strong>
          <span class="badge ok">${escapeHtml(statusLabel(sub.status))}</span>
        </div>
        <div class="progress-box">
          <p class="tight"><strong>이번 주 완주율</strong> ${pct}% (${done}/${total}일)</p>
          <div class="progress-bar" aria-hidden="true"><span style="width:${pct}%"></span></div>
          <p class="muted tiny">푸시업·등·자신감(1–5)을 채운 날 기준. 의료 지표가 아닙니다.</p>
          ${
            prefs.quizBest != null
              ? `<p class="tiny">퀴즈 최고 점수: ${prefs.quizBest}/${REVIEW_QUIZ.length}</p>`
              : ''
          }
        </div>
        <h3 class="tight">교육 복습 퀴즈</h3>
        <p class="muted tiny">온보딩·생활 관리 내용 확인용입니다. 의학 시험·진단이 아닙니다. (${REVIEW_QUIZ.length}문항)</p>
        ${quizBlock}
        <div class="row wrap">
          ${
            quizSubmitted
              ? `<p class="ok-msg">결과: ${score}/${REVIEW_QUIZ.length}</p>
                 <button type="button" class="btn ghost" data-action="quiz-reset">다시 풀기</button>`
              : `<button type="button" class="btn primary" data-action="quiz-submit">채점하기</button>`
          }
        </div>
      </article>`
  }

  function renderOnboarding(): string {
    const stage = data.onboardingStage
    const s = ONBOARDING[stage]
    return `
      <section class="panel stack">
        ${renderDisclaimer(true)}
        ${renderAntiHypeNotice()}
        <div class="stage-dots" aria-label="교육 단계">
          ${ONBOARDING.map((_, i) => `<span class="dot${i === stage ? ' on' : i < stage ? ' done' : ''}"></span>`).join('')}
        </div>
        <article class="card">
          <h2>${escapeHtml(s.title)}</h2>
          <p class="badge-soft">교육 ${stage + 1} / ${ONBOARDING.length}</p>
          <ul class="edu-list">
            ${s.body.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}
          </ul>
        </article>
        <div class="row">
          <button type="button" class="btn ghost" data-action="ob-prev" ${stage === 0 ? 'disabled' : ''}>이전</button>
          ${
            stage < ONBOARDING.length - 1
              ? `<button type="button" class="btn primary" data-action="ob-next">다음</button>`
              : `<button type="button" class="btn primary" data-action="ob-done">오늘 루틴 시작</button>`
          }
        </div>
        ${
          !data.onboardingDone
            ? `<button type="button" class="btn link" data-action="ob-skip">나중에 보기 (스킵)</button>`
            : ''
        }
      </section>`
  }

  function renderRoutine(): string {
    const date = todayKey()
    const { data: d2, entry } = getOrCreateDaily(data, date)
    data = d2
    const keys = weekKeys()
    const food = FOOD_TIPS[tipIndexForDate(date, FOOD_TIPS.length)]
    const cloth = CLOTHING_TIPS[tipIndexForDate(date + 'c', CLOTHING_TIPS.length)]
    const pro = isPro()

    const weekDots = keys
      .map((k, i) => {
        const done = isDailyComplete(data.dailies[k])
        const isToday = k === date
        return `<div class="week-cell${isToday ? ' today' : ''}" title="${k}">
          <span class="week-label">${WEEK_LABELS[i]}</span>
          <span class="week-dot${done ? ' filled' : ''}" aria-label="${WEEK_LABELS[i]} ${done ? '완료' : '미완료'}"></span>
        </div>`
      })
      .join('')

    const hospital = HOSPITAL_QUESTIONS.map((q) => {
      const checked = Boolean(data.hospitalChecks[q.id])
      return `<label class="check-row">
        <input type="checkbox" data-hq="${q.id}" ${checked ? 'checked' : ''} />
        <span>${escapeHtml(q.text)}</span>
      </label>`
    }).join('')

    const planBlock = pro
      ? renderProPlan()
      : renderLockedCard('맞춤 4–12주 플랜', '맞춤 루틴·주간 플랜 (Pro) — 초급/중급/유지 · 주 3회 또는 월–일')
    const historyBlock = pro
      ? renderProProgress()
      : renderLockedCard('장기 진행 로그', '진행 로그·복습 퀴즈 · 장기 기록 (Pro)')
    const fitBlock = pro
      ? renderProFitGuide()
      : renderLockedCard('프리미엄 핏 가이드 팩', '다크티·레이어링·이너·트레이닝웨어 핏 가이드 (Pro)')
    return `
      <section class="panel stack">
        <header class="card head-card">
          <div class="row between">
            <div>
              <h2 class="tight">오늘루틴</h2>
              <p class="sub muted">${escapeHtml(date)}</p>
            </div>
            <button type="button" class="badge badge-btn" data-action="open-paywall">${escapeHtml(statusLabel(sub.status))} · ${escapeHtml(PAYWALL.priceLabel)}</button>
          </div>
          <div class="week-row">${weekDots}</div>
        </header>
        ${renderAntiHypeNotice()}

        ${renderDailyCaseCard()}

        ${renderWorkoutCards()}

        <article class="card stack">
          <h3>일일 체크</h3>
          <label class="field">
            <span>체중 (kg, 선택)</span>
            <input class="input" type="number" inputmode="decimal" step="0.1" min="0" max="400"
              data-field="weight" placeholder="예: 72.5"
              value="${entry.weight != null ? entry.weight : ''}" />
          </label>
          <label class="check-row">
            <input type="checkbox" data-field="pushupDone" ${entry.pushupDone ? 'checked' : ''} />
            <span>푸시업 루틴 완료</span>
          </label>
          <label class="check-row">
            <input type="checkbox" data-field="backDone" ${entry.backDone ? 'checked' : ''} />
            <span>등 루틴 완료</span>
          </label>
          <div class="field">
            <span>옷·자신감 (1–5)</span>
            <div class="scale" role="group" aria-label="옷·자신감">
              ${[1, 2, 3, 4, 5]
                .map(
                  (n) =>
                    `<button type="button" class="scale-btn${entry.clothingConfidence === n ? ' on' : ''}" data-conf="${n}">${n}</button>`,
                )
                .join('')}
            </div>
          </div>
          ${
            isDailyComplete(entry)
              ? `<p class="ok-msg">오늘 루틴 완주 🎉</p>`
              : `<p class="muted tiny">푸시업·등·자신감(1–5)을 채우면 주간 도트가 채워집니다.</p>`
          }
        </article>

        <article class="card tip">
          <h3>한식 식단 tip</h3>
          <p>${escapeHtml(food)}</p>
          <p class="muted tiny">팁 ${FOOD_TIPS.length}개 중 날짜별 1개 순환 · 치료식 아님</p>
        </article>
        <article class="card tip">
          <h3>옷 tip</h3>
          <p>${escapeHtml(cloth)}</p>
          <p class="muted tiny">팁 ${CLOTHING_TIPS.length}개 중 날짜별 1개 순환 · 치료·완치 아님</p>
        </article>

        <article class="card stack">
          <h3>병원 상담 체크리스트</h3>
          <p class="muted tiny">진단이나 치료 지시가 아닌, 상담 전 스스로 정리하는 체크리스트입니다. 병원 순위·예약·추천은 제공하지 않습니다.</p>
          ${hospital}
        </article>

        ${planBlock}
        ${historyBlock}
        ${fitBlock}

        ${renderAffiliateShop()}

        <div class="card paywall-cta stack">
          <h3>${escapeHtml(PAYWALL.headline)}</h3>
          <p class="price-tag">${escapeHtml(PAYWALL.priceLabel)}</p>
          <p class="tiny"><strong>Free</strong> — ${escapeHtml(PAYWALL.freeBullets)}</p>
          <p class="tiny"><strong>Pro</strong> — ${escapeHtml(PAYWALL.proBullets)}</p>
          <div class="row wrap">
            <button type="button" class="btn ghost" data-action="paywall-free">${escapeHtml(PAYWALL.freeCta)}</button>
            <button type="button" class="btn primary" data-action="open-paywall">${escapeHtml(PAYWALL.proCta)}</button>
          </div>
          <button type="button" class="btn link" data-action="paywall-trial">${escapeHtml(PAYWALL.trialCta)}</button>
          <p class="muted tiny">${escapeHtml(PAYWALL.footnote)}</p>
        </div>

        ${renderDisclaimer(false)}
        <p class="footer-note">여유루틴 v${escapeHtml(import.meta.env.VITE_APP_VERSION || '0.3.1')} · 로컬 전용</p>
      </section>`
  }

  function renderJournal(): string {
    const date = todayKey()
    const routineDone = isDailyComplete(data.dailies[date])
    const listAll = [...data.journals].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    const pro = isPro()
    const list = pro ? listAll : listAll.slice(0, FREE_JOURNAL_LIMIT)
    const hidden = listAll.length - list.length

    return `
      <section class="panel stack">
        <article class="card notice">
          <strong>익명 · 로컬 전용</strong>
          <p class="muted tiny">계정 없음 · 서버 업로드 없음. 기록은 이 기기에만 저장됩니다.${
            pro
              ? ''
              : ` Free는 최근 ${FREE_JOURNAL_LIMIT}건까지 표시합니다.`
          }</p>
        </article>

        <article class="card stack">
          <h2 class="tight">오늘 한 줄</h2>
          ${routineDone ? `<span class="badge ok">오늘 루틴 완료</span>` : ''}
          <textarea class="textarea" data-j="text" maxlength="280" placeholder="오늘의 몸·마음 한 줄…">${escapeHtml(journalDraft)}</textarea>
          <div class="field">
            <span>기분 (1=가라앉음 ~ 5=괜찮음)</span>
            <div class="scale">${[1, 2, 3, 4, 5]
              .map(
                (n) =>
                  `<button type="button" class="scale-btn${journalMood === n ? ' on' : ''}" data-jmood="${n}">${n}</button>`,
              )
              .join('')}</div>
          </div>
          <div class="field">
            <span>스트레스 (1=낮음 ~ 5=높음)</span>
            <div class="scale">${[1, 2, 3, 4, 5]
              .map(
                (n) =>
                  `<button type="button" class="scale-btn${journalStress === n ? ' on' : ''}" data-jstress="${n}">${n}</button>`,
              )
              .join('')}</div>
          </div>
          <button type="button" class="btn primary" data-action="j-save">저장</button>
        </article>

        <article class="card stack">
          <h3>지난 기록</h3>
          ${
            list.length === 0
              ? `<p class="muted">아직 기록이 없습니다.</p>`
              : `<ul class="journal-list">${list
                  .map(
                    (j) => `<li class="journal-item">
                      <div class="row between">
                        <span class="muted tiny">${escapeHtml(j.date)}</span>
                        <span class="tiny">기분 ${j.mood} · 스트레스 ${j.stress}${j.routineDone ? ' · 루틴✓' : ''}</span>
                      </div>
                      <p>${escapeHtml(j.text)}</p>
                      <button type="button" class="btn link danger-text" data-jdel="${escapeHtml(j.id)}">삭제</button>
                    </li>`,
                  )
                  .join('')}</ul>`
          }
          ${
            hidden > 0
              ? `<p class="muted tiny">장기 기록 ${hidden}건은 Pro에서 확인할 수 있습니다.</p>
                 <button type="button" class="btn primary" data-action="open-paywall">장기 기록 잠금 해제 · ${escapeHtml(PAYWALL.priceLabel)}</button>`
              : ''
          }
        </article>

        <p class="footer-note">${escapeHtml(DISCLAIMER)}</p>
      </section>`
  }

  function renderSettings(): string {
    const options: SubscriptionStatus[] = ['free', 'trial', 'pro']
    return `
      <section class="panel stack">
        <article class="card stack">
          <h2 class="tight">구독 상태 (테스트)</h2>
          <p class="muted tiny">${escapeHtml(PAYWALL.billingPending)}</p>
          <p class="price-tag">${escapeHtml(PAYWALL.priceLabel)}</p>
          <p class="muted tiny">${escapeHtml(PAYWALL.annualPlaceholder)}</p>
          <div class="sub-switch" role="group" aria-label="구독 상태">
            ${options
              .map(
                (s) =>
                  `<button type="button" class="scale-btn${sub.status === s ? ' on' : ''}" data-sub="${s}">${escapeHtml(statusLabel(s))}</button>`,
              )
              .join('')}
          </div>
          <p class="tiny">현재: <strong>${escapeHtml(statusLabel(sub.status))}</strong>${
            sub.trialStartedAt
              ? ` · 체험 시작 ${escapeHtml(sub.trialStartedAt.slice(0, 10))}`
              : ''
          }</p>
          <div class="row wrap">
            <button type="button" class="btn ghost" data-action="paywall-trial">${escapeHtml(PAYWALL.trialCta)}</button>
            <button type="button" class="btn primary" data-action="open-paywall">${escapeHtml(PAYWALL.proCta)}</button>
          </div>
        </article>

        <article class="card stack">
          <h3>플랜 선호 (로컬)</h3>
          <p class="muted tiny">Pro 맞춤 플랜에 사용됩니다. 서버 AI·원격 처방이 없습니다.</p>
          <p class="tiny">수준: <strong>${
            prefs.level === 'beginner' ? '초급' : prefs.level === 'intermediate' ? '중급' : '유지'
          }</strong> · 빈도: <strong>${prefs.frequency === 'daily' ? '월–일' : '주 3회'}</strong> · ${prefs.planWeek + 1}주차</p>
        </article>

        <article class="card stack">
          <h3>Free / Pro 요약</h3>
          <p class="tiny"><strong>Free</strong> — ${escapeHtml(PAYWALL.freeBullets)}</p>
          <p class="tiny"><strong>Pro</strong> — ${escapeHtml(PAYWALL.proBullets)}</p>
          <p class="muted tiny">${escapeHtml(PAYWALL.footnote)}</p>
        </article>

        ${renderAffiliateShop()}
        ${renderDisclaimer(false)}
        <article class="card stack">
          <h3>앱 캐시</h3>
          <p class="muted tiny">화면이 예전 문구면 Service Worker 캐시일 수 있습니다. 아래로 강제 새로고침하세요.</p>
          <button type="button" class="btn primary" data-action="refresh-cache">앱 캐시 새로고침</button>
        </article>
        <p class="footer-note">여유루틴 v${escapeHtml(import.meta.env.VITE_APP_VERSION || '0.3.1')} · 습관 가이드</p>
      </section>`
  }

  function panelBody(): string {
    if (tab === 'onboarding') return renderOnboarding()
    if (tab === 'routine') return renderRoutine()
    if (tab === 'journal') return renderJournal()
    return renderSettings()
  }

  function render(): void {
    root.innerHTML = `
      <header class="app-header">
        <h1>여유루틴</h1>
        <p class="sub">생활 관리 루틴 · 진단·치료 아님</p>
        <p class="version-chip" aria-label="app version">앱 버전 v${escapeHtml(import.meta.env.VITE_APP_VERSION || '0.3.1')}</p>
      </header>
      ${renderTabs()}
      ${panelBody()}
      ${renderPaywallModal()}
      ${renderToast()}
    `
  }

  async function refreshAppCache(): Promise<void> {
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations()
        await Promise.all(regs.map((r) => r.unregister()))
      }
      if ('caches' in window) {
        const keys = await caches.keys()
        await Promise.all(keys.map((k) => caches.delete(k)))
      }
    } catch {
      /* ignore */
    }
    location.href = '/?v=0.3.1&_=' + Date.now()
  }

  root.addEventListener('click', (ev) => {
    const t = ev.target as HTMLElement

    const affiliate = t.closest('[data-affiliate]') as HTMLElement | null
    if (affiliate) {
      ev.preventDefault()
      showToast('제휴 링크는 마케팅 확정 후 연결됩니다. (지금은 #)')
      return
    }

    if (t.closest('[data-stop]') && !t.closest('[data-action]')) {
      ev.stopPropagation()
      return
    }

    const tabBtn = t.closest('[data-tab]') as HTMLElement | null
    if (tabBtn?.dataset.tab) {
      setTab(tabBtn.dataset.tab as TabId)
      return
    }

    const subBtn = (t.closest('[data-sub]') as HTMLElement | null)?.dataset.sub as
      | SubscriptionStatus
      | undefined
    if (subBtn === 'free' || subBtn === 'trial' || subBtn === 'pro') {
      setStatus(subBtn)
      showToast(`구독 상태 → ${statusLabel(subBtn)} (테스트)`)
      return
    }

    const prefLevel = (t.closest('[data-pref-level]') as HTMLElement | null)?.dataset
      .prefLevel as PlanLevel | undefined
    if (prefLevel === 'beginner' || prefLevel === 'intermediate' || prefLevel === 'maintain') {
      prefs = { ...prefs, level: prefLevel, planWeek: 0 }
      persistPrefs()
      render()
      return
    }
    const prefFreq = (t.closest('[data-pref-freq]') as HTMLElement | null)?.dataset
      .prefFreq as PlanFrequency | undefined
    if (prefFreq === 'daily' || prefFreq === '3x') {
      prefs = { ...prefs, frequency: prefFreq, planWeek: 0 }
      persistPrefs()
      render()
      return
    }

    const fitId = (t.closest('[data-fit]') as HTMLElement | null)?.dataset.fit
    if (fitId) {
      fitOpenId = fitOpenId === fitId ? null : fitId
      render()
      return
    }

    const quizEl = t.closest('[data-quiz]') as HTMLElement | null
    if (quizEl?.dataset.quiz != null && quizEl.dataset.qi != null && !quizSubmitted) {
      quizAnswers = { ...quizAnswers, [quizEl.dataset.quiz]: Number(quizEl.dataset.qi) }
      render()
      return
    }

    const action = (t.closest('[data-action]') as HTMLElement | null)?.dataset.action
    if (action === 'open-paywall') {
      openPaywall()
      return
    }
    if (action === 'paywall-close') {
      closePaywall()
      return
    }
    if (action === 'paywall-free') {
      setStatus('free')
      showPaywall = false
      showToast('Free로 시작합니다. (로컬)')
      return
    }
    if (action === 'paywall-pro') {
      showToast(PAYWALL.billingPending)
      return
    }
    if (action === 'paywall-trial') {
      setStatus('trial')
      showPaywall = false
      showToast(`${PAYWALL.trialCta} 시작 (테스트). ${PAYWALL.billingPending}`)
      return
    }
    if (action === 'refresh-cache') {
      showToast('캐시 지우는 중…')
      void refreshAppCache()
      return
    }
    if (action === 'plan-week-prev') {
      prefs = { ...prefs, planWeek: Math.max(0, prefs.planWeek - 1) }
      persistPrefs()
      render()
      return
    }
    if (action === 'plan-week-next') {
      const plan = getPlanForPrefs(prefs.level, prefs.frequency)
      prefs = {
        ...prefs,
        planWeek: Math.min(plan.schedule.length - 1, prefs.planWeek + 1),
      }
      persistPrefs()
      render()
      return
    }
    if (action === 'quiz-submit') {
      const answered = REVIEW_QUIZ.every((q) => quizAnswers[q.id] != null)
      if (!answered) {
        showToast('모든 문항에 답한 뒤 채점하세요.')
        return
      }
      quizSubmitted = true
      const score = REVIEW_QUIZ.reduce(
        (acc, q) => acc + (quizAnswers[q.id] === q.answer ? 1 : 0),
        0,
      )
      if (prefs.quizBest == null || score > prefs.quizBest) {
        prefs = { ...prefs, quizBest: score }
        persistPrefs()
      }
      render()
      return
    }
    if (action === 'quiz-reset') {
      quizAnswers = {}
      quizSubmitted = false
      render()
      return
    }

    if (action === 'ob-next') {
      data = { ...data, onboardingStage: Math.min(2, data.onboardingStage + 1) }
      persist()
      render()
      return
    }
    if (action === 'ob-prev') {
      data = { ...data, onboardingStage: Math.max(0, data.onboardingStage - 1) }
      persist()
      render()
      return
    }
    if (action === 'ob-done' || action === 'ob-skip') {
      data = {
        ...data,
        onboardingDone: true,
        onboardingStage: action === 'ob-done' ? 2 : data.onboardingStage,
      }
      persist()
      setTab('routine')
      return
    }
    if (action === 'j-save') {
      const text = journalDraft.trim()
      if (!text) return
      const date = todayKey()
      const entry: JournalEntry = {
        id: uid(),
        date,
        createdAt: new Date().toISOString(),
        text: text.slice(0, 280),
        mood: journalMood,
        stress: journalStress,
        routineDone: isDailyComplete(data.dailies[date]),
      }
      data = { ...data, journals: [entry, ...data.journals].slice(0, 200) }
      journalDraft = ''
      persist()
      render()
      return
    }

    const conf = (t.closest('[data-conf]') as HTMLElement | null)?.dataset.conf
    if (conf) {
      const date = todayKey()
      const { data: d2, entry } = getOrCreateDaily(data, date)
      data = {
        ...d2,
        dailies: {
          ...d2.dailies,
          [date]: { ...entry, clothingConfidence: Number(conf) },
        },
      }
      persist()
      render()
      return
    }

    const jmood = (t.closest('[data-jmood]') as HTMLElement | null)?.dataset.jmood
    if (jmood) {
      journalMood = Number(jmood)
      render()
      return
    }
    const jstress = (t.closest('[data-jstress]') as HTMLElement | null)?.dataset.jstress
    if (jstress) {
      journalStress = Number(jstress)
      render()
      return
    }

    const jdel = (t.closest('[data-jdel]') as HTMLElement | null)?.dataset.jdel
    if (jdel) {
      data = { ...data, journals: data.journals.filter((j) => j.id !== jdel) }
      persist()
      render()
    }
  })

  root.addEventListener('change', (ev) => {
    const el = ev.target as HTMLInputElement
    const date = todayKey()

    if (el.dataset.hq) {
      data = {
        ...data,
        hospitalChecks: { ...data.hospitalChecks, [el.dataset.hq]: el.checked },
      }
      persist()
      return
    }

    if (el.dataset.field === 'pushupDone' || el.dataset.field === 'backDone') {
      const { data: d2, entry } = getOrCreateDaily(data, date)
      const field = el.dataset.field
      data = {
        ...d2,
        dailies: {
          ...d2.dailies,
          [date]: { ...entry, [field]: el.checked },
        },
      }
      persist()
      render()
    }
  })

  root.addEventListener('input', (ev) => {
    const el = ev.target as HTMLInputElement | HTMLTextAreaElement
    if (el.dataset.j === 'text') {
      journalDraft = el.value
      return
    }
    if (el.dataset.field === 'weight') {
      const date = todayKey()
      const { data: d2, entry } = getOrCreateDaily(data, date)
      const raw = el.value.trim()
      const weight = raw === '' ? undefined : Number(raw)
      data = {
        ...d2,
        dailies: {
          ...d2.dailies,
          [date]: {
            ...entry,
            weight: weight != null && Number.isFinite(weight) ? weight : undefined,
          },
        },
      }
      persist()
    }
  })

  render()
}
