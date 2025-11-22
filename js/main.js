// Navigation Generator
function initNavigation() {
    // Detect if we're in a subdirectory (pages/) or root
    const isSubdirectory = window.location.pathname.includes('/pages/');
    const pathPrefix = isSubdirectory ? '../' : '';
    
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
    const homeLink = isSubdirectory ? '../index.html' : 'index.html';
    const aboutLink = isSubdirectory ? 'about.html' : 'pages/about.html';
    const researchLink = isSubdirectory ? 'research.html' : 'pages/research.html';
    const blogLink = isSubdirectory ? 'blog.html' : 'pages/blog.html';
    const contactLink = isSubdirectory ? 'contact.html' : 'pages/contact.html';
    
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
                <div class="theme-toggle-mobile hidden md:inline-flex" onclick="toggleTheme()" title="Toggle theme">
                    <i class="fas fa-moon theme-icon"></i>
                </div>
                
                <!-- Mobile icons (visible only on small screens) -->
                <a href="${aboutLink}" class="nav-link-icon md:hidden" title="About"><i class="fas fa-user"></i></a>
                <a href="${researchLink}" class="nav-link-icon md:hidden" title="Research"><i class="fas fa-flask"></i></a>
                <a href="${blogLink}" class="nav-link-icon md:hidden" title="Blog"><i class="fas fa-blog"></i></a>
                <a href="${contactLink}" class="nav-link-icon md:hidden" title="Contact"><i class="fas fa-envelope"></i></a>
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
let blogPosts = [];

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
        // Detect if we're in a subdirectory (pages/) or root
        const isSubdirectory = window.location.pathname.includes('/pages/');
        const pathPrefix = isSubdirectory ? '../' : '';
        
        const [pubData, projectData, peopleData, blogData] = await Promise.all([
            fetchWithCache(pathPrefix + 'data/publications.json', 'cache_publications'),
            fetchWithCache(pathPrefix + 'data/projects.json', 'cache_projects'),
            fetchWithCache(pathPrefix + 'data/people.json', 'cache_people'),
            fetchWithCache(pathPrefix + 'data/blog.json', 'cache_blog')
        ]);
        
        publications = pubData;
        ongoingProjects = projectData;
        people = peopleData;
        blogPosts = blogData;
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

// Render Publications
function renderPublications(filter = 'all') {
    const container = document.getElementById('publications-list');
    if (!container) return;
    
    let filteredPubs = filter === 'all' 
        ? publications 
        : publications.filter(pub => pub.type === filter);
    
    // Check if this is the homepage (academic style) or other pages
    const isHomepage = container.closest('.simple-section');
    
    // On homepage, show only selected publications
    if (isHomepage) {
        filteredPubs = filteredPubs.filter(pub => pub.selected === true);
    }
    
    if (isHomepage) {
        // Academic list style for homepage (no links)
        container.innerHTML = filteredPubs.map(pub => `
            <div class="publication-item">
                <div class="pub-title">${pub.title}</div>
                <div class="pub-authors">${pub.authors}</div>
                <div class="pub-venue">
                    ${pub.venue}, ${pub.year}
                    ${pub.note ? `<span style="color: var(--accent); font-weight: 500; margin-left: 0.5rem;">${pub.note}</span>` : ''}
                </div>
            </div>
        `).join('');
    } else {
        // Card style for other pages (with links)
        container.innerHTML = filteredPubs.map(pub => `
            <div class="card">
                <div class="flex justify-between items-start mb-2">
                    <span class="text-sm font-semibold" style="color: var(--accent);">${pub.venue}</span>
                    <span class="text-sm" style="color: var(--text-secondary);">${pub.year}</span>
                </div>
                <h3 class="text-xl font-semibold mb-2" style="color: var(--text-primary);">${pub.title}</h3>
                ${pub.note ? `<p class="text-sm mb-2" style="color: var(--accent); font-weight: 500;">${pub.note}</p>` : ''}
                <p class="text-sm mb-3" style="color: var(--text-secondary);">${pub.authors}</p>
                <div class="flex gap-3 flex-wrap mb-3">
                    ${pub.links.pdf && pub.links.pdf !== '#' ? `<a href="${pub.links.pdf}" class="link-accent text-sm">PDF</a>` : ''}
                    ${pub.links.code && pub.links.code !== '#' ? `<a href="${pub.links.code}" target="_blank" class="link-accent text-sm">Code</a>` : ''}
                    ${pub.links.video && pub.links.video !== '#' ? `<a href="${pub.links.video}" class="link-accent text-sm">Video</a>` : ''}
                    <button onclick="showBibtex('${pub.year}-${pub.title.replace(/\s+/g, '-')}')" class="link-accent text-sm">BibTeX</button>
                </div>
                <pre id="bibtex-${pub.year}-${pub.title.replace(/\s+/g, '-')}" style="display: none; background-color: var(--bg-secondary); padding: 1rem; border-radius: 0.5rem; overflow-x: auto; font-size: 0.875rem; color: var(--text-secondary);">${pub.bibtex}</pre>
            </div>
        `).join('');
    }
}

function showBibtex(id) {
    const element = document.getElementById(`bibtex-${id}`);
    if (element) {
        element.style.display = element.style.display === 'none' ? 'block' : 'none';
    }
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

// Render Blog Posts
function renderBlogPosts(posts = blogPosts) {
    const container = document.getElementById('blog-list');
    if (!container) return;
    
    container.innerHTML = posts.map(post => `
        <div class="card cursor-pointer" onclick="openBlogModal(${post.id})">
            <h3 class="text-xl font-semibold mb-2" style="color: var(--text-primary);">${post.title}</h3>
            <p class="text-sm mb-2" style="color: var(--text-secondary);">${post.date}</p>
            <p class="narrative-text mb-3">${post.summary}</p>
            <div>
                ${post.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
            </div>
        </div>
    `).join('');
}

// Blog Search
function initBlogSearch() {
    const searchInput = document.getElementById('blog-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const filtered = blogPosts.filter(post => 
                post.title.toLowerCase().includes(query) ||
                post.summary.toLowerCase().includes(query) ||
                post.tags.some(tag => tag.toLowerCase().includes(query))
            );
            renderBlogPosts(filtered);
        });
    }
}

// Blog Modal
function openBlogModal(id) {
    const post = blogPosts.find(p => p.id === id);
    if (!post) return;
    
    const modalContent = document.getElementById('modal-blog-content');
    const modal = document.getElementById('blog-modal');
    
    if (modalContent && modal) {
        modalContent.innerHTML = post.content;
        modal.classList.add('active');
    }
}

function closeBlogModal() {
    const modal = document.getElementById('blog-modal');
    if (modal) {
        modal.classList.remove('active');
    }
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
        renderBlogPosts();
        initBlogSearch();
        initSmoothScroll();
    });
    
    // Close modal on outside click
    const modal = document.getElementById('blog-modal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target.id === 'blog-modal') {
                closeBlogModal();
            }
        });
    }
    
    // Close project modals on outside click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                closeProjectModal(e.target.id);
            }
        });
    });
});
