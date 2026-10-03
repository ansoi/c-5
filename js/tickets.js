/*
 * 수리 요청 — 기획서 보조 기능 2 "설비 불만 자동 요청"
 * - 고장: 리뷰 1건이면 바로 접수 → 그 자리는 '수리 중'이 되고 추천에서 빠져요
 * - 불편·불량: 같은 자리·같은 설비에 7일 안에 3건이 쌓이면 자동 접수 → 끝날 때까지 30점 감점
 * - 수리가 끝나면 그 설비의 예전 평가는 점수에서 빼요 (기획서 7장 "점수 초기화")
 * events의 숫자는 '며칠 전'이에요. (received: 접수, progress: 수리 시작, done: 완료)
 */
(() => {
  'use strict';
  const MD = (window.MD = window.MD || {});
  const U = MD.util;
  const D = MD.data;

  const AUTO_COUNT = 3;
  const AUTO_DAYS = 7;
  const REVIEW_ITEMS = ['chair', 'monitor'];
  const STATUS_LABEL = { received: '접수', progress: '수리 중', done: '수리 완료' };

  function status(t) {
    if (t.events.done != null) return 'done';
    if (t.events.progress != null) return 'progress';
    return 'received';
  }

  // 저장된 내 신고는 날짜 키로 되어 있어서 '며칠 전'으로 바꿔요
  function fromStore(t) {
    const events = {};
    Object.keys(t.events || {}).forEach((k) => { events[k] = U.daysSince(t.events[k]); });
    return Object.assign({}, t, { events, mine: true });
  }

  // 마지막 수리 완료가 며칠 전인지 (없으면 null)
  function lastDone(list) {
    const days = list.filter((t) => status(t) === 'done').map((t) => t.events.done);
    return days.length ? Math.min(...days) : null;
  }

  function autoTicket(seatId, item, kind, summary, receivedDaysAgo, mine) {
    return { id: `AUTO-${seatId}-${item}`, seatId, item, kind, summary, mine, auto: true, events: { received: receivedDaysAgo } };
  }

  // 리뷰를 보고 접수해야 할 요청을 만들어요
  function deriveFromReviews(reviews, existing) {
    const out = [];
    D.SEATS.forEach((seat) => {
      REVIEW_ITEMS.forEach((item) => {
        const related = existing.filter((t) => t.seatId === seat.id && t.item === item);
        if (related.some((t) => status(t) !== 'done')) return; // 이미 처리 중
        const after = lastDone(related);
        const complaints = reviews.filter((r) =>
          r.seatId === seat.id && r[item] != null && r[item] >= 1 &&
          r.daysAgo < AUTO_DAYS && (after == null || r.daysAgo < after));
        if (!complaints.length) return;
        const oldestFirst = complaints.slice().sort((a, b) => b.daysAgo - a.daysAgo);
        const broken = oldestFirst.filter((r) => r[item] === 2);
        if (broken.length) {
          out.push(autoTicket(seat.id, item, 'broken', `${D.ITEMS[item]} 고장 신고`, broken[0].daysAgo, broken.some((r) => r.mine)));
        } else if (complaints.length >= AUTO_COUNT) {
          out.push(autoTicket(seat.id, item, 'auto', `${D.ITEMS[item]} 불만 ${complaints.length}건 자동 접수`,
            oldestFirst[AUTO_COUNT - 1].daysAgo, complaints.some((r) => r.mine)));
        }
      });
    });
    return out;
  }

  function all(reviews) {
    const base = D.SEED_TICKETS.concat(MD.state.myTickets().map(fromStore));
    return base.concat(deriveFromReviews(reviews || D.reviews(), base));
  }

  MD.tickets = { all, status, STATUS_LABEL, AUTO_COUNT, AUTO_DAYS };
})();
