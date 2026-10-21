/* Robotics for Beginners — R101.Vision: shared camera-geometry helpers for Part III.
   Needs math.js (R101.M). Conventions:
     world frame: z up, right-handed (as everywhere in the course); poses are {R, t} (R as rows).
     camera frame: OpenCV optical frame — x right, y DOWN, z forward. A camera is
       cam = { K: {fx, fy, cx, cy, s?}, T: {R, t} (= T_wc, the camera pose in the world), w, h (image size, px) }.
     pixel (u, v): u to the right, v DOWN (origin top-left). u = fx·x/z + s·y/z + cx, v = fy·y/z + cy.
     To draw an image with Plane2D use world y = −v (or P.setView + flip) so that the picture is not upside down.
   Also adds a general SVD to R101.M (one-sided Jacobi): M.svd(A) -> {U, S, V}, M.nullvec(A).

   Cameras:   Vision.lookAt(eye, target, up?) -> T_wc;  Vision.makeCam({f|fx,fy, w,h, eye,target | T}) ;  Vision.Kmat(cam);  Vision.Pmat(cam) (3×4, world → pixel)
              Vision.toCam(cam, X);  Vision.project(cam, X, dist?) -> [u, v, z];  Vision.ray(cam, [u,v]) -> {o, d};  Vision.backproject(cam, [u,v], depth) -> world point
              Vision.distort(k, xn, yn) / Vision.undistort(k, xd, yd) with k = [k1, k2, k3, p1, p2] (Brown–Conrady, normalized coordinates)
   Drawing:   Vision.frustum(V, cam, {depth, color, alpha, width, label}) on a View3D (camera center, image-plane rectangle, "up" tick, optional axes)
   Scenes:    Vision.box(center, size) -> {pts, edges};  Vision.checkerboard(nx, ny, sq, z0?) -> points on a plane;  Vision.randomPoints(n, lo, hi, seed)
   Algorithms (all verified against synthetic data in node):
              Vision.dltHomography(src2, dst2) -> 3×3 (Hartley-normalized);  Vision.applyH(H, p)
              Vision.dltProjection(X3, x2) -> 3×4 P;  Vision.decomposeP(P) -> {K, R, t, C}
              Vision.essential8(xn1, xn2) -> E (normalized image coordinates, ≥ 8 points);  Vision.fundamental8(u1, u2) -> F (pixels, Hartley-normalized, rank 2)
              Vision.decomposeE(E) -> 4 candidates [{R, t}];  Vision.triangulateDLT([P1, P2, ...], [x1, x2, ...]) -> X;  Vision.triangulateMid(o1, d1, o2, d2) -> X
              Vision.kabsch(A, B, withScale?) -> {R, t, s} minimizing Σ‖s R a_i + t − b_i‖²
              Vision.ransac({n, sampleSize, fit(idx) -> model|null, error(model, i) -> number, thresh, iters, seed}) -> {model, inliers, iters, best[]} */
(function () {
  const R = (window.R101 = window.R101 || {});
  const M = R.M;
  const V = (R.Vision = {});

  /* ---------- general SVD (one-sided Jacobi) ---------- */
  // A is m×n (rows). Returns U (m×k), S (k, descending), V (n×k) with k = min(m, n) and A = U diag(S) Vᵀ.
  M.svd = A => {
    const m = A.length, n = A[0].length;
    if (m < n) { const r = M.svd(M.T(A)); return { U: r.V, S: r.S, V: r.U }; }
    const U = A.map(r => r.slice()), Vm = M.eye(n);
    for (let sweep = 0; sweep < 60; sweep++) {
      let rot = 0;
      for (let p = 0; p < n - 1; p++) for (let q = p + 1; q < n; q++) {
        let a = 0, b = 0, c = 0;
        for (let i = 0; i < m; i++) { a += U[i][p] * U[i][p]; b += U[i][q] * U[i][q]; c += U[i][p] * U[i][q]; }
        if (Math.abs(c) <= 1e-15 * Math.sqrt(a * b) || Math.abs(c) < 1e-300) continue;
        rot++;
        const zeta = (b - a) / (2 * c), t = Math.sign(zeta || 1) / (Math.abs(zeta) + Math.sqrt(1 + zeta * zeta)), cs = 1 / Math.sqrt(1 + t * t), sn = cs * t;
        for (let i = 0; i < m; i++) { const up = U[i][p], uq = U[i][q]; U[i][p] = cs * up - sn * uq; U[i][q] = sn * up + cs * uq; }
        for (let i = 0; i < n; i++) { const vp = Vm[i][p], vq = Vm[i][q]; Vm[i][p] = cs * vp - sn * vq; Vm[i][q] = sn * vp + cs * vq; }
      }
      if (!rot) break;
    }
    const S = [];
    for (let j = 0; j < n; j++) { let s = 0; for (let i = 0; i < m; i++) s += U[i][j] * U[i][j]; S.push(Math.sqrt(s)); }
    const idx = S.map((_, j) => j).sort((x, y) => S[y] - S[x]);
    return {
      U: U.map(r => idx.map(j => (S[j] > 1e-300 ? r[j] / S[j] : 0))),
      S: idx.map(j => S[j]),
      V: Vm.map(r => idx.map(j => r[j]))
    };
  };
  // right singular vector of the smallest singular value (the least-squares solution of A x = 0, ‖x‖ = 1); works for m < n too
  M.nullvec = A => {
    const n = A[0].length;
    const B = A.map(r => r.slice());
    while (B.length < n) B.push(new Array(n).fill(0));
    const r = M.svd(B);
    return r.V.map(row => row[n - 1]);
  };

  /* ---------- cameras ---------- */
  V.lookAt = (eye, target, up = [0, 0, 1]) => {
    const z = M.normalize(M.sub(target, eye));
    const x = M.normalize(M.cross(z, up));
    const y = M.cross(z, x);
    return { R: [[x[0], y[0], z[0]], [x[1], y[1], z[1]], [x[2], y[2], z[2]]], t: eye.slice() };
  };
  V.makeCam = o => {
    const w = o.w || 640, h = o.h || 480, f = o.f || 500;
    return {
      K: { fx: o.fx || f, fy: o.fy || f, cx: o.cx != null ? o.cx : w / 2, cy: o.cy != null ? o.cy : h / 2, s: o.s || 0 },
      T: o.T || V.lookAt(o.eye, o.target || [0, 0, 0], o.up), w, h
    };
  };
  V.Kmat = c => [[c.K.fx, c.K.s || 0, c.K.cx], [0, c.K.fy, c.K.cy], [0, 0, 1]];
  V.toCam = (c, X) => M.mv(M.T(c.T.R), M.sub(X, c.T.t));
  // 3×4 projection matrix P = K [Rᵀ | −Rᵀ t] (world → homogeneous pixel)
  V.Pmat = c => {
    const Rt = M.T(c.T.R), t = M.scale(M.mv(Rt, c.T.t), -1), K = V.Kmat(c);
    return M.mul(K, Rt.map((r, i) => r.concat([t[i]])));
  };
  V.distort = (k, x, y) => {
    const [k1 = 0, k2 = 0, k3 = 0, p1 = 0, p2 = 0] = k, r2 = x * x + y * y, rad = 1 + k1 * r2 + k2 * r2 * r2 + k3 * r2 * r2 * r2;
    return [x * rad + 2 * p1 * x * y + p2 * (r2 + 2 * x * x), y * rad + p1 * (r2 + 2 * y * y) + 2 * p2 * x * y];
  };
  V.undistort = (k, xd, yd, iters = 20) => {
    let x = xd, y = yd;
    for (let i = 0; i < iters; i++) { const d = V.distort(k, x, y); x -= d[0] - xd; y -= d[1] - yd; }
    return [x, y];
  };
  // returns [u, v, z] with z the depth along the optical axis (z ≤ 0: behind the camera; u, v are then NaN)
  V.project = (c, X, dist) => {
    const p = V.toCam(c, X), z = p[2];
    if (z <= 1e-9) return [NaN, NaN, z];
    let x = p[0] / z, y = p[1] / z;
    if (dist) { const d = V.distort(dist, x, y); x = d[0]; y = d[1]; }
    return [c.K.fx * x + (c.K.s || 0) * y + c.K.cx, c.K.fy * y + c.K.cy, z];
  };
  // viewing ray through pixel (u, v) in world coordinates: {o, d (unit)}
  V.ray = (c, uv, dist) => {
    const y = (uv[1] - c.K.cy) / c.K.fy, x = (uv[0] - c.K.cx - (c.K.s || 0) * y) / c.K.fx;
    const n = dist ? V.undistort(dist, x, y) : [x, y];
    return { o: c.T.t.slice(), d: M.normalize(M.mv(c.T.R, [n[0], n[1], 1])) };
  };
  V.backproject = (c, uv, depth, dist) => {
    const y = (uv[1] - c.K.cy) / c.K.fy, x = (uv[0] - c.K.cx - (c.K.s || 0) * y) / c.K.fx;
    const n = dist ? V.undistort(dist, x, y) : [x, y];
    return M.add(M.mv(c.T.R, [n[0] * depth, n[1] * depth, depth]), c.T.t);
  };

  /* ---------- drawing on a View3D ---------- */
  V.frustum = (V3, c, o = {}) => {
    const d = o.depth || 0.6, col = o.color || 'x', a = o.alpha != null ? o.alpha : 0.9, w = o.width || 1.6;
    const corner = (u, v) => V.backproject(c, [u, v], d);
    const cs = [corner(0, 0), corner(c.w, 0), corner(c.w, c.h), corner(0, c.h)], o3 = c.T.t;
    cs.forEach(p => V3.line(o3, p, { color: col, width: w, alpha: a * 0.7 }));
    V3.polyline(cs.concat([cs[0]]), { color: col, width: w, alpha: a });
    // small "up" triangle on the top edge so the image orientation is readable
    const mid = M.scale(M.add(cs[0], cs[1]), 0.5), tip = M.add(mid, M.scale(M.sub(mid, M.scale(M.add(cs[2], cs[3]), 0.5)), 0.22));
    V3.polyline([cs[0], tip, cs[1]], { color: col, width: w, alpha: a });
    V3.point(o3, { color: col, r: 4, stroke: 'canvas' });
    if (o.axes) V3.frame(c.T, { scale: o.axes === true ? d * 0.5 : o.axes, width: 2.4 });
    if (o.label) V3.text(o.label, o3, { color: col, dx: 8, dy: -10 });
  };

  /* ---------- scenes ---------- */
  V.box = (ctr, size) => {
    const s = Array.isArray(size) ? size : [size, size, size], pts = [];
    for (let i = 0; i < 8; i++) pts.push([ctr[0] + (i & 1 ? 1 : -1) * s[0] / 2, ctr[1] + (i & 2 ? 1 : -1) * s[1] / 2, ctr[2] + (i & 4 ? 1 : -1) * s[2] / 2]);
    const edges = [];
    for (let i = 0; i < 8; i++) for (const b of [1, 2, 4]) if (!(i & b)) edges.push([i, i | b]);
    return { pts, edges };
  };
  V.checkerboard = (nx, ny, sq, z0 = 0) => {
    const pts = [];
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) pts.push([(i - (nx - 1) / 2) * sq, (j - (ny - 1) / 2) * sq, z0]);
    return pts;
  };
  V.randomPoints = (n, lo, hi, seed = 1) => {
    const rnd = M.rng(seed);
    return Array.from({ length: n }, () => [0, 1, 2].map(k => lo[k] + (hi[k] - lo[k]) * rnd()));
  };

  /* ---------- algorithms ---------- */
  // Hartley normalization of 2D points: returns {T (3×3), pts (normalized)}; centroid 0, mean distance √2
  function norm2(pts) {
    const n = pts.length, cx = pts.reduce((s, p) => s + p[0], 0) / n, cy = pts.reduce((s, p) => s + p[1], 0) / n;
    let d = pts.reduce((s, p) => s + Math.hypot(p[0] - cx, p[1] - cy), 0) / n;
    const s = d > 1e-12 ? Math.SQRT2 / d : 1;
    return { T: [[s, 0, -s * cx], [0, s, -s * cy], [0, 0, 1]], pts: pts.map(p => [s * (p[0] - cx), s * (p[1] - cy)]) };
  }
  function norm3(pts) {
    const n = pts.length, c = [0, 1, 2].map(k => pts.reduce((s, p) => s + p[k], 0) / n);
    let d = pts.reduce((s, p) => s + Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2]), 0) / n;
    const s = d > 1e-12 ? Math.sqrt(3) / d : 1;
    return { T: [[s, 0, 0, -s * c[0]], [0, s, 0, -s * c[1]], [0, 0, s, -s * c[2]], [0, 0, 0, 1]], pts: pts.map(p => [s * (p[0] - c[0]), s * (p[1] - c[1]), s * (p[2] - c[2])]) };
  }
  V.applyH = (H, p) => { const w = H[2][0] * p[0] + H[2][1] * p[1] + H[2][2]; return [(H[0][0] * p[0] + H[0][1] * p[1] + H[0][2]) / w, (H[1][0] * p[0] + H[1][1] * p[1] + H[1][2]) / w]; };
  V.dltHomography = (src, dst) => {
    const a = norm2(src), b = norm2(dst), A = [];
    for (let i = 0; i < src.length; i++) {
      const [x, y] = a.pts[i], [u, v] = b.pts[i];
      A.push([-x, -y, -1, 0, 0, 0, u * x, u * y, u]);
      A.push([0, 0, 0, -x, -y, -1, v * x, v * y, v]);
    }
    const h = M.nullvec(A), Hn = [h.slice(0, 3), h.slice(3, 6), h.slice(6, 9)];
    const H = M.mul(M.inv(b.T), M.mul(Hn, a.T));
    const k = H[2][2] || 1;
    return H.map(r => r.map(x => x / k));
  };
  // 3×4 camera matrix from ≥ 6 3D–2D correspondences
  V.dltProjection = (X3, x2) => {
    const a = norm3(X3), b = norm2(x2), A = [];
    for (let i = 0; i < X3.length; i++) {
      const X = a.pts[i].concat([1]), [u, v] = b.pts[i];
      A.push(X.map(x => 0).concat(X.map(x => -x)).concat(X.map(x => v * x)));
      A.push(X.concat(X.map(x => 0)).concat(X.map(x => -u * x)));
    }
    const p = M.nullvec(A), Pn = [p.slice(0, 4), p.slice(4, 8), p.slice(8, 12)];
    const P = M.mul(M.inv(b.T), M.mul(Pn, a.T));
    return P;
  };
  // P = K [R | t] (world → camera: x_c = R X + t) with K upper-triangular, K[2][2] = 1, diag(K) > 0.
  // Returns {K, R (world→camera), t, C (camera center in world), Twc ({R,t} camera pose in the world)}
  V.decomposeP = P => {
    let Mm = P.map(r => r.slice(0, 3)), p4 = P.map(r => r[3]);
    if (M.det3(Mm) < 0) { Mm = M.mscale(Mm, -1); p4 = p4.map(x => -x); }
    const m1 = Mm[0], m2 = Mm[1], m3 = Mm[2];
    const r3 = M.normalize(m3), k33 = M.norm(m3);
    const k23 = M.dot(m2, r3); let r2 = M.sub(m2, M.scale(r3, k23)); const k22 = M.norm(r2); r2 = M.scale(r2, 1 / k22);
    const k13 = M.dot(m1, r3), k12 = M.dot(m1, r2); let r1 = M.sub(M.sub(m1, M.scale(r3, k13)), M.scale(r2, k12)); const k11 = M.norm(r1); r1 = M.scale(r1, 1 / k11);
    const Kr = [[k11, k12, k13], [0, k22, k23], [0, 0, k33]], Rm = [r1, r2, r3];
    const s = Kr[2][2];
    const K = Kr.map(r => r.map(x => x / s)), t = M.mv(M.inv(Kr), p4);
    const C = M.scale(M.mv(M.T(Rm), t), -1);
    return { K, R: Rm, t, C, Twc: { R: M.T(Rm), t: C } };
  };
  // 8-point algorithm on normalized image coordinates (x, y, 1 → pass [x, y]); x2ᵀ E x1 = 0. Enforces singular values (σ, σ, 0).
  V.essential8 = (x1, x2) => {
    const A = x1.map((p, i) => { const q = x2[i]; return [q[0] * p[0], q[0] * p[1], q[0], q[1] * p[0], q[1] * p[1], q[1], p[0], p[1], 1]; });
    const e = M.nullvec(A), E = [e.slice(0, 3), e.slice(3, 6), e.slice(6, 9)];
    const r = M.svd(E), s = (r.S[0] + r.S[1]) / 2;
    return M.mul(M.mul(r.U, [[s, 0, 0], [0, s, 0], [0, 0, 0]]), M.T(r.V));
  };
  // 8-point algorithm with Hartley normalization on pixel coordinates; x2ᵀ F x1 = 0, rank 2, F[2][2] = 1 when possible
  V.fundamental8 = (u1, u2) => {
    const a = norm2(u1), b = norm2(u2);
    const A = a.pts.map((p, i) => { const q = b.pts[i]; return [q[0] * p[0], q[0] * p[1], q[0], q[1] * p[0], q[1] * p[1], q[1], p[0], p[1], 1]; });
    const f = M.nullvec(A), Fn = [f.slice(0, 3), f.slice(3, 6), f.slice(6, 9)];
    const r = M.svd(Fn);
    const F2 = M.mul(M.mul(r.U, [[r.S[0], 0, 0], [0, r.S[1], 0], [0, 0, 0]]), M.T(r.V));
    const F = M.mul(M.T(b.T), M.mul(F2, a.T));
    const k = Math.abs(F[2][2]) > 1e-12 ? F[2][2] : M.norm(F.flat());
    return F.map(r => r.map(x => x / k));
  };
  // four (R, t) candidates from E = [t]× R with x2 = R x1 + t convention (‖t‖ = 1): choose the one with positive depth (cheirality) yourself
  V.decomposeE = E => {
    const r = M.svd(E);
    let U = r.U, Vv = r.V;
    if (M.det3(U) < 0) U = U.map(row => [row[0], row[1], -row[2]]);
    if (M.det3(Vv) < 0) Vv = Vv.map(row => [row[0], row[1], -row[2]]);
    const W = [[0, -1, 0], [1, 0, 0], [0, 0, 1]], u3 = U.map(row => row[2]), out = [];
    for (const Wm of [W, M.T(W)]) {
      const Rm = M.mul(M.mul(U, Wm), M.T(Vv));
      for (const sg of [1, -1]) out.push({ R: Rm, t: M.scale(u3, sg) });
    }
    return out;
  };
  // linear (DLT) triangulation from ≥ 2 views: Ps = 3×4 matrices, xs = pixel points [u, v]
  V.triangulateDLT = (Ps, xs) => {
    const A = [];
    Ps.forEach((P, i) => { const [u, v] = xs[i]; A.push(P[0].map((p, j) => u * P[2][j] - p)); A.push(P[1].map((p, j) => v * P[2][j] - p)); });
    const X = M.nullvec(A);
    return [X[0] / X[3], X[1] / X[3], X[2] / X[3]];
  };
  // midpoint of the shortest segment between two rays (o + s d)
  V.triangulateMid = (o1, d1, o2, d2) => {
    const w = M.sub(o1, o2), a = M.dot(d1, d1), b = M.dot(d1, d2), c = M.dot(d2, d2), d = M.dot(d1, w), e = M.dot(d2, w), den = a * c - b * b;
    const s = den > 1e-12 ? (b * e - c * d) / den : 0, t = den > 1e-12 ? (a * e - b * d) / den : e / c;
    return M.scale(M.add(M.add(o1, M.scale(d1, s)), M.add(o2, M.scale(d2, t))), 0.5);
  };
  // least-squares similarity transform B ≈ s R A + t (Kabsch / Umeyama); A, B are arrays of 3-vectors (2-vectors work too: use dimension-generic code)
  V.kabsch = (A, B, withScale = false) => {
    const n = A.length, d = A[0].length;
    const ca = [...Array(d).keys()].map(k => A.reduce((s, p) => s + p[k], 0) / n), cb = [...Array(d).keys()].map(k => B.reduce((s, p) => s + p[k], 0) / n);
    const a = A.map(p => M.sub(p, ca)), b = B.map(p => M.sub(p, cb));
    const H = M.zeros(d, d);
    for (let i = 0; i < n; i++) for (let r = 0; r < d; r++) for (let c = 0; c < d; c++) H[r][c] += a[i][r] * b[i][c];
    const sv = M.svd(H), Dm = M.eye(d);
    // rank-deficient H (e.g. exactly 3 points, or coplanar sets): the SVD leaves a zero column in U; complete it with the cross product (3D)
    if (d === 3 && sv.S[2] < 1e-12 * Math.max(sv.S[0], 1e-300)) {
      const u0 = sv.U.map(r => r[0]), u1 = sv.U.map(r => r[1]), c = M.cross(u0, u1);
      sv.U = sv.U.map((r, i) => [r[0], r[1], c[i]]);
    }
    // R = V diag(1,…,det(V Uᵀ)) Uᵀ  (proper rotation)
    Dm[d - 1][d - 1] = M.det(M.mul(sv.V, M.T(sv.U))) < 0 ? -1 : 1;
    const Rm = M.mul(M.mul(sv.V, Dm), M.T(sv.U));
    let s = 1;
    if (withScale) {
      const va = a.reduce((acc, p) => acc + M.dot(p, p), 0);
      s = (sv.S.reduce((acc, x, i) => acc + x * Dm[i][i], 0)) / va;
    }
    const t = M.sub(cb, M.scale(M.mv(Rm, ca), s));
    return { R: Rm, t, s };
  };
  // generic RANSAC. fit(idx[]) -> model or null; error(model, i) -> residual. Returns the best model with its inlier list.
  V.ransac = o => {
    const rnd = M.rng(o.seed || 7), best = { model: null, inliers: [], iters: 0, history: [] };
    const maxIt = o.iters || 200;
    for (let it = 0; it < maxIt; it++) {
      const idx = new Set();
      while (idx.size < o.sampleSize) idx.add(Math.floor(rnd() * o.n));
      const model = o.fit([...idx]);
      if (!model) continue;
      const inl = [];
      for (let i = 0; i < o.n; i++) if (o.error(model, i) < o.thresh) inl.push(i);
      best.history.push(inl.length);
      if (inl.length > best.inliers.length) { best.model = model; best.inliers = inl; best.iters = it + 1; }
    }
    return best;
  };
})();
