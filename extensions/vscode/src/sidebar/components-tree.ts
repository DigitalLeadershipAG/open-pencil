import * as vscode from 'vscode'
import type { SceneGraph, SceneNode } from '@/engine/scene-graph'

export class ComponentsTreeProvider implements vscode.TreeDataProvider<SceneNode> {
  private _onDidChangeTreeData = new vscode.EventEmitter<SceneNode | undefined>()
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event

  private graph: SceneGraph | null = null

  setGraph(graph: SceneGraph | null): void {
    this.graph = graph
    this._onDidChangeTreeData.fire(undefined)
  }

  getTreeItem(element: SceneNode): vscode.TreeItem {
    const hasChildren =
      element.type === 'COMPONENT_SET' &&
      element.childIds.some((id) => {
        const child = this.graph?.getNode(id)
        return child?.type === 'COMPONENT'
      })

    const item = new vscode.TreeItem(
      element.name,
      hasChildren ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None
    )
    item.iconPath = new vscode.ThemeIcon('symbol-misc')
    item.contextValue = 'openPencilComponent'
    item.command = {
      command: 'openPencil.selectNode',
      title: 'Select Component',
      arguments: [element.id]
    }
    return item
  }

  getChildren(element?: SceneNode): SceneNode[] {
    if (!this.graph) return []

    if (element) {
      if (element.type !== 'COMPONENT_SET') return []
      return this.graph
        .getChildren(element.id)
        .filter((n) => n.type === 'COMPONENT')
    }

    return this.findComponents()
  }

  private findComponents(): SceneNode[] {
    if (!this.graph) return []

    const result: SceneNode[] = []
    for (const node of this.graph.nodes.values()) {
      if (node.type === 'COMPONENT_SET') {
        result.push(node)
      } else if (node.type === 'COMPONENT' && !this.isInsideComponentSet(node)) {
        result.push(node)
      }
    }
    return result.sort((a, b) => a.name.localeCompare(b.name))
  }

  private isInsideComponentSet(node: SceneNode): boolean {
    if (!node.parentId || !this.graph) return false
    const parent = this.graph.getNode(node.parentId)
    return parent?.type === 'COMPONENT_SET'
  }
}
