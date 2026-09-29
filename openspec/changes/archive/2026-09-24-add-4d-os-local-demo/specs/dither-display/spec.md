# Spec Delta

## Purpose

Gives the 4D scene the look of a real-time retro display: low resolution, a limited dithered palette and crisp pixels. It includes a color depth selector that the visitor operates like an operating-system monitor panel.

## ADDED Requirements

### Requirement: Color depth selector
The display SHALL offer three modes:
- **`1-bit`:** exactly two colors;
- **`16 colors`:** up to sixteen colors;
- **`Millions`:** no color quantization, at full resolution.

The default mode SHALL be `16 colors`.

#### Scenario: 1-bit mode
- **WHEN** the visitor chooses `1-bit`
- **THEN** the viewer region contains exactly two distinct colors, not counting overlapping windows

#### Scenario: 16 colors mode
- **WHEN** the mode is `16 colors`
- **THEN** the viewer region contains at most sixteen distinct colors

#### Scenario: Millions mode
- **WHEN** the visitor chooses `Millions`
- **THEN** the scene is shown without color quantization or dithering, at the device resolution

### Requirement: Crisp pixels
In the quantized modes, the scene SHALL be rendered at a fraction of the screen resolution and upscaled without smoothing, so that each render pixel appears as a square block with crisp edges.

#### Scenario: Upscaling
- **WHEN** the resolution fraction is 1/3 and the mode is `16 colors`
- **THEN** each render pixel occupies a 3×3 block of screen pixels of the same color

### Requirement: Palettes defined by the design system
The colors of each quantized mode SHALL come from the design system tokens, so that changing the tokens changes the output without modifying the render logic.

#### Scenario: Token change
- **WHEN** a palette color is modified in the tokens
- **THEN** the viewer uses the new color on the next render

### Requirement: Stable fade
Density fades (trail, future, dimmed background) SHALL be stable per point: moving the camera without changing the time MUST NOT make trail points appear or disappear.

#### Scenario: Orbiting on HOLD
- **WHEN** playback is on HOLD and the visitor orbits the camera
- **THEN** the set of visible trail points stays the same throughout the orbit

### Requirement: Immediate mode change
Changing the display mode SHALL take effect on the next rendered frame without reloading the scene data.

#### Scenario: Toggling modes
- **WHEN** the visitor switches from `16 colors` to `Millions` and back
- **THEN** each change shows on the next frame and there are no point data transfers
