#!/usr/bin/env python3
"""Build data/dishes.js (and download dish photos into img/) from tools/dishes.tsv.

Photos come from the lead image of each dish's English Wikipedia article
(Wikimedia Commons, free licences). Dishes without a photo fall back to an
emoji card in the UI. Usage: python3 tools/build_data.py [--no-images]
"""
import json, re, sys, time, urllib.parse, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
UA = {"User-Agent": "what-to-eat-site/1.0 (personal static site; contact via GitHub)"}
API = "https://en.wikipedia.org/w/api.php"


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def get(url, binary=False, retries=4):
    for i in range(retries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
                d = r.read()
                return d if binary else json.loads(d)
        except Exception as e:  # rate limit / transient
            time.sleep(4 * (i + 1))
            err = e
    print("  failed:", url[:90], err)
    return None


SPICY = re.compile(r"麻|辣|椒|川菜|湘菜|火锅|冒菜|串串|担担|回锅|宫保|鱼香|水煮|干锅|干煸|剁椒|小面|口水|🌶")
VEG = re.compile(r"青菜|西兰花|生菜|空心菜|包菜|白菜|土豆丝|茄子|花菜|四季豆|时蔬|菠菜|菜心|芥兰")


def guess_kind(r):
    """Fallback kind for rows without an explicit 8th column."""
    c, z = r["cat"], r["zh"]
    if "汤" in c or z.endswith("汤"): return "soup"
    if "火锅" in c: return "hotpot"
    if "凉菜" in c: return "cold"
    if "甜点" in c or "饮品" in c or "烘焙" in c: return "sweet"
    if any(k in c for k in ("面食", "米饭", "面点", "主食")): return "staple"
    if "早餐" in c or "小吃" in c: return "snack"
    if "素食" in c: return "tofu" if "豆腐" in z else "veg"
    if "豆腐" in z: return "tofu"
    foreign = any(k in c for k in ("日料", "韩餐", "东南亚", "南亚", "西餐", "中东"))
    if foreign:  # dishes from other cuisines are mostly one-bowl meals or sweets, not "mains"
        if re.search(r"沙拉|泥$|酱$", z): return "cold"
        if re.search(r"蛋糕|布丁|冰淇淋|熔岩|舒芙蕾|提拉米苏|慕斯|挞|派|松饼|饼干|甜甜圈|华夫", z): return "sweet"
        if re.search(r"汤|羹|味噌", z): return "soup"
        if re.search(r"面|饭|丼|粉|寿司|披萨|汉堡|三明治|吐司|卷|塔可|热狗|饼|粥|面包|可颂|烩饭|烧$|煎饺|饺|包|玉米片|法棍|烤饼", z): return "staple"
    if VEG.search(z): return "veg"
    if re.search(r"鱼|虾|蟹|贝|鲈|蛤|海参|三文", z): return "seafood"
    if "蛋" in z: return "egg"
    return "meat"


def load():
    rows = []
    for line in (ROOT / "tools/dishes.tsv").read_text(encoding="utf-8").splitlines():
        if not line.strip() or line.startswith("#"):
            continue
        f = line.split("\t")
        zh, en, cat, emoji, mins = f[:5]
        opt = lambda i: f[i] if len(f) > i and f[i] not in ("", "-") else None
        rows.append(dict(zh=zh, en=en, cat=cat, emoji=emoji, min=int(mins),
                         wiki=opt(5) or en, yt=opt(6) or en, kind=opt(7)))
    by_zh = {}
    for r in rows:  # a later row replaces an earlier one with the same Chinese name
        by_zh[r["zh"]] = r
    by_en = {}
    for r in list(by_zh.values()):  # same English name under two Chinese names: keep the first
        if r["en"].lower() in by_en:
            del by_zh[r["zh"]]
        else:
            by_en[r["en"].lower()] = r
    for r in by_zh.values():
        r["kind"] = r["kind"] or guess_kind(r)
        r["spicy"] = bool(SPICY.search(r["zh"] + r["cat"] + r["emoji"]))
    return list(by_zh.values())


# Only trust a lead photo if the article is about a prepared dish (not a raw ingredient).
DISHLIKE = re.compile(r"dishes|cuisine|soups|stews|noodle|dumpling|snack|pancake|dessert|cakes|breads|"
                      r"sandwich|pudding|salad|street food|breakfast|fast food|sushi|curr(y|ies)|pasta|pizza|"
                      r"rice|pastr|sausage|tofu|congee|porridge|sauces|drinks|beverages|tea", re.I)
NOT_DISH = re.compile(r"vegetable|fruits|crops|plants|seafood|fish|poultry|meat|spices|herbs", re.I)
# Wiki pages that are too generic (ingredient / technique / cuisine) - their photo would mislead.
SKIP_PHOTO = {"Stir frying", "Oyster sauce", "Dim sum", "Chinese soup", "Hunan cuisine", "Hash browns",
              "Beijing cuisine", "Shiitake", "Tofu skin", "Cellophane noodles", "Enokitake", "Noodle",
              "Red cooking", "Fermented black beans", "Chestnut", "Oatmeal", "Sour soup", "Tofu",
              "Pig's trotters", "Chicken salad", "Di san xian"}


SKIP_IDS = {"dal-tadka", "candied-sweet-potato", "egg-waffles"}  # dishes whose photo looked wrong on review


def thumbs(titles):
    """title -> (thumbnail url, canonical page title)"""
    out = {}
    for i in range(0, len(titles), 20):
        chunk = titles[i:i + 20]
        q = urllib.parse.urlencode({
            "action": "query", "format": "json", "prop": "pageimages|categories", "piprop": "thumbnail",
            "pithumbsize": 640, "redirects": 1, "cllimit": "max", "clshow": "!hidden",
            "titles": "|".join(chunk)})
        d = get(f"{API}?{q}")
        if not d:
            continue
        q = d["query"]
        alias = {}
        for k in ("normalized", "redirects"):
            for m in q.get(k, []):
                alias[m["from"]] = m["to"]
        pages = {p["title"]: p for p in q["pages"].values()} if isinstance(q["pages"], dict) else {p["title"]: p for p in q["pages"]}
        for t in chunk:
            c = t
            for _ in range(3):
                c = alias.get(c, c)
            p = pages.get(c)
            cats = " ".join(x["title"] for x in (p or {}).get("categories", []))
            if p and "thumbnail" in p and DISHLIKE.search(cats) and not NOT_DISH.search(cats):
                out[t] = (p["thumbnail"]["source"], p["title"])
        time.sleep(1.2)
    return out


def shrink(data, path):
    import io
    from PIL import Image
    im = Image.open(io.BytesIO(data)).convert("RGB")
    im.thumbnail((560, 560))
    im.save(path, "JPEG", quality=76, optimize=True, progressive=True)


def main():
    rows = load()
    (ROOT / "img").mkdir(exist_ok=True)
    found = {}
    if "--no-images" not in sys.argv:
        found = thumbs(sorted({r["wiki"] for r in rows}))
    seen = set()
    for r in rows:
        r["id"] = slug(r["en"])
        while r["id"] in seen:
            r["id"] += "-2"
        seen.add(r["id"])
    used = set()  # one dish per Wikipedia page, so the same photo never appears twice
    for r in rows:
        r["img"] = None
        ok = r["wiki"] not in SKIP_PHOTO and r["wiki"] not in used and r["id"] not in SKIP_IDS
        local = ROOT / "img" / f"{r['id']}.jpg"
        hit = found.get(r["wiki"]) if ok else None
        if ok and local.exists() and "--refresh" not in sys.argv:   # kept from an earlier run
            r["img"] = f"img/{r['id']}.jpg"
            used.add(r["wiki"])
        elif hit:
            used.add(r["wiki"])
            data = get(hit[0], binary=True)
            if data:
                shrink(data, local)
                r["img"] = f"img/{r['id']}.jpg"
                time.sleep(0.4)
        r["credit"] = "https://en.wikipedia.org/wiki/" + urllib.parse.quote((hit[1] if hit else r["wiki"]).replace(" ", "_"))
    keep = {Path(r["img"]).name for r in rows if r["img"]}
    for f in (ROOT / "img").glob("*.jpg"):  # prune photos no longer used
        if f.name not in keep:
            f.unlink()
    out = [{"id": r["id"], "zh": r["zh"], "en": r["en"], "cat": r["cat"], "emoji": r["emoji"],
            "min": r["min"], "kind": r["kind"], "spicy": r["spicy"], "img": r["img"], "credit": r["credit"], "yt": r["yt"]} for r in rows]
    (ROOT / "data/dishes.js").write_text(
        "// generated by tools/build_data.py - do not edit by hand\nwindow.DISHES = "
        + json.dumps(out, ensure_ascii=False, indent=0) + ";\n", encoding="utf-8")
    vj = ROOT / "data/videos.json"  # produced by tools/fetch_videos.py
    vids = json.loads(vj.read_text(encoding="utf-8")) if vj.exists() else {}
    (ROOT / "data/videos.js").write_text(
        "// generated by tools/build_data.py from data/videos.json\nwindow.VIDEOS = "
        + json.dumps({r["id"]: vids[r["id"]] for r in rows if vids.get(r["id"])}, ensure_ascii=False) + ";\n",
        encoding="utf-8")
    print(len(out), "dishes,", sum(1 for r in rows if r["img"]), "with photos")


main()
