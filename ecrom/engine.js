/* Pure math for the interactive demos (no DOM). Illustrative parameters, not the paper's calibrated values. */
(function (root) {
  const E = {};
  // Illustrative detector: three response levels and the likelihood ratio Lambda(r) = p1(r)/p0(r) each carries.
  E.LEVELS = [
    { r: 0.0, lam: 0.45, name: 'no response' },
    { r: 0.3, lam: 3.0, name: 'weak response' },
    { r: 0.6, lam: 25.0, name: 'strong response' },
  ];
  E.ALPHA0 = 1; E.BETA0 = 12;   // sparse prior, alpha0 << beta0
  E.TAU = 0.25;                 // threshold used by the detection-count baseline

  // theta grid with extra resolution near 0 (theta = u^3)
  const N = 500;
  const grid = [];
  for (let i = 0; i <= N; i++) grid.push(Math.pow(i / N, 3));
  E.grid = grid;

  // hist: [{c, level}] with c in [0,1] and level an index into LEVELS.  mode 'ecrom' uses c, 'noexp' forces c = 1.
  E.posterior = function (hist, mode) {
    const f = new Array(grid.length);
    let z = 0, m = 0;
    for (let i = 0; i < grid.length; i++) {
      const t = grid[i];
      let v = Math.pow(t, E.ALPHA0 - 1) * Math.pow(1 - t, E.BETA0 - 1);
      for (const h of hist) {
        const c = mode === 'noexp' ? 1 : h.c;
        v *= 1 + t * c * (E.LEVELS[h.level].lam - 1);
      }
      f[i] = v;
    }
    for (let i = 1; i < grid.length; i++) {
      const dt = grid[i] - grid[i - 1];
      z += 0.5 * (f[i] + f[i - 1]) * dt;
      m += 0.5 * (f[i] * grid[i] + f[i - 1] * grid[i - 1]) * dt;
    }
    return { f: f.map(v => v / z), mean: m / z };
  };
  E.count = hist => hist.filter(h => E.LEVELS[h.level].r >= E.TAU).length;
  E.exposedCount = hist => hist.filter(h => h.c > 0).length;

  // ---- toy search world -------------------------------------------------------------------------------
  E.PDET = 0.8;
  E.D0 = 25;         // px cost of taking a look
  E.PX_PER_M = 20;
  E.RADIUS = 150;
  E.SUCCESS_C = 0.4;
  E.cover = (u, s) => Math.max(0, 1 - Math.hypot(u.x - s.x, u.y - s.y) / E.RADIUS);

  E.normalize = b => { const z = b.reduce((a, v) => a + v, 0) || 1; return b.map(v => v / z); };

  // one greedy step (Eq. index): returns index of best view, given weights b, current position, views, supports
  E.pickView = function (b, cur, views, supports, visited) {
    let best = -1, bestScore = -1;
    views.forEach((u, k) => {
      if (visited.has(k)) return;
      let gain = 0;
      supports.forEach((s, j) => { gain += b[j] * E.cover(u, s); });
      const cost = Math.hypot(cur.x - u.x, cur.y - u.y) + E.D0;
      const sc = gain / cost;
      if (sc > bestScore) { bestScore = sc; best = k; }
    });
    return best;
  };
  E.update = function (b, u, supports) {  // b'_j ∝ b_j (1 - p_det c_j(u))
    return E.normalize(b.map((v, j) => v * (1 - E.PDET * E.cover(u, supports[j]))));
  };

  if (typeof module !== 'undefined') module.exports = E; else root.ECROM = E;
})(this);
