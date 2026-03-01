import type { DemoScenario } from '../scripts/record'

const scenario: DemoScenario = {
  name: 'Color Picker',

  async run(r) {
    await r.annotate('Draw a rectangle to work with')
    await r.sleep(800)
    await r.drawRect(300, 200, 250, 200)
    await r.clearAnnotation()

    await r.sleep(800)

    await r.annotate('Select the shape')
    await r.sleep(500)
    await r.selectTool('select')
    await r.clickCanvas(425, 300, { showRipple: true })
    await r.clearAnnotation()

    await r.sleep(800)

    const fillSwatch = r.page.locator('.size-5.shrink-0.cursor-pointer.rounded.border').first()

    if ((await fillSwatch.count()) > 0) {
      await r.annotate('Click the fill color swatch to open Color Picker')
      await r.sleep(800)
      await r.clickLocator(fillSwatch, { showRipple: true })
      await r.sleep(500)
      await r.clearAnnotation()

      await r.sleep(800)

      const hexInput = r.page.locator('input[maxlength="6"]').first()

      if ((await hexInput.count()) > 0) {
        await r.annotate('Type a hex color value')
        await r.sleep(800)
        await r.clickLocator(hexInput, { showRipple: true })
        await hexInput.fill('4285F4')
        await hexInput.dispatchEvent('change')
        await r.sleep(500)
        await r.clearAnnotation()
      }
    } else {
      await r.annotate('Color picker opens from the properties panel')
      await r.sleep(2000)
      await r.clearAnnotation()
    }

    await r.sleep(1500)
  },
}

export default scenario
