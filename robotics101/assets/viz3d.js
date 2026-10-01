/* Robotics for Beginners — View3D: a dependency-free 3D canvas (z-up, orbit camera, painter's algorithm).
   Good for frames, arrows, trajectories, wireframe ellipsoids and translucent polygons.
   Usage:
     const V = new R101.View3D(wrapEl, { height: 460, dist: 9, yaw: -0.9, pitch: 0.45, draw: V => { V.grid(); V.frame(I); } });
*/
(function () {
  const R = (window.R101 = window.R101 || {});

  class View3D {
    constructor(wrap, opts = {}) {
      this.wrap = typeof wrap === 'string' ? document.querySelector(wrap) : wrap;
      this.opts = opts;
      this.cam = { yaw: opts.yaw != null ? opts.yaw : -0.9, pitch: opts.pitch != null ? opts.pitch : 0.42, dist: opts.dist || 9, target: opts.target || [0, 0, 0], fov: opts.fov || 0.75 };
      this.drawFn = opts.draw || (() => {});
      this.canvas = document.createElement('canvas');
      this.wrap.appendChild(this.canvas);
      this.wrap.classList.add('no-scroll');
      this.ctx = this.canvas.getContext('2d');
      this.prims = [];
      this.spin = !!opts.spin;
      this._raf = 0;
      this.resize();
      new ResizeObserver(() => this.resize()).observe(this.wrap);
      this._wire();
      R.on && R.on('theme', () => this.invalidate());
      R.on && R.on('lang', () => this.invalidate());
      R.on && R.on('hl', () => this.invalidate());
      if (this.spin) this._spinLoop();
    }

    resize() {
      const w = this.wrap.clientWidth || 600;
      let h = this.opts.height || 440;
      if (this.opts.aspect) h = Math.round(w * this.opts.aspect);
      if (this.opts.minHeight) h = Math.max(this.opts.minHeight, h);
      if (this.opts.maxHeight) h = Math.min(this.opts.maxHeight, h);
      this.wrap.style.height = h + 'px';
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      this.W = w; this.H = h; this.dpr = dpr;
      this.canvas.width = Math.round(w * dpr); this.canvas.height = Math.round(h * dpr);
      this.canvas.style.width = w + 'px'; this.canvas.style.height = h + 'px';
      this.invalidate();
    }

    _basis() {
      const { yaw, pitch, dist, target } = this.cam;
      const dir = [Math.cos(pitch) * Math.cos(yaw), Math.cos(pitch) * Math.sin(yaw), Math.sin(pitch)];
      const eye = [target[0] + dist * dir[0], target[1] + dist * dir[1], target[2] + dist * dir[2]];
      const f = [-dir[0], -dir[1], -dir[2]];
      let r = [f[1] * 1 - f[2] * 0, f[2] * 0 - f[0] * 1, 0]; // f × z
      const rn = Math.hypot(r[0], r[1], r[2]) || 1; r = r.map(x => x / rn);
      const u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
      return { eye, f, r, u };
    }
    // project world point → [sx, sy, depth] (depth <= 0 means behind the camera)
    project(p) {
      const B = this._b;
      const d = [p[0] - B.eye[0], p[1] - B.eye[1], p[2] - B.eye[2]];
      const x = d[0] * B.r[0] + d[1] * B.r[1] + d[2] * B.r[2];
      const y = d[0] * B.u[0] + d[1] * B.u[1] + d[2] * B.u[2];
      const z = d[0] * B.f[0] + d[1] * B.f[1] + d[2] * B.f[2];
      const foc = (Math.min(this.W, this.H) / 2) / Math.tan(this.cam.fov / 2);
      return [this.W / 2 + (foc * x) / z, this.H / 2 - (foc * y) / z, z];
    }

    invalidate(now) {
      if (now) { this._render(); return; }
      if (this._raf) return;
      this._raf = requestAnimationFrame(() => { this._raf = 0; this._render(); });
    }
    _render() {
      const c = this.ctx;
      c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      c.fillStyle = R.color('canvas');
      c.fillRect(0, 0, this.W, this.H);
      c.lineCap = 'round'; c.lineJoin = 'round';
      this._b = this._basis();
      this.prims = [];
      this.bg = [];
      this.overlay = [];
      this.drawFn(this);
      this.bg.forEach(p => p.draw(c));
      this.prims.sort((a, b) => b.z - a.z).forEach(p => p.draw(c));
      this.overlay.forEach(p => p.draw(c));
    }
    col(name) { return name && (name.startsWith('#') || name.startsWith('rgb') || name.startsWith('hsl')) ? name : R.color(name || 'text'); }
    _push(z, draw, layer) { (layer === 'bg' ? this.bg : layer === 'overlay' ? this.overlay : this.prims).push({ z, draw }); }

    /* ---------- primitives ---------- */
    line(a, b, o = {}) {
      const A = this.project(a), B = this.project(b);
      if (A[2] < 0.05 || B[2] < 0.05) return;
      const color = this.col(o.color || 'axis');
      this._push((A[2] + B[2]) / 2, c => {
        c.save();
        c.strokeStyle = color; c.lineWidth = o.width || 1.5; c.globalAlpha = o.alpha != null ? o.alpha : 1;
        if (o.dash) c.setLineDash(o.dash);
        c.beginPath(); c.moveTo(A[0], A[1]); c.lineTo(B[0], B[1]); c.stroke();
        c.restore();
      }, o.layer);
    }
    polyline(pts, o = {}) { for (let i = 0; i + 1 < pts.length; i++) this.line(pts[i], pts[i + 1], o); }
    arrow(a, b, o = {}) {
      const A = this.project(a), B = this.project(b);
      if (A[2] < 0.05 || B[2] < 0.05) return;
      const color = this.col(o.color || 'v');
      const w = o.width || 3;
      this._push(Math.min(A[2], B[2]) - (o.bias || 0), c => {
        const dx = B[0] - A[0], dy = B[1] - A[1], len = Math.hypot(dx, dy);
        const head = Math.min(o.head || 10 + w, len * 0.5);
        c.save();
        c.globalAlpha = o.alpha != null ? o.alpha : 1;
        c.strokeStyle = c.fillStyle = color; c.lineWidth = w;
        if (len > 0.5) {
          const ux = dx / len, uy = dy / len;
          if (o.dash) c.setLineDash(o.dash);
          c.beginPath(); c.moveTo(A[0], A[1]); c.lineTo(B[0] - ux * head * 0.8, B[1] - uy * head * 0.8); c.stroke();
          c.setLineDash([]);
          c.beginPath(); c.moveTo(B[0], B[1]);
          c.lineTo(B[0] - ux * head - uy * head * 0.42, B[1] - uy * head + ux * head * 0.42);
          c.lineTo(B[0] - ux * head + uy * head * 0.42, B[1] - uy * head - ux * head * 0.42);
          c.closePath(); c.fill();
        }
        c.restore();
        if (o.label) this._label(c, o.label, B[0] + 6, B[1] - 6, o.labelColor || o.color || 'v', o.labelSize || 14);
      }, o.layer);
    }
    point(p, o = {}) {
      const P = this.project(p);
      if (P[2] < 0.05) return;
      const color = this.col(o.color || 'v');
      this._push(P[2] - (o.bias || 0), c => {
        c.save(); c.globalAlpha = o.alpha != null ? o.alpha : 1;
        c.beginPath(); c.arc(P[0], P[1], o.r || 4, 0, Math.PI * 2); c.fillStyle = color; c.fill();
        if (o.stroke) { c.strokeStyle = this.col(o.stroke); c.lineWidth = 1.5; c.stroke(); }
        c.restore();
        if (o.label) this._label(c, o.label, P[0] + 7, P[1] - 7, o.labelColor || o.color || 'v', o.labelSize || 13);
      }, o.layer);
    }
    poly(pts, o = {}) {
      const P = pts.map(p => this.project(p));
      if (P.some(q => q[2] < 0.05)) return;
      const z = P.reduce((s, q) => s + q[2], 0) / P.length;
      this._push(z + (o.bias || 0), c => {
        c.save();
        c.beginPath(); P.forEach((q, i) => (i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]))); c.closePath();
        if (o.fill) { c.fillStyle = this.col(o.fill); c.globalAlpha = o.fillAlpha != null ? o.fillAlpha : 0.2; c.fill(); }
        if (o.stroke) { c.globalAlpha = o.alpha != null ? o.alpha : 1; c.strokeStyle = this.col(o.stroke); c.lineWidth = o.width || 1.2; c.stroke(); }
        c.restore();
      }, o.layer);
    }
    text(str, p, o = {}) {
      const P = this.project(p);
      if (P[2] < 0.05) return;
      this._push(P[2] - 100, c => this._label(c, str, P[0] + (o.dx || 0), P[1] + (o.dy || 0), o.color || 'text', o.size || 13, o.align, o.bold !== false), o.layer || 'overlay');
    }
    _label(c, str, x, y, color, size, align, bold = true) {
      c.save();
      c.font = `${bold ? '600 ' : ''}${size}px Inter, 'PingFang SC', 'Microsoft YaHei', sans-serif`;
      c.textAlign = align || 'left'; c.textBaseline = 'middle';
      c.lineWidth = 4; c.strokeStyle = R.color('canvas'); c.globalAlpha = 0.85; c.strokeText(str, x, y);
      c.globalAlpha = 1; c.fillStyle = this.col(color); c.fillText(str, x, y);
      c.restore();
    }
    // ground grid on z = 0
    grid(o = {}) {
      const E = o.extent || 4, s = o.step || 1;
      for (let k = -E; k <= E + 1e-9; k += s) {
        const axis = Math.abs(k) < 1e-9;
        const st = { color: 'grid-2', width: axis ? 1.4 : 1, alpha: axis ? 0.9 : 0.6, layer: 'bg' };
        this.line([k, -E, 0], [k, E, 0], st);
        this.line([-E, k, 0], [E, k, 0], st);
      }
    }
    // coordinate frame: pose {R, t} (R as rows), x/y/z = red/green/blue
    frame(pose, o = {}) {
      const s = o.scale || 1, t = pose.t || [0, 0, 0], Rm = pose.R;
      const cols = ['i', 'j', 'k'], names = o.labels || null;
      for (let j = 0; j < 3; j++) {
        const e = [Rm[0][j] * s + t[0], Rm[1][j] * s + t[1], Rm[2][j] * s + t[2]];
        this.arrow(t, e, { color: cols[j], width: o.width || 3, alpha: o.alpha, label: names ? names[j] : null, head: o.head });
      }
      if (o.name) this.text(o.name, t, { color: o.nameColor || 'text', dx: -8, dy: 14, align: 'right', size: 13 });
    }
    // wireframe image of the unit sphere under 3×3 matrix A, centered at c
    ellipsoid(center, A, o = {}) {
      const map = u => [center[0] + A[0][0] * u[0] + A[0][1] * u[1] + A[0][2] * u[2], center[1] + A[1][0] * u[0] + A[1][1] * u[1] + A[1][2] * u[2], center[2] + A[2][0] * u[0] + A[2][1] * u[1] + A[2][2] * u[2]];
      const nLat = o.lat || 7, nLon = o.lon || 12, seg = 36;
      const st = { color: o.color || 'x', width: o.width || 1, alpha: o.alpha != null ? o.alpha : 0.55 };
      for (let i = 1; i < nLat; i++) {
        const th = (i / nLat) * Math.PI, pts = [];
        for (let k = 0; k <= seg; k++) { const ph = (k / seg) * 2 * Math.PI; pts.push(map([Math.sin(th) * Math.cos(ph), Math.sin(th) * Math.sin(ph), Math.cos(th)])); }
        this.polyline(pts, st);
      }
      for (let i = 0; i < nLon; i++) {
        const ph = (i / nLon) * 2 * Math.PI, pts = [];
        for (let k = 0; k <= seg / 2; k++) { const th = (k / (seg / 2)) * Math.PI; pts.push(map([Math.sin(th) * Math.cos(ph), Math.sin(th) * Math.sin(ph), Math.cos(th)])); }
        this.polyline(pts, st);
      }
    }

    /* ---------- orbit interaction ---------- */
    _wire() {
      const cv = this.canvas;
      let last = null, pinch = null;
      const pts = new Map();
      cv.style.cursor = 'grab';
      cv.addEventListener('pointerdown', e => {
        pts.set(e.pointerId, [e.clientX, e.clientY]);
        cv.setPointerCapture(e.pointerId);
        last = [e.clientX, e.clientY];
        this.spin = false;
        cv.style.cursor = 'grabbing';
        if (this.opts.onInteract) this.opts.onInteract();
      });
      cv.addEventListener('pointermove', e => {
        if (!pts.has(e.pointerId)) return;
        pts.set(e.pointerId, [e.clientX, e.clientY]);
        if (pts.size === 2) {
          const [a, b] = [...pts.values()];
          const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
          if (pinch) this.cam.dist = Math.min(40, Math.max(2, this.cam.dist * pinch / d));
          pinch = d;
          this.invalidate();
          return;
        }
        if (!last) return;
        const dx = e.clientX - last[0], dy = e.clientY - last[1];
        last = [e.clientX, e.clientY];
        this.cam.yaw -= dx * 0.008;
        this.cam.pitch = Math.max(-1.45, Math.min(1.45, this.cam.pitch + dy * 0.008));
        this.invalidate();
      });
      const end = e => { pts.delete(e.pointerId); if (pts.size < 2) pinch = null; if (!pts.size) { last = null; cv.style.cursor = 'grab'; } };
      cv.addEventListener('pointerup', end);
      cv.addEventListener('pointercancel', end);
      cv.addEventListener('wheel', e => {
        if (!e.ctrlKey && !e.metaKey && !e.altKey) return; // keep normal page scrolling
        e.preventDefault();
        this.cam.dist = Math.min(40, Math.max(2, this.cam.dist * Math.exp(e.deltaY * 0.001)));
        this.invalidate();
      }, { passive: false });
    }
    _spinLoop() {
      const f = () => {
        if (!this.spin) return;
        this.cam.yaw += 0.0025;
        this.invalidate();
        requestAnimationFrame(f);
      };
      requestAnimationFrame(f);
    }
  }

  R.View3D = View3D;
})();
