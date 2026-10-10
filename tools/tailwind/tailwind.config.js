// Default Tailwind v3 theme, i.e. exactly what the old Play CDN script used.
// Content globs include js/ and data/ because main.js builds markup with utility classes at runtime.
module.exports = {
  content: [
    '../../index.html',
    '../../pages/**/*.html',
    '../../js/**/*.js',
    '../../data/**/*.json',
  ],
  theme: { extend: {} },
  plugins: [],
};
