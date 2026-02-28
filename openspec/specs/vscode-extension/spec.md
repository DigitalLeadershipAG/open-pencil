## ADDED Requirements

### Requirement: Extension scaffold
The extension SHALL live at `extensions/vscode/` with its own `package.json`, `tsconfig.json`, and `esbuild.mjs` build config.

#### Scenario: Extension directory structure
- **WHEN** the extension is built
- **THEN** it produces `dist/extension.js` (Node.js, CJS) and `dist/webview.js` (browser, ESM)

#### Scenario: Engine code import
- **WHEN** extension source imports from `@/engine/` or `@/kiwi/`
- **THEN** esbuild resolves the alias to `../../src/` and bundles the code without modifications to the main project

### Requirement: Extension activation
The extension SHALL activate on `onCustomEditor:openPencil.figEditor` and `workspaceContains:**/*.fig`.

#### Scenario: Activation on .fig file open
- **WHEN** a user opens a .fig file in VS Code
- **THEN** the extension activates and registers all providers

#### Scenario: Activation on workspace containing .fig files
- **WHEN** VS Code opens a workspace containing .fig files
- **THEN** the extension activates to enable file watching and status bar

### Requirement: Extension manifest
The `package.json` SHALL declare contribution points for: customEditors, viewsContainers, views, commands, and configuration.

#### Scenario: Manifest validity
- **WHEN** the extension is packaged
- **THEN** VS Code accepts the manifest without warnings about missing or invalid contribution points

### Requirement: Build system
The extension SHALL use esbuild with two entry points and the `@/` alias. The `vscode` module SHALL be external in the Node.js bundle.

#### Scenario: Production build
- **WHEN** `bun run build` is executed in `extensions/vscode/`
- **THEN** esbuild produces minified bundles and copies `canvaskit.wasm` to `dist/`

### Requirement: Extension deactivation
The `deactivate` export SHALL dispose all watchers, providers, and subscriptions.

#### Scenario: Clean deactivation
- **WHEN** the extension is deactivated
- **THEN** all FileSystemWatchers, TreeDataProviders, and StatusBarItems are disposed without leaks
