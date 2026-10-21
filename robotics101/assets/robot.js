/* Robotics for Beginners — R101.Robot: shared kinematics helpers for Part II.
   Needs math.js (R101.M). Conventions: twist / screw = [ω; v] (rotation first), z-up, poses are {R, t} (R as rows).
   (The dense linear algebra it relies on — M.solve, inv, det, eigSym, dls, zeros — now lives in math.js.)

   Planar:  Robot.planarFK(L, th) -> joint points [p0..pn];  Robot.planarJ(pts) -> 2×n position Jacobian (z × lever arm)
            Robot.drawPlanar(P, pts, {colors, alpha, ghost}) draws a serial arm on a Plane2D
   Spatial: Robot.arm6 — an elbow arm with a roll-pitch-roll wrist, defined by screw axes S_i and home pose M.
            Robot.fk(arm, q) -> pose, Robot.jointPoints(arm, q) -> [base, shoulder, elbow, wrist, tool]
            Robot.Ad(T) -> 6×6, Robot.jacSpace(S, q) -> 6×n, Robot.jacBody(S, M, q), Robot.drawArm(V, arm, q, opts) on a View3D
            Robot.bodyError(Tcur, Tdes) -> 6-vector log(Tcur⁻¹ Tdes) in the body frame; Robot.ikStep(...) one damped-LS update */
(function () {
  const R = (window.R101 = window.R101 || {});
  const M = R.M;
  const Robot = (R.Robot = {});

  /* ---------- planar chains ---------- */
  Robot.planarFK = (L, th) => {
    const pts = [[0, 0]]; let phi = 0;
    for (let i = 0; i < L.length; i++) { phi += th[i]; const q = pts[i]; pts.push([q[0] + L[i] * Math.cos(phi), q[1] + L[i] * Math.sin(phi)]); }
    return pts;
  };
  // 2×n position Jacobian: column i = ẑ × (p_tip − p_i)
  Robot.planarJ = pts => {
    const tip = pts[pts.length - 1], cols = pts.slice(0, -1).map(q => [-(tip[1] - q[1]), tip[0] - q[0]]);
    return [cols.map(c => c[0]), cols.map(c => c[1])];
  };
  Robot.drawPlanar = (P, pts, o = {}) => {
    const n = pts.length - 1, a = o.alpha != null ? o.alpha : 1, JC = o.colors || ['i', 'j', 'k', 'w', 'x'];
    for (let k = 0; k < n; k++) P.line(pts[k], pts[k + 1], { color: o.linkColor || 'text-2', width: o.width || 9 - Math.min(5, 1.4 * k), alpha: 0.85 * a });
    if (!o.ghost && !o.noBase) P.poly([[-0.2, -0.15], [0.2, -0.15], [0, 0.05]], { fill: 'axis', fillAlpha: 0.6 });
    for (let k = 0; k < n; k++) P.point(pts[k], { color: 'canvas', r: 6, stroke: JC[k % JC.length], strokeWidth: 2.6, alpha: a });
    if (!o.noTip) P.point(pts[n], { color: o.tipColor || 'v', r: 5, alpha: a });
  };

  /* ---------- SE(3) helpers ---------- */
  // 6×6 adjoint of T = {R, t} for twists [ω; v]:  [[R, 0], [[t]× R, R]]
  Robot.Ad = T => {
    const tx = M.mul(M.hat(T.t), T.R);
    return [0, 1, 2].map(i => T.R[i].concat([0, 0, 0])).concat([0, 1, 2].map(i => tx[i].concat(T.R[i])));
  };
  Robot.apply = (T, p) => M.add(M.mv(T.R, p), T.t);
  Robot.I = () => ({ R: M.eye(3), t: [0, 0, 0] });
  // exp of the screw axis S times angle/length th
  Robot.expS = (S, th) => M.expSE3(M.scale(S, th));
  // product of exponentials: e^{S1 q1} ... e^{Sn qn} M
  Robot.poe = (S, Mh, q) => {
    let T = Robot.I();
    for (let i = 0; i < S.length; i++) T = M.composeSE3(T, Robot.expS(S[i], q[i]));
    return M.composeSE3(T, Mh);
  };
  // space Jacobian: column i = Ad(e^{S1 q1}...e^{S(i-1) q(i-1)}) S_i, returned as 6×n (rows)
  Robot.jacSpace = (S, q) => {
    const n = S.length, cols = []; let T = Robot.I();
    for (let i = 0; i < n; i++) { cols.push(M.mv(Robot.Ad(T), S[i])); T = M.composeSE3(T, Robot.expS(S[i], q[i])); }
    return M.T(cols);
  };
  // body Jacobian J_b = Ad(T⁻¹) J_s, with T = FK(q)
  Robot.jacBody = (S, Mh, q) => M.mul(Robot.Ad(M.invSE3(Robot.poe(S, Mh, q))), Robot.jacSpace(S, q));
  // body-frame error twist taking Tcur to Tdes: log(Tcur⁻¹ Tdes) = [ω; v]
  Robot.bodyError = (Tcur, Tdes) => M.logSE3(M.composeSE3(M.invSE3(Tcur), Tdes));
  // one damped-least-squares IK step on the body error (target pose Td); returns { dq, err (6), J }
  Robot.ikStep = (arm, q, Td, lam = 0.05) => {
    const T = Robot.fk(arm, q), err = Robot.bodyError(T, Td), J = Robot.jacBody(arm.S, arm.M, q);
    return { dq: M.dls(J, err, lam), err, J, T };
  };
  Robot.wrap = a => a - 2 * Math.PI * Math.floor((a + Math.PI) / (2 * Math.PI));

  /* ---------- the preset 6R arm ----------
     Home pose: the arm lies stretched along +x at height d1, tool frame aligned with the base frame.
     J1 yaw (z) · J2 shoulder pitch (y) · J3 elbow pitch (y) · J4 wrist roll (x) · J5 wrist pitch (y) · J6 tool roll (x).
     Positive pitch about +y tips the +x direction DOWN (right-hand rule), so the demo posture q0 uses negative J2. */
  const d1 = 0.5, l1 = 0.9, l2 = 0.8, d6 = 0.3, a = l1 + l2;
  const rev = (w, q) => w.concat(M.scale(M.cross(w, q), -1));
  Robot.arm6 = {
    name: '6R',
    dims: { d1, l1, l2, d6 },
    S: [rev([0, 0, 1], [0, 0, 0]), rev([0, 1, 0], [0, 0, d1]), rev([0, 1, 0], [l1, 0, d1]),
        rev([1, 0, 0], [a, 0, d1]), rev([0, 1, 0], [a, 0, d1]), rev([1, 0, 0], [a, 0, d1])],
    M: { R: M.eye(3), t: [a + d6, 0, d1] },
    // resting joint points in the home pose: base, shoulder, elbow, wrist center, tool
    home: [[0, 0, 0], [0, 0, d1], [l1, 0, d1], [a, 0, d1], [a + d6, 0, d1]],
    // which screw index moves each link point (point k is carried by joints 1..k)
    carry: [0, 2, 3, 4, 6],
    q0: [0.4, -0.7, 1.2, 0, 0.9, 0],
    limits: [[-3.1, 3.1], [-2.4, 0.9], [-2.6, 2.6], [-3.1, 3.1], [-2.2, 2.2], [-3.1, 3.1]]
  };
  Robot.fk = (arm, q) => Robot.poe(arm.S, arm.M, q);
  // positions of [base, shoulder, elbow, wrist center, tool] — each carried by the first (carry[k]) joints
  Robot.jointPoints = (arm, q) => arm.home.map((p, k) => {
    let T = Robot.I();
    for (let i = 0; i < arm.carry[k]; i++) T = M.composeSE3(T, Robot.expS(arm.S[i], q[i]));
    return Robot.apply(T, p);
  });
  // joint frames (pose of the frame carried by link k at config q), k = 0..n (0 = base)
  Robot.linkPoses = (arm, q) => {
    const out = []; let T = Robot.I();
    for (let i = 0; i <= arm.S.length; i++) { out.push(T); if (i < arm.S.length) T = M.composeSE3(T, Robot.expS(arm.S[i], q[i])); }
    return out;
  };
  // draw the arm on a View3D. o: { alpha, ghost, frame (draw tool frame), axes (draw joint axes), colors (per-joint colors) }
  Robot.drawArm = (V, arm, q, o = {}) => {
    const pts = Robot.jointPoints(arm, q), a = o.alpha != null ? o.alpha : 1, wd = [10, 9, 8, 6];
    for (let k = 0; k < 4; k++) V.line(pts[k], pts[k + 1], { color: o.linkColor || 'text-2', width: o.ghost ? 5 : wd[k], alpha: 0.85 * a });
    if (!o.ghost) {
      V.line([-0.28, -0.28, 0], [0.28, -0.28, 0], { color: 'axis', width: 2, alpha: 0.6 });
      V.line([0, 0, 0], pts[1], { color: 'axis', width: 14, alpha: 0.5 });
    }
    const jc = o.colors || ['w', 'x', 'x', 'i', 'j', 'k'];
    // joint markers: J1, J2 at shoulder; J3 at elbow; J4-J6 at the wrist center
    const at = [pts[0], pts[1], pts[2], pts[3], pts[3], pts[3]];
    if (o.axes) {
      const T = Robot.linkPoses(arm, q);
      arm.S.forEach((S, i) => {
        const w = M.mv(T[i].R, S.slice(0, 3)), c = at[i];
        V.line(M.add(c, M.scale(w, -0.3)), M.add(c, M.scale(w, 0.3)), { color: jc[i], width: 2.2, alpha: 0.9 * a, dash: [4, 3] });
      });
    }
    [1, 2, 3].forEach(k => V.point(pts[k], { color: 'canvas', r: 7 - k, stroke: jc[k], alpha: a }));
    V.point(pts[4], { color: o.tipColor || 'v', r: 5, stroke: 'canvas', alpha: a });
    if (o.frame && !o.ghost) V.frame(Robot.fk(arm, q), { scale: o.frameScale || 0.45, width: 3 });
    return pts;
  };
})();
