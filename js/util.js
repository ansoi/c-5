/* 공통 도구 — 날짜, 고정 난수, 숫자 */
(() => {
  'use strict';
  const MD = (window.MD = window.MD || {});

  const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
  const pad2 = (n) => String(n).padStart(2, '0');

  function startOfToday() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function addDays(date, n) {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    return d;
  }

  // 2026-10-03 형식
  const dateKey = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const todayKey = () => dateKey(startOfToday());

  // 날짜 키가 오늘로부터 며칠 전인지 (오늘 0, 어제 1)
  function daysSince(key) {
    const [y, m, d] = key.split('-').map(Number);
    return Math.round((startOfToday() - new Date(y, m - 1, d)) / 86400000);
  }

  const daysAgoDate = (n) => addDays(startOfToday(), -n);
  const fmtMonthDay = (d) => `${d.getMonth() + 1}월 ${d.getDate()}일`;
  const fmtDot = (d) => `${d.getMonth() + 1}.${d.getDate()}`;
  const weekday = (d, long) => WEEKDAYS[d.getDay()] + (long ? '요일' : '');
  const minutesToHM = (m) => `${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`;

  function nowHM() {
    const d = new Date();
    return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  }

  // 문자열 → 32비트 정수 (FNV-1a)
  function hash(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }

  // 고정 난수 (mulberry32). 시드가 같으면 누가 열어도 같은 샘플 데이터가 나와요.
  function rng(seed) {
    let a = typeof seed === 'string' ? hash(seed) : seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // 확률 배열에서 칸 하나 고르기 → 칸 번호
  function pick(rand, probs) {
    const total = probs.reduce((a, b) => a + b, 0);
    let r = rand() * total;
    for (let i = 0; i < probs.length; i++) {
      r -= probs[i];
      if (r < 0) return i;
    }
    return probs.length - 1;
  }

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  MD.util = {
    pad2, startOfToday, addDays, dateKey, todayKey, daysSince, daysAgoDate,
    fmtMonthDay, fmtDot, weekday, minutesToHM, nowHM, hash, rng, pick, clamp,
  };
})();
