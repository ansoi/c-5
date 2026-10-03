/*
 * 브라우저 저장소 — 내 조건, 오늘 내 자리, 내가 남긴 리뷰, 내 수리 요청
 * DB 없이 각자 브라우저에만 저장해요. 그래서 발표 날 수백 명이 동시에 열어도 서로 영향이 없어요.
 * 사생활 보호 모드처럼 저장소가 막혀 있으면 메모리에 대신 저장해서 앱이 멈추지 않게 해요.
 */
(() => {
  'use strict';
  const MD = (window.MD = window.MD || {});
  const U = MD.util;

  const PREFIX = 'md.';
  const VERSION = 1; // 저장 구조를 바꾸면 올려 주세요. 예전 저장값은 지워져요.
  const memory = {};

  let ls = null;
  try {
    ls = window.localStorage;
    ls.setItem(PREFIX + '__test', '1');
    ls.removeItem(PREFIX + '__test');
  } catch (e) {
    ls = null;
  }

  function get(key, fallback) {
    try {
      const raw = key in memory ? memory[key] : ls ? ls.getItem(PREFIX + key) : null;
      return raw == null ? fallback : JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function set(key, value) {
    const raw = JSON.stringify(value);
    try {
      if (!ls) throw new Error('no storage');
      ls.setItem(PREFIX + key, raw);
      delete memory[key];
    } catch (e) {
      memory[key] = raw;
    }
  }

  function remove(key) {
    delete memory[key];
    try { if (ls) ls.removeItem(PREFIX + key); } catch (e) { /* 무시 */ }
  }

  function clearAll() {
    Object.keys(memory).forEach((k) => { delete memory[k]; });
    try {
      if (!ls) return;
      const keys = [];
      for (let i = 0; i < ls.length; i++) {
        const k = ls.key(i);
        if (k && k.startsWith(PREFIX)) keys.push(k);
      }
      keys.forEach((k) => ls.removeItem(k));
    } catch (e) { /* 무시 */ }
  }

  if (get('version', null) !== VERSION) {
    clearAll();
    set('version', VERSION);
  }

  MD.store = { get, set, remove };

  // 시연용 기본 예약. 실제 예약은 사내 예약 앱에서 하고, 명당은 결과만 받아 보여줘요.
  const DEMO_RESERVATION = { seatId: 'B07', from: '09:00', to: '18:00' };

  MD.state = {
    // 업무 모드 + 우선순위 1~3위 (기획서 5장 1·2단계)
    prefs() {
      const S = MD.score;
      const saved = get('prefs', null);
      const mode = saved && S.MODES.some((m) => m.id === saved.mode) ? saved.mode : 'focus';
      let priorities = saved && Array.isArray(saved.priorities) ? saved.priorities : null;
      if (!priorities) priorities = S.MODES.find((m) => m.id === mode).priorities;
      priorities = priorities.filter((id) => S.COND_BY_ID[id]).slice(0, 3);
      return { mode, priorities, isDefault: !saved };
    },
    setPrefs(p) {
      set('prefs', { mode: p.mode, priorities: p.priorities.slice(0, 3) });
    },

    // 오늘 내 자리 — status: reserved(체크인 전) → checkedIn(이용 중) → done(이용 완료)
    mySeat() {
      const today = U.todayKey();
      const saved = get('mySeat', null);
      if (saved && saved.date === today) return saved;
      return Object.assign({ date: today, status: 'reserved', demo: true }, DEMO_RESERVATION);
    },
    setMySeat(v) {
      set('mySeat', Object.assign({}, v, { date: U.todayKey(), demo: false }));
    },

    // 내가 남긴 리뷰 — date는 2026-10-03 형식
    myReviews() {
      return get('myReviews', []);
    },
    addMyReview(r) {
      const list = get('myReviews', []);
      list.push(r);
      set('myReviews', list);
    },

    // 내가 직접 넣은 수리 신고 — events 값은 날짜 키
    myTickets() {
      return get('myTickets', []);
    },
    addMyTicket(t) {
      const list = get('myTickets', []);
      list.push(t);
      set('myTickets', list);
    },

    // 마지막으로 이용을 마친 자리 — 리뷰 남기기 화면 머리말에 써요
    lastSession() {
      const s = get('lastSession', null);
      return s && s.date === U.todayKey() ? s : null;
    },
    setLastSession(v) {
      set('lastSession', Object.assign({}, v, { date: U.todayKey() }));
    },

    // 설정 — hideDept: 리뷰에 본부 이름 숨기기 (톤앤매너 6장)
    settings() {
      return Object.assign({ hideDept: false }, get('settings', {}));
    },
    setSettings(patch) {
      set('settings', Object.assign(MD.state.settings(), patch));
    },

    // 알림에 보여 줄 내 활동 (예약 등)
    events() {
      return get('events', []);
    },
    addEvent(e) {
      const list = get('events', []);
      list.push(Object.assign({ id: `E${Date.now()}`, date: U.todayKey(), time: U.nowHM() }, e));
      set('events', list.slice(-50));
    },

    // 신고해서 가린 리뷰
    reported() {
      return get('reported', []);
    },
    report(id) {
      const list = get('reported', []);
      if (!list.includes(id)) list.push(id);
      set('reported', list);
    },

    // 시연을 처음 상태로 되돌려요
    reset() {
      clearAll();
      set('version', VERSION);
    },
  };
})();
