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
  * sitemap.xml, robots.txt, llms.txt, llms-full.txt, feed.xml

Sources of truth: data/publications.json, the post cards in pages/blog.html, and each
page's own <title> / <meta name="description"> (a page without a description fails the run).
"""
import html
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SITE = "https://jiaming.im"
NAME = "Jiaming Wang"
PERSON_ID = SITE + "/#person"
OG_IMAGE = SITE + "/assets/img/og-card.png"
OG_ALT = "Jiaming Wang, robotics and embodied AI researcher at the National University of Singapore"
LINKEDIN = "https://www.linkedin.com/in/jiaming-wang-ai/"
GITHUB = "https://github.com/jiaming-ai"
# Project pages that live in other repositories but are served from this domain.
EXTERNAL_PAGES = [SITE + "/CROSS/"]

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
    p.write_text(text, encoding="utf-8")
    CHANGED.append(rel)


def canonical(rel):
    """'index.html' -> '/', 'robotics101/index.html' -> '/robotics101/'."""
    if rel == "index.html" or rel.endswith("/index.html"):
        rel = rel[: -len("index.html")]
    return SITE + "/" + rel


def attr(s):
    return html.escape(s, quote=True)


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


# ---------------------------------------------------------------- schema.org nodes
def person_ref():
    return {"@type": "Person", "@id": PERSON_ID, "name": NAME, "url": SITE + "/"}


def person_full():
    return {
        "@type": "Person", "@id": PERSON_ID, "name": NAME, "url": SITE + "/",
        "image": SITE + "/assets/img/profile.jpeg",
        "jobTitle": "PhD Candidate, Computer Science",
        "description": PERSON_DESC,
        "affiliation": {
            "@type": "CollegeOrUniversity", "name": "National University of Singapore",
            "url": "https://www.nus.edu.sg/",
            "department": {"@type": "Organization", "name": "School of Computing, National University of Singapore",
                           "url": "https://www.comp.nus.edu.sg/"},
        },
        "address": {"@type": "PostalAddress", "addressLocality": "Singapore", "addressCountry": "SG"},
        "knowsAbout": KNOWS_ABOUT,
        "award": AWARDS,
        "sameAs": [LINKEDIN, GITHUB],
    }


def website_node():
    return {
        "@type": "WebSite", "@id": SITE + "/#website", "url": SITE + "/", "name": NAME,
        "description": "Academic homepage of Jiaming Wang: robotics and embodied AI research, publications, blog and an interactive robotics course.",
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
def page_spec(rel, doc):
    """Return (og_type, [jsonld nodes], extra head lines) for a page."""
    url = canonical(rel)
    title = get_title(doc)
    desc = get_desc(doc)
    extra = []
    nodes = []
    og_type = "website"
    home_crumb = ("Home", SITE + "/")

    if rel == "index.html":
        nodes = [website_node(), {"@type": "ProfilePage", "@id": SITE + "/#profile", "url": url, "name": title,
                                  "description": desc, "mainEntity": {"@id": PERSON_ID},
                                  "isPartOf": {"@id": SITE + "/#website"}, "inLanguage": ["en", "zh-Hans"]},
                 person_full()]
        extra.append('<link rel="alternate" type="application/atom+xml" title="Jiaming Wang: Blog" href="/feed.xml">')
    elif rel == "pages/about.html":
        nodes = [{"@type": "AboutPage", "url": url, "name": title, "description": desc,
                  "mainEntity": {"@id": PERSON_ID}, "isPartOf": {"@id": SITE + "/#website"}},
                 person_full(), breadcrumb([home_crumb, ("About", url)])]
    elif rel == "pages/contact.html":
        nodes = [{"@type": "ContactPage", "url": url, "name": title, "description": desc,
                  "mainEntity": person_ref(), "isPartOf": {"@id": SITE + "/#website"}},
                 breadcrumb([home_crumb, ("Contact", url)])]
    elif rel == "pages/research.html":
        nodes = [{"@type": "CollectionPage", "url": url, "name": title, "description": desc,
                  "about": person_ref(), "isPartOf": {"@id": SITE + "/#website"},
                  "mainEntity": {"@type": "ItemList", "name": "Publications by Jiaming Wang",
                                 "numberOfItems": len(PUBS),
                                 "itemListElement": [{"@type": "ListItem", "position": i + 1, "item": article_node(p)}
                                                     for i, p in enumerate(PUBS)]}},
                 breadcrumb([home_crumb, ("Research", url)])]
    elif rel == "pages/blog.html":
        nodes = [{"@type": "Blog", "url": url, "name": "Jiaming Wang: Blog", "description": desc,
                  "author": person_ref(), "inLanguage": ["en", "zh-Hans"],
                  "blogPost": [{"@type": "BlogPosting", "headline": p["title"], "url": p["url"],
                                "datePublished": p["date"]} for p in POSTS]},
                 breadcrumb([home_crumb, ("Blog", url)])]
        extra.append('<link rel="alternate" type="application/atom+xml" title="Jiaming Wang: Blog" href="/feed.xml">')
    elif rel.startswith("pages/blog/"):
        post = next(p for p in POSTS if p["rel"] == rel)
        og_type = "article"
        title = post["title"] + " - " + NAME
        desc = post["summary"]
        nodes = [{"@type": "BlogPosting", "headline": post["title"], "alternativeHeadline": post["title_zh"] or None,
                  "description": post["summary"], "url": url, "mainEntityOfPage": url,
                  "datePublished": post["date"], "dateModified": post["date"],
                  "author": person_ref(), "publisher": person_ref(),
                  "image": OG_IMAGE, "keywords": post["tags"], "inLanguage": ["en", "zh-Hans"],
                  "isPartOf": {"@type": "Blog", "url": SITE + "/pages/blog.html", "name": "Jiaming Wang: Blog"}},
                 breadcrumb([home_crumb, ("Blog", SITE + "/pages/blog.html"), (post["title"], url)])]
        nodes[0] = {k: v for k, v in nodes[0].items() if v}
    elif rel == "ecrom/index.html":
        pub = next(p for p in PUBS if p["title"].startswith("Retrospective Open-Vocabulary Memory"))
        node = article_node(pub)
        node.update({"url": url, "description": desc})
        node["sameAs"] = [u for u in node.get("sameAs", []) if u != url]
        nodes = [node, breadcrumb([home_crumb, ("Research", SITE + "/pages/research.html"), ("ECROM", url)])]
        og_type = "article"
    elif rel == "robotics101/index.html":
        nodes = [{"@type": "Course", "@id": SITE + "/robotics101/#course", "name": "Robotics for Beginners",
                  "description": desc, "url": url, "provider": person_ref(), "author": person_ref(),
                  "inLanguage": ["en", "zh-Hans"], "isAccessibleForFree": True, "educationalLevel": "Beginner",
                  "teaches": ["Linear algebra", "Probability", "Lie groups and rigid-body motion", "Optimization",
                              "Motion planning and control", "Robot learning", "Vision-language-action models",
                              "Agentic robotics"]},
                 breadcrumb([home_crumb, ("Robotics for Beginners", url)])]
    elif rel.startswith("robotics101/"):
        en_title = body_attr(doc, "data-title-en") or title
        title = en_title
        crumbs = [home_crumb, ("Robotics for Beginners", SITE + "/robotics101/")]
        if rel == "robotics101/part1/index.html":
            nodes = [{"@type": "CollectionPage", "url": url, "name": en_title, "description": desc,
                      "isPartOf": {"@type": "Course", "@id": SITE + "/robotics101/#course"}, "author": person_ref(),
                      "inLanguage": ["en", "zh-Hans"]}]
            crumbs.append((en_title.split(" · ")[0], url))
        else:
            part = read("robotics101/part1/index.html")
            part_title = (body_attr(part, "data-title-en") or "Part I").split(" · ")[0]
            nodes = [{"@type": "LearningResource", "name": en_title, "description": desc, "url": url,
                      "learningResourceType": "Interactive lesson",
                      "isPartOf": {"@type": "Course", "@id": SITE + "/robotics101/#course"},
                      "author": person_ref(), "inLanguage": ["en", "zh-Hans"], "isAccessibleForFree": True}]
            crumbs += [(part_title, SITE + "/robotics101/part1/"), (en_title.split(" · ")[0], url)]
        nodes.append(breadcrumb(crumbs))
    else:
        raise SystemExit("no SEO spec for " + rel)

    assert desc, rel + " has no <meta name=\"description\">"
    return url, title, desc, og_type, nodes, extra


def seo_block(doc, rel):
    url, title, desc, og_type, nodes, extra = page_spec(rel, doc)
    outside = BLOCK_RE.sub("", head_of(doc))
    has = lambda pat: re.search(pat, outside)
    L = []
    if not has(r'<meta\s+name="description"'):
        L.append('<meta name="description" content="%s">' % attr(desc))
    if not has(r'rel="canonical"'):
        L.append('<link rel="canonical" href="%s">' % attr(url))
    own_image = has(r'property="og:image"')
    og = [("og:type", og_type), ("og:site_name", NAME), ("og:locale", "en_US"), ("og:locale:alternate", "zh_CN"),
          ("og:title", title), ("og:description", desc), ("og:url", url)]
    if not own_image:
        og += [("og:image", OG_IMAGE), ("og:image:width", "1200"), ("og:image:height", "630"),
               ("og:image:alt", OG_ALT)]
    for prop, val in og:
        if not has(r'property="%s"' % re.escape(prop)):
            L.append('<meta property="%s" content="%s">' % (prop, attr(val)))
    if not has(r'name="twitter:card"'):
        L.append('<meta name="twitter:card" content="summary_large_image">')
    if og_type == "article" and rel.startswith("pages/blog/"):
        date = next(p["date"] for p in POSTS if p["rel"] == rel)
        L.append('<meta property="article:published_time" content="%s">' % date)
        L.append('<meta property="article:author" content="%s">' % (SITE + "/"))
        for t in next(p["tags"] for p in POSTS if p["rel"] == rel):
            L.append('<meta property="article:tag" content="%s">' % attr(t))
    if not has(r'<meta\s+name="author"'):
        L.append('<meta name="author" content="%s">' % NAME)
    L += extra
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
    for rel in pages:
        url = canonical(rel)
        post = next((p for p in POSTS if p["rel"] == rel), None)
        lm = "<lastmod>%s</lastmod>" % post["date"] if post else ""
        rows.append("  <url><loc>%s</loc>%s</url>" % (html.escape(url), lm))
    for url in EXTERNAL_PAGES:
        rows.append("  <url><loc>%s</loc></url>" % html.escape(url))
    return ('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n%s\n</urlset>\n'
            % "\n".join(rows))


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
         "## Main pages", ""]
    for name, rel in [("Home", "index.html"), ("Research and publications", "pages/research.html"),
                      ("About", "pages/about.html"), ("Blog", "pages/blog.html"),
                      ("Robotics for Beginners (course)", "robotics101/index.html"), ("Contact", "pages/contact.html")]:
        L.append("- [%s](%s): %s" % (name, canonical(rel), pages_desc[rel]))
    L += ["", "## Research projects", "",
          "- [CROSS](%s/CROSS/): change-robust online spatial-semantic topological mapping and relocalization (NeurIPS 2026)" % SITE,
          "- [ECROM](%s/ecrom/): retrospective open-vocabulary memory for long-term object search" % SITE,
          "- [GeNIE](https://clear-nus.github.io/genie): generalizable navigation system for in-the-wild environments",
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
         "- Languages of the site: English and Chinese (中文)",
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
def main():
    pages = CORE_PAGES + [p["rel"] for p in POSTS] + course_pages() + ["ecrom/index.html"]
    for rel in pages:
        apply_block(rel)
    apply_pubs("index.html", True, "")
    apply_pubs("pages/research.html", False, "../")

    pages_desc = {rel: (get_desc(read(rel)) or "") for rel in pages}
    write("sitemap.xml", build_sitemap(pages))
    write("robots.txt", build_robots())
    write("feed.xml", build_feed())
    write("llms.txt", build_llms(pages_desc))
    write("llms-full.txt", build_llms_full(pages_desc))
    print("pages processed: %d; files changed: %d" % (len(pages), len(CHANGED)))
    for c in CHANGED:
        print("  updated", c)


if __name__ == "__main__":
    sys.exit(main())
