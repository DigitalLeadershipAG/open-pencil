import { chromium, type Page, type BrowserContext, type Locator } from '@playwright/test'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

import { CanvasHelper } from '../../tests/helpers/canvas'
import {
  ensureCursor,
  moveCursorTo,
  demoClick,
  demoClickXY,
  hideCursor,
  showAnnotation,
  hideAnnotation,
  type DemoClickOptions,
  type AnnotationPosition,
} from './annotations'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUTPUT_DIR = resolve(__dirname, '..', 'output', 'recordings')

const VIEWPORT = { width: 1280, height: 800 }
const SCALE = 2
const BASE_URL = 'http://localhost:1420'

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms))
}

export interface DemoScenario {
  name: string
  run(recorder: DemoRecorder): Promise<void>
}

export class DemoRecorder {
  readonly page: Page
  readonly canvas: CanvasHelper

  constructor(page: Page) {
    this.page = page
    this.canvas = new CanvasHelper(page)
  }

  async init() {
    await this.page.goto(`${BASE_URL}/?test`, { timeout: 60_000, waitUntil: 'domcontentloaded' })
    await this.page.locator('canvas[data-ready="1"]').waitFor({ timeout: 60_000 })
    await ensureCursor(this.page)
    await sleep(500)
  }

  async sleep(ms: number) {
    await sleep(ms)
  }

  async annotate(text: string, position?: AnnotationPosition) {
    await showAnnotation(this.page, text, position)
  }

  async clearAnnotation() {
    await hideAnnotation(this.page)
  }

  async drawRect(x: number, y: number, w: number, h: number) {
    await this.canvas.drawRect(x, y, w, h)
    await sleep(500)
  }

  async drawEllipse(x: number, y: number, w: number, h: number) {
    await this.canvas.drawEllipse(x, y, w, h)
    await sleep(500)
  }

  async selectTool(tool: Parameters<CanvasHelper['selectTool']>[0]) {
    await this.canvas.selectTool(tool)
    await sleep(300)
  }

  async clickCanvas(x: number, y: number, options?: DemoClickOptions) {
    const box = await this.canvas.canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')
    await demoClickXY(this.page, box.x + x, box.y + y, options)
  }

  async clickLocator(locator: Locator, options?: DemoClickOptions) {
    await demoClick(this.page, locator, options)
  }

  async drag(fromX: number, fromY: number, toX: number, toY: number) {
    const box = await this.canvas.canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')
    await moveCursorTo(this.page, box.x + fromX, box.y + fromY)
    await this.canvas.drag(fromX, fromY, toX, toY, 20)
    await sleep(300)
  }

  async pressKey(key: string) {
    await this.canvas.pressKey(key)
    await sleep(200)
  }

  async type(text: string, delay = 60) {
    for (const char of text) {
      await this.page.keyboard.type(char)
      await sleep(delay)
    }
  }

  async smoothZoom(targetZoom: number, durationMs = 600) {
    await this.page.evaluate(
      ({ targetZoom, durationMs }) => {
        return new Promise<void>((resolve) => {
          const store = (window as any).__OPEN_PENCIL_STORE__
          if (!store) { resolve(); return }

          const startZoom = store.state.zoom
          const startPanX = store.state.panX
          const startPanY = store.state.panY
          const centerX = window.innerWidth / 2
          const centerY = window.innerHeight / 2
          const startTime = performance.now()

          function easeInOut(t: number) {
            return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
          }

          function step(now: number) {
            const t = Math.min(1, (now - startTime) / durationMs)
            const eased = easeInOut(t)
            const zoom = startZoom + (targetZoom - startZoom) * eased
            store.state.panX = centerX - (centerX - startPanX) * (zoom / startZoom)
            store.state.panY = centerY - (centerY - startPanY) * (zoom / startZoom)
            store.state.zoom = zoom
            store.requestRepaint()
            if (t < 1) requestAnimationFrame(step)
            else resolve()
          }
          requestAnimationFrame(step)
        })
      },
      { targetZoom, durationMs },
    )
  }

  async zoomIn(factor = 1.5) {
    const current = await this.page.evaluate(
      () => (window as any).__OPEN_PENCIL_STORE__?.state.zoom ?? 1,
    )
    await this.smoothZoom(current * factor)
  }

  async zoomOut(factor = 1.5) {
    const current = await this.page.evaluate(
      () => (window as any).__OPEN_PENCIL_STORE__?.state.zoom ?? 1,
    )
    await this.smoothZoom(current / factor)
  }

  async zoomToFit() {
    await this.page.evaluate(() => {
      const store = (window as any).__OPEN_PENCIL_STORE__
      if (store) store.zoomToFit()
    })
    await sleep(300)
  }

  async finish() {
    await hideCursor(this.page)
    await sleep(500)
  }
}

const IS_MAIN =
  import.meta.url === Bun.pathToFileURL(process.argv[1] ?? '').href ||
  process.argv[1]?.endsWith('record.ts')

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const scenarioName = args.find((a) => !a.startsWith('--'))

  if (!scenarioName) {
    console.error('Usage: bun demos/scripts/record.ts <scenario-name> [--dry-run]')
    console.error('Available scenarios: check demos/scenarios/')
    process.exit(1)
  }

  const scenarioPath = resolve(__dirname, '..', 'scenarios', `${scenarioName}.ts`)
  let scenarioModule: { default: DemoScenario }
  try {
    scenarioModule = await import(scenarioPath)
  } catch {
    console.error(`Scenario not found: ${scenarioPath}`)
    process.exit(1)
  }

  const scenario = scenarioModule.default
  console.log(`${dryRun ? '[DRY RUN] ' : ''}Recording scenario: ${scenario.name}`)

  const browser = await chromium.launch({ headless: false })

  let context: BrowserContext
  if (dryRun) {
    context = await browser.newContext({
      viewport: VIEWPORT,
      deviceScaleFactor: SCALE,
    })
  } else {
    context = await browser.newContext({
      viewport: VIEWPORT,
      deviceScaleFactor: SCALE,
      recordVideo: { dir: OUTPUT_DIR, size: VIEWPORT },
    })
  }

  const page = await context.newPage()
  const recorder = new DemoRecorder(page)

  try {
    await recorder.init()
    await scenario.run(recorder)
    await recorder.finish()
  } catch (err) {
    console.error('Recording failed:', err)
    process.exit(1)
  } finally {
    await context.close()
    await browser.close()
  }

  if (!dryRun) {
    const videoPath = await page.video()?.path()
    console.log(`Recording saved: ${videoPath}`)
    console.log(`Convert: bash demos/scripts/convert.sh ${videoPath}`)
  }
}

if (IS_MAIN) main()
