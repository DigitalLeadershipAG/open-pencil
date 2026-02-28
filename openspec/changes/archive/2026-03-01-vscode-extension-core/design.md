## Context

OpenPencil is a Vue 3 + CanvasKit (Skia WASM) design editor. The engine layer (`src/engine/`, `src/kiwi/`, `src/types.ts`) is framework-agnostic — verified to have zero Vue/DOM dependencies (see `op-vs-code/02-openpencil-reuse-audit.md`). This engine can parse .fig files (Kiwi binary codec), build a SceneGraph, and render via CanvasKit WASM.

VS Code extensions run in two contexts: extension host (Node.js) and webviews (browser/Chromium). The engine code splits naturally: parsing/data in Node.js, rendering in webview.

Existing planning documents in `op-vs-code/` define a 5-phase roadmap. This change implements Phase 0 (PoC) and Phase 1 (MVP: Browse & Preview).

## Goals / Non-Goals

**Goals:**
- Open .fig files in VS Code as readonly custom editors with CanvasKit rendering
- Provide sidebar tree views for navigating pages and components
- Generate CSS from selected elements for copy-to-clipboard
- Auto-detect .fig files in workspace via FileSystemWatcher
- Reuse OpenPencil engine code without modifying the main codebase

**Non-Goals:**
- Editing .fig files in VS Code (readonly only)
- Design token extraction and autocomplete (Phase 2)
- Code Connect and CodeLens (Phase 3)
- Token drift detection (Phase 4)
- VS Code Web / vscode.dev support (Phase 5)
- Monorepo refactoring
- Separate sidebar WebviewViewProvider preview panel (the custom editor webview IS the preview)
- Path-based or rotation-aware hit testing (bounds-only in v1)

## Decisions

### Extension lives at `extensions/vscode/`
Separate directory within the OpenPencil repo. Own package.json, tsconfig, esbuild config. Engine code imported via esbuild alias `@/ → ../../src/`. No npm workspace or monorepo tooling needed.

Alternative: separate repository. Rejected — engine code evolves with the main app, co-location avoids version sync issues.

### esbuild with two entry points
Extension host bundle (`platform: 'node'`, `format: 'cjs'`, `external: ['vscode']`) and webview bundle (`platform: 'browser'`, `format: 'esm'`). esbuild handles the `@/` alias resolution, tree-shaking, and a copy plugin to move `canvaskit.wasm` from `node_modules/canvaskit-wasm/bin/` to `dist/`.

Alternative: webpack (VS Code's default). Rejected — esbuild is faster and already familiar from the Vite-based main project.

### CustomReadonlyEditorProvider for .fig files
.fig is binary, VS Code's TextDocument model doesn't apply. Readonly because editing requires the full OpenPencil app. This avoids implementing save/backup/undo in the extension.

Alternative: CustomEditorProvider (read-write). Rejected — editing .fig is out of scope and adds complexity.

### Single webview (custom editor), no separate preview panel
The custom editor webview renders the .fig file content with CanvasKit. There is no additional sidebar WebviewViewProvider — the editor tab IS the preview. Tree views in the sidebar (pages, components) are native VS Code TreeDataProviders, not webviews.

Alternative: separate WebviewViewProvider in sidebar for preview. Rejected — sidebar panels are small, CanvasKit needs full canvas real estate, and two webviews with CanvasKit would double memory/WASM usage.

### CanvasKit WASM loading in webview
CanvasKit WASM requires special handling in VS Code webviews:
1. `canvaskit.wasm` is copied to `dist/` by esbuild build script
2. Extension host generates the webview URI via `webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'dist', 'canvaskit.wasm'))`
3. This URI is injected into the webview HTML as a global variable
4. Webview calls `CanvasKitInit({ locateFile: () => injectedWasmUri })`
5. CSP includes `'wasm-unsafe-eval'` to allow WASM execution

Confirmed working by pixcil, crabviz, and matterviz projects.

### postMessage protocol with pagination
Extension host parses .fig → sends serialized SceneNodes to webview via postMessage. Webview renders with CanvasKit and sends back user interactions.

Serialization: only renderable properties (position, size, fills, strokes, effects, text, corners, opacity, clipping). VectorNetwork, arcData, constraints excluded. Nodes capped at 5000 per page with truncation warning.

Messages are typed discriminated unions. CanvasKit objects (Path, Paint) created in webview from the serialized data.

### retainContextWhenHidden for WebGL persistence
Custom editor webview uses `retainContextWhenHidden: true` to prevent WebGL context destruction when switching tabs. CanvasKit re-initialization is ~500ms+ and would cause jarring UX.

### Bounds-only hit testing
Hit testing checks rectangular bounds only. No support for rotation transforms, path-based testing, or nested clipping in v1. Nodes are checked in reverse paint order (topmost first). Mouse coordinates are inverse-transformed through the viewport (pan/zoom) transform.

### CSS generation scope
Handles first visible fill (solid or linear gradient), first visible stroke, DROP_SHADOW effects, text properties, and auto-layout→flexbox. Multiple fills: first visible used. Image fills: skipped with comment. No rotation/transform CSS. Pure functions, easy to test.

### Disposal via context.subscriptions
All providers, watchers, status bar items, and event listeners are pushed to `context.subscriptions` in `activate()`. VS Code automatically disposes them on deactivation. No manual cleanup needed in `deactivate()`.

### Error handling
- Corrupt .fig file: catch in `openCustomDocument`, display error HTML in webview (no CanvasKit needed)
- WebGL2 failure: display text fallback in webview
- Webview errors: sent via `{ type: 'error' }` message, logged to output channel

## Risks / Trade-offs

- **CanvasKit WASM bundle size (~5MB)**: Acceptable for desktop VS Code. Not acceptable for vscode.dev → explicitly excluded. `.vscodeignore` keeps VSIX size manageable.
- **postMessage latency for large SceneGraphs**: Mitigated by sending only current page's nodes and capping at 5000 nodes. Lazy loading deferred to future iteration.
- **Engine code coupling**: Extension imports from `../../src/`. Mitigation: engine API is stable, pre-implementation audit task verifies no Vue/DOM/Vite dependencies leak in.
- **No font loading in preview**: CanvasKit requires font files for accurate text rendering. v1 bundles Inter as fallback font. Full font matching deferred.
- **Bounds-only hit testing**: Non-rectangular shapes (ellipses, vectors) may have inaccurate selection. Acceptable for MVP — most design elements are rectangular.
