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

- **Clean Academic Design**: Simple, readable layout focused on content
- **Side Navigation**: Sticky sidebar navigation for desktop/tablet, collapsible top nav for mobile
- **Photo Integration**: Profile photo floats within text for natural, academic-style layout
- **Data-Driven**: All content stored in JSON files for easy updates
- **Dark/Light Theme**: Automatic theme switcher with localStorage
- **Responsive**: Mobile-friendly design with adaptive navigation
- **Modular**: Separated CSS, JS, and data for easy maintenance

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
    --bg-primary: #ffffff;
    --text-primary: #1f2937;
    --accent: #3b82f6;
    /* ... */
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
