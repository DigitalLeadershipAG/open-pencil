import type { DemoScenario } from '../scripts/record'

const scenario: DemoScenario = {
  name: 'Create Shapes',

  async run(r) {
    await r.annotate('Press R to select the Rectangle tool')
    await r.sleep(1000)
    await r.selectTool('rectangle')
    await r.clearAnnotation()

    await r.annotate('Click and drag to draw a rectangle')
    await r.sleep(500)
    await r.drawRect(200, 150, 300, 200)
    await r.sleep(500)
    await r.clearAnnotation()

    await r.sleep(800)

    await r.annotate('Press O to select the Ellipse tool')
    await r.sleep(1000)
    await r.selectTool('ellipse')
    await r.clearAnnotation()

    await r.annotate('Click and drag to draw an ellipse')
    await r.sleep(500)
    await r.drawEllipse(600, 150, 250, 200)
    await r.sleep(500)
    await r.clearAnnotation()

    await r.sleep(800)

    await r.annotate('Press V to switch to Select tool')
    await r.sleep(1000)
    await r.selectTool('select')
    await r.clearAnnotation()

    await r.annotate('Click and drag to move a shape')
    await r.sleep(500)
    await r.drag(350, 250, 350, 400)
    await r.sleep(500)
    await r.clearAnnotation()

    await r.sleep(1500)
  },
}

export default scenario
