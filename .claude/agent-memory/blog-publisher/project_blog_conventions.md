---
name: Blog publishing conventions
description: Template structure, naming patterns, image paths, and blog listing format for jiaming-ai.github.io
type: project
---

Single HTML file per post with both EN/ZH toggled via JS (not separate files). Template at `pages/blog/_template.html`.

**Why:** The site uses a language toggle button (EN/ZH) within each post page, switching `data-lang` divs.

**How to apply:**
- Post files: `pages/blog/{slug}.html` (single file, both languages)
- Images: `assets/img/blog/{slug}/` referenced as `../../assets/img/blog/{slug}/filename.png`
- Blog listing: Add entry to `pages/blog.html` inside `#blog-posts-list` div with `data-title-en`, `data-title-zh`, `data-summary-en`, `data-summary-zh` attributes
- Date format in post header: "March 14, 2026"; in listing: "2026-03-14"
- Tags: Technical, Research, Career, Thoughts (as `<span class="blog-tag">`)
- KaTeX included for math support; uses `$$` for display and `$` for inline
- Newer posts go at the top of the listing
- Site-wide language switch: the post header (title, date, tags, "Back to Blog") is bilingual via `<span lang="en">…</span><span lang="zh-Hans">…</span>`; the `<h1>` carries `data-title-en` / `data-title-zh`. Do NOT add a per-post `switchLang` script — `js/main.js` provides it. Tags in both the post and the `pages/blog.html` listing are bilingual spans too (技术 / 研究 / 职业 / 思考). See README "Languages" and `_template.html`
