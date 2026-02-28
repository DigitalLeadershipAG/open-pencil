## 1. Extension Scaffold

- [x] 1.1 Create `extensions/vscode/` directory structure: `src/`, `src/sidebar/`, `webview/`, `media/`, `dist/`
- [x] 1.2 Create `extensions/vscode/package.json` with extension manifest (contributes: customEditors, viewsContainers, views, commands, activationEvents), engines.vscode, main entry
- [x] 1.3 Create `extensions/vscode/tsconfig.json` with paths alias `@/ → ../../src/` and strict mode
- [x] 1.4 Create `extensions/vscode/esbuild.mjs` with two entry points (extension host CJS + webview ESM), `@/` alias, `vscode` external, esbuild copy plugin to copy `canvaskit.wasm` from `node_modules/canvaskit-wasm/bin/` to `dist/`
- [x] 1.5 Add `build`, `watch`, `package` scripts to `extensions/vscode/package.json`
- [x] 1.6 Create `extensions/vscode/media/icon.svg` (OpenPencil diamond icon for Activity Bar)
- [x] 1.7 Create `extensions/vscode/.vscodeignore` to exclude source files, node_modules, tests from VSIX package
- [x] 1.8 Run `bun install` in `extensions/vscode/` — install `@types/vscode`, `esbuild`, `canvaskit-wasm`, `culori`, `fflate`, `fzstd` as dependencies

## 2. Engine Import Audit & Verification

- [x] 2.1 Verify `src/kiwi/fig-file.ts` and its transitive imports (`fig-import.ts`, `codec.ts`, `kiwi-schema/`, `protocol.ts`, `schema.ts`) have no Vue, DOM, or `import.meta.env` dependencies — build a minimal Node.js test that imports and calls `parseFigFile`
- [x] 2.2 Verify `src/engine/scene-graph.ts`, `src/engine/color.ts`, `src/types.ts` work in Node.js — no browser globals, no Vite-specific features
- [x] 2.3 Verify `src/engine/renderer.ts` imports work in browser webview context (CanvasKit types only, no Vue reactivity)
- [x] 2.4 Document any shims needed (if any) — create `extensions/vscode/src/shims.ts` for polyfills

## 3. Extension Entry Point & Lifecycle

- [x] 3.1 Create `extensions/vscode/src/extension.ts` with `activate` and `deactivate` exports
- [x] 3.2 In `activate`: push all registrations into `context.subscriptions` for automatic disposal
- [x] 3.3 Register `CustomReadonlyEditorProvider` for .fig files
- [x] 3.4 Register TreeDataProviders for pages and components views
- [x] 3.5 Register commands (openFile, copyCSS)
- [x] 3.6 Create FileSystemWatcher for `**/*.fig` — track .fig files, fire refresh events, push to `context.subscriptions`
- [x] 3.7 Create StatusBarItem showing .fig file count, click opens quick pick, push to `context.subscriptions`
- [x] 3.8 In `deactivate`: any additional cleanup beyond automatic subscription disposal

## 4. postMessage Protocol

- [x] 4.1 Create `extensions/vscode/src/protocol.ts` with typed message discriminated unions (ExtensionMessage, WebviewMessage)
- [x] 4.2 Define extension→webview messages: `render-page` (pageId + serialized nodes array), `select-node` (nodeId), `clear`, `set-theme` (light/dark)
- [x] 4.3 Define webview→extension messages: `ready`, `node-clicked` (nodeId), `error` (message string)
- [x] 4.4 Create `serializeNode(node: SceneNode): SerializedNode` — strip to renderable properties only (position, size, fills, strokes, effects, text, corner radius, opacity, clipsContent, childIds, type, name, id). Exclude: vectorNetwork, arcData, constraints, layout overrides. Image fills: include imageHash reference, images sent separately as base64
- [x] 4.5 Create `serializePage(graph: SceneGraph, pageId: string): SerializedNode[]` — collect all nodes for a page, serialize each. Cap at 5000 nodes with truncation warning

## 5. Fig Editor Provider

- [x] 5.1 Create `extensions/vscode/src/fig-editor-provider.ts` implementing `CustomReadonlyEditorProvider`
- [x] 5.2 Implement `openCustomDocument`: read .fig bytes via `vscode.workspace.fs.readFile`, wrap `parseFigFile` in try/catch, return custom document with SceneGraph or error state
- [x] 5.3 Implement `resolveCustomEditor`: generate unique nonce via `crypto.randomUUID()`, build webview HTML with CSP (`default-src 'none'; script-src 'nonce-${nonce}' 'wasm-unsafe-eval'; style-src ${cspSource}; img-src ${cspSource} blob:; connect-src ${cspSource};`), inject `webview.asWebviewUri()` paths for webview.js and canvaskit.wasm
- [x] 5.4 Set `webviewOptions.retainContextWhenHidden: true` to preserve WebGL context across tab switches
- [x] 5.5 On webview `ready` message: send first page's serialized nodes, send current theme
- [x] 5.6 Handle `node-clicked` messages from webview — update shared selection state, refresh sidebar trees
- [x] 5.7 Handle page switching requests — serialize and send new page's nodes
- [x] 5.8 Error handling: if .fig parsing fails, display error HTML in webview with file name and error details (no CanvasKit needed for error state)

## 6. Sidebar Tree Views

- [x] 6.1 Create `extensions/vscode/src/sidebar/pages-tree.ts` — TreeDataProvider listing CANVAS nodes from active SceneGraph
- [x] 6.2 Create `extensions/vscode/src/sidebar/components-tree.ts` — TreeDataProvider listing COMPONENT/COMPONENT_SET nodes hierarchically (COMPONENT_SET as parent, COMPONENT variants as children)
- [x] 6.3 Implement tree item icons using VS Code ThemeIcon (codicon): `$(file)` for pages, `$(symbol-misc)` for components
- [x] 6.4 Handle tree item click → post `select-node` message to active editor webview
- [x] 6.5 Implement `onDidChangeTreeData` event — fire on active editor change, .fig file modification, and selection change
- [x] 6.6 Show welcome view content (contributes.viewsWelcome) when no .fig file is open
- [x] 6.7 Component context menu via `contextValue` — "Copy CSS" option

## 7. Webview Renderer

- [x] 7.1 Create `extensions/vscode/webview/index.html` with CSP meta tag placeholder, nonce script tag, full-size canvas element
- [x] 7.2 Create `extensions/vscode/webview/preview.ts` — receive `canvasKitWasmUri` from extension host (injected as global variable in HTML), call `CanvasKitInit({ locateFile: () => canvasKitWasmUri })`, create WebGL2 surface. On WebGL2 failure: display text fallback "WebGL2 not available"
- [x] 7.3 Implement simplified renderer — iterate serialized nodes tree, draw: solid fill rectangles, gradient fills (linear), strokes with weight, uniform + independent corner radii, opacity (using `SkPaint.setAlpha`), text (Inter fallback font bundled), frame clipping (`canvas.save/clipRect/restore`)
- [x] 7.4 Implement viewport transform: pan (middle-click drag, or space+left-drag) and zoom (wheel with Ctrl, centered on cursor). Store as `{ offsetX, offsetY, scale }`, apply as canvas transform before rendering
- [x] 7.5 Implement bounds-only hit testing: inverse-transform mouse coordinates through viewport, walk nodes in reverse paint order (topmost first), check rectangular bounds. Skip non-visible nodes. No rotation/path-based hit testing in v1
- [x] 7.6 Render selection border around selected node — blue (#3B82F6) 2px border at constant screen-space width (divide by scale)
- [x] 7.7 Handle incoming `render-page` messages — store nodes, re-render. Handle `select-node` — update highlight
- [x] 7.8 Handle theme: read VS Code CSS variables (`--vscode-editor-background`) for canvas clear color. Listen for theme change via `MutationObserver` on `document.body` class changes

## 8. CSS Generation

- [x] 8.1 Create `extensions/vscode/src/css-generator.ts` — pure function `generateCSS(node: SceneNode): string` returning CSS declaration block
- [x] 8.2 Implement dimensional properties: `width`, `height` in px
- [x] 8.3 Implement background: first visible solid fill → `background-color: #hex;`, first visible gradient fill → `background: linear-gradient(...)`. Multiple fills: use first visible. Image fills: skip with `/* image fill */` comment
- [x] 8.4 Implement border-radius: uniform → single value, independent → 4 values
- [x] 8.5 Implement border: first visible stroke → `border: Npx solid #hex;`, stroke align INSIDE → add `box-sizing: border-box;`
- [x] 8.6 Implement box-shadow: from visible DROP_SHADOW effects → `box-shadow: Xpx Ypx Rpx Spx rgba(r,g,b,a);`. Multiple shadows comma-separated
- [x] 8.7 Implement opacity: if < 1 → `opacity: N;`
- [x] 8.8 Implement text: `font-family`, `font-size`, `font-weight`, `line-height` (if set), `letter-spacing` (if nonzero), `text-align`
- [x] 8.9 Implement flexbox: layoutMode HORIZONTAL → `display: flex; flex-direction: row;`, VERTICAL → column. `gap` from itemSpacing, `justify-content` from primaryAxisAlign, `align-items` from counterAxisAlign, `padding` from padding values
- [x] 8.10 Register `openPencil.copyCSS` command — get selected node from active editor's state, generate CSS, copy via `vscode.env.clipboard.writeText`, show info notification. If no selection: show warning

## 9. Build & Debug

- [x] 9.1 Run esbuild — verify both bundles produce without errors, canvaskit.wasm copied to dist/
- [x] 9.2 Create `extensions/vscode/.vscode/launch.json` with Extension Development Host configuration (extensionDevelopmentPath, preLaunchTask for build)
- [x] 9.3 Create `extensions/vscode/.vscode/tasks.json` with build task that runs esbuild
- [x] 9.4 Manual smoke test: open a .fig file, verify it renders, click a node, copy CSS
