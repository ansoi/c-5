/*
 * 여러 화면이 같이 쓰는 동작 — 예약(시연), 체크인, 이용 종료, 리뷰 등록
 * 문구에서 좌석 번호 바로 뒤에는 조사를 붙이지 않아요 ("A08을/를" 대신 "A08 자리를").
 */
(() => {
  'use strict';
  const MD = (window.MD = window.MD || {});
  const U = MD.util;
  const D = MD.data;
  const UI = MD.ui;

  // 실제 예약은 사내 예약 앱에서 해요. 시연에서는 확인 창으로 대신하고 바로 예약된 것으로 처리해요.
  async function book(seatId) {
    const my = MD.state.mySeat();
    const label = D.seatLabel(seatId);
    if (my.seatId === seatId && my.status !== 'done') {
      UI.toast(`${label} 자리는 이미 오늘 내 자리예요`);
      return false;
    }
    const moving = my.status === 'checkedIn';
    const lines = [
      '실제 서비스에서는 사내 예약 앱이 열려요.',
      `시연에서는 ${label} 자리를 오늘 09:00 – 18:00로 바로 예약할게요.`,
    ];
    if (moving) lines.push(`지금 이용 중인 ${D.seatLabel(my.seatId)} 자리는 이용을 마치고, 그 자리 리뷰부터 받을게요.`);
    else if (my.status === 'reserved') lines.push(`${D.seatLabel(my.seatId)} 자리 예약은 취소돼요.`);
    const ok = await UI.confirm({ title: '사내 예약 앱으로 이동해요', body: lines.join('\n'), confirm: '예약 처리하기', cancel: '취소' });
    if (!ok) return false;

    if (moving) {
      // 좌석을 옮길 때도 평가 창을 띄워요 (기획서 4장 "퇴근 시 또는 좌석 변경 시 팝업")
      MD.state.setLastSession({ seatId: my.seatId, checkInAt: my.checkInAt, checkOutAt: U.nowHM(), reason: 'move', reviewed: false });
    }
    MD.state.setMySeat({ seatId, from: '09:00', to: '18:00', status: 'reserved' });
    MD.state.addEvent({ type: 'booking', seatId });
    if (moving) {
      location.hash = `#/review/${my.seatId}`;
      UI.toast(`${label} 예약했어요. 옮기기 전 자리 리뷰를 남겨 주세요`);
    } else {
      location.hash = '#/';
      UI.toast(`${label} 예약했어요. 출근하면 체크인해 주세요`);
    }
    return true;
  }

  function checkIn() {
    const my = MD.state.mySeat();
    MD.state.setMySeat(Object.assign({}, my, { status: 'checkedIn', checkInAt: U.nowHM() }));
    MD.state.addEvent({ type: 'checkin', seatId: my.seatId });
    UI.toast(`${D.seatLabel(my.seatId)} 체크인했어요`);
  }

  // 퇴근할 때 바로 평가 창으로 (기획서 4장 "사용 후 평가 창: 퇴근 시 팝업")
  function checkOut() {
    const my = MD.state.mySeat();
    const out = U.nowHM();
    MD.state.setMySeat(Object.assign({}, my, { status: 'done', checkOutAt: out }));
    MD.state.setLastSession({ seatId: my.seatId, checkInAt: my.checkInAt, checkOutAt: out, reason: 'checkout', reviewed: false });
    location.hash = `#/review/${my.seatId}`;
  }

  // 리뷰 등록 → 점수와 수리 요청에 바로 반영돼요 (기획서 보조 기능 1·2)
  function submitReview(seatId, answers) {
    const before = MD.score.snapshot().byId[seatId];
    const ticketsBefore = new Set(MD.tickets.all().map((t) => t.id));
    const session = MD.state.lastSession();
    const fromSession = session && session.seatId === seatId ? session : null;

    MD.state.addMyReview({
      id: `M${Date.now()}`,
      seatId,
      date: U.todayKey(),
      stars: answers.stars,
      temp: answers.temp,
      noise: answers.noise,
      light: answers.light,
      chair: answers.chair,
      monitor: answers.monitor,
      tags: answers.tags,
      text: answers.text,
      dept: D.ME.dept, // 보여 줄 때 '본부 숨기기' 설정을 따라요 (data.js reviews)
      year: D.ME.year,
      checkIn: fromSession ? fromSession.checkInAt : null,
      checkOut: fromSession ? fromSession.checkOutAt : null,
    });
    if (fromSession) MD.state.setLastSession(Object.assign({}, fromSession, { reviewed: true }));
    const my = MD.state.mySeat();
    if (my.seatId === seatId && my.status === 'done') MD.state.setMySeat(Object.assign({}, my, { reviewed: true }));
    MD.state.addEvent({ type: 'review', seatId });

    const after = MD.score.snapshot().byId[seatId];
    const newTickets = MD.tickets.all().filter((t) => !ticketsBefore.has(t.id) && t.seatId === seatId);
    return { before, after, newTickets, moved: !!(fromSession && fromSession.reason === 'move') };
  }

  MD.actions = { book, checkIn, checkOut, submitReview };
})();
