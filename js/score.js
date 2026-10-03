/*
 * 추천 로직 — 기획서 6장
 *
 * 나의 점수(취향 일치도) = 항목별 점수(0~100)의 가중 평균 − 감점
 *  - 우선순위 1·2·3위 항목 가중치 5·3·2
 *  - 고르지 않아도 늘 조금씩 보는 기본 항목: 만족도(별점) 1.5, 설비 상태 1, 온도 0.75, 햇빛 0.5
 *  - 평가 항목은 최근 30일만, 최근 평가일수록 크게 (14일마다 절반)
 *  - 다른 평가와 크게 동떨어진 평가는 절반만 반영 (기획서 7장)
 *  - 평가 5건 미만이면 층 평균으로 채우고 '평가 부족' 표시
 *  - 사용 중·수리 중인 자리는 추천에서 빼고, 불만 접수 중인 자리는 30점 감점
 *  - 추천 3석은 서로 다른 구역에서 골라요 (한 자리에 몰리지 않게, 기획서 7장)
 * 전체 평균 점수는 동료들이 남긴 별점 평균(★)이에요.
 */
(() => {
  'use strict';
  const MD = (window.MD = window.MD || {});
  const U = MD.util;
  const D = MD.data;

  const WINDOW_DAYS = 30;
  const HALF_LIFE_DAYS = 14;
  const MIN_REVIEWS = 5;
  const FILL_WEIGHT = 0.7; // 층 평균으로 채울 때 한 칸의 무게
  const PENALTY = 30;
  const RANK_WEIGHTS = [5, 3, 2];
  const BASE = [
    { factor: 'stars', weight: 1.5 },
    { factor: 'equip', weight: 1 },
    { factor: 'temp', weight: 0.75 },
    { factor: 'light', weight: 0.5 },
  ];
  // 평균에서 이만큼 떨어진 평가는 절반만 반영
  const OUTLIER = { temp: 2, noise: 1.5, light: 1.5, chair: 1.5, monitor: 1.5, stars: 2.5 };
  const REVIEW_KEYS = Object.keys(OUTLIER);
  const OPENNESS = { center: 100, window: 70, wall: 40, partition: 0 };
  const DIST_KEYS = ['wc', 'booth', 'meeting', 'partner', 'entrance'];

  // 우선순위로 고를 수 있는 조건. 같은 항목의 반대 조건은 함께 못 골라요(excludes).
  const CONDITIONS = [
    { id: 'quiet', label: '조용한 자리', factor: 'noise' },
    { id: 'warm', label: '따뜻한 자리', factor: 'temp', target: 2, excludes: ['cool'] },
    { id: 'cool', label: '시원한 자리', factor: 'temp', target: 0.5, excludes: ['warm'] },
    { id: 'noGlare', label: '눈부시지 않은 자리', factor: 'light', target: 1, excludes: ['sunny'] },
    { id: 'sunny', label: '햇빛 잘 드는 자리', factor: 'light', target: 1.5, excludes: ['noGlare'] },
    { id: 'equip', label: '설비 상태 좋은 자리', factor: 'equip' },
    { id: 'dual', label: '듀얼 모니터', factor: 'dual' },
    { id: 'window', label: '창가', factor: 'window' },
    { id: 'open', label: '트인 자리', factor: 'openness', dir: 'open', excludes: ['closed'] },
    { id: 'closed', label: '칸막이·벽면 자리', factor: 'openness', dir: 'closed', excludes: ['open'] },
    { id: 'nearWc', label: '화장실 가까이', factor: 'wc', dir: 'near' },
    { id: 'nearBooth', label: '통화부스 가까이', factor: 'booth', dir: 'near' },
    { id: 'nearMeeting', label: '회의실 가까이', factor: 'meeting', dir: 'near' },
    { id: 'nearPartner', label: '파트너석 가까이', factor: 'partner', dir: 'near' },
    { id: 'farEntrance', label: '출입구에서 멀리', factor: 'entrance', dir: 'far', excludes: ['nearEntrance'] },
    { id: 'nearEntrance', label: '출입구 가까이', factor: 'entrance', dir: 'near', excludes: ['farEntrance'] },
  ];
  const COND_BY_ID = {};
  CONDITIONS.forEach((c) => { COND_BY_ID[c.id] = c; });

  // 업무 모드 프리셋 (기획서 6장)
  const MODES = [
    { id: 'focus', label: '집중', desc: '조용하고 출입구에서 먼 자리', priorities: ['quiet', 'farEntrance', 'dual'] },
    { id: 'call', label: '통화', desc: '통화부스 가깝고 트인 자리', priorities: ['nearBooth', 'open', 'nearMeeting'] },
    { id: 'collab', label: '협업', desc: '파트너석 가깝고 트인 자리', priorities: ['nearPartner', 'open', 'nearMeeting'] },
    { id: 'custom', label: '직접', desc: '내가 고른 순서대로', priorities: [] },
  ];

  const RANGE = {};
  DIST_KEYS.forEach((k) => {
    const ds = D.SEATS.map((s) => s.dist[k]);
    RANGE[k] = { min: Math.min(...ds), max: Math.max(...ds) };
  });

  const recency = (r) => Math.pow(0.5, r.daysAgo / HALF_LIFE_DAYS);

  // 한 항목의 가중 평균과 단계별 개수
  function itemStat(reviews, key, opts) {
    const o = opts || {};
    const list = reviews.filter((r) =>
      r[key] != null && r.daysAgo < WINDOW_DAYS && (o.after == null || r.daysAgo < o.after));
    const size = key === 'temp' ? 4 : key === 'stars' ? 5 : 3;
    const counts = new Array(size).fill(0);
    list.forEach((r) => { counts[key === 'stars' ? r[key] - 1 : r[key]] += 1; });

    let sw = 0;
    let sv = 0;
    list.forEach((r) => { const w = recency(r); sw += w; sv += w * r[key]; });
    let mean = sw ? sv / sw : null;
    if (mean != null) {
      const first = mean;
      sw = 0;
      sv = 0;
      list.forEach((r) => {
        const w = recency(r) * (Math.abs(r[key] - first) >= OUTLIER[key] ? 0.5 : 1);
        sw += w;
        sv += w * r[key];
      });
      mean = sv / sw;
    }
    const filled = list.length < MIN_REVIEWS && o.floorMean != null;
    if (filled) {
      const k = (MIN_REVIEWS - list.length) * FILL_WEIGHT;
      mean = (sv + k * o.floorMean) / (sw + k);
    }
    return { mean, n: list.length, counts, filled };
  }

  // 항목별 점수 0~100
  function itemScores(seat, st, prefs) {
    const chosen = prefs.priorities.map((id) => COND_BY_ID[id]);
    const tempCond = chosen.find((c) => c.factor === 'temp');
    const lightCond = chosen.find((c) => c.factor === 'light');
    const tempTarget = tempCond ? tempCond.target : 1;
    const lightTarget = lightCond ? lightCond.target : 1;
    const levelScore = (m) => (m == null ? 50 : ((2 - m) / 2) * 100); // 0단계가 가장 좋은 3단계 항목

    const s = {
      temp: st.temp.mean == null ? 50 : U.clamp(100 - Math.abs(st.temp.mean - tempTarget) * 50, 0, 100),
      noise: levelScore(st.noise.mean),
      light: st.light.mean == null ? 50 : U.clamp(100 - Math.abs(st.light.mean - lightTarget) * 70, 0, 100),
      equip: (levelScore(st.chair.mean) + levelScore(st.monitor.mean)) / 2,
      stars: st.stars.mean == null ? 50 : ((st.stars.mean - 1) / 4) * 100,
      dual: seat.dual ? 100 : 0,
      window: seat.type === 'window' ? 100 : 0,
      openness: OPENNESS[seat.type],
    };
    DIST_KEYS.forEach((k) => {
      s[k + 'Near'] = (100 * (RANGE[k].max - seat.dist[k])) / (RANGE[k].max - RANGE[k].min);
    });
    return s;
  }

  function condScore(cond, s) {
    if (cond.factor === 'openness') return cond.dir === 'closed' ? 100 - s.openness : s.openness;
    if (DIST_KEYS.includes(cond.factor)) {
      const near = s[cond.factor + 'Near'];
      return cond.dir === 'far' ? 100 - near : near;
    }
    return s[cond.factor];
  }

  function weightedParts(s, prefs) {
    const parts = [];
    prefs.priorities.forEach((id, i) => {
      const c = COND_BY_ID[id];
      parts.push({ key: id, factor: c.factor, label: c.label, weight: RANK_WEIGHTS[i], score: condScore(c, s), rank: i + 1 });
    });
    const chosen = new Set(parts.map((p) => p.factor));
    BASE.forEach((b) => {
      if (!chosen.has(b.factor)) parts.push({ key: b.factor, factor: b.factor, label: BASE_LABEL[b.factor], weight: b.weight, score: s[b.factor], base: true });
    });
    return parts;
  }

  /* ---------- 사람이 읽는 라벨 (톤앤매너: 측정값 대신 단계, 거리는 m) ---------- */
  const BASE_LABEL = { stars: '동료 만족도', equip: '설비 상태', temp: '온도', light: '햇빛' };
  const TYPE_REASON = { center: '트인 자리', window: '창가 자리', wall: '벽면 자리', partition: '칸막이 자리' };

  const labels = {
    temp: (m) => (m == null ? '온도 정보 부족' : D.LEVELS.temp.short[U.clamp(Math.round(m), 0, 3)]),
    noise: (m) => (m == null ? '소음 정보 부족' : m < 0.5 ? '소음 낮음' : m < 1.1 ? '소음 보통' : '소음 높음'),
    light: (m) => (m == null ? '햇빛 정보 부족' : m < 0.55 ? '조금 어두움' : m < 1.35 ? '채광 적당' : '햇빛 강함'),
    equip: (st) => {
      const c = st.chair.mean;
      const m = st.monitor.mean;
      return (c == null || c < 0.35) && (m == null || m < 0.35) ? '설비 상태 좋음' : '설비 불만 있음';
    },
  };

  function reasonFor(cond, seat, st) {
    switch (cond.factor) {
      case 'noise': return labels.noise(st.noise.mean);
      case 'temp': return labels.temp(st.temp.mean);
      case 'light': return labels.light(st.light.mean);
      case 'equip': return labels.equip(st);
      case 'dual': return seat.dual ? '듀얼 모니터' : '모니터 1대';
      case 'window': return seat.type === 'window' ? '창가' : '안쪽 자리';
      case 'openness': return TYPE_REASON[seat.type];
      case 'entrance': return cond.dir === 'far' ? `출입구에서 ${seat.dist.entrance}m` : `출입구 ${seat.dist.entrance}m`;
      default: return `${D.LANDMARKS[cond.factor].short} ${seat.dist[cond.factor]}m`;
    }
  }

  function baseReason(factor, st) {
    if (factor === 'stars') return st.stars.mean == null ? '평가 부족' : `별점 ${st.stars.mean.toFixed(1)}`;
    if (factor === 'equip') return labels.equip(st);
    return labels[factor](st[factor].mean);
  }

  function reasonsFor(seat, st, prefs, parts) {
    const out = prefs.priorities.map((id) => reasonFor(COND_BY_ID[id], seat, st));
    parts.filter((p) => p.base).sort((a, b) => b.score - a.score).forEach((p) => {
      if (out.length < 3) out.push(baseReason(p.factor, st));
    });
    return Array.from(new Set(out)).slice(0, 3);
  }

  /* ---------- 좌석 평가 ---------- */
  function evaluate(seat, rs, ctx) {
    const seatTickets = ctx.tickets.filter((t) => t.seatId === seat.id);
    const open = seatTickets.filter((t) => MD.tickets.status(t) !== 'done');
    const doneAfter = (item) => {
      const days = seatTickets.filter((t) => t.item === item && MD.tickets.status(t) === 'done').map((t) => t.events.done);
      return days.length ? Math.min(...days) : null;
    };

    const st = {};
    REVIEW_KEYS.forEach((k) => {
      st[k] = itemStat(rs, k, { floorMean: ctx.floor[k], after: k === 'chair' || k === 'monitor' ? doneAfter(k) : null });
    });
    const reviewCount = rs.filter((r) => r.daysAgo < WINDOW_DAYS).length;

    let state = 'free';
    if (open.some((t) => t.kind === 'broken')) state = 'repair';
    else if (ctx.my && ctx.my.seatId === seat.id) state = 'mine';
    else if (ctx.occupied.has(seat.id)) state = 'used';
    const penalty = state !== 'repair' && open.length ? PENALTY : 0;

    const item = itemScores(seat, st, ctx.prefs);
    const parts = weightedParts(item, ctx.prefs);
    const totalWeight = parts.reduce((a, p) => a + p.weight, 0);
    const raw = parts.reduce((a, p) => a + p.weight * p.score, 0) / totalWeight - penalty;

    return {
      seat,
      stats: st,
      reviewCount,
      lowData: reviewCount < MIN_REVIEWS,
      stars: st.stars.mean,
      state,
      openTickets: open,
      penalty,
      item,
      parts,
      raw,
      score: Math.round(U.clamp(raw, 0, 100)),
      reasons: reasonsFor(seat, st, ctx.prefs, parts),
    };
  }

  // 화면 하나를 그릴 때 한 번 불러서 쓰는 '지금 상태'
  function snapshot(prefsArg) {
    const prefs = prefsArg || MD.state.prefs();
    const reviews = D.reviews();
    const floor = {};
    REVIEW_KEYS.forEach((k) => { floor[k] = itemStat(reviews, k).mean; });
    const ctx = {
      prefs,
      floor,
      tickets: MD.tickets.all(reviews),
      occupied: D.occupiedToday(),
      my: MD.state.mySeat(),
    };

    const bySeat = {};
    reviews.forEach((r) => { (bySeat[r.seatId] = bySeat[r.seatId] || []).push(r); });
    const seats = D.SEATS.map((seat) => evaluate(seat, bySeat[seat.id] || [], ctx));
    const byId = {};
    seats.forEach((s) => { byId[s.seat.id] = s; });

    // 추천: 빈자리(내 예약 포함) 중 점수순, 구역이 겹치지 않게 3석
    const eligible = seats
      .filter((s) => s.state === 'free' || s.state === 'mine')
      .sort((a, b) => b.raw - a.raw || (a.seat.id < b.seat.id ? -1 : 1));
    const top = [];
    const zonesTaken = new Set();
    eligible.forEach((s) => {
      if (top.length < 3 && !zonesTaken.has(s.seat.zone)) { top.push(s); zonesTaken.add(s.seat.zone); }
    });
    eligible.forEach((s) => { if (top.length < 3 && !top.includes(s)) top.push(s); });

    const zones = D.ZONES.map((zone) => {
      const list = seats.filter((s) => s.seat.zone === zone);
      const free = list.filter((s) => s.state === 'free').length;
      const ratio = free / list.length;
      const level = ratio >= 0.4 ? 'ok' : ratio >= 0.2 ? 'mid' : 'bad';
      return { zone, free, total: list.length, level, label: { ok: '여유', mid: '보통', bad: '혼잡' }[level] };
    });

    return {
      prefs,
      my: ctx.my,
      tickets: ctx.tickets,
      floor,
      seats,
      byId,
      top,
      crownId: top.length ? top[0].seat.id : null, // 왕관은 층마다 1곳만 (톤앤매너 3장)
      zones,
      freeCount: seats.filter((s) => s.state === 'free').length,
    };
  }

  MD.score = {
    CONDITIONS, COND_BY_ID, MODES, WINDOW_DAYS, MIN_REVIEWS, PENALTY,
    labels, snapshot, itemStat,
  };
})();
