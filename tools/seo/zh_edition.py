"""Turn a finished bilingual page into its static Chinese-only twin under /zh/.

Used by build.py. Pages are authored with both languages in one file
(<span lang="en">…</span><span lang="zh-Hans">…</span>, or <div data-lang="en|zh"> blocks).
The Chinese edition drops every element marked English, shows the Chinese ones, and fixes the
language so the page no longer toggles in place (the EN/中文 switch navigates between editions).

The transform streams the page through html.parser and re-emits it byte for byte except for the
deliberate changes, so tests/round-trips (see `roundtrip_ok`) can prove nothing else is touched.
"""
import posixpath
import re
from html.parser import HTMLParser

VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param",
        "source", "track", "wbr"}
URL_ATTRS = ("href", "src", "data-lightbox-src", "data-full", "poster")


def _attr_re(name):
    return re.compile(r'(\s%s\s*=\s*)(?:"([^"]*)"|\'([^\']*)\')' % re.escape(name))


def get_attr(raw, name):
    m = _attr_re(name).search(raw)
    if not m:
        return None
    return m.group(2) if m.group(2) is not None else m.group(3)


def set_attr(raw, name, fn):
    def repl(m):
        val = m.group(2) if m.group(2) is not None else m.group(3)
        return '%s"%s"' % (m.group(1), fn(val).replace('"', "&quot;"))
    return _attr_re(name).sub(repl, raw, count=1)


def rewrite_url(value, src_rel, zh_set):
    """Keep links between pages that have a /zh/ twin relative (they stay inside /zh/); send
    everything else (assets, English-only pages) to its root-absolute URL."""
    v = value.strip()
    if not v or re.match(r"^(#|//|/|[a-zA-Z][a-zA-Z0-9+.-]*:)", v):
        return value
    m = re.match(r"^([^?#]*)(.*)$", v, re.S)
    path, tail = m.group(1), m.group(2)
    if not path:
        return value
    target = posixpath.normpath(posixpath.join(posixpath.dirname(src_rel), path))
    is_dir = path.endswith("/") or target in (".", "")
    if is_dir:
        page = posixpath.join("" if target == "." else target, "index.html")
    else:
        page = target
    if page in zh_set:
        return value
    out = "/" + ("" if target == "." else target)
    if is_dir and not out.endswith("/"):
        out += "/"
    return out + tail


def _should_drop(tag, raw):
    if tag == "html":
        return False
    return get_attr(raw, "lang") == "en" or get_attr(raw, "data-lang") == "en"


class _Rewriter(HTMLParser):
    def __init__(self, tag_fn, drop_fn, src):
        super().__init__(convert_charrefs=False)
        self.src = src
        self.line_starts = [0]
        for m in re.finditer("\n", src):
            self.line_starts.append(m.end())
        self.out = []
        self.tag_fn = tag_fn
        self.drop_fn = drop_fn
        self.skip_tag = None
        self.skip_depth = 0

    def _start(self, tag, raw, selfclosing):
        if self.skip_tag:
            if tag == self.skip_tag and tag not in VOID and not selfclosing:
                self.skip_depth += 1
            return
        if self.drop_fn(tag, raw):
            if tag not in VOID and not selfclosing:
                self.skip_tag, self.skip_depth = tag, 1
            return
        self.out.append(self.tag_fn(tag, raw))

    def handle_starttag(self, tag, attrs):
        self._start(tag, self.get_starttag_text(), False)

    def handle_startendtag(self, tag, attrs):
        self._start(tag, self.get_starttag_text(), True)

    def handle_endtag(self, tag):
        if self.skip_tag:
            if tag == self.skip_tag:
                self.skip_depth -= 1
                if self.skip_depth == 0:
                    self.skip_tag = None
            return
        self.out.append("</%s>" % tag)

    def _emit(self, s):
        if not self.skip_tag:
            self.out.append(s)

    def handle_data(self, data):
        self._emit(data)

    def _raw_ref(self, prefix, name):
        # The parser does not say whether a ';' followed (e.g. LaTeX "&b\\"), so read the source.
        line, col = self.getpos()
        start = self.line_starts[line - 1] + col
        end = start + len(prefix) + len(name)
        return self.src[start:end + 1] if self.src[end:end + 1] == ";" else self.src[start:end]

    def handle_entityref(self, name):
        self._emit(self._raw_ref("&", name))

    def handle_charref(self, name):
        self._emit(self._raw_ref("&#", name))

    def handle_comment(self, data):
        self._emit("<!--%s-->" % data)

    def handle_decl(self, decl):
        self._emit("<!%s>" % decl)

    def handle_pi(self, data):
        self._emit("<?%s>" % data)

    def unknown_decl(self, data):
        self._emit("<![%s]>" % data)


def _run(doc, tag_fn, drop_fn):
    p = _Rewriter(tag_fn, drop_fn, doc)
    p.feed(doc)
    p.close()
    return "".join(p.out)


def roundtrip_ok(doc):
    """True when the streaming rewriter reproduces `doc` exactly with no changes applied."""
    return _run(doc, lambda tag, raw: raw, lambda tag, raw: False) == doc


def to_zh(doc, src_rel, zh_set, bootstrap_re, fixed_bootstrap, zh_title=None):
    """Return the Chinese-only edition of `doc` (a finished English page without its seo block)."""

    def tag_fn(tag, raw):
        if tag == "html":
            raw = re.sub(r'\slang="[^"]*"', "", raw, count=1)
            return raw.replace("<html", '<html lang="zh-Hans" data-fixed-lang="zh"', 1)
        for name in URL_ATTRS:
            if get_attr(raw, name) is not None:
                raw = set_attr(raw, name, lambda v: rewrite_url(v, src_rel, zh_set))
        zh_ph = get_attr(raw, "data-placeholder-zh")
        if zh_ph is not None:
            raw = set_attr(raw, "placeholder", lambda _v: zh_ph)
        if get_attr(raw, "data-lang") == "zh":
            raw = re.sub(r'\sstyle="\s*display:\s*none;?\s*"', "", raw)
        return raw

    out = _run(doc, tag_fn, _should_drop)

    n_before = len(re.findall(bootstrap_re, out, re.S))
    assert n_before == 1, "%s: expected one language bootstrap script, found %d" % (src_rel, n_before)
    out = re.sub(bootstrap_re, lambda m: fixed_bootstrap, out, count=1, flags=re.S)

    # <title data-zh="…">…</title> and <meta name="description" data-zh="…" content="…">
    def title_repl(m):
        zh = get_attr(m.group(0), "data-zh") or zh_title
        return "<title>%s</title>" % zh if zh else m.group(0)

    out = re.sub(r"<title[^>]*>.*?</title>", title_repl, out, count=1, flags=re.S)

    def meta_repl(m):
        zh = get_attr(m.group(0), "data-zh")
        return '<meta name="description" content="%s">' % zh if zh else m.group(0)

    out = re.sub(r'<meta\s+name="description"[^>]*>', meta_repl, out, count=1)

    # Blog: titles / summaries are English text carrying their Chinese twin in an attribute
    for open_re, close in ((r'(<h1 class="blog-article-title"[^>]*?data-title-zh="([^"]*)"[^>]*>)', "</h1>"),
                           (r'(<h3 class="blog-post-title"[^>]*?data-lang-zh="([^"]*)"[^>]*>)', "</h3>"),
                           (r'(<p class="blog-post-summary"[^>]*?data-lang-zh="([^"]*)"[^>]*>)', "</p>")):
        out = re.sub(open_re + r"(.*?)" + re.escape(close),
                     lambda m, c=close: m.group(1) + m.group(2) + c, out, flags=re.S)
    return out
