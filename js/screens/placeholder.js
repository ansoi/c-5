/*
 * 아직 만들지 않은 화면 자리
 * 진짜 화면 파일(js/screens/*.js)을 이 파일 뒤에 불러오면 같은 이름으로 덮어써져요.
 * 새 화면을 만들 때 여기에 먼저 자리를 만들어 두면, 주소를 눌러도 "만드는 중"이 보여요.
 */
(() => {
  'use strict';
  const MD = (window.MD = window.MD || {});
  MD.screens = MD.screens || {};
  const UI = MD.ui;

  const SOON = {
    admin: { title: '시설 담당자', desc: '불편·고장 신고를 우선순위대로 보고 처리 상태를 바꾸는 화면이에요. (톤앤매너 5장)' },
  };

  Object.keys(SOON).forEach((key) => {
    const info = SOON[key];
    MD.screens[key] = {
      title: info.title,
      placeholder: true,
      render(view) {
        view.innerHTML = `
          <section class="card soon">
            <span class="soon__badge">만드는 중</span>
            <h1 class="soon__title">${UI.esc(info.title)}</h1>
            <p class="soon__desc">${UI.esc(info.desc)}</p>
            <a class="btn btn--primary" href="#/">홈으로 가기</a>
          </section>`;
      },
    };
  });
})();
