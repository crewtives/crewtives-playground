# Spec Delta

## ADDED Requirements

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
