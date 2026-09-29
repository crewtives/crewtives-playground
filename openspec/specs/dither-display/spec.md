# dither-display Specification

## Purpose

Gives the 4D scene the look of a real-time retro display: low resolution, a limited dithered palette and crisp pixels. It includes a color depth selector that the visitor operates like an operating-system monitor panel.

## Requirements

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

### Requirement: Optional shape mask
The display of each view SHALL accept an optional shape mask:
- **ellipse:** inscribed in the view's rectangle;
- **rounded rectangle:** the size of the view, with the corner radius given in CSS pixels.

Inside the mask, the display SHALL behave the same as without it: mode, palette, crisp pixels, fades and entrance dissolve. Outside the mask, the display MUST NOT paint anything, and the page underneath SHALL show through there, as if the view did not exist. Changing the display mode SHALL keep the mask.

By default there is no mask. Without a mask, the output SHALL be byte-for-byte identical to the output before this change, so that 4D.OS looks the same.

#### Scenario: No mask
- **WHEN** a view is rendered without a mask with the same scene, the same mode, the same size and the same frame as before the change
- **THEN** its pixels are byte-for-byte identical to those from before the change

#### Scenario: 4D.OS unchanged
- **WHEN** `/4d-os/` and `/4d-os/a/` through `/4d-os/e/` are opened after the change
- **THEN** the viewers look the same as before, because none of them uses a mask

#### Scenario: Ellipse in a square view
- **WHEN** a square view uses the ellipse mask
- **THEN** the display paints only the inscribed circle, and in the four corners the pixels of the page underneath show unchanged

#### Scenario: Rounded rectangle
- **WHEN** a view uses the rounded-rectangle mask with a radius of 24 px
- **THEN** outside the 24 px arcs at each corner the page underneath shows through, and the rest of the view shows the display

#### Scenario: 1-bit with mask
- **WHEN** the mode is `1-bit` and the view uses a mask
- **THEN** inside the mask there are exactly two distinct colors, and outside it the page shows unchanged

#### Scenario: Mode change with mask
- **WHEN** a masked view switches from `16 colors` to `Millions`
- **THEN** on the next frame the view shows the new mode and keeps the same mask
