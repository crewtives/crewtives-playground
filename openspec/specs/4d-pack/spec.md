# 4d-pack Specification

## Purpose

Defines the 4D pack that the viewer consumes: a scene reconstructed in space and time, with its static background, its per-frame subject, its cameras and its source frames. It is the common contract between the synthetic bake and a future real pipeline.

## Requirements

### Requirement: Pack structure
A 4D pack SHALL consist of scene metadata, a static layer, a dynamic layer and the source frames.

The metadata SHALL declare:
- format version;
- `synthetic` flag;
- fps and frame count;
- spatial quantization bounds;
- the camera of each frame (position, orientation, field of view and aspect ratio);
- point count per layer;
- source frame dimensions.

#### Scenario: Valid pack
- **WHEN** the viewer loads a pack whose metadata and layers are consistent
- **THEN** the scene is shown with exactly the number of points and frames declared in the metadata

#### Scenario: One camera per frame
- **WHEN** the metadata of a valid pack is inspected
- **THEN** there is exactly one camera for each declared frame

### Requirement: Dynamic layer ordered by frame
The points of the dynamic layer SHALL be grouped contiguously by frame, in increasing order, and accompanied by an offset table with `frameCount + 1` entries. Each point SHALL carry the index of the frame it belongs to.

#### Scenario: Consistent offset table
- **WHEN** the dynamic layer of a valid pack is read
- **THEN** the first offset is 0, the last one equals the total number of dynamic points, the table is non-decreasing and every point between `offset[f]` and `offset[f+1]` declares frame `f`

### Requirement: Validation on load
The loader MUST reject a pack with an incorrect format identifier, an unsupported version or counts that are inconsistent between metadata and layers, and SHALL report the reason in the interface instead of showing an empty scene.

#### Scenario: Incorrect identifier
- **WHEN** the dynamic layer does not start with the expected format identifier
- **THEN** loading stops and the boot window shows an error that names the layer and the reason

#### Scenario: Inconsistent count
- **WHEN** the number of points in a layer differs from the number declared in the metadata
- **THEN** loading stops with an error that states both values

### Requirement: Real load progress
The load progress reported to the interface SHALL reflect the bytes of the pack actually received.

#### Scenario: Proportional progress
- **WHEN** half of the pack's total bytes have been received
- **THEN** the reported progress is 50% (±5%)

### Requirement: Independence from the data source
The viewer's behavior MUST be identical for synthetic and real packs. The only difference SHALL be a visible label when the pack declares `synthetic: true`.

#### Scenario: Synthetic pack
- **WHEN** a pack with `synthetic: true` is loaded
- **THEN** the interface shows a visible "synthetic" label next to the scene

#### Scenario: Real pack
- **WHEN** a pack with `synthetic: false` is loaded
- **THEN** the label is not shown and the rest of the interface and of the render is the same

### Requirement: Point correspondence between frames
A pack MAY declare in its metadata that its dynamic layer has correspondence between frames. That means:
- all frames have the same number of points;
- point `i` of every frame represents the same place on the subject's surface.

The loader SHALL reject a pack that declares correspondence but has frames with different numbers of points, and SHALL report both values. A pack without that declaration SHALL remain valid and behave as it did until now.

#### Scenario: Declared correspondence
- **WHEN** a pack declares correspondence and all its frames have `N` points
- **THEN** the loader accepts it and exposes that there is correspondence with `N` points per frame

#### Scenario: Inconsistent correspondence
- **WHEN** a pack declares correspondence but two frames have different numbers of points
- **THEN** loading stops with an error that names the frame and the two counts

#### Scenario: Older pack
- **WHEN** a pack without the correspondence declaration is loaded
- **THEN** it loads as before and the viewer does not interpolate
