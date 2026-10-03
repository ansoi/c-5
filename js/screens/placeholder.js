/*
 * 아직 만들지 않은 화면 자리
 * 진짜 화면 파일(js/screens/*.js)을 이 파일 뒤에 불러오면 같은 이름으로 덮어써져요.
 */
(() => {
  'use strict';
  const MD = (window.MD = window.MD || {});
  MD.screens = MD.screens || {};
  const UI = MD.ui;

  const SOON = {
    map: { title: '자리 확인', desc: '17F 배치도 위에 추천 3석과 왕관을 보여 주고, 자리를 누르면 상세 정보를 띄울 화면이에요.' },
    seatReviews: { title: '좌석 리뷰', desc: '항목별 평가와 익명 리뷰를 한눈에 보는 화면이에요.' },
    reviewWrite: { title: '리뷰 남기기', desc: '이용을 마친 자리를 30초 안에 평가하는 화면이에요.' },
    reviews: { title: '리뷰', desc: '내가 남긴 리뷰를 모아 보는 화면이에요.' },
    alerts: { title: '알림', desc: '수리 요청 진행 상황과 알림을 보는 화면이에요.' },
    prefs: { title: '내 조건', desc: '업무 모드와 우선순위 1~3위를 정하는 화면이에요.' },
    my: { title: '마이', desc: '내 정보와 설정을 보는 화면이에요.' },
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
            ${key === 'my' ? '<button class="btn btn--ghost" type="button" data-action="reset">시연 데이터 초기화하기</button>' : ''}
          </section>`;
        if (key === 'my') {
          view.querySelector('[data-action="reset"]').addEventListener('click', () => {
            MD.state.reset();
            UI.toast('처음 상태로 되돌렸어요');
            location.hash = '#/';
          });
        }
      },
    };
  });
})();
