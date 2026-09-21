(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))r(i);new MutationObserver(i=>{for(const l of i)if(l.type==="childList")for(const d of l.addedNodes)d.tagName==="LINK"&&d.rel==="modulepreload"&&r(d)}).observe(document,{childList:!0,subtree:!0});function o(i){const l={};return i.integrity&&(l.integrity=i.integrity),i.referrerPolicy&&(l.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?l.credentials="include":i.crossOrigin==="anonymous"?l.credentials="omit":l.credentials="same-origin",l}function r(i){if(i.ep)return;i.ep=!0;const l=o(i);fetch(i.href,l)}})();const L="이 앱은 일반 정보·생활 관리 기록용이며, 의학적 진단·치료·처방이 아닙니다. 증상·걱정이 있으면 의료 전문가와 상담하세요.",j=[{title:"가성 · 진성 · 혼합 (일반 정보)",body:["흔히 말하는 「여유증」은 남성 가슴 부위가 도드라져 보이는 상태를 가리키는 일상 표현입니다.","가성(假性): 지방 축적 등으로 도드라져 보이는 경우에 자주 쓰는 표현입니다.","진성(眞性): 선(腺) 조직 변화가 관여한다고 알려진 경우에 쓰는 표현입니다.","혼합: 두 양상이 함께 설명되는 경우도 있습니다. 사람마다 다르며, 이 앱은 가성/진성으로 분류·진단하지 않습니다.","흔한 오해: 「운동만 하면 무조건 사라진다」「약으로 쉽게 고친다」— 일반화할 수 없습니다. 생활 관리는 의료 행위가 아닙니다."]},{title:"생활 관리 범위",body:["이 앱에서 다루는 범위: 가벼운 운동·자세 의식, 한식 중심 식습관 팁, 옷차림·자신감 기록.","다루지 않는 것: 약·수술 권유, 병원 순위, 진단·치료 클레임, 클리닉 예약/리드.","병원에 가볼 수 있는 일반 신호(교육용): 갑작스러운 통증·붓기, 분비물, 한쪽만 급격히 커짐, 기타 걱정되는 변화.","신호는 「참고」일 뿐이며, 판단은 의료 전문가에게 맡기세요."]},{title:"이 앱 쓰는 법",body:["오늘루틴: 체중(선택)·푸시업/등 루틴·옷·자신감을 하루에 한 번 체크합니다.","익명저널: 한 줄과 기분/자신감을 기기에만 저장합니다. 계정·서버 업로드 없음.","병원 상담 체크리스트: 상담 전 스스로 정리할 질문만 제공합니다.","모든 데이터는 이 기기 localStorage에만 남습니다. 브라우저 데이터를 지우면 함께 삭제됩니다."]}],A=["한식 한 상: 밥·국·나물·생선/두부처럼 구성하면 포만감과 균형이 잡히기 쉽습니다. (일반 식습관 팁)","간식 대신 과일·견과 소량: 야식 빈도를 줄이는 작은 습관부터 시작해 보세요.","국·찌개 염분: 국물을 다 마시지 않아도 됩니다. 건더기 위주로도 충분할 때가 많습니다."],E=["레이어드: 얇은 이너 + 재킷/셔츠로 실루엣을 부드럽게 정리할 수 있습니다.","패턴·색: 가슴 부위에 큰 가로 줄무늬보다, 세로 라인·단색이 시선 분산에 도움이 되기도 합니다.","핏: 너무 타이트한 티보다, 어깨선이 맞는 레귤러 핏이 자신감에 도움이 되는 경우가 많습니다."],G=[{id:"q1",text:"언제부터 변화를 느꼈는지 대략 적을 수 있나요?"},{id:"q2",text:"통증·붓기·분비물 등 동반 증상이 있었나요?"},{id:"q3",text:"복용 중인 약·보충제·호르몬 관련 이력이 있나요?"},{id:"q4",text:"체중·운동·수면 등 생활 변화가 있었나요?"},{id:"q5",text:"상담에서 꼭 묻고 싶은 질문 1가지는 무엇인가요?"}];function M(e,t){let o=0;for(let r=0;r<e.length;r++)o=(o+e.charCodeAt(r)*(r+1))%997;return t===0?0:o%t}function $(e=new Date){const t=e.getFullYear(),o=String(e.getMonth()+1).padStart(2,"0"),r=String(e.getDate()).padStart(2,"0");return`${t}-${o}-${r}`}function J(e=new Date){const t=e.getDay(),o=t===0?-6:1-t,r=new Date(e);r.setDate(e.getDate()+o),r.setHours(12,0,0,0);const i=[];for(let l=0;l<7;l++){const d=new Date(r);d.setDate(r.getDate()+l),i.push($(d))}return i}const T=["월","화","수","목","금","토","일"];function w(e){return e?e.pushupDone&&e.backDone&&e.clothingConfidence>=1:!1}const P="yeoyu-routine-v1";function Y(){if(typeof localStorage<"u")return localStorage;const e=new Map;return{getItem:t=>e.has(t)?e.get(t):null,setItem:(t,o)=>{e.set(t,o)},removeItem:t=>{e.delete(t)}}}let _=Y();function q(){return{version:1,onboardingDone:!1,onboardingStage:0,dailies:{},journals:[],hospitalChecks:{}}}function Q(){try{const e=_.getItem(P);if(!e)return q();const t=JSON.parse(e);return{version:1,onboardingDone:!!t.onboardingDone,onboardingStage:Math.min(2,Math.max(0,Number(t.onboardingStage)||0)),dailies:t.dailies&&typeof t.dailies=="object"?t.dailies:{},journals:Array.isArray(t.journals)?t.journals.map(o=>({...o,stress:o.stress??o.confidence??3})):[],hospitalChecks:t.hospitalChecks&&typeof t.hospitalChecks=="object"?t.hospitalChecks:{}}}catch{return q()}}function U(e){_.setItem(P,JSON.stringify(e))}function S(e,t){const o=e.dailies[t];if(o)return{data:e,entry:o};const r={date:t,pushupDone:!1,backDone:!1,clothingConfidence:0};return{data:{...e,dailies:{...e.dailies,[t]:r}},entry:r}}function p(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function W(){return`${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`}function z(e){let t=Q(),o=t.onboardingDone?"routine":"onboarding",r="",i=3,l=3;function d(){U(t)}function C(s){o=s,b()}function I(s){return`<aside class="disclaimer${s?" disclaimer--focus":""}" role="note">${p(L)}</aside>`}function F(){return`<nav class="tabs" aria-label="주요 화면">${[{id:"onboarding",label:"온보딩교육"},{id:"routine",label:"오늘루틴"},{id:"journal",label:"익명저널"}].map(n=>`<button type="button" class="tab${o===n.id?" active":""}" data-tab="${n.id}">${n.label}</button>`).join("")}</nav>`}function H(){const s=t.onboardingStage,n=j[s];return`
      <section class="panel stack">
        ${I(!0)}
        <div class="stage-dots" aria-label="교육 단계">
          ${j.map((c,a)=>`<span class="dot${a===s?" on":a<s?" done":""}"></span>`).join("")}
        </div>
        <article class="card">
          <h2>${p(n.title)}</h2>
          <p class="badge-soft">교육 ${s+1} / ${j.length}</p>
          <ul class="edu-list">
            ${n.body.map(c=>`<li>${p(c)}</li>`).join("")}
          </ul>
        </article>
        <div class="row">
          <button type="button" class="btn ghost" data-action="ob-prev" ${s===0?"disabled":""}>이전</button>
          ${s<j.length-1?'<button type="button" class="btn primary" data-action="ob-next">다음</button>':'<button type="button" class="btn primary" data-action="ob-done">오늘 루틴 시작</button>'}
        </div>
        ${t.onboardingDone?"":'<button type="button" class="btn link" data-action="ob-skip">나중에 보기 (스킵)</button>'}
      </section>`}function K(){const s=$(),{data:n,entry:c}=S(t,s);t=n;const a=J(),f=A[M(s,A.length)],h=E[M(s+"c",E.length)],g=a.map((u,m)=>{const v=w(t.dailies[u]);return`<div class="week-cell${u===s?" today":""}" title="${u}">
          <span class="week-label">${T[m]}</span>
          <span class="week-dot${v?" filled":""}" aria-label="${T[m]} ${v?"완료":"미완료"}"></span>
        </div>`}).join(""),k=G.map(u=>{const m=!!t.hospitalChecks[u.id];return`<label class="check-row">
        <input type="checkbox" data-hq="${u.id}" ${m?"checked":""} />
        <span>${p(u.text)}</span>
      </label>`}).join("");return`
      <section class="panel stack">
        <header class="card head-card">
          <div class="row between">
            <div>
              <h2 class="tight">오늘루틴</h2>
              <p class="sub muted">${p(s)}</p>
            </div>
            <span class="badge paid-placeholder" title="준비 중">콘텐츠팩 · 곧</span>
          </div>
          <div class="week-row">${g}</div>
        </header>

        <article class="card stack">
          <h3>일일 체크</h3>
          <label class="field">
            <span>체중 (kg, 선택)</span>
            <input class="input" type="number" inputmode="decimal" step="0.1" min="0" max="400"
              data-field="weight" placeholder="예: 72.5"
              value="${c.weight!=null?c.weight:""}" />
          </label>
          <label class="check-row">
            <input type="checkbox" data-field="pushupDone" ${c.pushupDone?"checked":""} />
            <span>푸시업 루틴 완료</span>
          </label>
          <label class="check-row">
            <input type="checkbox" data-field="backDone" ${c.backDone?"checked":""} />
            <span>등 루틴 완료</span>
          </label>
          <div class="field">
            <span>옷·자신감 (1–5)</span>
            <div class="scale" role="group" aria-label="옷·자신감">
              ${[1,2,3,4,5].map(u=>`<button type="button" class="scale-btn${c.clothingConfidence===u?" on":""}" data-conf="${u}">${u}</button>`).join("")}
            </div>
          </div>
          ${w(c)?'<p class="ok-msg">오늘 루틴 완주 🎉</p>':'<p class="muted tiny">푸시업·등·자신감(1–5)을 채우면 주간 도트가 채워집니다.</p>'}
        </article>

        <article class="card tip">
          <h3>한식 식단 tip</h3>
          <p>${p(f)}</p>
        </article>
        <article class="card tip">
          <h3>옷 tip</h3>
          <p>${p(h)}</p>
        </article>

        <article class="card stack">
          <h3>병원 상담 체크리스트</h3>
          <p class="muted tiny">상담 전 스스로 정리하는 질문입니다. 병원 순위·예약·추천은 제공하지 않습니다.</p>
          ${k}
        </article>

        <div class="card paid-card">
          <div class="row between">
            <strong>유료 콘텐츠팩 / 구독</strong>
            <span class="badge">준비 중</span>
          </div>
          <p class="muted tiny">교육 심화·루틴 확장 팩을 준비 중입니다. 결제는 아직 없습니다.</p>
          <button type="button" class="btn primary" disabled>곧 공개</button>
        </div>

        ${I(!1)}
        <p class="footer-note">여유루틴 v${p("0.1.0")} · 로컬 전용</p>
      </section>`}function R(){const s=$(),n=w(t.dailies[s]),c=[...t.journals].sort((a,f)=>f.createdAt.localeCompare(a.createdAt));return`
      <section class="panel stack">
        <article class="card notice">
          <strong>익명 · 로컬 전용</strong>
          <p class="muted tiny">계정 없음 · 서버 업로드 없음. 기록은 이 기기에만 저장됩니다.</p>
        </article>

        <article class="card stack">
          <h2 class="tight">오늘 한 줄</h2>
          ${n?'<span class="badge ok">오늘 루틴 완료</span>':""}
          <textarea class="textarea" data-j="text" maxlength="280" placeholder="오늘의 몸·마음 한 줄…">${p(r)}</textarea>
          <div class="field">
            <span>기분 (1=가라앉음 ~ 5=괜찮음)</span>
            <div class="scale">${[1,2,3,4,5].map(a=>`<button type="button" class="scale-btn${i===a?" on":""}" data-jmood="${a}">${a}</button>`).join("")}</div>
          </div>
          <div class="field">
            <span>스트레스 (1=낮음 ~ 5=높음)</span>
            <div class="scale">${[1,2,3,4,5].map(a=>`<button type="button" class="scale-btn${l===a?" on":""}" data-jstress="${a}">${a}</button>`).join("")}</div>
          </div>
          <button type="button" class="btn primary" data-action="j-save">저장</button>
        </article>

        <article class="card stack">
          <h3>지난 기록</h3>
          ${c.length===0?'<p class="muted">아직 기록이 없습니다.</p>':`<ul class="journal-list">${c.map(a=>`<li class="journal-item">
                      <div class="row between">
                        <span class="muted tiny">${p(a.date)}</span>
                        <span class="tiny">기분 ${a.mood} · 스트레스 ${a.stress}${a.routineDone?" · 루틴✓":""}</span>
                      </div>
                      <p>${p(a.text)}</p>
                      <button type="button" class="btn link danger-text" data-jdel="${p(a.id)}">삭제</button>
                    </li>`).join("")}</ul>`}
        </article>

        <p class="footer-note">${p(L)}</p>
      </section>`}function b(){e.innerHTML=`
      <header class="app-header">
        <h1>여유루틴</h1>
        <p class="sub">생활 관리 루틴 · 진단·치료 아님</p>
      </header>
      ${F()}
      ${o==="onboarding"?H():o==="routine"?K():R()}
    `}e.addEventListener("click",s=>{var u,m,v,x,N;const n=s.target,c=n.closest("[data-tab]");if(c!=null&&c.dataset.tab){C(c.dataset.tab);return}const a=(u=n.closest("[data-action]"))==null?void 0:u.dataset.action;if(a==="ob-next"){t={...t,onboardingStage:Math.min(2,t.onboardingStage+1)},d(),b();return}if(a==="ob-prev"){t={...t,onboardingStage:Math.max(0,t.onboardingStage-1)},d(),b();return}if(a==="ob-done"||a==="ob-skip"){t={...t,onboardingDone:!0,onboardingStage:a==="ob-done"?2:t.onboardingStage},d(),C("routine");return}if(a==="j-save"){const y=r.trim();if(!y)return;const D=$(),O={id:W(),date:D,createdAt:new Date().toISOString(),text:y.slice(0,280),mood:i,stress:l,routineDone:w(t.dailies[D])};t={...t,journals:[O,...t.journals].slice(0,200)},r="",d(),b();return}const f=(m=n.closest("[data-conf]"))==null?void 0:m.dataset.conf;if(f){const y=$(),{data:D,entry:O}=S(t,y);t={...D,dailies:{...D.dailies,[y]:{...O,clothingConfidence:Number(f)}}},d(),b();return}const h=(v=n.closest("[data-jmood]"))==null?void 0:v.dataset.jmood;if(h){i=Number(h),b();return}const g=(x=n.closest("[data-jstress]"))==null?void 0:x.dataset.jstress;if(g){l=Number(g),b();return}const k=(N=n.closest("[data-jdel]"))==null?void 0:N.dataset.jdel;k&&(t={...t,journals:t.journals.filter(y=>y.id!==k)},d(),b())}),e.addEventListener("change",s=>{const n=s.target,c=$();if(n.dataset.hq){t={...t,hospitalChecks:{...t.hospitalChecks,[n.dataset.hq]:n.checked}},d();return}if(n.dataset.field==="pushupDone"||n.dataset.field==="backDone"){const{data:a,entry:f}=S(t,c),h=n.dataset.field;t={...a,dailies:{...a.dailies,[c]:{...f,[h]:n.checked}}},d(),b()}}),e.addEventListener("input",s=>{const n=s.target;if(n.dataset.j==="text"){r=n.value;return}if(n.dataset.field==="weight"){const c=$(),{data:a,entry:f}=S(t,c),h=n.value.trim(),g=h===""?void 0:Number(h);t={...a,dailies:{...a.dailies,[c]:{...f,weight:g!=null&&Number.isFinite(g)?g:void 0}}},d()}}),b()}const B=document.getElementById("app");if(!B)throw new Error("#app missing");z(B);
