# Spec Delta

## MODIFIED Requirements

### Requirement: Footer
Under the proof, the footer SHALL show:
- "Printed live in 16 inks by your browser · crewtives playground · demo build 0.1";
- links to crewtives.com and to the 4D.OS launcher, `/4d-os/`;
- "Type: Tilt Warp, Rampart One, Libre Franklin and Sono, SIL Open Font License.";
- the "Cat" model credit line from `LICENSES.md`, stating that it applies to worlds A–C;
- the other credits and the line "Not in the collection yet · Playground" required by "Demo honesty" of `playground-hub`, with "Playground" linked to `/` and preceded by a left arrow drawn as a vector icon, because none of the page's four families includes the `←` character.

The footer MUST NOT show the line "One of three candidate landings" or link to `/landings/`, and no text on the page SHALL present Wind-Up Empire as a candidate for the playground's front page.

#### Scenario: Footer credits
- **WHEN** the visitor reaches the end of the page
- **THEN** they see the "demo build 0.1" mark, the four families with their OFL license, the "Cat" model credit for worlds A–C, the line "Not in the collection yet · Playground" and the links to crewtives.com and to `/4d-os/`

#### Scenario: Back to the museum
- **WHEN** the visitor activates "Playground" in the line "Not in the collection yet · Playground"
- **THEN** they reach the museum at `/`

#### Scenario: No longer a candidate
- **WHEN** the static HTML of `/landings/wind-up-empire/` is read
- **THEN** the word "candidate" does not appear in any visible text, no link points to `/landings/` and the visible text does not contain the `←` character
