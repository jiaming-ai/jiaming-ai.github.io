# md2img -- Markdown to Image

Convert markdown (with math support) into phone-sized images, ready for sharing on social media. Long content is automatically split into multiple pages.

## Two ways to use

### 1. Web UI

Open `pages/md2img.html` in a browser (or visit the hosted version on the website).

- Type or paste markdown in the left editor
- Preview updates in real time on the right
- Pick a preset or customize colors, font, and font size
- Drop or paste images directly into the editor
- Click **Export All Pages** to download

### 2. Node.js CLI

```bash
cd tools/md2img
npm install          # one-time: installs puppeteer
node md2img.mjs input.md -o output
```

Or pipe from stdin:

```bash
cat notes.md | node md2img.mjs -p dark-mode -o slides
```

Install globally (optional):

```bash
cd tools/md2img && npm install && npm link
md2img input.md -o output      # now available everywhere
```

## CLI options

| Flag | Description | Default |
|------|-------------|---------|
| `-o, --output <name>` | Output filename prefix | `md-image` |
| `-p, --preset <name>` | Style preset | `clean-white` |
| `--bg <color>` | Background color (hex) | from preset |
| `--color <color>` | Font color (hex) | from preset |
| `--font <family>` | CSS font-family string | from preset |
| `--size <px>` | Font size in pixels | from preset |
| `-f, --format <fmt>` | `png` or `jpeg` | `png` |
| `--scale <n>` | Pixel scale: 2, 3, or 4 | `3` |
| `--list-presets` | Show all presets | |
| `-h, --help` | Show help | |

## Presets

| Name | Background | Text | Best for |
|------|-----------|------|----------|
| `clean-white` | white | dark gray | default, clean look |
| `warm-paper` | warm cream | dark brown | long-form reading |
| `soft-cream` | off-white | stone | gentle, elegant |
| `cool-gray` | light gray | near-black | modern, neutral |
| `dark-mode` | deep purple | light blue | dark theme |
| `monokai` | dark green | light yellow | code-heavy content |
| `nord` | dark blue-gray | light gray | Nordic aesthetic |
| `sakura` | soft pink | dark brown | warm, friendly |
| `ocean` | deep navy | slate blue | dramatic, dark |
| `mint-fresh` | pale green | dark green | fresh, natural |
| `lavender` | pale violet | deep purple | creative, soft |
| `sunset` | warm orange | dark red | warm, energetic |

## Math support

Supports four LaTeX delimiter styles:

```
Inline:  $E = mc^2$          or  \(E = mc^2\)
Display: $$\int_0^1 x\,dx$$  or  \[\int_0^1 x\,dx\]
```

Long equations auto-scale to fit the page width.

## Images

**Web UI:** Drag and drop image files onto the textarea, or paste from clipboard (e.g. screenshots). Images are embedded as base64 data URIs.

**CLI:** Use standard markdown image syntax with local paths:

```markdown
![photo](./images/photo.png)
```

Local image paths are automatically resolved and embedded as base64 in the output. URLs (`http://...`) are left as-is.

## Output

Each page is 375 x 667 px (iPhone SE dimensions) with 32px horizontal padding. At the default 3x scale, output images are 1125 x 2001 px -- sharp on any phone screen.

Multi-page content is split at block boundaries (paragraphs, headings, lists) so text is never cut mid-line.

## Examples

```bash
# Basic usage
md2img notes.md

# Dark mode, JPEG output
md2img notes.md -p dark-mode -f jpeg -o dark-notes

# Custom colors, larger font
md2img notes.md --bg "#1a1a2e" --color "#e0e0e0" --size 18 -o custom

# Ultra-high DPI
md2img notes.md --scale 4 -o retina

# Pipe from another command
echo "# Hello\n\nWorld" | md2img -o hello
```
