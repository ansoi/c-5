/*
 * 샘플 데이터 — 17F 가상 도면, 좌석, 편의시설, 리뷰, 수리 요청
 *
 * ⚠️ 도면은 가상이에요. 실제 사무실 도면은 보안 자료라 쓰지 않아요. (톤앤매너 6장)
 * 리뷰는 고정 시드로 만들어서 누가 열어도 같은 데이터가 보여요.
 * 내가 남긴 리뷰·체크인은 MD.state(브라우저 저장소)에 따로 쌓이고 reviews()에서 합쳐져요.
 */
(() => {
  'use strict';
  const MD = (window.MD = window.MD || {});
  const U = MD.util;

  // 시연용 사용자. 리뷰에는 이름 대신 본부·연차만 보여요.
  const ME = { name: '김삼일', dept: 'ASR', year: 3 };

  // 좌표 단위는 m. 창은 북쪽(위)과 서쪽(왼쪽) 벽에 있어요.
  const FLOOR = { id: '17F', label: '17F', width: 26, height: 40 };

  const LANDMARKS = {
    focus: { label: '포커스룸', short: '포커스룸', x: 22, y: 4 },
    booth: { label: '통화부스', short: '통화부스', x: 22, y: 10 },
    pantry: { label: '탕비실·정수기', short: '정수기', x: 22, y: 16 },
    meeting: { label: '회의실', short: '회의실', x: 22, y: 23 },
    partner: { label: '파트너석', short: '파트너석', x: 22, y: 31 },
    wc: { label: '화장실', short: '화장실', x: 22, y: 37 },
    copy: { label: '복사실', short: '복사실', x: 14, y: 39 },
    entrance: { label: '출입구·엘리베이터', short: '출입구', x: 6, y: 39 },
  };

  // 구역마다 2줄 × 5석. 번호는 윗줄 01~05, 아랫줄 06~10.
  const ZONES = ['A', 'B', 'C', 'D'];
  const COL_X = [3, 6, 9, 12, 15];
  const ROW_Y = { A: [3, 6], B: [12, 15], C: [21, 24], D: [30, 33] };

  const TYPE_LABEL = { window: '창가', wall: '벽면', center: '중앙', partition: '칸막이' };
  const SINGLE_MONITOR = ['A05', 'B01', 'B06', 'C03', 'C06', 'C10', 'D01', 'D06', 'D08', 'D10'];
  const ONE_OUTLET = ['A06', 'B04', 'C08', 'D03', 'D06'];
  const AC_DIRECT = ['B03', 'B08', 'C09', 'D02']; // 에어컨 바람이 바로 닿는 자리

  // 통로를 따라 걷는 거리라서 가로·세로 거리를 더해요.
  const walk = (a, b) => Math.round(Math.abs(a.x - b.x) + Math.abs(a.y - b.y));

  const SEATS = [];
  ZONES.forEach((zone) => {
    ROW_Y[zone].forEach((y, row) => {
      COL_X.forEach((x, col) => {
        const id = zone + U.pad2(row * 5 + col + 1);
        let type = 'center';
        let windowSide = null;
        if (zone === 'A' && row === 0) {
          type = 'window';
          windowSide = col === 0 ? 'corner' : 'north';
        } else if (col === 0) {
          type = 'window';
          windowSide = 'west';
        } else if (zone === 'A' && row === 1 && col <= 3) {
          type = 'partition';
        } else if (col === 4) {
          type = 'wall';
        }
        const seat = {
          id, zone, row, col, x, y, type, windowSide,
          dual: !SINGLE_MONITOR.includes(id),
          outlets: ONE_OUTLET.includes(id) ? 1 : 2,
          acDirect: AC_DIRECT.includes(id),
          dist: {},
        };
        Object.keys(LANDMARKS).forEach((k) => { seat.dist[k] = walk(seat, LANDMARKS[k]); });
        SEATS.push(seat);
      });
    });
  });
  const SEAT_BY_ID = {};
  SEATS.forEach((s) => { SEAT_BY_ID[s.id] = s; });

  // 평가 항목과 단계 — 톤앤매너 3장: 온도 4단계, 소음 3단계
  const LEVELS = {
    temp: { label: '온도', answers: ['추워요', '적당해요', '따뜻해요', '더워요'], short: ['추움', '적당함', '따뜻함', '더움'] },
    noise: { label: '소음', answers: ['조용해요', '보통이에요', '시끄러워요'], short: ['조용함', '보통', '시끄러움'] },
    light: { label: '햇빛', answers: ['어두워요', '적당해요', '눈부셔요'], short: ['어두움', '적당', '눈부심'] },
    chair: { label: '의자', answers: ['좋아요', '불편해요', '고장났어요'], short: ['좋음', '불편', '고장'] },
    monitor: { label: '모니터', answers: ['좋아요', '불량이에요', '고장났어요'], short: ['좋음', '불량', '고장'] },
  };

  // 리뷰 카테고리 — 정해진 목록에서만 골라요 (톤앤매너 6장)
  const CATEGORIES = [
    { id: 'focus', label: '집중형 명당' },
    { id: 'dual', label: '듀얼모니터 맛집' },
    { id: 'sunny', label: '채광 좋음' },
    { id: 'afternoonSun', label: '오후 햇살 강함' },
    { id: 'acDirect', label: '에어컨 직격' },
    { id: 'fewOutlets', label: '콘센트 부족' },
    { id: 'busy', label: '오가는 길목' },
  ];
  const CATEGORY_BY_ID = {};
  CATEGORIES.forEach((c) => { CATEGORY_BY_ID[c.id] = c; });

  const ITEMS = { chair: '의자', monitor: '모니터', desk: '책상', outlet: '콘센트' };

  const DEPTS = ['ASR', 'TAS', 'Deal', 'Tax', 'Consulting'];
  const DEPT_WEIGHTS = [0.4, 0.15, 0.15, 0.18, 0.12];

  /* ---------- 샘플 리뷰 만들기 ---------- */

  const CHAIR_ISSUE = { A09: [0.55, 0.45, 0], C07: [0.7, 0.3, 0] };
  const MONITOR_ISSUE = { D07: [0.62, 0.38, 0] };
  const LOW_DATA = { C06: 3, D10: 2, A05: 4 }; // 평가 5건 미만 → '평가 부족' 예시
  const NOISE_SOURCES = { pantry: 1, meeting: 0.9, entrance: 1, copy: 0.7, booth: 0.3 };

  // 자리별 실제 환경 경향 — 샘플 리뷰를 만들 때만 써요. 확률 배열은 단계 순서.
  function profileOf(seat) {
    const west = seat.windowSide === 'west' || seat.windowSide === 'corner';
    const p = {};

    // 온도 [추움, 적당, 따뜻, 더움]
    if (seat.acDirect) p.temp = [0.55, 0.32, 0.1, 0.03];
    else if (west) p.temp = [0.08, 0.37, 0.4, 0.15];
    else if (seat.windowSide === 'north') p.temp = [0.3, 0.52, 0.15, 0.03];
    else if (seat.type === 'partition') p.temp = [0.07, 0.43, 0.38, 0.12];
    else if (seat.dist.pantry <= 8) p.temp = [0.08, 0.47, 0.35, 0.1];
    else p.temp = [0.14, 0.58, 0.23, 0.05];

    // 소음 [조용, 보통, 시끄러움] — 탕비실·회의실·출입구·복사실에 가까울수록 시끄러워요
    let idx = 0;
    let loudest = 'entrance';
    let loudestPart = 0;
    Object.keys(NOISE_SOURCES).forEach((k) => {
      const part = NOISE_SOURCES[k] * Math.max(0, 1 - seat.dist[k] / 13);
      idx += part;
      if (part > loudestPart) { loudestPart = part; loudest = k; }
    });
    if (seat.type === 'partition') idx *= 0.5;
    const loud = Math.min(0.6, 0.03 + 0.6 * idx);
    const normal = Math.min(0.45, 0.18 + 0.35 * idx);
    p.noise = [1 - loud - normal, normal, loud];
    p.noiseSource = loudest;

    // 햇빛 [어두움, 적당, 눈부심]
    if (west) p.light = [0.02, 0.5, 0.48];
    else if (seat.windowSide === 'north') p.light = [0.05, 0.82, 0.13];
    else if (seat.type === 'partition') p.light = [0.3, 0.65, 0.05];
    else if (seat.col >= 2 && (seat.zone === 'C' || seat.zone === 'D')) p.light = [0.3, 0.64, 0.06];
    else p.light = [0.12, 0.78, 0.1];

    // 설비 [좋음, 불편·불량, 고장] — 샘플에는 고장을 넣지 않고 수리 요청 데이터로만 보여줘요
    p.chair = CHAIR_ISSUE[seat.id] || [0.9, 0.1, 0];
    p.monitor = MONITOR_ISSUE[seat.id] || [0.93, 0.07, 0];
    return p;
  }

  // 말투 가이드: 해요체, 짧게, 사람이 아니라 위치의 특성으로
  const TEXTS = {
    quiet: ['조용해서 집중이 잘 돼요.', '오가는 소리가 적어서 편했어요.'],
    quietFar: ['회의실이랑 멀어서 통화 소리가 거의 안 들려요.'],
    focusPod: ['칸막이가 있어서 화면에 집중하기 좋아요.'],
    loud_pantry: ['탕비실 옆이라 점심 전후로 조금 북적여요.'],
    loud_meeting: ['회의실 앞이라 오후에 소란스러워요.'],
    loud_entrance: ['출입구 쪽이라 오가는 소리가 자주 들려요.'],
    loud_copy: ['복사실이 가까워서 기계 소리가 가끔 들려요.'],
    loud_booth: ['통화부스 앞이라 문 여닫는 소리가 들려요.'],
    coldAc: ['오전엔 에어컨 바람이 세서 가디건 챙기면 좋아요.', '에어컨 바람이 바로 와서 조금 추웠어요.'],
    coldWindow: ['창가라 아침엔 조금 서늘해요.'],
    cold: ['아침엔 조금 서늘해요. 겉옷을 챙기면 좋아요.'],
    warmSun: ['오후엔 햇살이 들어와서 따뜻해요.'],
    warm: ['안쪽인데도 따뜻한 편이에요.'],
    hot: ['오후 늦게는 조금 더웠어요.'],
    glare: ['오후 3시쯤부터 햇빛이 모니터에 비쳐요. 블라인드 내리면 괜찮아요.', '해 질 녘엔 눈부셔서 블라인드가 필요해요.'],
    bright: ['창가인데 직사광선이 없어서 밝고 편해요.'],
    dark: ['안쪽이라 조금 어두워요. 스탠드가 있으면 좋겠어요.'],
    monitorBad: ['오른쪽 모니터가 가끔 깜빡였어요.', '모니터 색이 조금 누렇게 보여요.'],
    chairBad: ['의자 높이 조절이 잘 안 돼요.', '의자 등받이가 조금 헐거워요.'],
    outlets: ['콘센트가 하나라 멀티탭이 있으면 좋겠어요.'],
    generic: ['무난하게 쓰기 좋은 자리예요.', '모니터 높이가 잘 맞아서 오래 앉아도 편해요.', '동선이 편해서 자주 앉게 돼요.'],
  };

  function textFor(r, seat, prof, rand) {
    const west = seat.windowSide === 'west' || seat.windowSide === 'corner';
    let pool;
    if (r.monitor >= 1) pool = TEXTS.monitorBad;
    else if (r.chair >= 1) pool = TEXTS.chairBad;
    else if (r.temp === 0 && seat.acDirect) pool = TEXTS.coldAc;
    else if (r.light === 2) pool = TEXTS.glare;
    else if (r.noise === 2) pool = TEXTS['loud_' + prof.noiseSource];
    else if (r.noise === 0 && seat.type === 'partition') pool = TEXTS.focusPod;
    else if (r.noise === 0) pool = seat.dist.meeting > 20 ? TEXTS.quiet.concat(TEXTS.quietFar) : TEXTS.quiet;
    else if (r.light === 0) pool = TEXTS.dark;
    else if (r.temp === 0) pool = seat.type === 'window' ? TEXTS.coldWindow : TEXTS.cold;
    else if (r.temp === 2) pool = west ? TEXTS.warmSun : TEXTS.warm;
    else if (r.temp === 3) pool = TEXTS.hot;
    else if (seat.windowSide === 'north' && r.light === 1) pool = TEXTS.bright;
    else if (seat.outlets === 1) pool = TEXTS.outlets;
    else pool = TEXTS.generic;
    return pool[Math.floor(rand() * pool.length)];
  }

  function starsFor(r, rand) {
    let s = 4.4;
    if (r.noise === 2) s -= 1.1;
    else if (r.noise === 1) s -= 0.3;
    if (r.temp === 0 || r.temp === 3) s -= 0.6;
    if (r.light === 2) s -= 0.4;
    else if (r.light === 0) s -= 0.3;
    if (r.chair === 1) s -= 0.5;
    if (r.monitor === 1) s -= 0.6;
    s += (rand() - 0.5) * 1.2;
    return U.clamp(Math.round(s), 1, 5);
  }

  function tagsFor(r, seat, rand) {
    const west = seat.windowSide === 'west' || seat.windowSide === 'corner';
    const tags = [];
    if (r.noise === 0 && r.stars >= 4 && rand() < 0.55) tags.push('focus');
    if (seat.dual && r.monitor === 0 && rand() < 0.3) tags.push('dual');
    if (r.light === 1 && seat.type === 'window' && rand() < 0.45) tags.push('sunny');
    if (r.light === 2 && west && rand() < 0.7) tags.push('afternoonSun');
    if (r.temp === 0 && rand() < (seat.acDirect ? 0.75 : 0.08)) tags.push('acDirect');
    if (seat.outlets === 1 && rand() < 0.5) tags.push('fewOutlets');
    if (r.noise === 2 && rand() < 0.5) tags.push('busy');
    return tags;
  }

  function buildSeedReviews() {
    const out = [];
    SEATS.forEach((seat) => {
      const rand = U.rng('reviews-' + seat.id);
      const prof = profileOf(seat);
      const count = LOW_DATA[seat.id] != null ? LOW_DATA[seat.id] : 6 + Math.floor(rand() * 17);
      for (let i = 0; i < count; i++) {
        // 1~29일 전. 최근 리뷰가 조금 더 많게.
        const daysAgo = 1 + Math.floor(Math.pow(rand(), 1.25) * 29);
        // B05는 3일 전에 모니터를 고쳤어요. 그 전에는 불량 평가가 많았어요.
        const monitorP = seat.id === 'B05' ? (daysAgo > 3 ? [0.3, 0.7, 0] : [0.95, 0.05, 0]) : prof.monitor;
        const r = {
          id: `S-${seat.id}-${U.pad2(i)}`,
          seatId: seat.id,
          daysAgo,
          temp: U.pick(rand, prof.temp),
          noise: U.pick(rand, prof.noise),
          light: U.pick(rand, prof.light),
          chair: U.pick(rand, prof.chair),
          monitor: U.pick(rand, monitorP),
          dept: DEPTS[U.pick(rand, DEPT_WEIGHTS)],
          year: 1 + Math.floor(rand() * 12),
          checkIn: U.minutesToHM(8 * 60 + 20 + Math.floor(rand() * 80)),
          checkOut: U.minutesToHM(17 * 60 + 30 + Math.floor(rand() * 160)),
        };
        r.stars = starsFor(r, rand);
        r.tags = tagsFor(r, seat, rand);
        r.text = rand() < 0.5 ? textFor(r, seat, prof, rand) : '';
        out.push(r);
      }
    });
    return out;
  }

  const SEED_REVIEWS = buildSeedReviews();

  /* ---------- 수리 요청 (숫자는 며칠 전) ---------- */
  const SEED_TICKETS = [
    { id: 'R-1007', seatId: 'B05', item: 'monitor', kind: 'auto', summary: '모니터 불만 3건 자동 접수', mine: false, events: { received: 7, progress: 6, done: 3 } },
    { id: 'R-1011', seatId: 'D02', item: 'outlet', kind: 'report', summary: '콘센트 전원 불량', mine: true, events: { received: 4, progress: 3, done: 1 } },
    { id: 'R-1014', seatId: 'C04', item: 'monitor', kind: 'broken', summary: '모니터 화면이 켜지지 않음', mine: true, events: { received: 2, progress: 1 }, etaDays: 1 },
  ];

  /* ---------- 오늘 사용 중인 자리 ---------- */
  // 날짜를 시드로 정해서, 같은 날엔 누가 열어도 같아요.
  const OCCUPANCY = { A: 0.62, B: 0.55, C: 0.5, D: 0.58 };
  let occupancyCache = { key: null, set: null };
  const DEMO_SEAT = 'B07'; // 처음 열면 예약돼 있는 시연용 내 자리 (store.js)

  function occupiedToday() {
    const key = U.todayKey();
    if (occupancyCache.key !== key) {
      const rand = U.rng('occupancy-' + key);
      const used = new Set();
      SEATS.forEach((s) => { if (rand() < OCCUPANCY[s.zone]) used.add(s.id); });
      // 시연 첫 예약 자리는 다른 사람이 쓰는 자리로 뽑히지 않게 해요.
      // (뽑히면 내가 다른 자리로 옮긴 뒤 그 자리가 계속 '사용 중'으로 남아요)
      used.delete(DEMO_SEAT);
      occupancyCache = { key, set: used };
    }
    return occupancyCache.set;
  }

  // 샘플 리뷰 + 내가 남긴 리뷰. '본부 숨기기'를 켜면 내 리뷰는 연차만 보여요 (톤앤매너 6장)
  function reviews() {
    const hideDept = MD.state ? MD.state.settings().hideDept : false;
    const mine = (MD.state ? MD.state.myReviews() : []).map((r) =>
      Object.assign({}, r, { daysAgo: U.daysSince(r.date), mine: true, dept: hideDept ? null : r.dept }));
    return SEED_REVIEWS.concat(mine);
  }

  MD.data = {
    ME, FLOOR, LANDMARKS, ZONES, SEATS, TYPE_LABEL, LEVELS, CATEGORIES, CATEGORY_BY_ID, ITEMS, DEPTS, SEED_TICKETS,
    seat: (id) => SEAT_BY_ID[id],
    seatLabel: (id) => `${FLOOR.label} · ${id}`,
    reviews,
    occupiedToday,
    DEMO_SEAT,
  };
})();
