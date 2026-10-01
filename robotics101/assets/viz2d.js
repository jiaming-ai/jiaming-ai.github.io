/* Robotics for Beginners — Plane2D: a tiny 2D math canvas.
   World coordinates are y-up; the view is defined by a center and the world span of the shorter side.
   Usage:
     const P = new R101.Plane2D(wrapEl, { height: 420, view: {cx:0, cy:0, span:8}, draw: P => {...} });
     P.handle({ pos: () => v, set: p => { v = p; }, color: 'v' });
*/
(function () {
  const R = (window.R101 = window.R101 || {});
  const M = () => R.M;

  class Plane2D {
    constructor(wrap, opts = {}) {
      this.wrap = typeof wrap === 'string' ? document.querySelector(wrap) : wrap;
      this.opts = opts;
      this.view = Object.assign({ cx: 0, cy: 0, span: 8 }, opts.view || {});
      this.drawFn = opts.draw || (() => {});
      this.handles = [];
      this.hover = null;   // hovered handle
      this.drag = null;
      this.mouse = null;   // world coords of pointer, or null
      this.canvas = document.createElement('canvas');
      this.wrap.appendChild(this.canvas);
      this.ctx = this.canvas.getContext('2d');
      this._raf = 0;
      this.resize();
      new ResizeObserver(() => this.resize()).observe(this.wrap);
      this._wirePointer();
      R.on && R.on('theme', () => this.invalidate());
      R.on && R.on('lang', () => this.invalidate());
      R.on && R.on('hl', () => this.invalidate());
    }

    resize() {
      const w = this.wrap.clientWidth || 600;
      let h = this.opts.height || 420;
      if (this.opts.aspect) h = Math.round(w * this.opts.aspect);
      if (this.opts.minHeight) h = Math.max(this.opts.minHeight, h);
      if (this.opts.maxHeight) h = Math.min(this.opts.maxHeight, h);
      if (typeof this.opts.heightFn === 'function') h = this.opts.heightFn(w);
      this.wrap.style.height = h + 'px';
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      this.W = w; this.H = h; this.dpr = dpr;
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
      this.canvas.style.width = w + 'px';
      this.canvas.style.height = h + 'px';
      this.invalidate();
    }

    get scale() { return Math.min(this.W, this.H) / this.view.span; }
    X(x) { return this.W / 2 + (x - this.view.cx) * this.scale; }
    Y(y) { return this.H / 2 - (y - this.view.cy) * this.scale; }
    px(p) { return [this.X(p[0]), this.Y(p[1])]; }
    world(px, py) { return [(px - this.W / 2) / this.scale + this.view.cx, -(py - this.H / 2) / this.scale + this.view.cy]; }
    bounds() {
      const a = this.world(0, this.H), b = this.world(this.W, 0);
      return { xmin: a[0], ymin: a[1], xmax: b[0], ymax: b[1] };
    }
    setView(v) { Object.assign(this.view, v); this.invalidate(); }

    invalidate(now) {
      if (now) { this._render(); return; }
      if (this._raf) return;
      this._raf = requestAnimationFrame(() => { this._raf = 0; this._render(); });
    }
    _render() {
      const c = this.ctx;
      c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      c.clearRect(0, 0, this.W, this.H);
      c.fillStyle = R.color('canvas');
      c.fillRect(0, 0, this.W, this.H);
      c.lineCap = 'round'; c.lineJoin = 'round';
      this.drawFn(this);
      this.handles.forEach(h => {
        if (h.hidden || (h.visible && !h.visible())) return;
        const p = this.px(h.pos());
        const on = this.hover === h || this.drag === h;
        c.beginPath();
        c.arc(p[0], p[1], on ? 10 : 7, 0, Math.PI * 2);
        c.strokeStyle = this.col(h.color || 'v');
        c.globalAlpha = on ? 0.9 : 0.55;
        c.lineWidth = 2;
        c.stroke();
        c.globalAlpha = 1;
      });
    }

    col(name) { return name && (name.startsWith('#') || name.startsWith('rgb') || name.startsWith('hsl')) ? name : R.color(name || 'text'); }

    /* ---------- primitives (world coordinates) ---------- */
    line(a, b, o = {}) {
      const c = this.ctx;
      c.save();
      c.strokeStyle = this.col(o.color || 'axis');
      c.lineWidth = o.width || 1.5;
      c.globalAlpha = o.alpha != null ? o.alpha : 1;
      if (o.dash) c.setLineDash(o.dash);
      c.beginPath(); c.moveTo(this.X(a[0]), this.Y(a[1])); c.lineTo(this.X(b[0]), this.Y(b[1])); c.stroke();
      c.restore();
    }
    path(pts, o = {}) {
      if (pts.length < 2) return;
      const c = this.ctx;
      c.save();
      c.strokeStyle = this.col(o.color || 'axis');
      c.lineWidth = o.width || 1.5;
      c.globalAlpha = o.alpha != null ? o.alpha : 1;
      if (o.dash) c.setLineDash(o.dash);
      c.beginPath();
      pts.forEach((p, i) => (i ? c.lineTo(this.X(p[0]), this.Y(p[1])) : c.moveTo(this.X(p[0]), this.Y(p[1]))));
      if (o.close) c.closePath();
      c.stroke();
      c.restore();
    }
    poly(pts, o = {}) {
      const c = this.ctx;
      c.save();
      c.beginPath();
      pts.forEach((p, i) => (i ? c.lineTo(this.X(p[0]), this.Y(p[1])) : c.moveTo(this.X(p[0]), this.Y(p[1]))));
      c.closePath();
      if (o.fill) { c.fillStyle = this.col(o.fill); c.globalAlpha = o.fillAlpha != null ? o.fillAlpha : 0.18; c.fill(); }
      if (o.stroke) { c.globalAlpha = o.alpha != null ? o.alpha : 1; c.strokeStyle = this.col(o.stroke); c.lineWidth = o.width || 1.5; if (o.dash) c.setLineDash(o.dash); c.stroke(); }
      c.restore();
    }
    arrow(a, b, o = {}) {
      const c = this.ctx;
      const A = this.px(a), B = this.px(b);
      const dx = B[0] - A[0], dy = B[1] - A[1], len = Math.hypot(dx, dy);
      const w = o.width || 3, head = Math.min(o.head || 11 + w, len * 0.6);
      c.save();
      c.globalAlpha = o.alpha != null ? o.alpha : 1;
      c.strokeStyle = c.fillStyle = this.col(o.color || 'v');
      c.lineWidth = w;
      if (o.dash) c.setLineDash(o.dash);
      if (len > 0.5) {
        const ux = dx / len, uy = dy / len;
        c.beginPath(); c.moveTo(A[0], A[1]); c.lineTo(B[0] - ux * head * 0.8, B[1] - uy * head * 0.8); c.stroke();
        c.setLineDash([]);
        c.beginPath();
        c.moveTo(B[0], B[1]);
        c.lineTo(B[0] - ux * head - uy * head * 0.45, B[1] - uy * head + ux * head * 0.45);
        c.lineTo(B[0] - ux * head + uy * head * 0.45, B[1] - uy * head - ux * head * 0.45);
        c.closePath(); c.fill();
      }
      c.restore();
      if (o.label) {
        const off = o.labelOffset || [8, -8];
        this.textPx(o.label, B[0] + off[0], B[1] + off[1], { color: o.labelColor || o.color || 'v', bold: true, size: o.labelSize || 15, align: o.labelAlign || 'left' });
      }
    }
    point(p, o = {}) {
      const c = this.ctx, q = this.px(p);
      c.save();
      c.globalAlpha = o.alpha != null ? o.alpha : 1;
      c.beginPath(); c.arc(q[0], q[1], o.r || 4, 0, Math.PI * 2);
      c.fillStyle = this.col(o.color || 'v'); c.fill();
      if (o.stroke) { c.strokeStyle = this.col(o.stroke); c.lineWidth = o.strokeWidth || 1.5; c.stroke(); }
      c.restore();
    }
    circle(center, r, o = {}) {
      const pts = [];
      for (let i = 0; i <= 96; i++) { const t = (i / 96) * Math.PI * 2; pts.push([center[0] + r * Math.cos(t), center[1] + r * Math.sin(t)]); }
      if (o.fill) this.poly(pts, o); else this.path(pts, o);
    }
    // image of the unit circle under matrix A (2×2), centered at c
    ellipse(center, A, o = {}) {
      const pts = [];
      for (let i = 0; i <= 120; i++) {
        const t = (i / 120) * Math.PI * 2, u = [Math.cos(t), Math.sin(t)];
        pts.push([center[0] + A[0][0] * u[0] + A[0][1] * u[1], center[1] + A[1][0] * u[0] + A[1][1] * u[1]]);
      }
      if (o.fill) this.poly(pts, o); else this.path(pts, o);
    }
    text(str, p, o = {}) {
      const q = this.px(p);
      const off = o.offset || [0, 0];
      this.textPx(str, q[0] + off[0], q[1] + off[1], o);
    }
    textPx(str, x, y, o = {}) {
      const c = this.ctx;
      c.save();
      c.font = `${o.bold ? '600 ' : ''}${o.size || 13}px ${o.mono ? "'JetBrains Mono', monospace" : "Inter, 'PingFang SC', 'Microsoft YaHei', sans-serif"}`;
      c.fillStyle = this.col(o.color || 'text');
      c.globalAlpha = o.alpha != null ? o.alpha : 1;
      c.textAlign = o.align || 'left';
      c.textBaseline = o.baseline || 'middle';
      if (o.halo !== false) { c.lineWidth = 4; c.strokeStyle = R.color('canvas'); c.globalAlpha *= 0.85; c.strokeText(str, x, y); c.globalAlpha = o.alpha != null ? o.alpha : 1; }
      c.fillText(str, x, y);
      c.restore();
    }

    /* grid: optionally the image of the integer grid under a 2×2 matrix A */
    grid(o = {}) {
      const step = o.step || 1;
      const b = this.bounds();
      if (!o.A) {
        const c = this.ctx;
        c.save();
        c.lineWidth = 1;
        for (let k = Math.ceil(b.xmin / step) * step; k <= b.xmax; k += step) {
          c.strokeStyle = this.col(Math.abs(k) < 1e-9 ? (o.axisColor || 'axis') : (o.color || 'grid'));
          c.globalAlpha = Math.abs(k) < 1e-9 ? (o.axisAlpha != null ? o.axisAlpha : 0.9) : 1;
          c.beginPath(); c.moveTo(this.X(k), 0); c.lineTo(this.X(k), this.H); c.stroke();
        }
        for (let k = Math.ceil(b.ymin / step) * step; k <= b.ymax; k += step) {
          c.strokeStyle = this.col(Math.abs(k) < 1e-9 ? (o.axisColor || 'axis') : (o.color || 'grid'));
          c.globalAlpha = Math.abs(k) < 1e-9 ? (o.axisAlpha != null ? o.axisAlpha : 0.9) : 1;
          c.beginPath(); c.moveTo(0, this.Y(k)); c.lineTo(this.W, this.Y(k)); c.stroke();
        }
        c.restore();
        return;
      }
      // transformed grid: lines u = k and v = k mapped by A
      const A = o.A, E = o.extent || Math.ceil(Math.max(Math.abs(b.xmin), Math.abs(b.xmax), Math.abs(b.ymin), Math.abs(b.ymax)) * 2.5 / step) * step;
      const map = p => [A[0][0] * p[0] + A[0][1] * p[1], A[1][0] * p[0] + A[1][1] * p[1]];
      for (let k = -E; k <= E + 1e-9; k += step) {
        const axis = Math.abs(k) < 1e-9;
        const style = { color: axis ? (o.axisColor || 'grid-2') : (o.color || 'grid-2'), width: axis ? (o.axisWidth || 2) : (o.width || 1.2), alpha: o.alpha != null ? o.alpha : 1, dash: o.dash };
        this.line(map([k, -E]), map([k, E]), style);
        this.line(map([-E, k]), map([E, k]), style);
      }
    }

    /* ---------- interaction ---------- */
    handle(h) { this.handles.push(h); this.invalidate(); return h; }
    _hit(px, py) {
      let best = null, bd = 1e9;
      this.handles.forEach(h => {
        if (h.hidden || (h.visible && !h.visible())) return;
        const p = this.px(h.pos());
        const d = Math.hypot(p[0] - px, p[1] - py);
        if (d < (h.r || 16) && d < bd) { bd = d; best = h; }
      });
      return best;
    }
    _wirePointer() {
      const cv = this.canvas;
      const loc = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
      const snap = (h, w) => {
        const s = h.snap != null ? h.snap : this.opts.snap;
        if (typeof s === 'function') return s(w);
        if (s) return [Math.round(w[0] / s) * s, Math.round(w[1] / s) * s];
        return w;
      };
      // let the page scroll on touch unless the gesture starts on a handle (or the figure wants empty-space drags)
      cv.addEventListener('touchstart', e => {
        if (e.touches.length !== 1) return;
        const r = cv.getBoundingClientRect(), t = e.touches[0];
        if (this.opts.dragEmpty || this.opts.noScroll || this._hit(t.clientX - r.left, t.clientY - r.top)) e.preventDefault();
      }, { passive: false });
      cv.addEventListener('pointerdown', e => {
        const [x, y] = loc(e);
        const h = this._hit(x, y);
        if (h) {
          this.drag = h;
          cv.setPointerCapture(e.pointerId);
          e.preventDefault();
          h.start && h.start();
        } else if (this.opts.onPointerDown) {
          this.opts.onPointerDown(this.world(x, y), e);
          if (this.opts.dragEmpty) { this._dragEmpty = true; cv.setPointerCapture(e.pointerId); }
        }
        this.invalidate();
      });
      cv.addEventListener('pointermove', e => {
        const [x, y] = loc(e);
        const w = this.world(x, y);
        this.mouse = w;
        if (this.drag) {
          this.drag.set(snap(this.drag, w));
          this.opts.onChange && this.opts.onChange();
          this.invalidate();
          return;
        }
        if (this._dragEmpty && this.opts.onPointerDrag) { this.opts.onPointerDrag(w, e); this.invalidate(); return; }
        const h = this._hit(x, y);
        if (h !== this.hover) { this.hover = h; this.invalidate(); }
        cv.style.cursor = h ? 'grab' : (this.opts.cursor || 'default');
        if (this.opts.onHover) { this.opts.onHover(w); this.invalidate(); }
      });
      const end = () => {
        if (this.drag && this.drag.end) this.drag.end();
        this.drag = null; this._dragEmpty = false;
        this.invalidate();
      };
      cv.addEventListener('pointerup', end);
      cv.addEventListener('pointercancel', end);
      cv.addEventListener('pointerleave', () => {
        this.mouse = null;
        if (!this.drag) { this.hover = null; this.opts.onHover && this.opts.onHover(null); this.invalidate(); }
      });
    }
  }

  R.Plane2D = Plane2D;
})();
