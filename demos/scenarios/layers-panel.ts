import type { DemoScenario } from '../scripts/record'

const scenario: DemoScenario = {
  name: 'Layers Panel',

  async run(r) {
    await r.annotate('Draw some shapes to populate the layers panel')
    await r.sleep(800)
    await r.drawRect(200, 200, 200, 150)
    await r.drawEllipse(500, 200, 180, 180)
    await r.clearAnnotation()

    await r.sleep(800)

    await r.annotate('Layers panel shows all created objects')
    await r.sleep(2000)
    await r.clearAnnotation()

    await r.sleep(500)

    const layerRow = r.page.locator('[data-node-id]').first()

    await r.annotate('Click a layer to select it')
    await r.sleep(800)
    await r.clickLocator(layerRow, { showRipple: true })
    await r.sleep(800)
    await r.clearAnnotation()

    await r.sleep(800)

    await r.annotate('Select a shape and press Backspace to delete')
    await r.sleep(800)
    await r.clickCanvas(300, 275)
    await r.sleep(300)
    await r.pressKey('Backspace')
    await r.clearAnnotation()

    await r.sleep(500)

    await r.annotate('Press ⌘+Z to undo')
    await r.sleep(800)
    await r.canvas.undo()
    await r.clearAnnotation()

    await r.sleep(1500)
  },
}

export default scenario
