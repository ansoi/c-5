/*
 * 마이 — 내 정보, 내 조건, 익명 설정, 이용 기록, 시연 초기화
 */
(() => {
  'use strict';
  const MD = (window.MD = window.MD || {});
  MD.screens = MD.screens || {};
  const D = MD.data;
  const UI = MD.ui;
  const esc = UI.esc;

  function render(view) {
    const S = MD.score;
    const prefs = MD.state.prefs();
    const mode = S.MODES.find((m) => m.id === prefs.mode);
    const settings = MD.state.settings();
    const events = MD.state.events();
    const myTickets = MD.tickets.all().filter((t) => t.mine);
    const stats = [
      { label: '예약', value: events.filter((e) => e.type === 'booking').length },
      { label: '체크인', value: events.filter((e) => e.type === 'checkin').length },
      { label: '리뷰', value: MD.state.myReviews().length },
      { label: '수리 요청', value: myTickets.length },
    ];

    view.innerHTML = `
      <div class="narrow my">
        <div class="page-head"><h1 class="page-title">마이</h1></div>

        <section class="card profile">
          <span class="profile__avatar" aria-hidden="true">${esc(D.ME.name.slice(0, 1))}</span>
          <div>
            <p class="profile__name">${esc(D.ME.name)} 님</p>
            <p class="profile__meta">${esc(D.ME.dept)} · ${D.ME.year}년차</p>
          </div>
        </section>

        <section class="card my__card" aria-labelledby="my-prefs">
          <div class="my__head">
            <h2 class="sr-h" id="my-prefs">내 조건</h2>
            <a class="text-btn" href="#/prefs">조건 바꾸기${UI.icon('chevronRight')}</a>
          </div>
          <ul class="chips">
            <li class="chip chip--mode">${esc(mode.label)} 모드</li>
            ${prefs.priorities.map((id, i) => `<li class="chip"><span class="chip__num" aria-label="${i + 1}순위">${i + 1}</span>${esc(S.COND_BY_ID[id].label)}</li>`).join('')}
          </ul>
        </section>

        <section class="card my__card" aria-labelledby="my-anon">
          <h2 class="sr-h" id="my-anon">익명 설정</h2>
          <div class="setting">
            <div>
              <p class="setting__title" id="hide-dept-label">리뷰에 본부 이름 숨기기</p>
              <p class="setting__desc">인원이 적은 본부라면 켜 두세요. 리뷰에 연차만 보여요. 이름과 사번은 원래 보이지 않아요.</p>
            </div>
            <button type="button" class="switch" role="switch" aria-checked="${settings.hideDept}" aria-labelledby="hide-dept-label" data-action="hide-dept"></button>
          </div>
        </section>

        <section class="card my__card" aria-labelledby="my-stats">
          <h2 class="sr-h" id="my-stats">내 기록</h2>
          <ul class="stats">${stats.map((x) => `<li><strong>${x.value}</strong><span>${x.label}</span></li>`).join('')}</ul>
        </section>

        <section class="card my__card" aria-labelledby="my-demo">
          <h2 class="sr-h" id="my-demo">시연 안내</h2>
          <p class="my__note">명당은 사내 공모 시연용 앱이에요. 도면과 동료 리뷰는 모두 가상 데이터예요. 내가 남긴 리뷰·예약·체크인은 이 브라우저에만 저장돼요.</p>
          <button type="button" class="btn btn--secondary" data-action="reset">${UI.icon('reset')}시연 데이터 초기화하기</button>
        </section>
      </div>`;

    view.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      if (btn.dataset.action === 'hide-dept') {
        const next = btn.getAttribute('aria-checked') !== 'true';
        MD.state.setSettings({ hideDept: next });
        btn.setAttribute('aria-checked', String(next));
        UI.toast(next ? '이제 리뷰에 연차만 보여요' : '리뷰에 본부와 연차가 보여요');
      } else if (btn.dataset.action === 'reset') {
        const ok = await UI.confirm({
          title: '시연 데이터를 초기화할까요?',
          body: '내가 남긴 리뷰, 예약, 체크인, 조건, 설정이 모두 처음 상태로 돌아가요.',
          confirm: '초기화하기',
          cancel: '취소',
        });
        if (!ok) return;
        MD.state.reset();
        location.hash = '#/';
        UI.toast('처음 상태로 되돌렸어요');
      }
    });
  }

  MD.screens.my = { title: '마이', render };
})();
