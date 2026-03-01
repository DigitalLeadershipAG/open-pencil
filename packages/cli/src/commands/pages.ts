import { defineCommand } from 'citty'

import { loadDocument } from '../headless'
import { bold, entity, formatType, dim } from '../format'

export default defineCommand({
  meta: { description: 'List pages in a .fig file' },
  args: {
    file: { type: 'positional', description: '.fig file path', required: true },
    json: { type: 'boolean', description: 'Output as JSON' }
  },
  async run({ args }) {
    const graph = await loadDocument(args.file)
    const pages = graph.getPages()

    if (args.json) {
      console.log(
        JSON.stringify(
          pages.map((p) => {
            let count = 0
            const walk = (id: string) => {
              count++
              const n = graph.getNode(id)
              if (n) for (const cid of n.childIds) walk(cid)
            }
            for (const cid of p.childIds) walk(cid)
            return { id: p.id, name: p.name, nodes: count }
          }),
          null,
          2
        )
      )
      return
    }

    console.log('')
    console.log(bold(`  ${pages.length} page${pages.length !== 1 ? 's' : ''}`))
    console.log('')

    for (const page of pages) {
      let count = 0
      const walk = (id: string) => {
        count++
        const n = graph.getNode(id)
        if (n) for (const cid of n.childIds) walk(cid)
      }
      for (const cid of page.childIds) walk(cid)

      console.log(`  ${entity(formatType(page.type), page.name, page.id)} ${dim(`${count} nodes`)}`)
    }
    console.log('')
  }
})
