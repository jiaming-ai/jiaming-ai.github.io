# Robotics for Beginners — authoring guide

Static, dependency-free (apart from KaTeX via CDN) interactive course pages.

```
robotics101/
  index.html                 course home: philosophy, conventions, full course map
  part1/index.html           Part I overview: dependency graph, chapters, learning routes
  part1/<n>-<slug>.html      one lesson per file, e.g. 1-3-matrix-as-transformation.html
  assets/
    syllabus.js              single source of truth for the outline (sidebar, maps, prev/next)
    course.css               layout, components, light/dark tokens, math color code
    course.js                shell, 中文/EN switch, theme, KaTeX, quizzes, tasks, UI widgets
    math.js                  R101.M — vectors, 2×2/3×3, SVD, SO(3)/SE(3) exp/log, RNG
    viz2d.js                 R101.Plane2D — 2D math canvas with draggable handles
    viz3d.js                 R101.View3D — z-up orbit 3D canvas (painter's algorithm)
```

## Adding a lesson
1. Copy an existing lesson (e.g. `part1/1-3-matrix-as-transformation.html`) and keep its `<head>`, body attributes, layout wrapper and script tags.
2. Set `data-page`, `data-title-zh`, `data-title-en` on `<body>`.
3. Mark the page `ready: true` in `assets/syllabus.js` — the sidebar, course map, Part overview and prev/next links update automatically.

## Lesson anatomy
Why robots need it → Intuition → Play (core lab + "Try this" tasks) → (extra views) → The math → In robotics → Pitfalls → Check yourself → Further reading.

## Conventions
- Bilingual: every prose element exists as `data-lang="zh"` and `data-lang="en"`; canvas text uses `R101.t(zh, en)` and re-renders on `R101.on('lang')`.
- Colors (use names, never hex, so both themes work): `i` x/î red · `j` y/ĵ green · `k` z/k̂ blue · `v` vector of interest amber · `w` comparison purple · `x` grids/helpers cyan. KaTeX: `\ci{} \cj{} \ck{} \cv{} \cw{} \cx{}`.
- Formula ↔ figure linking: wrap symbols as `\hl{key}{...}`; figures read `R101.hl` and redraw on `R101.on('hl')`.
- Tasks: `<li data-task="id">` in a `.tasks` list; call `R101.done('id')` when the reader achieves it.
- Quizzes: `.quiz[data-answer=<0-based index>]` with `.opt` buttons and an `.explain` block.
- Math: inline `\( \)`, display `$$ $$`; no bare `$` in prose.

## Local preview
`python3 -m http.server` at the repository root, then open `/robotics101/`.
