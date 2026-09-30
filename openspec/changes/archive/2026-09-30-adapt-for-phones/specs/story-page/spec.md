# Spec Delta

## MODIFIED Requirements

### Requirement: Footer with dotted wireframe
The footer SHALL show a three-dimensional logo drawn only with edges in dotted lines, which turns toward the cursor and whose dashes advance continuously. With reduced motion it SHALL stay static. On narrow screens, the logo's box SHALL be no taller than the screen is wide, and the footer MUST NOT leave more than half a screen of empty space after the last section's text.

#### Scenario: Cursor tracking
- **WHEN** the visitor moves the cursor over the footer
- **THEN** the logo turns toward the cursor's position

#### Scenario: Footer on a phone
- **WHEN** the visitor reaches the end of world A, B or C at 390×844
- **THEN** from the bottom of the last question of the FAQ to the end of the page there are at most 520 px
