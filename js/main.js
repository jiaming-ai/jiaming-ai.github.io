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
    
    // Generate side navigation HTML
    const sideNavHTML = `
        <div class="side-nav-header">
            <div class="side-nav-title">Hi, I'm Jiaming</div>
        </div>
        <div class="side-nav-links">
            <a href="${pathPrefix}index.html" class="side-nav-link ${isActive('index.html') ? 'active' : ''}"><i class="fas fa-home"></i> <span class="nav-text">Home</span></a>
            <a href="${pathPrefix}pages/about.html" class="side-nav-link ${isActive('about.html') ? 'active' : ''}"><i class="fas fa-user"></i> <span class="nav-text">About</span></a>
            <a href="${pathPrefix}pages/research.html" class="side-nav-link ${isActive('research.html') ? 'active' : ''}"><i class="fas fa-flask"></i> <span class="nav-text">Research</span></a>
            <a href="${pathPrefix}pages/blog.html" class="side-nav-link ${isActive('blog.html') ? 'active' : ''}"><i class="fas fa-blog"></i> <span class="nav-text">Blog</span></a>
            <a href="${pathPrefix}pages/contact.html" class="side-nav-link ${isActive('contact.html') ? 'active' : ''}"><i class="fas fa-envelope"></i> <span class="nav-text">Contact</span></a>
            <a href="${pathPrefix}pages/md2img.html" class="side-nav-link ${isActive('md2img.html') ? 'active' : ''}"><i class="fas fa-image"></i> <span class="nav-text">MD to Image</span></a>
        </div>
        <div class="side-nav-footer">
            <div class="footer-icons">
                <a href="https://www.linkedin.com/in/jiaming-wang-ai/" target="_blank" class="footer-icon-link" title="LinkedIn">
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
                Building intelligent robots<br>one algorithm at a time
            </div>
        </div>
    `;
    
    // Adjust paths for subdirectory pages
    const homeLink = isNestedSubdirectory ? '../../index.html' : (isSubdirectory ? '../index.html' : 'index.html');
    const aboutLink = isNestedSubdirectory ? '../about.html' : (isSubdirectory ? 'about.html' : 'pages/about.html');
    const researchLink = isNestedSubdirectory ? '../research.html' : (isSubdirectory ? 'research.html' : 'pages/research.html');
    const blogLink = isNestedSubdirectory ? '../blog.html' : (isSubdirectory ? 'blog.html' : 'pages/blog.html');
    const contactLink = isNestedSubdirectory ? '../contact.html' : (isSubdirectory ? 'contact.html' : 'pages/contact.html');
    const md2imgLink = isNestedSubdirectory ? '../md2img.html' : (isSubdirectory ? 'md2img.html' : 'pages/md2img.html');
    
    // Generate top navigation HTML
    const topNavHTML = `
        <div class="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
            <a href="${homeLink}" class="text-xl font-semibold" style="color: var(--text-primary);">Hi, I'm Jiaming</a>
            <div class="flex items-center gap-6">
                <a href="${homeLink}" class="nav-link hidden md:inline ${isActive('index.html') ? 'active' : ''}">Home</a>
                <a href="${aboutLink}" class="nav-link hidden md:inline ${isActive('about.html') ? 'active' : ''}">About</a>
                <a href="${researchLink}" class="nav-link hidden md:inline ${isActive('research.html') ? 'active' : ''}">Research</a>
                <a href="${blogLink}" class="nav-link hidden md:inline ${isActive('blog.html') ? 'active' : ''}">Blog</a>
                <a href="${contactLink}" class="nav-link hidden md:inline ${isActive('contact.html') ? 'active' : ''}">Contact</a>
                <a href="${md2imgLink}" class="nav-link hidden md:inline ${isActive('md2img.html') ? 'active' : ''}">MD to Image</a>
                <div class="theme-toggle-mobile hidden md:inline-flex" onclick="toggleTheme()" title="Toggle theme">
                    <i class="fas fa-moon theme-icon"></i>
                </div>
                
                <!-- Mobile icons (visible only on small screens) -->
                <a href="${aboutLink}" class="nav-link-icon md:hidden" title="About"><i class="fas fa-user"></i></a>
                <a href="${researchLink}" class="nav-link-icon md:hidden" title="Research"><i class="fas fa-flask"></i></a>
                <a href="${blogLink}" class="nav-link-icon md:hidden" title="Blog"><i class="fas fa-blog"></i></a>
                <a href="${contactLink}" class="nav-link-icon md:hidden" title="Contact"><i class="fas fa-envelope"></i></a>
                <a href="${md2imgLink}" class="nav-link-icon md:hidden" title="MD to Image"><i class="fas fa-image"></i></a>
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

// Theme Toggle
function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

// Load saved theme
function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
}

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
            <article class="pub-entry">
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
    const images = document.querySelectorAll('img[data-lightbox]');
    if (!images.length) return;

    const overlay = document.createElement('div');
    overlay.className = 'lightbox';
    overlay.hidden = true;
    overlay.innerHTML = '<button type="button" class="lightbox-close" aria-label="Close"><i class="fas fa-times"></i></button><img alt=""><p class="lightbox-caption"></p>';
    document.body.appendChild(overlay);

    const close = () => { overlay.hidden = true; document.body.style.overflow = ''; };
    images.forEach(img => img.addEventListener('click', () => {
        overlay.querySelector('img').src = img.dataset.full || img.src;
        overlay.querySelector('img').alt = img.alt;
        overlay.querySelector('.lightbox-caption').textContent = img.alt;
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

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Initialize navigation first
    initNavigation();
    loadTheme();
    
    // Load data then render
    loadData().then(() => {
        renderPublications();
        renderOngoingProjects();
        renderPeople();
        initSmoothScroll();
    });

    initLightbox();

    // Close project modals on outside click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                closeProjectModal(e.target.id);
            }
        });
    });
});
