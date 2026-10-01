# Jiaming Wang's Personal Academic Website

A clean, modern academic-style personal website built for GitHub Pages.

## 📁 Project Structure

```
jiaming/
├── index.html              # Academic-style homepage
├── css/
│   └── styles.css         # All CSS styles
├── js/
│   └── main.js            # JavaScript functionality
├── data/                  # JSON data files
│   ├── publications.json  # Publication list
│   ├── blog.json         # Blog posts
│   ├── people.json       # Team members & alumni
│   ├── projects.json     # Ongoing research projects
│   ├── teaching.json     # Teaching history
│   └── awards.json       # Awards & honors
└── pages/
    ├── about.html        # About & Two Lives story
    ├── research.html     # Completed research
    ├── ongoing-projects.html # Current research & opportunities
    └── blog.html        # Blog with search
```

## ✨ Features

- **Frontier-robotics theme**: Dark "mission control" look by default (cyan sensor glow, blueprint grid, mono HUD labels) with a light "lab blueprint" alternative
- **Interactive hero simulation** (`js/robot-sim.js`): a robot explores an unseen world with a spinning LiDAR, builds a topological map online with loop closures, and drives to wherever visitors click; pauses off-screen and respects `prefers-reduced-motion`
- **Motion & interaction**: scroll reveals, count-up stats, typewriter tagline, cursor-following card spotlights, 3D tilt on research cards, scroll progress bar
- **Side Navigation**: Sticky mission-control rail for desktop/tablet, compact top bar on mobile
- **Data-Driven**: Publications stored in JSON for easy updates
- **Dark/Light Theme**: Toggle with localStorage persistence
- **English / 中文**: Site-wide language switch (nav footer, mobile top bar, blog buttons). Remembered in localStorage, `?lang=zh` / `?lang=en` forces a language, and first-time visitors whose browser language is Chinese start in 中文
- **Responsive**: Mobile-friendly design with adaptive navigation

## 🔧 How to Update Content

### Publications
Edit `data/publications.json`:
```json
{
    "year": 2024,
    "title": "Your Paper Title",
    "authors": "Author List",
    "venue": "Conference/Journal",
    "links": {
        "pdf": "link-to-pdf",
        "code": "link-to-code",
        "video": "link-to-video"
    },
    "bibtex": "bibtex-entry",
    "type": "past"
}
```

### Blog Posts
Edit `data/blog.json`:
```json
{
    "id": 1,
    "title": "Post Title",
    "date": "2024-01-01",
    "summary": "Brief summary",
    "tags": ["Tag1", "Tag2"],
    "content": "HTML content"
}
```

### Teaching
Edit `data/teaching.json`:
```json
{
    "code": "CS1234",
    "title": "Course Name",
    "role": "Teaching Assistant",
    "semester": "AY2023/24 Semester 1",
    "institution": "University Name"
}
```

### Awards
Edit `data/awards.json`:
```json
{
    "title": "Award Name",
    "organization": "Organization",
    "description": "Description (optional)",
    "year": 2024
}
```

## 🌐 Languages (EN / 中文)

The active language is `<html data-site-lang="en|zh">`, set before first paint by a small inline script in every page `<head>` (stored in `localStorage.lang`). Both languages live in the same HTML file:

```html
<p class="narrative-text"><span lang="en">English text</span><span lang="zh-Hans">中文文本</span></p>
```

CSS hides the inactive one, so wrap the *content* of an element (keep the element, its classes and icons as they are). Other pieces:

- `<title data-zh="…">` and `<meta name="description" data-zh="…">` swap the page title / description
- `<input data-placeholder-zh="…">` swaps a placeholder
- Typewriter text: one `.typer[data-words]` per language, each inside a `lang`-tagged block
- Strings built in JS: `L('English', '中文')` returns the bilingual markup, `tt('English', '中文')` a plain string for attributes
- Publications: add `"awardZh"` next to `"award"` in `data/publications.json`
- Blog posts keep EN/中文 bodies in `<div data-lang="en|zh">` blocks; the post title comes from `data-title-en` / `data-title-zh` on the `<h1>`. The EN/中文 buttons on blog pages are the same switch as the one in the nav
- Not translated: `ecrom/` (standalone paper page) and the `md2img` tool page body

## ♻️ Cache busting

Every page links `css/styles.css`, `js/main.js` (and `js/robot-sim.js` on the homepage) with a `?v=` query string.
When you change CSS or JS, bump that version on all pages so visitors never get new HTML paired with a stale cached stylesheet:

```bash
V=$(date +%Y%m%d%H%M); for f in index.html pages/*.html pages/blog/*.html; do sed -i -E "s#(css/styles\.css|js/main\.js|js/robot-sim\.js)(\?v=[A-Za-z0-9]+)?\"#\1?v=$V\"#g" "$f"; done
```

## 🚀 Deployment

### GitHub Pages
1. Push to GitHub repository
2. Go to Settings → Pages
3. Select branch (usually `main` or `master`)
4. Your site will be available at `https://username.github.io/repository`

### Local Development
Simply open `index.html` in a browser. For full functionality (JSON loading), use a local server:

```bash
# Python 3
python -m http.server 8000

# Then visit http://localhost:8000
```

## 🎨 Customization

### Colors
Edit CSS variables in `css/styles.css`:
```css
:root {
    --brand: #3fe0ff;      /* main accent (dark theme) */
    --brand-2: #a78bfa;    /* secondary accent */
    --signal: #ff8a3d;     /* robot / highlight colour */
    /* ... plus --sim-* RGB triplets for the hero simulation */
}
```

### Profile Photo
Replace the placeholder in `index.html`:
```html
<img src="path/to/your/photo.jpg" alt="Your Name" class="profile-photo">
```

### Contact Information
Update links in `index.html` header section and footer.

## 📝 License

All rights reserved © 2025 Jiaming Wang
