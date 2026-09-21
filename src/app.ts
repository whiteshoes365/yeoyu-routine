import {
  ANTI_HYPE_NOTICE,
  CLOTHING_TIPS,
  DISCLAIMER,
  FOOD_TIPS,
  HOSPITAL_QUESTIONS,
  ONBOARDING,
  tipIndexForDate,
} from './lib/content'
import { AFFILIATE_BADGE, AFFILIATE_BANNER, AFFILIATE_DISCLOSURE, AFFILIATE_SLOTS } from './lib/affiliate'
import { isDailyComplete, todayKey, WEEK_LABELS, weekKeys } from './lib/day'
import { PAYWALL } from './lib/paywall'
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
  let tab: TabId = data.onboardingDone ? 'routine' : 'onboarding'
  let journalDraft = ''
  let journalMood = 3
  let journalStress = 3
  let showPaywall = false
  let toastMsg: string | null = null
  let toastTimer: ReturnType<typeof setTimeout> | null = null

  function persist(): void {
    saveData(data)
  }

  function persistSub(): void {
    saveSubscription(sub)
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

  function renderProUnlocked(title: string, body: string): string {
    return `
      <article class="card stack pro-unlocked">
        <div class="row between">
          <strong>${escapeHtml(title)}</strong>
          <span class="badge ok">${escapeHtml(statusLabel(sub.status))}</span>
        </div>
        <p class="tiny">${escapeHtml(body)}</p>
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
      ? renderProUnlocked(
          '맞춤 4–12주 플랜',
          '맞춤 루틴·주간 플랜 UI (로컬 미리보기). 실제 맞춤 생성은 추후 연동됩니다.',
        )
      : renderLockedCard('맞춤 4–12주 플랜', '맞춤 루틴·주간 플랜 (Pro)')

    const historyBlock = pro
      ? renderProUnlocked(
          '장기 진행 로그',
          '진행 로그·복습 퀴즈 · 장기 기록 UI (로컬 미리보기).',
        )
      : renderLockedCard('장기 진행 로그', '진행 로그·복습 퀴즈 · 장기 기록 (Pro)')

    const fitBlock = pro
      ? renderProUnlocked(
          '프리미엄 핏 가이드 팩',
          '다크티·레이어링 핏 가이드 팩 UI (로컬 미리보기). 치료·의료 목적이 아닙니다.',
        )
      : renderLockedCard('프리미엄 핏 가이드 팩', '다크티·레이어링 핏 가이드 (Pro)')

    const adBlock = pro
      ? renderProUnlocked('광고 제거', '광고가 도입되면 Pro에서 제거됩니다. (플레이스홀더)')
      : renderLockedCard('광고 제거', '광고가 도입되면 Pro에서 제거 (선택·플레이스홀더)')

    return `
      <section class="panel stack">
        <header class="card head-card">
          <div class="row between">
            <div>
              <h2 class="tight">오늘루틴</h2>
              <p class="sub muted">${escapeHtml(date)}</p>
            </div>
            <button type="button" class="badge paid-placeholder badge-btn" data-action="open-paywall">${escapeHtml(statusLabel(sub.status))} · ${escapeHtml(PAYWALL.priceLabel)}</button>
          </div>
          <div class="week-row">${weekDots}</div>
        </header>
        ${renderAntiHypeNotice()}

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
        </article>
        <article class="card tip">
          <h3>옷 tip</h3>
          <p>${escapeHtml(cloth)}</p>
        </article>

        <article class="card stack">
          <h3>병원 상담 체크리스트</h3>
          <p class="muted tiny">진단이나 치료 지시가 아닌, 상담 전 스스로 정리하는 체크리스트입니다. 병원 순위·예약·추천은 제공하지 않습니다.</p>
          ${hospital}
        </article>

        ${planBlock}
        ${historyBlock}
        ${fitBlock}
        ${adBlock}

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
        <p class="footer-note">여유루틴 v${escapeHtml(import.meta.env.VITE_APP_VERSION || '0.1.5')} · 로컬 전용</p>
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
          <h2 class="tight">구독 상태 (로컬 목)</h2>
          <p class="muted tiny">결제 SDK 없음. 테스트용으로 상태를 바꿀 수 있습니다. 실제 결제는 연동 예정입니다.</p>
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
        <p class="footer-note">여유루틴 v${escapeHtml(import.meta.env.VITE_APP_VERSION || '0.1.5')} · 습관 가이드</p>
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
      </header>
      ${renderTabs()}
      ${panelBody()}
      ${renderPaywallModal()}
      ${renderToast()}
    `
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
      showToast(`구독 상태 → ${statusLabel(subBtn)} (로컬 목)`)
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
      showToast(`${PAYWALL.trialCta} 시작 (로컬 목). ${PAYWALL.billingPending}`)
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
