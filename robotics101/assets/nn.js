/* R101.NN — a tiny dense-network toolkit for the Part V/VI labs (works in the browser and in node).
   Plain arrays, one sample at a time; small enough to train live in a canvas loop.
     const net = NN.mlp([2, 16, 16, 1], { act: 'tanh', seed: 1 });
     const opt = NN.adam(net, { lr: 0.01 });
     const loss = NN.fit(net, opt, X, Y, NN.mse);        // one mini-batch step, returns the mean loss
     net.forward(x)                                        // → output array
     const c = net.run(x); net.backward(c, dOut)           // accumulate grads, returns dL/dx
   Activations: tanh, relu, lrelu, sigmoid, gelu, softplus, sin, linear. */
(function (root) {
  const NN = {};

  const ACT = {
    linear: [x => x, (x, y) => 1],
    tanh: [Math.tanh, (x, y) => 1 - y * y],
    relu: [x => (x > 0 ? x : 0), (x, y) => (x > 0 ? 1 : 0)],
    lrelu: [x => (x > 0 ? x : 0.01 * x), (x, y) => (x > 0 ? 1 : 0.01)],
    sigmoid: [x => 1 / (1 + Math.exp(-x)), (x, y) => y * (1 - y)],
    softplus: [x => (x > 20 ? x : Math.log1p(Math.exp(x))), (x, y) => 1 / (1 + Math.exp(-x))],
    sin: [Math.sin, (x, y) => Math.cos(x)],
    gelu: [x => 0.5 * x * (1 + Math.tanh(0.7978845608 * (x + 0.044715 * x * x * x))),
      (x, y) => { const u = 0.7978845608 * (x + 0.044715 * x * x * x), t = Math.tanh(u);
        return 0.5 * (1 + t) + 0.5 * x * (1 - t * t) * 0.7978845608 * (1 + 3 * 0.044715 * x * x); }]
  };
  NN.ACT = ACT;

  // seeded RNG (mulberry32) and Gaussian samples; same generator as R101.M.rng
  NN.rng = (seed = 1) => {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  NN.randn = (rand = Math.random) => {
    let u = 0, v = 0;
    while (u === 0) u = rand();
    while (v === 0) v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };

  /* Dense network. sizes = [in, h1, …, out]; act for hidden layers, out for the last layer.
     Init: He for relu-like, Xavier/Glorot otherwise; biases 0. */
  NN.mlp = (sizes, o = {}) => {
    const act = o.act || 'tanh', outAct = o.out || 'linear';
    const rand = NN.rng(o.seed == null ? 1 : o.seed);
    const layers = [];
    for (let l = 0; l + 1 < sizes.length; l++) {
      const nin = sizes[l], nout = sizes[l + 1], a = l + 2 === sizes.length ? outAct : act;
      const he = a === 'relu' || a === 'lrelu' || a === 'gelu';
      const sd = o.initScale != null ? o.initScale : (he ? Math.sqrt(2 / nin) : Math.sqrt(2 / (nin + nout)));
      const W = [], gW = [];
      for (let r = 0; r < nout; r++) {
        W.push(Array.from({ length: nin }, () => NN.randn(rand) * sd));
        gW.push(new Array(nin).fill(0));
      }
      layers.push({ W, b: new Array(nout).fill(0), gW, gb: new Array(nout).fill(0), act: a, nin, nout });
    }
    return makeNet(layers, sizes.slice());
  };

  function makeNet(layers, sizes) {
    const net = { layers, sizes };
    // forward pass keeping every layer's input, pre-activation and output
    net.run = x => {
      const cache = [];
      let h = x;
      for (const L of layers) {
        const [f] = ACT[L.act], z = new Array(L.nout), y = new Array(L.nout);
        for (let r = 0; r < L.nout; r++) {
          let s = L.b[r];
          const w = L.W[r];
          for (let c = 0; c < L.nin; c++) s += w[c] * h[c];
          z[r] = s; y[r] = f(s);
        }
        cache.push({ x: h, z, y });
        h = y;
      }
      cache.out = h;
      return cache;
    };
    net.forward = x => net.run(x).out;
    // backprop dL/d(out) through the cached pass; accumulates parameter grads (scaled by `scale`) and returns dL/dx
    net.backward = (cache, dOut, scale = 1) => {
      let g = dOut;
      for (let l = layers.length - 1; l >= 0; l--) {
        const L = layers[l], C = cache[l], [, df] = ACT[L.act];
        const dz = new Array(L.nout);
        for (let r = 0; r < L.nout; r++) dz[r] = g[r] * df(C.z[r], C.y[r]);
        const gx = new Array(L.nin).fill(0);
        for (let r = 0; r < L.nout; r++) {
          const w = L.W[r], gw = L.gW[r], d = dz[r];
          if (d === 0) continue;
          L.gb[r] += d * scale;
          for (let c = 0; c < L.nin; c++) { gw[c] += d * C.x[c] * scale; gx[c] += w[c] * d; }
        }
        g = gx;
      }
      return g;
    };
    net.zeroGrad = () => { for (const L of layers) { L.gb.fill(0); for (const r of L.gW) r.fill(0); } };
    net.numParams = () => layers.reduce((s, L) => s + L.nout * (L.nin + 1), 0);
    net.gradNorm = () => {
      let s = 0;
      for (const L of layers) { for (const v of L.gb) s += v * v; for (const r of L.gW) for (const v of r) s += v * v; }
      return Math.sqrt(s);
    };
    net.clone = () => makeNet(layers.map(L => ({
      W: L.W.map(r => r.slice()), b: L.b.slice(), gW: L.gW.map(r => r.slice().fill(0)), gb: L.gb.slice().fill(0),
      act: L.act, nin: L.nin, nout: L.nout })), sizes.slice());
    // copy weights from another net of the same shape; tau < 1 gives a Polyak (soft) update
    net.copyFrom = (src, tau = 1) => {
      layers.forEach((L, l) => {
        const S = src.layers[l];
        for (let r = 0; r < L.nout; r++) {
          L.b[r] += tau * (S.b[r] - L.b[r]);
          for (let c = 0; c < L.nin; c++) L.W[r][c] += tau * (S.W[r][c] - L.W[r][c]);
        }
      });
      return net;
    };
    // visit every parameter: fn(paramArray, index, gradArray)
    net.eachParam = fn => {
      for (const L of layers) {
        for (let r = 0; r < L.nout; r++) for (let c = 0; c < L.nin; c++) fn(L.W[r], c, L.gW[r]);
        for (let r = 0; r < L.nout; r++) fn(L.b, r, L.gb);
      }
    };
    return net;
  }

  /* Optimizers. step() applies the accumulated grads, then zeroes them.
     clip: clip the global grad norm; wd: decoupled weight decay (AdamW) on weights only. */
  NN.sgd = (net, o = {}) => {
    const opt = { lr: o.lr || 0.01, momentum: o.momentum || 0, wd: o.wd || 0, clip: o.clip || 0, t: 0 };
    const vel = net.layers.map(L => ({ W: L.W.map(r => r.map(() => 0)), b: L.b.map(() => 0) }));
    opt.step = () => {
      opt.t++;
      const k = clipScale(net, opt.clip);
      net.layers.forEach((L, l) => {
        const V = vel[l];
        for (let r = 0; r < L.nout; r++) {
          for (let c = 0; c < L.nin; c++) {
            V.W[r][c] = opt.momentum * V.W[r][c] + k * L.gW[r][c];
            L.W[r][c] -= opt.lr * (V.W[r][c] + opt.wd * L.W[r][c]);
          }
          V.b[r] = opt.momentum * V.b[r] + k * L.gb[r];
          L.b[r] -= opt.lr * V.b[r];
        }
      });
      net.zeroGrad();
    };
    return opt;
  };

  NN.adam = (net, o = {}) => {
    const opt = { lr: o.lr || 0.001, b1: o.beta1 == null ? 0.9 : o.beta1, b2: o.beta2 == null ? 0.999 : o.beta2,
      eps: o.eps || 1e-8, wd: o.wd || 0, clip: o.clip || 0, t: 0 };
    const mom = net.layers.map(L => ({ mW: L.W.map(r => r.map(() => 0)), vW: L.W.map(r => r.map(() => 0)),
      mb: L.b.map(() => 0), vb: L.b.map(() => 0) }));
    opt.step = () => {
      opt.t++;
      const k = clipScale(net, opt.clip), c1 = 1 - Math.pow(opt.b1, opt.t), c2 = 1 - Math.pow(opt.b2, opt.t);
      const upd = (p, i, g, m, v, decay) => {
        m[i] = opt.b1 * m[i] + (1 - opt.b1) * g;
        v[i] = opt.b2 * v[i] + (1 - opt.b2) * g * g;
        p[i] -= opt.lr * ((m[i] / c1) / (Math.sqrt(v[i] / c2) + opt.eps) + (decay ? opt.wd * p[i] : 0));
      };
      net.layers.forEach((L, l) => {
        const S = mom[l];
        for (let r = 0; r < L.nout; r++) {
          for (let c = 0; c < L.nin; c++) upd(L.W[r], c, k * L.gW[r][c], S.mW[r], S.vW[r], true);
          upd(L.b, r, k * L.gb[r], S.mb, S.vb, false);
        }
      });
      net.zeroGrad();
    };
    return opt;
  };

  function clipScale(net, clip) {
    if (!clip) return 1;
    const n = net.gradNorm();
    return n > clip ? clip / n : 1;
  }

  /* Losses: each returns { loss, grad } with grad = dloss/d(output). */
  NN.mse = (y, t) => {
    let loss = 0;
    const grad = y.map((v, i) => { const d = v - t[i]; loss += d * d; return 2 * d / y.length; });
    return { loss: loss / y.length, grad };
  };
  NN.huber = (y, t, delta = 1) => {
    let loss = 0;
    const grad = y.map((v, i) => {
      const d = v - t[i], a = Math.abs(d);
      loss += a <= delta ? 0.5 * d * d : delta * (a - 0.5 * delta);
      return (a <= delta ? d : delta * Math.sign(d)) / y.length;
    });
    return { loss: loss / y.length, grad };
  };
  NN.softmax = z => {
    const m = Math.max(...z), e = z.map(v => Math.exp(v - m)), s = e.reduce((a, b) => a + b, 0);
    return e.map(v => v / s);
  };
  // logits and an integer class label
  NN.softmaxCE = (z, label) => {
    const p = NN.softmax(z);
    return { loss: -Math.log(Math.max(p[label], 1e-12)), grad: p.map((v, i) => v - (i === label ? 1 : 0)), p };
  };
  // one logit and a target in [0, 1] (numerically stable)
  NN.bce = (z, t) => {
    const x = z[0], tt = Array.isArray(t) ? t[0] : t;
    const loss = Math.max(x, 0) - x * tt + Math.log1p(Math.exp(-Math.abs(x)));
    return { loss, grad: [1 / (1 + Math.exp(-x)) - tt] };
  };

  /* One mini-batch step: mean loss over (X[i], Y[i]), backprop, optimizer step. Returns the mean loss. */
  NN.fit = (net, opt, X, Y, lossFn = NN.mse) => {
    let tot = 0;
    const n = X.length;
    for (let i = 0; i < n; i++) {
      const c = net.run(X[i]), r = lossFn(c.out, Y[i]);
      tot += r.loss;
      net.backward(c, r.grad, 1 / n);
    }
    opt.step();
    return tot / n;
  };
  NN.evalLoss = (net, X, Y, lossFn = NN.mse) => {
    let tot = 0;
    for (let i = 0; i < X.length; i++) tot += lossFn(net.forward(X[i]), Y[i]).loss;
    return X.length ? tot / X.length : 0;
  };
  // random mini-batch of indices
  NN.batch = (n, size, rand = Math.random) => Array.from({ length: Math.min(size, n) }, () => Math.floor(rand() * n));

  if (typeof module !== 'undefined' && module.exports) module.exports = NN;
  if (root) { root.R101 = root.R101 || {}; root.R101.NN = NN; }
})(typeof window !== 'undefined' ? window : null);
