## ADDED Requirements

### Requirement: Activity Bar view container
The extension SHALL register an Activity Bar view container "OpenPencil" with a custom icon.

#### Scenario: Activity Bar presence
- **WHEN** the extension is active
- **THEN** an OpenPencil icon appears in the Activity Bar that opens the sidebar panel

### Requirement: Pages tree view
The extension SHALL provide a TreeDataProvider showing all pages (CANVAS nodes) from the currently active .fig file.

#### Scenario: Listing pages
- **WHEN** a .fig file is open
- **THEN** the Pages tree shows all CANVAS nodes by name

#### Scenario: Page selection
- **WHEN** the user clicks a page in the tree
- **THEN** the preview panel and custom editor navigate to that page

#### Scenario: No .fig file open
- **WHEN** no .fig file is open in the workspace
- **THEN** the Pages tree shows an empty state message

### Requirement: Components tree view
The extension SHALL provide a TreeDataProvider showing all COMPONENT and COMPONENT_SET nodes from the active .fig file in a hierarchical tree.

#### Scenario: Listing components
- **WHEN** a .fig file contains COMPONENT and COMPONENT_SET nodes
- **THEN** the Components tree shows them hierarchically (COMPONENT_SET as parent, variants as children)

#### Scenario: Component selection
- **WHEN** the user clicks a component in the tree
- **THEN** the preview panel navigates to and highlights that component

#### Scenario: Component context menu
- **WHEN** the user right-clicks a component in the tree
- **THEN** a context menu appears with "Copy CSS" and "Inspect" options

### Requirement: Tree view refresh on file change
The tree views SHALL refresh when the active .fig file changes or a different .fig editor becomes active.

#### Scenario: Switching between .fig files
- **WHEN** the user switches to a different .fig editor tab
- **THEN** both tree views update to reflect the new file's contents
