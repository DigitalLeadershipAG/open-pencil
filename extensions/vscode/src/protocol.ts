import type { SceneNode } from '@/engine/scene-graph'
import type { SceneGraph } from '@/engine/scene-graph'

export interface SerializedNode {
  id: string
  type: string
  name: string
  parentId: string | null
  childIds: string[]
  x: number
  y: number
  width: number
  height: number
  rotation: number
  fills: SceneNode['fills']
  strokes: SceneNode['strokes']
  effects: SceneNode['effects']
  opacity: number
  cornerRadius: number
  topLeftRadius: number
  topRightRadius: number
  bottomRightRadius: number
  bottomLeftRadius: number
  independentCorners: boolean
  visible: boolean
  clipsContent: boolean
  blendMode: string
  text: string
  fontSize: number
  fontFamily: string
  fontWeight: number
  textAlignHorizontal: string
  textAlignVertical: string
  lineHeight: number | null
  letterSpacing: number
  layoutMode: string
  primaryAxisAlign: string
  counterAxisAlign: string
  itemSpacing: number
  counterAxisSpacing: number
  paddingTop: number
  paddingRight: number
  paddingBottom: number
  paddingLeft: number
}

export type ExtensionMessage =
  | { type: 'render-page'; pageId: string; nodes: SerializedNode[]; images: Record<string, number[]> }
  | { type: 'select-node'; nodeId: string }
  | { type: 'clear' }
  | { type: 'set-theme'; theme: 'light' | 'dark' }

export type WebviewMessage =
  | { type: 'ready' }
  | { type: 'node-clicked'; nodeId: string }
  | { type: 'error'; message: string }

const MAX_NODES_PER_PAGE = 5000

export function serializeNode(node: SceneNode): SerializedNode {
  return {
    id: node.id,
    type: node.type,
    name: node.name,
    parentId: node.parentId,
    childIds: [...node.childIds],
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
    rotation: node.rotation,
    fills: node.fills,
    strokes: node.strokes,
    effects: node.effects,
    opacity: node.opacity,
    cornerRadius: node.cornerRadius,
    topLeftRadius: node.topLeftRadius,
    topRightRadius: node.topRightRadius,
    bottomRightRadius: node.bottomRightRadius,
    bottomLeftRadius: node.bottomLeftRadius,
    independentCorners: node.independentCorners,
    visible: node.visible,
    clipsContent: node.clipsContent,
    blendMode: node.blendMode,
    text: node.text,
    fontSize: node.fontSize,
    fontFamily: node.fontFamily,
    fontWeight: node.fontWeight,
    textAlignHorizontal: node.textAlignHorizontal,
    textAlignVertical: node.textAlignVertical,
    lineHeight: node.lineHeight,
    letterSpacing: node.letterSpacing,
    layoutMode: node.layoutMode,
    primaryAxisAlign: node.primaryAxisAlign,
    counterAxisAlign: node.counterAxisAlign,
    itemSpacing: node.itemSpacing,
    counterAxisSpacing: node.counterAxisSpacing,
    paddingTop: node.paddingTop,
    paddingRight: node.paddingRight,
    paddingBottom: node.paddingBottom,
    paddingLeft: node.paddingLeft
  }
}

function collectNodes(graph: SceneGraph, parentId: string, out: SceneNode[]): void {
  const children = graph.getChildren(parentId)
  for (const child of children) {
    out.push(child)
    if (child.childIds.length > 0) {
      collectNodes(graph, child.id, out)
    }
  }
}

function collectImageHashes(nodes: SceneNode[]): Set<string> {
  const hashes = new Set<string>()
  for (const node of nodes) {
    for (const fill of node.fills) {
      if (fill.type === 'IMAGE' && fill.imageHash) {
        hashes.add(fill.imageHash)
      }
    }
  }
  return hashes
}

function serializeImages(graph: SceneGraph, hashes: Set<string>): Record<string, number[]> {
  const result: Record<string, number[]> = {}
  for (const hash of hashes) {
    const data = graph.images.get(hash)
    if (data) {
      result[hash] = Array.from(data)
    }
  }
  return result
}

export function serializePage(
  graph: SceneGraph,
  pageId: string
): { nodes: SerializedNode[]; images: Record<string, number[]>; truncated: boolean } {
  const allNodes: SceneNode[] = []
  collectNodes(graph, pageId, allNodes)

  const truncated = allNodes.length > MAX_NODES_PER_PAGE
  const subset = truncated ? allNodes.slice(0, MAX_NODES_PER_PAGE) : allNodes
  const imageHashes = collectImageHashes(subset)
  const images = serializeImages(graph, imageHashes)

  if (!truncated) {
    return { nodes: subset.map(serializeNode), images, truncated: false }
  }

  const includedIds = new Set(subset.map((n) => n.id))
  const serialized = subset.map((node) => {
    const s = serializeNode(node)
    s.childIds = s.childIds.filter((id) => includedIds.has(id))
    return s
  })

  return { nodes: serialized, images, truncated: true }
}
