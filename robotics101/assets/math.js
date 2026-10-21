/* Robotics for Beginners — small math toolkit shared by the interactive figures.
   2×2 / 3×3 matrices are arrays of rows; vectors are plain arrays. */
(function () {
  const M = {};

  M.clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  M.lerp = (a, b, t) => a + (b - a) * t;
  M.fmt = (x, d = 2) => {
    if (!isFinite(x)) return x > 0 ? '∞' : (x < 0 ? '−∞' : 'NaN');
    let s = (+x).toFixed(d);
    if (/^-0\.?0*$/.test(s)) s = s.slice(1);
    return s.replace('-', '−');
  };
  // LaTeX-friendly number (ASCII minus)
  M.tex = (x, d = 2) => {
    let s = (+x).toFixed(d);
    if (/^-0\.?0*$/.test(s)) s = s.slice(1);
    return s;
  };

  // seeded RNG (mulberry32) + Gaussian samples
  M.rng = (seed = 1) => {
    let a = seed >>> 0;
    return () => {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  M.randn = (rand = Math.random) => {
    let u = 0, v = 0;
    while (u === 0) u = rand();
    while (v === 0) v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };

  /* ---------- vectors ---------- */
  M.add = (a, b) => a.map((x, i) => x + b[i]);
  M.sub = (a, b) => a.map((x, i) => x - b[i]);
  M.scale = (a, s) => a.map(x => x * s);
  M.dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
  M.norm = a => Math.sqrt(M.dot(a, a));
  M.normalize = a => { const n = M.norm(a); return n > 1e-12 ? M.scale(a, 1 / n) : a.slice(); };
  M.cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

  /* ---------- generic matrices (arrays of rows) ---------- */
  M.mul = (A, B) => A.map(r => B[0].map((_, j) => r.reduce((s, x, k) => s + x * B[k][j], 0)));
  M.mv = (A, v) => A.map(r => r.reduce((s, x, k) => s + x * v[k], 0));
  M.T = A => A[0].map((_, j) => A.map(r => r[j]));
  M.madd = (A, B) => A.map((r, i) => r.map((x, j) => x + B[i][j]));
  M.mscale = (A, s) => A.map(r => r.map(x => x * s));
  M.eye = n => Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));

  /* ---------- 2×2 ---------- */
  M.det2 = A => A[0][0] * A[1][1] - A[0][1] * A[1][0];
  M.inv2 = A => {
    const d = M.det2(A);
    if (Math.abs(d) < 1e-12) return null;
    return [[A[1][1] / d, -A[0][1] / d], [-A[1][0] / d, A[0][0] / d]];
  };
  M.rot2 = th => [[Math.cos(th), -Math.sin(th)], [Math.sin(th), Math.cos(th)]];
  M.lerpM = (A, B, t) => A.map((r, i) => r.map((x, j) => x + (B[i][j] - x) * t));

  // eigen-decomposition of a symmetric 2×2 [[a,b],[b,c]]: l1 >= l2, angle of the l1 eigenvector
  M.eigSym2 = S => {
    const a = S[0][0], b = (S[0][1] + S[1][0]) / 2, c = S[1][1];
    const m = (a + c) / 2, r = Math.sqrt(((a - c) / 2) ** 2 + b * b);
    const ang = 0.5 * Math.atan2(2 * b, a - c);
    return { l1: m + r, l2: m - r, angle: ang, v1: [Math.cos(ang), Math.sin(ang)], v2: [-Math.sin(ang), Math.cos(ang)] };
  };

  // real eigenvalues of a general 2×2 (null if complex)
  M.eig2 = A => {
    const tr = A[0][0] + A[1][1], det = M.det2(A), disc = tr * tr / 4 - det;
    if (disc < -1e-12) return { complex: true, re: tr / 2, im: Math.sqrt(-disc) };
    const s = Math.sqrt(Math.max(0, disc));
    const ls = [tr / 2 + s, tr / 2 - s];
    const vecs = ls.map(l => {
      const a = A[0][0] - l, b = A[0][1], c = A[1][0], d = A[1][1] - l;
      let v = Math.abs(a) + Math.abs(b) > Math.abs(c) + Math.abs(d) ? [-b, a] : [-d, c];
      if (M.norm(v) < 1e-9) v = [1, 0];
      return M.normalize(v);
    });
    return { complex: false, values: ls, vectors: vecs };
  };

  /* Closed-form 2×2 SVD: A = U · diag(s1, s2) · Vt, s1 >= s2 >= 0.
     Vt = Rot(theta) and U = Rot(phi) · diag(1, ±1), i.e. "rotate, stretch, rotate (maybe reflect)". */
  M.svd2 = A => {
    const [[a, b], [c, d]] = A;
    const E = (a + d) / 2, F = (a - d) / 2, G = (c + b) / 2, H = (c - b) / 2;
    const Q = Math.hypot(E, H), R = Math.hypot(F, G);
    const sx = Q + R, sy = Q - R;
    const a1 = Math.atan2(G, F), a2 = Math.atan2(H, E);
    const theta = (a2 - a1) / 2, phi = (a2 + a1) / 2;
    const reflect = sy < 0;
    const U = M.mul(M.rot2(phi), [[1, 0], [0, reflect ? -1 : 1]]);
    return { U, S: [sx, Math.abs(sy)], Vt: M.rot2(theta), V: M.rot2(-theta), phi, theta, reflect };
  };

  /* ---------- 3×3 & rotations ---------- */
  M.det3 = A =>
    A[0][0] * (A[1][1] * A[2][2] - A[1][2] * A[2][1]) -
    A[0][1] * (A[1][0] * A[2][2] - A[1][2] * A[2][0]) +
    A[0][2] * (A[1][0] * A[2][1] - A[1][1] * A[2][0]);
  M.hat = w => [[0, -w[2], w[1]], [w[2], 0, -w[0]], [-w[1], w[0], 0]];
  M.vee = W => [W[2][1], W[0][2], W[1][0]];
  M.trace = A => A.reduce((s, r, i) => s + r[i], 0);

  M.expSO3 = w => {
    const th = M.norm(w), W = M.hat(w), W2 = M.mul(W, W);
    let A, B;
    if (th < 1e-6) { A = 1 - th * th / 6; B = 0.5 - th * th / 24; }
    else { A = Math.sin(th) / th; B = (1 - Math.cos(th)) / (th * th); }
    return M.madd(M.madd(M.eye(3), M.mscale(W, A)), M.mscale(W2, B));
  };
  M.logSO3 = R => {
    const c = M.clamp((M.trace(R) - 1) / 2, -1, 1), th = Math.acos(c);
    if (th < 1e-6) return M.vee(M.mscale(M.madd(R, M.mscale(M.T(R), -1)), 0.5));
    if (Math.PI - th < 1e-4) {
      // near π: u uᵀ = ((R + Rᵀ)/2 − cosθ I) / (1 − cosθ); take the column with the largest diagonal
      const B = M.mscale(M.madd(M.mscale(M.madd(R, M.T(R)), 0.5), M.mscale(M.eye(3), -c)), 1 / (1 - c));
      let k = 0; if (B[1][1] > B[k][k]) k = 1; if (B[2][2] > B[k][k]) k = 2;
      let axis = M.normalize([B[0][k], B[1][k], B[2][k]]);
      // (R - Rᵀ) = 2 sinθ [u]× still carries the sign of the axis for θ slightly below π
      const s = M.vee(M.madd(R, M.mscale(M.T(R), -1)));
      if (M.dot(axis, s) < 0) axis = M.scale(axis, -1);
      return M.scale(axis, th);
    }
    return M.scale(M.vee(M.madd(R, M.mscale(M.T(R), -1))), th / (2 * Math.sin(th)));
  };
  // left Jacobian V of SE(3) exp
  M.V3 = w => {
    const th = M.norm(w), W = M.hat(w), W2 = M.mul(W, W);
    let B, C;
    if (th < 1e-6) { B = 0.5 - th * th / 24; C = 1 / 6 - th * th / 120; }
    else { B = (1 - Math.cos(th)) / (th * th); C = (th - Math.sin(th)) / (th * th * th); }
    return M.madd(M.madd(M.eye(3), M.mscale(W, B)), M.mscale(W2, C));
  };
  // twist xi = [w, v] (6-vector, rotation first) → pose {R, t}
  M.expSE3 = xi => {
    const w = xi.slice(0, 3), v = xi.slice(3, 6);
    return { R: M.expSO3(w), t: M.mv(M.V3(w), v) };
  };
  M.logSE3 = ({ R, t }) => {
    const w = M.logSO3(R), th = M.norm(w), W = M.hat(w), W2 = M.mul(W, W);
    let D;
    if (th < 1e-6) D = 1 / 12;
    else D = (1 - (th * Math.sin(th)) / (2 * (1 - Math.cos(th)))) / (th * th);
    const Vinv = M.madd(M.madd(M.eye(3), M.mscale(W, -0.5)), M.mscale(W2, D));
    return w.concat(M.mv(Vinv, t));
  };
  M.composeSE3 = (A, B) => ({ R: M.mul(A.R, B.R), t: M.add(M.mv(A.R, B.t), A.t) });
  M.invSE3 = A => { const Rt = M.T(A.R); return { R: Rt, t: M.scale(M.mv(Rt, A.t), -1) }; };
  M.rotX = a => [[1, 0, 0], [0, Math.cos(a), -Math.sin(a)], [0, Math.sin(a), Math.cos(a)]];
  M.rotY = a => [[Math.cos(a), 0, Math.sin(a)], [0, 1, 0], [-Math.sin(a), 0, Math.cos(a)]];
  M.rotZ = a => [[Math.cos(a), -Math.sin(a), 0], [Math.sin(a), Math.cos(a), 0], [0, 0, 1]];
  // ZYX (yaw-pitch-roll) Euler → R
  M.eulerZYX = (yaw, pitch, roll) => M.mul(M.mul(M.rotZ(yaw), M.rotY(pitch)), M.rotX(roll));

  /* ---------- dense linear algebra (n×n solve / inverse / determinant, symmetric eigen-solver, damped least squares) ---------- */
  M.zeros = (r, c) => Array.from({ length: r }, () => new Array(c).fill(0));
  // solve A x = b (A n×n) by Gaussian elimination with partial pivoting; b may be a vector or an n×m matrix. Returns null if singular.
  M.solve = (A, b) => {
    const n = A.length, vec = !Array.isArray(b[0]);
    const B = vec ? b.map(x => [x]) : b.map(r => r.slice());
    const m = B[0].length, a = A.map((r, i) => r.concat(B[i]));
    for (let c = 0; c < n; c++) {
      let p = c;
      for (let r = c + 1; r < n; r++) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r;
      if (Math.abs(a[p][c]) < 1e-12) return null;
      [a[c], a[p]] = [a[p], a[c]];
      for (let r = c + 1; r < n; r++) {
        const f = a[r][c] / a[c][c];
        if (f) for (let k = c; k < n + m; k++) a[r][k] -= f * a[c][k];
      }
    }
    const X = M.zeros(n, m);
    for (let j = 0; j < m; j++) for (let i = n - 1; i >= 0; i--) {
      let s = a[i][n + j];
      for (let k = i + 1; k < n; k++) s -= a[i][k] * X[k][j];
      X[i][j] = s / a[i][i];
    }
    return vec ? X.map(r => r[0]) : X;
  };
  M.inv = A => M.solve(A, M.eye(A.length));
  M.det = A => {
    const n = A.length, a = A.map(r => r.slice());
    let d = 1;
    for (let c = 0; c < n; c++) {
      let p = c;
      for (let r = c + 1; r < n; r++) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r;
      if (Math.abs(a[p][c]) < 1e-14) return 0;
      if (p !== c) { [a[c], a[p]] = [a[p], a[c]]; d = -d; }
      d *= a[c][c];
      for (let r = c + 1; r < n; r++) { const f = a[r][c] / a[c][c]; for (let k = c; k < n; k++) a[r][k] -= f * a[c][k]; }
    }
    return d;
  };
  // symmetric eigen-decomposition (cyclic Jacobi): { values (descending), vectors (columns of V as rows of Vt) }
  M.eigSym = S => {
    const n = S.length, A = S.map(r => r.slice()), V = M.eye(n);
    for (let sweep = 0; sweep < 60; sweep++) {
      let off = 0;
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) off += A[i][j] * A[i][j];
      if (off < 1e-22) break;
      for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) {
        if (Math.abs(A[p][q]) < 1e-30) continue;
        const th = (A[q][q] - A[p][p]) / (2 * A[p][q]);
        const t = Math.sign(th || 1) / (Math.abs(th) + Math.sqrt(th * th + 1)), c = 1 / Math.sqrt(t * t + 1), s = t * c;
        for (let k = 0; k < n; k++) { const akp = A[k][p], akq = A[k][q]; A[k][p] = c * akp - s * akq; A[k][q] = s * akp + c * akq; }
        for (let k = 0; k < n; k++) { const apk = A[p][k], aqk = A[q][k]; A[p][k] = c * apk - s * aqk; A[q][k] = s * apk + c * aqk; }
        for (let k = 0; k < n; k++) { const vkp = V[k][p], vkq = V[k][q]; V[k][p] = c * vkp - s * vkq; V[k][q] = s * vkp + c * vkq; }
      }
    }
    const idx = A.map((_, i) => i).sort((a, b) => A[b][b] - A[a][a]);
    return { values: idx.map(i => A[i][i]), vectors: idx.map(i => V.map(r => r[i])) }; // vectors[k] = k-th eigenvector
  };
  // damped least-squares solve of J dq = e :  dq = Jᵀ (J Jᵀ + λ² I)⁻¹ e   (λ = 0 → pseudo-inverse for full row rank J)
  M.dls = (J, e, lam = 0) => {
    const JJt = M.mul(J, M.T(J));
    for (let i = 0; i < JJt.length; i++) JJt[i][i] += lam * lam + 1e-12;
    const y = M.solve(JJt, e);
    return y ? M.mv(M.T(J), y) : new Array(J[0].length).fill(0);
  };

  /* ---------- LaTeX helpers ---------- */
  M.texMat = (A, d = 2) => '\\begin{bmatrix}' + A.map(r => r.map(x => M.tex(x, d)).join(' & ')).join(' \\\\ ') + '\\end{bmatrix}';
  M.texVec = (v, d = 2) => '\\begin{bmatrix}' + v.map(x => M.tex(x, d)).join(' \\\\ ') + '\\end{bmatrix}';

  window.R101 = window.R101 || {};
  window.R101.M = M;
})();
