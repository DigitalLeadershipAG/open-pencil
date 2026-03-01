import type { Page, Locator } from '@playwright/test'

const CURSOR_ID = 'demo-cursor'
const RIPPLE_ID = 'demo-ripple'
const ANNOTATION_ID = 'demo-annotation'
const TRANSITION_MS = 400

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms))
}

export async function ensureCursor(page: Page): Promise<void> {
  await page.evaluate(
    ({ id, ms }) => {
      if (document.getElementById(id)) return
      const cursor = document.createElement('div')
      cursor.id = id
      cursor.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 3L19 12L12 13L9 20L5 3Z" fill="white" stroke="black" stroke-width="1.5" stroke-linejoin="round"/>
    </svg>`
      Object.assign(cursor.style, {
        position: 'fixed',
        top: '0px',
        left: '0px',
        width: '24px',
        height: '24px',
        zIndex: '999999',
        pointerEvents: 'none',
        transition: `top ${ms}ms ease, left ${ms}ms ease`,
        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
      })
      document.body.appendChild(cursor)

      document.addEventListener('mousemove', (e) => {
        cursor.style.transition = 'none'
        cursor.style.top = `${e.clientY}px`
        cursor.style.left = `${e.clientX}px`
      })
    },
    { id: CURSOR_ID, ms: TRANSITION_MS },
  )
}

export async function moveCursorTo(page: Page, x: number, y: number): Promise<void> {
  await ensureCursor(page)
  await page.evaluate(
    ({ id, x, y, ms }) => {
      const cursor = document.getElementById(id)
      if (cursor) {
        cursor.style.transition = `top ${ms}ms ease, left ${ms}ms ease`
        cursor.style.top = `${y}px`
        cursor.style.left = `${x}px`
      }
    },
    { id: CURSOR_ID, x, y, ms: TRANSITION_MS },
  )
  await sleep(TRANSITION_MS + 50)
}

export interface DemoClickOptions {
  showRipple?: boolean
}

export async function demoClick(
  page: Page,
  locator: Locator,
  options: DemoClickOptions = {},
): Promise<void> {
  const box = await locator.boundingBox()
  if (box) {
    const cx = box.x + box.width / 2
    const cy = box.y + box.height / 2
    await moveCursorTo(page, cx, cy)

    if (options.showRipple) {
      await showRipple(page, cx, cy)
    }
  }
  await locator.click()
}

export async function demoClickXY(
  page: Page,
  x: number,
  y: number,
  options: DemoClickOptions = {},
): Promise<void> {
  await moveCursorTo(page, x, y)

  if (options.showRipple) {
    await showRipple(page, x, y)
  }

  await page.mouse.click(x, y)
}

async function showRipple(page: Page, x: number, y: number): Promise<void> {
  await page.evaluate(
    ({ id, x, y }) => {
      const existing = document.getElementById(id)
      if (existing) existing.remove()

      const ripple = document.createElement('div')
      ripple.id = id
      Object.assign(ripple.style, {
        position: 'fixed',
        top: `${y - 15}px`,
        left: `${x - 15}px`,
        width: '30px',
        height: '30px',
        borderRadius: '50%',
        background: 'rgba(66, 133, 244, 0.4)',
        zIndex: '999998',
        pointerEvents: 'none',
        animation: 'demo-ripple-anim 600ms ease-out forwards',
      })

      if (!document.getElementById('demo-ripple-style')) {
        const style = document.createElement('style')
        style.id = 'demo-ripple-style'
        style.textContent = `
          @keyframes demo-ripple-anim {
            0% { transform: scale(0.5); opacity: 1; }
            100% { transform: scale(2); opacity: 0; }
          }
        `
        document.head.appendChild(style)
      }

      document.body.appendChild(ripple)
      setTimeout(() => ripple.remove(), 600)
    },
    { id: RIPPLE_ID, x, y },
  )
}

export async function hideCursor(page: Page): Promise<void> {
  await page.evaluate((id) => {
    const cursor = document.getElementById(id)
    if (cursor) cursor.style.display = 'none'
  }, CURSOR_ID)
}

export type AnnotationPosition = 'top' | 'bottom'

export async function showAnnotation(
  page: Page,
  text: string,
  position: AnnotationPosition = 'top',
): Promise<void> {
  await page.evaluate(
    ({ id, text, position, ms }) => {
      if (!document.getElementById('demo-fira-font')) {
        const link = document.createElement('link')
        link.id = 'demo-fira-font'
        link.rel = 'stylesheet'
        link.href = 'https://fonts.googleapis.com/css2?family=Fira+Sans:wght@400;500&display=swap'
        document.head.appendChild(link)
      }

      if (!document.getElementById('demo-annotation-style')) {
        const style = document.createElement('style')
        style.id = 'demo-annotation-style'
        style.textContent = `
          @keyframes demo-fade-in { from { opacity: 0; transform: translateX(-50%) translateY(8px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
          @keyframes demo-fade-out { from { opacity: 1; transform: translateX(-50%) translateY(0); } to { opacity: 0; transform: translateX(-50%) translateY(8px); } }
        `
        document.head.appendChild(style)
      }

      const existing = document.getElementById(id)
      if (existing) existing.remove()

      const el = document.createElement('div')
      el.id = id
      el.textContent = text
      Object.assign(el.style, {
        position: 'fixed',
        [position === 'top' ? 'top' : 'bottom']: '32px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(15, 15, 15, 0.88)',
        color: '#ffffff',
        fontFamily: "'Fira Sans', sans-serif",
        fontSize: '18px',
        fontWeight: '500',
        padding: '12px 24px',
        borderRadius: '8px',
        zIndex: '999998',
        pointerEvents: 'none',
        animation: `demo-fade-in ${ms}ms ease forwards`,
        whiteSpace: 'nowrap',
      })
      document.body.appendChild(el)
    },
    { id: ANNOTATION_ID, text, position, ms: TRANSITION_MS },
  )
}

export async function hideAnnotation(page: Page): Promise<void> {
  await page.evaluate(
    ({ id, ms }) => {
      const el = document.getElementById(id)
      if (!el) return
      el.style.animation = `demo-fade-out ${ms}ms ease forwards`
      setTimeout(() => el.remove(), ms)
    },
    { id: ANNOTATION_ID, ms: TRANSITION_MS },
  )
  await sleep(TRANSITION_MS)
}
