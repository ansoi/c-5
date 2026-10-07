/*
 * 좌석 리뷰 — 한눈에 보기 / 날짜별 보기
 * 기준 시안: 초록 03(리뷰 보기), 주황 '17F · A03 리뷰'
 * 리뷰 요약은 AI가 아니라 리뷰 집계로 만들어요 (API 키 없이, 개발명세 2장)
 * 작성자는 이름 없이 본부·연차만 보여요 (톤앤매너 6장)
 */
(() => {
  'use strict';
  const MD = (window.MD = window.MD || {});
  MD.screens = MD.screens || {};
  const U = MD.util;
  const D = MD.data;
  const UI = MD.ui;
  const esc = UI.esc;

  const ITEMS = [
    { key: 'temp', icon: 'thermometer', title: '온도', tones: ['t0', 't1', 't2', 't3'], verdict: ['추운 편이에요', '적당해요', '따뜻한 편이에요', '더운 편이에요'] },
    { key: 'noise', icon: 'volume', title: '소음', tones: ['ok', 'mid', 'bad'], verdict: ['조용해요', '보통이에요', '시끄러운 편이에요'] },
    { key: 'light', icon: 'sun', title: '햇빛', tones: ['dark', 'ok', 'glare'], verdict: ['어두운 편이에요', '적당해요', '눈부신 편이에요'] },
    { key: 'chair', icon: 'armchair', title: '의자', tones: ['ok', 'mid', 'bad'], verdict: ['좋아요', '불편하다는 평가가 있어요', '고장 신고가 있어요'] },
    { key: 'monitor', icon: 'monitor', title: '모니터', tones: ['ok', 'mid', 'bad'], verdict: ['좋아요', '불량 평가가 있어요', '고장 신고가 있어요'] },
  ];
  const TYPE_TEXT = { center: '중앙 자리', window: '창가 자리', wall: '벽면 자리', partition: '칸막이 자리' };
  const PAGE = 5;

  function levelIndex(key, mean) {
    if (mean == null) return null;
    if (key === 'temp') return U.clamp(Math.round(mean), 0, 3);
    if (key === 'noise') return mean < 0.5 ? 0 : mean < 1.1 ? 1 : 2;
    if (key === 'light') return mean < 0.55 ? 0 : mean < 1.35 ? 1 : 2;
    return mean < 0.35 ? 0 : mean < 1.2 ? 1 : 2;
  }

  const dateText = (daysAgo) => U.fmtMonthDay(U.daysAgoDate(daysAgo));

  function author(r) {
    return `<span class="review__dept">${esc(r.dept || '본부 비공개')}</span><span>· ${r.year}년차</span>`;
  }

  // 설비 문제 → 카테고리 → 소음·햇빛 → 온도 순서로, 최대 5개
  function reviewTags(r) {
    const tags = [];
    if (r.chair === 1) tags.push({ text: '의자 불편', tone: 'mid' });
    if (r.chair === 2) tags.push({ text: '의자 고장', tone: 'bad' });
    if (r.monitor === 1) tags.push({ text: '모니터 불량', tone: 'mid' });
    if (r.monitor === 2) tags.push({ text: '모니터 고장', tone: 'bad' });
    (r.tags || []).forEach((id) => tags.push({ text: D.CATEGORY_BY_ID[id] ? D.CATEGORY_BY_ID[id].label : id, tone: 'brand' }));
    if (r.noise === 0) tags.push({ text: '조용해요', tone: 'ok' });
    if (r.noise === 2) tags.push({ text: '시끄러워요', tone: 'mid' });
    if (r.light === 0) tags.push({ text: '어두워요', tone: '' });
    if (r.light === 2) tags.push({ text: '눈부셔요', tone: 'mid' });
    if (r.temp != null) tags.push({ text: D.LEVELS.temp.answers[r.temp], tone: '' });
    return tags.slice(0, 5).map((t) => `<span class="tag${t.tone ? ` tag--${t.tone}` : ''}">${esc(t.text)}</span>`).join('');
  }

  function reviewCard(r, opts) {
    const when = opts && opts.daily ? (r.checkOut ? `${r.checkOut} 퇴실` : '') : dateText(r.daysAgo);
    return `
      <li class="review">
        <div class="review__meta">
          ${author(r)}${when ? `<span>· ${esc(when)}</span>` : ''}${r.mine ? UI.pill('내 리뷰', 'brand') : ''}
          ${r.mine ? '' : `<button type="button" class="review__report" data-report="${esc(r.id)}">${UI.icon('flag')}신고</button>`}
        </div>
        <div class="tags">${reviewTags(r)}</div>
        ${r.text ? `<p class="review__text">${esc(r.text)}</p>` : ''}
      </li>`;
  }

  /* ---------- 한눈에 보기 ---------- */
  function itemsHTML(entry, seatTickets) {
    const rows = ITEMS.map((it) => {
      const st = entry.stats[it.key];
      const total = st.counts.reduce((a, b) => a + b, 0);
      const idx = levelIndex(it.key, st.mean);
      const answers = D.LEVELS[it.key].answers;
      const bar = total
        ? st.counts.map((c, i) => (c ? `<span class="seg seg--${it.tones[i]}" style="flex:${c}"></span>` : '')).join('')
        : '<span class="seg seg--none" style="flex:1"></span>';
      const legend = answers.map((a, i) => `<li><span class="dot seg--${it.tones[i]}"></span>${esc(a)} ${st.counts[i]}</li>`).join('');
      let extra = '';
      let verdict = total ? it.verdict[idx] : '아직 평가가 없어요';
      if (it.key === 'chair' || it.key === 'monitor') {
        const list = seatTickets.filter((t) => t.item === it.key);
        const open = list.find((t) => MD.tickets.status(t) !== 'done');
        if (open) verdict = open.kind === 'broken' ? '고장 신고가 접수됐어요' : '불만이 모여 접수됐어요';
        const done = list.filter((t) => MD.tickets.status(t) === 'done').sort((a, b) => a.events.done - b.events.done)[0];
        if (open) extra = `<p class="item__ticket item__ticket--open">${UI.icon('wrench')}${esc(open.summary)} · ${MD.tickets.STATUS_LABEL[MD.tickets.status(open)]}</p>`;
        else if (done && done.events.done < MD.score.WINDOW_DAYS) extra = `<p class="item__ticket">${UI.icon('check')}${esc(done.summary)} → ${dateText(done.events.done)} 수리 완료 · 수리 후 평가만 집계해요</p>`;
      }
      return `
        <li class="item">
          <div class="item__head">
            <span class="item__title">${UI.icon(it.icon)}${it.title}</span>
            <strong class="item__verdict">${esc(verdict)}</strong>
          </div>
          <div class="bar" aria-hidden="true">${bar}</div>
          <ul class="bar-legend">${legend}</ul>
          ${extra}
        </li>`;
    }).join('');
    return `
      <ul class="items">${rows}
        <li class="item item--fixed">
          <div class="item__head">
            <span class="item__title"><span class="fact__wc" aria-hidden="true">WC</span>화장실 거리</span>
            <strong class="item__verdict">${entry.seat.dist.wc}m</strong>
          </div>
          <p class="item__note">통로를 따라 걷는 거리 · 좌석 고정 정보</p>
        </li>
      </ul>`;
  }

  // 리뷰 집계로 만든 요약 (최대 3줄). 2명 이상 같은 평가가 있을 때만 말해요 (근거 없는 과장 금지)
  function summaryLines(entry, reviews) {
    const lines = [];
    if (entry.lowData) lines.push(`아직 평가가 ${reviews.length}건뿐이라 층 평균을 함께 반영했어요.`);
    const st = entry.stats;
    const tagCount = {};
    reviews.forEach((r) => (r.tags || []).forEach((t) => { tagCount[t] = (tagCount[t] || 0) + 1; }));
    const topTag = Object.keys(tagCount).sort((a, b) => tagCount[b] - tagCount[a])[0];
    if (topTag && tagCount[topTag] >= 2) lines.push(`가장 많이 고른 말은 '${D.CATEGORY_BY_ID[topTag].label}'이에요 (${tagCount[topTag]}명).`);

    const count = (key, i) => st[key].counts[i];
    const share = (key, i) => { const t = st[key].counts.reduce((a, b) => a + b, 0); return t ? count(key, i) / t : 0; };
    const enough = (key, i, ratio) => count(key, i) >= 2 && share(key, i) >= ratio;
    if (enough('noise', 0, 0.6)) lines.push(`조용하다는 평가가 많아요 (${st.noise.n}명 중 ${count('noise', 0)}명).`);
    else if (enough('noise', 2, 0.25)) lines.push(`시끄럽다는 평가가 ${count('noise', 2)}명이에요. 통화가 많다면 다른 자리도 같이 보세요.`);
    if (enough('temp', 0, 0.3)) lines.push(`서늘하다는 평가가 ${count('temp', 0)}명이에요. 겉옷을 챙기면 좋아요.`);
    else if (count('temp', 2) + count('temp', 3) >= 2 && share('temp', 2) + share('temp', 3) >= 0.45) lines.push('따뜻한 편이라는 평가가 많아요.');
    if (enough('light', 2, 0.3)) lines.push(`햇빛이 강하다는 평가가 ${count('light', 2)}명이에요. 블라인드를 쓰면 좋아요.`);
    else if (enough('light', 0, 0.3)) lines.push(`조금 어둡다는 평가가 ${count('light', 0)}명이에요.`);
    ['chair', 'monitor'].forEach((item) => {
      const recent = reviews.filter((r) => r[item] != null && r[item] >= 1 && r.daysAgo < MD.tickets.AUTO_DAYS).length;
      if (recent) lines.push(`최근 7일 ${D.ITEMS[item]} 불만이 ${recent}건 있어요.`);
    });
    return lines.slice(0, 3);
  }

  function summaryHTML(entry, reviews, state) {
    const stars = entry.stars != null ? entry.stars.toFixed(1) : '–';
    const week = reviews.filter((r) => r.daysAgo < 7).length;
    const latest = reviews.length ? Math.min(...reviews.map((r) => r.daysAgo)) : null;
    const tagCount = {};
    reviews.forEach((r) => (r.tags || []).forEach((t) => { tagCount[t] = (tagCount[t] || 0) + 1; }));
    const cats = D.CATEGORIES.slice().sort((a, b) => (tagCount[b.id] || 0) - (tagCount[a.id] || 0)).map((c) => `
      <li class="cat${tagCount[c.id] ? '' : ' cat--zero'}"><span>${esc(c.label)}</span><strong>${tagCount[c.id] || 0}명</strong></li>`).join('');

    const lines = summaryLines(entry, reviews);
    const withText = reviews.filter((r) => r.text);
    const filtered = state.cat ? withText.filter((r) => (r.tags || []).includes(state.cat)) : withText;
    const shown = state.all ? filtered : filtered.slice(0, PAGE);
    const filterChips = [`<button type="button" class="pick-chip" data-cat="" data-focus="cat-all" aria-pressed="${!state.cat}">전체 <span class="pick-chip__count">${withText.length}</span></button>`]
      .concat(D.CATEGORIES.filter((c) => withText.some((r) => (r.tags || []).includes(c.id))).map((c) => {
        const n = withText.filter((r) => (r.tags || []).includes(c.id)).length;
        return `<button type="button" class="pick-chip" data-cat="${c.id}" data-focus="cat-${c.id}" aria-pressed="${state.cat === c.id}">${esc(c.label)} <span class="pick-chip__count">${n}</span></button>`;
      })).join('');

    return `
      <section class="card sr-card">
        <div class="sr-score">
          <strong class="sr-score__value"><span class="star-text" aria-hidden="true">★</span> ${stars}</strong>
          <div>
            <p class="sr-score__title">동료 ${reviews.length}명이 평가했어요</p>
            <p class="sr-score__sub"><span class="nowrap">최근 30일</span> · <span class="nowrap">이번 주 ${week}건</span>${latest != null ? ` · <span class="nowrap">최근 리뷰 ${dateText(latest)}</span>` : ''}</p>
          </div>
        </div>
        <h2 class="sr-h">이 자리를 한마디로</h2>
        <ul class="cats">${cats}</ul>
      </section>

      <section class="card sr-card" aria-labelledby="items-title">
        <h2 class="sr-h" id="items-title">항목별 평가<span>최근 30일</span></h2>
        ${itemsHTML(entry, state.tickets)}
      </section>

      ${lines.length ? `
      <section class="card sr-card sr-summary" aria-labelledby="sum-title">
        <h2 class="sr-h" id="sum-title">리뷰 요약<span>리뷰 ${reviews.length}건 기준</span></h2>
        <ul class="sr-summary__list">${lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
        <p class="sr-summary__note">동료 리뷰를 집계해서 정리했어요.</p>
      </section>` : ''}

      <section aria-labelledby="list-title">
        <div class="section-title"><h2 id="list-title">리뷰 ${withText.length}</h2><span>최신순</span></div>
        <div class="notice">${UI.icon('info')}<span>자리 환경에 대한 리뷰만 남길 수 있어요. 특정인에 대한 내용은 신고해 주세요.</span></div>
        ${withText.length ? `<div class="pick-chips sr-filter">${filterChips}</div>` : ''}
        ${shown.length ? `<ul class="review-list">${shown.map((r) => reviewCard(r)).join('')}</ul>` : '<p class="empty">아직 리뷰가 없는 자리예요. 첫 리뷰를 남겨 주세요.</p>'}
        ${!state.all && filtered.length > PAGE ? `<button type="button" class="btn btn--secondary btn--block sr-more" data-action="more">리뷰 ${filtered.length - PAGE}개 더 보기</button>` : ''}
      </section>`;
  }

  /* ---------- 날짜별 보기 ---------- */
  function dailyHTML(reviews, state) {
    const days = [];
    for (let i = 6; i >= 0; i--) days.push(i);
    const byDay = (d) => reviews.filter((r) => r.daysAgo === d);
    if (state.day == null) {
      const withReviews = days.filter((d) => byDay(d).length).sort((a, b) => a - b);
      state.day = withReviews.length ? withReviews[0] : 0;
    }
    const chips = days.map((d) => {
      const date = U.daysAgoDate(d);
      const n = byDay(d).length;
      return `
        <button type="button" class="day${n ? '' : ' day--zero'}" data-day="${d}" data-focus="day-${d}" aria-pressed="${state.day === d}">
          <span class="day__wd">${U.weekday(date)}</span>
          <span class="day__date">${U.fmtDot(date)}</span>
          <span class="day__n">${n}건</span>
        </button>`;
    }).join('');

    const list = byDay(state.day).sort((a, b) => (b.checkOut || '').localeCompare(a.checkOut || ''));
    const words = {};
    list.forEach((r) => {
      (r.tags || []).forEach((t) => { const k = D.CATEGORY_BY_ID[t].label; words[k] = (words[k] || 0) + 1; });
      if (r.temp != null) { const k = D.LEVELS.temp.answers[r.temp]; words[k] = (words[k] || 0) + 1; }
      if (r.noise === 0) words['조용해요'] = (words['조용해요'] || 0) + 1;
    });
    const top = Object.keys(words).sort((a, b) => words[b] - words[a]).slice(0, 2).filter((k) => words[k] >= 1);
    const depts = {};
    list.forEach((r) => { const k = r.dept || '본부 비공개'; depts[k] = (depts[k] || 0) + 1; });
    const shown = state.dept ? list.filter((r) => (r.dept || '본부 비공개') === state.dept) : list;
    const date = U.daysAgoDate(state.day);

    return `
      <div class="days" role="group" aria-label="날짜 고르기">${chips}</div>
      <section class="card sr-card">
        <h2 class="sr-h">${U.fmtMonthDay(date)}(${U.weekday(date)}) 리뷰 ${list.length}건<span>퇴실 순</span></h2>
        ${top.length ? `<p class="daily__words">이날 가장 많이 나온 말 · ${top.map((k) => `<strong>${esc(k)} ${words[k]}</strong>`).join(' · ')}</p>` : ''}
        ${list.length ? `<div class="pick-chips">${[`<button type="button" class="pick-chip" data-dept="" data-focus="dept-all" aria-pressed="${!state.dept}">전체 <span class="pick-chip__count">${list.length}</span></button>`]
          .concat(Object.keys(depts).map((k) => `<button type="button" class="pick-chip" data-dept="${esc(k)}" data-focus="dept-${esc(k)}" aria-pressed="${state.dept === k}">${esc(k)} <span class="pick-chip__count">${depts[k]}</span></button>`)).join('')}</div>` : ''}
      </section>
      ${shown.length ? `<ul class="review-list">${shown.map((r) => reviewCard(r, { daily: true })).join('')}</ul>` : '<p class="empty">이날은 남긴 리뷰가 없어요.</p>'}`;
  }

  function render(view, ctx) {
    const seatId = ctx.params[0];
    if (!D.seat(seatId)) {
      view.innerHTML = '<section class="card soon"><h1 class="soon__title">자리를 찾지 못했어요</h1><a class="btn btn--primary" href="#/map">자리 확인으로 가기</a></section>';
      return;
    }
    const state = { tab: ctx.query.get('tab') === 'daily' ? 'daily' : 'summary', cat: '', all: false, day: null, dept: '', tickets: [] };

    function paint() {
      const snap = MD.score.snapshot();
      const entry = snap.byId[seatId];
      const seat = entry.seat;
      const hidden = new Set(MD.state.reported());
      const reviews = D.reviews()
        .filter((r) => r.seatId === seatId && r.daysAgo < MD.score.WINDOW_DAYS && !hidden.has(r.id))
        .sort((a, b) => a.daysAgo - b.daysAgo || (b.checkOut || '').localeCompare(a.checkOut || ''));
      state.tickets = snap.tickets.filter((t) => t.seatId === seatId);
      const textCount = reviews.filter((r) => r.text).length;

      const action = entry.state === 'free'
        ? `<button type="button" class="btn btn--primary btn--block" data-action="book">예약 앱에서 예약하기</button>`
        : `<a class="btn btn--secondary btn--block" href="#/map?seat=${seatId}">자리 확인에서 보기</a>`;

      UI.keepFocus(view, () => {
        view.innerHTML = `
          <div class="narrow sr${entry.state === 'free' ? ' has-fixed-action' : ''}">
            ${UI.back(`#/map?seat=${seatId}`, '뒤로')}
            <div class="page-head">
              <div>
                <p class="sr__eyebrow">좌석 리뷰</p>
                <h1 class="page-title">${esc(D.seatLabel(seatId))}${snap.crownId === seatId ? UI.crown() : ''}</h1>
                <p class="page-sub">${seat.zone}구역 · ${TYPE_TEXT[seat.type]} · 평가 ${reviews.length} · 리뷰 ${textCount}</p>
              </div>
              ${entry.lowData ? UI.pill('평가 부족', 'neutral') : ''}
            </div>
            <ul class="facts sr__facts">
              <li class="fact">${UI.icon('monitor')}${seat.dual ? '듀얼 모니터' : '모니터 1대'}</li>
              <li class="fact">${UI.icon('plug')}콘센트 ${seat.outlets}구</li>
              <li class="fact"><span class="fact__wc" aria-hidden="true">WC</span>화장실 ${seat.dist.wc}m</li>
            </ul>
            <div class="segmented segmented--block sr__tabs" role="tablist" aria-label="리뷰 보기 방식">
              <button type="button" role="tab" data-tab-btn="summary" data-focus="tab-summary" aria-selected="${state.tab === 'summary'}">한눈에 보기</button>
              <button type="button" role="tab" data-tab-btn="daily" data-focus="tab-daily" aria-selected="${state.tab === 'daily'}">날짜별 보기</button>
            </div>
            <div class="sr__body" role="tabpanel">${state.tab === 'daily' ? dailyHTML(reviews, state) : summaryHTML(entry, reviews, state)}</div>
            <div class="sr__action${entry.state === 'free' ? ' sr__action--sticky' : ''}">${action}</div>
          </div>`;
      });
      // 고른 날짜가 가로 목록에서 보이게
      const days = view.querySelector('.days');
      const picked = days && days.querySelector('[aria-pressed="true"]');
      if (picked) days.scrollLeft = Math.max(0, picked.offsetLeft - days.offsetLeft - (days.clientWidth - picked.offsetWidth) / 2);
    }

    view.addEventListener('click', async (e) => {
      const t = e.target;
      const tab = t.closest('[data-tab-btn]');
      if (tab) { state.tab = tab.dataset.tabBtn; paint(); return; }
      const cat = t.closest('[data-cat]');
      if (cat) { state.cat = cat.dataset.cat; state.all = false; paint(); return; }
      const day = t.closest('[data-day]');
      if (day) { state.day = Number(day.dataset.day); state.dept = ''; paint(); return; }
      const dept = t.closest('[data-dept]');
      if (dept) { state.dept = dept.dataset.dept; paint(); return; }
      if (t.closest('[data-action="more"]')) { state.all = true; paint(); return; }
      if (t.closest('[data-action="book"]')) { await MD.actions.book(seatId); return; }
      const report = t.closest('[data-report]');
      if (report) {
        const ok = await UI.confirm({
          title: '이 리뷰를 신고할까요?',
          body: '특정인에 대한 내용이나 자리와 상관없는 내용이면 신고해 주세요.\n신고한 리뷰는 바로 가려지고 검토 후 처리돼요.',
          confirm: '신고하기',
          cancel: '취소',
        });
        if (!ok) return;
        MD.state.report(report.dataset.report);
        paint();
        UI.toast('신고를 접수했어요. 검토 후 처리할게요');
      }
    });

    paint();
  }

  MD.screens.seatReviews = { title: '좌석 리뷰', render };
})();
