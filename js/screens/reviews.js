/*
 * 리뷰 탭 — 아직 안 남긴 리뷰, 내가 남긴 리뷰, 17F 최근 리뷰
 */
(() => {
  'use strict';
  const MD = (window.MD = window.MD || {});
  MD.screens = MD.screens || {};
  const U = MD.util;
  const D = MD.data;
  const UI = MD.ui;
  const esc = UI.esc;

  // 오늘 이용했는데 리뷰를 안 남긴 자리
  function pending() {
    const s = MD.state.lastSession();
    if (s && !s.reviewed) return s;
    const my = MD.state.mySeat();
    if (my.status === 'done' && !my.reviewed) return { seatId: my.seatId, checkInAt: my.checkInAt, checkOutAt: my.checkOutAt };
    return null;
  }

  function stars(n) {
    return `<span class="mini-stars" aria-label="별점 ${n}점">${'★'.repeat(n)}<span class="mini-stars__off">${'★'.repeat(5 - n)}</span></span>`;
  }

  // 설비 문제 태그를 먼저 보여 줘요 (개수 제한에 잘리지 않게)
  function tagsOf(r) {
    const out = [];
    if (r.chair >= 1) out.push(`<span class="tag tag--${r.chair === 2 ? 'bad' : 'mid'}">의자 ${r.chair === 2 ? '고장' : '불편'}</span>`);
    if (r.monitor >= 1) out.push(`<span class="tag tag--${r.monitor === 2 ? 'bad' : 'mid'}">모니터 ${r.monitor === 2 ? '고장' : '불량'}</span>`);
    (r.tags || []).forEach((id) => out.push(`<span class="tag tag--brand">${esc(D.CATEGORY_BY_ID[id].label)}</span>`));
    ['noise', 'light', 'temp'].forEach((k) => { if (r[k] != null) out.push(`<span class="tag">${esc(D.LEVELS[k].answers[r[k]])}</span>`); });
    return out.slice(0, 5).join('');
  }

  function card(r, showAuthor) {
    return `
      <li class="review">
        <div class="review__meta">
          <a class="review__seat" href="#/seat/${r.seatId}/reviews">${esc(D.seatLabel(r.seatId))}${UI.icon('chevronRight')}</a>
          ${r.stars ? stars(r.stars) : ''}
          <span class="review__date">${U.fmtMonthDay(U.daysAgoDate(r.daysAgo))}</span>
        </div>
        ${showAuthor ? `<p class="review__by">${esc(r.dept || '본부 비공개')} · ${r.year}년차</p>` : ''}
        <div class="tags">${tagsOf(r)}</div>
        ${r.text ? `<p class="review__text">${esc(r.text)}</p>` : ''}
      </li>`;
  }

  function render(view) {
    const all = D.reviews();
    const hidden = new Set(MD.state.reported());
    const mine = all.filter((r) => r.mine).sort((a, b) => a.daysAgo - b.daysAgo || String(b.id).localeCompare(String(a.id)));
    const recent = all.filter((r) => !r.mine && r.text && !hidden.has(r.id))
      .sort((a, b) => a.daysAgo - b.daysAgo || (b.checkOut || '').localeCompare(a.checkOut || '')).slice(0, 6);
    const p = pending();

    view.innerHTML = `
      <div class="narrow myreviews">
        <div class="page-head">
          <div>
            <h1 class="page-title">리뷰</h1>
            <p class="page-sub">내가 남긴 리뷰는 다음 추천에 바로 반영돼요</p>
          </div>
        </div>
        ${p ? `
        <section class="pending">
          <span class="pending__icon">${UI.icon('pencil')}</span>
          <div class="pending__body">
            <p class="pending__title">${esc(D.seatLabel(p.seatId))} 리뷰를 아직 안 남겼어요</p>
            <p class="pending__sub">${p.checkInAt && p.checkOutAt ? `오늘 ${p.checkInAt} – ${p.checkOutAt} 이용 · ` : ''}30초면 끝나요</p>
          </div>
          <a class="btn btn--primary" href="#/review/${p.seatId}">리뷰 남기기</a>
        </section>` : ''}

        <section aria-labelledby="mine-title">
          <div class="section-title"><h2 id="mine-title">내가 남긴 리뷰 ${mine.length}</h2><span>익명으로 보여요</span></div>
          ${mine.length
            ? `<ul class="review-list">${mine.map((r) => card(r, true)).join('')}</ul>`
            : '<p class="empty card">아직 남긴 리뷰가 없어요. 자리를 이용한 뒤 30초면 남길 수 있어요.</p>'}
        </section>

        <section aria-labelledby="recent-title">
          <div class="section-title"><h2 id="recent-title">${D.FLOOR.label} 최근 리뷰</h2><span>동료들이 남겼어요</span></div>
          <ul class="review-list">${recent.map((r) => card(r, true)).join('')}</ul>
        </section>
      </div>`;
  }

  MD.screens.reviews = { title: '리뷰', render };
})();
