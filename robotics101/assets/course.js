/* Robotics for Beginners — page runtime.
   Builds the top bar / sidebar / pager from the syllabus, handles language and theme,
   renders KaTeX, and provides small UI widgets + an event bus for the interactive figures. */
(function () {
  const R = (window.R101 = window.R101 || {});
  const doc = document.documentElement;
  const S = () => window.R101_SYLLABUS;

  /* ---------- event bus ---------- */
  const handlers = {};
  R.on = (ev, fn) => { (handlers[ev] = handlers[ev] || []).push(fn); };
  R.emit = (ev, ...args) => { (handlers[ev] || []).forEach(fn => { try { fn(...args); } catch (e) { console.error(e); } }); };

  /* ---------- language ---------- */
  R.lang = doc.getAttribute('data-lang-ui') || 'zh';
  R.t = (zh, en) => (R.lang === 'zh' ? zh : en);
  R.setLang = lang => {
    R.lang = lang === 'en' ? 'en' : 'zh';
    doc.setAttribute('data-lang-ui', R.lang);
    doc.lang = R.lang === 'zh' ? 'zh-CN' : 'en';
    try { localStorage.setItem('r101-lang', R.lang); } catch (e) {}
    document.querySelectorAll('.r101-lang button').forEach(b => b.classList.toggle('on', b.dataset.l === R.lang));
    const u = new URL(location.href);
    if (u.searchParams.has('lang')) { u.searchParams.set('lang', R.lang); history.replaceState(null, '', u); }
    document.title = R.lang === 'zh' ? (document.body.dataset.titleZh || document.title) : (document.body.dataset.titleEn || document.title);
    R.emit('lang', R.lang);
  };

  /* ---------- theme (shared with the main site: localStorage 'theme') ---------- */
  R.toggleTheme = () => {
    const t = doc.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    doc.setAttribute('data-theme', t);
    try { localStorage.setItem('theme', t); } catch (e) {}
    const b = document.querySelector('.r101-theme');
    if (b) b.textContent = t === 'dark' ? '☾' : '☀';
    R.emit('theme', t);
  };

  /* ---------- CSS color tokens for canvases ---------- */
  let colorCache = null;
  R.color = name => {
    if (!colorCache) colorCache = {};
    if (!(name in colorCache)) {
      const v = getComputedStyle(doc).getPropertyValue(name.startsWith('--') ? name : '--c-' + name).trim();
      colorCache[name] = v || name;
    }
    return colorCache[name];
  };
  R.on('theme', () => { colorCache = null; });

  /* ---------- syllabus helpers ---------- */
  R.pagePath = p => `part1/${p.n.replace('.', '-')}-${p.slug}.html`;
  R.allPages = () => {
    const out = [];
    S().parts[0].chapters.forEach(ch => ch.pages.forEach(p => out.push(Object.assign({ ch }, p))));
    return out;
  };
  const L = (zh, en) => `<span data-lang="zh">${zh}</span><span data-lang="en">${en}</span>`;
  R.L = L;

  function buildShell() {
    const body = document.body;
    const root = body.dataset.root || '.';
    const pageId = body.dataset.page || '';
    const syl = S();
    const pages = R.allPages();
    const cur = pages.find(p => p.n === pageId);

    // top bar
    const top = document.createElement('header');
    top.className = 'r101-top';
    let crumb = '';
    if (cur) crumb = L(`Part I · ${cur.ch.zh} · ${cur.n}`, `Part I · ${cur.ch.en} · ${cur.n}`);
    else if (body.dataset.crumbZh) crumb = L(body.dataset.crumbZh, body.dataset.crumbEn);
    top.innerHTML = `
      <button class="r101-iconbtn r101-menu-btn" aria-label="Menu">☰</button>
      <a class="r101-brand" href="${root}/index.html"><span class="logo">R</span><span class="name">Robotics for Beginners</span></a>
      <span class="r101-crumb">${crumb}</span>
      <span class="spacer"></span>
      <a class="r101-home-link" href="${root}/../index.html">${L('← 主页', '← Home')}</a>
      <span class="r101-lang"><button data-l="zh">中文</button><button data-l="en">EN</button></span>
      <button class="r101-iconbtn r101-theme" aria-label="Toggle theme">${doc.getAttribute('data-theme') === 'dark' ? '☾' : '☀'}</button>`;
    body.insertBefore(top, body.firstChild);
    top.querySelector('.r101-menu-btn').onclick = () => body.classList.toggle('side-open');
    top.querySelector('.r101-theme').onclick = R.toggleTheme;
    top.querySelectorAll('.r101-lang button').forEach(b => { b.onclick = () => R.setLang(b.dataset.l); });

    // sidebar
    const side = document.getElementById('r101-side');
    if (side) {
      const p1 = syl.parts[0];
      let h = `<a href="${root}/index.html" style="display:block;padding:6px 8px;font-weight:600;color:var(--fg)">${L('课程总览', 'Course overview')}</a>`;
      h += `<div class="part-title">Part I · ${L(p1.zh, p1.en)}</div>`;
      h += `<a href="${root}/part1/index.html" style="display:block;padding:4px 8px;color:var(--fg-2)">${L('本部分导览', 'Part overview')}</a>`;
      p1.chapters.forEach(ch => {
        const open = cur ? cur.ch === ch : false;
        h += `<details${open ? ' open' : ''}><summary>${ch.n}. ${L(ch.zh, ch.en)}</summary><ol>`;
        ch.pages.forEach(p => {
          const title = L(p.zh, p.en);
          if (p.ready) h += `<li><a href="${root}/${R.pagePath(p)}"${cur && cur.n === p.n ? ' class="current"' : ''}><span class="num">${p.n}</span><span>${title}</span></a></li>`;
          else h += `<li><span class="soon" title="Coming soon"><span class="num">${p.n}</span><span>${title}</span></span></li>`;
        });
        h += `</ol></details>`;
      });
      syl.parts.slice(1).forEach(p => {
        h += `<div class="part-title">Part ${p.id}</div><a class="later" href="${root}/index.html#part-${p.id}"><span>${L(p.zh, p.en)}</span><span class="tag">Soon</span></a>`;
      });
      side.innerHTML = h;
      side.addEventListener('click', e => { if (e.target.closest('a')) body.classList.remove('side-open'); });
    }

    // step table of contents
    const tocHost = document.getElementById('step-toc');
    if (tocHost) {
      document.querySelectorAll('section.step[id]').forEach(sec => {
        const h2 = sec.querySelector('h2');
        if (!h2) return;
        const clone = h2.cloneNode(true);
        clone.querySelectorAll('.n').forEach(n => n.remove());
        const li = document.createElement('li');
        li.innerHTML = `<a href="#${sec.id}">${clone.innerHTML}</a>`;
        tocHost.appendChild(li);
      });
    }

    // pager (nearest ready pages)
    const art = document.querySelector('article.lesson');
    if (cur && art) {
      const idx = pages.indexOf(cur);
      const prev = pages.slice(0, idx).reverse().find(p => p.ready);
      const next = pages.slice(idx + 1).find(p => p.ready);
      const cell = (p, dir) => p
        ? `<a class="${dir}" href="${root}/${R.pagePath(p)}"><span class="dir">${dir === 'prev' ? L('← 上一节', '← Previous') : L('下一节 →', 'Next →')}</span><span>${p.n} ${L(p.zh, p.en)}</span></a>`
        : `<a class="${dir}" href="${root}/part1/index.html"><span class="dir">${dir === 'prev' ? '←' : '→'}</span><span>${L('Part I 导览', 'Part I overview')}</span></a>`;
      const pg = document.createElement('nav');
      pg.className = 'pager';
      pg.innerHTML = cell(prev, 'prev') + cell(next, 'next');
      art.appendChild(pg);
    }
    R.setLang(R.lang);
  }

  /* ---------- KaTeX ---------- */
  R.katexOpts = {
    throwOnError: false,
    strict: 'ignore',
    trust: ctx => ctx.command === '\\htmlClass' || ctx.command === '\\htmlData',
    macros: {
      '\\R': '\\mathbb{R}',
      '\\ihat': '\\htmlClass{ci}{\\hat{\\imath}}',
      '\\jhat': '\\htmlClass{cj}{\\hat{\\jmath}}',
      '\\khat': '\\htmlClass{ck}{\\hat{k}}',
      '\\ci': '\\htmlClass{ci}{#1}',
      '\\cj': '\\htmlClass{cj}{#1}',
      '\\ck': '\\htmlClass{ck}{#1}',
      '\\cv': '\\htmlClass{cv}{#1}',
      '\\cw': '\\htmlClass{cw}{#1}',
      '\\cx': '\\htmlClass{cx}{#1}',
      '\\hl': '\\htmlData{hl=#1}{#2}',
      '\\SO': '\\mathrm{SO}(3)',
      '\\SE': '\\mathrm{SE}(3)',
      '\\so': '\\mathfrak{so}(3)',
      '\\se': '\\mathfrak{se}(3)',
      '\\Exp': '\\operatorname{Exp}',
      '\\Log': '\\operatorname{Log}',
      '\\skew': '[#1]_{\\times}',
      '\\T': '^{\\top}',
      '\\x': '\\mathbf{x}',
      '\\y': '\\mathbf{y}',
      '\\v': '\\mathbf{v}'
    }
  };
  R.tex = (el, src, display = false) => {
    if (!window.katex) { el.textContent = src; return; }
    try { katex.render(src, el, Object.assign({ displayMode: display }, R.katexOpts)); }
    catch (e) { el.textContent = src; }
  };
  function renderMath() {
    if (!window.renderMathInElement) return;
    renderMathInElement(document.body, Object.assign({
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '\\[', right: '\\]', display: true },
        { left: '\\(', right: '\\)', display: false },
        { left: '$', right: '$', display: false }
      ],
      ignoredClasses: ['no-math', 'katex-live']
    }, R.katexOpts));
  }

  /* ---------- formula ↔ figure highlighting ---------- */
  R.hl = null;
  R.setHl = key => {
    if (R.hl === key) return;
    R.hl = key;
    document.querySelectorAll('[data-hl]').forEach(el => el.classList.toggle('hl-on', key != null && el.dataset.hl === key));
    R.emit('hl', key);
  };
  function wireHighlight() {
    document.addEventListener('pointerover', e => {
      const t = e.target.closest && e.target.closest('[data-hl]');
      if (t) R.setHl(t.dataset.hl);
    });
    document.addEventListener('pointerout', e => {
      const t = e.target.closest && e.target.closest('[data-hl]');
      if (t && !(e.relatedTarget && t.contains(e.relatedTarget))) R.setHl(null);
    });
  }

  /* ---------- tasks & quizzes ---------- */
  R.done = id => {
    document.querySelectorAll(`[data-task="${id}"]`).forEach(el => {
      if (!el.classList.contains('done')) { el.classList.add('done'); R.emit('task', id); }
    });
  };
  function wireQuizzes() {
    document.querySelectorAll('.quiz').forEach(q => {
      const ans = +q.dataset.answer;
      const opts = [...q.querySelectorAll('.opt')];
      opts.forEach((b, i) => {
        b.addEventListener('click', () => {
          opts.forEach(o => o.classList.remove('right', 'wrong'));
          b.classList.add(i === ans ? 'right' : 'wrong');
          if (i !== ans) opts[ans].classList.add('right');
          q.classList.add('answered');
        });
      });
    });
  }

  /* ---------- UI widgets ---------- */
  const ui = (R.ui = {});
  const mk = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  ui.el = mk;

  // slider({zh,en,min,max,step,value,fmt,onInput})
  ui.slider = (parent, o) => {
    const w = mk('div', 'slider');
    w.innerHTML = `<label>${L(o.zh, o.en)}</label><input type="range" min="${o.min}" max="${o.max}" step="${o.step || 0.01}" value="${o.value}"><span class="val"></span>`;
    const input = w.querySelector('input'), val = w.querySelector('.val');
    const fmt = o.fmt || (v => R.M.fmt(v, 2));
    const show = () => { val.textContent = fmt(+input.value); };
    input.addEventListener('input', () => { show(); o.onInput && o.onInput(+input.value); });
    show();
    parent.appendChild(w);
    return { el: w, input, get: () => +input.value, set: (v, fire) => { input.value = v; show(); if (fire && o.onInput) o.onInput(+input.value); } };
  };

  // seg(parent, [{value, zh, en}], value, onChange)
  ui.seg = (parent, options, value, onChange) => {
    const w = mk('div', 'seg');
    let cur = value;
    options.forEach(op => {
      const b = mk('button', op.value === value ? 'on' : '', L(op.zh, op.en));
      b.type = 'button';
      b.onclick = () => { set(op.value); onChange && onChange(op.value); };
      b.dataset.v = op.value;
      w.appendChild(b);
    });
    function set(v) { cur = v; [...w.children].forEach(b => b.classList.toggle('on', b.dataset.v === String(v))); }
    parent.appendChild(w);
    return { el: w, get: () => cur, set };
  };

  ui.button = (parent, o) => {
    const b = mk('button', 'btn ' + (o.cls || ''), L(o.zh, o.en));
    b.type = 'button';
    b.onclick = o.onClick;
    parent.appendChild(b);
    return b;
  };

  // matrixEditor(parent, {value: rows, step, onInput, colClasses})
  ui.matrixEditor = (parent, o) => {
    const rows = o.value.length, cols = o.value[0].length;
    const w = mk('div', 'mat-edit');
    w.style.gridTemplateColumns = `repeat(${cols}, auto)`;
    let A = o.value.map(r => r.slice());
    const inputs = [];
    const step = o.step || 0.1, dec = o.decimals != null ? o.decimals : 2;
    for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
      const inp = mk('input', 'col' + j);
      inp.type = 'text'; inp.inputMode = 'decimal';
      inp.setAttribute('aria-label', `a${i + 1}${j + 1}`);
      inp.value = R.M.fmt(A[i][j], dec).replace('−', '-');
      inp.addEventListener('change', () => {
        const v = parseFloat(inp.value);
        if (isFinite(v)) { A[i][j] = v; o.onInput && o.onInput(get()); }
        inp.value = R.M.fmt(A[i][j], dec).replace('−', '-');
      });
      // drag horizontally to scrub
      let sx = null, sv = 0, moved = false;
      inp.addEventListener('pointerdown', e => {
        if (document.activeElement === inp) return;
        sx = e.clientX; sv = A[i][j]; moved = false;
        inp.setPointerCapture(e.pointerId);
        e.preventDefault();
      });
      inp.addEventListener('pointermove', e => {
        if (sx == null) return;
        const dx = e.clientX - sx;
        if (Math.abs(dx) > 3) moved = true;
        if (!moved) return;
        const v = Math.round((sv + dx * step / 6) / step) * step;
        A[i][j] = +v.toFixed(6);
        inp.value = R.M.fmt(A[i][j], dec).replace('−', '-');
        o.onInput && o.onInput(get());
      });
      inp.addEventListener('pointerup', () => {
        if (sx != null && !moved) { inp.focus(); inp.select(); }
        sx = null;
      });
      inputs.push(inp);
      w.appendChild(inp);
    }
    function get() { return A.map(r => r.slice()); }
    function set(B) {
      A = B.map(r => r.slice());
      inputs.forEach((inp, k) => { const i = Math.floor(k / cols), j = k % cols; if (document.activeElement !== inp) inp.value = R.M.fmt(A[i][j], dec).replace('−', '-'); });
    }
    parent.appendChild(w);
    return { el: w, get, set };
  };

  // simple animation helper: R.animate(ms, t => {...}, done)
  R.animate = (ms, step, done) => {
    const t0 = performance.now();
    let stop = false;
    const ease = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
    function f(now) {
      if (stop) return;
      const t = Math.min(1, (now - t0) / ms);
      step(ease(t), t);
      if (t < 1) requestAnimationFrame(f); else done && done();
    }
    requestAnimationFrame(f);
    return () => { stop = true; };
  };

  /* ---------- boot ---------- */
  function boot() {
    buildShell();
    renderMath();
    wireHighlight();
    wireQuizzes();
    R.ready = true;
    R.emit('ready');
  }
  R.onReady = fn => { if (R.ready) fn(); else R.on('ready', fn); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
