/*
 * 리뷰 남기기 — 이용을 마친 자리를 30초 안에 평가해요
 * 기획서 보조 기능 1 "별점 1개 + 주요 항목 탭", 톤앤매너 1장 "별점, 카테고리, 고장 신고"
 * 기준 시안: 초록 04(5초 리뷰), 주황 '리뷰 남기기'
 * 고장은 바로 접수, 불편·불량은 7일 안에 3건이면 자동 접수 (js/tickets.js)
 */
(() => {
  'use strict';
  const MD = (window.MD = window.MD || {});
  MD.screens = MD.screens || {};
  const U = MD.util;
  const D = MD.data;
  const UI = MD.ui;
  const esc = UI.esc;

  const QUESTIONS = [
    { key: 'temp', icon: 'thermometer' },
    { key: 'noise', icon: 'volume' },
    { key: 'light', icon: 'sun' },
    { key: 'chair', icon: 'armchair' },
    { key: 'monitor', icon: 'monitor' },
  ];
  const STAR_TEXT = ['', '별로였어요', '아쉬웠어요', '보통이에요', '좋았어요', '아주 좋았어요'];
  const MAX_TEXT = 80;

  const toMinutes = (hm) => { const [h, m] = hm.split(':').map(Number); return h * 60 + m; };
  function duration(from, to) {
    if (!from || !to) return '';
    const mins = Math.max(0, toMinutes(to) - toMinutes(from));
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h ? `${h}시간${m ? ` ${m}분` : ''}` : `${m}분`;
  }

  function sessionFor(seatId) {
    const s = MD.state.lastSession();
    if (s && s.seatId === seatId) return s;
    const my = MD.state.mySeat();
    if (my.seatId === seatId && my.status === 'done') return { seatId, checkInAt: my.checkInAt, checkOutAt: my.checkOutAt, reason: 'checkout' };
    return null;
  }

  function headHTML(seatId, session) {
    const label = esc(D.seatLabel(seatId));
    if (!session) {
      return `
        <div class="session">
          <span class="session__icon session__icon--plain">${UI.icon('pencil')}</span>
          <div><p class="session__title">${label} 리뷰 남기기</p><p class="session__sub">이 자리를 써 봤다면 30초면 남길 수 있어요</p></div>
        </div>`;
    }
    const time = session.checkInAt && session.checkOutAt
      ? `오늘 ${session.checkInAt} – ${session.checkOutAt} · ${duration(session.checkInAt, session.checkOutAt)}`
      : '오늘 이용';
    const title = session.reason === 'move' ? `${label} 자리를 옮겼어요` : `${label} 이용을 마쳤어요`;
    return `
      <div class="session">
        <span class="session__icon">${UI.icon('check')}</span>
        <div><p class="session__title">${title}</p><p class="session__sub">${esc(time)}</p></div>
      </div>`;
  }

  function questionHTML(q) {
    const level = D.LEVELS[q.key];
    const opts = level.answers.map((a, i) => {
      const tone = (q.key === 'chair' || q.key === 'monitor') && i > 0 ? (i === 1 ? ' option--warn' : ' option--bad') : '';
      return `<button type="button" class="option${tone}" data-q="${q.key}" data-v="${i}" aria-pressed="false">${esc(a)}</button>`;
    }).join('');
    return `
      <div class="question" role="group" aria-labelledby="q-${q.key}">
        <span class="question__label" id="q-${q.key}">${UI.icon(q.icon)}${level.label}</span>
        <div class="options">${opts}</div>
      </div>`;
  }

  function render(view, ctx) {
    const seatId = ctx.params[0];
    if (!D.seat(seatId)) {
      view.innerHTML = '<section class="card soon"><h1 class="soon__title">자리를 찾지 못했어요</h1><p class="soon__desc">주소를 다시 확인해 주세요.</p><a class="btn btn--primary" href="#/">홈으로 가기</a></section>';
      return;
    }
    const session = sessionFor(seatId);
    const settings = MD.state.settings();
    const answers = { stars: null, temp: null, noise: null, light: null, chair: null, monitor: null, tags: [], text: '' };
    const already = MD.state.myReviews().some((r) => r.seatId === seatId && r.date === U.todayKey());

    view.innerHTML = `
      <div class="narrow write">
        <div class="write__top">${UI.back('#/', '뒤로')}</div>
        ${headHTML(seatId, session)}

        <div class="write__intro">
          <div>
            <h1 class="page-title">오늘 이 자리 어떠셨나요?</h1>
            <p class="page-sub">탭 몇 번이면 끝나요 · 30초</p>
          </div>
          <span class="write__progress" data-slot="progress" aria-live="polite"></span>
        </div>
        ${already ? `<div class="notice">${UI.icon('info')}<div><strong>오늘 이 자리 리뷰를 이미 남겼어요</strong><span>한 번 더 남기면 리뷰가 한 건 더 쌓여요.</span></div></div>` : ''}

        <section class="card write__card" aria-labelledby="stars-label">
          <div class="question">
            <span class="question__label" id="stars-label">${UI.icon('star')}별점 <em class="question__req">필수</em></span>
            <div class="stars-row">
              <div class="stars-input" role="group" aria-labelledby="stars-label">
                ${[1, 2, 3, 4, 5].map((n) => `<button type="button" class="star-btn" data-star="${n}" aria-label="${n}점" aria-pressed="false">${UI.icon('star')}</button>`).join('')}
              </div>
              <span class="stars-row__text" data-slot="star-text">별을 눌러 주세요</span>
            </div>
          </div>
        </section>

        <section class="card write__card" aria-label="항목별 평가">
          ${QUESTIONS.map(questionHTML).join('')}
          <div data-slot="equip-notice"></div>
        </section>

        <section class="card write__card" aria-labelledby="cat-label">
          <p class="question__label" id="cat-label">이 자리를 한마디로 <span class="question__opt">여러 개 골라도 돼요</span></p>
          <div class="pick-chips">
            ${D.CATEGORIES.map((c) => `<button type="button" class="pick-chip" data-tag="${c.id}" aria-pressed="false">${esc(c.label)}</button>`).join('')}
          </div>
        </section>

        <section class="card write__card">
          <label class="question__label" for="review-text">한 줄 리뷰 <span class="question__opt">선택</span></label>
          <textarea id="review-text" class="textarea" rows="2" maxlength="${MAX_TEXT}" placeholder="예: 오후엔 블라인드를 내리면 딱 좋아요"></textarea>
          <div class="textarea__foot"><span>자리 환경에 대한 내용만 남겨 주세요. 특정인에 대한 내용은 쓰지 않아요.</span><span data-slot="count">0/${MAX_TEXT}</span></div>
        </section>

        <p class="write__anon">${UI.icon('info')}<span>작성자 이름은 공개되지 않고 ${settings.hideDept ? '연차만' : '소속 본부·연차만'} 보여요</span></p>
        <div class="write__actions">
          <button type="button" class="btn btn--primary btn--block" data-action="submit" disabled>익명으로 등록</button>
          <a class="btn btn--ghost btn--block" href="#/">다음에 할게요</a>
        </div>
      </div>`;

    const $ = (sel) => view.querySelector(sel);

    function refresh() {
      const answered = ['stars', 'temp', 'noise', 'light', 'chair', 'monitor'].filter((k) => answers[k] != null).length;
      $('[data-slot="progress"]').textContent = `답한 항목 ${answered}/6`;
      $('[data-slot="star-text"]').textContent = answers.stars ? `${answers.stars}점 · ${STAR_TEXT[answers.stars]}` : '별을 눌러 주세요';
      view.querySelectorAll('[data-star]').forEach((b) => {
        const n = Number(b.dataset.star);
        b.classList.toggle('is-on', answers.stars != null && n <= answers.stars);
        b.setAttribute('aria-pressed', String(answers.stars === n));
      });
      view.querySelectorAll('[data-q]').forEach((b) => {
        b.setAttribute('aria-pressed', String(answers[b.dataset.q] === Number(b.dataset.v)));
      });
      $('[data-slot="equip-notice"]').innerHTML = equipNotice();
      const submit = $('[data-action="submit"]');
      submit.disabled = answers.stars == null;
      submit.textContent = answers.stars == null ? '별점을 먼저 골라 주세요' : '익명으로 등록';
    }

    // 설비에 불만을 고르면 수리 요청이 어떻게 되는지 바로 알려 줘요
    function equipNotice() {
      return ['chair', 'monitor'].map((item) => {
        const v = answers[item];
        if (v == null || v === 0) return '';
        const name = D.ITEMS[item];
        const st = MD.tickets.complaintStatus(seatId, item);
        let tone = '';
        let title;
        let desc;
        if (st.open) {
          tone = 'mid';
          title = `${name}는 이미 수리 접수돼 있어요`;
          desc = '처리되면 알림으로 알려 드릴게요.';
        } else if (v === 2) {
          tone = 'bad';
          title = `'${name} 고장'은 총무팀에 바로 접수돼요`;
          desc = '따로 신고하지 않아도 돼요. 수리가 끝날 때까지 이 자리는 추천에서 빠져요.';
        } else {
          const n = st.count + 1;
          if (n >= MD.tickets.AUTO_COUNT) {
            tone = 'mid';
            title = `${name} 불만이 7일 안에 ${n}건이 돼서 자동 접수돼요`;
            desc = '따로 신고하지 않아도 돼요. 처리되면 알림으로 알려 드릴게요.';
          } else {
            title = `같은 불만이 7일 안에 ${MD.tickets.AUTO_COUNT}건 모이면 자동 접수돼요`;
            desc = `이 리뷰까지 이 자리 ${name} 불만은 ${n}건이에요.`;
          }
        }
        return `<div class="notice${tone ? ` notice--${tone}` : ''}">${UI.icon('wrench')}<div><strong>${esc(title)}</strong><span>${esc(desc)}</span></div></div>`;
      }).join('');
    }

    view.addEventListener('click', (e) => {
      const star = e.target.closest('[data-star]');
      if (star) { answers.stars = Number(star.dataset.star); refresh(); return; }
      const opt = e.target.closest('[data-q]');
      if (opt) {
        const v = Number(opt.dataset.v);
        answers[opt.dataset.q] = answers[opt.dataset.q] === v ? null : v; // 다시 누르면 선택 취소
        refresh();
        return;
      }
      const tag = e.target.closest('[data-tag]');
      if (tag) {
        const id = tag.dataset.tag;
        answers.tags = answers.tags.includes(id) ? answers.tags.filter((t) => t !== id) : answers.tags.concat(id);
        tag.setAttribute('aria-pressed', String(answers.tags.includes(id)));
        return;
      }
      if (e.target.closest('[data-action="submit"]')) submit();
    });

    const textarea = $('#review-text');
    textarea.addEventListener('input', () => {
      $('[data-slot="count"]').textContent = `${textarea.value.length}/${MAX_TEXT}`;
    });

    function submit() {
      if (answers.stars == null) return;
      answers.text = textarea.value.replace(/\s+/g, ' ').trim().slice(0, MAX_TEXT);
      const result = MD.actions.submitReview(seatId, answers);
      const broken = result.newTickets.find((t) => t.kind === 'broken');
      const auto = result.newTickets.find((t) => t.kind === 'auto');
      const { before, after } = result;
      const comparable = (e) => e.state === 'free' || e.state === 'mine'; // 추천에 들어가는 자리만 숫자를 비교해요
      let message;
      if (broken || after.state === 'repair') {
        const item = broken ? D.ITEMS[broken.item] : '설비';
        message = `리뷰를 등록했어요. ${item} 고장을 접수해서 ${D.seatLabel(seatId)} 자리는 수리 중으로 바뀌었어요`;
      } else if (auto) {
        message = `리뷰를 등록했어요. ${D.ITEMS[auto.item]} 불만이 모여 자동 접수했어요 · 취향 일치도 ${MD.score.PENALTY}점 감점`;
      } else if (comparable(before) && comparable(after) && before.score !== after.score) {
        message = `리뷰를 반영했어요 · ${D.seatLabel(seatId)} 취향 일치도 ${before.score}% → ${after.score}%`;
      } else message = '리뷰를 등록했어요. 다음 추천에 바로 반영했어요';
      location.hash = '#/';
      UI.toast(message);
    }

    refresh();
  }

  MD.screens.reviewWrite = { title: '리뷰 남기기', render };
})();
