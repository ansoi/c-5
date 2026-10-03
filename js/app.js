/*
 * 화면 전환 — 주소의 # 뒤를 보고 화면을 골라 그려요
 * 화면 추가: js/screens/새화면.js 에서 MD.screens.이름 = { title, render(view, ctx) } 를 만들고,
 *           아래 ROUTES에 주소를 연결한 뒤 index.html에 <script>를 추가해요.
 */
(() => {
  'use strict';
  const MD = (window.MD = window.MD || {});
  MD.screens = MD.screens || {};

  const SEAT = '([A-D]\\d{2})';
  const ROUTES = [
    { re: /^\/?$/, screen: 'home', tab: 'home' },
    { re: /^\/map$/, screen: 'map', tab: 'map' }, // ?seat=A03 이면 그 자리 상세를 띄워요
    { re: new RegExp(`^/seat/${SEAT}/reviews$`), screen: 'seatReviews', tab: 'map' },
    { re: new RegExp(`^/review/${SEAT}$`), screen: 'reviewWrite', tab: 'reviews' },
    { re: /^\/reviews$/, screen: 'reviews', tab: 'reviews' },
    { re: /^\/alerts$/, screen: 'alerts', tab: null },
    { re: /^\/prefs$/, screen: 'prefs', tab: 'my' },
    { re: /^\/my$/, screen: 'my', tab: 'my' },
  ];

  function parse() {
    const raw = location.hash.replace(/^#/, '') || '/';
    const [path, qs] = raw.split('?');
    return { path, query: new URLSearchParams(qs || '') };
  }

  // 내 수리 요청에 어제·오늘 소식이 있고 아직 알림을 안 봤으면 종에 점을 찍어요
  function updateBell() {
    const dot = document.querySelector('[data-bell-dot]');
    if (!dot) return;
    const fresh = MD.tickets.all().some((t) => t.mine && Object.keys(t.events).some((k) => t.events[k] <= 1));
    dot.hidden = !(fresh && MD.store.get('alertsSeen', null) !== MD.util.todayKey());
  }

  let firstRender = true;
  function render(opts) {
    const keepScroll = opts && opts.keepScroll;
    const { path, query } = parse();
    let route = null;
    let params = [];
    for (const r of ROUTES) {
      const m = path.match(r.re);
      if (m) { route = r; params = m.slice(1); break; }
    }
    if (!route) { location.replace('#/'); return; }

    const screen = MD.screens[route.screen];
    const root = document.getElementById('app');
    const view = document.createElement('div');
    view.className = 'screen';
    try {
      screen.render(view, { params, query });
    } catch (err) {
      console.error(err);
      view.innerHTML = `
        <section class="card soon">
          <h1 class="soon__title">화면을 불러오지 못했어요</h1>
          <p class="soon__desc">새로고침해 주세요. 계속 안 되면 홈에서 다시 시작해 주세요.</p>
          <a class="btn btn--primary" href="#/">홈으로 가기</a>
        </section>`;
    }
    root.replaceChildren(view);

    document.querySelectorAll('[data-tab]').forEach((a) => {
      if (a.dataset.tab === route.tab) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    document.title = route.screen === 'home' ? '명당 · 오늘 나에게 맞는 자리' : `${screen.title} · 명당`;
    if (!firstRender && !keepScroll) {
      window.scrollTo(0, 0);
      root.focus({ preventScroll: true });
    }
    firstRender = false;
    updateBell();
  }

  function boot() {
    document.querySelectorAll('[data-icon]').forEach((el) => {
      el.insertAdjacentHTML('afterbegin', MD.ui.icon(el.dataset.icon));
    });
    window.addEventListener('hashchange', () => render());
    render();
  }

  MD.app = { refresh: render };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
