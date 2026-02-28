import CanvasKitInit from 'canvaskit-wasm'
import type {
  CanvasKit,
  Surface,
  Canvas,
  Paint,
  Font,
  Typeface,
  TypefaceFontProvider
} from 'canvaskit-wasm'
import type { SerializedNode, ExtensionMessage, WebviewMessage } from '../src/protocol'

declare const acquireVsCodeApi: () => {
  postMessage(message: WebviewMessage): void
  getState(): unknown
  setState(state: unknown): void
}

declare global {
  interface Window {
    __CANVASKIT_WASM_URI__: string
    __FONT_URI__: string
  }
}

const vscode = acquireVsCodeApi()

interface Viewport {
  offsetX: number
  offsetY: number
  scale: number
}

const SELECTION_COLOR = [59, 130, 246, 255] as const
const SELECTION_STROKE_WIDTH = 2

let ck: CanvasKit | null = null
let surface: Surface | null = null
let defaultTypeface: Typeface | null = null
let fontProvider: TypefaceFontProvider | null = null
let fontData: ArrayBuffer | null = null

let nodes: SerializedNode[] = []
let nodeMap = new Map<string, SerializedNode>()
let selectedNodeId: string | null = null
let viewport: Viewport = { offsetX: 0, offsetY: 0, scale: 1 }
let isDarkTheme = true

type SkImage = ReturnType<NonNullable<typeof ck>['MakeImageFromEncoded']>
const imageCache = new Map<string, SkImage>()

const MAX_FONT_CACHE = 32
const fontCache = new Map<number, Font>()

function clearFontCache(): void {
  for (const font of fontCache.values()) {
    font.delete()
  }
  fontCache.clear()
}

function getCachedFont(fontSize: number): Font | null {
  if (!ck) return null
  const existing = fontCache.get(fontSize)
  if (existing) {
    fontCache.delete(fontSize)
    fontCache.set(fontSize, existing)
    return existing
  }

  if (fontCache.size >= MAX_FONT_CACHE) {
    const oldest = fontCache.keys().next().value
    if (oldest !== undefined) {
      fontCache.get(oldest)?.delete()
      fontCache.delete(oldest)
    }
  }

  const font = new ck.Font(defaultTypeface, fontSize)
  fontCache.set(fontSize, font)
  return font
}

let renderPending = false

function scheduleRender(): void {
  if (renderPending) return
  renderPending = true
  requestAnimationFrame(() => {
    renderPending = false
    render()
  })
}

let isPanning = false
let panStartX = 0
let panStartY = 0
let panStartOffsetX = 0
let panStartOffsetY = 0
let spaceHeld = false
let initialized = false

function rebuildNodeMap(): void {
  nodeMap = new Map<string, SerializedNode>()
  for (const n of nodes) nodeMap.set(n.id, n)
}

function loadImages(images: Record<string, number[]>): void {
  for (const img of imageCache.values()) {
    img?.delete()
  }
  imageCache.clear()

  if (!ck) return

  for (const [hash, data] of Object.entries(images)) {
    const bytes = new Uint8Array(data)
    const img = ck.MakeImageFromEncoded(bytes)
    if (img) {
      imageCache.set(hash, img)
    }
  }
}

function setStatus(text: string): void {
  const el = document.getElementById('status')
  if (el) {
    el.textContent = text
    el.style.display = 'flex'
  }
}

function hideStatus(): void {
  const el = document.getElementById('status')
  if (el) el.style.display = 'none'
}

function postError(message: string): void {
  setStatus(`Error: ${message}`)
  vscode.postMessage({ type: 'error', message })
}

function waitForCanvasSize(canvas: HTMLCanvasElement, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    if (canvas.clientWidth > 0 && canvas.clientHeight > 0) {
      resolve()
      return
    }

    const timeout = setTimeout(() => {
      observer.disconnect()
      reject(new Error(`Canvas has zero size after ${timeoutMs}ms`))
    }, timeoutMs)

    const observer = new ResizeObserver(() => {
      if (canvas.clientWidth > 0 && canvas.clientHeight > 0) {
        observer.disconnect()
        clearTimeout(timeout)
        resolve()
      }
    })
    observer.observe(canvas)
  })
}

async function init(): Promise<void> {
  if (initialized) return
  initialized = true

  const wasmUri = window.__CANVASKIT_WASM_URI__
  if (!wasmUri) {
    postError('CanvasKit WASM URI not provided')
    return
  }

  setStatus('Loading CanvasKit…')

  try {
    ck = await CanvasKitInit({
      locateFile: (file: string) => file === 'canvaskit.wasm' ? wasmUri : file
    })
  } catch (e) {
    postError(`CanvasKit init failed: ${e}`)
    return
  }

  setStatus('Creating surface…')

  const canvas = document.getElementById('canvas') as HTMLCanvasElement
  if (!canvas) {
    postError('Canvas element not found')
    return
  }

  canvas.style.display = 'block'

  try {
    await waitForCanvasSize(canvas, 5000)
  } catch (e) {
    postError(e instanceof Error ? e.message : String(e))
    return
  }

  resizeCanvas(canvas)
  const createdSurface = ck.MakeWebGLCanvasSurface(canvas)
  if (!createdSurface) {
    postError('WebGL2 not available or surface creation failed')
    return
  }
  surface = createdSurface

  const fontUri = window.__FONT_URI__
  if (fontUri) {
    try {
      setStatus('Loading font…')
      const fontResponse = await fetch(fontUri)
      fontData = await fontResponse.arrayBuffer()
      defaultTypeface = ck.Typeface.MakeTypefaceFromData(fontData)
      fontProvider = ck.TypefaceFontProvider.Make()
      fontProvider.registerFont(fontData, 'Inter')
    } catch {
      // Fall through — text renders with CanvasKit built-in font
    }
  }

  setupEventListeners(canvas)
  hideStatus()

  vscode.postMessage({ type: 'ready' })

  scheduleRender()
}

function resizeCanvas(canvas: HTMLCanvasElement): void {
  const dpr = window.devicePixelRatio || 1
  canvas.width = Math.floor(canvas.clientWidth * dpr)
  canvas.height = Math.floor(canvas.clientHeight * dpr)
}

function getRootNodes(): SerializedNode[] {
  return nodes.filter((n) => !n.parentId || !nodeMap.has(n.parentId))
}

function fitViewportToContent(canvasWidth: number, canvasHeight: number): void {
  const roots = getRootNodes()
  if (roots.length === 0) return

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const node of roots) {
    minX = Math.min(minX, node.x)
    minY = Math.min(minY, node.y)
    maxX = Math.max(maxX, node.x + node.width)
    maxY = Math.max(maxY, node.y + node.height)
  }

  const contentW = maxX - minX
  const contentH = maxY - minY
  if (contentW <= 0 || contentH <= 0) return

  const padding = 40
  const scaleX = (canvasWidth - padding * 2) / contentW
  const scaleY = (canvasHeight - padding * 2) / contentH
  const scale = Math.min(scaleX, scaleY, 1)

  viewport.scale = scale
  viewport.offsetX = (canvasWidth - contentW * scale) / 2 - minX * scale
  viewport.offsetY = (canvasHeight - contentH * scale) / 2 - minY * scale
}

function render(): void {
  if (!surface || !ck) return

  const canvas = surface.getCanvas()
  const bgColor = isDarkTheme
    ? ck.Color4f(0.12, 0.12, 0.12, 1)
    : ck.Color4f(0.96, 0.96, 0.96, 1)
  canvas.clear(bgColor)

  canvas.save()
  const dpr = window.devicePixelRatio || 1
  canvas.scale(dpr, dpr)
  canvas.translate(viewport.offsetX, viewport.offsetY)
  canvas.scale(viewport.scale, viewport.scale)

  const rootNodes = getRootNodes()

  for (const node of rootNodes) {
    renderNode(canvas, node, nodeMap, 0, 0)
  }

  if (selectedNodeId) {
    renderSelectionBorder(canvas, selectedNodeId, nodeMap)
  }

  canvas.restore()
  surface.flush()
}

function renderNode(
  canvas: Canvas,
  node: SerializedNode,
  nodeMap: Map<string, SerializedNode>,
  parentX: number,
  parentY: number
): void {
  if (!node.visible || !ck) return

  const x = parentX + node.x
  const y = parentY + node.y
  const w = node.width
  const h = node.height

  canvas.save()

  if (node.opacity < 1) {
    const layerPaint = new ck.Paint()
    layerPaint.setAlphaf(node.opacity)
    canvas.saveLayer(layerPaint, ck.XYWHRect(x, y, w, h))
    layerPaint.delete()
  }

  if (node.clipsContent) {
    const clipRect = ck.XYWHRect(x, y, w, h)
    canvas.clipRect(clipRect, ck.ClipOp.Intersect, true)
  }

  if (node.type !== 'TEXT') {
    for (const fill of node.fills) {
      if (!fill.visible || fill.opacity <= 0) continue
      renderFill(canvas, fill, x, y, w, h, node)
    }
  }

  for (const stroke of node.strokes) {
    if (!stroke.visible || stroke.opacity <= 0) continue
    renderStroke(canvas, stroke, x, y, w, h, node)
  }

  if (node.type === 'TEXT' && node.text) {
    renderText(canvas, node, x, y)
  }

  for (const childId of node.childIds) {
    const child = nodeMap.get(childId)
    if (child) {
      renderNode(canvas, child, nodeMap, x, y)
    }
  }

  if (node.opacity < 1) {
    canvas.restore()
  }
  canvas.restore()
}

function hasRoundedCorners(node: SerializedNode): boolean {
  if (node.independentCorners) {
    return (
      node.topLeftRadius > 0 ||
      node.topRightRadius > 0 ||
      node.bottomRightRadius > 0 ||
      node.bottomLeftRadius > 0
    )
  }
  return node.cornerRadius > 0
}

function renderFill(
  canvas: Canvas,
  fill: SerializedNode['fills'][0],
  x: number, y: number, w: number, h: number,
  node: SerializedNode
): void {
  if (!ck) return
  const paint = new ck.Paint()
  paint.setAntiAlias(true)
  paint.setStyle(ck.PaintStyle.Fill)

  if (fill.type === 'SOLID') {
    paint.setColor(ck.Color4f(fill.color.r, fill.color.g, fill.color.b, fill.opacity))
  } else if (fill.type === 'GRADIENT_LINEAR' && fill.gradientStops) {
    const colors = fill.gradientStops.map((s) =>
      ck.Color4f(s.color.r, s.color.g, s.color.b, s.color.a * fill.opacity)
    )
    const positions = fill.gradientStops.map((s) => s.position)
    // Simplified: actual Figma gradients have arbitrary handle positions defining the angle.
    // v1 renders all linear gradients as top-left → bottom-right diagonal.
    const shader = ck.Shader.MakeLinearGradient(
      [x, y],
      [x + w, y + h],
      colors,
      positions,
      ck.TileMode.Clamp
    )
    if (shader) {
      paint.setShader(shader)
      shader.delete()
    }
  } else if (fill.type === 'GRADIENT_RADIAL' || fill.type === 'GRADIENT_ANGULAR' || fill.type === 'GRADIENT_DIAMOND') {
    if (fill.gradientStops?.length) {
      const c = fill.gradientStops[0].color
      paint.setColor(ck.Color4f(c.r, c.g, c.b, c.a * fill.opacity))
    } else {
      paint.delete()
      return
    }
  } else if (fill.type === 'IMAGE' && fill.imageHash) {
    const img = imageCache.get(fill.imageHash)
    if (img) {
      paint.setAlphaf(fill.opacity)
      if (hasRoundedCorners(node)) {
        canvas.save()
        if (node.independentCorners) {
          const radii = [
            node.topLeftRadius, node.topLeftRadius,
            node.topRightRadius, node.topRightRadius,
            node.bottomRightRadius, node.bottomRightRadius,
            node.bottomLeftRadius, node.bottomLeftRadius
          ]
          canvas.clipRRect(new Float32Array([x, y, x + w, y + h, ...radii]),
            ck.ClipOp.Intersect, true)
        } else {
          canvas.clipRRect(
            ck.RRectXY(ck.XYWHRect(x, y, w, h), node.cornerRadius, node.cornerRadius),
            ck.ClipOp.Intersect, true)
        }
        canvas.drawImageRect(img, ck.XYWHRect(0, 0, img.width(), img.height()),
          ck.XYWHRect(x, y, w, h), paint)
        canvas.restore()
      } else {
        canvas.drawImageRect(img, ck.XYWHRect(0, 0, img.width(), img.height()),
          ck.XYWHRect(x, y, w, h), paint)
      }
      paint.delete()
      return
    }
    paint.delete()
    return
  } else {
    paint.delete()
    return
  }

  if (hasRoundedCorners(node)) {
    if (node.independentCorners) {
      const radii = [
        node.topLeftRadius, node.topLeftRadius,
        node.topRightRadius, node.topRightRadius,
        node.bottomRightRadius, node.bottomRightRadius,
        node.bottomLeftRadius, node.bottomLeftRadius
      ]
      const rrect = new Float32Array([
        x, y, x + w, y + h,
        ...radii
      ])
      canvas.drawRRect(rrect, paint)
    } else {
      canvas.drawRRect(ck.RRectXY(ck.XYWHRect(x, y, w, h), node.cornerRadius, node.cornerRadius), paint)
    }
  } else {
    canvas.drawRect(ck.XYWHRect(x, y, w, h), paint)
  }

  paint.delete()
}

function renderStroke(
  canvas: Canvas,
  stroke: SerializedNode['strokes'][0],
  x: number, y: number, w: number, h: number,
  node: SerializedNode
): void {
  if (!ck) return
  const paint = new ck.Paint()
  paint.setAntiAlias(true)
  paint.setStyle(ck.PaintStyle.Stroke)
  paint.setStrokeWidth(stroke.weight)
  paint.setColor(ck.Color4f(stroke.color.r, stroke.color.g, stroke.color.b, stroke.opacity))

  let sx = x
  let sy = y
  let sw = w
  let sh = h

  if (stroke.align === 'INSIDE') {
    sx += stroke.weight / 2
    sy += stroke.weight / 2
    sw -= stroke.weight
    sh -= stroke.weight
  } else if (stroke.align === 'OUTSIDE') {
    sx -= stroke.weight / 2
    sy -= stroke.weight / 2
    sw += stroke.weight
    sh += stroke.weight
  }

  if (hasRoundedCorners(node)) {
    if (node.independentCorners) {
      const radii = [
        node.topLeftRadius, node.topLeftRadius,
        node.topRightRadius, node.topRightRadius,
        node.bottomRightRadius, node.bottomRightRadius,
        node.bottomLeftRadius, node.bottomLeftRadius
      ]
      const rrect = new Float32Array([
        sx, sy, sx + sw, sy + sh,
        ...radii
      ])
      canvas.drawRRect(rrect, paint)
    } else {
      canvas.drawRRect(
        ck.RRectXY(ck.XYWHRect(sx, sy, sw, sh), node.cornerRadius, node.cornerRadius),
        paint
      )
    }
  } else {
    canvas.drawRect(ck.XYWHRect(sx, sy, sw, sh), paint)
  }

  paint.delete()
}

function getTextAlign(align: string) {
  if (!ck) return undefined
  switch (align) {
    case 'CENTER': return ck.TextAlign.Center
    case 'RIGHT': return ck.TextAlign.Right
    case 'JUSTIFIED': return ck.TextAlign.Justify
    default: return ck.TextAlign.Left
  }
}

function renderText(
  canvas: Canvas,
  node: SerializedNode,
  x: number,
  y: number
): void {
  if (!node.text || !ck) return

  const textFill = node.fills.find((f) => f.visible && f.type === 'SOLID')
  const color = textFill
    ? ck.Color4f(textFill.color.r, textFill.color.g, textFill.color.b, textFill.opacity)
    : ck.Color4f(0, 0, 0, 1)

  if (fontProvider && fontData) {
    const fp = ck.TypefaceFontProvider.Make()
    fp.registerFont(fontData, 'Inter')

    const paraStyle = new ck.ParagraphStyle({
      textAlign: getTextAlign(node.textAlignHorizontal),
      textStyle: {
        color,
        fontSize: node.fontSize,
        fontFamilies: ['Inter'],
        letterSpacing: node.letterSpacing,
        heightMultiplier: node.lineHeight ? node.lineHeight / node.fontSize : undefined
      }
    })

    const builder = ck.ParagraphBuilder.MakeFromFontProvider(paraStyle, fp)
    builder.addText(node.text)
    const paragraph = builder.build()
    paragraph.layout(node.width)
    canvas.drawParagraph(paragraph, x, y)
    paragraph.delete()
    builder.delete()
    fp.delete()
  } else {
    const textFont = getCachedFont(node.fontSize)
    if (!textFont) return
    const paint = new ck.Paint()
    paint.setAntiAlias(true)
    paint.setStyle(ck.PaintStyle.Fill)
    paint.setColor(color)
    canvas.drawText(node.text, x, y + node.fontSize, paint, textFont)
    paint.delete()
  }
}

function renderSelectionBorder(
  canvas: Canvas,
  nodeId: string,
  nodeMap: Map<string, SerializedNode>
): void {
  if (!ck) return
  const node = nodeMap.get(nodeId)
  if (!node) return

  const pos = getAbsolutePosition(nodeId, nodeMap)

  const paint = new ck.Paint()
  paint.setAntiAlias(true)
  paint.setStyle(ck.PaintStyle.Stroke)
  paint.setStrokeWidth(SELECTION_STROKE_WIDTH / viewport.scale)
  paint.setColor(ck.Color(
    SELECTION_COLOR[0], SELECTION_COLOR[1], SELECTION_COLOR[2], SELECTION_COLOR[3]
  ))

  canvas.drawRect(ck.XYWHRect(pos.x, pos.y, node.width, node.height), paint)
  paint.delete()
}

function getAbsolutePosition(
  nodeId: string,
  nodeMap: Map<string, SerializedNode>
): { x: number; y: number } {
  let x = 0
  let y = 0
  let current = nodeMap.get(nodeId)
  while (current) {
    x += current.x
    y += current.y
    if (!current.parentId) break
    const parent = nodeMap.get(current.parentId)
    if (!parent || parent.type === 'CANVAS') break
    current = parent
  }
  return { x, y }
}

function hitTest(
  mx: number,
  my: number,
  nodeMap: Map<string, SerializedNode>
): string | null {
  const worldX = (mx - viewport.offsetX) / viewport.scale
  const worldY = (my - viewport.offsetY) / viewport.scale

  return hitTestChildren(worldX, worldY, getRootNodes(), nodeMap, 0, 0)
}

function hitTestChildren(
  px: number,
  py: number,
  children: SerializedNode[],
  nodeMap: Map<string, SerializedNode>,
  offsetX: number,
  offsetY: number
): string | null {
  for (let i = children.length - 1; i >= 0; i--) {
    const child = children[i]
    if (!child.visible) continue

    const ax = offsetX + child.x
    const ay = offsetY + child.y

    const childNodes = child.childIds
      .map((id) => nodeMap.get(id))
      .filter((n): n is SerializedNode => n !== undefined)

    if (childNodes.length > 0) {
      const deepHit = hitTestChildren(px, py, childNodes, nodeMap, ax, ay)
      if (deepHit) return deepHit
    }

    if (px >= ax && px <= ax + child.width && py >= ay && py <= ay + child.height) {
      return child.id
    }
  }
  return null
}

function setupEventListeners(canvas: HTMLCanvasElement): void {
  canvas.addEventListener('pointerdown', (e) => {
    if (e.button === 1 || (e.button === 0 && spaceHeld)) {
      isPanning = true
      panStartX = e.clientX
      panStartY = e.clientY
      panStartOffsetX = viewport.offsetX
      panStartOffsetY = viewport.offsetY
      canvas.setPointerCapture(e.pointerId)
      e.preventDefault()
      return
    }

    if (e.button === 0) {
      const rect = canvas.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      const hitId = hitTest(mx, my, nodeMap)

      selectedNodeId = hitId
      if (hitId) {
        vscode.postMessage({ type: 'node-clicked', nodeId: hitId })
      }
      scheduleRender()
    }
  })

  canvas.addEventListener('pointermove', (e) => {
    if (!isPanning) return
    viewport.offsetX = panStartOffsetX + (e.clientX - panStartX)
    viewport.offsetY = panStartOffsetY + (e.clientY - panStartY)
    scheduleRender()
  })

  canvas.addEventListener('pointerup', (e) => {
    if (isPanning) {
      isPanning = false
      canvas.releasePointerCapture(e.pointerId)
    }
  })

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault()
    const rect = canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top

    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1
    const newScale = viewport.scale * zoomFactor

    viewport.offsetX = mx - (mx - viewport.offsetX) * (newScale / viewport.scale)
    viewport.offsetY = my - (my - viewport.offsetY) * (newScale / viewport.scale)
    viewport.scale = newScale

    scheduleRender()
  }, { passive: false })

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') spaceHeld = true
  })
  window.addEventListener('keyup', (e) => {
    if (e.code === 'Space') spaceHeld = false
  })

  const resizeObserver = new ResizeObserver(() => {
    requestAnimationFrame(() => {
      if (canvas.clientWidth === 0 || canvas.clientHeight === 0) return
      resizeCanvas(canvas)
      if (surface && ck) {
        surface.delete()
        const newSurface = ck.MakeWebGLCanvasSurface(canvas)
        if (newSurface) {
          surface = newSurface
          render()
        } else {
          postError('Failed to recreate WebGL surface after resize')
        }
      }
    })
  })
  resizeObserver.observe(canvas)

  const themeMutationObserver = new MutationObserver(() => {
    const bg = getComputedStyle(document.body).getPropertyValue('--vscode-editor-background')
    if (bg) {
      isDarkTheme = isColorDark(bg)
      scheduleRender()
    }
  })
  themeMutationObserver.observe(document.body, {
    attributes: true,
    attributeFilter: ['class']
  })
}

function isColorDark(cssColor: string): boolean {
  const trimmed = cssColor.trim()

  const hex6 = trimmed.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i)
  if (hex6) {
    const r = parseInt(hex6[1], 16)
    const g = parseInt(hex6[2], 16)
    const b = parseInt(hex6[3], 16)
    return (r * 299 + g * 587 + b * 114) / 1000 < 128
  }

  const hex3 = trimmed.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i)
  if (hex3) {
    const r = parseInt(hex3[1] + hex3[1], 16)
    const g = parseInt(hex3[2] + hex3[2], 16)
    const b = parseInt(hex3[3] + hex3[3], 16)
    return (r * 299 + g * 587 + b * 114) / 1000 < 128
  }

  const rgbMatch = trimmed.match(/\d+/g)
  if (rgbMatch && rgbMatch.length >= 3) {
    const [r, g, b] = rgbMatch.map(Number)
    return (r * 299 + g * 587 + b * 114) / 1000 < 128
  }

  return true
}

window.addEventListener('message', (event) => {
  const msg = event.data as ExtensionMessage

  switch (msg.type) {
    case 'render-page': {
      nodes = msg.nodes
      rebuildNodeMap()
      loadImages(msg.images)
      selectedNodeId = null
      viewport = { offsetX: 0, offsetY: 0, scale: 1 }
      const canvasEl = document.getElementById('canvas') as HTMLCanvasElement | null
      if (canvasEl) {
        fitViewportToContent(canvasEl.clientWidth, canvasEl.clientHeight)
      }
      scheduleRender()
      break
    }

    case 'select-node':
      selectedNodeId = msg.nodeId
      scheduleRender()
      break

    case 'clear':
      nodes = []
      rebuildNodeMap()
      selectedNodeId = null
      scheduleRender()
      break

    case 'set-theme':
      isDarkTheme = msg.theme === 'dark'
      scheduleRender()
      break
  }
})

init().catch((e) => postError(`Unexpected error: ${e}`))
