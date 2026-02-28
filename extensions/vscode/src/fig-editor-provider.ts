import * as vscode from 'vscode'
import { parseFigFile } from '@/kiwi/fig-file'
import type { SceneGraph, SceneNode } from '@/engine/scene-graph'
import { serializePage } from './protocol'
import type { ExtensionMessage, WebviewMessage } from './protocol'

interface FigDocument extends vscode.CustomDocument {
  graph: SceneGraph | null
  readonly error: string | null
}

class FigDocumentImpl implements FigDocument {
  graph: SceneGraph | null
  constructor(
    readonly uri: vscode.Uri,
    graph: SceneGraph | null,
    readonly error: string | null
  ) {
    this.graph = graph
  }

  dispose(): void {
    this.graph = null
  }
}

export class FigEditorProvider implements vscode.CustomReadonlyEditorProvider<FigDocument> {
  private static readonly VIEW_TYPE = 'openPencil.figEditor'

  private activeWebview: vscode.Webview | null = null
  private activeDocument: FigDocument | null = null
  private selectedNodeId: string | null = null
  private activePageId: string | null = null
  private readonly documentWebviews = new Map<string, vscode.Webview>()
  private readonly documentStore = new Map<string, FigDocument>()

  private readonly _onDidChangeSelection = new vscode.EventEmitter<string | null>()
  readonly onDidChangeSelection = this._onDidChangeSelection.event

  private readonly _onDidChangeDocument = new vscode.EventEmitter<SceneGraph | null>()
  readonly onDidChangeDocument = this._onDidChangeDocument.event

  private readonly output: vscode.OutputChannel

  constructor(
    private readonly extensionUri: vscode.Uri,
    output: vscode.OutputChannel
  ) {
    this.output = output
  }

  dispose(): void {
    this._onDidChangeSelection.dispose()
    this._onDidChangeDocument.dispose()
    this.documentWebviews.clear()
    this.documentStore.clear()
    this.activeDocument = null
    this.activeWebview = null
  }

  static register(
    context: vscode.ExtensionContext,
    provider: FigEditorProvider
  ): vscode.Disposable {
    return vscode.window.registerCustomEditorProvider(
      FigEditorProvider.VIEW_TYPE,
      provider,
      {
        webviewOptions: { retainContextWhenHidden: true },
        supportsMultipleEditorsPerDocument: false
      }
    )
  }

  get currentGraph(): SceneGraph | null {
    return this.activeDocument?.graph ?? null
  }

  get currentSelectedNodeId(): string | null {
    return this.selectedNodeId
  }

  getSelectedNode(): SceneNode | undefined {
    if (!this.selectedNodeId || !this.activeDocument?.graph) return undefined
    return this.activeDocument.graph.getNode(this.selectedNodeId)
  }

  selectPage(pageId: string): void {
    if (!this.activeDocument?.graph || !this.activeWebview) return
    this.activePageId = pageId
    this.sendPage(this.activeWebview, this.activeDocument.graph, pageId)
  }

  async reloadDocument(uri: vscode.Uri): Promise<void> {
    const uriStr = uri.toString()
    const webview = this.documentWebviews.get(uriStr)
    if (!webview) return

    try {
      const data = await vscode.workspace.fs.readFile(uri)
      const graph = await parseFigFile(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength))
      const newDoc = new FigDocumentImpl(uri, graph, null)
      this.documentStore.set(uriStr, newDoc)

      const isActive = this.activeDocument?.uri.toString() === uriStr
      if (isActive) {
        this.activeDocument = newDoc
        this._onDidChangeDocument.fire(graph)
      }

      const pages = graph.getPages()
      const pageId = this.activePageId && graph.getNode(this.activePageId)
        ? this.activePageId
        : pages[0]?.id
      if (pageId) {
        this.sendPage(webview, graph, pageId)
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      vscode.window.showErrorMessage(`OpenPencil: Failed to reload ${uri.fsPath}: ${message}`)
    }
  }

  sendTheme(theme: 'light' | 'dark'): void {
    if (!this.activeWebview) return
    const msg: ExtensionMessage = { type: 'set-theme', theme }
    this.activeWebview.postMessage(msg)
  }

  selectNode(nodeId: string): void {
    if (!this.activeWebview) return
    this.selectedNodeId = nodeId
    this._onDidChangeSelection.fire(nodeId)
    const msg: ExtensionMessage = { type: 'select-node', nodeId }
    this.activeWebview.postMessage(msg)
  }

  async openCustomDocument(uri: vscode.Uri): Promise<FigDocument> {
    this.output.appendLine(`Opening: ${uri.fsPath}`)
    try {
      const data = await vscode.workspace.fs.readFile(uri)
      this.output.appendLine(`File size: ${data.byteLength} bytes`)
      const graph = await parseFigFile(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength))
      const pages = graph.getPages()
      this.output.appendLine(`Parsed: ${pages.length} pages`)
      return new FigDocumentImpl(uri, graph, null)
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      this.output.appendLine(`Parse error: ${message}`)
      return new FigDocumentImpl(uri, null, message)
    }
  }

  resolveCustomEditor(
    document: FigDocument,
    webviewPanel: vscode.WebviewPanel,
    token: vscode.CancellationToken
  ): void {
    if (token.isCancellationRequested) return

    const docKey = document.uri.toString()
    this.documentStore.set(docKey, document)
    this.activeDocument = document
    this.activeWebview = webviewPanel.webview
    this._onDidChangeDocument.fire(document.graph)

    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, 'dist')]
    }

    this.documentWebviews.set(docKey, webviewPanel.webview)

    const panelDisposables: vscode.Disposable[] = []

    webviewPanel.onDidDispose(() => {
      this.documentWebviews.delete(docKey)
      this.documentStore.delete(docKey)
      if (this.activeDocument?.uri.toString() === docKey) {
        this.activeDocument = null
        this.activeWebview = null
        this._onDidChangeDocument.fire(null)
      }
      for (const d of panelDisposables) d.dispose()
    })

    webviewPanel.webview.html = this.getWebviewHtml(webviewPanel.webview, document)

    panelDisposables.push(
      webviewPanel.webview.onDidReceiveMessage((msg: WebviewMessage) => {
        const currentDoc = this.documentStore.get(docKey)
        switch (msg.type) {
          case 'ready':
            if (currentDoc) {
              this.onWebviewReady(webviewPanel.webview, currentDoc)
            }
            break
          case 'node-clicked':
            this.selectedNodeId = msg.nodeId
            this._onDidChangeSelection.fire(msg.nodeId)
            break
          case 'error':
            this.output.appendLine(`Webview error: ${msg.message}`)
            vscode.window.showErrorMessage(`OpenPencil: ${msg.message}`)
            break
        }
      })
    )

    panelDisposables.push(
      webviewPanel.onDidChangeViewState(() => {
        if (webviewPanel.active) {
          const currentDoc = this.documentStore.get(docKey)
          if (currentDoc) {
            this.activeDocument = currentDoc
            this.activeWebview = webviewPanel.webview
            this._onDidChangeDocument.fire(currentDoc.graph)
          }
        }
      })
    )
  }

  private onWebviewReady(webview: vscode.Webview, document: FigDocument): void {
    this.output.appendLine('Webview ready')

    if (document.error) {
      this.output.appendLine(`Document has error, skipping: ${document.error}`)
      return
    }

    if (!document.graph) {
      this.output.appendLine('No graph available')
      return
    }

    const pages = document.graph.getPages()
    this.output.appendLine(`Sending first page (${pages.length} pages total)`)
    if (pages.length === 0) return

    const firstPage = pages[0]
    this.activePageId = firstPage.id
    this.sendPage(webview, document.graph, firstPage.id)

    const theme = vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark
      ? 'dark' : 'light'
    const themeMsg: ExtensionMessage = { type: 'set-theme', theme }
    webview.postMessage(themeMsg)
  }

  private sendPage(webview: vscode.Webview, graph: SceneGraph, pageId: string): void {
    const { nodes, images, truncated } = serializePage(graph, pageId)
    const imageCount = Object.keys(images).length
    this.output.appendLine(`Sending render-page: ${nodes.length} nodes, ${imageCount} images, pageId=${pageId}`)
    const msg: ExtensionMessage = { type: 'render-page', pageId, nodes, images }
    webview.postMessage(msg)

    if (truncated) {
      vscode.window.showWarningMessage(
        'OpenPencil: Page has too many nodes. Showing first 5000.'
      )
    }
  }

  private getWebviewHtml(webview: vscode.Webview, doc: FigDocument): string {
    const nonce = crypto.randomUUID()

    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview.js')
    )
    const wasmUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'dist', 'canvaskit.wasm')
    )
    const fontUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'dist', 'Inter-Regular.ttf')
    )
    const cspSource = webview.cspSource

    this.output.appendLine(`Script URI: ${scriptUri.toString()}`)
    this.output.appendLine(`WASM URI: ${wasmUri.toString()}`)
    this.output.appendLine(`CSP source: ${cspSource}`)

    if (doc.error) {
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}';">
  <style nonce="${nonce}">
    body { display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;
           font-family: var(--vscode-font-family); color: var(--vscode-errorForeground); }
    .error { text-align: center; max-width: 400px; }
    h2 { margin-bottom: 8px; }
    p { color: var(--vscode-descriptionForeground); word-break: break-word; }
  </style>
</head>
<body>
  <div class="error">
    <h2>Failed to open .fig file</h2>
    <p>${this.escapeHtml(doc.error)}</p>
  </div>
</body>
</html>`
    }

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}' 'wasm-unsafe-eval'; style-src 'nonce-${nonce}' ${cspSource}; img-src ${cspSource} blob:; connect-src ${cspSource};">
  <style nonce="${nonce}">
    html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; position: relative; }
    #canvas { display: block; width: 100%; height: 100%; }
    #status { display: flex; align-items: center; justify-content: center;
              position: absolute; inset: 0; z-index: 1;
              font-family: var(--vscode-font-family); color: var(--vscode-descriptionForeground);
              font-size: 13px; background: var(--vscode-editor-background, #1e1e1e); }
  </style>
</head>
<body>
  <div id="status">Loading OpenPencil…</div>
  <canvas id="canvas"></canvas>
  <script nonce="${nonce}">
    window.__CANVASKIT_WASM_URI__ = ${JSON.stringify(wasmUri.toString())};
    window.__FONT_URI__ = ${JSON.stringify(fontUri.toString())};
  </script>
  <script nonce="${nonce}" type="module" src="${scriptUri}" onerror="document.getElementById('status').textContent='Failed to load extension script'"></script>
</body>
</html>`
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }
}
