import { defineCommand } from 'citty'

import { loadDocument } from '../headless'
import { bold, dim, kv, entity, formatType, nodeDetails, printError } from '../format'
import type { SceneNode, SceneGraph } from '@open-pencil/core'

function formatNodeFull(graph: SceneGraph, node: SceneNode): string {
  const lines: string[] = []

  lines.push(`  ${entity(formatType(node.type), node.name, node.id)}`)
  lines.push('')

  const parent = node.parentId ? graph.getNode(node.parentId) : undefined
  if (parent) {
    lines.push(kv('Parent', `${parent.name} ${dim(`(${parent.id})`)}`))
  }

  lines.push(kv('Position', `${Math.round(node.x)}, ${Math.round(node.y)}`))
  lines.push(kv('Size', `${Math.round(node.width)} × ${Math.round(node.height)}`))

  const details = nodeDetails(node)
  for (const [key, value] of Object.entries(details)) {
    lines.push(kv(key.charAt(0).toUpperCase() + key.slice(1), String(value)))
  }

  if (node.text) {
    const preview = node.text.length > 80 ? node.text.slice(0, 80) + '…' : node.text
    lines.push(kv('Text', `"${preview}"`))
  }

  if (node.childIds.length > 0) {
    lines.push(kv('Children', `${node.childIds.length}`))

    const children = node.childIds
      .map((id) => graph.getNode(id))
      .filter((n): n is SceneNode => n !== undefined)
      .slice(0, 10)

    for (const child of children) {
      lines.push(`    ${dim(formatType(child.type))} ${child.name} ${dim(`(${child.id})`)}`)
    }
    if (node.childIds.length > 10) {
      lines.push(`    ${dim(`… and ${node.childIds.length - 10} more`)}`)
    }
  }

  if (Object.keys(node.boundVariables).length > 0) {
    lines.push('')
    lines.push(bold('  Bound variables'))
    for (const [field, varId] of Object.entries(node.boundVariables)) {
      const variable = graph.variables.get(varId)
      lines.push(`    ${field} → ${variable?.name ?? varId}`)
    }
  }

  return lines.join('\n')
}

export default defineCommand({
  meta: { description: 'Show detailed node properties by ID' },
  args: {
    file: { type: 'positional', description: '.fig file path', required: true },
    id: { type: 'string', description: 'Node ID', required: true },
    json: { type: 'boolean', description: 'Output as JSON' }
  },
  async run({ args }) {
    const graph = await loadDocument(args.file)
    const node = graph.getNode(args.id)

    if (!node) {
      printError(`Node "${args.id}" not found.`)
      process.exit(1)
    }

    if (args.json) {
      const { childIds, parentId, ...rest } = node
      const children = childIds.length
      const parent = parentId ? graph.getNode(parentId) : undefined
      console.log(
        JSON.stringify(
          {
            ...rest,
            parent: parent ? { id: parent.id, name: parent.name, type: parent.type } : null,
            children
          },
          null,
          2
        )
      )
      return
    }

    console.log('')
    console.log(formatNodeFull(graph, node))
    console.log('')
  }
})
