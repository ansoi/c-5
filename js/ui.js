/* 화면 공통 조각 — 아이콘, 알약 표시, 안내 메시지, 글자 이스케이프 */
(() => {
  'use strict';
  const MD = (window.MD = window.MD || {});

  // 선 아이콘 (Lucide, ISC 라이선스). 24×24 기준 path만 넣어요.
  const ICONS = {
    home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
    grid: '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
    message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    armchair: '<path d="M19 9V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v3"/><path d="M3 16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v2H7v-2a2 2 0 0 0-4 0Z"/><path d="M5 18v2"/><path d="M19 18v2"/>',
    thermometer: '<path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/>',
    volume: '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
    monitor: '<rect width="20" height="14" x="2" y="3" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/>',
    plug: '<path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    chevronRight: '<path d="m9 18 6-6-6-6"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    sliders: '<path d="M21 4h-7"/><path d="M10 4H3"/><path d="M21 12h-9"/><path d="M8 12H3"/><path d="M21 20h-5"/><path d="M12 20H3"/><path d="M14 2v4"/><path d="M8 10v4"/><path d="M16 18v4"/>',
    wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
    phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    door: '<path d="M13 4h3a2 2 0 0 1 2 2v14"/><path d="M2 20h3"/><path d="M13 20h9"/><path d="M10 12v.01"/><path d="M13 4.562v16.157a1 1 0 0 1-1.242.97L5 20V5.562a2 2 0 0 1 1.515-1.94l4-1A2 2 0 0 1 13 4.561Z"/>',
    droplet: '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
    external: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    reset: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
    arrowLeft: '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
    chevronDown: '<path d="m6 9 6 6 6-6"/>',
    printer: '<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/>',
    briefcase: '<rect width="20" height="14" x="2" y="7" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
    headphones: '<path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/>',
    flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
    pencil: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
    calendar: '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>',
  };

  function icon(name, cls) {
    return `<svg class="icon${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICONS[name] || ''}</svg>`;
  }

  // 금색 왕관 — 층마다 나에게 가장 맞는 자리 1곳에만 붙여요 (톤앤매너 3장)
  function crown(cls) {
    return `<svg class="crown${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 18 2.5 7.5l5 4L12 4.5l4.5 7 5-4L20 18Z" fill="var(--crown)" stroke="var(--crown-line)" stroke-width="1.6" stroke-linejoin="round"/><path d="M4.5 21h15" stroke="var(--crown-line)" stroke-width="1.8" stroke-linecap="round"/></svg>`;
  }

  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ESC[c]);

  // 상태는 색 + 글자 라벨 (색만으로 뜻을 전하지 않아요)
  // tone: ok(여유·완료) mid(보통·수리 중) bad(혼잡·고장) brand neutral
  const pill = (text, tone) => `<span class="pill pill--${tone || 'neutral'}">${esc(text)}</span>`;

  let toastTimer = null;
  function toast(message) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('is-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-show'), 2800);
  }

  // 단계 그림 — 온도·소음 등은 숫자 대신 단계 그림 + 라벨 (톤앤매너 2장)
  function steps(total, active) {
    let segs = '';
    for (let i = 0; i < total; i++) segs += `<span class="steps__seg${i === active ? ' is-on' : ''}"></span>`;
    return `<span class="steps" aria-hidden="true">${segs}</span>`;
  }

  // 뒤로 가기. 앱 안에서 왔으면 이전 화면으로, 바로 들어왔으면 fallback 주소로 가요 (app.js가 처리)
  const back = (fallback, label) =>
    `<a class="back" href="${fallback}" data-back>${icon('arrowLeft')}<span>${esc(label || '뒤로')}</span></a>`;

  // 확인 창 → Promise<boolean>. 주요 버튼은 하나만 둬요.
  function confirm(opts) {
    return new Promise((resolve) => {
      const prev = document.activeElement;
      const wrap = document.createElement('div');
      wrap.className = 'dialog-wrap';
      const body = (opts.body || '').split('\n').filter(Boolean).map((p) => `<p>${esc(p)}</p>`).join('');
      wrap.innerHTML = `
        <div class="dialog" role="alertdialog" aria-modal="true" aria-labelledby="dialog-title" aria-describedby="dialog-body">
          <h2 class="dialog__title" id="dialog-title">${esc(opts.title)}</h2>
          <div class="dialog__body" id="dialog-body">${body}</div>
          <div class="dialog__actions">
            <button type="button" class="btn btn--secondary" data-answer="no">${esc(opts.cancel || '취소')}</button>
            <button type="button" class="btn btn--primary" data-answer="yes">${esc(opts.confirm || '확인')}</button>
          </div>
        </div>`;
      document.body.appendChild(wrap);
      document.body.classList.add('is-dialog');
      const buttons = Array.from(wrap.querySelectorAll('button'));

      function close(answer) {
        document.removeEventListener('keydown', onKey, true);
        wrap.remove();
        document.body.classList.remove('is-dialog');
        if (prev && prev.isConnected && prev.focus) prev.focus();
        resolve(answer);
      }
      function onKey(e) {
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(false); }
        if (e.key === 'Tab') { // 창 밖으로 초점이 나가지 않게
          const i = buttons.indexOf(document.activeElement);
          const next = e.shiftKey ? (i <= 0 ? buttons.length - 1 : i - 1) : (i + 1) % buttons.length;
          e.preventDefault();
          buttons[next].focus();
        }
      }
      wrap.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-answer]');
        if (btn) close(btn.dataset.answer === 'yes');
        else if (e.target === wrap) close(false);
      });
      document.addEventListener('keydown', onKey, true);
      buttons[buttons.length - 1].focus();
    });
  }

  // 화면 일부를 다시 그린 뒤에도 키보드 초점을 같은 버튼에 돌려놓아요
  function keepFocus(container, redraw) {
    const active = document.activeElement;
    const key = active && container.contains(active) ? active.getAttribute('data-focus') : null;
    redraw();
    if (key) {
      const el = container.querySelector(`[data-focus="${key}"]`);
      if (el) el.focus();
    }
  }

  MD.ui = { icon, crown, esc, pill, toast, steps, back, confirm, keepFocus };
})();
