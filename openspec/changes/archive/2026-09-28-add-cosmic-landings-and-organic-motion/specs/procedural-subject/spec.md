# Spec Delta

## Purpose

Defines the bake subjects that are generated from the project's own equations, with no third-party model and no skinning, and with deterministic motion. It also covers the two scenes that use them: the falcon on a golden spiral (`falcon-phi`) and the whale falling toward a black hole (`whale-fall`).

## ADDED Requirements

### Requirement: Equation-generated subject
The bake SHALL accept subjects whose geometry is computed by code on every frame, with no bones. Those subjects SHALL be sampled over their surface with the same density and the same treatment as a skinned subject. The source frame SHALL still match the projection of their points. Adding this support MUST NOT change the bytes of the packs of the existing recipes.

#### Scenario: Silhouette of the computed subject
- **WHEN** a scene with a computed subject is baked and its source frames are compared with the projection of its points
- **THEN** at least 97 % of each frame's points fall inside the silhouette (±1 px) of the source frame

#### Scenario: Existing recipes intact
- **WHEN** `cat-alley` and `deer-meadow` are baked again with their default parameters after the change
- **THEN** their files have the same hash as before

### Requirement: falcon-phi scene
The `falcon-phi` recipe SHALL bake a peregrine falcon built from equations: body, head with beak, wings with primaries, and tail. The falcon SHALL travel a golden-ratio logarithmic spiral, which grows by a factor of φ every quarter turn, around a tower in a procedural night city. The scene SHALL include:
- wingbeats with an asymmetric downstroke and upstroke;
- a dive with the wings tucked into a teardrop shape;
- a pull-out from the dive.

The pack SHALL declare `synthetic: true`, weigh at most 60 MB and be deterministic.

#### Scenario: Golden spiral
- **WHEN** the horizontal distance from the falcon's center to the spiral axis is measured in two frames a quarter turn of the spiral path apart
- **THEN** the ratio between the two distances is φ ± 3 %

#### Scenario: Wings tucked in the dive
- **WHEN** the subject's wingspan at the start of the flight is compared with its wingspan in the dive segment
- **THEN** in the dive the wingspan is less than 45 % of the in-flight wingspan

### Requirement: whale-fall scene
The `whale-fall` recipe SHALL bake a whale built from equations: fusiform body, long pectoral fins and tail fluke. The whale SHALL fall in a spiral toward a black hole with Schwarzschild radius `r_s`. Its own motion (the tail beat) SHALL advance with proper time `dτ = √(1 − r_s/r) · dt`, so that its rhythm looks slower near the horizon. Its color SHALL shift toward red and dim according to the factor `√(1 − r_s/r)`. Within the clip, the whale MUST NOT cross the horizon (`r > r_s` in every frame). The environment SHALL include a star field and an accretion disk. The pack SHALL declare `synthetic: true`, weigh at most 60 MB and be deterministic.

#### Scenario: Time dilation
- **WHEN** the rhythm of the tail beat in the first second of the clip is compared with that of the last second
- **THEN** the rhythm in the last second is slower and the ratio matches (±5 %) the ratio of the `√(1 − r_s/r)` factors at those instants

#### Scenario: Never crosses
- **WHEN** the distance from the whale's center to the black hole's center is computed in every frame
- **THEN** it is always greater than `r_s`

### Requirement: Math shared between bake and page
The trajectory and time equations of each computed scene SHALL live in a single module, used by both the bake and the page. Every mathematical readout of the "NOW" that the page shows SHALL be computed with that module from the current frame. Examples: spiral angle and radius, dilation factor, proper time.

#### Scenario: Live readout
- **WHEN** time is at frame `f` and the page shows the radius and the dilation factor
- **THEN** the values match those that the shared module gives for frame `f`
