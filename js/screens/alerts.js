/*
 * 알림 — 내 수리 요청 진행 상황 + 알림 목록 (주황 시안 '알림')
 * 수리: 접수 → 수리 중 → 완료 (톤앤매너 2장 "수리에는 진행 단계")
 * 문구는 톤앤매너 4장 말투: "17F · F03 수리가 완료됐어요"
 */
(() => {
  'use strict';
  const MD = (window.MD = window.MD || {});
  MD.screens = MD.screens || {};
  const U = MD.util;
  const D = MD.data;
  const UI = MD.ui;
  const esc = UI.esc;

  const STEPS = [
    { key: 'received', label: '접수' },
    { key: 'progress', label: '수리 중' },
    { key: 'done', label: '완료' },
  ];
  const STATUS_TONE = { received: 'brand', progress: 'mid', done: 'ok' };

  // 시간이 없는 샘플 기록은 아이디로 정해진 시각을 붙여요 (누가 봐도 같게)
  function pseudoTime(seed) {
    const m = 7 * 60 + 30 + (U.hash(seed) % (10 * 60));
    return U.minutesToHM(m);
  }

  // 알림 시각(ms). 내 활동은 실제 시각, 샘플 기록은 날짜 + 정해진 시각
  function atOf(daysAgo, hm) {
    const [h, m] = hm.split(':').map(Number);
    const d = U.daysAgoDate(daysAgo);
    d.setHours(h, m, 0, 0);
    return d.getTime();
  }

  function ticketItems() {
    const out = [];
    const reviewEvents = MD.state.events().filter((e) => e.type === 'review');
    MD.tickets.all().filter((t) => t.mine).forEach((t) => {
      const seat = D.seatLabel(t.seatId);
      const item = D.ITEMS[t.item];
      const when = (key) => {
        if (t.events[key] === 0) {
          const ev = reviewEvents.filter((e) => e.seatId === t.seatId).pop();
          if (ev) return { time: ev.time, at: ev.at || atOf(0, ev.time) };
        }
        const time = pseudoTime(`${t.id}-${key}`);
        return { time, at: atOf(t.events[key], time) };
      };
      const timeOf = (key) => when(key).time;
      const atFor = (key) => when(key).at;
      const received = t.kind === 'auto'
        ? { title: `${seat} ${item} 불만이 모여 자동 접수됐어요`, desc: `같은 불만이 7일 안에 ${MD.tickets.AUTO_COUNT}건 들어왔어요` }
        : t.kind === 'broken'
          ? { title: `${seat} ${item} 고장을 접수했어요`, desc: '수리가 끝날 때까지 이 자리는 추천에서 빠져요' }
          : { title: `${seat} ${t.summary} 신고를 접수했어요`, desc: '담당자에게 전달했어요' };
      out.push(Object.assign({ id: `${t.id}-r`, kind: 'repair', icon: 'wrench', daysAgo: t.events.received, time: timeOf('received'), at: atFor('received'), seatId: t.seatId }, received));
      if (t.events.progress != null) {
        const eta = t.etaDays != null ? `${U.fmtMonthDay(U.addDays(U.startOfToday(), t.etaDays))} 완료 예정이에요` : '곧 수리를 시작해요';
        out.push({ id: `${t.id}-p`, kind: 'repair', icon: 'wrench', daysAgo: t.events.progress, time: timeOf('progress'), at: atFor('progress'), seatId: t.seatId, title: `${seat} 수리 담당자가 배정됐어요`, desc: eta });
      }
      if (t.events.done != null) {
        out.push({ id: `${t.id}-d`, kind: 'repair', icon: 'check', daysAgo: t.events.done, time: timeOf('done'), at: atFor('done'), seatId: t.seatId, title: `${seat} 수리가 완료됐어요`, desc: `${item} 수리가 끝나 다시 예약할 수 있어요` });
      }
    });
    return out;
  }

  function seatItems() {
    const out = MD.state.events().filter((e) => e.type === 'booking').map((e) => ({
      id: e.id, kind: 'seat', icon: 'calendar', daysAgo: U.daysSince(e.date), time: e.time, at: e.at || atOf(U.daysSince(e.date), e.time), seatId: e.seatId,
      title: `${D.seatLabel(e.seatId)} 예약했어요`, desc: '오늘 09:00 – 18:00 · 출근하면 체크인해 주세요',
    }));
    // 매일 아침 8시 '오늘의 명당' 안내
    const now = new Date();
    if (now.getHours() >= 8) {
      const snap = MD.score.snapshot();
      const top = snap.top[0];
      if (top) {
        out.push({
          id: `daily-${U.todayKey()}`, kind: 'seat', icon: 'crown', daysAgo: 0, time: '08:00', at: atOf(0, '08:00'), seatId: top.seat.id,
          title: `오늘 나의 명당은 ${D.seatLabel(top.seat.id)} 자리예요`, desc: `${top.reasons.join(' · ')} · 취향 일치도 ${top.score}%`,
        });
      }
    }
    return out;
  }

  // 최신순
  function list() {
    return ticketItems().concat(seatItems()).sort((a, b) => b.at - a.at);
  }

  // 알림을 마지막으로 본 시각 이후 것이 새 알림. 한 번도 안 봤으면 어제·오늘 것.
  const isUnread = (x, seenAt) => (seenAt ? x.at > seenAt : x.daysAgo <= 1);
  function unreadCount() {
    const seenAt = MD.store.get('alertsSeenAt', null);
    return list().filter((x) => isUnread(x, seenAt)).length;
  }
  function markSeen() {
    MD.store.set('alertsSeenAt', Date.now());
  }

  MD.alerts = { list, unreadCount, markSeen };

  /* ---------- 화면 ---------- */
  function progressHTML(t) {
    const status = MD.tickets.status(t);
    const reached = STEPS.findIndex((s) => s.key === status);
    return `
      <ol class="track" aria-label="진행 단계: ${MD.tickets.STATUS_LABEL[status]}">
        ${STEPS.map((s, i) => {
          const day = t.events[s.key];
          let when = '';
          if (day != null) when = U.fmtDot(U.daysAgoDate(day));
          else if (s.key === 'done' && t.etaDays != null) when = `예정 ${U.fmtDot(U.addDays(U.startOfToday(), t.etaDays))}`;
          const cls = i < reached ? 'is-done' : i === reached ? (status === 'done' ? 'is-done' : 'is-now') : '';
          return `<li class="track__step ${cls}"><span class="track__dot">${cls === 'is-done' ? UI.icon('check') : ''}</span><span class="track__label">${s.label}</span><span class="track__when">${when}</span></li>`;
        }).join('')}
      </ol>`;
  }

  function ticketsHTML() {
    const mine = MD.tickets.all().filter((t) => t.mine)
      .sort((a, b) => (MD.tickets.status(a) === 'done') - (MD.tickets.status(b) === 'done') || a.events.received - b.events.received);
    if (!mine.length) {
      return '<p class="empty">아직 수리 요청이 없어요. 리뷰에서 고장이나 불만을 고르면 자동으로 접수돼요.</p>';
    }
    return mine.map((t) => {
      const status = MD.tickets.status(t);
      return `
        <li class="ticket">
          <div class="ticket__head">
            <strong class="ticket__seat">${esc(D.seatLabel(t.seatId))}</strong>
            ${UI.pill(MD.tickets.STATUS_LABEL[status], STATUS_TONE[status])}
          </div>
          <p class="ticket__sub">${esc(t.summary)} · ${U.fmtMonthDay(U.daysAgoDate(t.events.received))} 신청</p>
          ${progressHTML(t)}
          <a class="text-btn ticket__link" href="#/map?seat=${t.seatId}">이 자리 확인하기${UI.icon('chevronRight')}</a>
        </li>`;
    }).join('');
  }

  function itemHTML(x, seenAt) {
    const unread = isUnread(x, seenAt);
    const when = x.daysAgo === 0 ? x.time : x.daysAgo === 1 ? '어제' : U.fmtMonthDay(U.daysAgoDate(x.daysAgo));
    return `
      <li>
        <a class="alert${unread ? ' is-unread' : ''}" href="#/map?seat=${x.seatId}">
          <span class="alert__icon alert__icon--${x.kind}">${x.icon === 'crown' ? UI.crown() : UI.icon(x.icon)}</span>
          <span class="alert__body">
            <span class="alert__title">${esc(x.title)}</span>
            <span class="alert__desc">${esc(x.desc)}</span>
          </span>
          <span class="alert__when">${esc(when)}${unread ? '<span class="alert__dot"><span class="sr-only">새 알림</span></span>' : ''}</span>
        </a>
      </li>`;
  }

  function render(view) {
    const state = { filter: 'all' };
    const seenAt = MD.store.get('alertsSeenAt', null); // 들어오기 전 기준으로 새 알림을 표시해요

    function paint() {
      const items = list();
      const shown = state.filter === 'all' ? items : items.filter((x) => x.kind === state.filter);
      const today = shown.filter((x) => x.daysAgo === 0);
      const before = shown.filter((x) => x.daysAgo > 0);
      const count = (k) => (k === 'all' ? items.length : items.filter((x) => x.kind === k).length);
      const filters = [['all', '전체'], ['repair', '수리'], ['seat', '명당']].map(([k, label]) =>
        `<button type="button" data-filter="${k}" data-focus="filter-${k}" aria-pressed="${state.filter === k}">${label} ${count(k)}</button>`).join('');

      UI.keepFocus(view, () => {
        view.innerHTML = `
          <div class="narrow alerts">
            ${UI.back('#/', '뒤로')}
            <div class="page-head">
              <div>
                <h1 class="page-title">알림</h1>
                <p class="page-sub">수리 진행 상황과 내 자리 소식을 모아 봐요</p>
              </div>
            </div>
            <div class="segmented" role="group" aria-label="알림 종류">${filters}</div>
            ${state.filter !== 'seat' ? `
            <section class="card alerts__card" aria-labelledby="tickets-title">
              <h2 class="sr-h" id="tickets-title">${UI.icon('wrench')}내 수리 요청<span>${MD.tickets.all().filter((t) => t.mine).length}건</span></h2>
              <ul class="tickets">${ticketsHTML()}</ul>
            </section>` : ''}
            ${today.length ? `<section aria-labelledby="today-title"><h2 class="alerts__group" id="today-title">오늘</h2><ul class="alert-list">${today.map((x) => itemHTML(x, seenAt)).join('')}</ul></section>` : ''}
            ${before.length ? `<section aria-labelledby="before-title"><h2 class="alerts__group" id="before-title">이전</h2><ul class="alert-list">${before.map((x) => itemHTML(x, seenAt)).join('')}</ul></section>` : ''}
            ${!shown.length ? '<p class="empty">아직 알림이 없어요.</p>' : ''}
          </div>`;
      });
    }

    view.addEventListener('click', (e) => {
      const f = e.target.closest('[data-filter]');
      if (f) { state.filter = f.dataset.filter; paint(); }
    });
    paint();
    markSeen();
  }

  MD.screens.alerts = { title: '알림', render };
})();
