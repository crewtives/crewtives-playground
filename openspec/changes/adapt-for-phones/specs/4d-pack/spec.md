# Spec Delta

## MODIFIED Requirements

### Requirement: Real load progress
The load progress reported to the interface SHALL reflect the bytes actually received of the pack files the page requests: all of the pack's files, unless the page leaves out a layer as "Layers a page never draws" allows, in which case the files it does not request do not count.

#### Scenario: Proportional progress
- **WHEN** half of the pack's total bytes have been received
- **THEN** the reported progress is 50% (±5%)

#### Scenario: Progress with a skipped layer
- **WHEN** a page that does not request the source frames has received half of the bytes of the files it requests
- **THEN** the reported progress is 50% (±5%)

## ADDED Requirements

### Requirement: Layers a page never draws
A page MAY load a 4D pack without its source frames when none of its views can show the frustum's image plane or use the source-camera light. The pack on disk does not change, and the figures that describe the pack (its weight, its frame count) SHALL still be read from its metadata. By default a page SHALL load every file of the pack, so that pages that draw the source frames keep requesting them.

#### Scenario: E without source frames
- **WHEN** `/4d-os/e/` loads
- **THEN** no `source/page-*.png` is requested, the progress reaches 100% when the static and dynamic layers have arrived, and "Weight on disk" still shows the pack's declared weight, the same one sheet 003 shows

#### Scenario: Pages that draw the source frames
- **WHEN** `/4d-os/a/`, `/4d-os/b/`, `/4d-os/c/` or `/4d-os/d/` loads
- **THEN** it requests its pack's source frames as before
