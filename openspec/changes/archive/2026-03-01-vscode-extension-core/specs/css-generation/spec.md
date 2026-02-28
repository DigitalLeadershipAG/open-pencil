## ADDED Requirements

### Requirement: CSS property extraction from SceneNode
The system SHALL generate valid CSS declarations from a SceneNode's visual properties.

#### Scenario: Basic rectangle properties
- **WHEN** a RECTANGLE node with width 200, height 100, solid fill #3B82F6, corner radius 8 is selected
- **THEN** the generated CSS contains `width: 200px; height: 100px; background: #3B82F6; border-radius: 8px;`

#### Scenario: Independent corner radii
- **WHEN** a node has independent corners (topLeft: 4, topRight: 8, bottomRight: 12, bottomLeft: 0)
- **THEN** the CSS uses `border-radius: 4px 8px 12px 0px;`

#### Scenario: Border/stroke properties
- **WHEN** a node has a stroke with color #E5E7EB, weight 1, align INSIDE
- **THEN** the CSS contains `border: 1px solid #E5E7EB;` and uses `box-sizing: border-box;`

#### Scenario: Drop shadow effect
- **WHEN** a node has a DROP_SHADOW effect with offset (0, 4), radius 6, color rgba(0,0,0,0.1)
- **THEN** the CSS contains `box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1);`

#### Scenario: Text properties
- **WHEN** a TEXT node has fontFamily "Inter", fontSize 16, fontWeight 600, lineHeight 24
- **THEN** the CSS contains `font-family: 'Inter'; font-size: 16px; font-weight: 600; line-height: 24px;`

#### Scenario: Opacity
- **WHEN** a node has opacity 0.5
- **THEN** the CSS contains `opacity: 0.5;`

### Requirement: Auto-layout to flexbox
The system SHALL convert auto-layout properties to CSS flexbox declarations.

#### Scenario: Horizontal auto-layout
- **WHEN** a FRAME has layoutMode HORIZONTAL, itemSpacing 8, primaryAxisAlign CENTER, paddingTop/Right/Bottom/Left 16
- **THEN** the CSS contains `display: flex; flex-direction: row; gap: 8px; justify-content: center; padding: 16px;`

#### Scenario: Vertical auto-layout
- **WHEN** a FRAME has layoutMode VERTICAL
- **THEN** the CSS contains `display: flex; flex-direction: column;`

### Requirement: Copy CSS command
The extension SHALL provide a command `openPencil.copyCSS` that copies the generated CSS to the clipboard.

#### Scenario: Copy CSS for selected node
- **WHEN** a node is selected and the user invokes "Copy CSS"
- **THEN** the CSS string is copied to the system clipboard and a notification confirms the action

#### Scenario: No node selected
- **WHEN** no node is selected and the user invokes "Copy CSS"
- **THEN** a warning message indicates that no element is selected

### Requirement: Gradient fill CSS
The system SHALL convert gradient fills to CSS gradient declarations.

#### Scenario: Linear gradient
- **WHEN** a node has a GRADIENT_LINEAR fill with two stops
- **THEN** the CSS contains a `background: linear-gradient(...)` with correct angle and color stops
