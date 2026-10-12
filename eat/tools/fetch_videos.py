#!/usr/bin/env python3
"""Find recipe videos for every dish: data/videos.json = {dish id: [{id,title,channel,len}, ...]}.

Scrapes the first YouTube search results page (no API key). Chinese dishes are searched by
their Chinese name + 做法, foreign cuisines by English name + recipe. Re-runs only fill gaps.
"""
import json, random, re, time, urllib.parse, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data/videos.json"
FOREIGN = ("日料", "韩餐", "东南亚", "南亚", "西餐", "中东", "烘焙")
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36"


def minutes(txt):
    if not txt: return 999
    parts = [int(x) for x in txt.split(":")]
    sec = 0
    for p in parts: sec = sec * 60 + p
    return sec / 60


def search(q):
    url = "https://www.youtube.com/results?hl=en&search_query=" + urllib.parse.quote(q)
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "en-US,en;q=0.9"})
    html = urllib.request.urlopen(req, timeout=30).read().decode()
    m = re.search(r"var ytInitialData = (\{.*?\});</script>", html)
    out = []

    def walk(o):
        if isinstance(o, dict):
            if "videoRenderer" in o:
                v = o["videoRenderer"]
                out.append({"id": v["videoId"], "title": v["title"]["runs"][0]["text"],
                            "channel": v.get("ownerText", {}).get("runs", [{}])[0].get("text", ""),
                            "len": v.get("lengthText", {}).get("simpleText", "")})
            for x in o.values(): walk(x)
        elif isinstance(o, list):
            for x in o: walk(x)
    if m: walk(json.loads(m.group(1)))
    return [v for v in out if 0.5 <= minutes(v["len"]) <= 20][:2]


def main():
    dishes = json.loads((ROOT / "data/dishes.js").read_text(encoding="utf-8").split("=", 1)[1].rstrip().rstrip(";"))
    cache = json.loads(OUT.read_text()) if OUT.exists() else {}
    for i, d in enumerate(dishes):
        if cache.get(d["id"]): continue
        q = d["yt"] + " recipe" if d["cat"].split()[-1] in FOREIGN or any(f in d["cat"] for f in FOREIGN) else d["zh"] + " 做法"
        try:
            cache[d["id"]] = search(q)
        except Exception as e:
            print("fail", d["id"], e); time.sleep(10); continue
        print(i, d["zh"], "->", cache[d["id"]][0]["title"] if cache[d["id"]] else "NONE", flush=True)
        if i % 20 == 0: OUT.write_text(json.dumps(cache, ensure_ascii=False))
        time.sleep(random.uniform(0.8, 1.6))
    OUT.write_text(json.dumps(cache, ensure_ascii=False, indent=0))


main()
