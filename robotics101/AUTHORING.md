# Robotics for Beginners — authoring guide

Static, dependency-free (apart from KaTeX via CDN) interactive course pages.

```
robotics101/
  index.html                 course home: philosophy, conventions, full course map
  part1/index.html           Part I overview: dependency graph, chapters, learning routes
  part1/<n>-<slug>.html      one lesson per file, e.g. 1-3-matrix-as-transformation.html
  part2/index.html           Part II overview (chapters 7–9: structure & kinematics, dynamics, embodiments)
  part2/<n>-<slug>.html      Part II lessons, e.g. 7-5-inverse-kinematics.html (chapter numbers run on across parts)
  part3/index.html           Part III overview (chapters 10–12: cameras, multi-view geometry, 3D representations)
  part3/<n>-<slug>.html      Part III lessons, e.g. 11-1-epipolar.html
  part4/index.html           Part IV overview (chapters 13–15: feedback control, motion planning, state estimation & mapping)
  part4/<n>-<slug>.html      Part IV lessons, e.g. 14-1-graph-search-astar.html
  assets/
    syllabus.js              single source of truth for the outline (sidebar, maps, prev/next)
    course.css               layout, components, light/dark tokens, math color code
    course.js                shell, 中文/EN switch, theme, KaTeX, quizzes, tasks, UI widgets
    math.js                  R101.M — vectors, 2×2/3×3, SVD, SO(3)/SE(3) exp/log, RNG
    viz2d.js                 R101.Plane2D — 2D math canvas with draggable handles
                             (also `fit` / `axes` / `clip` for anisotropic data plots: `const m = P.fit([x0,x1],[y0,y1]); P.axes(); P.path(pts.map(m.pt))`)
    viz3d.js                 R101.View3D — z-up orbit 3D canvas (painter's algorithm)
    robot.js                 R101.Robot — Part II kinematics: planar chains, the preset spatial 6R arm (`Robot.arm6`, PoE),
                             Ad / jacSpace / jacBody / ikStep, drawing helpers
    vision.js                R101.Vision — Part III camera geometry: OpenCV-style camera model, lookAt, project / ray / backproject, distortion,
                             frustum drawing, test scenes, DLT homography / projection, 8-point E and F, triangulation, Kabsch, RANSAC; adds M.svd / M.nullvec
```

## Adding a lesson
1. Copy an existing lesson (e.g. `part1/1-3-matrix-as-transformation.html`) and keep its `<head>`, body attributes, layout wrapper and script tags.
2. Set `data-page`, `data-title-zh`, `data-title-en` on `<body>`.
3. Mark the page `ready: true` in `assets/syllabus.js` — the sidebar, course map, Part overview and prev/next links update automatically. Each part has a `dir` (`part1` … `part4`); a lesson lives in `<dir>/<n with '.'→'-'>-<slug>.html` and its `data-page` is the lesson number.
4. Run `python3 tools/seo/build.py` from the repo root: it adds the SEO block (canonical, hreflang, JSON-LD), generates the Chinese-only twin under `zh/robotics101/`, and updates `sitemap.xml`. Give the lesson a `<p class="lede">` with a `data-lang="zh"` span: its text becomes the Chinese meta description.

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

## Quality checklist (from the course-wide review)
The most common defects found when Parts I–III were reviewed; check every new lesson against them.
- zh/en pairs say exactly the same thing (numbers, claims, colours); no English words inside KaTeX.
- Caption colour words match the named colour the code draws. Never write white/black/darker/brighter, because they flip with the theme; describe by hue ("more cyan = lower") or by role ("the hollow marker").
- Every number the prose quotes about a figure is what the code produces at the stated settings. Compute it, don't estimate.
- Every task is reachable by following its text, is not complete at load or after a one-pixel drag, and states any hidden condition. Check it in a node simulation of the lab code.
- Every `\hl{key}` changes something visible, and every key a figure listens for exists in the prose.
- Cross-references cite the right lesson number and only for content that lesson actually contains.
- Quiz explanations refer to options by letter (A–D, added by CSS).
- No NaN or Infinity at slider extremes, simulations use a fixed time step, and the page works at 390 px width.
- Claims about real robots, software and papers are checked against sources, or reworded so they claim only what is certain.
