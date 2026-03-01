import { describe, test, expect } from 'bun:test'

import { DemoRecorder, type DemoScenario } from './record'
import { CanvasHelper } from '../../tests/helpers/canvas'

describe('DemoRecorder', () => {
  test('delegates to CanvasHelper methods', () => {
    const recorder = Object.getOwnPropertyNames(DemoRecorder.prototype)
    const canvasHelper = Object.getOwnPropertyNames(CanvasHelper.prototype)

    const delegatedMethods = ['drawRect', 'drawEllipse', 'selectTool', 'pressKey']
    for (const method of delegatedMethods) {
      expect(recorder).toContain(method)
      expect(canvasHelper).toContain(method)
    }
  })

  test('exports DemoScenario interface', () => {
    const scenario: DemoScenario = {
      name: 'test',
      run: async () => {},
    }
    expect(scenario.name).toBe('test')
  })

  test('CanvasHelper is not modified', async () => {
    const canvasSource = await Bun.file('tests/helpers/canvas.ts').text()
    expect(canvasSource).toContain('export class CanvasHelper')
    expect(canvasSource).not.toContain('DemoRecorder')
    expect(canvasSource).not.toContain('annotation')
  })
})
