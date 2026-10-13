/* What to eat today - static site, no build step.
   Data: data/dishes.js, data/videos.js, data/recipes.js (ingredients for the shopping list) */
(function () {
  "use strict";

  var DISHES = window.DISHES || [];
  var VIDEOS = window.VIDEOS || {};
  var RECIPES = window.RECIPES || {};   // dish id -> [[ingredient, qty|null], ...]  (qty for 2 people)
  var ING = window.ING || {};           // ingredient -> {en, aisle, unit}
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
  var GROUPS = {
    protein: { emo: "🥩", label: "Meat / fish" },
    eggtofu: { emo: "🍳", label: "Egg / tofu" },
    veg:     { emo: "🥬", label: "Veg" },
    soup:    { emo: "🍲", label: "Soup" },
    staple:  { emo: "🍚", label: "Staple" }
  };
  var GROUP_ORDER = ["protein", "eggtofu", "veg", "soup", "staple", "other"];
  var GROUP_OF = { meat: "protein", seafood: "protein", egg: "eggtofu", tofu: "eggtofu", veg: "veg", soup: "soup", staple: "staple" };
  var GROUP_KINDS = {
    protein: ["meat", "meat", "meat", "seafood"],
    eggtofu: ["egg", "tofu"],
    veg: ["veg"],
    soup: ["soup"],
    staple: ["staple"]
  };
  var TEMPLATES = {
    4: ["protein", "eggtofu", "veg", "soup"],
    5: ["protein", "protein", "eggtofu", "veg", "soup"],
    6: ["protein", "protein", "eggtofu", "veg", "veg", "soup"],
    7: ["protein", "protein", "eggtofu", "veg", "veg", "soup", "staple"],
    8: ["protein", "protein", "protein", "eggtofu", "veg", "veg", "soup", "staple"]
  };
  var MAX_PER_GROUP = 6, MAX_TOTAL = 10;

  var AISLE_ORDER = ["蔬菜", "肉禽", "海鲜", "蛋豆", "主食", "乳品烘焙", "水果", "干货", "调味"];

  var state = {
    n: 0,            // 0 = random 4-8
    mix: null,       // null = automatic, else {protein, eggtofu, veg, soup, staple}
    mode: "home",    // home | any
    spicy: "any",    // any | no | only
    max: 0,          // 0 = any
    cuisines: {},    // cat -> true
    current: [],     // dish ids in display order
    locked: {},      // id -> true
    favs: {},        // id -> true
    plan: { meals: {}, people: 2, checked: {} },   // meals: "YYYY-MM-DD|lunch" -> [dish ids]
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
  function toast(msg) {
    var t = document.createElement("div"); t.className = "toast"; t.textContent = msg; document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2000);
  }
  function countGroups(slots) {
    var c = { protein: 0, eggtofu: 0, veg: 0, soup: 0, staple: 0 };
    slots.forEach(function (g) { if (c[g] !== undefined) c[g]++; });
    return c;
  }
  function expand(mix) {
    var out = [];
    ["protein", "eggtofu", "veg", "soup", "staple"].forEach(function (g) { for (var i = 0; i < mix[g]; i++) out.push(g); });
    return out;
  }
  function sum(mix) { return mix.protein + mix.eggtofu + mix.veg + mix.soup + mix.staple; }

  /* ---------- filters ---------- */
  var anyCuisine = function () { return Object.keys(state.cuisines).length > 0; };
  var REGIONAL = ["家常", "川菜", "粤菜", "湘菜", "江浙", "北方", "东北", "西北", "鲁菜", "日料", "韩餐", "东南亚", "南亚", "西餐", "中东"];
  var FOREIGN = ["日料", "韩餐", "东南亚", "南亚", "西餐", "中东", "烘焙"];
  var isRegional = function (cat) { return REGIONAL.indexOf(cat.split(" ")[0]) >= 0; };
  var isForeign = function (d) { return FOREIGN.indexOf(d.cat.split(" ")[0]) >= 0; };
  // relax = ignore the cuisine filter (soup and rice go with any cuisine)
  function passes(d, relax) {
    if (state.spicy === "no" && d.spicy) return false;
    if (state.spicy === "only" && !d.spicy) return false;
    if (state.max && d.min > state.max) return false;
    if (!relax && anyCuisine() && !state.cuisines[d.cat]) return false;
    return true;
  }

  /* ---------- generating a menu ---------- */
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

  function baseSlots(rnd) {
    if (state.mode === "any") {
      var m = state.mix ? sum(state.mix) : (state.n || 4 + Math.floor(rnd() * 5));
      return new Array(m).fill("other");
    }
    if (state.mix) return expand(state.mix);
    return TEMPLATES[state.n || 4 + Math.floor(rnd() * 5)].slice();
  }

  function generate(rnd) {
    var keep = state.current.filter(function (id) { return state.locked[id]; });
    var used = {};
    keep.forEach(function (id) { used[id] = true; });
    var slots = baseSlots(rnd);
    keep.forEach(function (id) {            // a locked dish fills its own slot
      var i = slots.indexOf(groupOf(BY_ID[id]));
      if (i >= 0) slots.splice(i, 1); else slots.pop();
    });
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

  /* ---------- mix steppers ---------- */
  function effectiveMix() {
    if (state.mix) return state.mix;
    var t = state.n ? TEMPLATES[state.n] : null;
    return t ? countGroups(t) : null;
  }
  function renderMix() {
    var m = effectiveMix(), custom = !!state.mix, off = state.mode === "any";
    $("#mix").innerHTML = Object.keys(GROUPS).map(function (g) {
      return '<div class="mixitem' + (custom ? " custom" : "") + '"><span class="mi-l">' + GROUPS[g].emo + " " + GROUPS[g].label + "</span>" +
        '<span class="mi-c"><button class="step" data-g="' + g + '" data-d="-1" aria-label="Fewer ' + GROUPS[g].label + '">−</button>' +
        "<b>" + (m ? m[g] : "·") + "</b>" +
        '<button class="step" data-g="' + g + '" data-d="1" aria-label="More ' + GROUPS[g].label + '">+</button></span></div>';
    }).join("");
    $("#mix").classList.toggle("off", off);
    $("#mixReset").hidden = !custom;
    $("#mixNote").textContent = off ? "(not used in Anything goes)"
      : custom ? "(custom: " + sum(state.mix) + " dishes)"
      : m ? "(auto for " + state.n + " dishes; tap + / − to customise)" : "(random 4–8 dishes; tap + / − to customise)";
    $$("#countSeg button").forEach(function (b) { b.classList.toggle("on", !custom && +b.dataset.n === state.n); });
  }
  function bumpMix(g, delta) {
    var m = state.mix ? Object.assign({}, state.mix) : (effectiveMix() ? Object.assign({}, effectiveMix()) : countGroups(TEMPLATES[6]));
    var v = m[g] + delta;
    if (v < 0 || v > MAX_PER_GROUP) return;
    var total = sum(m) + delta;
    if (total < 1) { toast("Need at least one dish 🍽️"); return; }
    if (total > MAX_TOTAL) { toast("That's a feast! " + MAX_TOTAL + " dishes max 😅"); return; }
    m[g] = v;
    state.mix = m;
    renderMix();
  }

  /* ---------- rendering ---------- */
  function thumbFor(d) {
    var v = (VIDEOS[d.id] || [])[0];
    return v ? "https://i.ytimg.com/vi/" + v.id + "/mqdefault.jpg" : "";
  }
  function inPlan(id) {
    return Object.keys(state.plan.meals).some(function (k) { return state.plan.meals[k].indexOf(id) >= 0; });
  }

  function cardHTML(d, i, opts) {
    var lib = opts && opts.lib;
    var k = KINDS[d.kind] || KINDS.meat;
    var hasVid = !!(VIDEOS[d.id] || []).length;
    var src = d.img || thumbFor(d);
    var pic = '<span class="emo" aria-hidden="true">' + d.emoji + "</span>" +
      (src ? '<img src="' + esc(src) + '" alt="' + esc(d.en) + '" ' + (lib ? 'loading="lazy" ' : "") + 'referrerpolicy="no-referrer" onerror="this.remove()">' : "");
    var tags = '<span class="tag' + (d.min <= 20 ? " fast" : "") + '">⏱ ' + (d.min >= 90 ? Math.round(d.min / 60 * 10) / 10 + " h" : d.min + " min") + "</span>" +
      '<span class="tag">' + esc(d.cat) + "</span>";
    var fav = '<button class="fav' + (state.favs[d.id] ? " on" : "") + '" data-act="fav" title="' + (state.favs[d.id] ? "Remove from favourites" : "Save to favourites") + '">' + (state.favs[d.id] ? "❤️" : "🤍") + "</button>";
    var acts = lib
      ? fav + '<button data-act="addone" title="Add this dish to the selected meal in your plan">🛒</button>'
      : '<button class="lock' + (state.locked[d.id] ? " on" : "") + '" data-act="lock" title="Keep this dish when shuffling">' + (state.locked[d.id] ? "🔒" : "🔓") + "</button>" +
        '<button data-act="swap" title="Swap this dish">🔄</button>' + fav;
    return '<article class="card' + (state.locked[d.id] && !lib ? " locked" : "") + '" data-id="' + d.id + '" style="--kc:' + k.c + ";--i:" + i + '">' +
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
    $("#planBtn").disabled = !state.current.length;
    var mins = state.current.reduce(function (m, id) { return Math.max(m, BY_ID[id].min); }, 0);
    $("#hint").textContent = state.current.length
      ? (spicy ? "🌶️ " + spicy + " spicy · " : "") + "longest dish takes ~" + (mins >= 90 ? Math.round(mins / 6) / 10 + " h" : mins + " min") + " · hit space to shuffle again"
      : "Nothing matches these filters. Loosen them a bit 🙈";
  }

  function renderFavs() {
    var ids = Object.keys(state.favs).filter(function (id) { return BY_ID[id]; });
    $("#favSection").hidden = !ids.length;
    $("#favCount").textContent = ids.length;
    $("#favGrid").innerHTML = ids.map(function (id) { return cardHTML(BY_ID[id], 0, { lib: true }); }).join("");
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
    $("#kindChips").innerHTML = '<button class="chip on" data-kind="">All</button>' + Object.keys(KINDS).map(function (k) {
      var n = DISHES.filter(function (d) { return d.kind === k; }).length;
      return n ? '<button class="chip" data-kind="' + k + '">' + KINDS[k].emo + " " + KINDS[k].zh + " " + KINDS[k].en + '<span class="n">' + n + "</span></button>" : "";
    }).join("");
  }

  /* ---------- plan + shopping list ---------- */
  var MEALS = { lunch: "Lunch", dinner: "Dinner" };
  function dateKey(d) { return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
  function dayLabel(key) {
    var p = key.split("-"), d = new Date(+p[0], +p[1] - 1, +p[2]);
    var t0 = new Date(); t0.setHours(0, 0, 0, 0);
    var diff = Math.round((d - t0) / 864e5);
    if (diff === 0) return "Today";
    if (diff === 1) return "Tomorrow";
    if (diff === -1) return "Yesterday";
    return d.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" });
  }
  function slotLabel(slot) { var p = slot.split("|"); return dayLabel(p[0]) + " · " + MEALS[p[1]]; }

  function buildSlots() {
    var sel = $("#slotSel"), opts = [], now = new Date();
    for (var i = 0; i < 4; i++) {
      var d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      Object.keys(MEALS).forEach(function (m) { opts.push(dateKey(d) + "|" + m); });
    }
    sel.innerHTML = opts.map(function (o) { return '<option value="' + o + '">' + slotLabel(o) + "</option>"; }).join("");
    var saved = store("wte-slot");
    var def = dateKey(now) + "|" + (now.getHours() < 14 ? "lunch" : "dinner");
    sel.value = opts.indexOf(saved) >= 0 ? saved : def;
    if (sel.value !== (opts.indexOf(saved) >= 0 ? saved : def)) sel.selectedIndex = 0;
  }

  function savePlan() { store("wte-plan", JSON.stringify(state.plan)); }
  function loadPlan() {
    try {
      var p = JSON.parse(store("wte-plan") || "null");
      if (p && p.meals) {
        state.plan.people = Math.max(1, Math.min(12, +p.people || 2));
        state.plan.checked = p.checked || {};
        var yesterday = dateKey(new Date(Date.now() - 864e5));
        Object.keys(p.meals).forEach(function (k) {         // forget meals older than yesterday
          var ids = (p.meals[k] || []).filter(function (id) { return BY_ID[id]; });
          if (k.split("|")[0] >= yesterday && ids.length) state.plan.meals[k] = ids;
        });
      }
    } catch (e) { /* ignore */ }
  }
  function sortedSlots() {
    var key = function (k) { var p = k.split("|"); return p[0] + (p[1] === "lunch" ? "0" : "1"); };
    return Object.keys(state.plan.meals).sort(function (x, y) { return key(x) < key(y) ? -1 : 1; });
  }

  function addToPlan(ids, replace) {
    var slot = $("#slotSel").value;
    store("wte-slot", slot);
    var cur = replace ? [] : (state.plan.meals[slot] || []);
    ids.forEach(function (id) { if (cur.indexOf(id) < 0) cur.push(id); });
    state.plan.meals[slot] = cur;
    savePlan(); renderPlan();
    toast("Added to " + slotLabel(slot) + " 🛒");
  }

  function fmtQty(q, unit) {
    if (unit === "个") return Math.ceil(q - 0.01) + " pcs";
    if (q >= 1000) return (Math.round(q / 100) / 10) + " kg";
    var r = q < 100 ? Math.max(5, Math.round(q / 5) * 5) : Math.round(q / 10) * 10;
    return r + " g";
  }

  function computeList() {
    var items = {}, missing = {}, scale = state.plan.people / 2;
    Object.keys(state.plan.meals).forEach(function (slot) {
      state.plan.meals[slot].forEach(function (id) {
        var rec = RECIPES[id];
        if (!rec) { missing[id] = true; return; }
        rec.forEach(function (r) {
          var name = r[0], info = ING[name] || { en: "", aisle: "其他 Other", unit: "g" };
          var it = items[name] = items[name] || { name: name, en: info.en, aisle: info.aisle, unit: info.unit, qty: 0, dishes: [] };
          if (r[1]) it.qty += r[1] * scale;
          if (it.dishes.indexOf(BY_ID[id].zh) < 0) it.dishes.push(BY_ID[id].zh);
        });
      });
    });
    return { items: Object.keys(items).map(function (k) { return items[k]; }), missing: Object.keys(missing) };
  }

  function aisleRank(a) { var i = AISLE_ORDER.indexOf(a.split(" ")[0]); return i < 0 ? 99 : i; }

  function renderPlan() {
    var slots = sortedSlots();
    var total = slots.reduce(function (n, k) { return n + state.plan.meals[k].length; }, 0);
    $("#planSection").hidden = !slots.length;
    $("#fab").hidden = !slots.length;
    $("#fabN").textContent = total;
    if (!slots.length) return;
    $("#planCount").textContent = slots.length + (slots.length === 1 ? " meal · " : " meals · ") + total + " dishes";
    $("#people").textContent = state.plan.people;

    $("#planMeals").innerHTML = slots.map(function (k) {
      return '<div class="meal panel" data-slot="' + k + '"><div class="meal-h"><b>' + esc(slotLabel(k)) + '</b>' +
        '<button class="linkbtn" data-act="delmeal">remove meal</button></div><div class="dchips">' +
        state.plan.meals[k].map(function (id) {
          var d = BY_ID[id], kc = (KINDS[d.kind] || KINDS.meat).c;
          return '<span class="dchip" style="--kc:' + kc + '" data-id="' + id + '"><button class="dn" data-act="watch" title="Watch recipe">' +
            esc(d.zh) + (d.spicy ? "🌶" : "") + '</button><button class="dx" data-act="deldish" aria-label="Remove ' + esc(d.zh) + '">✕</button></span>';
        }).join("") + "</div></div>";
    }).join("");

    var L = computeList();
    var shop = L.items.filter(function (i) { return i.aisle.indexOf("调味") !== 0; });
    var pantry = L.items.filter(function (i) { return i.aisle.indexOf("调味") === 0; });
    var byAisle = {};
    shop.forEach(function (i) { (byAisle[i.aisle] = byAisle[i.aisle] || []).push(i); });
    var html = '<h3>Shopping list <small>for ' + state.plan.people + (state.plan.people === 1 ? " person" : " people") + "</small></h3>";
    if (!L.items.length) html += '<p class="fine">No ingredient data for these dishes yet.</p>';
    Object.keys(byAisle).sort(function (a, b) { return aisleRank(a) - aisleRank(b); }).forEach(function (a) {
      html += '<div class="aisle"><h4>' + esc(a) + "</h4><ul>" + byAisle[a].sort(function (x, y) { return y.qty - x.qty; }).map(function (i) {
        var on = !!state.plan.checked[i.name];
        return '<li class="' + (on ? "done" : "") + '"><label><input type="checkbox" data-ing="' + esc(i.name) + '"' + (on ? " checked" : "") + '>' +
          '<span class="in"><b>' + esc(i.name) + "</b>" + (i.en ? " <em>" + esc(i.en) + "</em>" : "") + "</span>" +
          '<span class="iq">' + (i.qty ? fmtQty(i.qty, i.unit) : "some") + "</span></label>" +
          '<small class="iu">' + esc(i.dishes.join("、")) + "</small></li>";
      }).join("") + "</ul></div>";
    });
    if (pantry.length) {
      html += '<details class="aisle pantry"><summary>🧂 Check your pantry (' + pantry.length + ")</summary><p>" +
        pantry.sort(function (x, y) { return y.dishes.length - x.dishes.length; }).map(function (i) {
          return '<span class="pp" title="' + esc(i.dishes.join("、")) + '">' + esc(i.name) + (i.en ? " " + esc(i.en) : "") + "</span>";
        }).join("") + "</p></details>";
    }
    if (L.missing.length) html += '<p class="fine">No ingredient data yet for: ' + esc(L.missing.map(function (id) { return BY_ID[id].zh; }).join("、")) + "</p>";
    $("#shop").innerHTML = html;
    // keep the "add to plan" markers on cards fresh
    $$("#menu .card").forEach(function (c) { c.classList.toggle("inplan", inPlan(c.dataset.id)); });
  }

  function listText() {
    var L = computeList(), out = ["🛒 Shopping list (" + state.plan.people + " people)"], byAisle = {};
    sortedSlots().forEach(function (k) { out.push("• " + slotLabel(k) + ": " + state.plan.meals[k].map(function (id) { return BY_ID[id].zh; }).join("、")); });
    L.items.forEach(function (i) { (byAisle[i.aisle] = byAisle[i.aisle] || []).push(i); });
    Object.keys(byAisle).sort(function (a, b) { return aisleRank(a) - aisleRank(b); }).forEach(function (a) {
      out.push("", "【" + a + "】");
      byAisle[a].forEach(function (i) { out.push("- " + i.name + (a.indexOf("调味") === 0 || !i.qty ? "" : " " + fmtQty(i.qty, i.unit))); });
    });
    return out.join("\n");
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
    var rec = RECIPES[id];
    var ing = rec ? '<p class="m-ing"><b>Ingredients:</b> ' + rec.map(function (r) { return esc(r[0]); }).join("、") + "</p>" : "";
    var q = encodeURIComponent(d.yt + " recipe"), qz = encodeURIComponent(d.zh + " 做法");
    $("#mLinks").innerHTML = ing +
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
  function copy(txt, msg) {
    (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () { toast(msg); }, function () { window.prompt("Copy:", txt); });
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
      b.title = on ? "Remove from favourites" : "Save to favourites";
    });
  }
  function onCardClick(e) {
    var b = e.target.closest("[data-act]"); if (!b) return;
    var holder = b.closest(".card, .dchip"); if (!holder) return;
    var id = holder.dataset.id, act = b.dataset.act;
    if (act === "watch") openModal(id);
    else if (act === "swap") swap(id);
    else if (act === "fav") toggleFav(id);
    else if (act === "addone") addToPlan([id], false);
    else if (act === "lock") {
      if (state.locked[id]) delete state.locked[id]; else state.locked[id] = true;
      renderMenu(false);
    }
  }
  function onPlanClick(e) {
    var b = e.target.closest("[data-act]"); if (!b) return;
    var meal = b.closest(".meal"), slot = meal && meal.dataset.slot;
    if (b.dataset.act === "delmeal") { delete state.plan.meals[slot]; }
    else if (b.dataset.act === "deldish") {
      var id = b.closest(".dchip").dataset.id, a = state.plan.meals[slot];
      a.splice(a.indexOf(id), 1);
      if (!a.length) delete state.plan.meals[slot];
    } else if (b.dataset.act === "watch") { openModal(b.closest(".dchip").dataset.id); return; }
    savePlan(); renderPlan();
  }

  function init() {
    $("#total").textContent = DISHES.length;
    var t = new Date();
    $("#date").textContent = t.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" }) + " · " + t.toLocaleDateString("zh-CN", { weekday: "long" });

    try { JSON.parse(store("wte-favs") || "[]").forEach(function (id) { if (BY_ID[id]) state.favs[id] = true; }); } catch (e) { /* ignore */ }
    loadPlan();

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
    buildSlots();
    floaties();

    $("#countSeg").addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      state.n = +b.dataset.n; state.mix = null; renderMix();
    });
    seg("#modeSeg", "mode", function (v) { state.mode = v; renderMix(); });
    seg("#spiceSeg", "spicy", function (v) { state.spicy = v; });
    seg("#timeSeg", "max", function (v) { state.max = +v; });
    $("#mix").addEventListener("click", function (e) {
      var b = e.target.closest(".step"); if (!b || state.mode === "any") return;
      bumpMix(b.dataset.g, +b.dataset.d);
    });
    $("#mixReset").onclick = function () { state.mix = null; renderMix(); };
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
    $("#copyBtn").onclick = function () { copy(menuText(), "Menu copied 📋"); };
    $("#planBtn").onclick = function () { addToPlan(state.current, true); };
    $("#slotSel").onchange = function () { store("wte-slot", this.value); };
    $("#listCopy").onclick = function () { copy(listText(), "Shopping list copied 📋"); };
    $("#planClear").onclick = function () {
      if (!window.confirm("Clear the whole plan and shopping list?")) return;
      state.plan.meals = {}; state.plan.checked = {}; savePlan(); renderPlan();
    };
    $("#pMinus").onclick = function () { state.plan.people = Math.max(1, state.plan.people - 1); savePlan(); renderPlan(); };
    $("#pPlus").onclick = function () { state.plan.people = Math.min(12, state.plan.people + 1); savePlan(); renderPlan(); };
    $("#planMeals").addEventListener("click", onPlanClick);
    $("#shop").addEventListener("change", function (e) {
      var c = e.target.closest("input[data-ing]"); if (!c) return;
      if (c.checked) state.plan.checked[c.dataset.ing] = true; else delete state.plan.checked[c.dataset.ing];
      savePlan(); c.closest("li").classList.toggle("done", c.checked);
    });
    ["#menu", "#favGrid", "#libGrid"].forEach(function (s) { $(s).addEventListener("click", onCardClick); });

    $("#mClose").onclick = closeModal;
    $("#modal").addEventListener("click", function (e) { if (e.target === this) closeModal(); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !$("#modal").hidden) closeModal();
      else if ((e.key === " " || e.code === "Space") && $("#modal").hidden && !/INPUT|BUTTON|TEXTAREA|SELECT|A/.test(document.activeElement.tagName)) {
        e.preventDefault(); roll(false);
      }
    });

    renderMix();
    roll(true);
    renderFavs();
    renderLib();
    renderPlan();
  }

  init();
})();
