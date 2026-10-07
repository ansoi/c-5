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

  const EARLY_CHECKIN_MIN = 30; // 예약 시작 30분 전부터 체크인할 수 있어요
  const toMin = (hm) => { const [h, mm] = String(hm || '0:0').split(':').map(Number); return h * 60 + mm; };

  // 지금이 예약 시간 안인지 (화면 안내와 체크인 확인에 같이 써요)
  function checkInWindow(my) {
    const m = my || MD.state.mySeat();
    const now = U.nowHM();
    const inTime = toMin(now) >= toMin(m.from) - EARLY_CHECKIN_MIN && toMin(now) <= toMin(m.to);
    return { inTime, now, from: m.from, to: m.to };
  }

  // 예약 시간이 아니면 막지 않고 안내한 뒤 '시연용으로 체크인하기'를 고를 수 있게 해요
  // (심사가 저녁·밤에도 진행될 수 있어서 완전히 막으면 체크인을 못 해 봐요)
  async function checkIn() {
    const my = MD.state.mySeat();
    const win = checkInWindow(my);
    if (!win.inTime) {
      const ok = await UI.confirm({
        title: '예약 시간이 아니에요',
        body: [
          `${D.seatLabel(my.seatId)} 예약은 ${win.from} – ${win.to}이고, 지금은 ${win.now}이에요.`,
          `실제 서비스에서는 예약 시작 ${EARLY_CHECKIN_MIN}분 전부터 체크인할 수 있어요.`,
          '시연에서는 시간과 상관없이 체크인해 볼 수 있어요.',
        ].join('\n'),
        confirm: '시연용으로 체크인하기',
        cancel: '닫기',
      });
      if (!ok) return false;
    }
    MD.state.setMySeat(Object.assign({}, my, { status: 'checkedIn', checkInAt: U.nowHM(), demoCheckIn: !win.inTime }));
    MD.state.addEvent({ type: 'checkin', seatId: my.seatId });
    UI.toast(win.inTime ? `${D.seatLabel(my.seatId)} 체크인했어요` : `${D.seatLabel(my.seatId)} 시연용으로 체크인했어요`);
    return true;
  }

  // 'HH:MM' 두 개 사이 분
  function minutesBetween(from, to) {
    return Math.max(0, toMin(to) - toMin(from));
  }

  // 퇴근할 때 바로 평가 창으로 (기획서 4장 "사용 후 평가 창: 퇴근 시 팝업")
  // 체크인 직후 실수로 두 번 눌러 1분 이용 기록이 생기지 않게 한 번 더 물어봐요
  async function checkOut() {
    const my = MD.state.mySeat();
    const out = U.nowHM();
    const used = minutesBetween(my.checkInAt, out);
    const usedText = used < 1 ? '1분 미만' : used < 60 ? `${used}분` : `${Math.floor(used / 60)}시간${used % 60 ? ` ${used % 60}분` : ''}`;
    const lines = [
      `${my.checkInAt}에 체크인했어요. 지금 끝내면 ${usedText} 이용으로 기록돼요.`,
      used < 10 ? '체크인한 지 얼마 안 됐어요. 실수로 누르셨다면 계속 이용하기를 눌러 주세요.' : null,
      '종료하면 리뷰 남기기 화면으로 이동해요.',
    ].filter(Boolean);
    const ok = await UI.confirm({
      title: `${D.seatLabel(my.seatId)} 자리 이용을 끝낼까요?`,
      body: lines.join('\n'),
      confirm: '이용 종료하기',
      cancel: '계속 이용하기',
    });
    if (!ok) return false;
    MD.state.setMySeat(Object.assign({}, my, { status: 'done', checkOutAt: out }));
    MD.state.setLastSession({ seatId: my.seatId, checkInAt: my.checkInAt, checkOutAt: out, reason: 'checkout', reviewed: false });
    location.hash = `#/review/${my.seatId}`;
    return true;
  }

  // 리뷰 등록 → 점수와 수리 요청에 바로 반영돼요 (기획서 보조 기능 1·2)
  function submitReview(seatId, answers) {
    const before = MD.score.snapshot().byId[seatId];
    // 같은 id라도 '불만 접수'가 '고장 접수'로 바뀌면 새 접수로 봐요
    const ticketKey = (t) => `${t.id}:${t.kind}`;
    const ticketsBefore = new Set(MD.tickets.all().map(ticketKey));
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
    const newTickets = MD.tickets.all().filter((t) => !ticketsBefore.has(ticketKey(t)) && t.seatId === seatId);
    return { before, after, newTickets, moved: !!(fromSession && fromSession.reason === 'move') };
  }

  MD.actions = { book, checkIn, checkInWindow, checkOut, submitReview };
})();
