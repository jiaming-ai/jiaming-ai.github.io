// Navigation Generator
function initNavigation() {
    // Detect directory depth relative to root
    const isNestedSubdirectory = window.location.pathname.includes('/pages/blog/');
    const isSubdirectory = !isNestedSubdirectory && window.location.pathname.includes('/pages/');
    const pathPrefix = typeof getPathPrefix === 'function' ? getPathPrefix() : (isNestedSubdirectory ? '../../' : (isSubdirectory ? '../' : ''));
    
    // Get current page for active state
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    // Helper function to determine if a link is active
    const isActive = (page) => {
        if (page === 'index.html' && (currentPage === 'index.html' || currentPage === '')) return true;
        return currentPage === page;
    };
    
    // Adjust paths for subdirectory pages
    const homeLink = isNestedSubdirectory ? '../../index.html' : (isSubdirectory ? '../index.html' : 'index.html');
    const aboutLink = isNestedSubdirectory ? '../about.html' : (isSubdirectory ? 'about.html' : 'pages/about.html');
    const researchLink = isNestedSubdirectory ? '../research.html' : (isSubdirectory ? 'research.html' : 'pages/research.html');
    const blogLink = isNestedSubdirectory ? '../blog.html' : (isSubdirectory ? 'blog.html' : 'pages/blog.html');
    const contactLink = isNestedSubdirectory ? '../contact.html' : (isSubdirectory ? 'contact.html' : 'pages/contact.html');
    const courseLink = isNestedSubdirectory ? '../../robotics101/index.html' : (isSubdirectory ? '../robotics101/index.html' : 'robotics101/index.html');
    const md2imgLink = isNestedSubdirectory ? '../md2img.html' : (isSubdirectory ? 'md2img.html' : 'pages/md2img.html');
    
    const links = [
        { page: 'index.html', label: 'Home', icon: 'fas fa-house', href: homeLink },
        { page: 'about.html', label: 'About', icon: 'fas fa-user-astronaut', href: aboutLink },
        { page: 'research.html', label: 'Research', icon: 'fas fa-robot', href: researchLink },
        { page: 'blog.html', label: 'Blog', icon: 'fas fa-pen-nib', href: blogLink },
        { page: 'robotics101', label: 'Robotics 101', icon: 'fas fa-graduation-cap', href: courseLink },
        { page: 'contact.html', label: 'Contact', icon: 'fas fa-satellite-dish', href: contactLink },
        { page: 'md2img.html', label: 'MD to Image', icon: 'fas fa-image', href: md2imgLink }
    ];

    const brand = (size) => `
        <a href="${homeLink}" class="brand">
            <span class="brand-mark">JW</span>
            <span class="brand-text">
                <span class="side-nav-title"${size ? ` style="font-size:${size}"` : ''}>Jiaming Wang</span>
                <span class="brand-sub">Embodied AI · NUS</span>
            </span>
        </a>`;

    // Generate side navigation HTML
    const sideNavHTML = `
        <div class="side-nav-header">${brand()}</div>
        <div class="nav-status"><span class="status-dot"></span>Online · Singapore</div>
        <div class="side-nav-links">
            ${links.map((l, i) => `<a href="${l.href}" class="side-nav-link ${isActive(l.page) ? 'active' : ''}"><i class="${l.icon}"></i> <span class="nav-text">${l.label}</span><span class="nav-idx">0${i + 1}</span></a>`).join('')}
        </div>
        <div class="side-nav-footer">
            <div class="footer-icons">
                <a href="https://www.linkedin.com/in/jiaming-wang-ai/" target="_blank" rel="noopener noreferrer" class="footer-icon-link" title="LinkedIn">
                    <i class="fab fa-linkedin"></i>
                </a>
                <a href="mailto:jiaming@comp.nus.edu.sg" class="footer-icon-link" title="Email">
                    <i class="fas fa-envelope"></i>
                </a>
                <div class="footer-icon-link theme-toggle" onclick="toggleTheme()" title="Toggle theme">
                    <i class="fas fa-moon theme-icon"></i>
                </div>
            </div>
            <div class="footer-text">
                Building robots that<br>find their way
            </div>
        </div>
    `;

    // Generate top navigation HTML
    const topNavHTML = `
        <div class="max-w-7xl mx-auto px-6 py-3 flex justify-between items-center">
            ${brand('0.95rem')}
            <div class="flex items-center gap-6">
                ${links.slice(0, 5).map(l => `<a href="${l.href}" class="nav-link hidden md:inline ${isActive(l.page) ? 'active' : ''}">${l.label}</a>`).join('')}
                <div class="theme-toggle-mobile hidden md:inline-flex" onclick="toggleTheme()" title="Toggle theme">
                    <i class="fas fa-moon theme-icon"></i>
                </div>

                <!-- Mobile icons (visible only on small screens) -->
                ${links.slice(1, 5).map(l => `<a href="${l.href}" class="nav-link-icon md:hidden ${isActive(l.page) ? 'active' : ''}" title="${l.label}"><i class="${l.icon}"></i></a>`).join('')}
                <div class="theme-toggle-mobile md:hidden" onclick="toggleTheme()" title="Toggle theme">
                    <i class="fas fa-moon theme-icon"></i>
                </div>
            </div>
        </div>
    `;

    // Inject into placeholders
    const sideNav = document.getElementById('side-nav-placeholder');
    const topNav = document.getElementById('top-nav-placeholder');
    
    if (sideNav) sideNav.innerHTML = sideNavHTML;
    if (topNav) topNav.innerHTML = topNavHTML;
}

// Theme Toggle (dark "mission control" is the default)
function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', newTheme);
    try { localStorage.setItem('theme', newTheme); } catch (e) {}
    document.dispatchEvent(new Event('themechange'));
}

// Load saved theme
function loadTheme() {
    let savedTheme = 'dark';
    try { savedTheme = localStorage.getItem('theme') || 'dark'; } catch (e) {}
    document.documentElement.setAttribute('data-theme', savedTheme);
}

// Apply the theme as early as possible to avoid a flash of the wrong palette
loadTheme();

// Data storage
let publications = [];
let ongoingProjects = [];
let people = [];

// Cache duration: 5 minutes
const CACHE_DURATION = 5 * 60 * 1000;

// Helper function to fetch with cache
async function fetchWithCache(url, cacheKey) {
    const cached = localStorage.getItem(cacheKey);
    const cacheTime = localStorage.getItem(`${cacheKey}_time`);
    
    if (cached && cacheTime) {
        const age = Date.now() - parseInt(cacheTime);
        if (age < CACHE_DURATION) {
            return JSON.parse(cached);
        }
    }
    
    const response = await fetch(url);
    const data = await response.json();
    
    localStorage.setItem(cacheKey, JSON.stringify(data));
    localStorage.setItem(`${cacheKey}_time`, Date.now().toString());
    
    return data;
}

// Load data from JSON files
async function loadData() {
    try {
        // Detect directory depth relative to root
        const isNestedSub = window.location.pathname.includes('/pages/blog/');
        const isSub = !isNestedSub && window.location.pathname.includes('/pages/');
        const pathPrefix = typeof getPathPrefix === 'function' ? getPathPrefix() : (isNestedSub ? '../../' : (isSub ? '../' : ''));

        const [pubData, projectData, peopleData] = await Promise.all([
            fetchWithCache(pathPrefix + 'data/publications.json', 'cache_publications_v2'),
            fetchWithCache(pathPrefix + 'data/projects.json', 'cache_projects'),
            fetchWithCache(pathPrefix + 'data/people.json', 'cache_people')
        ]);

        publications = pubData;
        ongoingProjects = projectData;
        people = peopleData;
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

// Render Publications
function getRootPrefix() {
    const isNestedSub = window.location.pathname.includes('/pages/blog/');
    const isSub = !isNestedSub && window.location.pathname.includes('/pages/');
    return isNestedSub ? '../../' : (isSub ? '../' : '');
}

function pubLinkButtons(pub, id) {
    const root = getRootPrefix();
    const resolve = url => /^https?:/.test(url) ? url : root + url;
    const labels = { arxiv: 'arXiv', paper: 'Paper', code: 'Code', project: 'Project', video: 'Video', blog: 'Blog' };
    const icons = { arxiv: 'fas fa-file-lines', paper: 'fas fa-file-pdf', code: 'fab fa-github', project: 'fas fa-globe', video: 'fas fa-video', blog: 'fas fa-pen-nib' };
    const links = Object.entries(pub.links || {})
        .filter(([, url]) => url && url !== '#')
        .map(([key, url]) => {
            const external = /^https?:/.test(url);
            return `<a href="${resolve(url)}" class="pub-btn"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}><i class="${icons[key] || 'fas fa-link'}"></i>${labels[key] || key}</a>`;
        });
    links.push(`<button type="button" class="pub-btn" onclick="showBibtex('${id}')"><i class="fas fa-quote-right"></i>BibTeX</button>`);
    return links.join('');
}

function renderPublications() {
    const container = document.getElementById('publications-list');
    if (!container) return;

    const showSelectedOnly = container.dataset.selected === 'true';
    const pubs = showSelectedOnly ? publications.filter(pub => pub.selected) : publications;
    let lastYear = null;

    container.innerHTML = pubs.map((pub, i) => {
        const id = `pub-${i}`;
        const authors = pub.authors.replace('Jiaming Wang', '<strong class="pub-me">Jiaming Wang</strong>');
        const yearHeader = !showSelectedOnly && pub.year !== lastYear ? `<div class="pub-year">${pub.year}</div>` : '';
        lastYear = pub.year;
        return `${yearHeader}
            <article class="pub-entry spotlight">
                <div class="pub-venue-tag">${pub.venueShort || pub.venue}</div>
                <div class="pub-body">
                    <div class="pub-title">${pub.title}</div>
                    <div class="pub-authors">${authors}</div>
                    <div class="pub-venue">${pub.venue}, ${pub.year}</div>
                    ${pub.award ? `<div class="award-badge"><i class="fas fa-trophy"></i>${pub.award}</div>` : ''}
                    <div class="pub-actions">${pubLinkButtons(pub, id)}</div>
                    <pre id="bibtex-${id}" class="pub-bibtex" hidden>${pub.bibtex}</pre>
                </div>
            </article>`;
    }).join('');
}

function showBibtex(id) {
    const element = document.getElementById(`bibtex-${id}`);
    if (element) element.hidden = !element.hidden;
}

// Lightbox for award photos and certificates
function initLightbox() {
    const images = document.querySelectorAll('img[data-lightbox], [data-lightbox-src]');
    if (!images.length) return;

    const overlay = document.createElement('div');
    overlay.className = 'lightbox';
    overlay.hidden = true;
    overlay.innerHTML = '<button type="button" class="lightbox-close" aria-label="Close"><i class="fas fa-times"></i></button><img alt=""><p class="lightbox-caption"></p>';
    document.body.appendChild(overlay);

    const close = () => { overlay.hidden = true; document.body.style.overflow = ''; };
    images.forEach(img => img.addEventListener('click', () => {
        const alt = img.dataset.lightboxAlt || img.alt || '';
        overlay.querySelector('img').src = img.dataset.lightboxSrc || img.dataset.full || img.src;
        overlay.querySelector('img').alt = alt;
        overlay.querySelector('.lightbox-caption').textContent = alt;
        overlay.hidden = false;
        document.body.style.overflow = 'hidden';
    }));
    overlay.addEventListener('click', e => { if (e.target !== overlay.querySelector('img')) close(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !overlay.hidden) close(); });
}

// Render Ongoing Projects
function renderOngoingProjects() {
    const container = document.getElementById('ongoing-projects-list');
    if (!container) return;
    
    container.innerHTML = ongoingProjects.map(project => `
        <div class="card">
            <div class="flex justify-between items-start mb-2">
                <h3 class="text-xl font-semibold" style="color: var(--text-primary);">${project.title}</h3>
                <span class="tag">${project.status}</span>
            </div>
            <p class="narrative-text">${project.description}</p>
            <div class="mb-3">
                <p class="text-sm font-semibold mb-1" style="color: var(--text-primary);">Funding:</p>
                <p class="text-sm" style="color: var(--text-secondary);">${project.funding}</p>
            </div>
            <div>
                <p class="text-sm font-semibold mb-1" style="color: var(--text-primary);">Collaborators:</p>
                <p class="text-sm" style="color: var(--text-secondary);">${project.collaborators.join(', ')}</p>
            </div>
        </div>
    `).join('');
}

// Render People
function renderPeople() {
    const container = document.getElementById('people-grid');
    if (!container) return;
    
    container.innerHTML = people.map(person => `
        <div class="card text-center">
            <img src="${person.avatar}" alt="${person.name}" class="avatar mx-auto mb-3">
            <h3 class="font-semibold mb-1" style="color: var(--text-primary);">${person.name}</h3>
            <p class="text-sm mb-3" style="color: var(--text-secondary);">${person.role}</p>
            <div class="flex gap-3 justify-center">
                ${person.links.website ? `<a href="${person.links.website}" class="link-accent text-sm">Website</a>` : ''}
                ${person.links.github ? `<a href="${person.links.github}" target="_blank" class="link-accent text-sm">GitHub</a>` : ''}
            </div>
        </div>
    `).join('');
}

// Project Modal Functions
function openProjectModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
    }
}

function closeProjectModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}

// Smooth scrolling
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Render Teaching
function renderTeaching() {
    const container = document.getElementById('teaching-list');
    if (!container) return;
    
    container.innerHTML = teaching.map(course => `
        <div class="mb-3">
            <p class="font-semibold" style="color: var(--text-primary);">
                ${course.code}: ${course.title}
            </p>
            <p class="text-sm" style="color: var(--text-secondary);">
                ${course.role} | ${course.semester}
            </p>
        </div>
    `).join('');
}

// Render Awards
function renderAwards() {
    const container = document.getElementById('awards-list');
    if (!container) return;
    
    container.innerHTML = awards.map(award => `
        <div class="mb-3">
            <p class="font-semibold" style="color: var(--text-primary);">
                ${award.link ? `<a href="${award.link}" class="link-accent" target="_blank">${award.title}</a>` : award.title} , ${award.year}
            </p>
            <p class="text-sm" style="color: var(--text-secondary);">
                ${award.organization}${award.description ? ' — ' + award.description : ''}
            </p>
        </div>
    `).join('');
}

// ---------- Interaction effects ----------
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Fade/slide elements in as they enter the viewport
function initReveal(root = document) {
    // Sub-pages opt in automatically for their main building blocks
    root.querySelectorAll('.card, .pub-entry, .blog-post-link, .section-container > h2, .section-container > h3')
        .forEach(el => el.classList.add('reveal'));

    const items = root.querySelectorAll('.reveal:not(.in)');
    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
        items.forEach(el => el.classList.add('in'));
        return;
    }
    const io = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('in');
                io.unobserve(entry.target);
            }
        });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    items.forEach(el => io.observe(el));
}

// Radial glow that follows the cursor on .spotlight cards, plus a gentle 3D tilt on .tilt
function initSpotlight() {
    document.addEventListener('pointermove', e => {
        const card = e.target.closest && e.target.closest('.spotlight, .card, .pub-entry');
        if (!card) return;
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${e.clientX - r.left}px`);
        card.style.setProperty('--my', `${e.clientY - r.top}px`);
        if (!prefersReducedMotion && card.classList.contains('tilt')) {
            const rx = ((e.clientY - r.top) / r.height - 0.5) * -5;
            const ry = ((e.clientX - r.left) / r.width - 0.5) * 5;
            card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-2px)`;
        }
    });
    document.querySelectorAll('.tilt').forEach(card => {
        card.addEventListener('pointerleave', () => { card.style.transform = ''; });
    });
    document.querySelectorAll('.card, .pub-entry').forEach(el => el.classList.add('spotlight'));
}

// Count-up numbers
function initCounters() {
    const els = document.querySelectorAll('[data-count]');
    if (!els.length) return;
    const run = el => {
        const target = parseInt(el.dataset.count, 10) || 0;
        if (prefersReducedMotion) { el.textContent = target; return; }
        const t0 = performance.now(), dur = 1400;
        const tick = t => {
            const k = Math.min(1, (t - t0) / dur);
            el.textContent = Math.round(target * (1 - Math.pow(1 - k, 3)));
            if (k < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) { run(entry.target); io.unobserve(entry.target); }
        });
    }, { threshold: 0.6 });
    els.forEach(el => io.observe(el));
}

// Typewriter that cycles through phrases
function initTyper() {
    const el = document.querySelector('.typer[data-words]');
    if (!el || prefersReducedMotion) return;
    let words;
    try { words = JSON.parse(el.dataset.words); } catch (e) { return; }
    let w = 0, i = words[0].length, deleting = true;
    const tick = () => {
        const word = words[w];
        el.textContent = word.slice(0, i);
        let delay = deleting ? 28 : 55;
        if (deleting) {
            if (--i < 0) { deleting = false; w = (w + 1) % words.length; i = 0; delay = 350; }
        } else if (++i > words[w].length) {
            deleting = true; i = words[w].length; delay = 2400;
        }
        setTimeout(tick, delay);
    };
    setTimeout(tick, 3200);
}

// Thin progress bar showing how far down the page you are
function initScrollProgress() {
    const bar = document.createElement('div');
    bar.className = 'scroll-progress';
    document.body.appendChild(bar);
    const update = () => {
        const h = document.documentElement.scrollHeight - window.innerHeight;
        bar.style.transform = `scaleX(${h > 0 ? window.scrollY / h : 0})`;
    };
    window.addEventListener('scroll', update, { passive: true });
    update();
}

// Visitor counter (homepage). Uses the free Abacus hit counter; the displayed
// number starts from VISITOR_BASE. Counts once per browser session and stays
// hidden if the service is unreachable.
const VISITOR_BASE = 1987;
const VISITOR_API = 'https://abacus.jasoncameron.dev';
const VISITOR_KEY = 'jiaming-ai-github-io/visits';

async function initVisitorCounter() {
    const targets = document.querySelectorAll('[data-visitor-count]');
    if (!targets.length) return;
    let counted = false;
    try { counted = sessionStorage.getItem('visit_counted') === '1'; } catch (e) {}
    try {
        const res = await fetch(`${VISITOR_API}/${counted ? 'get' : 'hit'}/${VISITOR_KEY}`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        const value = Number(data.value);
        if (!Number.isFinite(value)) return;
        try { sessionStorage.setItem('visit_counted', '1'); } catch (e) {}
        const text = (VISITOR_BASE + value).toLocaleString('en-US');
        targets.forEach(el => { el.textContent = text; });
        document.querySelectorAll('.visitor-meta').forEach(el => { el.hidden = false; });
    } catch (e) {
        // Counter is decorative; ignore network failures.
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Initialize navigation first
    initNavigation();
    loadTheme();
    initScrollProgress();
    initTyper();
    initSpotlight();
    initReveal();

    // Load data then render
    loadData().then(() => {
        renderPublications();
        renderOngoingProjects();
        renderPeople();
        initSmoothScroll();
        const pubCount = document.querySelector('[data-count-source="publications"]');
        if (pubCount && publications.length) pubCount.dataset.count = publications.length;
        initReveal();
        initCounters();
    });

    initLightbox();
    initVisitorCounter();

    // Close project modals on outside click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                closeProjectModal(e.target.id);
            }
        });
    });
});
