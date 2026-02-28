import * as vscode from 'vscode'
import type { SceneGraph, SceneNode } from '@/engine/scene-graph'

export class PagesTreeProvider implements vscode.TreeDataProvider<SceneNode> {
  private _onDidChangeTreeData = new vscode.EventEmitter<SceneNode | undefined>()
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event

  private graph: SceneGraph | null = null

  setGraph(graph: SceneGraph | null): void {
    this.graph = graph
    this._onDidChangeTreeData.fire(undefined)
  }

  getTreeItem(element: SceneNode): vscode.TreeItem {
    const item = new vscode.TreeItem(element.name, vscode.TreeItemCollapsibleState.None)
    item.iconPath = new vscode.ThemeIcon('file')
    item.command = {
      command: 'openPencil.selectPage',
      title: 'Select Page',
      arguments: [element.id]
    }
    return item
  }

  getChildren(): SceneNode[] {
    if (!this.graph) return []
    return this.graph.getPages()
  }
}
