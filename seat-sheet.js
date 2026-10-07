/*
 * 좌석 상세 — 자리 확인 화면에서 자리를 누르면 열려요
 * 기획서 4장 "좌석을 클릭하면 총점과 항목별 점수 표시", 5장 4단계 "총점·항목별 점수·후기"
 * 기준 시안: 초록 02(바텀시트), 주황 '자리 확인' 아래 시트
 */
(() => {
  'use strict';
  const MD = (window.MD = window.MD || {});
  const U = MD.util;
  const D = MD.data;
  const UI = MD.ui;
  const esc = UI.esc;

  const STATE = {
    free: { label: '예약 가능', tone: 'ok' },
    used: { label: '사용 중', tone: 'neutral' },
    repair: { label: '수리 중', tone: 'mid' },
    mine: { label: '내 자리', tone: 'brand' },
  };
  const TYPE_TEXT = { center: '중앙 자리', window: '창가 자리', wall: '벽면 자리', partition: '칸막이 자리' };
  const SIDE_TEXT = { north: '북쪽 창', west: '서쪽 창', corner: '북서쪽 모서리' };

  // 평균값 → 단계 번호 (라벨 기준은 score.js labels와 같아요)
  function levelIndex(key, mean) {
    if (mean == null) return null;
    if (key === 'temp') return U.clamp(Math.round(mean), 0, 3);
    if (key === 'noise') return mean < 0.5 ? 0 : mean < 1.1 ? 1 : 2;
    if (key === 'light') return mean < 0.55 ? 0 : mean < 1.35 ? 1 : 2;
    return mean < 0.35 ? 0 : mean < 1.2 ? 1 : 2; // 의자·모니터
  }

  // 열린 수리 요청이 있으면 평균보다 그 상태를 먼저 보여 줘요
  function equipCell(st, openTickets) {
    const open = (openTickets || []).find((t) => t.item === 'chair' || t.item === 'monitor');
    if (open) return { idx: open.kind === 'broken' ? 2 : 1, total: 3, label: `${D.ITEMS[open.item]} ${open.kind === 'broken' ? '고장' : '불만'} 접수` };
    const c = levelIndex('chair', st.chair.mean) || 0;
    const m = levelIndex('monitor', st.monitor.mean) || 0;
    const worst = Math.max(c, m);
    let label = '좋음';
    if (worst === 2) label = '고장';
    else if (worst === 1) label = c && m ? '의자·모니터 불만' : c ? '의자 불편' : '모니터 불량';
    return { idx: worst, total: 3, label };
  }

  function condsHTML(entry) {
    const st = entry.stats;
    const cells = [
      { key: 'temp', icon: 'thermometer', title: '온도', total: 4 },
      { key: 'noise', icon: 'volume', title: '소음', total: 3 },
      { key: 'light', icon: 'sun', title: '햇빛', total: 3 },
    ].map((c) => {
      const idx = levelIndex(c.key, st[c.key].mean);
      return Object.assign(c, { idx, label: idx == null ? '정보 부족' : D.LEVELS[c.key].short[idx] });
    });
    cells.push(Object.assign({ key: 'equip', icon: 'monitor', title: '의자·모니터' }, equipCell(st, entry.openTickets)));
    return cells.map((c) => `
      <li class="cond">
        <span class="cond__title">${UI.icon(c.icon)}${c.title}</span>
        <strong class="cond__label">${esc(c.label)}</strong>
        ${UI.steps(c.total, c.idx)}
      </li>`).join('');
  }

  function ticketHTML(entry, snap) {
    const list = snap.tickets.filter((t) => t.seatId === entry.seat.id);
    const open = list.find((t) => MD.tickets.status(t) !== 'done');
    if (open) {
      const label = MD.tickets.STATUS_LABEL[MD.tickets.status(open)];
      const eta = open.etaDays != null ? ` · ${U.fmtMonthDay(U.addDays(U.startOfToday(), open.etaDays))} 완료 예정` : '';
      const desc = open.kind === 'broken'
        ? '수리가 끝날 때까지 추천에서 빠져요'
        : `처리될 때까지 취향 일치도에서 ${MD.score.PENALTY}점을 빼요`;
      return `
        <div class="notice notice--mid">${UI.icon('wrench')}
          <div><strong>${esc(open.summary)} · ${label}${eta}</strong><span>${desc}</span></div>
        </div>`;
    }
    const done = list
      .filter((t) => MD.tickets.status(t) === 'done' && t.events.done < MD.score.WINDOW_DAYS)
      .sort((a, b) => a.events.done - b.events.done)[0];
    if (!done) return '';
    return `<p class="seatinfo__fixed">${UI.icon('check')}<span>${esc(done.summary)} → ${U.fmtMonthDay(U.daysAgoDate(done.events.done))} 수리 완료</span></p>`;
  }

  function breakdownHTML(entry) {
    const rows = entry.parts.slice().sort((a, b) => b.weight - a.weight).map((p) => `
      <li class="part">
        <span class="part__label">${esc(p.label)}</span>
        <span class="part__weight">${p.rank ? `${p.rank}순위` : '기본'} ×${p.weight}</span>
        <span class="part__score">${Math.round(p.score)}</span>
        <span class="part__bar" aria-hidden="true"><span style="width:${Math.round(p.score)}%"></span></span>
      </li>`).join('');
    const average = Math.round(entry.raw + entry.penalty);
    return `
      <details class="breakdown">
        <summary>항목별 점수 보기${UI.icon('chevronDown')}</summary>
        <ul class="parts">${rows}</ul>
        <p class="breakdown__sum">가중 평균 ${average}점${entry.penalty ? ` − 수리 접수 감점 ${entry.penalty}점` : ''} → 취향 일치도 <strong>${entry.score}%</strong></p>
        ${entry.lowData ? '<p class="breakdown__note">평가가 5건보다 적어서 층 평균을 함께 반영했어요.</p>' : ''}
      </details>`;
  }

  function actionsHTML(entry, snap) {
    const id = entry.seat.id;
    const my = snap.my;
    let primary;
    if (entry.state === 'mine') {
      if (my.status === 'reserved') primary = '<button type="button" class="btn btn--primary" data-action="checkin">체크인하기</button>';
      else if (my.status === 'checkedIn') {
        // 체크인 버튼이 있던 오른쪽 칸은 누를 수 없는 상태 표시, 종료는 왼쪽 테두리 버튼 (연속 터치 방지)
        return `
      <div class="seatinfo__actions">
        <button type="button" class="btn btn--secondary" data-action="checkout">이용 종료하기</button>
        <p class="seatinfo__using">${UI.icon('check')}<span>이용 중 · ${esc(my.checkInAt)}부터</span></p>
      </div>`;
      }
      else if (!my.reviewed) primary = `<a class="btn btn--primary" href="#/review/${id}">리뷰 남기기</a>`;
      else primary = '<button type="button" class="btn btn--primary" disabled>오늘 이용을 마쳤어요</button>';
    } else if (entry.state === 'used') {
      primary = '<button type="button" class="btn btn--primary" disabled>사용 중이에요</button>';
    } else if (entry.state === 'repair') {
      primary = '<button type="button" class="btn btn--primary" disabled>수리 중이에요</button>';
    } else {
      primary = `<button type="button" class="btn btn--primary" data-action="book" data-seat="${id}">예약 앱에서 예약하기</button>`;
    }
    return `
      <div class="seatinfo__actions">
        <a class="btn btn--secondary" href="#/seat/${id}/reviews">리뷰 보기 <span class="btn__count">${entry.reviewCount}</span></a>
        ${primary}
      </div>`;
  }

  function html(entry, snap) {
    const seat = entry.seat;
    const state = STATE[entry.state];
    const rank = snap.top.findIndex((t) => t.seat.id === seat.id);
    const sub = [
      `${seat.zone}구역`,
      TYPE_TEXT[seat.type],
      seat.windowSide ? SIDE_TEXT[seat.windowSide] : null,
      rank >= 0 ? `추천 ${rank + 1}위` : null,
    ].filter(Boolean).join(' · ');

    const nPriorities = snap.prefs.priorities.length;
    const reasons = entry.reasons.map((r, i) => `
      <li class="chip">${i < nPriorities ? `<span class="chip__num" aria-label="${i + 1}순위">${i + 1}</span>` : ''}${esc(r)}</li>`).join('');

    const facts = [
      `<li class="fact">${UI.icon('monitor')}${seat.dual ? '듀얼 모니터' : '모니터 1대'}</li>`,
      `<li class="fact">${UI.icon('plug')}콘센트 ${seat.outlets}구</li>`,
      `<li class="fact"><span class="fact__wc" aria-hidden="true">WC</span>화장실 ${seat.dist.wc}m</li>`,
      `<li class="fact">${UI.icon('droplet')}정수기 ${seat.dist.pantry}m</li>`,
      `<li class="fact">${UI.icon('phone')}통화부스 ${seat.dist.booth}m</li>`,
    ].join('');

    // 사용 중·수리 중 자리는 추천에서 빠지므로 일치도 숫자 대신 상태를 보여 줘요
    const blocked = entry.state === 'used' || entry.state === 'repair';
    const scoreBox = blocked
      ? `<div class="score-box score-box--blocked">
            <span class="score-box__label">취향 일치도</span>
            <strong class="score-box__value score-box__value--state">${state.label}</strong>
            <span class="score-box__meta">${entry.state === 'repair' ? '수리가 끝나면 다시 계산해요' : '오늘은 추천에서 빠져요'}</span>
          </div>`
      : `<div class="score-box score-box--mine">
            <span class="score-box__label">취향 일치도</span>
            <strong class="score-box__value">${entry.score}<small>%</small></strong>
            <span class="score-box__meta">내 조건으로 계산했어요</span>
          </div>`;

    return `
      <div class="sheet__scroll">
      <div class="seatinfo">
        <div class="seatinfo__head">
          <div class="seatinfo__title">
            <h2 class="seatinfo__code" id="sheet-title" tabindex="-1">${esc(D.seatLabel(seat.id))}${snap.crownId === seat.id ? `${UI.crown()}<span class="sr-only">나의 명당</span>` : ''}</h2>
            <span class="seatinfo__pills">${UI.pill(state.label, state.tone)}${entry.lowData ? UI.pill('평가 부족', 'neutral') : ''}</span>
          </div>
          <button type="button" class="icon-btn seatinfo__close" data-action="close" aria-label="닫기">${UI.icon('x')}</button>
        </div>
        <p class="seatinfo__sub">${esc(sub)}</p>

        <div class="seatinfo__scores">
          ${scoreBox}
          <div class="score-box">
            <span class="score-box__label">동료 별점</span>
            <strong class="score-box__value"><span class="star-text" aria-hidden="true">★</span> ${entry.stars != null ? entry.stars.toFixed(1) : '–'}</strong>
            <span class="score-box__meta">최근 30일 · ${entry.reviewCount}건</span>
          </div>
        </div>

        <section>
          <h3 class="seatinfo__h">내 조건으로 보면</h3>
          <ul class="chips">${reasons}</ul>
        </section>

        <ul class="facts" aria-label="자리 정보">${facts}</ul>

        <section>
          <h3 class="seatinfo__h">이 자리 평가<span>최근 30일 · ${entry.reviewCount}건</span></h3>
          <ul class="conds">${condsHTML(entry)}</ul>
          ${ticketHTML(entry, snap)}
        </section>

        ${blocked ? '' : breakdownHTML(entry)}
      </div>
      </div>
      ${actionsHTML(entry, snap)}`;
  }

  // 추천 3석 목록 (모바일 도면 아래, PC 빈 패널)
  function picksHTML(snap) {
    if (!snap.top.length) return '<li class="empty">지금은 빈자리가 없어요. 잠시 후 다시 확인해 주세요.</li>';
    return snap.top.map((t, i) => `
      <li>
        <button type="button" class="pick" data-seat="${t.seat.id}">
          <span class="rank${i === 0 ? ' rank--first' : ''}" aria-hidden="true">${i + 1}</span>
          <span class="pick__body">
            <span class="pick__code">${esc(D.seatLabel(t.seat.id))}${i === 0 ? UI.crown() : ''}</span>
            <span class="pick__why">${t.pickReasons.map((r, j) => (j === 0 ? `<strong class="nowrap why__lead">${esc(r)}</strong>` : `<span class="nowrap">${esc(r)}</span>`)).join(' · ')}</span>
          </span>
          <span class="pick__score"><span class="sr-only">취향 일치도 </span>${t.score}%</span>
        </button>
      </li>`).join('');
  }

  // PC에서 아무 자리도 고르지 않았을 때 오른쪽 패널
  function emptyHTML(snap) {
    return `
      <div class="sheet__scroll">
      <div class="seatinfo seatinfo--empty">
        <div>
          <h2 class="seatinfo__code">자리를 눌러 보세요</h2>
          <p class="seatinfo__sub">취향 일치도, 동료 평가, 거리, 수리 이력을 한 번에 보여 드려요.</p>
        </div>
        <section>
          <h3 class="seatinfo__h">오늘의 추천 3석</h3>
          <ol class="picks">${picksHTML(snap)}</ol>
        </section>
      </div>
      </div>`;
  }

  MD.seatSheet = { html, emptyHTML, picksHTML };
})();
