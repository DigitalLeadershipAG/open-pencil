## ADDED Requirements

### Requirement: Custom readonly editor for .fig files
The extension SHALL register a `CustomReadonlyEditorProvider` with viewType `openPencil.figEditor` that handles `*.fig` files.

#### Scenario: Opening a .fig file
- **WHEN** a user opens a .fig file in VS Code
- **THEN** the extension parses the file using the Kiwi codec and displays the design in a webview panel

#### Scenario: Invalid .fig file
- **WHEN** a user opens a corrupted or invalid .fig file
- **THEN** the extension displays an error message in the webview instead of crashing

### Requirement: .fig parsing in extension host
The extension SHALL parse .fig files using the existing `parseFigFile` function from `src/kiwi/fig-file.ts` in the Node.js extension host context.

#### Scenario: Kiwi codec in Node.js
- **WHEN** a .fig file is read via `vscode.workspace.fs.readFile`
- **THEN** the buffer is passed to `parseFigFile` which returns a `SceneGraph` with all pages and nodes

### Requirement: Page navigation in editor
The editor SHALL allow switching between pages (CANVAS nodes) in the .fig file.

#### Scenario: Multi-page .fig file
- **WHEN** a .fig file contains multiple pages
- **THEN** the user can switch between pages and the webview renders the selected page's content

### Requirement: FileSystemWatcher for .fig files
The extension SHALL watch for .fig file creation, modification, and deletion in the workspace.

#### Scenario: .fig file modified externally
- **WHEN** a .fig file is modified outside VS Code
- **THEN** the extension re-parses it and updates any open editors and tree views

#### Scenario: .fig file created
- **WHEN** a new .fig file appears in the workspace
- **THEN** the status bar count updates and tree views refresh

### Requirement: Status bar item
The extension SHALL display a status bar item showing the count of .fig files in the workspace.

#### Scenario: Status bar display
- **WHEN** the workspace contains .fig files
- **THEN** the status bar shows "◆ OpenPencil: N files" with the correct count

#### Scenario: Status bar click
- **WHEN** the user clicks the status bar item
- **THEN** a quick pick menu shows all detected .fig files for opening
