/* What to eat today - static site, no build step. Data: data/dishes.js, data/videos.js */
(function () {
  "use strict";

  var DISHES = window.DISHES || [];
  var VIDEOS = window.VIDEOS || {};
  var BY_ID = {};
  DISHES.forEach(function (d) { BY_ID[d.id] = d; });

  // kind -> label, emoji, colour
  var KINDS = {
    meat:    { zh: "荤菜", en: "Meat",    emo: "🥩", c: "#ffb4a2" },
    seafood: { zh: "海鲜", en: "Seafood", emo: "🦐", c: "#9bd8ff" },
    egg:     { zh: "蛋",   en: "Egg",     emo: "🍳", c: "#ffe27a" },
    tofu:    { zh: "豆腐", en: "Tofu",    emo: "🧈", c: "#fff0b3" },
    veg:     { zh: "蔬菜", en: "Greens",  emo: "🥬", c: "#a8e6a1" },
    soup:    { zh: "汤",   en: "Soup",    emo: "🍲", c: "#ffcf99" },
    staple:  { zh: "主食", en: "Staple",  emo: "🍚", c: "#e9dcff" },
    cold:    { zh: "凉菜", en: "Cold",    emo: "🥗", c: "#b8f0d8" },
    snack:   { zh: "小吃", en: "Snack",   emo: "🥟", c: "#ffd1e8" },
    sweet:   { zh: "甜品", en: "Sweet",   emo: "🍰", c: "#ffc2d9" },
    hotpot:  { zh: "火锅", en: "Hot pot", emo: "🫕", c: "#ff9f9f" }
  };

  // Slot groups for a balanced meal.
  var GROUP_OF = { meat: "protein", seafood: "protein", egg: "eggtofu", tofu: "eggtofu", veg: "veg", soup: "soup", staple: "staple" };
  var GROUP_ORDER = ["protein", "eggtofu", "veg", "soup", "staple", "other"];
  var GROUP_KINDS = {
    protein: ["meat", "meat", "meat", "seafood"],
    eggtofu: ["egg", "tofu"],
    veg: ["veg"],
    soup: ["soup"],
    staple: ["staple"]
  };
  var TEMPLATES = {
    5: ["protein", "protein", "eggtofu", "veg", "soup"],
    6: ["protein", "protein", "eggtofu", "veg", "veg", "soup"],
    7: ["protein", "protein", "eggtofu", "veg", "veg", "soup", "staple"],
    8: ["protein", "protein", "protein", "eggtofu", "veg", "veg", "soup", "staple"]
  };

  var state = {
    n: 0,            // 0 = random 5-8
    mode: "home",    // home | any
    spicy: "any",    // any | no | only
    max: 0,          // 0 = any
    cuisines: {},    // cat -> true
    current: [],     // dish ids in display order
    locked: {},      // id -> true
    favs: {},        // id -> true
    kind: "",        // library filter
    q: "",
    libShown: 48
  };

  /* ---------- helpers ---------- */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { /* private mode */ } return null; }
  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function shuffle(arr, rnd) { for (var i = arr.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)); var t = arr[i]; arr[i] = arr[j]; arr[j] = t; } return arr; }
  function pick(arr, rnd) { return arr[Math.floor(rnd() * arr.length)]; }
  function groupOf(d) { return GROUP_OF[d.kind] || "other"; }
  function cuisineName(d) { return d.cat; }
  function toast(msg) {
    var t = document.createElement("div"); t.className = "toast"; t.textContent = msg; document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 1800);
  }

  /* ---------- filters ---------- */
  var anyCuisine = function () { return Object.keys(state.cuisines).length > 0; };
  var REGIONAL = ["家常", "川菜", "粤菜", "湘菜", "江浙", "北方", "东北", "西北", "鲁菜", "日料", "韩餐", "东南亚", "南亚", "西餐", "中东"];
  var isRegional = function (cat) { return REGIONAL.indexOf(cat.split(" ")[0]) >= 0; };
  // relax = ignore the cuisine filter (soup and rice go with any cuisine)
  function passes(d, relax) {
    if (state.spicy === "no" && d.spicy) return false;
    if (state.spicy === "only" && !d.spicy) return false;
    if (state.max && d.min > state.max) return false;
    if (!relax && anyCuisine() && !state.cuisines[d.cat]) return false;
    return true;
  }

  /* ---------- generating a menu ---------- */
  var FOREIGN = ["日料", "韩餐", "东南亚", "南亚", "西餐", "中东", "烘焙"];
  var isForeign = function (d) { return FOREIGN.indexOf(d.cat.split(" ")[0]) >= 0; };

  function drawOne(group, used, rnd) {
    var pool;
    // a balanced home menu is mostly Chinese home cooking; foreign dishes only drop in now and then
    var homeOnly = state.mode === "home" && !anyCuisine() && rnd() > 0.15;
    var ok = function (d) { return !used[d.id] && !(homeOnly && isForeign(d)); };
    if (group === "other" || state.mode === "any") {
      pool = DISHES.filter(function (d) { return ok(d) && passes(d); });
    } else {
      var relax = group === "soup" || group === "staple";
      var kind = pick(GROUP_KINDS[group], rnd);
      pool = DISHES.filter(function (d) { return ok(d) && d.kind === kind && passes(d, relax); });
      if (!pool.length) pool = DISHES.filter(function (d) { return ok(d) && GROUP_OF[d.kind] === group && passes(d, relax); });
    }
    return pool.length ? pick(pool, rnd) : null;
  }

  function generate(rnd) {
    var n = state.n || 5 + Math.floor(rnd() * 4);
    var keep = state.current.filter(function (id) { return state.locked[id]; });
    var used = {};
    keep.forEach(function (id) { used[id] = true; });
    var slots;
    if (state.mode === "home") {
      slots = TEMPLATES[n].slice();
      keep.forEach(function (id) {            // a locked dish fills its own slot
        var g = groupOf(BY_ID[id]), i = slots.indexOf(g);
        if (i >= 0) slots.splice(i, 1);
        else slots.pop();
      });
    } else {
      slots = [];
    }
    var need = Math.max(0, n - keep.length);
    while (slots.length < need) slots.push("other");
    slots.length = need;

    var out = keep.slice();
    slots.forEach(function (g) {
      var d = drawOne(g, used, rnd) || drawOne("other", used, rnd);
      if (d) { used[d.id] = true; out.push(d.id); }
    });
    if (state.mode === "home") {
      out.sort(function (a, b) { return GROUP_ORDER.indexOf(groupOf(BY_ID[a])) - GROUP_ORDER.indexOf(groupOf(BY_ID[b])); });
    } else {
      shuffle(out, rnd);
    }
    return out;
  }

  function roll(initial) {
    var rnd = Math.random;
    if (initial) {                              // same menu all day for the first visit
      var t = new Date();
      rnd = mulberry(t.getFullYear() * 10000 + (t.getMonth() + 1) * 100 + t.getDate());
    }
    state.current = generate(rnd);
    renderMenu(true);
    if (!initial) { spinDice(); confetti(); }
  }

  function swap(id) {
    var d = BY_ID[id];
    var used = {};
    state.current.forEach(function (x) { used[x] = true; });
    var g = state.mode === "home" ? groupOf(d) : "other";
    var nd = drawOne(g, used, Math.random);
    if (!nd) { toast("No other dish matches your filters 🤷"); return; }
    var i = state.current.indexOf(id);
    state.current[i] = nd.id;
    delete state.locked[id];
    renderMenu(false, nd.id);
  }

  /* ---------- rendering ---------- */
  function thumbFor(d) {
    var v = (VIDEOS[d.id] || [])[0];
    return v ? "https://i.ytimg.com/vi/" + v.id + "/mqdefault.jpg" : "";
  }

  function cardHTML(d, i, opts) {
    var k = KINDS[d.kind] || KINDS.meat;
    var hasVid = !!(VIDEOS[d.id] || []).length;
    var src = d.img || thumbFor(d);
    var pic = '<span class="emo" aria-hidden="true">' + d.emoji + "</span>" +
      (src ? '<img src="' + esc(src) + '" alt="' + esc(d.en) + '" ' + (opts && opts.lib ? 'loading="lazy" ' : "") + 'referrerpolicy="no-referrer" onerror="this.remove()">' : "");
    var tags = '<span class="tag' + (d.min <= 20 ? " fast" : "") + '">⏱ ' + (d.min >= 90 ? Math.round(d.min / 60 * 10) / 10 + " h" : d.min + " min") + "</span>" +
      '<span class="tag">' + esc(d.cat) + "</span>";
    var acts = opts && opts.lib
      ? '<button class="fav' + (state.favs[d.id] ? " on" : "") + '" data-act="fav" title="Favourite">' + (state.favs[d.id] ? "❤️" : "🤍") + '</button>' +
        '<button data-act="watch" title="Recipe">▶ Recipe</button>'
      : '<button class="lock' + (state.locked[d.id] ? " on" : "") + '" data-act="lock" title="Keep this dish when shuffling">' + (state.locked[d.id] ? "🔒" : "🔓") + '</button>' +
        '<button data-act="swap" title="Swap this dish">🔄</button>' +
        '<button class="fav' + (state.favs[d.id] ? " on" : "") + '" data-act="fav" title="Favourite">' + (state.favs[d.id] ? "❤️" : "🤍") + '</button>';
    return '<article class="card' + (state.locked[d.id] && !(opts && opts.lib) ? " locked" : "") + '" data-id="' + d.id + '" style="--kc:' + k.c + ";--i:" + i + '">' +
      '<button class="pic" data-act="watch" aria-label="Watch recipe for ' + esc(d.en) + '">' + pic +
      '<span class="kind">' + k.emo + " " + k.zh + " " + k.en + "</span>" +
      (d.spicy ? '<span class="pepper" title="Spicy">🌶️</span>' : "") +
      (hasVid ? '<span class="play">Recipe</span>' : "") + "</button>" +
      '<div class="body"><h3 class="zh">' + esc(d.zh) + '</h3><p class="en">' + esc(d.en) + '</p><div class="tags">' + tags + "</div></div>" +
      '<div class="acts">' + acts + "</div></article>";
  }

  function renderMenu(animate, swappedId) {
    var box = $("#menu");
    box.innerHTML = state.current.map(function (id, i) { return cardHTML(BY_ID[id], animate ? i : 0); }).join("");
    if (swappedId) { var c = $('[data-id="' + swappedId + '"]', box); if (c) c.classList.add("swap"); }
    var spicy = state.current.filter(function (id) { return BY_ID[id].spicy; }).length;
    $("#menuCount").textContent = state.current.length + " dishes";
    $("#unlockBtn").hidden = !Object.keys(state.locked).some(function (id) { return state.current.indexOf(id) >= 0; });
    var mins = state.current.reduce(function (m, id) { return Math.max(m, BY_ID[id].min); }, 0);
    $("#hint").textContent = state.current.length
      ? (spicy ? "🌶️ " + spicy + " spicy · " : "") + "longest dish takes ~" + (mins >= 90 ? Math.round(mins / 6) / 10 + " h" : mins + " min") + " · hit space to shuffle again"
      : "Nothing matches these filters. Loosen them a bit 🙈";
  }

  function renderFavs() {
    var ids = Object.keys(state.favs).filter(function (id) { return BY_ID[id]; });
    $("#favSection").hidden = !ids.length;
    $("#favCount").textContent = ids.length;
    $("#favGrid").innerHTML = ids.map(function (id, i) { return cardHTML(BY_ID[id], 0, { lib: true }); }).join("");
  }

  function libFiltered() {
    var q = state.q.trim().toLowerCase();
    return DISHES.filter(function (d) {
      if (state.kind && d.kind !== state.kind) return false;
      if (!q) return true;
      return (d.zh + " " + d.en + " " + d.cat).toLowerCase().indexOf(q) >= 0;
    });
  }
  function renderLib() {
    var list = libFiltered();
    $("#libCount").textContent = list.length;
    $("#libGrid").innerHTML = list.slice(0, state.libShown).map(function (d) { return cardHTML(d, 0, { lib: true }); }).join("") ||
      '<p class="fine">Nothing found 🫥</p>';
    $("#moreBtn").hidden = list.length <= state.libShown;
  }

  function buildChips() {
    var counts = {};
    DISHES.forEach(function (d) { if (isRegional(d.cat)) counts[d.cat] = (counts[d.cat] || 0) + 1; });
    var cats = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; });
    $("#cuisineChips").innerHTML = cats.map(function (c) {
      return '<button class="chip" data-cat="' + esc(c) + '">' + esc(c) + '<span class="n">' + counts[c] + "</span></button>";
    }).join("");
    var kc = '<button class="chip on" data-kind="">All</button>' + Object.keys(KINDS).map(function (k) {
      var n = DISHES.filter(function (d) { return d.kind === k; }).length;
      return n ? '<button class="chip" data-kind="' + k + '">' + KINDS[k].emo + " " + KINDS[k].zh + " " + KINDS[k].en + '<span class="n">' + n + "</span></button>" : "";
    }).join("");
    $("#kindChips").innerHTML = kc;
  }

  /* ---------- video modal ---------- */
  function openModal(id) {
    var d = BY_ID[id]; if (!d) return;
    var vids = VIDEOS[id] || [];
    var k = KINDS[d.kind] || KINDS.meat;
    $("#mTitle").textContent = d.zh + "  " + d.en;
    $("#mSub").textContent = k.emo + " " + k.zh + " · " + d.cat + " · ⏱ " + d.min + " min" + (d.spicy ? " · 🌶️ spicy" : "");
    var play = function (v) {
      $("#mPlayer").innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + v.id + '?autoplay=1&rel=0" title="' + esc(v.title) +
        '" allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>';
      $$("#mVids button").forEach(function (b) { b.classList.toggle("on", b.dataset.v === v.id); });
    };
    $("#mVids").innerHTML = vids.map(function (v) {
      return '<button data-v="' + v.id + '">' + esc(v.title) + "<small>" + esc(v.channel) + " · " + esc(v.len) + "</small></button>";
    }).join("");
    $$("#mVids button").forEach(function (b, i) { b.onclick = function () { play(vids[i]); }; });
    if (vids.length) play(vids[0]);
    else $("#mPlayer").innerHTML = '<div class="none">No video saved for this one yet - try the YouTube search below 👇</div>';
    var q = encodeURIComponent(d.yt + " recipe"), qz = encodeURIComponent(d.zh + " 做法");
    $("#mLinks").innerHTML =
      '<a target="_blank" rel="noopener" href="https://www.youtube.com/results?search_query=' + qz + '">▶ More on YouTube (中文)</a>' +
      '<a target="_blank" rel="noopener" href="https://www.youtube.com/results?search_query=' + q + '">▶ YouTube (English)</a>' +
      '<a target="_blank" rel="noopener" href="https://www.google.com/search?tbm=isch&q=' + encodeURIComponent(d.zh + " " + d.en) + '">🖼 Pictures</a>' +
      '<a target="_blank" rel="noopener" href="https://www.xiachufang.com/search/?keyword=' + encodeURIComponent(d.zh) + '">📖 下厨房 recipes</a>' +
      (d.img ? '<a target="_blank" rel="noopener" href="' + esc(d.credit) + '">📷 Photo: Wikipedia</a>' : "");
    $("#modal").hidden = false;
    document.body.style.overflow = "hidden";
    $("#mClose").focus();
  }
  function closeModal() {
    $("#modal").hidden = true; $("#mPlayer").innerHTML = ""; document.body.style.overflow = "";
  }

  /* ---------- fun stuff ---------- */
  function spinDice() {
    var d = $("#dice"); d.classList.remove("spin"); void d.offsetWidth; d.classList.add("spin");
    d.textContent = pick(["🎲", "🥢", "🍜", "🍳", "🥟", "🍤", "🥘"], Math.random);
  }
  function confetti() {
    var bits = ["🍅", "🥬", "🌶️", "🥕", "🍤", "🍋", "🧄", "🥚", "🍄", "✨"];
    for (var i = 0; i < 22; i++) {
      var s = document.createElement("span");
      s.className = "confetti"; s.textContent = pick(bits, Math.random);
      s.style.left = Math.random() * 100 + "vw";
      s.style.animationDuration = 1.2 + Math.random() * 1.4 + "s";
      s.style.animationDelay = Math.random() * 0.25 + "s";
      document.body.appendChild(s);
      setTimeout(function (el) { el.remove(); }.bind(null, s), 3200);
    }
  }
  function floaties() {
    var box = $(".floaties"), bits = ["🍅", "🥟", "🍜", "🥬", "🍤", "🍚", "🥕", "🍄", "🧄", "🥢", "🍳", "🌶️"];
    for (var i = 0; i < 14; i++) {
      var s = document.createElement("span"); s.textContent = bits[i % bits.length];
      s.style.left = (i * 7.3 + Math.random() * 5) % 98 + "vw";
      s.style.animationDuration = 22 + Math.random() * 26 + "s";
      s.style.animationDelay = -Math.random() * 40 + "s";
      s.style.fontSize = 20 + Math.random() * 26 + "px";
      box.appendChild(s);
    }
  }

  function menuText() {
    var t = new Date();
    var lines = ["🍽️ 今天吃什么 · " + t.toLocaleDateString("zh-CN", { month: "long", day: "numeric", weekday: "long" })];
    state.current.forEach(function (id) {
      var d = BY_ID[id];
      lines.push("• " + d.zh + (d.spicy ? "🌶" : "") + "  " + d.en);
    });
    return lines.join("\n");
  }

  /* ---------- events ---------- */
  function seg(id, attr, set) {
    $(id).addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      $$("button", this).forEach(function (x) { x.classList.toggle("on", x === b); });
      set(b.dataset[attr]);
    });
  }
  function toggleFav(id) {
    if (state.favs[id]) delete state.favs[id]; else state.favs[id] = true;
    store("wte-favs", JSON.stringify(Object.keys(state.favs)));
    renderFavs();
    $$('[data-id="' + id + '"] .fav').forEach(function (b) {
      var on = !!state.favs[id]; b.classList.toggle("on", on); b.textContent = on ? "❤️" : "🤍";
    });
  }
  function onCardClick(e) {
    var b = e.target.closest("[data-act]"); if (!b) return;
    var card = b.closest(".card"); if (!card) return;
    var id = card.dataset.id, act = b.dataset.act;
    if (act === "watch") openModal(id);
    else if (act === "swap") swap(id);
    else if (act === "fav") toggleFav(id);
    else if (act === "lock") {
      if (state.locked[id]) delete state.locked[id]; else state.locked[id] = true;
      renderMenu(false);
    }
  }

  function init() {
    $("#total").textContent = DISHES.length;
    var t = new Date();
    $("#date").textContent = t.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" }) + " · " + t.toLocaleDateString("zh-CN", { weekday: "long" });

    try { JSON.parse(store("wte-favs") || "[]").forEach(function (id) { if (BY_ID[id]) state.favs[id] = true; }); } catch (e) { /* ignore */ }

    // theme
    var saved = store("wte-theme");
    if (saved) document.documentElement.dataset.theme = saved;
    var isDark = function () { return document.documentElement.dataset.theme === "dark" || (!document.documentElement.dataset.theme && matchMedia("(prefers-color-scheme: dark)").matches); };
    var paint = function () { $("#themeBtn").textContent = isDark() ? "☀️" : "🌙"; };
    paint();
    $("#themeBtn").onclick = function () {
      var next = isDark() ? "light" : "dark"; document.documentElement.dataset.theme = next; store("wte-theme", next); paint();
    };

    buildChips();
    floaties();

    seg("#countSeg", "n", function (v) { state.n = +v; });
    seg("#modeSeg", "mode", function (v) { state.mode = v; });
    seg("#spiceSeg", "spicy", function (v) { state.spicy = v; });
    seg("#timeSeg", "max", function (v) { state.max = +v; });
    $("#cuisineChips").addEventListener("click", function (e) {
      var b = e.target.closest(".chip"); if (!b) return;
      var c = b.dataset.cat; if (state.cuisines[c]) delete state.cuisines[c]; else state.cuisines[c] = true;
      b.classList.toggle("on", !!state.cuisines[c]);
    });
    $("#kindChips").addEventListener("click", function (e) {
      var b = e.target.closest(".chip"); if (!b) return;
      state.kind = b.dataset.kind; state.libShown = 48;
      $$("#kindChips .chip").forEach(function (x) { x.classList.toggle("on", x === b); });
      renderLib();
    });
    $("#search").addEventListener("input", function () { state.q = this.value; state.libShown = 48; renderLib(); });
    $("#moreBtn").onclick = function () { state.libShown += 60; renderLib(); };

    $("#rollBtn").onclick = function () { roll(false); };
    $("#unlockBtn").onclick = function () { state.locked = {}; renderMenu(false); };
    $("#copyBtn").onclick = function () {
      var txt = menuText();
      (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () { toast("Menu copied 📋"); }, function () { window.prompt("Copy your menu:", txt); });
    };
    ["#menu", "#favGrid", "#libGrid"].forEach(function (s) { $(s).addEventListener("click", onCardClick); });

    $("#mClose").onclick = closeModal;
    $("#modal").addEventListener("click", function (e) { if (e.target === this) closeModal(); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !$("#modal").hidden) closeModal();
      else if ((e.key === " " || e.code === "Space") && $("#modal").hidden && !/INPUT|BUTTON|TEXTAREA|A/.test(document.activeElement.tagName)) {
        e.preventDefault(); roll(false);
      }
    });

    roll(true);
    renderFavs();
    renderLib();
  }

  init();
})();
