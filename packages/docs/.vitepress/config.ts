import { defineConfig, type DefaultTheme } from 'vitepress'

interface SidebarLabels {
  gettingAround: string
  creatingContent: string
  organizing: string
  advanced: string
  canvasNav: string
  selection: string
  shapes: string
  text: string
  pen: string
  layers: string
  contextMenu: string
  exporting: string
  autoLayout: string
  components: string
  variables: string
  guide: string
  gettingStarted: string
  features: string
  architecture: string
  techStack: string
  comparison: string
  figmaMatrix: string
}

interface ReferenceLabels {
  keyboardShortcuts: string
  nodeTypes: string
  mcpTools: string
  sceneGraph: string
  fileFormat: string
  evalCommand: string
}

interface DevelopmentLabels {
  contributing: string
  testing: string
  openspec: string
  roadmap: string
}

interface NavLabels {
  userGuide: string
  reference: string
  development: string
  openApp: string
}

const userGuideSidebar = (prefix: string, l: SidebarLabels): DefaultTheme.SidebarItem[] => [
  {
    text: l.gettingAround,
    items: [
      { text: l.canvasNav, link: `${prefix}/user-guide/canvas-navigation` },
      { text: l.selection, link: `${prefix}/user-guide/selection-and-manipulation` },
    ],
  },
  {
    text: l.creatingContent,
    items: [
      { text: l.shapes, link: `${prefix}/user-guide/drawing-shapes` },
      { text: l.text, link: `${prefix}/user-guide/text-editing` },
      { text: l.pen, link: `${prefix}/user-guide/pen-tool` },
    ],
  },
  {
    text: l.organizing,
    items: [
      { text: l.layers, link: `${prefix}/user-guide/layers-and-pages` },
      { text: l.contextMenu, link: `${prefix}/user-guide/context-menu` },
      { text: l.exporting, link: `${prefix}/user-guide/exporting` },
    ],
  },
  {
    text: l.advanced,
    items: [
      { text: l.autoLayout, link: `${prefix}/user-guide/auto-layout` },
      { text: l.components, link: `${prefix}/user-guide/components` },
      { text: l.variables, link: `${prefix}/user-guide/variables` },
    ],
  },
]

const guideSidebar = (prefix: string, l: SidebarLabels): DefaultTheme.SidebarItem[] => [
  {
    text: l.guide,
    items: [
      { text: l.gettingStarted, link: `${prefix}/guide/getting-started` },
      { text: l.features, link: `${prefix}/guide/features` },
      { text: l.architecture, link: `${prefix}/guide/architecture` },
      { text: l.techStack, link: `${prefix}/guide/tech-stack` },
      { text: l.comparison, link: `${prefix}/guide/comparison` },
      { text: l.figmaMatrix, link: `${prefix}/guide/figma-comparison` },
    ],
  },
]

const referenceSidebar = (prefix: string, label: string, l: ReferenceLabels): DefaultTheme.SidebarItem[] => [
  {
    text: label,
    items: [
      { text: l.keyboardShortcuts, link: `${prefix}/reference/keyboard-shortcuts` },
      { text: l.nodeTypes, link: `${prefix}/reference/node-types` },
      { text: l.mcpTools, link: `${prefix}/reference/mcp-tools` },
      { text: l.sceneGraph, link: `${prefix}/reference/scene-graph` },
      { text: l.fileFormat, link: `${prefix}/reference/file-format` },
      { text: l.evalCommand, link: `${prefix}/eval-command` },
    ],
  },
]

const developmentSidebar = (prefix: string, label: string, l: DevelopmentLabels): DefaultTheme.SidebarItem[] => [
  {
    text: label,
    items: [
      { text: l.contributing, link: `${prefix}/development/contributing` },
      { text: l.testing, link: `${prefix}/development/testing` },
      { text: l.openspec, link: `${prefix}/development/openspec` },
      { text: l.roadmap, link: `${prefix}/development/roadmap` },
    ],
  },
]

interface LocaleLabels {
  nav: NavLabels
  sidebar: SidebarLabels
  reference: ReferenceLabels
  development: DevelopmentLabels
}

const localeThemeConfig = (
  prefix: string,
  l: LocaleLabels,
): DefaultTheme.Config => ({
  nav: [
    { text: l.nav.userGuide, link: `${prefix}/user-guide/` },
    { text: l.nav.reference, link: `${prefix}/reference/keyboard-shortcuts` },
    { text: l.nav.development, link: `${prefix}/development/contributing` },
    { text: l.nav.openApp, link: 'https://app.openpencil.dev' },
  ],
  sidebar: {
    [`${prefix}/user-guide/`]: userGuideSidebar(prefix, l.sidebar),
    [`${prefix}/reference/`]: referenceSidebar(prefix, l.nav.reference, l.reference),
    [`${prefix}/`]: [
      ...guideSidebar(prefix, l.sidebar),
      ...developmentSidebar(prefix, l.nav.development, l.development),
    ],
  },
})

const EN_SIDEBAR: SidebarLabels = { gettingAround: 'Getting Around', creatingContent: 'Creating Content', organizing: 'Organizing & Managing', advanced: 'Advanced Features', canvasNav: 'Canvas Navigation', selection: 'Selection & Manipulation', shapes: 'Drawing Shapes', text: 'Text Editing', pen: 'Pen Tool', layers: 'Layers & Pages', contextMenu: 'Context Menu', exporting: 'Exporting', autoLayout: 'Auto Layout', components: 'Components', variables: 'Variables', guide: 'Guide', gettingStarted: 'Getting Started', features: 'Features', architecture: 'Architecture', techStack: 'Tech Stack', comparison: 'Comparison', figmaMatrix: 'Figma Feature Matrix' }

const EN_REF: ReferenceLabels = { keyboardShortcuts: 'Keyboard Shortcuts', nodeTypes: 'Node Types', mcpTools: 'MCP Tools', sceneGraph: 'Scene Graph', fileFormat: 'File Format', evalCommand: 'Eval Command' }

const EN_DEV: DevelopmentLabels = { contributing: 'Contributing', testing: 'Testing', openspec: 'OpenSpec', roadmap: 'Roadmap' }

const DE: LocaleLabels = {
  nav: { userGuide: 'Benutzerhandbuch', reference: 'Referenz', development: 'Entwicklung', openApp: 'App öffnen' },
  sidebar: { gettingAround: 'Erste Schritte', creatingContent: 'Inhalte erstellen', organizing: 'Organisieren', advanced: 'Erweitert', canvasNav: 'Canvas-Navigation', selection: 'Auswahl & Bearbeitung', shapes: 'Formen zeichnen', text: 'Textbearbeitung', pen: 'Stiftwerkzeug', layers: 'Ebenen & Seiten', contextMenu: 'Kontextmenü', exporting: 'Exportieren', autoLayout: 'Auto-Layout', components: 'Komponenten', variables: 'Variablen', guide: 'Anleitung', gettingStarted: 'Erste Schritte', features: 'Funktionen', architecture: 'Architektur', techStack: 'Tech-Stack', comparison: 'Vergleich', figmaMatrix: 'Figma-Funktionsmatrix' },
  reference: { keyboardShortcuts: 'Tastenkürzel', nodeTypes: 'Knotentypen', mcpTools: 'MCP-Tools', sceneGraph: 'Szenengraph', fileFormat: 'Dateiformat', evalCommand: 'Eval-Befehl' },
  development: { contributing: 'Mitwirken', testing: 'Testen', openspec: 'OpenSpec', roadmap: 'Roadmap' },
}

const IT: LocaleLabels = {
  nav: { userGuide: 'Guida utente', reference: 'Riferimento', development: 'Sviluppo', openApp: 'Apri app' },
  sidebar: { gettingAround: 'Orientamento', creatingContent: 'Creazione contenuti', organizing: 'Organizzazione', advanced: 'Avanzate', canvasNav: 'Navigazione canvas', selection: 'Selezione e manipolazione', shapes: 'Disegno forme', text: 'Modifica testo', pen: 'Strumento penna', layers: 'Livelli e pagine', contextMenu: 'Menu contestuale', exporting: 'Esportazione', autoLayout: 'Auto-layout', components: 'Componenti', variables: 'Variabili', guide: 'Guida', gettingStarted: 'Per iniziare', features: 'Funzionalità', architecture: 'Architettura', techStack: 'Stack tecnologico', comparison: 'Confronto', figmaMatrix: 'Matrice funzionalità Figma' },
  reference: { keyboardShortcuts: 'Scorciatoie da tastiera', nodeTypes: 'Tipi di nodo', mcpTools: 'Strumenti MCP', sceneGraph: 'Grafo della scena', fileFormat: 'Formato file', evalCommand: 'Comando Eval' },
  development: { contributing: 'Contribuire', testing: 'Test', openspec: 'OpenSpec', roadmap: 'Roadmap' },
}

const FR: LocaleLabels = {
  nav: { userGuide: 'Guide utilisateur', reference: 'Référence', development: 'Développement', openApp: "Ouvrir l'app" },
  sidebar: { gettingAround: 'Prise en main', creatingContent: 'Création de contenu', organizing: 'Organisation', advanced: 'Avancé', canvasNav: 'Navigation sur le canevas', selection: 'Sélection et manipulation', shapes: 'Dessiner des formes', text: 'Édition de texte', pen: 'Outil plume', layers: 'Calques et pages', contextMenu: 'Menu contextuel', exporting: 'Exportation', autoLayout: 'Mise en page auto', components: 'Composants', variables: 'Variables', guide: 'Guide', gettingStarted: 'Premiers pas', features: 'Fonctionnalités', architecture: 'Architecture', techStack: 'Stack technique', comparison: 'Comparaison', figmaMatrix: 'Matrice des fonctionnalités Figma' },
  reference: { keyboardShortcuts: 'Raccourcis clavier', nodeTypes: 'Types de nœuds', mcpTools: 'Outils MCP', sceneGraph: 'Graphe de scène', fileFormat: 'Format de fichier', evalCommand: 'Commande Eval' },
  development: { contributing: 'Contribuer', testing: 'Tests', openspec: 'OpenSpec', roadmap: 'Feuille de route' },
}

const ES: LocaleLabels = {
  nav: { userGuide: 'Guía del usuario', reference: 'Referencia', development: 'Desarrollo', openApp: 'Abrir app' },
  sidebar: { gettingAround: 'Orientación', creatingContent: 'Crear contenido', organizing: 'Organizar', advanced: 'Avanzado', canvasNav: 'Navegación del lienzo', selection: 'Selección y manipulación', shapes: 'Dibujar formas', text: 'Edición de texto', pen: 'Herramienta pluma', layers: 'Capas y páginas', contextMenu: 'Menú contextual', exporting: 'Exportar', autoLayout: 'Auto-layout', components: 'Componentes', variables: 'Variables', guide: 'Guía', gettingStarted: 'Primeros pasos', features: 'Características', architecture: 'Arquitectura', techStack: 'Stack tecnológico', comparison: 'Comparación', figmaMatrix: 'Matriz de funcionalidades Figma' },
  reference: { keyboardShortcuts: 'Atajos de teclado', nodeTypes: 'Tipos de nodo', mcpTools: 'Herramientas MCP', sceneGraph: 'Grafo de escena', fileFormat: 'Formato de archivo', evalCommand: 'Comando Eval' },
  development: { contributing: 'Contribuir', testing: 'Pruebas', openspec: 'OpenSpec', roadmap: 'Hoja de ruta' },
}

const PL: LocaleLabels = {
  nav: { userGuide: 'Podręcznik', reference: 'Referencja', development: 'Rozwój', openApp: 'Otwórz app' },
  sidebar: { gettingAround: 'Nawigacja', creatingContent: 'Tworzenie treści', organizing: 'Organizacja', advanced: 'Zaawansowane', canvasNav: 'Nawigacja po płótnie', selection: 'Zaznaczanie i edycja', shapes: 'Rysowanie kształtów', text: 'Edycja tekstu', pen: 'Narzędzie pióro', layers: 'Warstwy i strony', contextMenu: 'Menu kontekstowe', exporting: 'Eksportowanie', autoLayout: 'Auto-layout', components: 'Komponenty', variables: 'Zmienne', guide: 'Przewodnik', gettingStarted: 'Rozpoczęcie pracy', features: 'Funkcje', architecture: 'Architektura', techStack: 'Stack technologiczny', comparison: 'Porównanie', figmaMatrix: 'Matryca funkcji Figma' },
  reference: { keyboardShortcuts: 'Skróty klawiszowe', nodeTypes: 'Typy węzłów', mcpTools: 'Narzędzia MCP', sceneGraph: 'Graf sceny', fileFormat: 'Format pliku', evalCommand: 'Polecenie Eval' },
  development: { contributing: 'Współpraca', testing: 'Testowanie', openspec: 'OpenSpec', roadmap: 'Plan rozwoju' },
}

const BASE = 'https://openpencil.dev'

const LOCALE_PREFIXES = ['de', 'fr', 'es', 'it', 'pl'] as const

const LOCALES: Record<string, { hreflang: string; ogLocale: string; prefix: string }> = {
  en: { hreflang: 'en', ogLocale: 'en_US', prefix: '' },
  de: { hreflang: 'de', ogLocale: 'de_DE', prefix: '/de' },
  fr: { hreflang: 'fr', ogLocale: 'fr_FR', prefix: '/fr' },
  es: { hreflang: 'es', ogLocale: 'es_ES', prefix: '/es' },
  it: { hreflang: 'it', ogLocale: 'it_IT', prefix: '/it' },
  pl: { hreflang: 'pl', ogLocale: 'pl_PL', prefix: '/pl' },
}

export default defineConfig({
  title: 'OpenPencil',
  description: 'Open-source, AI-native design editor. Figma alternative built from scratch with full .fig file compatibility.',
  cleanUrls: true,
  lastUpdated: true,
  appearance: 'dark',

  sitemap: {
    hostname: BASE,
    transformItems(items) {
      return items.map((item) => {
        const localeKey = LOCALE_PREFIXES.find((p) => item.url.startsWith(p + '/')) ?? 'en'
        const slug = item.url
          .replace(new RegExp(`^(${LOCALE_PREFIXES.join('|')})/`), '')
          .replace(/\/$/, '')

        return {
          ...item,
          links: Object.entries(LOCALES).map(([, loc]) => {
            const url = slug ? `${BASE}${loc.prefix}/${slug}` : `${BASE}${loc.prefix || '/'}`
            return { lang: loc.hreflang, url }
          }),
        }
      })
    },
  },

  head: [
    ['link', { rel: 'icon', type: 'image/png', href: '/favicon.png' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: 'OpenPencil' }],
    ['meta', { property: 'og:image', content: `${BASE}/screenshot.png` }],
    ['meta', { property: 'og:image:width', content: '2784' }],
    ['meta', { property: 'og:image:height', content: '1824' }],
    ['meta', { property: 'og:image:alt', content: 'OpenPencil — AI-Native Design Editor' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:site', content: '@openpencildev' }],
    ['meta', { name: 'twitter:image', content: `${BASE}/screenshot.png` }],
  ],

  transformPageData(pageData) {
    const rel = pageData.relativePath

    const localeKey = LOCALE_PREFIXES.find((p) => rel.startsWith(p + '/')) ?? 'en'
    const locale = LOCALES[localeKey]

    const slug = rel
      .replace(new RegExp(`^(${LOCALE_PREFIXES.join('|')})/`), '')
      .replace(/\.md$/, '')
      .replace(/\/index$/, '')
      .replace(/^index$/, '')

    const pageUrl = slug ? `${BASE}${locale.prefix}/${slug}` : `${BASE}${locale.prefix || ''}`
    const enSlug = slug ? `${BASE}/${slug}` : BASE

    pageData.frontmatter.head ??= []
    const h = pageData.frontmatter.head as [string, Record<string, string>][]

    h.push(['link', { rel: 'canonical', href: pageUrl }])
    h.push(['meta', { property: 'og:url', content: pageUrl }])
    h.push(['meta', { property: 'og:locale', content: locale.ogLocale }])

    for (const [key, loc] of Object.entries(LOCALES)) {
      if (key !== localeKey) {
        h.push(['meta', { property: 'og:locale:alternate', content: loc.ogLocale }])
      }
    }

    for (const [, loc] of Object.entries(LOCALES)) {
      const altUrl = slug ? `${BASE}${loc.prefix}/${slug}` : `${BASE}${loc.prefix || ''}`
      h.push(['link', { rel: 'alternate', hreflang: loc.hreflang, href: altUrl }])
    }
    h.push(['link', { rel: 'alternate', hreflang: 'x-default', href: enSlug }])

    if (pageData.title) {
      const ogTitle = `${pageData.title} — OpenPencil`
      h.push(['meta', { property: 'og:title', content: ogTitle }])
      h.push(['meta', { name: 'twitter:title', content: ogTitle }])
    }

    if (pageData.description) {
      h.push(['meta', { property: 'og:description', content: pageData.description }])
      h.push(['meta', { name: 'twitter:description', content: pageData.description }])
      h.push(['meta', { name: 'description', content: pageData.description }])
    }
  },

  locales: {
    root: {
      label: 'English',
      lang: 'en',
    },
    de: {
      label: 'Deutsch',
      lang: 'de',
      description: 'Open-Source, KI-nativer Design-Editor. Figma-Alternative.',
      themeConfig: localeThemeConfig('/de', DE),
    },
    it: {
      label: 'Italiano',
      lang: 'it',
      description: 'Editor di design open-source, IA-nativo. Alternativa a Figma.',
      themeConfig: localeThemeConfig('/it', IT),
    },
    fr: {
      label: 'Français',
      lang: 'fr',
      description: 'Éditeur de design open-source, IA-natif. Alternative à Figma.',
      themeConfig: localeThemeConfig('/fr', FR),
    },
    es: {
      label: 'Español',
      lang: 'es',
      description: 'Editor de diseño open-source, IA-nativo. Alternativa a Figma.',
      themeConfig: localeThemeConfig('/es', ES),
    },
    pl: {
      label: 'Polski',
      lang: 'pl',
      description: "Open-source'owy edytor graficzny z natywnym AI. Alternatywa dla Figmy.",
      themeConfig: localeThemeConfig('/pl', PL),
    },
  },

  themeConfig: {
    search: { provider: 'local' },

    nav: [
      { text: 'User Guide', link: '/user-guide/' },
      { text: 'Reference', link: '/reference/keyboard-shortcuts' },
      { text: 'Development', link: '/development/contributing' },
      { text: 'Open App', link: 'https://app.openpencil.dev' },
    ],

    sidebar: {
      '/user-guide/': userGuideSidebar('', EN_SIDEBAR),
      '/reference/': referenceSidebar('', 'Reference', EN_REF),
      '/': [
        ...guideSidebar('', EN_SIDEBAR),
        ...developmentSidebar('', 'Development', EN_DEV),
      ],
    },

    socialLinks: [{ icon: 'github', link: 'https://github.com/open-pencil/open-pencil' }],

    editLink: {
      pattern: 'https://github.com/open-pencil/open-pencil/edit/master/packages/docs/:path',
    },

    footer: {
      message: 'Released under the MIT License.',
    },
  },
})
