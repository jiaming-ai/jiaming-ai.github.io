#!/usr/bin/env python3
"""SEO / AI-search build step for jiaming.im (Python stdlib only).

Run from anywhere after adding a blog post, lesson, or publication:

    python3 tools/seo/build.py

It is idempotent and (re)generates:

  * a head block between <!-- seo:start --> and <!-- seo:end --> on every public page:
    canonical URL, Open Graph / Twitter card, and schema.org JSON-LD
  * a prerendered publication list inside #publications-list (index.html and
    pages/research.html) so crawlers that do not run JavaScript still see the papers;
    js/main.js replaces it with an identical list once data/publications.json loads
  * the static Chinese edition of every main page under zh/ (see zh_edition.py): Chinese-only HTML at
    its own URL with canonical + hreflang links, so Chinese pages can be indexed and ranked separately
  * sitemap.xml (with hreflang alternates), robots.txt, llms.txt, llms-full.txt, feed.xml

Flags:  --bump   also bump the ?v= cache-busting query on css/js links before building

Sources of truth: data/publications.json, the post cards in pages/blog.html, and each
page's own <title> / <meta name="description"> (a page without a description fails the run).
"""
import html
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import zh_edition  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
SITE = "https://jiaming.im"
NAME = "Jiaming Wang"
PERSON_ID = SITE + "/#person"
OG_IMAGE = SITE + "/assets/img/og-card.png"
OG_ALT = "Jiaming Wang, robotics and embodied AI researcher at the National University of Singapore"
OG_ALT_ZH = "Jiaming Wang，新加坡国立大学机器人与具身智能研究者"
LINKEDIN = "https://www.linkedin.com/in/jiaming-wang-ai/"
GITHUB = "https://github.com/jiaming-ai"
# Project pages that live in other repositories but are served from this domain.
EXTERNAL_PAGES = [SITE + "/CROSS/", SITE + "/VideoSocNav/", SITE + "/genie/"]
# Site-verification meta tags for the home page. Paste the token Google / Bing give you, then rebuild.
VERIFICATION = {"google-site-verification": "", "msvalidate.01": ""}
# Cloudflare Web Analytics site token (Cloudflare dashboard > Web Analytics > your site > JS snippet).
# Cookieless, so no consent banner is needed. Empty = nothing emitted.
CLOUDFLARE_ANALYTICS_TOKEN = "0748c4ccdb7e4335b7236731918036b2"
# Google Analytics 4 measurement ID, e.g. "G-ABC123XYZ9" (GA: Admin > Data streams > your stream).
# Empty = no analytics code is emitted on any page. The site has no cookie banner, so visitors from the
# EEA, UK and Switzerland start with analytics storage denied (Google Consent Mode: cookieless pings only).
ANALYTICS_ID = ""
CONSENT_DENIED_REGIONS = ["AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT",
                          "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE", "IS", "LI", "NO",
                          "GB", "CH"]


def analytics_lines():
    lines = []
    if CLOUDFLARE_ANALYTICS_TOKEN:
        assert re.fullmatch(r"[0-9a-f]{32}", CLOUDFLARE_ANALYTICS_TOKEN), "CLOUDFLARE_ANALYTICS_TOKEN must be 32 hex chars"
        lines.append("<script type=\"module\" src=\"https://static.cloudflareinsights.com/beacon.min.js\" "
                     "data-cf-beacon='{\"token\": \"%s\"}'></script>" % CLOUDFLARE_ANALYTICS_TOKEN)
    if not ANALYTICS_ID:
        return lines
    assert re.fullmatch(r"G-[A-Z0-9]{4,}", ANALYTICS_ID), "ANALYTICS_ID must look like G-XXXXXXXXXX"
    return lines + [
        '<script async src="https://www.googletagmanager.com/gtag/js?id=%s"></script>' % ANALYTICS_ID,
        "<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}"
        "gtag('consent','default',{analytics_storage:'denied',region:%s});gtag('js',new Date());"
        "gtag('config','%s');</script>" % (json.dumps(CONSENT_DENIED_REGIONS), ANALYTICS_ID),
    ]

BLOCK_RE = re.compile(r"[ \t]*<!-- seo:start.*?<!-- seo:end -->\n?", re.S)
PUBS_RE = re.compile(r"<!-- seo:pubs:start -->.*?<!-- seo:pubs:end -->", re.S)
PUBS_PLACEHOLDER = "<!-- Publications will be inserted here by JavaScript -->"

CORE_PAGES = ["index.html", "pages/about.html", "pages/research.html", "pages/blog.html", "pages/contact.html"]

KNOWS_ABOUT = [
    "Robotics", "Embodied AI", "Robot navigation", "Topological mapping", "Visual relocalization",
    "Long-term robot memory", "Object search", "Social navigation", "Vision-language-action models",
    "Robot learning", "Agentic robotics", "World models",
]
AWARDS = [
    "Champion, REAL-I: Real-world Embodied AI Learning Challenge, IEEE ICRA 2026",
    "Champion, Earth Rover Challenge, IEEE ICRA 2025",
    "Best Workshop Paper Prize, WIR-M Workshop, IEEE/RSJ IROS 2025 (TOG)",
    "Best Paper Award, RoDGE Workshop, IEEE/RSJ IROS 2025 (GBPP)",
    "Forbes China 30 Under 30 (2014)",
]
KNOWS_ABOUT_ZH = ["机器人学", "具身智能", "机器人导航", "拓扑建图", "视觉重定位", "机器人长期记忆", "物体搜索",
                  "社交导航", "视觉-语言-动作模型", "机器人学习", "智能体机器人", "世界模型"]
AWARDS_ZH = [
    "冠军，REAL-I 真实世界具身智能学习挑战赛，IEEE ICRA 2026",
    "冠军，Earth Rover Challenge，IEEE ICRA 2025",
    "Workshop 最佳论文奖，WIR-M Workshop，IEEE/RSJ IROS 2025（TOG）",
    "最佳论文奖，RoDGE Workshop，IEEE/RSJ IROS 2025（GBPP）",
    "福布斯中国 30 Under 30（2014）",
]
PERSON_DESC_ZH = ("新加坡国立大学计算机科学博士生（CLeAR 实验室，导师 Harold Soh），研究机器人导航、空间记忆与具身智能。"
                  "ICRA 2026 REAL-I 挑战赛与 ICRA 2025 Earth Rover Challenge 冠军。")
PERSON_DESC = (
    "PhD candidate in Computer Science at the National University of Singapore (CLeAR Lab, advised by "
    "Harold Soh), working on robot navigation, spatial memory and embodied AI. Champion of REAL-I at "
    "ICRA 2026 and the Earth Rover Challenge at ICRA 2025."
)


# ---------------------------------------------------------------- helpers
def read(rel):
    return (ROOT / rel).read_text(encoding="utf-8")


CHANGED = []


def write(rel, text):
    p = ROOT / rel
    if p.exists() and p.read_text(encoding="utf-8") == text:
        return
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text, encoding="utf-8")
    CHANGED.append(rel)


def canonical(rel):
    """'index.html' -> '/', 'robotics101/index.html' -> '/robotics101/'."""
    if rel == "index.html" or rel.endswith("/index.html"):
        rel = rel[: -len("index.html")]
    return SITE + "/" + rel


def attr(s):
    return html.escape(s, quote=True)


def tr(en, zh, lang):
    return zh if lang == "zh" else en


def page_url(rel, lang="en"):
    """Canonical URL of page `rel` in `lang`; the Chinese twin of x lives at zh/x."""
    return canonical(("zh/" + rel) if lang == "zh" else rel)


def head_of(doc):
    m = re.search(r"<head\b.*?</head>", doc, re.S | re.I)
    assert m, "no <head>"
    return m.group(0)


def get_title(doc):
    m = re.search(r"<title[^>]*>(.*?)</title>", doc, re.S)
    return html.unescape(re.sub(r"\s+", " ", m.group(1)).strip())


def get_desc(doc):
    m = re.search(r'<meta\s+name="description"[^>]*?\scontent="([^"]*)"', head_of(doc))
    return html.unescape(m.group(1)).strip() if m else None


def body_attr(doc, name):
    m = re.search(r"<body\b[^>]*?\s%s=\"([^\"]*)\"" % re.escape(name), doc)
    return html.unescape(m.group(1)) if m else None


def jsonld(obj):
    body = json.dumps(obj, ensure_ascii=False, indent=2).replace("</", "<\\/")
    return '<script type="application/ld+json">\n%s\n</script>' % body


# ---------------------------------------------------------------- data
PUBS = json.loads(read("data/publications.json"))


def pub_abs_links(p):
    out = {}
    for k, v in (p.get("links") or {}).items():
        if not v or v == "#":
            continue
        out[k] = v if re.match(r"https?:", v) else SITE + "/" + v.lstrip("/")
    return out


def pub_url(p):
    links = pub_abs_links(p)
    for k in ("project", "arxiv", "paper", "blog"):
        if k in links:
            return links[k]
    return None


def blog_posts():
    """Post cards from pages/blog.html -> list of dicts, newest first as listed there."""
    doc = read("pages/blog.html")
    posts = []
    for m in re.finditer(r'<a href="blog/([^"]+)" class="blog-post-link"(.*?)</a>', doc, re.S):
        slug, rest = m.group(1), m.group(2)
        attrs = {k: html.unescape(v) for k, v in re.findall(r'data-([\w-]+)="([^"]*)"', rest)}
        date = re.search(r'blog-post-date">(\d{4}-\d{2}-\d{2})<', rest)
        assert date, "no date for " + slug
        posts.append({
            "rel": "pages/blog/" + slug,
            "url": SITE + "/pages/blog/" + slug,
            "title": attrs["title-en"], "title_zh": attrs.get("title-zh", ""),
            "summary": attrs["summary-en"], "summary_zh": attrs.get("summary-zh", ""),
            "tags": [t for t in attrs.get("tags", "").split(",") if t],
            "date": date.group(1),
        })
    assert posts, "no blog posts found in pages/blog.html"
    return posts


POSTS = blog_posts()



def course_pages():
    return sorted(str(p.relative_to(ROOT)) for p in (ROOT / "robotics101").rglob("*.html"))


# Pages that get a static Chinese twin under zh/ (the rest, e.g. ecrom/ and the md2img tool, stay English-only)
ZH_SOURCES = CORE_PAGES + [p["rel"] for p in POSTS] + course_pages()
ZH_SET = set(ZH_SOURCES)


# ---------------------------------------------------------------- schema.org nodes
def person_ref():
    return {"@type": "Person", "@id": PERSON_ID, "name": NAME, "url": SITE + "/"}


def person_full(lang="en"):
    return {
        "@type": "Person", "@id": PERSON_ID, "name": NAME, "url": SITE + "/",
        "image": SITE + "/assets/img/profile.jpeg",
        "jobTitle": tr("PhD Candidate, Computer Science", "计算机科学博士生", lang),
        "description": tr(PERSON_DESC, PERSON_DESC_ZH, lang),
        "affiliation": {
            "@type": "CollegeOrUniversity", "name": tr("National University of Singapore", "新加坡国立大学", lang),
            "url": "https://www.nus.edu.sg/",
            "department": {"@type": "Organization",
                           "name": tr("School of Computing, National University of Singapore", "新加坡国立大学计算学院", lang),
                           "url": "https://www.comp.nus.edu.sg/"},
        },
        "address": {"@type": "PostalAddress", "addressLocality": tr("Singapore", "新加坡", lang), "addressCountry": "SG"},
        "knowsAbout": tr(KNOWS_ABOUT, KNOWS_ABOUT_ZH, lang),
        "award": tr(AWARDS, AWARDS_ZH, lang),
        "sameAs": [LINKEDIN, GITHUB],
    }


def website_node(lang="en"):
    return {
        "@type": "WebSite", "@id": SITE + "/#website", "url": SITE + "/", "name": NAME,
        "description": tr("Academic homepage of Jiaming Wang: robotics and embodied AI research, publications, blog and an interactive robotics course.",
                          "Jiaming Wang 的学术主页：机器人与具身智能研究、论文、博客与交互式机器人入门课。", lang),
        "inLanguage": ["en", "zh-Hans"], "publisher": {"@id": PERSON_ID},
    }


def breadcrumb(items):
    return {
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": i + 1, "name": n, "item": u} for i, (n, u) in enumerate(items)
        ],
    }


def article_node(p, with_context=False):
    authors = [a.strip() for a in p["authors"].split(",")]
    node = {
        "@type": "ScholarlyArticle", "name": p["title"], "headline": p["title"],
        "author": [person_ref() if a == NAME else {"@type": "Person", "name": a} for a in authors],
        "datePublished": str(p["year"]),
        "publication": {"@type": "PublicationEvent", "name": p["venue"]},
        "inLanguage": "en", "isAccessibleForFree": True,
    }
    url = pub_url(p)
    if url:
        node["url"] = url
    same = list(pub_abs_links(p).values())
    if same:
        node["sameAs"] = same
    if p.get("award"):
        node["award"] = p["award"]
    if with_context:
        node["@context"] = "https://schema.org"
    return node


# ---------------------------------------------------------------- per-page SEO block
def page_spec(rel, doc, lang="en"):
    """Return (url, title, desc, og_type, [jsonld nodes], extra head lines) for a page in `lang`."""
    T = lambda en, zh: tr(en, zh, lang)
    url = page_url(rel, lang)
    title = get_title(doc)
    desc = get_desc(doc)
    extra = []
    nodes = []
    og_type = "website"
    in_lang = T("en", "zh-Hans")
    home_crumb = (T("Home", "首页"), page_url("index.html", lang))
    feed_link = '<link rel="alternate" type="application/atom+xml" title="Jiaming Wang: Blog" href="/feed.xml">'

    if rel == "index.html":
        nodes = [website_node(lang), {"@type": "ProfilePage", "@id": SITE + "/#profile", "url": url, "name": title,
                                      "description": desc, "mainEntity": {"@id": PERSON_ID},
                                      "isPartOf": {"@id": SITE + "/#website"}, "inLanguage": in_lang},
                 person_full(lang)]
        extra.append(feed_link)
    elif rel == "pages/about.html":
        nodes = [{"@type": "AboutPage", "url": url, "name": title, "description": desc, "inLanguage": in_lang,
                  "mainEntity": {"@id": PERSON_ID}, "isPartOf": {"@id": SITE + "/#website"}},
                 person_full(lang), breadcrumb([home_crumb, (T("About", "关于"), url)])]
    elif rel == "pages/contact.html":
        nodes = [{"@type": "ContactPage", "url": url, "name": title, "description": desc, "inLanguage": in_lang,
                  "mainEntity": person_ref(), "isPartOf": {"@id": SITE + "/#website"}},
                 breadcrumb([home_crumb, (T("Contact", "联系"), url)])]
    elif rel == "pages/research.html":
        nodes = [{"@type": "CollectionPage", "url": url, "name": title, "description": desc, "inLanguage": in_lang,
                  "about": person_ref(), "isPartOf": {"@id": SITE + "/#website"},
                  "mainEntity": {"@type": "ItemList", "name": T("Publications by Jiaming Wang", "Jiaming Wang 的论文"),
                                 "numberOfItems": len(PUBS),
                                 "itemListElement": [{"@type": "ListItem", "position": i + 1, "item": article_node(p)}
                                                     for i, p in enumerate(PUBS)]}},
                 breadcrumb([home_crumb, (T("Research", "研究"), url)])]
    elif rel == "pages/blog.html":
        nodes = [{"@type": "Blog", "url": url, "name": T("Jiaming Wang: Blog", "Jiaming Wang 的博客"),
                  "description": desc, "author": person_ref(), "inLanguage": in_lang,
                  "blogPost": [{"@type": "BlogPosting", "headline": T(p["title"], p["title_zh"] or p["title"]),
                                "url": page_url(p["rel"], lang), "datePublished": p["date"]} for p in POSTS]},
                 breadcrumb([home_crumb, (T("Blog", "博客"), url)])]
        extra.append(feed_link)
    elif rel.startswith("pages/blog/"):
        post = next(p for p in POSTS if p["rel"] == rel)
        og_type = "article"
        head_t = T(post["title"], post["title_zh"] or post["title"])
        title = head_t + " - " + NAME
        desc = T(post["summary"], post["summary_zh"] or post["summary"])
        blog_url = page_url("pages/blog.html", lang)
        nodes = [{"@type": "BlogPosting", "headline": head_t,
                  "alternativeHeadline": T(post["title_zh"], post["title"]) or None,
                  "description": desc, "url": url, "mainEntityOfPage": url,
                  "datePublished": post["date"], "dateModified": post["date"],
                  "author": person_ref(), "publisher": person_ref(),
                  "image": OG_IMAGE, "keywords": post["tags"], "inLanguage": in_lang,
                  "isPartOf": {"@type": "Blog", "url": blog_url, "name": T("Jiaming Wang: Blog", "Jiaming Wang 的博客")}},
                 breadcrumb([home_crumb, (T("Blog", "博客"), blog_url), (head_t, url)])]
        nodes[0] = {k: v for k, v in nodes[0].items() if v}
    elif rel == "ecrom/index.html":
        pub = next(p for p in PUBS if p["title"].startswith("Retrospective Open-Vocabulary Memory"))
        node = article_node(pub)
        node.update({"url": url, "description": desc})
        node["sameAs"] = [u for u in node.get("sameAs", []) if u != url]
        nodes = [node, breadcrumb([home_crumb, ("Research", SITE + "/pages/research.html"), ("ECROM", url)])]
        og_type = "article"
    elif rel == "robotics101/index.html":
        course_name = T("Robotics for Beginners", "Robotics for Beginners · 具身智能入门")
        nodes = [{"@type": "Course", "@id": SITE + "/robotics101/#course", "name": course_name,
                  "description": desc, "url": url, "provider": person_ref(), "author": person_ref(),
                  "inLanguage": in_lang, "isAccessibleForFree": True, "educationalLevel": T("Beginner", "入门"),
                  "teaches": T(["Linear algebra", "Probability", "Lie groups and rigid-body motion", "Optimization",
                                "Motion planning and control", "Robot learning", "Vision-language-action models",
                                "Agentic robotics"],
                               ["线性代数", "概率", "李群与刚体运动", "优化", "运动规划与控制", "机器人学习",
                                "视觉-语言-动作模型", "智能体机器人"])},
                 breadcrumb([home_crumb, (course_name, url)])]
    elif rel.startswith("robotics101/"):
        key = T("data-title-en", "data-title-zh")
        en_title = body_attr(doc, key) or title
        title = en_title
        course_name = T("Robotics for Beginners", "具身智能入门")
        crumbs = [home_crumb, (course_name, page_url("robotics101/index.html", lang))]
        if rel == "robotics101/part1/index.html":
            nodes = [{"@type": "CollectionPage", "url": url, "name": en_title, "description": desc,
                      "isPartOf": {"@type": "Course", "@id": SITE + "/robotics101/#course"}, "author": person_ref(),
                      "inLanguage": in_lang}]
            crumbs.append((en_title.split(" · ")[0], url))
        else:
            part = read("robotics101/part1/index.html")
            part_title = (body_attr(part, key) or "Part I").split(" · ")[0]
            nodes = [{"@type": "LearningResource", "name": en_title, "description": desc, "url": url,
                      "learningResourceType": T("Interactive lesson", "交互式课程"),
                      "isPartOf": {"@type": "Course", "@id": SITE + "/robotics101/#course"},
                      "author": person_ref(), "inLanguage": in_lang, "isAccessibleForFree": True}]
            crumbs += [(part_title, page_url("robotics101/part1/index.html", lang)), (en_title.split(" · ")[0], url)]
        nodes.append(breadcrumb(crumbs))
    else:
        raise SystemExit("no SEO spec for " + rel)

    assert desc, rel + " has no <meta name=\"description\">"
    return url, title, desc, og_type, nodes, extra


# zh-preferring visitors who land on an English URL are sent to its /zh/ twin (stored or browser
# language is Chinese; ?lang=en opts out). Crawlers send no zh preference, so they are not redirected.
ZH_REDIRECT = ('<script>(function(){try{var d=document.documentElement;if((d.getAttribute("data-site-lang")||d.getAttribute("data-lang-ui"))!=="zh")return;'
               'if(new URLSearchParams(location.search).get("lang")==="en")return;'
               'var a=document.querySelector(\'link[rel="alternate"][hreflang="zh-Hans"]\');if(!a)return;'
               'var t=new URL(a.href).pathname;if(t!==location.pathname)location.replace(t+location.hash)}catch(e){}})()</script>')


def seo_block(doc, rel, lang="en"):
    url, title, desc, og_type, nodes, extra = page_spec(rel, doc, lang)
    outside = BLOCK_RE.sub("", head_of(doc))
    has = lambda pat: re.search(pat, outside)
    paired = rel in ZH_SET
    L = []
    if not has(r'<meta\s+name="description"'):
        L.append('<meta name="description" content="%s">' % attr(desc))
    if not has(r'rel="canonical"'):
        L.append('<link rel="canonical" href="%s">' % attr(url))
    if paired:
        L.append('<link rel="alternate" hreflang="en" href="%s">' % attr(page_url(rel, "en")))
        L.append('<link rel="alternate" hreflang="zh-Hans" href="%s">' % attr(page_url(rel, "zh")))
        L.append('<link rel="alternate" hreflang="x-default" href="%s">' % attr(page_url(rel, "en")))
        if lang == "en":
            L.append(ZH_REDIRECT)
    own_image = has(r'property="og:image"')
    og = [("og:type", og_type), ("og:site_name", NAME),
          ("og:locale", tr("en_US", "zh_CN", lang))]
    if paired:
        og.append(("og:locale:alternate", tr("zh_CN", "en_US", lang)))
    og += [("og:title", title), ("og:description", desc), ("og:url", url)]
    if not own_image:
        og += [("og:image", OG_IMAGE), ("og:image:width", "1200"), ("og:image:height", "630"),
               ("og:image:alt", tr(OG_ALT, OG_ALT_ZH, lang))]
    for prop, val in og:
        if not has(r'property="%s"' % re.escape(prop)):
            L.append('<meta property="%s" content="%s">' % (prop, attr(val)))
    if not has(r'name="twitter:card"'):
        L.append('<meta name="twitter:card" content="summary_large_image">')
    if og_type == "article" and rel.startswith("pages/blog/"):
        post = next(p for p in POSTS if p["rel"] == rel)
        L.append('<meta property="article:published_time" content="%s">' % post["date"])
        L.append('<meta property="article:author" content="%s">' % (SITE + "/"))
        for t in post["tags"]:
            L.append('<meta property="article:tag" content="%s">' % attr(t))
    if not has(r'<meta\s+name="author"'):
        L.append('<meta name="author" content="%s">' % NAME)
    if rel == "index.html" and lang == "en":
        for name, token in VERIFICATION.items():
            if token:
                L.append('<meta name="%s" content="%s">' % (name, attr(token)))
    L += extra
    L += analytics_lines()
    graph = {"@context": "https://schema.org", "@graph": nodes}
    L.append(jsonld(graph))
    body = "\n".join("    " + line if not line.startswith("<script") else "    " + line.replace("\n", "\n    ")
                     for line in L)
    return "    <!-- seo:start (generated by tools/seo/build.py; do not edit by hand) -->\n%s\n    <!-- seo:end -->\n" % body


def apply_block(rel):
    doc = read(rel)
    block = seo_block(doc, rel)
    if BLOCK_RE.search(doc):
        new = BLOCK_RE.sub(lambda m: block, doc, count=1)
    else:
        i = doc.lower().index("</head>")
        # insert at the start of the </head> line
        line_start = doc.rfind("\n", 0, i) + 1
        new = doc[:line_start] + block + doc[line_start:]
    write(rel, new)


# ---------------------------------------------------------------- Chinese edition
BOOTSTRAP_RE = r"<script>\(function\(\)\{var d=document\.documentElement,l;.*?\}\)\(\)</script>"
ZH_BOOTSTRAP = ("<script>(function(){var d=document.documentElement;d.setAttribute('data-site-lang','zh');"
                "d.lang='zh-Hans'})()</script>")


COURSE_BOOTSTRAP_RE = r"<script>\(function\(\)\{var d=document\.documentElement,t='dark',l=null;.*?\}\)\(\);</script>"
COURSE_ZH_BOOTSTRAP = ("<script>(function(){var d=document.documentElement,t='dark';try{t=localStorage.getItem('theme')||'dark'}"
                       "catch(e){}d.setAttribute('data-theme',t);d.setAttribute('data-lang-ui','zh');d.lang='zh-Hans'})();</script>")


def course_zh_desc(doc):
    """Chinese meta description for a course page: its own Chinese lede, minus markup and formulas."""
    m = re.search(r'<p class="lede">\s*<span data-lang="zh">(.*?)</span>\s*<span data-lang="en">', doc, re.S)
    if not m:
        return None
    t = re.sub(r"\\\(.*?\\\)|\$\$.*?\$\$", "", m.group(1), flags=re.S)
    t = html.unescape(re.sub(r"<[^>]+>", "", t))
    t = re.sub(r"\s+", " ", t).strip()
    if len(t) > 118:
        cut = max(t.rfind(c, 0, 118) for c in "。！？；")
        t = t[:cut + 1] if cut >= 40 else t[:117] + "…"
    return t


def build_zh(rel):
    doc = BLOCK_RE.sub("", read(rel))
    post = next((p for p in POSTS if p["rel"] == rel), None)
    zh_title = ((post["title_zh"] or post["title"]) + " - " + NAME) if post else None
    course = rel.startswith("robotics101/")
    out = zh_edition.to_zh(doc, rel, ZH_SET, COURSE_BOOTSTRAP_RE if course else BOOTSTRAP_RE,
                           COURSE_ZH_BOOTSTRAP if course else ZH_BOOTSTRAP, zh_title)
    zh_desc = (post["summary_zh"] or post["summary"]) if post else (course_zh_desc(doc) if course else None)
    if zh_desc:  # replace an existing English <meta description>
        out = re.sub(r'(<meta\s+name="description"[^>]*\scontent=")[^"]*(")',
                     lambda m: m.group(1) + attr(zh_desc) + m.group(2), out, count=1)
    out = re.sub(r'[ \t]*<meta property="og:[^"]*" content="[^"]*">\n?', "", out)  # regenerated in Chinese below
    block = seo_block(out, rel, "zh")
    i = out.lower().index("</head>")
    line_start = out.rfind("\n", 0, i) + 1
    out = out[:line_start] + block + out[line_start:]
    leftover = re.findall(r'\s(?:data-)?lang="en"', out)
    assert not leftover, "%s: English-marked elements survived in the Chinese edition" % rel
    write("zh/" + rel, out)


# ---------------------------------------------------------------- prerendered publications
def L2(en, zh):
    return '<span lang="en">%s</span><span lang="zh-Hans">%s</span>' % (en, zh)


def render_pubs(selected_only, root):
    """Mirror of renderPublications()/pubLinkButtons() in js/main.js (keep in sync)."""
    labels = {"arxiv": "arXiv", "paper": L2("Paper", "论文"), "code": L2("Code", "代码"),
              "project": L2("Project", "项目"), "video": L2("Video", "视频"), "blog": L2("Blog", "博客")}
    icons = {"arxiv": "fas fa-file-lines", "paper": "fas fa-file-pdf", "code": "fab fa-github",
             "project": "fas fa-globe", "video": "fas fa-video", "blog": "fas fa-pen-nib"}
    pubs = [p for p in PUBS if p.get("selected")] if selected_only else PUBS
    out, last_year = [], None
    for i, p in enumerate(pubs):
        pid = "pub-%d" % i
        authors = html.escape(p["authors"], quote=False).replace(NAME, '<strong class="pub-me">%s</strong>' % NAME, 1)
        year_header = '<div class="pub-year">%s</div>' % p["year"] if (not selected_only and p["year"] != last_year) else ""
        last_year = p["year"]
        btns = []
        for k, url in (p.get("links") or {}).items():
            if not url or url == "#":
                continue
            ext = bool(re.match(r"https?:", url))
            href = url if ext else root + url
            btns.append('<a href="%s" class="pub-btn"%s><i class="%s"></i>%s</a>' % (
                attr(href), ' target="_blank" rel="noopener noreferrer"' if ext else "",
                icons.get(k, "fas fa-link"), labels.get(k, k)))
        btns.append('<button type="button" class="pub-btn" onclick="showBibtex(\'%s\')"><i class="fas fa-quote-right"></i>BibTeX</button>' % pid)
        award = ""
        if p.get("award"):
            award = '<div class="award-badge"><i class="fas fa-trophy"></i>%s</div>' % L2(
                html.escape(p["award"], quote=False), html.escape(p.get("awardZh") or p["award"], quote=False))
        out.append(
            '%s<article class="pub-entry spotlight"><div class="pub-venue-tag">%s</div><div class="pub-body">'
            '<div class="pub-title">%s</div><div class="pub-authors">%s</div><div class="pub-venue">%s, %s</div>%s'
            '<div class="pub-actions">%s</div><pre id="bibtex-%s" class="pub-bibtex" hidden>%s</pre></div></article>' % (
                year_header, html.escape(p.get("venueShort") or p["venue"], quote=False),
                html.escape(p["title"], quote=False), authors, html.escape(p["venue"], quote=False), p["year"],
                award, "".join(btns), pid, html.escape(p["bibtex"], quote=False)))
    return "\n".join(out)


def apply_pubs(rel, selected_only, root):
    doc = read(rel)
    block = "<!-- seo:pubs:start -->\n%s\n<!-- seo:pubs:end -->" % render_pubs(selected_only, root)
    if PUBS_RE.search(doc):
        new = PUBS_RE.sub(lambda m: block, doc, count=1)
    else:
        assert PUBS_PLACEHOLDER in doc, "publication placeholder missing in " + rel
        new = doc.replace(PUBS_PLACEHOLDER, block, 1)
    write(rel, new)


# ---------------------------------------------------------------- sitemap / robots / feed / llms
def build_sitemap(pages):
    rows = []

    def entry(rel, lang):
        post = next((p for p in POSTS if p["rel"] == rel), None)
        lm = "<lastmod>%s</lastmod>" % post["date"] if post else ""
        alts = ""
        if rel in ZH_SET:
            alts = "".join('<xhtml:link rel="alternate" hreflang="%s" href="%s"/>' % (hl, html.escape(page_url(rel, lg)))
                           for hl, lg in (("en", "en"), ("zh-Hans", "zh"), ("x-default", "en")))
        rows.append("  <url><loc>%s</loc>%s%s</url>" % (html.escape(page_url(rel, lang)), lm, alts))

    for rel in pages:
        entry(rel, "en")
        if rel in ZH_SET:
            entry(rel, "zh")
    for url in EXTERNAL_PAGES:
        rows.append("  <url><loc>%s</loc></url>" % html.escape(url))
    return ('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '
            'xmlns:xhtml="http://www.w3.org/1999/xhtml">\n%s\n</urlset>\n' % "\n".join(rows))


AI_BOTS = ["OAI-SearchBot", "ChatGPT-User", "GPTBot", "Claude-SearchBot", "Claude-User", "ClaudeBot",
           "PerplexityBot", "Perplexity-User", "Google-Extended", "Applebot-Extended", "Bingbot",
           "DuckAssistBot", "Amazonbot", "CCBot", "meta-externalagent", "MistralAI-User"]


def build_robots():
    bots = "\n\n".join("User-agent: %s\nAllow: /" % b for b in AI_BOTS)
    return ("# Everything is public and crawlable, including AI search and assistant crawlers.\n"
            "# To opt out of AI model training only, disallow GPTBot, ClaudeBot, Google-Extended,\n"
            "# Applebot-Extended, CCBot, Amazonbot and meta-externalagent below.\n\n"
            "User-agent: *\nAllow: /\n\n%s\n\nSitemap: %s/sitemap.xml\n" % (bots, SITE))


def build_feed():
    updated = max(p["date"] for p in POSTS) + "T00:00:00Z"
    entries = []
    for p in sorted(POSTS, key=lambda p: p["date"], reverse=True):
        entries.append(
            "  <entry>\n    <title>%s</title>\n    <link href=\"%s\"/>\n    <id>%s</id>\n    <updated>%sT00:00:00Z</updated>\n"
            "    <summary>%s</summary>\n    <author><name>%s</name></author>\n%s  </entry>" % (
                html.escape(p["title"], quote=False), p["url"], p["url"], p["date"],
                html.escape(p["summary"], quote=False), NAME,
                "".join('    <category term="%s"/>\n' % attr(t) for t in p["tags"])))
    return ('<?xml version="1.0" encoding="utf-8"?>\n<feed xmlns="http://www.w3.org/2005/Atom">\n'
            '  <title>Jiaming Wang: Blog</title>\n  <subtitle>Robotics, vision-language-action models and embodied AI</subtitle>\n'
            '  <link href="%s/feed.xml" rel="self"/>\n  <link href="%s/pages/blog.html"/>\n  <id>%s/</id>\n'
            '  <updated>%s</updated>\n  <author><name>%s</name></author>\n%s\n</feed>\n'
            % (SITE, SITE, SITE, updated, NAME, "\n".join(entries)))


def pub_line(p, full=False):
    links = pub_abs_links(p)
    url = pub_url(p)
    meta = "%s, %s" % (p["venue"], p["year"])
    if p.get("award"):
        meta += " (%s)" % p["award"]
    line = "- [%s](%s): %s. %s" % (p["title"], url, p["authors"], meta) if url else "- %s: %s. %s" % (p["title"], p["authors"], meta)
    if full:
        extra = ["%s: %s" % (k, v) for k, v in links.items() if v != url]
        if extra:
            line += " (" + "; ".join(extra) + ")"
    return line


RESEARCH_LINES = """\
**1. Open and robust environment representation**: representations that work across environments, conditions and sensing modalities.
- CROSS: open-world topological representation and localization (NeurIPS 2026).
- ECROM: extends CROSS to long-term, open-vocabulary object search (under review).
- CROSS v2: stereo and monocular-inertial modes, local factor-graph smoothing, cloud support and large-scale operation with GPS (in progress).
- CROSS-UW: CROSS for underwater environments and multi-session relocalization (in progress).
- Exploring richer semantic representations inside the CROSS topological framework.

**2. Robust robot policies in the open world**: policies that generalize beyond the lab.
- GeNIE: generalizable in-the-wild navigation; won the Earth Rover Challenge at ICRA 2025 (RA-L).
- VLA post-training: won the REAL-I Challenge at ICRA 2026, which also brought the lab a US$70,000 humanoid robot.
- Social navigation from video: learning socially appropriate navigation from large-scale video (under review).
- Agentic robotics: foundation-model agents that reason, act and improve in robotic systems (survey published).
- Agentic world models: a VLM builds and reasons over a model of the world instead of directly predicting actions (early results, manipulation and navigation).
"""


def build_llms(pages_desc):
    selected = [p for p in PUBS if p.get("selected")]
    L = ["# Jiaming Wang", "",
         "> Jiaming Wang is a PhD candidate in Computer Science at the National University of Singapore (NUS), "
         "advised by Harold Soh, working on robot navigation, spatial memory and embodied AI. With team NUS-CLEAR "
         "he won the REAL-I Challenge at ICRA 2026 and the Earth Rover Challenge at ICRA 2025. This site is his "
         "academic homepage; every page is bilingual (English / 中文).", "",
         "Jiaming Wang is a common name. This Jiaming Wang is the robotics researcher at NUS (School of Computing, "
         "CLeAR Lab, Singapore) and a co-founder of iCarsClub. He is recruiting student researchers.", "",
         "Chinese edition: every main page has a Chinese-only twin under %s/zh/ (for example %s)." % (
             SITE, page_url("pages/about.html", "zh")), "",
         "## Main pages", ""]
    for name, rel in [("Home", "index.html"), ("Research and publications", "pages/research.html"),
                      ("About", "pages/about.html"), ("Blog", "pages/blog.html"),
                      ("Robotics for Beginners (course)", "robotics101/index.html"), ("Contact", "pages/contact.html")]:
        L.append("- [%s](%s): %s" % (name, canonical(rel), pages_desc[rel]))
    L += ["", "## Research projects", "",
          "- [CROSS](%s/CROSS/): change-robust online spatial-semantic topological mapping and relocalization (NeurIPS 2026)" % SITE,
          "- [ECROM](%s/ecrom/): retrospective open-vocabulary memory for long-term object search" % SITE,
          "- [GeNIE](https://jiaming.im/genie/): generalizable navigation system for in-the-wild environments",
          "", "## Blog posts", ""]
    for p in POSTS:
        L.append("- [%s](%s): %s (%s)" % (p["title"], p["url"], p["summary"], p["date"]))
    L += ["", "## Selected publications", ""] + [pub_line(p) for p in selected]
    L += ["", "## Optional", "",
          "- [Full details for language models](%s/llms-full.txt): biography, research lines, awards, teaching and every publication" % SITE,
          "- [Blog feed](%s/feed.xml)" % SITE, "- [LinkedIn](%s)" % LINKEDIN, "- [GitHub](%s)" % GITHUB, ""]
    return "\n".join(L)


def build_llms_full(pages_desc):
    L = ["# Jiaming Wang: full profile", "",
         "> Robotics and embodied AI researcher, PhD candidate at the National University of Singapore (NUS). "
         "Canonical site: %s/" % SITE, "",
         "## Identity", "",
         "- Name: Jiaming Wang (not to be confused with other people of the same name)",
         "- Position: PhD candidate in Computer Science, National University of Singapore (School of Computing), Singapore",
         "- Advisor / lab: Harold Soh, CLeAR Lab",
         "- Focus: robot navigation, spatial perception and mapping, long-term robot memory, manipulation, agentic robotics",
         "- Status: recruiting student researchers (Python / C++, ROS 2, real robots)",
         "- Languages of the site: English (%s/) and Chinese 中文 (%s/zh/), each as separate static pages" % (SITE, SITE),
         "- Links: [Home](%s/), [LinkedIn](%s), [GitHub](%s), [Contact page](%s)" % (
             SITE, LINKEDIN, GITHUB, canonical("pages/contact.html")), "",
         "## Background", "",
         "Before research, Jiaming was a serial entrepreneur: he studied computing at NUS (2007 to 2011), "
         "co-founded the peer-to-peer car-sharing platform iCarsClub (acquired by a NASDAQ-listed company; "
         "Forbes China 30 Under 30 in 2014), spent a gap year at Oxford studying theology and philosophy (2018), "
         "built further startups, and joined Harold Soh's lab in 2022 after getting interested in AI. "
         "Full story: %s" % canonical("pages/about.html"), "",
         "## Research", "", RESEARCH_LINES,
         "## Awards and honors", ""] + ["- " + a for a in AWARDS] + [
         "", "## Teaching and service", "",
         "- Teaching assistant, CS5242 Neural Networks and Deep Learning (2026), NUS",
         "- Teaching assistant, CS5284 Graph Machine Learning (2024, 2025), NUS",
         "- Co-organizer, RSS 2026 workshop: Open World Navigation in the Foundation Model Era: Robustness and Failure Recovery",
         "- Co-organizer, IROS 2026 workshop: 5th Workshop on Social Robot Navigation: From Humans, to Robots, and to the World",
         "", "## Publications (newest first)", ""]
    L += [pub_line(p, full=True) for p in PUBS]
    L += ["", "## Blog posts", ""]
    for p in POSTS:
        L.append("- [%s](%s) (%s; %s): %s" % (p["title"], p["url"], p["date"], ", ".join(p["tags"]), p["summary"]))
    L += ["", "## Course", "",
          "- [Robotics for Beginners](%s): %s" % (canonical("robotics101/index.html"), pages_desc["robotics101/index.html"]), ""]
    return "\n".join(L)


# ---------------------------------------------------------------- main
def bump_assets():
    """Cache-busting: point every page's css/js links at a fresh ?v= value."""
    import time
    v = time.strftime("%Y%m%d%H%M")
    pat = re.compile(r'(css/styles\.css|css/tailwind\.css|js/main\.js|js/robot-sim\.js)(\?v=[A-Za-z0-9]+)?"')
    files = ["index.html"] + sorted(str(p.relative_to(ROOT)) for p in (ROOT / "pages").glob("*.html")) + \
        sorted(str(p.relative_to(ROOT)) for p in (ROOT / "pages" / "blog").glob("*.html"))
    for rel in files:
        doc = read(rel)
        write(rel, pat.sub(lambda m: '%s?v=%s"' % (m.group(1), v), doc))


def main():
    if "--bump" in sys.argv:
        bump_assets()
    pages = CORE_PAGES + [p["rel"] for p in POSTS] + course_pages() + ["ecrom/index.html"]
    for rel in pages:
        apply_block(rel)
    apply_pubs("index.html", True, "")
    apply_pubs("pages/research.html", False, "../")
    for rel in ZH_SOURCES:
        build_zh(rel)

    pages_desc = {rel: (get_desc(read(rel)) or "") for rel in pages}
    write("sitemap.xml", build_sitemap(pages))
    write("robots.txt", build_robots())
    write("feed.xml", build_feed())
    write("llms.txt", build_llms(pages_desc))
    write("llms-full.txt", build_llms_full(pages_desc))
    print("pages processed: %d (+%d Chinese editions); files changed: %d" % (len(pages), len(ZH_SOURCES), len(CHANGED)))
    for c in CHANGED:
        print("  updated", c)


if __name__ == "__main__":
    sys.exit(main())
