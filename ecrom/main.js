(function () {
  'use strict';
  const E = window.ECROM, W = window.WORLD;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };

  /* ------------------------------------------------------------------ Demo 1: latent model */
  (function () {
    const svg = $('#simgrid'); if (!svg) return;
    const N = 100;
    let U1, U2;
    const draw = () => { U1 = Array.from({ length: N }, Math.random); U2 = Array.from({ length: N }, Math.random); render(); };
    function render() {
      const th = +$('#sim-theta').value, c = +$('#sim-c').value;
      $('#sim-theta-v').textContent = th.toFixed(2); $('#sim-c-v').textContent = c.toFixed(2);
      svg.innerHTML = '';
      let x = 0, z = 0;
      for (let i = 0; i < N; i++) {
        const cx = (i % 10) * 32 + 16, cy = Math.floor(i / 10) * 32 + 16;
        const X = U1[i] < th, V = U2[i] < c;
        if (X) x++; if (X && V) z++;
        if (!X) el('rect', { x: cx - 12, y: cy - 12, width: 24, height: 24, rx: 6, fill: '#e6e2d7' }, svg);
        else if (V) el('rect', { x: cx - 12, y: cy - 12, width: 24, height: 24, rx: 6, fill: css('--strong') }, svg);
        else el('rect', { x: cx - 11, y: cy - 11, width: 22, height: 22, rx: 6, fill: '#fff', stroke: css('--det'), 'stroke-width': 2, 'stroke-dasharray': '4 3' }, svg);
      }
      $('#sim-x').textContent = x; $('#sim-z').textContent = z; $('#sim-h').textContent = x - z;
      $('#sim-pz').textContent = (th * c).toFixed(2);
    }
    ['sim-theta', 'sim-c'].forEach(id => $('#' + id).addEventListener('input', render));
    $('#sim-resample').addEventListener('click', draw);
    draw();
  })();

  /* ------------------------------------------------------------------ Demo 2: posterior */
  (function () {
    const host = $('#surfaces'); if (!host) return;
    const mk = a => a.map(([c, l]) => ({ c, level: l }));
    const PRESETS = {
      teaser: {
        A: mk([[1,0],[1,2],[0,0],[0,0],[1,2],[0,0],[1,0],[0,0],[1,0],[0,0]]),
        B: mk([[1,0],[1,2],[1,0],[1,0],[.75,0],[1,0],[1,2],[1,0],[.75,0],[1,0]]),
      },
      equal: {
        A: mk([[1,0],[1,2],[1,0],[1,0],[1,2],[1,0],[1,0],[1,0],[1,0],[1,0]]),
        B: mk([[1,0],[1,2],[1,0],[1,0],[1,0],[1,0],[1,2],[1,0],[1,0],[1,0]]),
      },
      unseen: {
        A: mk([[0,1],[0,0],[0,2],[0,0],[0,0],[0,0],[0,1],[0,0],[0,0],[0,0]]),
        B: mk([[1,0],[1,2],[1,0],[1,0],[.75,0],[1,0],[1,2],[1,0],[.75,0],[1,0]]),
      },
    };
    const S = { A: null, B: null };
    const META = { A: ['Dining table', 'A'], B: ['Kitchen island', 'B'] };
    const panels = {};
    ['A', 'B'].forEach(k => {
      const d = document.createElement('div'); d.className = 'surf';
      d.innerHTML = `<h4>${META[k][0]}</h4><div class="sub" id="sub${k}"></div><div class="trav" id="trav${k}"></div><div class="rowlabel"><span>traversal 1</span><span>10</span></div><svg class="curve" viewBox="0 0 320 120" preserveAspectRatio="none"></svg>`;
      host.appendChild(d); panels[k] = d;
      const trav = $('#trav' + k, d);
      for (let i = 0; i < 10; i++) {
        const col = document.createElement('div'); col.className = 'tcol';
        col.innerHTML = `<div class="bar"><div class="fill"></div></div><button class="dot" aria-label="cycle detector response"></button><span class="tnum">${i + 1}</span>`;
        trav.appendChild(col);
        const bar = $('.bar', col);
        const setC = ev => {
          const r = bar.getBoundingClientRect();
          const v = 1 - (ev.clientY - r.top) / r.height;
          S[k][i].c = Math.max(0, Math.min(1, Math.round(v * 4) / 4)); update();
        };
        let down = false;
        bar.addEventListener('pointerdown', ev => { down = true; bar.setPointerCapture(ev.pointerId); setC(ev); });
        bar.addEventListener('pointermove', ev => { if (down) setC(ev); });
        bar.addEventListener('pointerup', () => { down = false; });
        $('.dot', col).addEventListener('click', () => { S[k][i].level = (S[k][i].level + 1) % 3; update(); });
      }
    });

    function curvePath(post) {
      const xmax = 0.6, f = post.f, g = E.grid;
      let mx = 0; for (let i = 0; i < g.length; i++) if (g[i] <= xmax) mx = Math.max(mx, f[i]);
      let d = '';
      for (let i = 0; i < g.length; i++) {
        if (g[i] > xmax) break;
        d += (d ? 'L' : 'M') + (g[i] / xmax * 320).toFixed(1) + ' ' + (112 - f[i] / mx * 100).toFixed(1);
      }
      return d;
    }
    function update() {
      const res = {};
      ['A', 'B'].forEach(k => {
        const p = panels[k], h = S[k];
        $$('.tcol', p).forEach((col, i) => {
          $('.fill', col).style.height = (h[i].c * 100) + '%';
          $('.dot', col).dataset.l = h[i].level;
        });
        const post = E.posterior(h, 'ecrom'), noexp = E.posterior(h, 'noexp');
        res[k] = { ecrom: post.mean, noexp: noexp.mean, count: E.count(h), exp: E.exposedCount(h) };
        $('#sub' + k, p).innerHTML = `<b>${res[k].count}</b> detector response${res[k].count === 1 ? '' : 's'} in <b>${res[k].exp}</b> exposed traversal${res[k].exp === 1 ? '' : 's'}`;
        const svg = $('svg.curve', p); svg.innerHTML = '';
        // axis
        el('line', { x1: 0, y1: 113, x2: 320, y2: 113, stroke: '#d8d3c6' }, svg);
        [0, .2, .4, .6].forEach(t => { const x = t / 0.6 * 320; el('line', { x1: x, y1: 113, x2: x, y2: 117, stroke: '#b8b3a5' }, svg); const tx = el('text', { x: Math.min(Math.max(x, 8), 312), y: 129, 'font-size': 9, fill: '#7a8492', 'text-anchor': 'middle' }, svg); tx.textContent = t; });
        const path = curvePath(post);
        el('path', { d: path + 'L' + (Math.min(1, 0.6 / 0.6) * 320) + ' 112L0 112Z', fill: css('--ours'), opacity: .15 }, svg);
        el('path', { d: path, fill: 'none', stroke: css('--ours'), 'stroke-width': 2.2, 'vector-effect': 'non-scaling-stroke' }, svg);
        const mxp = post.mean / 0.6 * 320;
        el('line', { x1: mxp, y1: 4, x2: mxp, y2: 112, stroke: css('--det'), 'stroke-dasharray': '4 3', 'stroke-width': 1.5, 'vector-effect': 'non-scaling-stroke' }, svg);
        const lab = el('text', { x: Math.min(mxp + 4, 250), y: 14, 'font-size': 10, fill: css('--det') }, svg); lab.textContent = 'mean ' + post.mean.toFixed(3);
      });
      // comparison table
      const rows = [
        ['ECROM (posterior mean θ̂)', 'ecrom', 3, true],
        ['Without exposure term (c = 1)', 'noexp', 3, false],
        ['Detection count', 'count', 0, false],
      ];
      let html = '<tr><th>Score</th><th>Dining table</th><th>Kitchen island</th><th>Searches first</th></tr>';
      rows.forEach(([name, key, dp, ours]) => {
        const a = res.A[key], b = res.B[key];
        const tie = Math.abs(a - b) < (key === 'count' ? 0.5 : 0.004);
        const first = tie ? 'tie' : (a > b ? 'Dining table' : 'Kitchen island');
        const mx = Math.max(a, b, 1e-9);
        const cell = (v, win) => `<td class="v ${win ? 'win' : ''}">${v.toFixed(dp)}<span class="mini ${ours ? 'ours' : ''}" style="width:${Math.round(v / (key === 'count' ? 6 : 0.3) * 70)}px"></span></td>`;
        html += `<tr><td>${name}</td>${cell(a, !tie && a > b)}${cell(b, !tie && b > a)}<td class="${tie ? 'muted' : 'win'}">${first}</td></tr>`;
      });
      $('#cmp').innerHTML = html;
    }
    function load(p) {
      S.A = PRESETS[p].A.map(x => ({ ...x })); S.B = PRESETS[p].B.map(x => ({ ...x }));
      $$('#post-presets button').forEach(b => b.setAttribute('aria-pressed', b.dataset.p === p));
      update();
    }
    $$('#post-presets button').forEach(b => b.addEventListener('click', () => load(b.dataset.p)));
    load('teaser');
  })();

  /* ------------------------------------------------------------------ Method stepper */
  (function () {
    const steps = [
      { img: 'assets/overview_a.png', eq: 'supports <i>j</i> ∈ 𝒥,  views <i>u</i> = (place <i>a</i>, direction ψ)',
        d: 'Repeated RGB-D traversals are organised into a sparse place–view atlas on the CROSS keyframe graph. Coloured lines are the traversals; black nodes are graph places. Depth is voxelised into surface supports.' },
      { img: 'assets/overview_b.png', eq: '<i>c<sub>je</sub></i> = |{ ξ ∈ 𝒮<sub><i>j</i></sub> : ξ ∈ Ω<sub><i>e</i></sub> }| / |𝒮<sub><i>j</i></sub>|',
        d: 'For each traversal, the opportunity of a support is the fraction of its voxels that returned depth within detection range. Here, one traversal: blue patches were exposed, everything else was not seen. This is computed once and does not depend on the query.' },
      { img: 'assets/overview_c.png', eq: '<i>p</i>(θ<sub><i>j</i></sub> | 𝓗<sub><i>j</i></sub>, <i>q</i>) ∝ θ<sup>α₀−1</sup>(1−θ)<sup>β₀−1</sup> ∏<sub><i>e</i></sub> [ 1 + θ <i>c<sub>je</sub></i> ( Λ(<i>r<sub>je</sub></i>) − 1 ) ]',
        d: 'Given any text query, OWLv2 scores the stored frames; the highest localised score per support and traversal becomes r, and the calibrated ratio Λ turns it into evidence. The posterior mean is the search prior, shown as orange heat on the map.' },
      { img: 'assets/overview_d.png', eq: '<i>u</i>* = argmax<sub><i>u</i></sub> Σ<sub><i>j</i></sub> <i>b<sub>j</sub></i> <i>c<sub>j</sub></i>(<i>u</i>) / ( <i>C<sub>G</sub></i>(cur, <i>u</i>) + <i>d</i><sub>0</sub> )',
        d: 'The robot (blue start) greedily picks the executable view that exposes the most belief per meter, verifies, and updates the belief after every look. The green square is where the route currently ends; the red star is the target.' },
    ];
    const btns = $$('#steplist button');
    function show(i) {
      btns.forEach((b, k) => b.setAttribute('aria-selected', k === i));
      $('#stepimg').src = steps[i].img; $('#stepeq').innerHTML = steps[i].eq; $('#stepdesc').textContent = steps[i].d;
    }
    btns.forEach((b, i) => b.addEventListener('click', () => show(i)));
    show(0);
  })();

  /* ------------------------------------------------------------------ Demo 3: search sandbox */
  (function () {
    const cv = $('#world'); if (!cv) return;
    const ctx = cv.getContext('2d');
    const { supports, views, start } = W;
    let mode = 'ecrom', target = 3, st;
    const prior = m => m === 'ecrom' ? E.normalize(supports.map(s => E.posterior(s.hist, 'ecrom').mean))
      : m === 'count' ? E.normalize(supports.map(s => E.count(s.hist) + 0.05)) : supports.map(() => 1 / supports.length);
    const fresh = () => ({ b: prior(mode), cur: { ...start }, path: [{ ...start }], vis: new Set(), dist: 0, n: 0, done: false, ok: false, flash: null });
    function step(s, quiet) {
      if (s.done) return;
      const k = E.pickView(s.b, s.cur, views, supports, s.vis);
      if (k < 0) { s.done = true; return; }
      s.vis.add(k); const u = views[k];
      s.dist += Math.hypot(u.x - s.cur.x, u.y - s.cur.y); s.cur = { x: u.x, y: u.y }; s.path.push(s.cur); s.n++; s.flash = u;
      if (E.cover(u, supports[target]) >= E.SUCCESS_C) { s.done = true; s.ok = true; return; }
      s.b = E.update(s.b, u, supports);
      if (s.n >= 25) s.done = true;
    }
    function silent(m) {
      const keep = mode; mode = m; const s = fresh(); mode = keep;
      while (!s.done) step(s, true);
      return s;
    }
    function table() {
      const names = { ecrom: 'ECROM', count: 'Detection count', cov: 'Coverage' };
      let html = '<tr><th>Prior</th><th>Route</th><th>Views</th></tr>';
      const res = ['ecrom', 'count', 'cov'].map(m => [m, silent(m)]);
      const best = Math.min(...res.filter(r => r[1].ok).map(r => r[1].dist));
      res.forEach(([m, s]) => { html += `<tr><td>${names[m]}</td><td class="v ${s.ok && s.dist === best ? 'win' : ''}">${s.ok ? (s.dist / E.PX_PER_M).toFixed(1) + ' m' : 'not found'}</td><td class="v">${s.n}</td></tr>`; });
      $('#s-cmp').innerHTML = html;
    }
    function draw() {
      const W_ = cv.width, H = cv.height;
      ctx.clearRect(0, 0, W_, H);
      // rooms
      ctx.lineWidth = 3; ctx.strokeStyle = '#d5cfbf'; ctx.fillStyle = '#fbf8ef';
      const rooms = [[20,20,250,190,'Study'],[270,20,190,190,'Hall'],[460,20,240,190,'Living room'],[20,210,250,210,'Dining'],[270,210,190,210,''],[460,210,240,210,'Kitchen']];
      ctx.font = '600 12px system-ui'; 
      rooms.forEach(([x, y, w, h, t]) => { ctx.strokeRect(x, y, w, h); ctx.fillStyle = '#a19a86'; ctx.fillText(t, x + 10, y + 18); });
      // views
      views.forEach((u, k) => {
        ctx.beginPath(); ctx.arc(u.x, u.y, st.vis.has(k) ? 5 : 3.5, 0, 7);
        if (st.vis.has(k)) { ctx.fillStyle = css('--opp'); ctx.fill(); } else { ctx.lineWidth = 1.5; ctx.strokeStyle = css('--opp'); ctx.stroke(); }
      });
      // flash of the latest look
      if (st.flash) { ctx.beginPath(); ctx.arc(st.flash.x, st.flash.y, E.RADIUS, 0, 7); ctx.fillStyle = 'rgba(43,108,176,.07)'; ctx.fill(); ctx.strokeStyle = 'rgba(43,108,176,.35)'; ctx.setLineDash([5, 5]); ctx.lineWidth = 1.5; ctx.stroke(); ctx.setLineDash([]); }
      // path
      ctx.lineWidth = 3.5; ctx.strokeStyle = css('--ours'); ctx.lineJoin = 'round'; ctx.beginPath();
      st.path.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke();
      // supports + belief
      const mx = Math.max(...st.b);
      supports.forEach((s, j) => {
        const r = 7 + Math.sqrt(st.b[j] / mx) * 20;
        ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, 7); ctx.fillStyle = 'rgba(228,87,46,' + (0.15 + 0.5 * st.b[j] / mx) + ')'; ctx.fill();
        ctx.fillStyle = '#3b3427'; ctx.fillRect(s.x - 6, s.y - 6, 12, 12);
        ctx.font = '600 11px system-ui'; ctx.fillStyle = '#3b4757'; ctx.textAlign = 'center';
        ctx.fillText(s.name, s.x, s.y + r + 13); ctx.fillStyle = css('--det'); ctx.fillText((st.b[j] * 100).toFixed(0) + '%', s.x, s.y - r - 5);
        if (j === target) { ctx.font = '22px system-ui'; ctx.fillStyle = '#c0182b'; ctx.fillText('★', s.x + 14, s.y - 8); }
      });
      ctx.textAlign = 'left';
      // robot
      ctx.beginPath(); ctx.arc(st.cur.x, st.cur.y, 9, 0, 7); ctx.fillStyle = css('--ours'); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.stroke();
      ctx.beginPath(); ctx.arc(start.x, start.y, 4, 0, 7); ctx.fillStyle = '#e8b10c'; ctx.fill();
      const info = $('#s-info');
      if (st.done) info.innerHTML = st.ok ? `Found <b>${supports[target].name}</b> after <b>${(st.dist / E.PX_PER_M).toFixed(1)} m</b> and <b>${st.n}</b> views.` : `Stopped after ${st.n} views without finding it.`;
      else info.innerHTML = st.n ? `<b>${st.n}</b> view${st.n > 1 ? 's' : ''}, ${(st.dist / E.PX_PER_M).toFixed(1)} m so far. The failed look discounted nearby supports.` : `Ready. Target: <b>${supports[target].name}</b>. Prior: <b>${{ ecrom: 'ECROM', count: 'detection count', cov: 'coverage' }[mode]}</b>.`;
    }
    let timer = null;
    const stop = () => { clearInterval(timer); timer = null; };
    function reset() { stop(); st = fresh(); table(); draw(); }
    $('#s-step').addEventListener('click', () => { stop(); step(st); draw(); });
    $('#s-run').addEventListener('click', () => { if (timer || st.done) return; timer = setInterval(() => { step(st); draw(); if (st.done) stop(); }, 550); });
    $('#s-reset').addEventListener('click', reset);
    $$('#prior-seg button').forEach(b => b.addEventListener('click', () => { mode = b.dataset.m; $$('#prior-seg button').forEach(x => x.setAttribute('aria-pressed', x === b)); reset(); }));
    cv.addEventListener('click', ev => {
      const r = cv.getBoundingClientRect(), x = (ev.clientX - r.left) * cv.width / r.width, y = (ev.clientY - r.top) * cv.height / r.height;
      let best = -1, bd = 40;
      supports.forEach((s, j) => { const d = Math.hypot(s.x - x, s.y - y); if (d < bd) { bd = d; best = j; } });
      if (best >= 0) { target = best; reset(); }
    });
    reset();
  })();

  /* ------------------------------------------------------------------ Results chart */
  (function () {
    const host = $('#bars'); if (!host) return;
    // Table 1 of the paper. null = "–"
    const ROWS = [
      ['ECROM (ours)', 'ours', .216, .368, .760, .0287, .587, .381],
      ['Detection count', '', .148, .318, .659, null, .440, .330],
      ['Visit frequency', '', .116, .261, .619, .0811, .433, .299],
      ['Opportunity-normalized count', '', .171, .310, .655, .0773, .467, .310],
      ['PredictiveGraphs-style (Perpetua*)', '', .160, .263, .659, .0302, .533, .339],
      ['RAVEN-style retrieval', '', .150, .340, .600, null, .420, .310],
      ['DynaMem-style latest state', '', .101, .197, .629, null, .400, .267],
      ['Coverage (no memory)', '', .011, .006, .500, .0357, .247, .074],
      ['ECROM without exposure term (c = 1)', 'abl', .191, .342, .718, .0310, .520, .333],
      ['ECROM with binary exposure', 'abl', .195, .354, .733, .0287, .540, .360],
      ['ECROM with binary sensor (τ = .25)', 'abl', .195, .345, .746, .0297, .473, .339],
      ['ECROM with binary sensor (τ = .15)', 'abl', .175, .318, .752, .0309, .540, .303],
    ];
    const M = [
      ['AP', 'Average precision of ranking the supports where the object really occurs. Higher is better.', 1],
      ['Top-5', 'How much of the true occurrence probability lies in the five top-ranked supports. Higher is better.', 1],
      ['AUROC', 'Probability that a true support is scored above a support where the object never occurs. Higher is better.', 1],
      ['NLL', 'Bernoulli negative log-likelihood of the prevalence estimates, for methods that output probabilities. Lower is better.', 0],
      ['SR', 'Search success rate over all 150 trials within a 120 m budget; the 22 absent-target trials count as failures. Higher is better.', 1],
      ['SPL', 'Success weighted by path length over all 150 trials. Higher is better.', 1],
    ];
    let mi = 0;
    const seg = $('#metric-seg');
    M.forEach((m, i) => { const b = document.createElement('button'); b.textContent = m[0]; b.setAttribute('aria-pressed', i === 0); b.addEventListener('click', () => { mi = i; render(); }); seg.appendChild(b); });
    const fmt = (v, i) => v == null ? '–' : (i === 3 ? v.toFixed(4) : v.toFixed(3).replace(/^0/, ''));
    function build() {
      host.innerHTML = '';
      ROWS.forEach((r, ri) => {
        if (ri === 8) { const s = document.createElement('div'); s.className = 'sep abl-only'; s.textContent = 'ECROM ablations'; host.appendChild(s); }
        const d = document.createElement('div'); d.className = 'brow ' + r[1] + (r[1] === 'abl' ? ' abl-only' : '');
        d.innerHTML = `<div class="name">${r[0]}</div><div class="track"><div class="fillbar"></div></div><div class="val"></div>`;
        host.appendChild(d);
      });
    }
    function render() {
      $$('#metric-seg button').forEach((b, i) => b.setAttribute('aria-pressed', i === mi));
      $('#metric-desc').textContent = M[mi][1];
      const vals = ROWS.map(r => r[2 + mi]).filter(v => v != null);
      const hi = M[mi][2] === 1, mx = Math.max(...vals), mn = Math.min(...vals);
      const best = hi ? mx : mn;
      $$('.brow', host).forEach((d, ri) => {
        const v = ROWS[ri][2 + mi];
        d.classList.toggle('na', v == null);
        const w = v == null ? 0 : (hi ? v / mx * 100 : (mi === 3 ? (1 - (v - 0.02) / 0.07) * 100 : 100));
        // for NLL show bar length as (max - v)/(max - lower) so that longer = better
        let width = w;
        if (!hi && v != null) { const lo = 0.02, up = 0.09; width = Math.max(4, (up - v) / (up - lo) * 100); }
        $('.fillbar', d).style.width = width + '%';
        $('.val', d).textContent = fmt(v, mi);
        $('.val', d).style.color = (v != null && v === best) ? 'var(--ours)' : '';
      });
    }
    build(); render();
    $('#abl-toggle').addEventListener('change', e => { $$('.abl-only', host).forEach(n => n.style.display = e.target.checked ? '' : 'none'); });
  })();

  /* ------------------------------------------------------------------ Tertile chart */
  (function () {
    const host = $('#tert'); if (!host) return;
    [['Least observed third', 17, .057], ['Middle third', 16, .020], ['Best observed third', 17, -.001]].forEach(([n, k, v]) => {
      const d = document.createElement('div'); d.className = 'tcol2';
      d.innerHTML = `<div class="tv">${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(3).replace(/^0/, '')}</div><div class="tb ${v < 0 ? 'neg' : ''}" style="height:2px"></div><div class="small muted" style="margin-top:6px">${n}<br>(${k} queries)</div>`;
      host.appendChild(d);
      $('.tb', d).style.height = Math.max(2, Math.abs(v) / .057 * 110) + 'px';
    });
  })();

  /* ------------------------------------------------------------------ Robot */
  (function () {
    const big = $('#robot-big'); if (!big) return;
    [['Success rate', '14/15', '10/15', '11/15'], ['Mean travel', '19.4 m', '29.1 m', '29.5 m'], ['Views inspected', '4.7', '9.3', '8.9']].forEach(([t, a, b, c]) => {
      const d = document.createElement('div'); d.className = 'stat-card';
      d.innerHTML = `<div class="lbl">${t}</div><div class="big">${a}</div><div class="lbl">Detection count ${b} · PredictiveGraphs-style ${c}</div>`; big.appendChild(d);
    });
    const Q = [
      ['red cup', [3, 25.4], [2, 49.9], [2, 42.2]], ['luncheon meat', [2, 17.7], [0, 17.1], [1, 29.7]],
      ['headphones', [3, 24.7], [3, 26.8], [3, 26.9]], ['cupcakes', [3, 20.0], [3, 21.5], [3, 23.1]], ['scissors', [3, 9.0], [2, 30.4], [2, 25.6]],
    ];
    const host = $('#qrows');
    Q.forEach(q => {
      const r = document.createElement('div'); r.className = 'qrow';
      let h = `<span><b>${q[0]}</b></span>`;
      [1, 2, 3].forEach(i => {
        const [s, t] = q[i];
        h += `<div class="qcell ${i === 1 ? 'o' : 'base'}"><div class="dots">${[0, 1, 2].map(k => `<i class="${k < s ? 'on' : ''}"></i>`).join('')}</div><div class="tbar" style="width:0" data-w="${t / 50 * 100}"></div><small>${t.toFixed(1)} m</small></div>`;
      });
      r.innerHTML = h; host.appendChild(r);
    });
    $$('.tbar', host).forEach(b => b.style.width = b.dataset.w + '%');
  })();

})();
