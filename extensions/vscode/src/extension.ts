import * as vscode from 'vscode'
import { FigEditorProvider } from './fig-editor-provider'
import { PagesTreeProvider } from './sidebar/pages-tree'
import { ComponentsTreeProvider } from './sidebar/components-tree'
import { generateCSS } from './css-generator'

let figFileUris: vscode.Uri[] = []
let inspectChannel: vscode.OutputChannel | null = null

export function activate(context: vscode.ExtensionContext): void {
  const output = vscode.window.createOutputChannel('OpenPencil')
  const pagesTree = new PagesTreeProvider()
  const componentsTree = new ComponentsTreeProvider()
  const editorProvider = new FigEditorProvider(context.extensionUri, output)

  context.subscriptions.push(
    output,
    editorProvider,
    FigEditorProvider.register(context, editorProvider),
    vscode.window.registerTreeDataProvider('openPencil.pages', pagesTree),
    vscode.window.registerTreeDataProvider('openPencil.components', componentsTree)
  )

  context.subscriptions.push(
    editorProvider.onDidChangeDocument((graph) => {
      pagesTree.setGraph(graph)
      componentsTree.setGraph(graph)
    })
  )

  context.subscriptions.push(
    vscode.commands.registerCommand('openPencil.openFile', async () => {
      if (figFileUris.length === 0) {
        vscode.window.showInformationMessage('No .fig files found in workspace.')
        return
      }

      const items = figFileUris.map((uri) => ({
        label: vscode.workspace.asRelativePath(uri),
        uri
      }))

      const picked = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select a .fig file to open'
      })

      if (picked) {
        await vscode.commands.executeCommand('vscode.openWith', picked.uri, 'openPencil.figEditor')
      }
    })
  )

  context.subscriptions.push(
    vscode.commands.registerCommand('openPencil.copyCSS', () => {
      const node = editorProvider.getSelectedNode()
      if (!node) {
        vscode.window.showWarningMessage('OpenPencil: No element selected.')
        return
      }
      const css = generateCSS(node)
      vscode.env.clipboard.writeText(css)
      vscode.window.showInformationMessage('CSS copied to clipboard.')
    })
  )

  context.subscriptions.push(
    vscode.commands.registerCommand('openPencil.inspect', (nodeId?: string) => {
      const id = nodeId ?? editorProvider.currentSelectedNodeId
      if (!id) {
        vscode.window.showWarningMessage('OpenPencil: No element selected.')
        return
      }
      editorProvider.selectNode(id)
      const node = editorProvider.getSelectedNode()
      if (node) {
        const css = generateCSS(node)
        if (!inspectChannel) {
          inspectChannel = vscode.window.createOutputChannel('OpenPencil Inspect')
        }
        inspectChannel.clear()
        inspectChannel.appendLine(`/* ${node.name} (${node.type}) */`)
        inspectChannel.appendLine(css)
        inspectChannel.show(true)
      }
    })
  )

  context.subscriptions.push(
    vscode.commands.registerCommand('openPencil.selectPage', (pageId: string) => {
      editorProvider.selectPage(pageId)
    })
  )

  context.subscriptions.push(
    vscode.commands.registerCommand('openPencil.selectNode', (nodeId: string) => {
      editorProvider.selectNode(nodeId)
    })
  )

  context.subscriptions.push(
    vscode.window.onDidChangeActiveColorTheme((theme) => {
      const themeKind = theme.kind === vscode.ColorThemeKind.Dark ? 'dark' : 'light'
      editorProvider.sendTheme(themeKind)
    })
  )

  const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100)
  statusBar.command = 'openPencil.openFile'
  context.subscriptions.push(statusBar)

  const watcher = vscode.workspace.createFileSystemWatcher('**/*.fig')
  context.subscriptions.push(watcher)

  async function refreshFigFiles(): Promise<void> {
    figFileUris = await vscode.workspace.findFiles('**/*.fig')
    const count = figFileUris.length
    if (count > 0) {
      statusBar.text = `$(paintcan) OpenPencil: ${count} file${count === 1 ? '' : 's'}`
      statusBar.show()
    } else {
      statusBar.hide()
    }
  }

  context.subscriptions.push(
    watcher.onDidCreate(() => refreshFigFiles()),
    watcher.onDidDelete(() => refreshFigFiles()),
    watcher.onDidChange(async (uri) => {
      await editorProvider.reloadDocument(uri)
    })
  )

  refreshFigFiles()
}

export function deactivate(): void {
  inspectChannel?.dispose()
  inspectChannel = null
  figFileUris = []
}
