## ADDED Requirements

### Requirement: The authoring tool directs isolated verification to the preview route

After scaffolding and registering a tile, the authoring tool SHALL direct the author
to verify the tile at its single-tile preview route (`/thingies/<id>`), where the tile
renders in isolation, rather than to locating the tile among the placed tiles on the
canvas. The guidance SHALL reference the scaffolded tile's own id.

#### Scenario: The tool reports the tile's preview URL

- **WHEN** the authoring tool finishes scaffolding and registering a tile
- **THEN** it tells the author the tile's preview route for that tile's id
- **AND** it does not instruct the author to hunt for the tile on the canvas
