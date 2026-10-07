/*
 * 자리 확인 — 17F 배치도 위에 추천 3석과 왕관, 좌석 상태, 취향 히트맵
 * 기획서 5장 3단계 "추천 3석: 배치도 위에 명당 표시", 보조 기능 1 "평가가 즉시 히트맵에 반영"
 * 기준 시안: 초록 01·02, 주황 '자리 확인'
 * 자리를 누르면 주소가 #/map?seat=A03 으로 바뀌고 상세 시트가 열려요 (뒤로 가기로 닫혀요).
 */
(() => {
  'use strict';
  const MD = (window.MD = window.MD || {});
  MD.screens = MD.screens || {};
  const U = MD.util;
  const D = MD.data;
  const UI = MD.ui;
  const esc = UI.esc;

  // 도면 오른쪽·아래 편의시설 (data.js 좌표와 같은 위치 관계)
  const SIDE = {
    A: [{ key: 'focus', icon: 'headphones' }],
    B: [{ key: 'booth', icon: 'phone' }, { key: 'pantry', icon: 'droplet' }],
    C: [{ key: 'meeting', icon: 'users' }],
    D: [{ key: 'partner', icon: 'briefcase' }, { key: 'wc', text: 'WC' }],
  };
  const BOTTOM = [{ key: 'entrance', icon: 'door' }, { key: 'copy', icon: 'printer' }];
  const STATE_LABEL = { free: '예약 가능', used: '사용 중', repair: '수리 중', mine: '내 자리' };

  // 화면을 떠났다 와도 보기 방식은 기억해요
  const mapState = { mode: 'status', seat: null, pushed: false };

  const isDesktop = () => window.matchMedia('(min-width: 900px)').matches;
  const heatBand = (score) => (score >= 85 ? 4 : score >= 70 ? 3 : score >= 55 ? 2 : 1);
  const validSeat = (id) => (id && D.seat(id) ? id : null);

  function roomHTML(r) {
    const mark = r.text ? `<span class="room__text" aria-hidden="true">${r.text}</span>` : UI.icon(r.icon);
    return `<div class="room">${mark}<span>${esc(D.LANDMARKS[r.key].label)}</span></div>`;
  }

  function tileHTML(s, snap) {
    const id = s.seat.id;
    const rank = snap.top.findIndex((t) => t.seat.id === id);
    const heat = mapState.mode === 'heat';
    const cls = ['seat'];
    if (heat) {
      if (s.state === 'used' || s.state === 'repair') cls.push(`seat--${s.state}`, 'is-blocked');
      else cls.push(`heat-${heatBand(s.score)}`);
      if (s.state === 'mine') cls.push('is-mine');
    } else {
      cls.push(`seat--${s.state}`);
      if (rank === 0) cls.push('seat--crown');
      else if (rank > 0) cls.push('seat--pick');
    }
    if (id === mapState.seat) cls.push('is-selected');

    // 사용 중·수리 중 자리는 일치도를 숫자 대신 상태로 보여 줘요 (추천에서 빠지는 자리라 숫자를 비교하면 헷갈려요)
    const blocked = s.state === 'used' || s.state === 'repair';
    let inner = id.slice(1);
    if (heat) inner = blocked ? `<span class="seat__state">${STATE_LABEL[s.state]}</span>` : String(s.score);
    else if (s.state === 'repair') inner = UI.icon('wrench');
    const badge = rank === 0 ? UI.crown('seat__crown') : rank > 0 ? `<span class="seat__rank" aria-hidden="true">${rank + 1}</span>` : '';
    const score = s.state === 'used' || s.state === 'repair' ? '' : `, 취향 일치도 ${s.score}%`;
    const label = `${D.seatLabel(id)}, ${STATE_LABEL[s.state]}${rank === 0 ? ', 나의 명당' : rank > 0 ? `, 추천 ${rank + 1}위` : ''}${score}`;
    return `<button type="button" class="${cls.join(' ')}" data-seat="${id}" data-focus="seat-${id}" aria-label="${label}"${id === mapState.seat ? ' aria-current="true"' : ''}>${inner}${badge}</button>`;
  }

  function planHTML(snap) {
    const zones = D.ZONES.map((z) => {
      const info = snap.zones.find((x) => x.zone === z);
      const tiles = snap.seats.filter((s) => s.seat.zone === z).map((s) => tileHTML(s, snap)).join('');
      return `
        <section class="plan__zone" aria-label="${z}구역, 빈자리 ${info.free}석">
          <div class="plan__zone-head" aria-hidden="true"><span class="plan__zone-name">${z}구역</span><span>빈자리 ${info.free}</span></div>
          <div class="plan__row">
            <div class="plan__seats">${tiles}</div>
            <div class="plan__side">${SIDE[z].map(roomHTML).join('')}</div>
          </div>
        </section>`;
    }).join('');
    return `
      <div class="plan${mapState.mode === 'heat' ? ' is-heat' : ''}">
        <div class="plan__north">${UI.icon('sun')}북쪽 창가</div>
        <div class="plan__body">
          <div class="plan__west" aria-hidden="true"><span>서쪽 창가</span></div>
          <div class="plan__zones">${zones}</div>
        </div>
        <div class="plan__bottom">${BOTTOM.map(roomHTML).join('')}</div>
      </div>`;
  }

  function legendHTML() {
    if (mapState.mode === 'heat') {
      return `
        <div class="legend legend--heat">
          <p class="legend__title">칸의 숫자 = 내 취향 일치도(%)</p>
          <ul class="legend__list">
            <li><span class="sw heat-4">85</span>85% 이상</li>
            <li><span class="sw heat-3">70</span>70~84%</li>
            <li><span class="sw heat-2">55</span>55~69%</li>
            <li><span class="sw heat-1">40</span>55% 미만</li>
            <li><span class="sw sw--used"></span>사용 중</li>
            <li><span class="sw sw--repair">${UI.icon('wrench')}</span>수리 중</li>
          </ul>
          <p class="legend__note">사용 중·수리 중 자리는 추천에서 빠져서 숫자 대신 상태를 보여 줘요. 리뷰가 들어오면 바로 다시 계산돼요.</p>
        </div>`;
    }
    return `
      <ul class="legend__list legend">
        <li><span class="sw sw--crown">${UI.crown()}</span>나의 명당</li>
        <li><span class="sw sw--pick">2</span>취향 추천</li>
        <li><span class="sw sw--mine"></span>내 자리</li>
        <li><span class="sw sw--free"></span>예약 가능</li>
        <li><span class="sw sw--used"></span>사용 중</li>
        <li><span class="sw sw--repair">${UI.icon('wrench')}</span>수리 중</li>
      </ul>`;
  }

  function chipsHTML(snap) {
    const S = MD.score;
    const mode = S.MODES.find((m) => m.id === snap.prefs.mode);
    const conds = snap.prefs.priorities.map((id, i) =>
      `<li class="chip"><span class="chip__num" aria-label="${i + 1}순위">${i + 1}</span>${esc(S.COND_BY_ID[id].label)}</li>`).join('');
    return `<li class="chip chip--mode">${esc(mode.label)} 모드</li>${conds}`;
  }

  /* ---------- 상세 시트 ---------- */
  function paintSheet(el, snap, moveFocus) {
    const sheet = el.querySelector('[data-slot="sheet"]');
    const backdrop = el.querySelector('.sheet-backdrop');
    const entry = mapState.seat ? snap.byId[mapState.seat] : null;
    sheet.innerHTML = `<div class="sheet__handle" aria-hidden="true"></div>${entry ? MD.seatSheet.html(entry, snap) : MD.seatSheet.emptyHTML(snap)}`;
    sheet.classList.toggle('is-open', !!entry);
    const modal = !!entry && !isDesktop();
    if (modal) {
      sheet.setAttribute('role', 'dialog');
      sheet.setAttribute('aria-modal', 'true');
    } else {
      sheet.removeAttribute('role');
      sheet.removeAttribute('aria-modal');
    }
    backdrop.hidden = !modal;
    document.body.classList.toggle('is-locked', modal);
    if (entry && moveFocus) {
      const scroller = sheet.querySelector('.sheet__scroll');
      if (scroller) scroller.scrollTop = 0;
      const title = sheet.querySelector('#sheet-title');
      if (title) title.focus({ preventScroll: true });
    }
  }

  function openSeat(id) {
    if (mapState.seat === id) return;
    if (mapState.seat) {
      location.replace(`#/map?seat=${id}`); // 열린 시트에서 다른 자리를 누르면 기록을 쌓지 않아요
    } else {
      mapState.pushed = true;
      location.hash = `#/map?seat=${id}`;
    }
  }

  function closeSeat() {
    if (mapState.pushed) {
      mapState.pushed = false;
      history.back();
    } else {
      location.replace('#/map');
    }
  }

  function setMode(el, mode) {
    mapState.mode = mode;
    el.querySelectorAll('[data-mode]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
    const snap = MD.score.snapshot();
    el.querySelector('[data-slot="plan"]').innerHTML = planHTML(snap);
    el.querySelector('[data-slot="legend"]').innerHTML = legendHTML();
  }

  function bind(el) {
    el.addEventListener('click', async (e) => {
      const action = e.target.closest('[data-action]');
      if (action) {
        const name = action.dataset.action;
        if (name === 'close') closeSeat();
        else if (name === 'book') await MD.actions.book(action.dataset.seat);
        else if (name === 'checkin') {
          if (!(await MD.actions.checkIn())) return;
          // 화면 전체를 다시 그리면 시트가 다시 올라오는 동안 두 번째 터치가 뒤쪽 탭으로 새요.
          // 시트를 연 채로 내용만 바꿔요.
          const snap = MD.score.snapshot();
          const scroller = el.querySelector('.sheet__scroll');
          const top = scroller ? scroller.scrollTop : 0;
          UI.keepFocus(el, () => { el.querySelector('[data-slot="plan"]').innerHTML = planHTML(snap); });
          paintSheet(el, snap, false);
          const next = el.querySelector('.sheet__scroll');
          if (next) next.scrollTop = top;
          const status = el.querySelector('.seatinfo__using');
          if (status) { status.setAttribute('tabindex', '-1'); status.focus({ preventScroll: true }); }
        } else if (name === 'checkout') MD.actions.checkOut();
        return;
      }
      const modeBtn = e.target.closest('[data-mode]');
      if (modeBtn) { setMode(el, modeBtn.dataset.mode); return; }
      const seatBtn = e.target.closest('[data-seat]');
      if (seatBtn) openSeat(seatBtn.dataset.seat);
    });
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mapState.seat && !document.body.classList.contains('is-dialog')) closeSeat();
    });
  }

  function render(el, ctx) {
    mapState.seat = validSeat(ctx.query.get('seat'));
    mapState.pushed = false;
    const snap = MD.score.snapshot();
    const now = new Date();
    el.innerHTML = `
      <div class="mapview">
        <div class="mapview__main">
          <div class="page-head">
            <div>
              <h1 class="page-title">자리 확인</h1>
              <p class="page-sub">${U.fmtMonthDay(now)} (${U.weekday(now)}) · ${D.FLOOR.label} 빈자리 ${snap.freeCount}석</p>
            </div>
            <a class="btn-chip" href="#/prefs">${UI.icon('sliders')}내 조건</a>
          </div>
          <div class="map-tools">
            <ul class="chips" aria-label="내 조건">${chipsHTML(snap)}</ul>
            <div class="segmented" role="group" aria-label="도면 보기 방식">
              <button type="button" data-mode="status" data-focus="mode-status" aria-pressed="${mapState.mode === 'status'}">자리 상태</button>
              <button type="button" data-mode="heat" data-focus="mode-heat" aria-pressed="${mapState.mode === 'heat'}">취향 히트맵</button>
            </div>
          </div>
          <section class="card plan-card" aria-label="${D.FLOOR.label} 좌석 배치도">
            <div data-slot="legend">${legendHTML()}</div>
            <div data-slot="plan">${planHTML(snap)}</div>
          </section>
          <section class="picks-strip" aria-labelledby="picks-title">
            <h2 class="section-title" id="picks-title">오늘의 추천 3석</h2>
            <ol class="picks">${MD.seatSheet.picksHTML(snap)}</ol>
          </section>
          <p class="map-note">${UI.icon('info')}<span>도면은 시연용 가상 도면이에요. 실제 사무실 배치와 달라요.</span></p>
        </div>
        <div class="sheet-backdrop" data-action="close" hidden></div>
        <aside class="sheet" data-slot="sheet" aria-labelledby="sheet-title"></aside>
      </div>`;
    bind(el);
    paintSheet(el, snap, !!mapState.seat);
  }

  // 같은 화면에서 ?seat 만 바뀔 때 (시트 열기·닫기·다른 자리)
  function update(el, ctx) {
    const prev = mapState.seat;
    mapState.seat = validSeat(ctx.query.get('seat'));
    if (!mapState.seat) mapState.pushed = false;
    const snap = MD.score.snapshot();
    UI.keepFocus(el, () => { el.querySelector('[data-slot="plan"]').innerHTML = planHTML(snap); });
    paintSheet(el, snap, !!mapState.seat && mapState.seat !== prev);
    if (!mapState.seat && prev) {
      const tile = el.querySelector(`[data-seat="${prev}"]`);
      if (tile) tile.focus({ preventScroll: true });
    }
  }

  MD.screens.map = { title: '자리 확인', render, update };
})();
