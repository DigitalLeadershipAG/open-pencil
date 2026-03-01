# Demo Recording Pipeline

Automated recording of OpenPencil user scenarios with fake cursor, text annotations, and FFmpeg post-production.

## Prerequisites

- [Playwright](https://playwright.dev/) — already installed with the project
- [FFmpeg](https://ffmpeg.org/) — for video conversion

```bash
# Install ffmpeg
brew install ffmpeg        # macOS
sudo apt install ffmpeg    # Ubuntu/Debian

# Verify
ffmpeg -version
```

## Recording

Start the dev server first, then record a scenario:

```bash
# Terminal 1: start dev server
bun run dev

# Terminal 2: record a scenario
bun demo:record create-shapes
bun demo:record layers-panel
bun demo:record color-picker
```

The browser opens in headed mode, runs the scenario with fake cursor + annotations, and saves a `.webm` file to `demos/output/recordings/`.

### Dry-run mode

Debug cursor movements and annotations without recording video:

```bash
bun demo:record create-shapes --dry-run
```

## Converting

Convert a recorded `.webm` to MP4 and GIF:

```bash
bun demo:convert demos/output/recordings/<file>.webm create-shapes
```

Output goes to `demos/output/final/`:
- `create-shapes.mp4` — H.264, suitable for embedding
- `create-shapes.gif` — 640px wide, optimized palette

### Duration guidelines

- **GIF**: keep scenarios under 30 seconds (file size target: <5MB)
- **MP4**: keep under 2 minutes for documentation, shorter for social media

## Creating Scenarios

Each scenario is a TypeScript file in `demos/scenarios/` that exports a `DemoScenario`:

```typescript
import type { DemoScenario } from '../scripts/record'

const scenario: DemoScenario = {
  name: 'My Feature Demo',

  async run(r) {
    // Show annotation, then draw a shape
    await r.annotate('Press R for Rectangle tool')
    await r.selectTool('rectangle')
    await r.clearAnnotation()

    await r.annotate('Click and drag to draw')
    await r.drawRect(200, 150, 300, 200)
    await r.clearAnnotation()

    // Zoom in to see detail
    await r.zoomIn(2)

    // Click with ripple effect
    await r.clickCanvas(350, 250, { showRipple: true })

    // Annotation at top (useful when demonstrating bottom UI)
    await r.annotate('Properties panel shows fill options', 'top')
    await r.sleep(1500)
    await r.clearAnnotation()

    // Zoom to fit before ending
    await r.zoomToFit()
  },
}

export default scenario
```

### DemoRecorder API

| Method | Description |
|--------|-------------|
| `annotate(text, position?)` | Show annotation (`'bottom'` or `'top'`) |
| `clearAnnotation()` | Hide current annotation |
| `drawRect(x, y, w, h, annotation?)` | Draw rectangle with optional annotation |
| `drawEllipse(x, y, w, h, annotation?)` | Draw ellipse with optional annotation |
| `selectTool(tool, annotation?)` | Switch tool (`'select'`, `'rectangle'`, `'ellipse'`, `'text'`, `'pen'`, `'frame'`, `'hand'`) |
| `clickCanvas(x, y, options?)` | Click on canvas coordinates with fake cursor |
| `clickLocator(locator, options?)` | Click on Playwright locator with fake cursor |
| `drag(fromX, fromY, toX, toY)` | Drag on canvas with fake cursor |
| `pressKey(key)` | Press keyboard key |
| `type(text, delay?)` | Type text character by character |
| `zoomIn(factor?)` | Smooth zoom in (default 1.5x) |
| `zoomOut(factor?)` | Smooth zoom out (default 1.5x) |
| `smoothZoom(targetZoom, durationMs?)` | Zoom to exact level with animation |
| `zoomToFit()` | Fit all content in view |
| `sleep(ms)` | Pause for timing |

Click options: `{ showRipple: true }` adds a visual ripple effect at click point.

## Troubleshooting

### ffmpeg not found

Install via package manager (see Prerequisites). The convert script checks for ffmpeg and shows installation commands if missing.

### GIF >5MB

The convert script fails if GIF exceeds 5MB. To fix:
- **Shorten the scenario** — keep under 30 seconds
- **Edit `convert.sh`** — reduce `fps=15` to `fps=10`, or `scale=640` to `scale=480`
- **Crop** — add FFmpeg crop filter to remove empty space

### CanvasKit rendering issues

Demos run in headed mode with real GPU by default. If you see rendering artifacts:
- Ensure your GPU drivers are up to date
- Try with `--enable-unsafe-swiftshader` in browser launch args (software rendering, slower)

### Cleanup

Recorded `.webm` files accumulate in `demos/output/recordings/`. Delete after converting:

```bash
rm -rf demos/output/recordings/*
```

The `demos/output/` directory is gitignored.
