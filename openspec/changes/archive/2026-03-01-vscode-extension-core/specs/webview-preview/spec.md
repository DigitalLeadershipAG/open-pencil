## ADDED Requirements

### Requirement: CanvasKit WASM initialization in webview
The webview SHALL load CanvasKit WASM with CSP policy including `'wasm-unsafe-eval'` and nonce-based script loading.

#### Scenario: Successful CanvasKit init
- **WHEN** the webview is created
- **THEN** CanvasKit WASM initializes and creates a WebGL2 surface on a canvas element

#### Scenario: WebGL context failure
- **WHEN** WebGL2 context cannot be created
- **THEN** the webview displays a fallback error message explaining the limitation

### Requirement: Node rendering
The webview SHALL render SceneNodes received from the extension host, supporting fills (solid, gradient), strokes, corner radius, opacity, text, and clipping.

#### Scenario: Rendering a rectangle with fills
- **WHEN** the extension sends a RECTANGLE node with solid fill
- **THEN** the webview renders it at the correct position, size, and color

#### Scenario: Rendering nested frames
- **WHEN** a FRAME contains child nodes
- **THEN** children render at correct relative positions within the frame

#### Scenario: Clipping content
- **WHEN** a FRAME has `clipsContent: true`
- **THEN** child nodes outside the frame bounds are clipped

### Requirement: Pan and zoom navigation
The webview SHALL support pan (mouse drag / middle-click) and zoom (scroll wheel / pinch) for navigating the canvas.

#### Scenario: Zoom with scroll wheel
- **WHEN** the user scrolls the mouse wheel
- **THEN** the canvas zooms in/out centered on the cursor position

#### Scenario: Pan with middle mouse or space+drag
- **WHEN** the user middle-clicks and drags, or holds space and drags
- **THEN** the canvas pans in the drag direction

### Requirement: Node selection
The webview SHALL support clicking on rendered nodes to select them, highlighting the selected node with a selection border.

#### Scenario: Click to select
- **WHEN** the user clicks on a rendered node
- **THEN** the node gets a selection border and the extension host is notified via postMessage

#### Scenario: Click empty area
- **WHEN** the user clicks on an empty area of the canvas
- **THEN** the current selection is cleared

### Requirement: postMessage communication protocol
The webview SHALL communicate with the extension host using typed postMessage events.

#### Scenario: Extension sends render command
- **WHEN** the extension host sends `{ type: 'render-page', pageId, nodes }` 
- **THEN** the webview clears and renders all provided nodes

#### Scenario: Webview reports ready
- **WHEN** CanvasKit finishes initialization
- **THEN** the webview sends `{ type: 'ready' }` to the extension host

#### Scenario: Webview reports node click
- **WHEN** the user clicks a node
- **THEN** the webview sends `{ type: 'node-clicked', nodeId }` to the extension host

### Requirement: Theme awareness
The webview SHALL adapt its background color to match VS Code's current theme (light/dark).

#### Scenario: Dark theme
- **WHEN** VS Code is using a dark theme
- **THEN** the webview canvas background uses a dark color

#### Scenario: Theme change
- **WHEN** the user switches VS Code theme
- **THEN** the extension sends `{ type: 'set-theme', theme }` and the webview updates its background
