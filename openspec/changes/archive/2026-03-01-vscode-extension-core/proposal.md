## Why

Developers need to browse .fig design files directly inside VS Code without switching to a separate app. OpenPencil already has a fully reusable engine (scene-graph, Kiwi codec, color utils) with zero Vue/DOM dependencies — this code can power a VS Code extension that opens .fig files as readonly custom editors, renders previews via CanvasKit WASM in webviews, and exposes design structure through sidebar tree views. This covers Phase 0 (PoC) and Phase 1 (MVP: Browse & Preview) of the op-vs-code roadmap.

## What Changes

- New VS Code extension scaffold at `extensions/vscode/` with package.json manifest, esbuild build system, and two entry points (extension host + webview)
- `CustomReadonlyEditorProvider` to open .fig files — parses via Kiwi codec in Node.js extension host, renders in CanvasKit webview
- Activity Bar view container "OpenPencil" with sidebar tree views: Pages (CANVAS nodes) and Components (COMPONENT/COMPONENT_SET nodes)
- WebviewViewProvider for preview panel — CanvasKit WASM renderer with pan/zoom and node selection
- postMessage protocol between extension host and webview for rendering commands and user interactions
- CSS generation from selected SceneNode properties (position, size, colors, border-radius, typography)
- FileSystemWatcher for .fig file auto-detection in workspace
- StatusBarItem showing count of detected .fig files
- Commands: open file, copy CSS, inspect element

## Capabilities

### New Capabilities
- `vscode-extension`: VS Code extension scaffold, activation, build system, manifest, and core infrastructure
- `fig-editor`: CustomReadonlyEditorProvider for opening and rendering .fig files in VS Code
- `sidebar-trees`: Activity Bar view container with Pages and Components TreeDataProviders
- `webview-preview`: CanvasKit WASM preview panel with pan/zoom and node selection
- `css-generation`: CSS property extraction from SceneNode for copy-to-clipboard

### Modified Capabilities

## Impact

- New directory `extensions/vscode/` with its own package.json, tsconfig, esbuild config
- Engine code (`src/engine/`, `src/kiwi/`, `src/types.ts`) imported via esbuild alias — no modifications to existing source
- New dev dependencies: `@types/vscode`, `esbuild`
- CanvasKit WASM bundled into webview dist (~5MB)
- Desktop VS Code only (no vscode.dev support)
