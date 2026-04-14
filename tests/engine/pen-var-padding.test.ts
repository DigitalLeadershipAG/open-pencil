import { describe, expect, test } from 'bun:test'

import { parsePenFile } from '@open-pencil/core'

/**
 * Regression test for open-pencil/open-pencil#201
 *
 * Design token variables ($--spacing-lg etc.) in padding and gap fields
 * must be resolved to numeric values before reaching yoga-layout.
 * Without the fix, yoga-layout crashes with:
 *   "Invalid value $--spacing-lg for setPadding"
 */

function makePenDoc(options: {
  padding?: number | string | (number | string)[]
  gap?: number | string
  variables?: Record<string, { type: string; value: number | string }>
}): string {
  const vars = options.variables ?? {
    '--spacing-sm': { type: 'number', value: 8 },
    '--spacing-md': { type: 'number', value: 16 },
    '--spacing-lg': { type: 'number', value: 24 },
  }

  const root: Record<string, unknown> = {
    name: 'test-root',
    type: 'frame',
    width: 200,
    height: 200,
    layout: 'column',
    children: [],
  }
  if (options.padding !== undefined) root.padding = options.padding
  if (options.gap !== undefined) root.gap = options.gap

  return JSON.stringify({
    version: 1,
    variables: vars,
    themes: {},
    pages: [{ name: 'Test', root }],
  })
}

describe('pen variable padding/gap resolution (#201)', () => {
  test('resolves $--spacing-lg variable as single padding value', () => {
    const graph = parsePenFile(makePenDoc({ padding: '$--spacing-lg' }))
    const nodes = [...graph.getAllNodes()]
    const frame = nodes.find((n) => n.name === 'test-root')

    expect(frame).toBeDefined()
    expect(frame!.paddingTop).toBe(24)
    expect(frame!.paddingRight).toBe(24)
    expect(frame!.paddingBottom).toBe(24)
    expect(frame!.paddingLeft).toBe(24)
  })

  test('resolves variable references in padding array', () => {
    const graph = parsePenFile(
      makePenDoc({ padding: ['$--spacing-sm', '$--spacing-lg', '$--spacing-sm', '$--spacing-lg'] })
    )
    const frame = [...graph.getAllNodes()].find((n) => n.name === 'test-root')

    expect(frame).toBeDefined()
    expect(frame!.paddingTop).toBe(8)
    expect(frame!.paddingRight).toBe(24)
    expect(frame!.paddingBottom).toBe(8)
    expect(frame!.paddingLeft).toBe(24)
  })

  test('resolves $--spacing-md variable as gap', () => {
    const graph = parsePenFile(makePenDoc({ gap: '$--spacing-md' }))
    const frame = [...graph.getAllNodes()].find((n) => n.name === 'test-root')

    expect(frame).toBeDefined()
    expect(frame!.itemSpacing).toBe(16)
  })

  test('numeric padding and gap still work (regression)', () => {
    const graph = parsePenFile(makePenDoc({ padding: [10, 20, 10, 20], gap: 12 }))
    const frame = [...graph.getAllNodes()].find((n) => n.name === 'test-root')

    expect(frame).toBeDefined()
    expect(frame!.paddingTop).toBe(10)
    expect(frame!.paddingRight).toBe(20)
    expect(frame!.itemSpacing).toBe(12)
  })
})
