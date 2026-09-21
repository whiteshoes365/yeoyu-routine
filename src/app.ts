import {
  CLOTHING_TIPS,
  DISCLAIMER,
  FOOD_TIPS,
  HOSPITAL_QUESTIONS,
  ONBOARDING,
  tipIndexForDate,
} from './lib/content'
import { isDailyComplete, todayKey, WEEK_LABELS, weekKeys } from './lib/day'
import {
  getOrCreateDaily,
  loadData,
  saveData,
} from './lib/storage'
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
  let tab: TabId = data.onboardingDone ? 'routine' : 'onboarding'
  let journalDraft = ''
  let journalMood = 3
  let journalStress = 3

  function persist(): void {
    saveData(data)
  }

  function setTab(next: TabId): void {
    tab = next
    render()
  }

  function renderDisclaimer(prominent: boolean): string {
    return `<aside class="disclaimer${prominent ? ' disclaimer--focus' : ''}" role="note">${escapeHtml(DISCLAIMER)}</aside>`
  }

  function renderTabs(): string {
    const items: { id: TabId; label: string }[] = [
      { id: 'onboarding', label: '온보딩교육' },
      { id: 'routine', label: '오늘루틴' },
      { id: 'journal', label: '익명저널' },
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

    return `
      <section class="panel stack">
        <header class="card head-card">
          <div class="row between">
            <div>
              <h2 class="tight">오늘루틴</h2>
              <p class="sub muted">${escapeHtml(date)}</p>
            </div>
            <span class="badge paid-placeholder" title="준비 중">콘텐츠팩 · 곧</span>
          </div>
          <div class="week-row">${weekDots}</div>
        </header>

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
          <p class="muted tiny">상담 전 스스로 정리하는 질문입니다. 병원 순위·예약·추천은 제공하지 않습니다.</p>
          ${hospital}
        </article>

        <div class="card paid-card">
          <div class="row between">
            <strong>유료 콘텐츠팩 / 구독</strong>
            <span class="badge">준비 중</span>
          </div>
          <p class="muted tiny">교육 심화·루틴 확장 팩을 준비 중입니다. 결제는 아직 없습니다.</p>
          <button type="button" class="btn primary" disabled>곧 공개</button>
        </div>

        ${renderDisclaimer(false)}
        <p class="footer-note">여유루틴 v${escapeHtml(import.meta.env.VITE_APP_VERSION || '0.1.0')} · 로컬 전용</p>
      </section>`
  }

  function renderJournal(): string {
    const date = todayKey()
    const routineDone = isDailyComplete(data.dailies[date])
    const list = [...data.journals].sort((a, b) => b.createdAt.localeCompare(a.createdAt))

    return `
      <section class="panel stack">
        <article class="card notice">
          <strong>익명 · 로컬 전용</strong>
          <p class="muted tiny">계정 없음 · 서버 업로드 없음. 기록은 이 기기에만 저장됩니다.</p>
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
        </article>

        <p class="footer-note">${escapeHtml(DISCLAIMER)}</p>
      </section>`
  }

  function render(): void {
    root.innerHTML = `
      <header class="app-header">
        <h1>여유루틴</h1>
        <p class="sub">생활 관리 루틴 · 진단·치료 아님</p>
      </header>
      ${renderTabs()}
      ${tab === 'onboarding' ? renderOnboarding() : tab === 'routine' ? renderRoutine() : renderJournal()}
    `
  }

  root.addEventListener('click', (ev) => {
    const t = ev.target as HTMLElement
    const tabBtn = t.closest('[data-tab]') as HTMLElement | null
    if (tabBtn?.dataset.tab) {
      setTab(tabBtn.dataset.tab as TabId)
      return
    }

    const action = (t.closest('[data-action]') as HTMLElement | null)?.dataset.action
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
      data = { ...data, onboardingDone: true, onboardingStage: action === 'ob-done' ? 2 : data.onboardingStage }
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
