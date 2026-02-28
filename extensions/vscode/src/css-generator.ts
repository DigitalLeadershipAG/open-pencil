import { colorToHex, colorToRgba255 } from '@/engine/color'
import type { SceneNode, Fill, Stroke, Effect } from '@/engine/scene-graph'
import type { Color } from '@/types'

function formatColor(color: Color, alpha?: number): string {
  const a = alpha ?? color.a
  if (a >= 1) return colorToHex(color)
  const { r, g, b } = colorToRgba255(color)
  return `rgba(${r}, ${g}, ${b}, ${a})`
}

function generateBackground(fills: Fill[]): string[] {
  const visible = fills.filter((f) => f.visible && f.opacity > 0)
  if (visible.length === 0) return []

  const lines: string[] = []
  if (visible.length > 1) {
    lines.push(`/* ${visible.length} fills — showing first */`)
  }

  const fill = visible[0]

  if (fill.type === 'SOLID') {
    lines.push(`background: ${formatColor(fill.color, fill.opacity)};`)
    return lines
  }

  if (fill.type === 'GRADIENT_LINEAR' && fill.gradientStops) {
    const stops = fill.gradientStops
      .map((s) => `${formatColor(s.color)} ${Math.round(s.position * 100)}%`)
      .join(', ')
    lines.push(`background: linear-gradient(${stops});`)
    return lines
  }

  if (fill.type === 'GRADIENT_RADIAL') {
    lines.push('/* radial gradient fill — not yet supported */')
    return lines
  }

  if (fill.type === 'GRADIENT_ANGULAR' || fill.type === 'GRADIENT_DIAMOND') {
    lines.push(`/* ${fill.type.toLowerCase().replace('_', ' ')} fill — not yet supported */`)
    return lines
  }

  if (fill.type === 'IMAGE') {
    lines.push('/* image fill */')
    return lines
  }

  return lines
}

function generateBorderRadius(node: SceneNode): string[] {
  if (node.independentCorners) {
    const { topLeftRadius, topRightRadius, bottomRightRadius, bottomLeftRadius } = node
    if (topLeftRadius === 0 && topRightRadius === 0 && bottomRightRadius === 0 && bottomLeftRadius === 0) {
      return []
    }
    return [
      `border-radius: ${topLeftRadius}px ${topRightRadius}px ${bottomRightRadius}px ${bottomLeftRadius}px;`
    ]
  }
  if (node.cornerRadius > 0) {
    return [`border-radius: ${node.cornerRadius}px;`]
  }
  return []
}

function generateBorder(strokes: Stroke[]): string[] {
  const visible = strokes.filter((s) => s.visible && s.opacity > 0)
  if (visible.length === 0) return []

  const stroke = visible[0]
  const lines = [
    `border: ${stroke.weight}px solid ${formatColor(stroke.color, stroke.opacity)};`
  ]
  if (stroke.align === 'INSIDE') {
    lines.push('box-sizing: border-box;')
  }
  return lines
}

function generateBoxShadow(effects: Effect[]): string[] {
  const shadows = effects.filter((e) => e.visible && e.type === 'DROP_SHADOW')
  if (shadows.length === 0) return []

  const value = shadows
    .map((s) => {
      const color = formatColor(s.color)
      const parts = [
        `${s.offset.x}px`,
        `${s.offset.y}px`,
        `${s.radius}px`
      ]
      if (s.spread !== 0) parts.push(`${s.spread}px`)
      parts.push(color)
      return parts.join(' ')
    })
    .join(', ')

  return [`box-shadow: ${value};`]
}

function generateText(node: SceneNode): string[] {
  if (node.type !== 'TEXT') return []

  const lines: string[] = []
  if (node.fontFamily) lines.push(`font-family: '${node.fontFamily}';`)
  if (node.fontSize) lines.push(`font-size: ${node.fontSize}px;`)
  if (node.fontWeight !== 400) lines.push(`font-weight: ${node.fontWeight};`)
  if (node.lineHeight !== null) lines.push(`line-height: ${node.lineHeight}px;`)
  if (node.letterSpacing !== 0) lines.push(`letter-spacing: ${node.letterSpacing}px;`)

  const alignMap: Record<string, string> = {
    LEFT: 'left',
    CENTER: 'center',
    RIGHT: 'right',
    JUSTIFIED: 'justify'
  }
  if (node.textAlignHorizontal !== 'LEFT') {
    lines.push(`text-align: ${alignMap[node.textAlignHorizontal] ?? 'left'};`)
  }

  return lines
}

function generateFlexbox(node: SceneNode): string[] {
  if (node.layoutMode === 'NONE') return []

  const lines: string[] = ['display: flex;']
  lines.push(`flex-direction: ${node.layoutMode === 'HORIZONTAL' ? 'row' : 'column'};`)

  if (node.itemSpacing > 0 || node.counterAxisSpacing > 0) {
    if (node.counterAxisSpacing > 0 && node.itemSpacing !== node.counterAxisSpacing) {
      const rowGap = node.layoutMode === 'HORIZONTAL' ? node.counterAxisSpacing : node.itemSpacing
      const colGap = node.layoutMode === 'HORIZONTAL' ? node.itemSpacing : node.counterAxisSpacing
      lines.push(`gap: ${rowGap}px ${colGap}px;`)
    } else {
      lines.push(`gap: ${node.itemSpacing}px;`)
    }
  }

  const justifyMap: Record<string, string> = {
    MIN: 'flex-start',
    CENTER: 'center',
    MAX: 'flex-end',
    SPACE_BETWEEN: 'space-between'
  }
  if (node.primaryAxisAlign !== 'MIN') {
    lines.push(`justify-content: ${justifyMap[node.primaryAxisAlign] ?? 'flex-start'};`)
  }

  const alignMap: Record<string, string> = {
    MIN: 'flex-start',
    CENTER: 'center',
    MAX: 'flex-end',
    STRETCH: 'stretch',
    BASELINE: 'baseline'
  }
  if (node.counterAxisAlign !== 'MIN') {
    lines.push(`align-items: ${alignMap[node.counterAxisAlign] ?? 'flex-start'};`)
  }

  const { paddingTop, paddingRight, paddingBottom, paddingLeft } = node
  if (paddingTop > 0 || paddingRight > 0 || paddingBottom > 0 || paddingLeft > 0) {
    if (
      paddingTop === paddingRight &&
      paddingRight === paddingBottom &&
      paddingBottom === paddingLeft
    ) {
      lines.push(`padding: ${paddingTop}px;`)
    } else {
      lines.push(
        `padding: ${paddingTop}px ${paddingRight}px ${paddingBottom}px ${paddingLeft}px;`
      )
    }
  }

  return lines
}

export function generateCSS(node: SceneNode): string {
  const lines: string[] = []

  lines.push(`width: ${Math.round(node.width)}px;`)
  lines.push(`height: ${Math.round(node.height)}px;`)

  lines.push(...generateBackground(node.fills))
  lines.push(...generateBorderRadius(node))
  lines.push(...generateBorder(node.strokes))
  lines.push(...generateBoxShadow(node.effects))

  if (node.opacity < 1) {
    lines.push(`opacity: ${node.opacity};`)
  }

  lines.push(...generateText(node))
  lines.push(...generateFlexbox(node))

  return lines.join('\n')
}
