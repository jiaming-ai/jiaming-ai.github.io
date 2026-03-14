#!/usr/bin/env node

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

// ── Presets ──
const PRESETS = {
  'clean-white':  { bg: '#ffffff', color: '#1a1a1a', font: "'Helvetica Neue', Helvetica, Arial, sans-serif", size: 15 },
  'warm-paper':   { bg: '#fdf6e3', color: '#3c3836', font: "'Georgia', serif", size: 16 },
  'soft-cream':   { bg: '#fefcf3', color: '#44403c', font: "'Lora', Georgia, serif", size: 15 },
  'cool-gray':    { bg: '#f8f9fa', color: '#212529', font: "'Inter', -apple-system, sans-serif", size: 15 },
  'dark-mode':    { bg: '#1e1e2e', color: '#cdd6f4', font: "'Inter', -apple-system, sans-serif", size: 15 },
  'monokai':      { bg: '#272822', color: '#f8f8f2', font: "'Courier New', Courier, monospace", size: 14 },
  'nord':         { bg: '#2e3440', color: '#d8dee9', font: "'Source Sans Pro', 'Helvetica Neue', sans-serif", size: 15 },
  'sakura':       { bg: '#fef1f2', color: '#4a2c2a', font: "'Palatino Linotype', 'Book Antiqua', Palatino, serif", size: 15 },
  'ocean':        { bg: '#0f172a', color: '#94a3b8', font: "'Helvetica Neue', Helvetica, Arial, sans-serif", size: 15 },
  'mint-fresh':   { bg: '#f0fdf4', color: '#14532d', font: "'Merriweather', Georgia, serif", size: 15 },
  'lavender':     { bg: '#f5f3ff', color: '#3b0764', font: "'Garamond', 'EB Garamond', serif", size: 16 },
  'sunset':       { bg: '#fff7ed', color: '#7c2d12', font: "'Georgia', serif", size: 15 },
};

// ── CLI arg parsing ──
function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    input: null,
    output: 'md-image',
    preset: 'clean-white',
    bg: null,
    color: null,
    font: null,
    size: null,
    format: 'png',
    scale: 3,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '-h': case '--help':
        printHelp(); process.exit(0);
      case '--list-presets':
        console.log('Available presets:\n');
        for (const [name, p] of Object.entries(PRESETS)) {
          console.log(`  ${name.padEnd(14)} bg:${p.bg}  color:${p.color}  font-size:${p.size}px`);
        }
        process.exit(0);
      case '-o': case '--output':
        opts.output = args[++i]; break;
      case '-p': case '--preset':
        opts.preset = args[++i]; break;
      case '--bg':
        opts.bg = args[++i]; break;
      case '--color':
        opts.color = args[++i]; break;
      case '--font':
        opts.font = args[++i]; break;
      case '--size':
        opts.size = parseInt(args[++i]); break;
      case '-f': case '--format':
        opts.format = args[++i]; break;
      case '--scale':
        opts.scale = parseInt(args[++i]); break;
      default:
        if (!arg.startsWith('-')) opts.input = arg;
        else { console.error(`Unknown option: ${arg}`); process.exit(1); }
    }
  }

  if (!opts.input) {
    // Check for stdin
    if (process.stdin.isTTY) {
      printHelp();
      process.exit(1);
    }
  }

  return opts;
}

function printHelp() {
  console.log(`
md2img - Convert markdown (with math) into phone-sized images

Usage:
  md2img <input.md> [options]
  cat input.md | md2img [options]

Options:
  -o, --output <name>    Output filename prefix (default: "md-image")
  -p, --preset <name>    Style preset (default: "clean-white")
  --bg <color>           Background color, e.g. "#1e1e2e"
  --color <color>        Font color, e.g. "#cdd6f4"
  --font <family>        Font family, e.g. "Georgia, serif"
  --size <px>            Font size in pixels (default: from preset)
  -f, --format <fmt>     Output format: png or jpeg (default: png)
  --scale <n>            Pixel scale factor: 2, 3, or 4 (default: 3)
  --list-presets         Show all available presets
  -h, --help             Show this help

Examples:
  md2img notes.md -p dark-mode -o output
  md2img notes.md --bg "#fdf6e3" --color "#3c3836" --font "Georgia, serif"
  cat notes.md | md2img -p sakura -o slides
`);
}

// ── Self-contained HTML template ──
function buildHtml(md, styles) {
  // Escape for embedding in JS string
  const escapedMd = JSON.stringify(md);

  return `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"><\/script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
<script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"><\/script>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: transparent; }
  .page {
    width: 375px;
    min-height: 667px;
    padding: 40px 32px;
    background: ${styles.bg};
    color: ${styles.color};
    font-family: ${styles.font};
    font-size: ${styles.size}px;
    line-height: 1.8;
    word-wrap: break-word;
    overflow-wrap: break-word;
    margin-bottom: 4px;
  }
  .page h1 { font-size: 1.6em; font-weight: 700; margin: 0.6em 0 0.4em; }
  .page h2 { font-size: 1.35em; font-weight: 700; margin: 0.5em 0 0.35em; }
  .page h3 { font-size: 1.15em; font-weight: 600; margin: 0.4em 0 0.3em; }
  .page p { margin: 0.5em 0; }
  .page ul, .page ol { padding-left: 1.5em; margin: 0.5em 0; }
  .page li { margin: 0.25em 0; }
  .page blockquote { border-left: 3px solid currentColor; opacity: 0.8; padding-left: 1em; margin: 0.5em 0; }
  .page pre { background: rgba(0,0,0,0.05); padding: 0.8em; border-radius: 6px; overflow-x: auto; font-size: 0.85em; margin: 0.5em 0; }
  .page code { background: rgba(0,0,0,0.05); padding: 0.15em 0.35em; border-radius: 3px; font-size: 0.9em; }
  .page pre code { background: none; padding: 0; }
  .page img { max-width: 100%; border-radius: 6px; }
  .page hr { border: none; border-top: 1px solid currentColor; opacity: 0.2; margin: 1em 0; }
  .page table { border-collapse: collapse; width: 100%; margin: 0.5em 0; font-size: 0.9em; }
  .page th, .page td { border: 1px solid currentColor; padding: 0.4em 0.6em; opacity: 0.9; }
  .page th { font-weight: 600; }
  .page .katex-display { overflow: hidden; padding: 4px 0; margin: 0.5em 0; }
  .page .katex-display > .katex { white-space: nowrap; font-size: 1.1em; }
  .page .katex { font-size: 1em; }
  .watermark { text-align: right; font-size: 10px; opacity: 0.35; margin-top: 12px; padding-top: 8px; border-top: 1px solid currentColor; }
</style>
</head><body>
<div id="pages"></div>
<script>
function renderKatex(tex, displayMode) {
  try { return katex.renderToString(tex.trim(), { displayMode, throwOnError: false }); }
  catch { return tex; }
}

function mdToHtml(md) {
  const mathBlocks = [];
  function protect(match, tex, display) {
    const idx = mathBlocks.length;
    mathBlocks.push({ tex, display });
    return '%%MATH_' + idx + '%%';
  }
  let p = md;
  p = p.replace(/\\$\\$([\\s\\S]*?)\\$\\$/g, (m, t) => protect(m, t, true));
  p = p.replace(/\\\\\\[([\\s\\S]*?)\\\\\\]/g, (m, t) => protect(m, t, true));
  p = p.replace(/\\\\\\(([\\s\\S]*?)\\\\\\)/g, (m, t) => protect(m, t, false));
  p = p.replace(/(?<!\\$)\\$(?!\\$)((?:[^$\\\\]|\\\\.)+?)\\$(?!\\$)/g, (m, t) => protect(m, t, false));
  let html = marked.parse(p);
  html = html.replace(/%%MATH_(\\d+)%%/g, (_, idx) => {
    const { tex, display } = mathBlocks[parseInt(idx)];
    return renderKatex(tex, display);
  });
  return html;
}

function splitIntoPages(html) {
  const PAGE_WIDTH = 311; // 375 - 64
  const PAGE_HEIGHT = 587; // 667 - 80
  const measurer = document.createElement('div');
  measurer.style.cssText = 'position:absolute;left:-9999px;top:0;width:' + PAGE_WIDTH + 'px;' +
    'font-family:${styles.font.replace(/'/g, "\\'")}; font-size:${styles.size}px; line-height:1.8;' +
    'color:${styles.color}; word-wrap:break-word; overflow-wrap:break-word;';
  measurer.innerHTML = html;
  document.body.appendChild(measurer);
  const pages = [];
  const children = Array.from(measurer.childNodes);
  let currentPageNodes = [];
  function measureCurrentPage() {
    if (!currentPageNodes.length) return 0;
    const t = document.createElement('div');
    t.style.cssText = measurer.style.cssText; t.style.position='absolute'; t.style.left='-9999px';
    currentPageNodes.forEach(n => t.appendChild(n.cloneNode(true)));
    document.body.appendChild(t);
    const h = t.scrollHeight;
    document.body.removeChild(t);
    return h;
  }
  function flushPage() {
    if (!currentPageNodes.length) return;
    const d = document.createElement('div');
    currentPageNodes.forEach(n => d.appendChild(n.cloneNode(true)));
    pages.push(d.innerHTML);
    currentPageNodes = [];
  }
  for (const child of children) {
    if (child.nodeType === Node.TEXT_NODE && !child.textContent.trim()) continue;
    currentPageNodes.push(child);
    const h = measureCurrentPage();
    if (h > PAGE_HEIGHT && currentPageNodes.length > 1) {
      currentPageNodes.pop();
      flushPage();
      currentPageNodes.push(child);
    }
  }
  flushPage();
  document.body.removeChild(measurer);
  return pages.length ? pages : [''];
}

function fitMath(container) {
  const cw = container.clientWidth;
  if (!cw) return;
  const cs = getComputedStyle(container);
  const aw = cw - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  container.querySelectorAll('.katex-display').forEach(block => {
    block.style.transform = ''; block.style.transformOrigin = '';
    const k = block.querySelector('.katex');
    if (!k) return;
    const mw = k.scrollWidth;
    if (mw > aw) {
      const s = aw / mw;
      block.style.transform = 'scale(' + s + ')';
      block.style.transformOrigin = 'left center';
      block.style.marginRight = '-' + (mw * (1 - s)) + 'px';
    }
  });
}

const md = ${escapedMd};
const html = mdToHtml(md);
const pages = splitIntoPages(html);
const container = document.getElementById('pages');
container.innerHTML = pages.map((p, i) =>
  '<div class="page" id="page-' + i + '">' + p +
  (pages.length > 1 ? '<div class="watermark">' + (i+1) + ' / ' + pages.length + '</div>' : '') +
  '</div>'
).join('');
// Scale math
document.querySelectorAll('.page').forEach(fitMath);
// Signal ready
window.__PAGES_READY__ = pages.length;
<\/script>
</body></html>`;
}

// ── Main ──
async function main() {
  const opts = parseArgs();

  // Read input
  let md;
  if (opts.input) {
    md = fs.readFileSync(opts.input, 'utf-8');
  } else {
    // Read from stdin
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    md = Buffer.concat(chunks).toString('utf-8');
  }

  // Resolve styles
  const preset = PRESETS[opts.preset];
  if (!preset) {
    console.error(`Unknown preset: "${opts.preset}". Use --list-presets to see available presets.`);
    process.exit(1);
  }
  const styles = {
    bg: opts.bg || preset.bg,
    color: opts.color || preset.color,
    font: opts.font || preset.font,
    size: opts.size || preset.size,
  };

  // Resolve local image paths to data URIs
  const inputDir = opts.input ? path.dirname(path.resolve(opts.input)) : process.cwd();
  md = md.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, src) => {
    // Skip URLs and data URIs
    if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:')) {
      return match;
    }
    const imgPath = path.resolve(inputDir, src);
    if (fs.existsSync(imgPath)) {
      const ext = path.extname(imgPath).toLowerCase().replace('.', '');
      const mime = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', svg: 'image/svg+xml', webp: 'image/webp' }[ext] || 'image/png';
      const data = fs.readFileSync(imgPath).toString('base64');
      return `![${alt}](data:${mime};base64,${data})`;
    }
    return match;
  });

  const htmlContent = buildHtml(md, styles);

  console.log('Launching browser...');
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 800, height: 1200, deviceScaleFactor: opts.scale });
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

  // Wait for rendering to complete
  await page.waitForFunction('window.__PAGES_READY__', { timeout: 30000 });
  const pageCount = await page.evaluate(() => window.__PAGES_READY__);

  console.log(`Rendered ${pageCount} page(s). Capturing...`);

  const ext = opts.format === 'jpeg' ? 'jpg' : 'png';
  const outDir = path.dirname(opts.output);
  const outBase = path.basename(opts.output);

  for (let i = 0; i < pageCount; i++) {
    const el = await page.$(`#page-${i}`);
    const suffix = pageCount > 1 ? `-${i + 1}` : '';
    const outPath = path.join(outDir, `${outBase}${suffix}.${ext}`);

    await el.screenshot({
      path: outPath,
      type: opts.format === 'jpeg' ? 'jpeg' : 'png',
      quality: opts.format === 'jpeg' ? 95 : undefined,
      omitBackground: false,
    });

    console.log(`  Saved: ${outPath}`);
  }

  await browser.close();
  console.log('Done!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
