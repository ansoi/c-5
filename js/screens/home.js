/*
 * 홈 — 인사, 오늘 내 자리, 구역별 빈자리, 나의 취향저격 명당 TOP 3
 * 기준: 주황 시안 '홈' (docs/화면시안.md), 기획서 5장 3단계
 */
(() => {
  'use strict';
  const MD = (window.MD = window.MD || {});
  MD.screens = MD.screens || {};
  const U = MD.util;
  const D = MD.data;
  const UI = MD.ui;
  const esc = UI.esc;

  function greeting(hour) {
    if (hour < 11) return '좋은 아침이에요';
    if (hour < 17) return '좋은 오후예요';
    return '오늘 하루 수고 많으셨어요';
  }

  /* 오늘 내 자리 */
  function myseatHTML(snap) {
    const my = snap.my;
    const s = snap.byId[my.seatId];
    const seat = s.seat;
    const meta = [
      `${my.from} – ${my.to}`,
      D.TYPE_LABEL[seat.type],
      seat.dual ? '듀얼 모니터' : '모니터 1대',
      s.stars != null ? `★ ${s.stars.toFixed(1)}` : null,
    ].filter(Boolean).join(' · ');

    let state;
    let note;
    let actions;
    if (my.status === 'checkedIn') {
      state = '이용 중';
      note = `${my.checkInAt}에 체크인했어요`;
      actions = '<button class="btn btn--on-brand" type="button" data-action="checkout">이용 종료하기</button>';
    } else if (my.status === 'done') {
      state = '이용 완료';
      note = `${my.checkInAt} – ${my.checkOutAt} 이용`;
      actions = my.reviewed
        ? '<p class="myseat__thanks">리뷰 고마워요. 다음 추천에 반영했어요.</p>'
        : `<a class="btn btn--on-brand" href="#/review/${seat.id}">리뷰 남기기</a>`;
    } else {
      state = '체크인 전';
      const better = snap.top.filter((t) => t.seat.id !== seat.id && t.raw > s.raw).length;
      note = `취향 일치도 ${s.score}%${better ? ` · 더 잘 맞는 자리 ${better}곳` : ''}`;
      actions = `
        <button class="btn btn--on-brand" type="button" data-action="checkin">체크인하기</button>
        <a class="btn btn--on-brand-ghost" href="#/map">자리 바꾸기</a>`;
    }

    return `
      <article class="myseat" aria-labelledby="myseat-code">
        <div class="myseat__head">
          <span class="myseat__label">오늘 내 자리</span>
          <span class="myseat__state">${state}</span>
        </div>
        <p class="myseat__code" id="myseat-code">${esc(D.seatLabel(seat.id))}</p>
        <p class="myseat__meta">${esc(meta)}</p>
        <p class="myseat__note">${esc(note)}</p>
        <div class="myseat__actions${my.status === 'reserved' ? '' : ' myseat__actions--single'}">${actions}</div>
      </article>`;
  }

  /* 구역별 빈자리 */
  function zonesHTML(snap) {
    const items = snap.zones.map((z) => `
      <li class="zone" aria-label="${z.zone}구역 빈자리 ${z.free}석, ${z.label}">
        <span class="zone__name" aria-hidden="true">${z.zone}구역</span>
        <span class="zone__count" aria-hidden="true">${z.free}<small>석</small></span>
        <span aria-hidden="true">${UI.pill(z.label, z.level)}</span>
      </li>`).join('');
    return `
      <section class="card" aria-labelledby="zones-title">
        <div class="card__head">
          <h2 class="card__title" id="zones-title">구역별 빈자리</h2>
          <span class="card__aside">${D.FLOOR.label} · 빈자리 ${snap.freeCount}석</span>
        </div>
        <ul class="zones">${items}</ul>
      </section>`;
  }

  /* 나의 취향저격 명당 TOP 3 */
  function top3HTML(snap) {
    const S = MD.score;
    const mode = S.MODES.find((m) => m.id === snap.prefs.mode);
    const conds = snap.prefs.priorities.map((id, i) =>
      `<li class="chip"><span class="chip__num" aria-label="${i + 1}순위">${i + 1}</span>${esc(S.COND_BY_ID[id].label)}</li>`).join('');

    const rows = snap.top.map((t, i) => {
      const flags = [
        t.state === 'mine' ? UI.pill('내 예약', 'brand') : '',
        t.lowData ? UI.pill('평가 부족', 'neutral') : '',
        t.penalty ? UI.pill('수리 접수 중', 'mid') : '',
      ].join('');
      return `
        <li>
          <a class="rec${i === 0 ? ' rec--first' : ''}" href="#/map?seat=${t.seat.id}">
            <span class="rec__rank" aria-hidden="true">${i + 1}</span>
            <span class="rec__body">
              <span class="rec__code">
                <span class="sr-only">${i + 1}위 </span>${esc(D.seatLabel(t.seat.id))}
                ${i === 0 ? `${UI.crown()}<span class="sr-only">나의 명당</span>` : ''}
                ${flags}
              </span>
              <span class="rec__why">${t.reasons.map((r) => `<span class="nowrap">${esc(r)}</span>`).join(' · ')}</span>
            </span>
            <span class="rec__score"><span class="sr-only">취향 일치도 </span>${t.score}<small>%</small></span>
          </a>
        </li>`;
    }).join('');

    const body = snap.top.length
      ? `<ol class="recs">${rows}</ol>
         <p class="recs__note">${UI.icon('check')}<span>사용 중인 자리는 빼고, 구역이 겹치지 않게 골랐어요</span></p>`
      : '<p class="empty">지금은 빈자리가 없어요. 잠시 후 다시 확인해 주세요.</p>';

    return `
      <section class="card" aria-labelledby="top3-title">
        <div class="card__head">
          <h2 class="card__title" id="top3-title">나의 취향저격 명당 TOP 3</h2>
          <a class="link" href="#/prefs">취향 수정${UI.icon('chevronRight')}</a>
        </div>
        <ul class="chips" aria-label="내 조건">
          <li class="chip chip--mode">${esc(mode.label)} 모드</li>
          ${conds}
        </ul>
        ${body}
      </section>`;
  }

  function render(view) {
    const snap = MD.score.snapshot();
    const now = new Date();

    view.innerHTML = `
      <div class="home">
        <div class="home__intro">
          <p class="home__date">${U.fmtMonthDay(now)} ${U.weekday(now, true)}</p>
          <h1 class="home__greeting">${esc(D.ME.name)} 님, ${greeting(now.getHours())}</h1>
        </div>
        <div class="home__grid">
          <div class="home__col">
            ${myseatHTML(snap)}
            ${zonesHTML(snap)}
          </div>
          <div class="home__col">
            ${top3HTML(snap)}
            <a class="btn btn--primary btn--block" href="#/map">자리 확인하기</a>
          </div>
        </div>
      </div>`;

    view.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const my = MD.state.mySeat();
      if (btn.dataset.action === 'checkin') {
        MD.state.setMySeat(Object.assign({}, my, { status: 'checkedIn', checkInAt: U.nowHM() }));
        UI.toast(`${D.seatLabel(my.seatId)}에 체크인했어요`);
        MD.app.refresh({ keepScroll: true });
      } else if (btn.dataset.action === 'checkout') {
        // 퇴근할 때 바로 평가 창으로 (기획서 4장 "사용 후 평가 창: 퇴근 시 팝업")
        MD.state.setMySeat(Object.assign({}, my, { status: 'done', checkOutAt: U.nowHM() }));
        location.hash = `#/review/${my.seatId}`;
      }
    });
  }

  MD.screens.home = { title: '홈', render };
})();
