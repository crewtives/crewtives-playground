# Spec Delta

## ADDED Requirements

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
