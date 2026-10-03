/*
 * 내 조건 — 업무 모드 + 우선순위 1~3위 (기획서 5장 1·2단계)
 * 모드를 고르면 우선순위가 자동으로 채워지고, 조건을 바꾸면 '직접' 모드가 돼요.
 * 고르는 동안 추천 3석이 바로 다시 계산돼요 (기획서 완료 기준: 입력 후 3초 안에 추천 3석)
 */
(() => {
  'use strict';
  const MD = (window.MD = window.MD || {});
  MD.screens = MD.screens || {};
  const D = MD.data;
  const UI = MD.ui;
  const esc = UI.esc;

  const MODE_ICON = { focus: 'headphones', call: 'phone', collab: 'users', custom: 'sliders' };
  const GROUPS = [
    { title: '자리 환경', ids: ['quiet', 'warm', 'cool', 'noGlare', 'sunny', 'equip'] },
    { title: '자리 형태', ids: ['window', 'open', 'closed', 'dual'] },
    { title: '거리', ids: ['nearWc', 'nearBooth', 'nearMeeting', 'nearPartner', 'farEntrance', 'nearEntrance'] },
  ];

  function matchPreset(priorities) {
    const m = MD.score.MODES.find((x) => x.id !== 'custom' && x.priorities.join() === priorities.join());
    return m ? m.id : 'custom';
  }

  function render(view) {
    const S = MD.score;
    const saved = MD.state.prefs();
    const draft = { mode: saved.mode, priorities: saved.priorities.slice() };

    view.innerHTML = `
      <div class="prefs">
        ${UI.back('#/', '뒤로')}
        <div class="page-head">
          <div>
            <h1 class="page-title">내 조건</h1>
            <p class="page-sub">오늘 업무에 맞춰 고르면 추천이 바로 바뀌어요</p>
          </div>
        </div>
        <div class="prefs__grid">
          <div class="prefs__main">
            <section class="card prefs__card" aria-labelledby="mode-title">
              <h2 class="prefs__h" id="mode-title"><span class="prefs__step">1</span>오늘 업무는 어떤가요?</h2>
              <div class="modes" role="radiogroup" aria-labelledby="mode-title" data-slot="modes"></div>
            </section>
            <section class="card prefs__card" aria-labelledby="cond-title">
              <h2 class="prefs__h" id="cond-title"><span class="prefs__step">2</span>중요한 순서대로 골라 주세요</h2>
              <p class="prefs__hint">3개까지 고를 수 있어요. 누른 순서가 순위가 돼요.</p>
              <div data-slot="conds"></div>
            </section>
          </div>
          <aside class="prefs__side">
            <section class="card prefs__card prefs__preview" aria-labelledby="preview-title" aria-live="polite">
              <h2 class="prefs__h" id="preview-title">이 조건이면 이렇게 추천해요</h2>
              <div data-slot="preview"></div>
            </section>
            <button type="button" class="btn btn--primary btn--block" data-action="save" data-focus="save"></button>
          </aside>
        </div>
      </div>`;

    const slot = (name) => view.querySelector(`[data-slot="${name}"]`);

    function modesHTML() {
      return S.MODES.map((m) => `
        <button type="button" class="mode" role="radio" aria-checked="${draft.mode === m.id}" data-mode="${m.id}" data-focus="mode-${m.id}">
          <span class="mode__icon">${UI.icon(MODE_ICON[m.id])}</span>
          <span class="mode__label">${esc(m.label)}</span>
          <span class="mode__desc">${esc(m.desc)}</span>
        </button>`).join('');
    }

    function condsHTML() {
      return GROUPS.map((g) => `
        <div class="cond-group">
          <h3 class="cond-group__title">${g.title}</h3>
          <div class="pick-chips">
            ${g.ids.map((id) => {
              const rank = draft.priorities.indexOf(id);
              return `<button type="button" class="pick-chip" data-cond="${id}" data-focus="cond-${id}" aria-pressed="${rank >= 0}">${rank >= 0 ? `<span class="pick-chip__rank" aria-label="${rank + 1}순위">${rank + 1}</span>` : ''}${esc(S.COND_BY_ID[id].label)}</button>`;
            }).join('')}
          </div>
        </div>`).join('');
    }

    function previewHTML() {
      if (!draft.priorities.length) return '<p class="empty">조건을 1개 이상 고르면 추천 3석을 보여 드려요.</p>';
      const snap = S.snapshot({ mode: draft.mode, priorities: draft.priorities });
      if (!snap.top.length) return '<p class="empty">지금은 빈자리가 없어요. 잠시 후 다시 확인해 주세요.</p>';
      return `<ol class="preview">${snap.top.map((t, i) => `
        <li class="preview__row">
          <span class="rank${i === 0 ? ' rank--first' : ''}" aria-hidden="true">${i + 1}</span>
          <span class="preview__body">
            <span class="preview__code">${esc(D.seatLabel(t.seat.id))}${i === 0 ? UI.crown() : ''}</span>
            <span class="preview__why">${t.reasons.map((r) => `<span class="nowrap">${esc(r)}</span>`).join(' · ')}</span>
          </span>
          <span class="preview__score"><span class="sr-only">취향 일치도 </span>${t.score}%</span>
        </li>`).join('')}</ol>`;
    }

    function paint() {
      UI.keepFocus(view, () => {
        slot('modes').innerHTML = modesHTML();
        slot('conds').innerHTML = condsHTML();
        slot('preview').innerHTML = previewHTML();
        const save = view.querySelector('[data-action="save"]');
        save.disabled = !draft.priorities.length;
        save.textContent = draft.priorities.length ? '이 조건으로 추천받기' : '조건을 1개 이상 골라 주세요';
      });
    }

    function toggleCond(id) {
      const cond = S.COND_BY_ID[id];
      const list = draft.priorities;
      const at = list.indexOf(id);
      if (at >= 0) {
        list.splice(at, 1);
      } else {
        const rival = (cond.excludes || []).find((x) => list.includes(x));
        if (rival) {
          list[list.indexOf(rival)] = id; // 반대 조건은 같은 순위에서 바꿔요
          UI.toast('반대 조건은 함께 고를 수 없어서 바꿨어요');
        } else if (list.length >= 3) {
          UI.toast('3개까지 고를 수 있어요. 먼저 하나를 빼 주세요');
          return;
        } else {
          list.push(id);
        }
      }
      draft.mode = matchPreset(list);
      paint();
    }

    view.addEventListener('click', (e) => {
      const mode = e.target.closest('[data-mode]');
      if (mode) {
        draft.mode = mode.dataset.mode;
        if (draft.mode !== 'custom') draft.priorities = S.MODES.find((m) => m.id === draft.mode).priorities.slice();
        paint();
        return;
      }
      const cond = e.target.closest('[data-cond]');
      if (cond) { toggleCond(cond.dataset.cond); return; }
      if (e.target.closest('[data-action="save"]') && draft.priorities.length) {
        MD.state.setPrefs(draft);
        location.hash = '#/map';
        UI.toast('조건을 저장했어요. 추천을 다시 골랐어요');
      }
    });

    // 라디오 그룹은 화살표 키로도 움직여요
    view.addEventListener('keydown', (e) => {
      const mode = e.target.closest('[data-mode]');
      if (!mode || !['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(e.key)) return;
      e.preventDefault();
      const ids = S.MODES.map((m) => m.id);
      const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1;
      const next = ids[(ids.indexOf(mode.dataset.mode) + step + ids.length) % ids.length];
      view.querySelector(`[data-mode="${next}"]`).click();
      view.querySelector(`[data-mode="${next}"]`).focus();
    });

    paint();
  }

  MD.screens.prefs = { title: '내 조건', render };
})();
