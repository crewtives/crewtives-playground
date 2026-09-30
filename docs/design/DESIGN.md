---
# About this file: the design tokens of 4D.OS and the crewtives playground live in this YAML
# front matter (colors, typography, rounded, spacing, components), each prefixed by its world;
# the Markdown after it describes each world and its rules in prose. Where this file and the
# build differ, the build wins.
name: 4D.OS
description: A 4D engine that shows a reconstruction live, with all its moments at once, in five worlds. Three old operating-system desktops share the cat scene, and two landings of their own run subjects computed from equations.
colors:
  # Launcher (neutral; also the paper/ink of A)
  launcher-paper: "#f3f4f2"
  launcher-ink: "#121110"
  launcher-muted: "#6d6a66"
  launcher-dot: "rgba(18, 17, 16, 0.16)"
  # A "Vitrine": a red museum room; the display toned to the alley at night
  a-wall: "#5a1a1c"
  a-wall-deep: "#401113"
  a-ink: "#121110"
  a-paper: "#f3f4f2"
  a-muted: "#6d6a66"
  a-forward: "#3ed6e6"
  a-rewind: "#f2a43a"
  a-pal-0-vitrine: "#121110"
  a-pal-1-paper-hold: "#f3f4f2"
  a-pal-2-window-teal: "#4f8c88"
  a-pal-3-asphalt: "#1d1a1e"
  a-pal-4-brick-shadow: "#2b140d"
  a-pal-5-stair-wear: "#57504f"
  a-pal-6-neon-magenta: "#e46fc9"
  a-pal-7-moonlight: "#434e66"
  a-pal-8-brick-lamp: "#52291a"
  a-pal-9-brick-lit: "#7b4325"
  a-pal-10-wet-asphalt: "#a67b52"
  a-pal-11-cat-rim: "#6c717b"
  a-pal-12-moon-silver: "#b4bccb"
  a-pal-13-sodium: "#ffd49a"
  a-pal-14-forward: "#3ed6e6"
  a-pal-15-rewind: "#f2a43a"
  # B "Plate": a chronophotographic plate open onto an aurora; sage, teal, charcoal and magenta
  b-plate: "#1d211f"
  b-paper: "#e2ece9"
  b-mount: "#a5b4b1"
  b-mount-ink: "#1d211f"
  b-muted: "#89908e"
  b-grid-line: "rgba(226, 236, 233, 0.26)"
  b-grid-number: "rgba(226, 236, 233, 0.5)"
  b-forward: "#5fe3c8"
  b-rewind: "#d65ca5"
  b-tag: "#d65ca5"
  b-tag-ink: "#1d211f"
  b-pal-0-charcoal-black: "#111312"
  b-pal-1-plate: "#1d211f"
  b-pal-2-teal-night: "#16282c"
  b-pal-3-deep-teal: "#1c4346"
  b-pal-4-window-teal: "#74bdb5"
  b-pal-5-teal: "#2f9488"
  b-pal-6-peach: "#f0b797"
  b-pal-7-sage: "#a5b4b1"
  b-pal-8-silver: "#cfd9d6"
  b-pal-9-sage-white-hold: "#e2ece9"
  b-pal-10-night-violet: "#231a35"
  b-pal-11-aubergine: "#472a52"
  b-pal-12-plum: "#7a3a70"
  b-pal-13-neon: "#ef8fd6"
  b-pal-14-forward: "#5fe3c8"
  b-pal-15-rewind: "#d65ca5"
  b-aurora-base: "#0d0f0f"
  b-aurora-high: "#13232a"
  b-aurora-teal: "#1f6e63"
  b-aurora-violet: "#3b2150"
  b-aurora-magenta: "#6e2a63"
  # C "Leader": a hand-processed 16 mm strip; night film, cross-processed
  c-emulsion: "#a3a9ad"
  c-leader: "#0e0f10"
  c-paper: "#dcdfdf"
  c-leak: "#ff8636"
  c-leak-hot: "#ffd39a"
  c-sepia: "#c8b089"
  c-muted: "#6e7377"
  c-forward: "#3fd4e0"
  c-pal-0-leader: "#0e0f10"
  c-pal-1-shadow-gray: "#2a2e31"
  c-pal-2-base-gray: "#6e7377"
  c-pal-3-emulsion: "#a3a9ad"
  c-pal-4-light-hold: "#dcdfdf"
  c-pal-5-teal-fog: "#152a2c"
  c-pal-6-cross-moonlight: "#2c5a5c"
  c-pal-7-olive-brick: "#474a2c"
  c-pal-8-neon-magenta: "#d86cc0"
  c-pal-9-magenta-brown-brick: "#33181c"
  c-pal-10-brick-lamp: "#7c4a3e"
  c-pal-11-wet-sepia: "#b98a55"
  c-pal-12-stain: "#c8b089"
  c-pal-13-leak-rewind: "#ff8636"
  c-pal-14-leak-hot-sodium: "#ffd39a"
  c-pal-15-cross-cyan-forward: "#3fd4e0"
  # D "The golden stoop": a storage-tube vector terminal wired to the city
  d-glass: "#07060b"
  d-beam-dim: "#14633f"
  d-beam: "#3ad67c"
  d-beam-hot: "#baffd2"
  d-phi: "#ffc45a"
  d-prose: "color-mix(in oklab, #baffd2 80%, #07060b)"
  d-quiet: "color-mix(in oklab, #3ad67c 72%, #07060b)"
  d-forward: "#3fe0ff"
  d-rewind: "#ff3fb0"
  d-pal-0-black-glass: "#07060b"
  d-pal-1-night: "#100c1c"
  d-pal-2-night-violet: "#1d1433"
  d-pal-3-violet-haze: "#34204d"
  d-pal-4-phosphor-off: "#0a2a20"
  d-pal-5-phosphor-low: "#14633f"
  d-pal-6-phosphor-stored: "#3ad67c"
  d-pal-7-phosphor-write-hold: "#baffd2"
  d-pal-8-slate: "#566374"
  d-pal-9-silver: "#c3cad3"
  d-pal-10-cream: "#f3efe4"
  d-pal-11-cyan-forward: "#3fe0ff"
  d-pal-12-deep-cyan: "#0f6a82"
  d-pal-13-magenta-rewind: "#ff3fb0"
  d-pal-14-deep-magenta: "#7a1d5c"
  d-pal-15-phi-gold: "#ffc45a"
  d-neon-body: "#0a2a20"
  # E "Whale fall": the fall heard as a waterfall spectrogram
  e-void: "#05060a"
  e-night: "#0e1224"
  e-deep: "#1d2748"
  e-slate: "#3b4f86"
  e-periwinkle: "#7f9be0"
  e-ice: "#cfe0ff"
  e-bone: "#f4f1ea"
  e-cream: "#fff0cf"
  e-gold: "#ffc66b"
  e-orange: "#ff8a2e"
  e-flame: "#e0461f"
  e-ember: "#9c1f1c"
  e-garnet: "#4a0f16"
  e-grid: "#6a6f7c"
  e-forward: "#2fd0e0"
  e-rewind: "#f0a030"
  e-pal-0-void: "#05060a"
  e-pal-1-bone-hold: "#f4f1ea"
  e-pal-2-night: "#0e1224"
  e-pal-3-deep-blue: "#1d2748"
  e-pal-4-slate: "#3b4f86"
  e-pal-5-periwinkle: "#7f9be0"
  e-pal-6-ice: "#cfe0ff"
  e-pal-7-photon-cream: "#fff0cf"
  e-pal-8-gold: "#ffc66b"
  e-pal-9-orange: "#ff8a2e"
  e-pal-10-flame: "#e0461f"
  e-pal-11-ember: "#9c1f1c"
  e-pal-12-garnet: "#4a0f16"
  e-pal-13-forward: "#2fd0e0"
  e-pal-14-rewind: "#f0a030"
  e-pal-15-grid-gray: "#6a6f7c"
  # Playground · Game Center Yonjigen: one lit enamel per floor; ink slabs between floors
  gc-ink: "#140a24"
  gc-acrylic: "#f2f4ff"
  gc-enamel: "#ff4b26"
  gc-enamel-2: "#2e0803"
  gc-sodium: "#ffcc17"
  gc-sodium-2: "#4a3500"
  gc-candy: "#ff4fa0"
  gc-candy-2: "#33061c"
  gc-mint: "#1fd68a"
  gc-mint-2: "#083d26"
  gc-carpet: "#3a1c8c"
  gc-carpet-2: "#d9ccff"
  gc-night: "#1b1140"
  gc-night-2: "#b9b3e0"
  gc-cobalt: "#2238e0"
  gc-cobalt-deep: "#1728a8"
  gc-cobalt-2: "#d4daff"
  gc-crt: "#0b0718"
  gc-amber: "#ff8a1f"
  gc-wine: "#9e1233"
  gc-tube: "#33e1ff"
  gc-uv: "#b04bff"
  gc-chrome-hi: "#dde3ec"
  gc-chrome: "#9aa4b2"
  gc-chrome-lo: "#4b5362"
  gc-paper: "#fbf6e6"
  gc-paper-ink: "#2a1c10"
  gc-pal-0-crt: "#0b0718"
  gc-pal-1-night: "#1b1140"
  gc-pal-2-carpet: "#3a1c8c"
  gc-pal-3-cobalt: "#2238e0"
  gc-pal-4-tube: "#33e1ff"
  gc-pal-5-mint: "#1fd68a"
  gc-pal-6-deep-mint: "#0e6b4e"
  gc-pal-7-sodium: "#ffcc17"
  gc-pal-8-amber: "#ff8a1f"
  gc-pal-9-enamel: "#ff4b26"
  gc-pal-10-wine: "#9e1233"
  gc-pal-11-candy: "#ff4fa0"
  gc-pal-12-uv: "#b04bff"
  gc-pal-13-haze: "#7a7fb0"
  gc-pal-14-pale-acrylic: "#d9deff"
  gc-pal-15-white: "#ffffff"
  # Playground · Wind-Up Empire: flat lithography inks; one ink per face of the box
  we-ink: "#15131c"
  we-space: "#1b2cc4"
  we-space-deep: "#0a0f4a"
  we-space-bright: "#4f7dff"
  we-sky-tint: "#a9c8ff"
  we-vermilion: "#cc2216"
  we-oxblood: "#8e1a12"
  we-chrome: "#ffc81a"
  we-lemon: "#fff27a"
  we-orange: "#ff7a1a"
  we-turquoise: "#17b7a0"
  we-teal-deep: "#0b5f58"
  we-pink: "#ff6fae"
  we-tin: "#c7ccd4"
  we-tin-text: "#3a3f4c"
  we-tin-shade: "#6f7686"
  we-tin-hi: "#eef0f3"
  we-paper: "#fbfaf6"
  we-white: "#ffffff"
  we-pal-0-ink: "#15131c"
  we-pal-1-space-deep: "#0a0f4a"
  we-pal-2-space: "#1b2cc4"
  we-pal-3-space-bright: "#4f7dff"
  we-pal-4-sky-tint: "#a9c8ff"
  we-pal-5-vermilion: "#cc2216"
  we-pal-6-oxblood: "#8e1a12"
  we-pal-7-orange: "#ff7a1a"
  we-pal-8-chrome: "#ffc81a"
  we-pal-9-lemon: "#fff27a"
  we-pal-10-turquoise: "#17b7a0"
  we-pal-11-teal-deep: "#0b5f58"
  we-pal-12-pink: "#ff6fae"
  we-pal-13-tin: "#c7ccd4"
  we-pal-14-tin-shade: "#6f7686"
  we-pal-15-paper: "#fbfaf6"
  # Playground · Bloomscope: backlit colored glass; each section one whole piece of one color
  bs-chartreuse: "#c8f03c"
  bs-vogel: "#b2db2a"
  bs-petal: "#ff6fb5"
  bs-lilac: "#b99cff"
  bs-glaucous: "#8fd6b8"
  bs-honey: "#f39a1a"
  bs-ink: "#1b0f2e"
  bs-sheet: "#fdfdf6"
  bs-pollen: "#ffd21f"
  bs-cobalt: "#2b3fe0"
  bs-sky: "#5fb4ff"
  bs-violet: "#4a1d6b"
  bs-bottle: "#0e5a4a"
  bs-leaf: "#1fa85b"
  bs-vermilion: "#ff5a1f"
  bs-propolis: "#8a3a12"
  bs-now: "#e8175d"
  bs-pal-0-ink: "#1b0f2e"
  bs-pal-1-violet: "#4a1d6b"
  bs-pal-2-cobalt: "#2b3fe0"
  bs-pal-3-sky: "#5fb4ff"
  bs-pal-4-bottle: "#0e5a4a"
  bs-pal-5-leaf: "#1fa85b"
  bs-pal-6-glaucous: "#8fd6b8"
  bs-pal-7-chartreuse: "#c8f03c"
  bs-pal-8-pollen: "#ffd21f"
  bs-pal-9-honey: "#f39a1a"
  bs-pal-10-vermilion: "#ff5a1f"
  bs-pal-11-ruby-now: "#e8175d"
  bs-pal-12-petal: "#ff6fb5"
  bs-pal-13-lilac: "#b99cff"
  bs-pal-14-sheet: "#fdfdf6"
  bs-pal-15-propolis: "#8a3a12"
  # Playground · museum "The épure": a daylit drawing room; ink on the sheet, wash only as light
  mu-sheet: "#f5f4ef"
  mu-ink: "#16181d"
  mu-graphite: "#3b404c"
  mu-rule: "#16181d2e"
  mu-rule-strong: "#16181d73"
  mu-east-1: "#bebee8"
  mu-east-2: "#dcddf6"
  mu-west-1: "#f0a585"
  mu-west-2: "#f8dccd"
  mu-now-forward: "#1bbfd3"
  mu-now-rewind: "#efa23b"
  mu-pal-0-ink: "#16181d"
  mu-pal-1-sheet: "#f5f4ef"
  mu-pal-2-graphite: "#3b404c"
  mu-pal-3-slate: "#6b7080"
  mu-pal-4-pencil: "#a3a6b0"
  mu-pal-5-east: "#bebee8"
  mu-pal-6-east-deep: "#8a8fc9"
  mu-pal-7-west: "#f0a585"
  mu-pal-8-west-deep: "#c7775a"
  mu-pal-9-forward: "#1bbfd3"
  mu-pal-10-forward-deep: "#0e7f8d"
  mu-pal-11-rewind: "#efa23b"
  mu-pal-12-rewind-deep: "#9c6417"
  mu-pal-13-indigo: "#5d6397"
  mu-pal-14-ink-shade: "#262a36"
typography:
  launcher-display:
    fontFamily: "Host Grotesk, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(3rem, 8vw, 6rem)"
    fontWeight: 700
    lineHeight: 0.86
    letterSpacing: "-0.04em"
  launcher-headline:
    fontFamily: "Host Grotesk, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(2.25rem, 5vw, 3.75rem)"
    fontWeight: 700
    lineHeight: 0.9
    letterSpacing: "-0.035em"
  launcher-label:
    fontFamily: "Departure Mono, ui-monospace, monospace"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1
  a-display:
    fontFamily: "Host Grotesk, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(48px, 6.6vw, 96px)"
    fontWeight: 700
    lineHeight: 0.86
    letterSpacing: "-0.04em"
  a-headline:
    fontFamily: "Host Grotesk, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(36px, 5vw, 72px)"
    fontWeight: 700
    lineHeight: 0.95
    letterSpacing: "-0.04em"
  a-title:
    fontFamily: "Host Grotesk, Helvetica Neue, Arial, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  a-body:
    fontFamily: "Host Grotesk, Helvetica Neue, Arial, sans-serif"
    fontSize: "19px"
    fontWeight: 400
    lineHeight: 1.5
  a-window-body:
    fontFamily: "Host Grotesk, Helvetica Neue, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.4
  a-label:
    fontFamily: "Departure Mono, ui-monospace, monospace"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "0"
  a-timecode:
    fontFamily: "Departure Mono, ui-monospace, monospace"
    fontSize: "22px"
    fontWeight: 400
    lineHeight: 1
    fontFeature: "tnum"
  b-display:
    fontFamily: "Bricolage Grotesque, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(2.6rem, 6.2vw, 6rem)"
    fontWeight: 700
    lineHeight: 0.9
    letterSpacing: "-0.02em"
    fontVariation: "'wdth' 75"
  b-headline:
    fontFamily: "Bricolage Grotesque, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(2rem, 4.4vw, 3.75rem)"
    fontWeight: 650
    lineHeight: 0.95
    letterSpacing: "-0.015em"
    fontVariation: "'wdth' 75"
  b-body:
    fontFamily: "Bricolage Grotesque, Helvetica Neue, Arial, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.45
    fontFeature: "tnum"
  b-legend:
    fontFamily: "Bricolage Grotesque, Helvetica Neue, Arial, sans-serif"
    fontSize: "11px"
    fontWeight: 650
    letterSpacing: "0.04em"
    fontVariation: "'wdth' 75"
  b-label:
    fontFamily: "Geist Pixel, ui-monospace, monospace"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1
  b-timecode:
    fontFamily: "Geist Pixel, ui-monospace, monospace"
    fontSize: "24px"
    fontWeight: 400
    lineHeight: 1
  c-display:
    fontFamily: "Big Shoulders Stencil, Archivo, sans-serif"
    fontSize: "clamp(2.6rem, 5.6vw, 5.75rem)"
    fontWeight: 800
    lineHeight: 0.88
    letterSpacing: "0.02em"
  c-headline:
    fontFamily: "Big Shoulders Stencil, Archivo, sans-serif"
    fontSize: "clamp(2.2rem, 4.8vw, 4rem)"
    fontWeight: 800
    lineHeight: 0.92
  c-timecode:
    fontFamily: "Big Shoulders Stencil, Archivo, sans-serif"
    fontSize: "28px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0.02em"
  c-body:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.45
    fontVariation: "'wdth' 92"
    fontFeature: "tnum"
  c-label:
    fontFamily: "Doto, ui-monospace, monospace"
    fontSize: "14px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.04em"
  c-hand:
    fontFamily: "Permanent Marker, cursive"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1
  d-display:
    fontFamily: "Tektur, Arial Narrow, sans-serif"
    fontSize: "clamp(3rem, 6.4vw, 6rem)"
    fontWeight: 500
    lineHeight: 0.86
    letterSpacing: "-0.012em"
    fontVariation: "'wdth' 75"
  d-headline:
    fontFamily: "Tektur, Arial Narrow, sans-serif"
    fontSize: "clamp(2.4rem, 5vw, 4.236rem)"
    fontWeight: 500
    lineHeight: 0.92
    letterSpacing: "-0.01em"
    fontVariation: "'wdth' 75"
  d-monument:
    fontFamily: "Tektur, Arial Narrow, sans-serif"
    fontSize: "clamp(2.5rem, 10.4vw, 9.6rem)"
    fontWeight: 400
    lineHeight: 0.9
    fontVariation: "'wdth' 75"
    fontFeature: "tnum"
  d-timecode:
    fontFamily: "Tektur, Arial Narrow, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 500
    lineHeight: 1
    fontFeature: "tnum"
  d-readout:
    fontFamily: "Tektur, Arial Narrow, sans-serif"
    fontSize: "1.05rem"
    fontWeight: 500
    fontFeature: "tnum"
  d-label:
    fontFamily: "Tektur, Arial Narrow, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.12em"
  d-equation:
    fontFamily: "Jura, Avenir Next, sans-serif"
    fontSize: "1.45rem"
    fontWeight: 500
    lineHeight: 1.2
  d-body:
    fontFamily: "Jura, Avenir Next, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 500
    lineHeight: 1.62
  e-display:
    fontFamily: "Science Gothic, Arial Narrow, sans-serif"
    fontSize: "clamp(46px, 6vw, 92px)"
    fontWeight: 800
    lineHeight: 0.92
    letterSpacing: "-0.01em"
    fontVariation: "'wdth' 128"
  e-headline:
    fontFamily: "Science Gothic, Arial Narrow, sans-serif"
    fontSize: "clamp(38px, 5.2vw, 76px)"
    fontWeight: 800
    lineHeight: 0.9
    letterSpacing: "-0.01em"
    fontVariation: "'wdth' 118"
  e-clock:
    fontFamily: "Science Gothic, Arial Narrow, sans-serif"
    fontSize: "clamp(44px, min(6.4vw, calc((100vw - 500px) / 10)), 96px)"
    fontWeight: 700
    lineHeight: 0.86
    fontVariation: "'wdth' 100"
    fontFeature: "tnum"
  e-value:
    fontFamily: "Science Gothic, Arial Narrow, sans-serif"
    fontSize: "clamp(30px, 3.2vw, 46px)"
    fontWeight: 700
    lineHeight: 0.9
    fontFeature: "tnum"
  e-label:
    fontFamily: "E Instrument (Handjet + Atkinson Hyperlegible Next digits), ui-monospace, monospace"
    fontSize: "16px"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "0.04em"
  e-readout:
    fontFamily: "E Instrument (Handjet + Atkinson Hyperlegible Next digits), ui-monospace, monospace"
    fontSize: "30px"
    fontWeight: 500
    lineHeight: 1
    fontFeature: "tnum"
  e-timecode:
    fontFamily: "E Instrument (Handjet + Atkinson Hyperlegible Next digits), ui-monospace, monospace"
    fontSize: "22px"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "0.04em"
    fontFeature: "tnum"
  e-body:
    fontFamily: "Atkinson Hyperlegible Next, Helvetica Neue, Arial, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.6
    fontFeature: "tnum"
  gc-marquee:
    fontFamily: "Bungee Shade, Bungee, system-ui, sans-serif"
    fontSize: "clamp(30px, 6.6vw, 96px)"
    fontWeight: 400
    lineHeight: 1
  gc-headline:
    fontFamily: "Bungee, system-ui, sans-serif"
    fontSize: "clamp(40px, 5vw, 72px)"
    fontWeight: 400
    lineHeight: 0.95
  gc-numeral:
    fontFamily: "Bungee, system-ui, sans-serif"
    fontSize: "clamp(56px, 9vw, 96px)"
    fontWeight: 400
    lineHeight: 1
  gc-title:
    fontFamily: "Bungee, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.15
    letterSpacing: "0.02em"
  gc-screen:
    fontFamily: "DotGothic16, ui-monospace, monospace"
    fontSize: "20px"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "0.04em"
  gc-lead:
    fontFamily: "M PLUS Rounded 1c, system-ui, sans-serif"
    fontSize: "clamp(19px, 1.6vw, 24px)"
    fontWeight: 400
    lineHeight: 1.4
  gc-body:
    fontFamily: "M PLUS Rounded 1c, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1.55
    fontFeature: "tnum"
  gc-label:
    fontFamily: "Bungee, system-ui, sans-serif"
    fontSize: "10px"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "0.06em"
  we-display:
    fontFamily: "Tilt Warp, Libre Franklin, sans-serif"
    fontSize: "max(3rem, calc(92 * var(--u)))"
    fontWeight: 400
    lineHeight: 0.9
    fontVariation: "'XROT' calc(-10 * var(--wind)), 'YROT' calc(-28 * var(--wind))"
  we-headline:
    fontFamily: "Tilt Warp, Libre Franklin, sans-serif"
    fontSize: "clamp(2.5rem, 4.2vw, 3.75rem)"
    fontWeight: 400
    lineHeight: 0.95
  we-title:
    fontFamily: "Tilt Warp, Libre Franklin, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 400
    lineHeight: 1
  we-plate:
    fontFamily: "Rampart One, Libre Franklin, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 400
  we-body:
    fontFamily: "Libre Franklin, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 500
    lineHeight: 1.5
    fontFeature: "tnum"
  we-label:
    fontFamily: "Libre Franklin, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 700
    letterSpacing: "0.04em"
  we-numeral:
    fontFamily: "Sono, ui-monospace, monospace"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: "32px"
    letterSpacing: "0.12em"
    fontFeature: "tnum"
  bs-display:
    fontFamily: "Ultra, Rockwell Extra Bold, serif"
    fontSize: "6rem"
    fontWeight: 400
    lineHeight: 0.92
    letterSpacing: "-0.01em"
  bs-headline:
    fontFamily: "Ultra, Rockwell Extra Bold, serif"
    fontSize: "5.5rem"
    fontWeight: 400
    lineHeight: 0.94
    letterSpacing: "-0.01em"
  bs-title:
    fontFamily: "Ultra, Rockwell Extra Bold, serif"
    fontSize: "1.75rem"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "-0.01em"
  bs-sub:
    fontFamily: "Recursive Casual, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.1875rem"
    fontWeight: 430
    lineHeight: 1.45
    fontVariation: "'CASL' 0"
  bs-body:
    fontFamily: "Recursive Casual, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 430
    lineHeight: 1.5
    fontVariation: "'CASL' 0"
  bs-label:
    fontFamily: "Recursive Casual, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 720
    lineHeight: 1.2
    letterSpacing: "0.005em"
    fontVariation: "'CASL' 1"
  bs-mono:
    fontFamily: "Recursive Mono, ui-monospace, SF Mono, Menlo, monospace"
    fontSize: "0.8125rem"
    fontWeight: 520
    fontFeature: "tnum"
    fontVariation: "'MONO' 1"
  mu-title:
    fontFamily: "Geologica, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 620
    lineHeight: 1.1
    letterSpacing: "-0.01em"
  mu-heading:
    fontFamily: "Geologica, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 620
    letterSpacing: "-0.02em"
  mu-sheet-title:
    fontFamily: "Geologica, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 620
    lineHeight: 1.1
    letterSpacing: "-0.015em"
  mu-body:
    fontFamily: "Geologica, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 380
    lineHeight: 1.5
  mu-wall-text:
    fontFamily: "Geologica, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 380
    lineHeight: 1.55
  mu-nav:
    fontFamily: "Geologica, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1
  mu-enter:
    fontFamily: "Geologica, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 600
    lineHeight: 1.2
  mu-sheet-number:
    fontFamily: "Fira Mono, ui-monospace, SFMono-Regular, monospace"
    fontSize: "1.75rem"
    fontWeight: 500
    lineHeight: 1
    fontFeature: "tnum"
  mu-data:
    fontFamily: "Fira Mono, ui-monospace, SFMono-Regular, monospace"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.35
  mu-control:
    fontFamily: "Fira Mono, ui-monospace, SFMono-Regular, monospace"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "0.08em"
  mu-caption:
    fontFamily: "Fira Mono, ui-monospace, SFMono-Regular, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.3
  mu-epure-label:
    fontFamily: "Fira Mono, ui-monospace, SFMono-Regular, monospace"
    fontSize: "13px"
    fontWeight: 400
    letterSpacing: "0.04em"
rounded:
  none: "0"
  b-button: "6px"
  c-frame: "4px"
  c-gate: "7px"
  c-reel: "18px"
  round: "50%"
  gc-cabinet: "28px 28px 14px 14px"
  gc-plate: "10px"
  gc-start: "8px"
  gc-tag: "4px"
  gc-card: "3px"
  we-frame: "14px"
  we-plate: "12px"
  we-button: "8px"
  we-lip: "6px"
  we-lip-button: "5px"
  we-sticker: "4px"
  bs-pill: "12px"
spacing:
  hair: "1px"
  unit: "3px"
  gap: "12px"
  a-win-title: "18px"
  b-win-title: "18px"
  c-win-title: "20px"
  c-sprocket: "10px"
  page-gutter: "24px"
  d-gutter: "32px"
  d-tube: "clamp(340px, 38.2vw, 540px)"
  e-gutter: "24px"
  e-column: "184px"
  e-band: "clamp(176px, 23vh, 214px)"
  gc-dir: "76px"
  gc-gutter: "24px"
  gc-col: "78px"
  gc-slab: "18px"
  we-strip: "56px"
  we-gutter: "24px"
  we-side: "32px"
  we-frame-inset: "16px"
  bs-topbar: "72px"
  bs-side: "64px"
  bs-gem: "48px"
  mu-module: "clamp(16px, calc(100vw / 48), 30px)"
  mu-col-vista: "calc(26 * var(--M))"
  mu-col-gutter: "calc(2 * var(--M))"
  mu-col-epure: "calc(16 * var(--M))"
  mu-col-method: "calc(20 * var(--M))"
  mu-sheet-inset: "calc(var(--M) - 1px)"
  mu-tick: "6px"
components:
  launcher-window:
    backgroundColor: "{colors.launcher-paper}"
    textColor: "{colors.launcher-ink}"
    rounded: "{rounded.none}"
  launcher-window-title:
    backgroundColor: "{colors.launcher-ink}"
    textColor: "{colors.launcher-paper}"
    typography: "{typography.launcher-label}"
    height: "20px"
    padding: "0 7px"
  a-window:
    backgroundColor: "{colors.a-paper}"
    textColor: "{colors.a-ink}"
    typography: "{typography.a-window-body}"
    rounded: "{rounded.none}"
  a-window-title:
    backgroundColor: "{colors.a-ink}"
    textColor: "{colors.a-paper}"
    typography: "{typography.a-label}"
    height: "{spacing.a-win-title}"
    padding: "0 6px"
  a-window-body:
    padding: "9px"
  a-button:
    backgroundColor: "{colors.a-paper}"
    textColor: "{colors.a-ink}"
    typography: "{typography.a-label}"
    rounded: "{rounded.none}"
    padding: "5px 15px 4px"
  a-button-hover:
    backgroundColor: "{colors.a-ink}"
    textColor: "{colors.a-paper}"
  a-rail-play:
    backgroundColor: "{colors.a-ink}"
    textColor: "{colors.a-paper}"
    size: "33px"
  a-tag:
    backgroundColor: "{colors.a-paper}"
    textColor: "{colors.a-ink}"
    typography: "{typography.a-label}"
    padding: "2px 5px 1px"
  b-window:
    backgroundColor: "{colors.b-mount}"
    textColor: "{colors.b-mount-ink}"
    rounded: "{rounded.none}"
  b-window-title:
    backgroundColor: "{colors.b-mount}"
    textColor: "{colors.b-mount-ink}"
    typography: "{typography.b-label}"
    height: "{spacing.b-win-title}"
    padding: "0 6px"
  b-window-body:
    padding: "8px 9px 9px"
  b-button:
    backgroundColor: "{colors.b-mount}"
    textColor: "{colors.b-mount-ink}"
    rounded: "{rounded.b-button}"
    padding: "3px 14px"
  b-button-active:
    backgroundColor: "{colors.b-mount-ink}"
    textColor: "{colors.b-mount}"
  b-loupe-key:
    backgroundColor: "{colors.b-mount}"
    textColor: "{colors.b-mount-ink}"
    rounded: "{rounded.none}"
    width: "32px"
    height: "26px"
  b-loupe-key-active:
    backgroundColor: "{colors.b-mount-ink}"
    textColor: "{colors.b-mount}"
  b-loupe-hint:
    backgroundColor: "{colors.b-plate}"
    textColor: "{colors.b-paper}"
    typography: "{typography.b-label}"
    padding: "3px 6px 4px"
  b-dial-stop-checked:
    backgroundColor: "{colors.b-mount-ink}"
    textColor: "{colors.b-mount}"
    typography: "{typography.b-label}"
    padding: "4px 0"
  b-tag:
    backgroundColor: "{colors.b-tag}"
    textColor: "{colors.b-tag-ink}"
    typography: "{typography.b-label}"
    padding: "1px 5px 2px"
  c-window:
    backgroundColor: "{colors.c-paper}"
    textColor: "{colors.c-leader}"
    rounded: "{rounded.none}"
  c-window-title:
    backgroundColor: "{colors.c-leader}"
    textColor: "{colors.c-paper}"
    typography: "{typography.c-label}"
    height: "{spacing.c-win-title}"
    padding: "0 7px"
  c-window-body:
    padding: "8px 10px"
  c-button:
    backgroundColor: "{colors.c-leader}"
    textColor: "{colors.c-paper}"
    rounded: "{rounded.none}"
    padding: "6px 14px"
  c-button-hover:
    backgroundColor: "{colors.c-pal-1-shadow-gray}"
  c-strip-frame:
    backgroundColor: "{colors.c-pal-1-shadow-gray}"
    rounded: "{rounded.c-frame}"
    width: "160px"
  c-tag:
    backgroundColor: "{colors.c-leader}"
    textColor: "{colors.c-paper}"
    typography: "{typography.c-label}"
    padding: "3px 6px"
  d-tube:
    backgroundColor: "{colors.d-glass}"
    textColor: "{colors.d-beam}"
    typography: "{typography.d-label}"
    width: "{spacing.d-tube}"
    padding: "22px 24px 18px"
  d-key:
    backgroundColor: "{colors.d-glass}"
    textColor: "{colors.d-beam-hot}"
    rounded: "{rounded.none}"
    size: "30px"
  d-key-disabled:
    textColor: "{colors.d-beam-dim}"
  d-timeline:
    backgroundColor: "{colors.d-glass}"
    textColor: "{colors.d-beam-hot}"
    typography: "{typography.d-timecode}"
    padding: "8px 10px 6px"
  d-reading:
    textColor: "{colors.d-beam-hot}"
    typography: "{typography.d-readout}"
  d-reading-phi:
    textColor: "{colors.d-phi}"
    typography: "{typography.d-readout}"
  d-tag:
    backgroundColor: "{colors.d-glass}"
    textColor: "{colors.d-beam-hot}"
    typography: "{typography.d-label}"
    padding: "3px 6px 2px"
  e-recorder:
    backgroundColor: "{colors.e-void}"
    textColor: "{colors.e-bone}"
    height: "{spacing.e-band}"
  e-clock-yours:
    textColor: "{colors.e-bone}"
    typography: "{typography.e-clock}"
  e-clock-its:
    textColor: "{colors.e-ice}"
    typography: "{typography.e-clock}"
  e-column:
    backgroundColor: "{colors.e-void}"
    textColor: "{colors.e-ice}"
    width: "{spacing.e-column}"
  e-key:
    backgroundColor: "{colors.e-void}"
    textColor: "{colors.e-bone}"
    rounded: "{rounded.none}"
    width: "38px"
    height: "30px"
  e-key-hover:
    backgroundColor: "{colors.e-deep}"
  e-key-active:
    backgroundColor: "{colors.e-bone}"
    textColor: "{colors.e-void}"
  e-tag:
    backgroundColor: "{colors.e-bone}"
    textColor: "{colors.e-void}"
    typography: "{typography.e-label}"
    padding: "1px 6px 0"
  gc-floor-plate:
    backgroundColor: "{colors.gc-ink}"
    typography: "{typography.gc-numeral}"
    rounded: "{rounded.gc-plate}"
  gc-directory:
    backgroundColor: "{colors.gc-ink}"
    textColor: "{colors.gc-acrylic}"
    typography: "{typography.gc-label}"
    width: "{spacing.gc-dir}"
  gc-control-deck:
    backgroundColor: "{colors.gc-cobalt}"
    textColor: "{colors.gc-acrylic}"
  gc-start:
    backgroundColor: "{colors.gc-acrylic}"
    textColor: "{colors.gc-ink}"
    typography: "{typography.gc-title}"
    rounded: "{rounded.gc-start}"
    width: "88px"
    height: "46px"
  gc-tag:
    textColor: "{colors.gc-ink}"
    typography: "{typography.gc-label}"
    rounded: "{rounded.gc-tag}"
    padding: "3px 7px 2px"
  gc-adjust-card:
    backgroundColor: "{colors.gc-paper}"
    textColor: "{colors.gc-paper-ink}"
    rounded: "{rounded.gc-card}"
    padding: "22px 22px 18px"
  gc-crt:
    backgroundColor: "{colors.gc-crt}"
    textColor: "{colors.gc-acrylic}"
    typography: "{typography.gc-screen}"
  we-tin-button:
    backgroundColor: "{colors.we-tin}"
    textColor: "{colors.we-ink}"
    typography: "{typography.we-label}"
    rounded: "{rounded.we-button}"
    padding: "6px 14px"
    height: "36px"
  we-chrome-button:
    backgroundColor: "{colors.we-chrome}"
    textColor: "{colors.we-ink}"
    typography: "{typography.we-label}"
    rounded: "{rounded.we-button}"
    padding: "6px 14px"
    height: "36px"
  we-tin-plate:
    backgroundColor: "{colors.we-tin}"
    textColor: "{colors.we-ink}"
    rounded: "{rounded.we-plate}"
    padding: "22px 24px 24px"
  we-lip:
    backgroundColor: "{colors.we-chrome}"
    textColor: "{colors.we-ink}"
    rounded: "{rounded.we-lip}"
    height: "44px"
  we-lip-button:
    backgroundColor: "{colors.we-ink}"
    textColor: "{colors.we-chrome}"
    typography: "{typography.we-label}"
    rounded: "{rounded.we-lip-button}"
    padding: "4px 14px"
    height: "34px"
  we-sticker:
    backgroundColor: "{colors.we-pink}"
    textColor: "{colors.we-ink}"
    rounded: "{rounded.we-sticker}"
    padding: "4px 8px 3px"
  we-strip:
    backgroundColor: "{colors.we-tin}"
    textColor: "{colors.we-ink}"
    height: "{spacing.we-strip}"
  bs-gem:
    textColor: "{colors.bs-ink}"
    typography: "{typography.bs-label}"
    rounded: "{rounded.none}"
    padding: "0 26px"
    height: "{spacing.bs-gem}"
  bs-readout:
    backgroundColor: "{colors.bs-sheet}"
    textColor: "{colors.bs-ink}"
    typography: "{typography.bs-mono}"
    rounded: "{rounded.bs-pill}"
    padding: "0 12px"
    height: "24px"
  bs-wheel:
    backgroundColor: "{colors.bs-honey}"
    textColor: "{colors.bs-ink}"
    typography: "{typography.bs-title}"
    rounded: "{rounded.round}"
  bs-footer:
    backgroundColor: "{colors.bs-ink}"
    textColor: "{colors.bs-sheet}"
    typography: "{typography.bs-body}"
  mu-bar:
    backgroundColor: "{colors.mu-sheet}"
    textColor: "{colors.mu-ink}"
    typography: "{typography.mu-title}"
    height: "calc(2 * var(--M))"
  mu-clock-state:
    textColor: "{colors.mu-ink}"
    typography: "{typography.mu-control}"
    rounded: "{rounded.none}"
    padding: "7px 10px 6px"
  mu-clock-state-active:
    backgroundColor: "{colors.mu-ink}"
    textColor: "{colors.mu-sheet}"
  mu-clock-scrub:
    width: "calc(9 * var(--M))"
    height: "28px"
  mu-vista:
    rounded: "{rounded.none}"
    padding: "{spacing.mu-module}"
  mu-title-block:
    backgroundColor: "{colors.mu-sheet}"
    textColor: "{colors.mu-ink}"
    typography: "{typography.mu-data}"
    rounded: "{rounded.none}"
  mu-title-block-enter:
    backgroundColor: "{colors.mu-ink}"
    textColor: "{colors.mu-sheet}"
    typography: "{typography.mu-enter}"
    padding: "10px 12px"
  mu-tool:
    backgroundColor: "{colors.mu-sheet}"
    textColor: "{colors.mu-ink}"
    typography: "{typography.mu-control}"
    rounded: "{rounded.none}"
    padding: "7px 10px 6px"
  mu-tool-pressed:
    backgroundColor: "{colors.mu-ink}"
    textColor: "{colors.mu-sheet}"
  mu-bar-button:
    textColor: "{colors.mu-ink}"
    typography: "{typography.mu-nav}"
    rounded: "{rounded.none}"
    padding: "7px 10px 6px"
    height: "32px"
  mu-index-row:
    textColor: "{colors.mu-ink}"
    typography: "{typography.mu-body}"
    height: "calc(3 * var(--M))"
---

# Design System: 4D.OS

> **About this file.** It has two parts: the design tokens, in the YAML front matter above (colors, typography, rounded, spacing and components, each prefixed by its world), and the prose below, one section per world plus the shared components and rules. It describes the shipped build. Where this file and the build differ, the build wins.

One engine, five visual worlds. This document is drawn from the shipped build (`src/engine/**`, `src/4d-os/worlds/{a,b,c,d,e}/*`, `src/4d-os/launcher/launcher.css`, and the pages `a/`, `b/`, `c/`, `d/`, `e/` and `index.html` under `sites/4d-os/`) and from captures of it, a curated set of which is in `docs/images/`. Where the build and the design briefs (`.impeccable/surfaces/*.md`) differ, the build wins and the difference is noted.

**How to read the tokens.** The format only allows flat groups, so each front-matter token carries its world's prefix: `a-*` (Vitrine), `b-*` (Plate), `c-*` (Leader), `d-*` (The golden stoop), `e-*` (Whale fall) and `launcher-*`. Unprefixed tokens (`spacing.hair`, `spacing.unit`, `spacing.gap`, `rounded.none`) are shared. In code, every world uses **the same custom property names for what the engine reads** (`--pal-1bit-*`, `--pal-16-*`, `--accent-*`, `--scene-bg`, `--trail`, `--future`, `--frustum`, `--trajectory`, `--display-*`, `--render-scale`), each with its own values in `src/4d-os/worlds/<x>/tokens.css`. The chrome of A, B and C also shares `--ink`, `--paper`, `--font-display`, `--font-pixel` and `--pixel-size`; D and E name their chrome their own way (`--glass`, `--beam*`, `--phi` in D; `--void`, `--bone`, `--ice`… in E). To extend a world, edit its `tokens.css` and its `style.css`; the engine carries no styles.

## Overview

**Creative North Star: "Every moment at once"**

4D.OS shows a 4D scene live, quantized to a small dithered palette, and makes the whole interface speak of time: `MM:SS:FF` timecode, J/K/L, FORWARD / REWIND / HOLD. The first three worlds are old operating-system desktops, and there the metaphor is not decorative: the window that leaves an echo as it is dragged is the 2D version of the 4D "millipede". The grammar of those desktops comes from the reference site credited in the README (old OS windows, pixel mono in the chrome, exhibition minimalism, a large grotesque), taken as inspiration and built with the project's own material. The two newer worlds leave the OS behind: each one is an instrument of its own and uses no windows.

The worlds do not mix:
- **A "Vitrine"** is a red museum room: the scene hangs in a display case, and the windows are labels and a room plan.
- **B "Plate"** is a Marey chronophotographic plate on charcoal, open onto an aurora sky, with a Muybridge graticule and windows as sage mount cards. Its palette is sage, teal, charcoal and magenta, extended into an aurora ramp.
- **C "Leader"** is a hand-processed 16 mm strip: an emulsion-gray field, black leader bands, perforations, grease pencil and a light leak.
- **D "The golden stoop"** is a storage-tube vector graphics terminal (Tektronix 4010/4014) wired to a city at night. Everything is black glass and phosphor stroke. The tube *computes* the falcon, which descends along a golden spiral, and stores every stroke.
- **E "Whale fall"** is a waterfall hydrophone spectrogram. On a flat void, a whale spirals down into a black hole. Two clocks (yours and the whale's) are the largest things on the page, and the whale's stretches and reddens.

Each world has its display palette, its type pairing, its first-screen composition and its signature interaction. The launcher is a neutral desktop that shows all five.

**Scenes.** A, B and C share one scene: a synthetic black cat climbing a flight of 10 steps in an alley at night, with a magenta neon, teal and warm windows and a sodium street lamp. It is the pack `sites/4d-os/public/packs/cat-stairs/`: 420 frames at 30 fps, the "Cat" model by J-Toastie, CC-BY 3.0, animated by 4D.OS (see `LICENSES.md`). D and E run subjects **computed from the project's own equations**, with no third-party models:
- `falcon-phi`: 450 frames at 30 fps; a peregrine falcon stooping along a golden spiral around a tower's mast;
- `whale-fall`: 450 frames at 30 fps; a humpback whale spiraling down into a black hole.

The three packs declare point correspondence (see Components). Every page shows the *synthetic* label in view and, in A, B and C, the model credit. Every scene view is shown with a dollhouse cutaway (`setCutaway(true)`), except where there is nothing to cut.

The first screen has an instrument's density: small, precise windows or panels in the margins, and the scene leads. In B, D and E the first screen is also a **gesture hero**: scrolling opens the camera from the subject out to the full plate and then carries time to the last frame. Below it comes the story page, with large, airy chapters. Everything is flat, without elevation shadows: depth comes from stacking and from 1 px frames.

**Key Characteristics:**
- In A, B and C, a single window grammar (`.win > .win__title + .win__body`) with shared drag, focus and echo; each world dresses it. D and E have no windows: they are the fixed panels of an instrument.
- The display is a live render at 1/3 resolution, with 8×8 Bayer dithering and a 16-color (or 1-bit) palette read from CSS tokens.
- A single NOW, published as `--accent-current`:
  - forward: cyan in A, C, D and E; aurora green in B;
  - rewind: amber in A and E; orange leak in C; magenta in B and D;
  - HOLD: each world's neutral light.
- A shared gesture hero (`bindZoomHero`) in B, D and E: a loop at the top, zoom by scroll and pinch, a final segment to the last frame, and a rest.
- Figures are always read from the pack (`data-stat`) or computed with the scene's module. The scene is always labeled *Synthetic*.
- Reduced motion turns off everything automatic: playback, orbit, dissolves, echoes, inertia, flashes and sky.

## Colors

Each world is a closed palette of 16 colors plus a few chrome tokens. The display quantizes the scene to those 16, so the render's color and the interface's color are the same material.

### Primary
- **Forward color** (`a-forward`, `b-forward`, `c-forward`, `d-forward`, `e-forward`): the present while time runs forward. In the viewer it tints the current frame. In the chrome, through `--accent-current`, it paints:
  - A: the playhead;
  - B: the outline of the current frame on the sequence sheet;
  - C: the gate;
  - D: the leader line and the GIN cursor;
  - E: the playhead and the transport state.

  A, C, D and E use cyan. B uses an **aurora green**, the brightest tone of its palette, so the present stands clear of the aurora and of the teal ramp.

### Secondary
- **Rewind color**: the present while time runs backward.
  - A uses amber (`a-rewind`).
  - B uses magenta (`b-rewind`).
  - C uses the **light leak** (`c-leak`), an orange that also floods the edge of the gate.
  - D uses the city's **neon magenta** (`d-rewind`). Cyan and magenta are the city's two neons, so both directions of time come from the world itself.
  - E uses amber (`e-rewind`).
- **B's magenta tag** (`b-tag`, with text in `b-tag-ink`, the charcoal ink: 4.6:1): the caption's *synthetic* label, like archive index cards. Text on the magenta is always in ink, because white does not reach AA (3.8:1). It is the same magenta as REWIND. Together with the sage of the cards and of "PLATE 4D-002" in the caption, it is the only color in B's chrome outside the NOW.
- **Phi gold** (`d-phi`): in D, gold belongs only to the golden ratio: the monumental figure, the φ row of the readings, the spiral of the plotter and of the scene, and the measurement on the pack (see The Gold Is Phi Rule).
- **E's heat ramp** (`e-garnet` → `e-ember` → `e-flame` → `e-orange` → `e-gold` → `e-cream`): the accretion disk. It is both the color map of the spectrograms and the path of the whale's clock. The clock starts at `e-ice` and climbs the ramp (`--its-color` takes `--ice`, `--cream`, `--gold`, `--orange` or `--flame` according to dτ/dt).

### Tertiary
- **World color:** the committed surface of each first screen. It never travels to another world.
  - A: the **oxblood** of the wall (`a-wall`, with `a-wall-deep`).
  - B: the **sage** of the mount cards (`b-mount` on `b-mount-ink`).
  - C: the field's **emulsion gray** (`c-emulsion`).
  - D: the tube's **phosphor**, in four intensities: `d-pal-4-phosphor-off`, `d-beam-dim`, `d-beam` and `d-beam-hot`. Each intensity has its role:
    - `d-beam-dim`: graticule, rules and frames;
    - `d-beam`: labels and stored stroke;
    - `d-beam-hot`: writing, live figures and HOLD.
  - E: the whale's **cold channel** (`e-night` → `e-deep` → `e-slate` → `e-periwinkle` → `e-ice`):
    - `e-periwinkle`: channel labels, units and axes;
    - `e-ice`: the whale's clock and the computed values in the text.

### Neutral
- **Each world's ink and paper:** window or panel bodies, text, 1 px rules and the 1-bit pair.
  - A: `a-ink` / `a-paper`. B: `b-plate` / `b-paper`. C: `c-leader` / `c-paper`.
  - D: `d-glass` / `d-beam-hot`. D's 1-bit is the tube: black glass and writing phosphor.
  - E: `e-void` / `e-bone`.

  In all of them, `--pal-1bit-1` is the HOLD color. `--pal-1bit-0` is `--pal-16-0` in A, C, D and E, and the plate's charcoal (`--pal-16-1`) in B.
- **B's aurora ramp:** these are no longer grays. Two branches leave the charcoal (`b-pal-0`, `b-pal-1-plate`):
  - teal night, deep teal, teal and window teal, toward sage, silver and sage white;
  - night violet, aubergine and plum, toward the neon.

  The peach (`b-pal-6-peach`) is the street lamp and the warm windows. The present is the brightest tone.
- **D's city night:** `d-pal-1-night`, `d-pal-2-night-violet` and `d-pal-3-violet-haze`, with slate, silver and cream (`d-pal-8..10`). They are scene matter: they do not appear in the chrome.
- **E's grid gray** (`e-grid`): every axis, tick, screen edge and 1 px separator.
- **Muted** (`a-muted`, `b-muted`, `c-muted`, `d-quiet`, `e-periwinkle`): secondary labels, plate numbers, captions and notes.
- Dimmed text tones are derived with `color-mix(in oklab, …)` between ink and paper (70–85%), not with new tokens. D fixes them as `d-prose` and `d-quiet`. **E mixes nothing** (The Flat Field Rule).

### Display palettes: the alley at night (A, B, C)
- **A** keeps ink, paper, amber and cyan, and gives slots 2–13 to the night: cold shadow, asphalt, brick in shadow, by the lamp and lit, the black cat, fog, moonlight, wet reflection, the cat's rim light, moon silver and pale sodium. The sodium (`a-pal-13-sodium`) is lighter than REWIND's amber so the street lamp does not read as the NOW. The trail and the trajectory are moon silver, the future is the rim-light gray and the frustum is paper.
- **A** changed slots 2, 5 and 6 for the stairs:
  - teal windows and door (`a-pal-2-window-teal`), far from the present's cyan;
  - wear on the stairs (`a-pal-5-stair-wear`);
  - magenta neon (`a-pal-6-neon-magenta`), far from the brick and from REWIND's amber.
- **B** quantizes the scene to the aurora ramp:
  - background in teal night (`--scene-bg` = `b-pal-2`);
  - silver trail (`b-pal-8`), future in sage (`b-pal-7`);
  - teal frustum (`b-pal-5`) and plum trajectory (`b-pal-12`).

  The scene's neon falls on `b-pal-13-neon`, lighter than REWIND's magenta.
- **C** turns slots 5–9 into cross-processed night film: teal fog, cross-processed moonlight, olive distant brick, cross-processed magenta neon (`c-pal-8-neon-magenta`, far from REWIND's orange) and magenta-brown brick in shadow. The trail is the hot leak (`c-leak-hot`), which also serves as the sodium street lamp.

### Display palettes: D and E
- **D:** a black glass background (`--scene-bg` = `d-pal-0`).
  - **Trail in stored phosphor** (`d-pal-6`): the past stays stored in the tube.
  - Future in low phosphor (`d-pal-5`): what the beam has not written yet.
  - Cream frustum (`d-pal-10`) and deep cyan trajectory (`d-pal-12`).

  The city's neons come out of the bake in the same cyan and magenta as the NOW. `neons.ts` repaints them in memory, without touching the pack, with the deep cyan and magenta (`d-pal-12`, `d-pal-14`). The golden diagram on the rooftop, which comes out of the bake in cyan, is repainted with the graticule's stroke (`diagram.ts`). That way full cyan is left for the NOW alone.
- **E:** a void background (`e-pal-0`), ice trail (`e-pal-6`), slate future and trajectory (`e-pal-4`) and grid-gray frustum (`e-pal-15`). The present takes little of the direction's color (`setPresentLook({ tint: 0.3 })`): the whale keeps its blue back and its bone belly, and the scene's redshift stays visible.

### Palette mechanism (shared)
`RetroDisplay` (`src/engine/display/RetroDisplay.ts`, `palette.ts`) reads `--pal-1bit-0..1` and `--pal-16-0..15` from the `tokenRoot`. By default the `tokenRoot` is `<html>`; in the launcher, each `.world[data-world]`.
- **Modes:** `1bit`, `16` (the default) and `millions` (unquantized).
- **Quantization:** the nearest color is picked in OKLab. If tokens are missing, a gray development palette is used, with a console warning.
- **Viewer roles:** `--scene-bg`, `--trail`, `--future`, `--frustum`, `--trajectory`, `--accent-forward`, `--accent-rewind` and `--accent-hold`.
- **`--background-level`:** no world declares it in CSS; it is set from JS with `setBackgroundLevel`.
  - A: drops to 0.55 while scrubbing.
  - B: 0.9 in the hero (the spotlight dims it); 0.1 and 0.35 in Plates II and III.
  - D: 0.75 in the hero, 0.55 in the detail, 0.7 in the plan and 0.25 in the point view.
- **Grading before quantizing**, read from tokens (1 = no change): `--display-chroma` scales chroma in OKLab and `--display-exposure` scales linear light. B, D and E declare them, because their night scenes need more light and chroma to reach their palette:
  - B: 1.5 and 1.3;
  - D: 1.2 and 1.25;
  - E: 1.15 and 1.05.

### Scene skies (B, E)
B and E have a sky of their own behind the points; D does not (see below). Their colors are **linear shader inputs**, not screen roles: the display quantizes and dithers them to `--pal-16-*` like the rest of the scene. Their clock is the pack's NOW (`time.exactFrame`), so in HOLD they stay still and the engine sleeps.
- **B's aurora** (`src/4d-os/worlds/b/aurora.ts`, `b-aurora-*`, `--aurora-strength: 1.4`): a full-screen quad with teal, violet and magenta curtains that fade toward the ground and turn with the camera's heading. It is in the hero, in Plate II's plate and in Plate III, which uses its own clock.
- **D has no sky.** The rain of φ glyphs it once had was retired on 2026-09-24: behind the city is the black glass, `--scene-bg`, as in the rest of its views. Of the off phosphor `--neon-body` only the value is read: it is the brightness cap of the bodies of the city's signs (`neons.ts`), which keep their deep cyan or magenta hue.
- **E's lens** (`src/4d-os/worlds/e/lens.ts`): the black hole, computed per display pixel on every render. Each ray is integrated through Schwarzschild space:
  - if it falls inside the horizon, it stays black (the shadow);
  - if it crosses the disk, it adds its light with the gas's Doppler shift and the gravitational redshift;
  - if it escapes, it reads the pack's stars.

  The disk shows above and below the shadow and changes shape as the view orbits.

### Named Rules
**The Palette Membership Rule.** Every accent and every viewer role (`--scene-bg`, `--trail`, `--future`, `--frustum`, `--trajectory`, `--accent-*`) is exactly one member of its world's `--pal-16-*`, and the 1-bit pair comes from it. A color outside the palette is quantized to another one and the NOW stops reading. Today it holds in all five worlds; check it whenever any token is touched. `--aurora-*` and `--neon-body` are left out on purpose: they are scene light that the display quantizes, not roles.

**The One Now Rule.** Only the present carries the forward or rewind color. `bindDesktop` publishes `--accent-current` and `<html data-direction="1|-1|0">`. Every mark of the NOW in the chrome uses `--accent-current`, never a hex. In HOLD the accent is the world's neutral light: paper, sage white, light, writing phosphor or bone. The only built exception is B's *synthetic* tag, which shares REWIND's magenta. In D, the neons and the diagram that the bake paints in the NOW's color are repainted in memory to meet this rule.

**The Closed World Rule.** A world's chrome colors do not appear in another:
- the red wall belongs only to A;
- the sage (charcoal plate, sage cards), the aurora and the tag magenta belong only to B;
- the emulsion and the grease pencil belong only to C;
- the phosphor and the phi gold belong only to D;
- the flat void, the heat ramp, the channel clocks and the lens belong only to E.
- the house's wash (lavender at the top, apricot at the bottom, `mu-east-*` and `mu-west-*`) belongs only to the house of the playground museum. It is a radial anchored to the page's edge, moved only by the scroll position, with no curtains and no clock. It is not B's aurora, which is a shader scene sky, with curtains and the pack's clock: the aurora does not enter the house, and the wash does not enter a world.

The display palettes of A, B and C do share scene tones (brick, sodium, teal windows, the alley's magenta neon), because the scene is the same; that does not license carrying them into another world's chrome. The forward cyan and the rewind amber are the NOW's semantics, not world color, and that is why they repeat across A, C, D and E.

**The Ink Ring Rule.** In B, every mark of the present that falls on the sage carries a charcoal ink ring: aurora green only gives ≈1.4:1 against `--mount`, and ink gives 7.6:1. The current frame on the sheet uses a 2 px ink outline outside and the accent inside. The state pill and the playhead knob carry `box-shadow: 0 0 0 1px var(--mount-ink)` around the accent.

**The Silver Print Rule.** In B, outside Millions mode, every source frame (camera, sequence sheet, the chapter's video figure) is toned to sage silver: `background-color: var(--mount)` with `background-blend-mode: luminosity`, declared in `:root:not([data-depth='millions'])`. That way the video's brick and sodium do not bring a warm field into the plate. D applies the same mechanism with its own color: its source frames are shown in phosphor (`--beam`), because the tube has no color. In Millions, the frame is shown untoned.

**The Gold Is Phi Rule.** In D, gold (`d-phi`) marks only the golden ratio: the φ figure, the ratio row in the readings, the spiral and the measurement on the pack. Nothing else on the page is gold, not even the NOW.

**The Flat Field Rule.** In E's chrome there are no gradients, transparencies or blends: only flat palette fields. Colors shift, they never mix. Dimmed tones are another palette member (`e-periwinkle`, `e-slate`), not a `color-mix`. The whale's clock changes color in steps along the ramp, not by interpolation.

## Typography

**Display Font:** one per world:
- A: Host Grotesk;
- B: Bricolage Grotesque, condensed;
- C: Big Shoulders Stencil;
- D: Tektur, condensed (`wdth` 75);
- E: Science Gothic, wide (`wdth` 118–128; the whale's clock reaches 200).

**Body Font:** the same grotesque in A and B; Archivo in C; Jura in D; Atkinson Hyperlegible Next in E.
**Label/Mono Font:**
- A, B and C use a pixel or dot-matrix font: Departure Mono, Geist Pixel and Doto; C adds Permanent Marker as the hand.
- D uses the same Tektur, with tabular figures, for every live figure, label and timecode.
- E uses **E Instrument**: Handjet for letters and signs, with the digits in Atkinson Hyperlegible Next through `unicode-range` (U+0030–0039, `size-adjust: 95%`).

**Character:**
- A, B and C pair a poster grotesque with a pixel font for the chrome. The grotesque speaks of the world (museum, printer's plate, industrial stencil) and the pixel font of the operating system and of time.
- D is a terminal: a single technical face, condensed and square-angled, for headlines and figures, and a round geometric face (Jura) for reading and for the equations. Both have their own Greek (φ, θ, π).
- E is a measuring instrument: a wide, heavy gothic for the clocks and the headlines, a condensed dot-matrix face to label channels and units, and a high-legibility sans for the text.

### Hierarchy (shared pattern; values per world in the front matter)
- **Display** (500–800, `clamp()` up to ≈6rem, line height 0.86–0.92): the first screen's title and the opening titles of the story page.
- **Headline** (500–800, `clamp()` up to 3.75–4.75rem, ≈0.9–0.95): the title of each chapter (room, plate, reel, page or band).
- **Monument** (D and E only): the largest figure on the page. In D it is φ in gold, up to 9.6rem. In E it is the two clocks, up to 96px.
- **Body** (16–19 px, 1.45–1.62, 44–62ch): the chapters' running text.
- **Window body** (13–14 px, 1.4–1.45): text inside windows (A, B and C).
- **Label:**
  - A, B and C: the pixel font at its native size (11, 12 or 14 px);
  - D: Tektur 600 at 11–13 px, with 0.08–0.14em, in capitals;
  - E: Handjet 500 at 14–17 px, with 0.04em, in capitals.

  It is used in title bars, captions, timecode, state and rulers.
- **Timecode:**
  - A, B and C: twice the pixel size (22, 24 or 28 px);
  - D: 1.5rem;
  - E: 22 px.

  It goes in the clock and in the timeline header, with tabular figures.

### Named Rules
**The Native Pixel Size Rule.** In A, B and C, the pixel font is used only at its native size (`--pixel-size`) or at double that size (`--pixel-size-2x`): 11/22 px in A, 12/24 in B and 14/28 in C. At any other scale it blurs and breaks the grid. D and E use no bitmap fonts and are outside this rule.

**The Tabular Time Rule.** Every changing figure (timecode, frame, state, pack figures, readings) is set in tabular numerals. B, C and E set them on `body`, D on its system class (`.sys`, readings, timeline, listing) and A on each element.

**The Readable Zero Rule.** In E, label figures are never set in Handjet, whose split zero reads as an eight at those sizes ("0:00" passed for "8:88"). The composite face E Instrument puts the digits in Atkinson Hyperlegible Next, with a slashed zero, at Handjet's cap height. Both faces declare the same weight range (100–900), because Chromium only composes faces with equal descriptors.

**The Redshift Clock Rule.** The whale's clock in E is typography that measures: `--its-k` (0–1, published by `readouts.ts` from dτ/dt) takes it from width 100 to 200 (42% of that travel on mobile) and from weight 700 to 200, and its color climbs in steps from ice to flame. Your clock never changes.

## Layout

**Hard pixel grid.** The display paints at 1/3 resolution (`pixelScale: 3`, `--render-scale: 3`) and upscales without smoothing; the chrome shares that unit.
- **A** takes it furthest: `--u: 3px` for all inner spacing, and the display case rounded to multiples of 3 px (`--case-w: round(down, 64vw, 3px)`, with the 16:9 height rounded the same way) so the dither blocks line up with the frame. A's room plan is a 72×48 canvas upscaled ×3 with `image-rendering: pixelated`.
- **E** carries the grid into its charts: each canvas measures a whole multiple of 3 CSS px, and each chart pixel is a display block.
- **D** is the native exception of the vector world: its chrome drawings (plotter, oscilloscope, story figures) are **1 px vectors at device density**, aligned to its grid, because a vector tube has no pixels. Only the scene render runs at 1/3.

**Spacing.**
- **Between windows:** `--gap: 12px` in A, B and C.
- **Page margin:** 24 px in A, C and E (16 when narrow); 24/32 px in B; 32 px in D (16 when narrow). Borders are `--hair: 1px`.
- **Chapter air:**
  - B and C: 12vh above and below.
  - A: in multiples of the unit (120 px above, 132 below).
  - D: 150/110 px (96/72 when narrow).
  - E: 13vh/14vh (9vh/10vh when narrow).
- **Maximum content width:** 1200 px in A, 1240 px in D and 720–900 px in B's and C's lists. E runs full width within the margin.

**First screen.** It is one screen tall (`100svh`) and carries the scene full-bleed or centered, with panels in the margins. Minimum heights: B 640 px, C 880 px, D 560 px and E 600 px. Below it comes the story page, in normal flow.
- A and C are desktops with absolute or grid composition.
- D and E are instruments:
  - **D:** the glass full-bleed, a 38.2% tube on the right (`d-tube`), the title at the top left and the control deck at the bottom.
  - **E:** the scene screen at the top left, a 184 px column on the right (monitor and waterfall) and the recorder band at full width at the bottom (`e-band`, with a 44 px transport inside).

**"Scroll is time" chapter (A and C).** A tall section (360svh in A, 320vh in C) with a `position: sticky` stage of `100svh`. `bindScrollTime` turns progress into a target frame (scrolling down moves forward, scrolling up rewinds) and releases it on leaving.

**Gesture hero (B, D, E).** Scroll-time lives in the first screen (see Components, "Gesture hero"). Common structure:
- **Track:** it measures **300svh** (100 of stage + 200 of travel), and 260svh with the windows or panels stacked.
- **Stage:** `position: sticky; top: 0` at `100svh`, with `z-index: calc(var(--engine-z) + 1)`. Neither the section nor the track creates a stacking context, so the stage and the panel layer, which do create one, rise above the engine's fixed canvas. The scene's glass is transparent.
- **Panel layer:** B (`.desk__windows`) and D (`.hud`) put their windows or their tube in a sibling layer that covers the whole track, with its own sticky interior and `pointer-events: none` except over the panels.

B no longer has a "scroll is time" chapter: its Plate III is "From the side."

**Golden grid (D).** Columns of 61.8 / 38.2: the tube measures `clamp(340px, 38.2vw, 540px)`, and the story uses `grid-template-columns: 1.618fr 1fr`. Sizes come from 16·φⁿ (`--step-0..3`: 1, 1.618, 2.618 and 4.236 rem), with the display ceiling at 6rem.

**Reading grid (E).** The story runs in two 7/5 columns (`minmax(0, 7fr) minmax(0, 5fr)`). Every reading uses the same three-column grid, **quantity / value / unit**, with `subgrid` and 1 px separators in grid gray. Each band of the story goes down through the time of the fall and carries its channel and its r/rₛ on the title line.

**Responsive.**
- **Breakpoints per world:**
  - A: 760 px.
  - B: 760 px and landscape phone (`(orientation: landscape) and (max-height: 500px)`); a short breakpoint (`max-height: 819px`) compacts the card column.
  - C: 820 px, plus a height breakpoint (`min-width: 821px and max-height: 900px`) that hides secondary lines of the cards.
  - D: 760 px and landscape phone, with an intermediate range of 761–1100 px for the readings.
  - E: 760 px and landscape phone, with a range of 761–960 px that moves the readings to two rows.
- **Narrow, A, B and C:** the windows do not stack: they dock (see Components, "Window dock"), with `--win-drag: 0` (no dragging); the main action (timeline, sheet or strip) goes right under the scene and the echo dialog is hidden in B and C.
- **Narrow, B:** the hero stays pinned on mobile (minimum height 480 px in portrait). The fixed stage carries the caption, on charcoal, the plate and the window dock at its foot; an open card rises above the dock and the plate is framed in the band between the caption and the card. On a landscape phone, the caption goes in a charcoal column to the left of the plate (`clamp(260px, 44vw, 420px)` while docked), with the dock at its foot.
- **Narrow, D:** the tube drops below the hero. The stage keeps at-a-glance readings (`.glance`) and a 132 px pocket plotter. The monitor drops into the control deck as two rows of segmented cells (30 px; 44 px on a coarse pointer). D is the playground's reference stage deck.
- **Narrow, E:** the column drops below the hero, and E adopts D's stage deck: `.stage-dock` on the recorder holds the zoom keys (`.stage-keys`) with a NOW line, then the Time and Colors rows. The recorder, 148 px tall (120 in landscape), stays on the stage.

### Named Rules
**The Three Pixel Rule.** Everything that touches the render (display-case frames, pixel canvases, generated textures, E's charts) measures multiples of 3 px or is upscaled by integers without smoothing. No fractional scales on pixels. D's vector strokes are not display pixels and follow the device grid.

**The Gesture Track Rule.** Every gesture hero measures 100 of stage plus 200 of travel (300svh; 260 stacked). The travel is divided by fraction (zoom up to 0.55, final segment up to 0.9 and rest up to 1) and is not rescaled per world.

## Elevation & Depth

Everything is flat. There are no diffuse elevation shadows in any world. Depth comes from:
- window stacking: increasing `z-index` from `baseZ: 20`, above the engine's canvas (`--engine-z: 5`);
- in the gesture heroes, the pinned stage, which rises to `--engine-z + 1` (E raises its console to `+ 2`);
- the 1 px frame;
- the contrast between the world's surface and the body of the window or panel.

The active window is told apart by its title bar, not by a shadow. In D, the active state is a second stroke; in E, the inversion of the field.

### Shadow Vocabulary
- **Default-button ring** (B: `box-shadow: 0 0 0 1px var(--mount), 0 0 0 2px var(--mount-ink)`): the double outline of the default button on 1984 desktops. It is an outline, not a shadow. The caption controls (`.loupe__keys`) use half of it: `0 0 0 1px var(--mount)` outside the ink border.
- **B's present ring:**
  - on the sheet's current frame, `box-shadow: inset 0 0 0 2px var(--accent-current)`;
  - on the state pill and the playhead knob, `0 0 0 1px var(--mount-ink)`.

  They are outlines that separate the accent from the sage, not elevation.
- **Checked box** (B and C: `box-shadow: inset 0 0 0 2px <paper>`): the inner dot of radios and checkboxes.
- **D's double stroke** (`box-shadow: inset 0 0 0 2px var(--glass), inset 0 0 0 3px var(--beam-hot)` on checked boxes and cells; `outline: 1px solid var(--beam); outline-offset: 2px` on the active or pressed key): the active state is a second concentric stroke, never a fill.
- **C's active bar** (`box-shadow: inset 0 -2px 0 var(--paper)`): the light line under the leader band of the active card.
- **Light leak** (C, only while rewinding): `box-shadow: 0 0 0 2px color-mix(in oklab, var(--leak) 45%, transparent), inset 0 0 22px color-mix(in oklab, var(--leak) 55%, transparent)` on the strip's gate. It is film light, not elevation.
- **Active can** (C: rings `0 0 0 4px var(--paper), 0 0 0 5px var(--leader)`): selection by outline.
- **Caption scrim** (B, only over the glass): an elliptical `radial-gradient` from the top left corner, from charcoal `--plate` at 88% to 55%, and transparent at the edge. It gives the large caption a ground over the aurora and the trail. It is a legibility ground, not a shadow; when narrow it turns off, because the caption sits on charcoal.
- **Glass or void strips** (D: `.mast__glass`, `.mast__words`, `.deck__hint`; E: `.slate__title`, `.slate__line`): the world's solid background behind each line of text over the scene (`box-decoration-break: clone`). In D, "the text erases what is behind it", like the tube's alpha.

### Named Rules
**The Flat Desk Rule.** No window or panel casts a shadow. Focus shows in the title bar (stripes in A and B, a light line in C), in a second stroke (D) or in the inversion (E), and order shows in the stacking.

**The Light Is Time Rule.** The chrome is lit only by time. There are two permitted lights, and both mark a clock event:
- C's orange leak, only while `data-direction="-1"`;
- D's page erase at the loop seam: the plotter floods with writing phosphor and decays in steps over 0.45 s, with a 0.2 flash over the scene.

B's HOLD inversion is not light, it is a state. The light that lives inside the render (the frustum's spotlight, the aurora, E's disk) is quantized scene, not chrome.

**The Stroke Only Rule.** In D, the chrome is stroke only: 1 px lines, ticked axes and tube text. There are no fills, gradients or shadows. Bars that "fill up" (boot, bytes) are written with 1 px hatching (`repeating-linear-gradient`, a 1 px stroke every 3–4 px), like a plotter. The only fill is the glass that serves as the text's ground.

## Shapes

Corners are square by default (`rounded.none`) on windows, A's and C's buttons, display cases, plates, cards and all of D and E. Curves exist only where the real object has them:
- in B: the 1984 default button (`rounded.b-button`) and the round radios (`rounded.round`);
- in C: the round radios, the strip's frames (`rounded.c-frame`), the gate (`rounded.c-gate`), the reel figure with a 14 px leader frame (`rounded.c-reel`) and the circular cans;
- in D: the GIN cursor's ring and the leader line's dot, which are tube geometry.

Controls are drawn with backgrounds, strokes or pixel masks, not with glyphs:
- 11–12 px boxes with `appearance: none`;
- the "+/–" of the FAQs and A's shade, with a 1 px `linear-gradient`;
- the play, HOLD, − and + icons, as 12×12 `<svg>` with `shape-rendering: crispEdges`;
- in E, exclusive options as an 11×11 **pixel diamond**, hollow or filled (a `crispEdges` SVG mask), and layers, which add up, as a square box.

Crop marks are geometry of the exhibition and photographic world: in A, 12 px corners 18 px from the frame; in B, corner brackets at opposite corners of the figure. In D, each page's rule carries a 9 px axis tick at its origin.

## Components

### Window (shared by A, B and C: `src/engine/window/windows.ts`)
Markup `.win[data-window] > .win__title + .win__body`. The bar is usually an `h2` with an `id`, and the window has `aria-labelledby`. Behavior:
- **Drag:** by the bar with Pointer Events, not from buttons or fields; the window stays contained in the viewport and is marked `.is-dragging` while it is dragged. On touch screens, the bar has `touch-action: pan-y`: a vertical finger scrolls the page, and a horizontal one drags the window.
- **Focus:** it comes to the front when touched or focused (`.is-active`, increasing `z-index`).
- **Offset:** it goes in the `translate` property, so the window keeps its place in the world's layout. `--win-drag: 0` turns dragging off (narrow screens) and cancels the offset.
- **Attributes:** `[data-dismiss]` hides its window; `[data-trail]` turns on the echo.

How each world dresses it:
- **A (label):** an `a-paper` body with a 1 px ink border, and an ink bar with Departure Mono 11 px. When active, 2+1 px horizontal stripes run under the text, which keeps a patch of ink. An optional shade (`.win__shade`, 11 px) folds the window up to its bar, with `aria-expanded`.
- **B (mount card):** all in sage (`--mount`), with the bar in sage, a charcoal bottom border and Geist Pixel 12 px without capitals. When active, 1+1 px charcoal stripes, with the title on a sage block. The body is inset 3 px with its own 1 px frame.
- **C (leader card):** a `c-paper` body and a black 20 px leader bar with Doto 700 in capitals, plus its own edge code on the right (`.win__code`, e.g. `0923 E7`). When active, a 2 px light bottom line.

### Window dock (shared by A, B and C: `src/engine/window/dock.ts`)
`bindDock` sits next to `bindWindows` and is headless. While a world's narrow query matches, it creates `.dock` (`role="group"`, `aria-label` "Windows") with one `button.dock__button` per tool window (`aria-expanded`, `aria-controls`), each named after its window's title. It sets `html[data-dock]`, `data-docked` on each window and `hidden` on the closed ones, and gives windows without an `id` a `dock-window-<name>` id. At most one window is open. Escape closes it and returns focus with `preventScroll`. It never scrolls, never reparents and never touches `translate` or `z-index`. Leaving the query restores everything. `onChange(open)` runs after each change. Each world adds `[data-docked][hidden] { display: none !important }`. Three skins:
- **A (Vitrine):** ink title bars 45 px tall on the 3 px grid, one unit apart on the oxblood wall. The open window is a paper tab joined to its bar, whose top edge is the ink rule under the row. Options become 45 px cells around the 11 px pixel box. Layers is open on arrival.
- **B (Plate):** a sage letterpress strip (condensed 700 capitals, 0.08em tracking, ink hairlines) at the foot of the pinned first screen, inside the window layer. The open button is inverted to ink. One row from 390 px, two rows of three below 390 px and in landscape. The open card rises above the strip with its own title bar and never scrolls inside. Legends and asides use 74% ink (4.7:1). The plate is framed in the band between the caption and the card. All windows are closed on arrival.
- **C (Leader):** black leader bands in Doto capitals, 44 px tall, 4 px emulsion gaps. The open band has a 4 px leak-orange bottom edge. The card's title bar becomes a leader band at its bottom carrying the edge code. Layers is open on arrival.

Docked legends are positioned at the left of a padded grid, never floated (WebKit gives a floated legend its own row).

### Window echo (shared: `windowTrail.ts`)
While a window with `[data-trail]` is dragged, it leaves inert copies (`aria-hidden`, `inert`, class `.win-echo`) every 14 px, up to 90. On release, the copies wait 900 ms and are erased from oldest to newest, at 12 ms per copy. It does not run with reduced motion. Each world presents it as a dialog of its own ("Gallery notice", "Plate 4D-002", "Splice").

### Boot (shared: `boot.ts`)
A window or panel with `[data-boot-fill]`, `[data-boot-pct]` and `[data-boot-message]`. It shows the real progress in bytes and reveals the scene by a threshold dissolve in 14 steps over 1100 ms (instant with reduced motion). If it fails, it is marked `.is-error` and the reason is given in the world's voice.
- Messages of their own: "Hanging the exhibit", "Developing plate…", "Threading film…", "Computing the falcon…" (under the title "4D.OS · falcon-phi") and "Tracing the fall…" (under "Acquiring").
- D writes the bar with 1 px hatching every 3 px and turns the frame dashed on error.
- E fills the bar in solid bone and sets the message in gold on error.

### Timeline (shared: `timeline.ts`, `keyboard.ts`)
A `role="slider"` track with `tabindex="0"` and `aria-valuetext` in timecode.
- **Pointer:** a click jumps; a drag scrubs in HOLD and, on release, restores the speed.
- **Track keys:** arrows, Home/End and PageUp/PageDown.
- **Outputs:** it publishes `--playhead` (0..1). The ruler (`[data-ruler]`) paints a tick per second and a larger, labeled one every 5 s. The live state goes in `[data-now="timecode|frame|state"]` and is written `FORWARD +1.00×`, `REWIND −1.00×` or `HOLD 0.00×`.
- **Global keyboard:** space for HOLD/resume; J/K/L for rewind/HOLD/forward (repeating speeds up); ←/→ one frame. It yields the keys that the focused control uses.

### Gesture hero (shared: `src/engine/shell/zoomHero.ts`, spec `hero-gesture`)
`bindZoomHero({ hero, stage?, surface, time, engine, z0, zoomSpan, onZoom, onDissolve, onPhase, controls?, keys? })`. It is a tall track with a sticky stage. Scrolling is native, Lenis smooths it when present, and a ScrollTrigger gives the progress; it captures no events. Phases, published in `hero.dataset.heroPhase`:
- **`loop` (0 → 0.55):** the clock loops with `play(1)`, and scroll and pinch only change the zoom `z` (0 = closest, 1 = full plate). The curve is `easeZoom`, which eases in and out but keeps a slope: the first notch already pulls back. **The loop seam** calls `onDissolve`.
- **`final` (0.55 → 0.9):** the zoom stays at the top and scrolling carries time through a fixed window of the last 4 s to the last frame. There is a 0.02 breather so that one scroll step does not change zoom and time at once, and a `damping` of 0.03 s only during this segment. If the frame is more than 1 s before the window, `onDissolve` covers the jump.
- **`rest` (0.9 → 1) and `after`:** the last frame stays in HOLD. With the stage in view, it lands with the target; a direct jump with the hero off screen forces the state.
- **Back to the loop:** the target is released and `play(1)` continues from the current frame.
- **Gesture HOLD:** while the gesture carries time, `<html data-hold-origin="gesture">`. HOLD effects (B's inversion) check it and do not fire.
- **Manual zoom:** pinch (through `surface.setPinchHandler`), `[data-zoom="in|out"]` buttons and the +/− keys, in steps of 0.25 in ln(distance). They add to `z` with a critically damped spring of 0.1 s half-life, only in the zoom segment, and fade out at the top.
- **Reduced motion:** no `play`, no dissolve and no smoothing. On returning to the zoom segment, time stays where the final segment began.

Each world wires `onDissolve` as the display's threshold dissolve (14 steps in 0.45 s), with `chase.reset()` so the camera reappears in place without a sweep. D adds its page erase. Each world also gives a hint per phase in its voice, next to the HOLD, − and + controls:
- B: "Scroll to open the plate", "to the last exposure", "on to the plates";
- D: "Scroll to see every moment", "to the last frame", "on to the story";
- E: "Scroll to draw back", "to the last frame", "on to the recording".

### Chase camera (shared: `src/engine/shell/chaseCam.ts`)
`bindChaseCam({ engine, viewer, time, track: subjectTrack(pack), chase })` follows the subject in third person with the continuous NOW.
- **Aim:** the path is prefiltered with a Gaussian (`smoothing`, σ in s) and carries a critically damped spring on top (`lookHalflife`, 0.12 s by default). `lookAhead` looks ahead in the direction of travel.
- **Zoom:** `setZoom(z)` pulls back on a logarithmic scale from `near` to the **full plate**. The full-plate distance (`farDistance`) is fitted so the box of all moments fits in the view's `frame` rectangle, which leaves free the panels that would cover it. With w = smoothstep(0.55, 1, z), the aim moves from the subject to the box's center, the elevation rises to `elevationFar` and the side opens to `sideFar`. At zoom 1 the camera stays still even while time runs.
- **Controls:** `zoomFor(distance)` and `logSpan` feed the hero's `z0` and `zoomSpan`. `side`, `lookAhead`, `elevationFar`, `sideFar` and `frame` accept functions that are reread every frame (orientation, aspect).
- **Orbit:** the visitor drags through 360°. On release, after `returnDelay` (2.2 s), only the angle returns, never the distance.
- **Cutaway:** with `cutFocus`, the cutaway follows the subject and, as the view opens to the full plate, moves smoothly to the path's box.

### Scene views (shared: `TimeViewer`, `closeUp.ts`, `pinch.ts`)
- **Cutaway:** every view with a background uses `setCutaway(true)`, a cutting plane that removes the geometry between the camera and the subject, as in a dollhouse. By default it is anchored to the path's box; `setCutFocus(center, ground)` anchors it to the subject.
- **Look adjustments** (without changing data):
  - `setNearFade(layer, [near, far])` fades out the trail or the background right against the lens;
  - `setFrustumLightLook({ density, amount })` grades how many points are left outside the source camera's spotlight;
  - `setMaxPointSize(px)` caps the point size in display pixels (6 in B, 4 in D and E);
  - `setTrailLook({ tint, min, max, tau })` grades the trail.
- **Present** (`setPresentLook({ tint, bias })`):
  - `tint` (0–1, 1 by default) is how much the present takes the direction's color. With less, its own colors show: E uses 0.3 in the hero and 0 in the still frames; D's detail uses 0.4.
  - `bias` (m) moves the present toward the camera so it wins ties with its own trail (B 0.04, D 0.05).
- **Stable points and present interpolation.** If the pack declares `"correspondence": true`, all frames have the same number of points and point *i* is the same place on the subject in every frame. The three current packs declare it. The viewer then draws the present between its position in the frame and in the next one (`aNext`, `uFrac` = `exactFrame − frame`), and the trail at its frame. In HOLD or without correspondence, `uFrac` = 0. The view repaints even when the integer frame does not change. That is why a still subject (the seated cat, the perched falcon) needs `bias`.
- **Pinch** (`setPinchHandler(handler)`, `zoomBy(dLog)`): zoom comes only from pinching, whether by touch (two pointers), on a trackpad (Ctrl+wheel, 0.01 per pixel, clamped at 0.3) or in Safari (GestureEvent). The wheel without Ctrl scrolls the page. Without a handler, the camera approaches `controls.target` with a critically damped spring; with a handler (the hero), the change in ln(distance) goes to whoever asks for it. `zoomBy` is the single-pointer alternative for buttons and keys. With orbit, a vertical finger scrolls the page (`touch-action: pan-y`).
- **"One frame" view** (A's room 6, B's step "3D, one frame at a time", C's step "Develop"): a still close-up with `closeUp(pack, frame, distance, fov, lead)`. The subject of that frame is seen at 70° from the source camera's axis and 20° of elevation, and `lead` shifts the framing toward the camera so its frustum fits. B and C frame frame 210 (the middle of the pack); A frames 231 (55%).
- **"All at once" view:** it has its own clock in `all` mode, independent of the main clock.

### Layer and display controls (shared by markup)
`input[name="mode"]` (memory / all), `input[name="depth"]` (1bit / 16 / millions) and `input[data-layer]` (trail, background, frustum, trajectory). Each world names them its own way: "Display" in A, "Monitor" in B, "Stock" in C, "Time / Colors" at the foot of the tube in D, and "Time / Colors / Layers" in E's monitor, where the background layer is called "Baked disk".

### Footer mark (shared: `tesseract.ts`)
A tesseract in dashed edges (1.25 px line, 0.09/0.07 dashes) with continuous 4D rotation (0.22 rad/s), marching dashes and a turn toward the cursor. It stays still with reduced motion. Its color comes from the `--paper` token: in D it is the writing phosphor. It has `role="img"` with a description. It measures 140 px in D and 120 px in E.

### A "Vitrine"
- **Display case** (`.case`): the scene inside a 1 px ink frame on the wall, 64vw wide at 16:9, rounded to 3 px, with four crop marks outside the frame in `--wall-ink`. Variants: `case--life`, `case--figure` and `case--wide` (vertical 3:4 on mobile).
- **Rail** (`.rail`): the timeline hangs under the display case, at the same width:
  - a 33 px square ink play button, which turns `--accent-current` while playing;
  - the timecode at 22 px;
  - a 33 px track with a 3 px playhead in `--accent-current` and an ink outline.
- **Label** (`.label`): a 22 px 700 title, the technique, the author in italics, the figures in a pixel `dl` and a tabular inventory number (`4D.2026.001`) after a 1 px rule.
- **Room plan** (`plan.ts`): an overhead view in pixels, with the key Cat / Camera.
- **Room number** (`.room__no`): a pixel tag with a 1 px border on the same line as the title, never above it. Rooms alternate `room--wall` and `room--paper`.
- **Room 6:** two still display cases:
  - the close-up of frame 231, with no trail or trajectory;
  - the whole journey in `all` mode, with A's stride (half a second: 15 frames at 30 fps) and no frustum.
- **Signature:** while the rail is dragged (`.is-scrubbing`), the scene's background drops to level 0.55 and the display case is lit only by the frustum's light.

### B "Plate"
- **Hero plate** (`.desk__plate`): the scene full-bleed on charcoal, in `all` mode, with the chase camera:
  - **Rest:** at 3.4 m (2.6 m stacked), `near` 1.4 m, 17° of elevation and −68° of side, looking 0.5 s ahead (0.12 in portrait).
  - **Full plate:** from the side and barely from the front (26°, −100°); in mobile portrait, diagonally from behind (40°, −45°), so the climb goes up the screen.
  - **Orbit:** it drags through 360° and goes down to a polar angle of 104°, below the horizon.
  - **Light and fades:** the spotlight is on (`setFrustumLightLook({ density: 0.03, amount: 0.6 })`) with the background at 0.9. The trail and the background right against the lens fade out (`setNearFade`: trail 2.2–3.0 m, background 0.4–0.9 m).
  - **Present:** `setPresentLook({ bias: 0.04 })`.
  - **Layers:** frustum and trajectory hidden (they turn on from Layers); stride 30, one exposure per second; max point size 6 px.
  - **Framing:** on desktop, the projection is shifted (`setViewOffset`) to center the cat in the free glass, and the full-plate rectangle (`frame`) is measured from the layout between the column and the sheet.
- **Aurora sky:** behind the hero's points (see Colors).
- **Muybridge graticule** (`.desk__graticule`): 1 px lines every 64 px in `--grid-line` over the lower 58% (50% when narrow), faded upward with a mask, and column numbers in condensed Bricolage 700 at 15 px in `--grid-number`.
- **Caption** (`.caption`): "PLATE 4D-002 / CAT, ASCENDING STAIRS." in condensed capitals at display size. The two lines are the same title: "PLATE 4D-002" in sage (`--mount`) and the subject in sage white. Behind it goes the radial charcoal scrim (see Elevation & Depth). Below, a note on a charcoal ground with the magenta *synthetic* tag (`b-tag`, Geist Pixel 12 px).
- **Caption controls** (`.loupe`), like the keys of an enlarger:
  - a sage card with an ink border and an outer sage ring;
  - three 32×26 px keys (loop play/HOLD, − and +) separated by ink rules; active, inverted; disabled, at 30% ink;
  - the phase hint in Geist Pixel 12 px on charcoal.
- **Sequence sheet** (`.sheet`): 12 source frames from the atlas in a grid (6 per row on mobile), toned to sage silver (The Silver Print Rule). The current one (`aria-current="true"`) has a 2 px ink outline outside (`outline`, offset 1 px; 7.6:1 on the sage) and the present's color as a 2 px inner ring (`box-shadow: inset 0 0 0 2px var(--accent-current)`). A click jumps to that frame. Below go the printer's caption "ANIMAL LOCOMOTION. PLATE 4D-002." and the timeline.
- **Exposure dial** (`plate.ts`): segments in a row with a 1 px border; the checked one is inverted (sage on charcoal). The stops are strides of 3, 5, 15, 30 and 60 frames, labeled in exposures per second (at 30 fps: 10, 6, 2, 1 and 0.5). It starts at 30 ("1").
- **Register** (`.register`): rows with 2 px dotted leaders between the term and the figure.
- **"Plate 4D-002" dialog:**
  - from 1200 px, at the top right, in the sky next to the column, to leave the full plate free;
  - below that width, under the caption controls;
  - it is hidden on narrow, short desktops, when narrow and in landscape.
- **Short desktop** (761 px or more wide and up to 819 px tall): the card column compacts without secondary lines, with the layers in two columns.
- **Plate II:** the source frame, the still close-up of frame 210 and the full plate (side view, stride 15, background 0.1, with aurora).
- **Plate III "From the side."** (`.plate--side`): a side elevation of the same climb with its own clock in `all` mode; the hero's clock is carried by the gesture. Stride 15 (half a second: one cat per step), background 0.35, with aurora and `bias` 0.04. It runs only while in view and stays still with reduced motion.
- **Signature:** scrolling down opens the camera from behind the cat out to the full plate, the whole climb in silver cats over the aurora. The final segment brings the cat to sit at the top. At the very top, the climb loops, and the seam is covered by the dither dissolve.
  - Dragging turns around the cat, and the angle returns by itself.
  - The dial re-exposes the plate live: it changes a uniform, not the data.
  - **HOLD** inverts the whole screen for 90 ms with `html.is-inverting { filter: invert(1) }`, only when the visitor asks for HOLD. Never in the gesture HOLD (`data-hold-origin="gesture"`), with reduced motion or when narrow.

### C "Leader"
- **Gate** (`.gate`): the scene projected inside a leader band. It has 12×18 px perforations every 34 px on both sides, deterministic marks per frame (1–2 px scratches and chemical stains generated in `film.ts` with `multiply`) and its own vertical edge code (`4DOS 0923 E7 · 16MM · SAFETY BASE`).
- **Strip** (`.strip`, `strip.ts`): horizontal film at full width.
  - Perforations in `--emulsion` on the leader.
  - 160 px frames (112 on mobile) with a 4 px radius, a number in grease pencil (Permanent Marker, `--grease`) and a latent code in Doto 10 px `--sepia` every 20 frames.
  - The gate stays fixed at the center (7 px radius, 2 px border): light in HOLD, cyan going forward and orange with a glow when rewinding.
- **Light leak** (`.gate__leak`): a burned texture generated on the pixel grid. It has opacity 1 only with `data-direction="-1"`, with a 220 ms transition.
- **Reel number** (`.reel__num`): a strip of leader with "Reel N" in grease pencil, turned −4°, on the title line.
- **Cans** (`.can`): circular lids of concentric rings with a handwritten paper tape. The active one has a double ring; the unavailable one is faded, with its tape turned the other way.
- **Tail leader** (`.tail`): a leader band with perforations above and below, the tesseract and "END".
- **Project** (the "Project" step): all the developed frames at once, with its own clock in `all` mode, stride 2 and automatic orbit, independent of where the strip is.
- **Signature:** grabbing the strip and pulling it through the gate. On release, it keeps going with inertia (a 0.32 s constant) and brakes by itself. With reduced motion there is no inertia: it stops where it is released.

### D "The golden stoop"
- **Hero view** (`.stoop__view`): the glass full-bleed, with the falcon in `all` mode. The trail is in phosphor, over the black glass. Configuration:
  - **Rest:** at 2.6 m (3.1 m stacked), `near` 1.1 m, in a dorsal three-quarter view: 30° above, on the inside of the curve (78°; 38° in portrait).
  - **Aim:** `lookAhead` compensates for the falcon's speed (6–12 m/s) against the spring's lag, with the sign of time. `smoothing` drops to 0.08, because the path comes from equations.
  - **Full plate:** a low three-quarter view (16°, −165° of the global heading; 26° on the phone). The trail reads as a helix of falcons descending toward the golden diagram.
  - **Light and trail:** the spotlight is on (`density` 0.35, `amount` 0.75) with background 0.75, so the city outside the cone goes dark and its neons do not compete with the NOW. The trail uses `tint` 0.72, `min` 0.5 and `max` 0.9; max point size 4 px; `bias` 0.05.
- **Title** (`.mast`): "The golden stoop." in condensed Tektur at the top of the display scale, on its glass strip. Below, a subject line in Jura on glass and the *Synthetic* tag (`d-tag`: 1 px border in `--beam`, Tektur 600 at 11 px with 0.14em, in capitals).
- **Tube** (`.tube`, the 38.2% right column): glass with a 1 px left rule in `--beam-dim`. The header "Plotter" is in Tektur 600 at 12 px, in capitals via CSS, with the plane and the time on the right. From top to bottom:
  - **Plotter** (`plots.ts`): the spiral in plan, drawn with the pack's clock, with labels riding the curve (π/2, π, 3π/2…), the pole unmarked, a 5 m scale and the NOW's cursor. What is stored is in phosphor, the NOW in the direction's color and φ in gold.
  - **Live equation** (`.eq`): `r(θ) = r₀ · φ^(−2θ/π)` in Jura at 1.45rem in `--beam-hot`, and below it its value at the NOW.
  - **Readings** (`.read`): a label / value grid. The label is Tektur 600 at 12 px in `--beam`, with a small subtitle in `--quiet`. The value is Tektur at 1.05rem in `--beam-hot`, with an alternative in `--beam`. Rows: θ (1.25rem), r, the ratio r(θ − π/2) ÷ r(θ) in gold (`d-reading-phi`), the wingbeat, the wingspan and the height, and the speed and the phase.
  - **Oscilloscope** (92 px): the wingbeat and the wingspan against time, with the phases of the flight (FLAP, GLIDE, STOOP, PULL, LAND, PERCH).
  - **Monitor** at the foot: TIME and COLORS in 11 px double-stroke boxes.
- **Draggable θ** (`.scrub`), an idea from HyperCard: reading is operating. The θ has a dotted underline and an `ew-resize` cursor; dragging it, or using the arrows, moves the NOW. While it is dragged, it has a second stroke.
- **Leader line** (`.leader`): a 1 px line and a dot in `--accent-current` that tie the reading table to the falcon on screen, like a dimension line on a drawing.
- **GIN cursor** (`.gin`): once the plate is full, a 1 px crosshair in `--beam-dim` across the whole free glass. Next to the subject it has a 9 px ring and ticks in `--accent-current`, with the letter of its detail.
- **Detail A** (`.detail`): in the final state, a 4:5 view of the perched portrait in the corner of the glass (the present's `tint` at 0.4), with a 1 px frame and the label "Detail A · frame 449 · perched" in the present's color. On the phone it takes the place of the pocket plotter.
- **Control deck** (`.deck`, the foot of the glass):
  - **Keys** (`d-key`): 30 px squares with a 1 px border in `--beam` (HOLD, − and +). On hover, the border turns `--beam-hot`; active, they carry a second stroke at 2 px; disabled, they are in `--beam-dim`.
  - **Phase hint:** Tektur 12 px in capitals, in `--beam` on glass.
  - **Timeline:** a 1 px box in `--beam-dim`, with the timecode at 1.5rem, the state in `--accent-current` and the frame on the right. The ruler has ticks in `--beam-dim` (the larger ones in `--beam`), and the playhead is 1 px wide with a 7 px cap.
- **Page erase** (`.tube__plot.is-erasing`, `.flash`): at the loop seam and on the jump to the final segment, the plotter floods with writing phosphor and decays in steps (writing → stored → low → glass, in 0.45 s), like a 4010 erasing its screen. The scene goes with it with a 0.2 flash, at the same time as the display's dissolve. It is off with reduced motion.
- **Story: terminal pages** (`.page`). Each page opens with a 1 px rule in `--beam-dim` and a 9 px axis tick at its origin, and carries its title in condensed Tektur. The five pages:
  1. **"A ratio that keeps its shape."** A monumental φ in gold, with "=" and "…" in `--beam`, plus the golden rectangle, phyllotaxis and **the measurement of φ on the loaded pack** (`measure.ts`, in a 1 px box).
  2. **"The spiral, from above."** The plate of the spiral in plan (background 0.7).
  3. **"Twelve a second."** A 3:1 Marey strip (2:1 on mobile) with stride 3 on black, the wingbeat trace and the frames of the photographic gun in 4 columns, in phosphor outside Millions.
  4. **"From equations to points."** Five stations in a fixed order, with the number on the title line (Equations, Skeleton, Points, Frame, Screen), separated by 1 px rules.
  5. **"What the pack holds."** A terminal listing with dotted leaders and figures at 1.35rem, and hatched byte bars proportional to each file's weight.
- **Colophon:** a 140 px tesseract in writing phosphor, the wordmark in Tektur 700, a line in `--quiet` and links in Tektur 600 at 12 px, in capitals.
- **Phones:** D is the playground's reference stage deck. Under the narrow query every first-screen tool lives in the pinned stage, and `plateFrame()` fits the plate between the title block and the deck, from live rects. On touch (narrow query and coarse pointer): 44 px keys with the 12 px glyph and the second concentric stroke kept (6 px gaps, a 144 px row); 44 px segmented cells; the timeline keeps its 24 px drawn ruler while the track's box grows 20 px upward over the head; the θ scrub is 45 px through padding given back by negative margins, with the dotted underline on the figure; the link back and the footer links are 44 px. Deck rows are block fieldsets with a floated legend and floated cells, never flex rows (WebKit). Phone text: glance labels, deck legends, the hint and the tube's `small` labels at 12 px; the φ label condensed (`font-stretch: 87.5%`). At 370 px or less the head keeps one line and "frame" is left to screen readers.
- **Signature:** the tube draws the spiral at the pace of the NOW and stores it. The loop seam erases the page with a phosphor flash. In the panel, the ratio between two radii a quarter turn apart stays fixed at 1.618, in gold.

### E "Whale fall"
- **Scene screen** (`.obs__view`): the whole stage except the column and the band. The camera chases the whale, with the shadow and the lensed disk behind it and the trail in a spiral. Configuration:
  - **Rest:** at 3.6 m (3.3 m narrow, 4.2 m portrait), `near` 1.6 m, 12° of elevation and −72° of side: in profile, from outside the orbit.
  - **Full plate:** at 34° and from outside the last turn (`profileSide`), so the last frame is seen in profile. No `cutFocus`: there is nothing to cut in the void.
  - **Layers** (`fallLayers.ts`): the trail uses a variable step, sparser where the whale moves slowly near the horizon, so it does not pile up into a ring. The present is painted last, on top of everything, with a 1 display-pixel silhouette in the state's color (bone in HOLD).
  - **Present:** `tint` 0.3; trail with `tint` 0.12; max point size 4 px.
- **Slate** (`.slate`): "Whale fall." in wide Science Gothic 800, on a void strip. Below, a subject line in ice on void and the *Synthetic* tag (`e-tag`: solid bone with void text, E Instrument 600 at 16 px, in capitals).
- **Recorder band** (`.recorder`, `e-recorder`): full width, with a 1 px top rule in `--grid`. It carries:
  - **CH 1 YOUR TIME t** and **CH 2 ITS TIME τ** (`e-clock-yours`, `e-clock-its`): the channel in E Instrument 17 px in periwinkle, with the name in bone and the symbol in ice. The figures are in Science Gothic 700, with the unit "s" at 0.32em in periwinkle. The whale's clock follows The Redshift Clock Rule and takes the free space of the grid (`max-content minmax(0, 1fr) max-content`).
  - **Readings:** Lag, r/rₛ, dτ/dt and z, with the name in E Instrument 16 px in periwinkle and the value at 30 px in bone, plus the unit.
  - **Transport** (`.transport`): the play key, the timecode at 22 px, a 30 px track with a ruler in `--grid` (the larger ticks in periwinkle), a 3 px playhead in `--accent-current` and the state on the right in `--accent-current`.
- **Column** (`.column`, `e-column`): void with a 1 px left rule.
  - **Monitor:**
    - a group of keys (`e-key`, 38×30 px: play, − and +) separated by 1 px rules in `--grid`, with the hover in `--deep` and the pressed key inverted (bone with void);
    - TIME, COLORS and LAYERS with pixel diamonds and boxes;
    - the phase hint.
  - **CH 3 "Tail beat" waterfall:** the tail beat in Hz against time, with time running down, the NOW's cursor and the note "Heard from far away. Time runs down."
- **Charts** (`charts.ts`): traces measured at 1/3 resolution, without smoothing, with Bayer dithering and palette colors only, and the heat ramp as the color map. Each canvas measures a multiple of 3 px and has a 1 px frame in `--grid` and axes in E Instrument with the unit in ice. They redraw only when the frame, the mode or the direction of their clock changes.
- **Story: bands** (`.band`). The first, **"Two clocks, one fall."**, is the entrance: the title at 7.6vw and the text at 1.25rem, in 7/5. Each band has a 1 px top rule, the title in Science Gothic 800 (width 118) and, **on the same line, on the right**, its channel and its depth r/rₛ, which goes down from band to band:
  1. **"Gravity bends time."** (CH 1–2): the two-pen record, with each pen labeled at its end in its trace's color (bone for yours, ice for the whale's), and the reading grid.
  2. **"Every orbit, one plate."**: the plate of the fall from above, at 21:9 (1:1 on mobile), with stride 15 and the caption in two columns.
  3. **"Redshift."** (CH 4): the 380–780 nm spectral waterfall shifting toward the infrared, with the NOW as a dotted cyan line and three still frames (4:3; 3:4 on mobile) with their reading.
  4. **"The last frame never arrives."** (CH 5): the approach chart, with a legend of stroke samples (line, cut and dotted), and the horizon view with its own clock.
  5. **"From the pack."** (CH 1–5): the register of the pack's figures.
- **Reading grid** (`.grid-read`, `.register`): the quantity in E Instrument 17 px in periwinkle, the value in Science Gothic 700 (`clamp(30px, 3.2vw, 46px)`) right-aligned in bone, and the unit in E Instrument 18 px, with a 1 px rule between rows.
- **Boot:** a centered box with a 1 px rule in `--grid`, "Acquiring" in periwinkle and the message in Science Gothic 700 (width 125).
- **Colophon:** a 120 px tesseract (80 px on mobile) and a line in E Instrument, in periwinkle.
- **Phones:** on narrow screens E adopts the stage deck in its own language. `.stage-dock` (created by `placeDeck`) sits on the recorder as one console with it: a void field in 44 px rows split by grid hairlines (keys and the NOW line, Time, Colors), Handjet legends, the pixel diamond drawn by the cell, the checked cell as a flat bone field with void text (inversion, never a blend), and the hint as a void chip above. The NOW line is two `aria-hidden` mirrors (`data-deck-now`) the deck writes from its own time subscription; the real outputs stay in the transport. In landscape the deck sits bottom-right on the recorder, flush with the edge like the desktop column; the title keeps the top left. On a coarse pointer the back tab is a visible 44 px bone strip and the slate moves to 52 px. The phone boot shows the bytes received and the total next to the percentage. E loads without source frames (`loadPack` with `source: false`), which it never draws.
- **Signature:** the whale's clock reacts live to dτ/dt (width, weight and redshift color), and orbiting the view changes the lens's shape. At the end, the last frame stays suspended over the shadow.

### Launcher (`sites/4d-os/index.html`, `src/4d-os/launcher/launcher.css`)
A neutral paper desktop with a 12 px dot grid (`launcher-dot`). At the top, a fixed 26 px menu bar with "4D.OS" inverted, the note "Playground experiment · synthetic scene" and a wall clock. The content has two levels:
- **"One scene. Three worlds."** (`launcher-display`): three link windows (`.world__win`) in a row. Each one has:
  - a 20 px ink bar;
  - a live view of the same scene, resolved with each world's tokens (`[data-world]` as `tokenRoot`), in a tight framing that crops the ends of the journey, with cutaway. B shows the plate's side view (background 0.08, stride 15); A and C, a three-quarter view (strides 15 and 2);
  - a one-line thesis and "Open desktop".
- **Status line:** load progress, timecode, state, keys and the model credit.
- **"Two more plates."** (`launcher-headline`, 12vh further down): two link windows, D and E, with the same grammar but in **two columns**. Each one has:
  - a **still image of the real render** (`.world__still`, 1200×900, `loading="lazy"`), because the launcher does not load other packs;
  - a one-line thesis and "Open landing".

  A note in Departure Mono closes the section: both subjects are synthetic and computed from the project's own equations.

On hover and focus, "Open desktop" / "Open landing" inverts and the window gains a second ink rule (`outline: 2px`, `outline-offset: 2px`), with no shadow or offset. At 900 px or less the windows move to one column; on a landscape phone they return to rows (3 and 2, and the two plates use the same three-column windows as the row above).

**Phones: stills first.** On narrow screens the launcher asks before loading the 50.4 MiB scene. Each A/B/C window shows a still of its world (out of flow, inside its described view box), and each title bar carries an inverted "still" tag in Departure Mono 11 px. An ink-field "Run the scene live · 50.4 MiB" button (Departure Mono 12 px, 44 px) sits under the lede, on the first screen with window A. Asked, it turns into the progress line (paper field, a 3 px ink rule along its foot, "Loading N% · x / 50.4 MiB"), then into a quiet muted "Scene live"; a visually hidden `role="status"` node announces it, and the stills give way to the live views. The keyboard hints (`.status__keys`) are hidden on touch, and `.more__note` is 12 px on phones.

## Do's and Don'ts

### Do:
- **Do** declare every new color of a world in its `tokens.css` and, if the viewer or the NOW touches it, make it an exact member of its `--pal-16-*` (The Palette Membership Rule).
- **Do** use `--accent-current` for any mark of the present in the chrome, and `data-direction` on `<html>` for direction states in CSS.
- **Do** build every new window of A, B or C with `.win[data-window] > .win__title + .win__body`, with `aria-labelledby` pointing to its title, and let the world dress it in its `style.css`.
- **Do**, in A, B and C, use the pixel font only at `--pixel-size` or `--pixel-size-2x`. In every world, use tabular numerals for every live figure.
- **Do** keep in multiples of 3 px everything that touches the render or paints display pixels, and upscale generated textures with `image-rendering: pixelated`.
- **Do** fill figures with `data-stat` from the pack or compute them with the scene's module, and show the *Synthetic* label while the scene is synthetic.
- **Do** show the model credit on every page that uses the cat ("Cat" by J-Toastie, CC-BY 3.0, with links) and keep the cutaway in every scene view with a background.
- **Do** give every 3D view `role="img"` with a text description, a visible focus in the world's contrast color and a skip link to the story page.
- **Do** respect `prefers-reduced-motion`: no autoplay, no orbit, no dissolves, no echo, no HOLD inversion, no inertia, no Lenis, no page erase, with the sky still and the tesseract still.
- **Do**, when narrow, stack the windows or panels under the scene (with `--win-drag: 0` in A, B and C) and put the main action right below.
- **Do** give all text that falls on the scene a solid ground of the world: charcoal or the caption scrim in B, glass strips in D and void strips in E. The scene does not guarantee contrast.
- **Do** build every new gesture hero on `bindZoomHero` and `bindChaseCam`, with a 300svh track, the display dissolve in `onDissolve`, one hint per phase in the world's voice and HOLD, − and + controls next to the hint.
- **Do** check `data-hold-origin="gesture"` before firing any HOLD effect, and subscribe to it after `bindZoomHero`.
- **Do** give `setPresentLook({ bias })` to every view whose subject ends up still over its own trail.
- **Do**, in D, mark the active state with a second concentric stroke and keep gold for φ alone.
- **Do**, in E, label every reading with the quantity / value / unit grid, and each zone with its channel (CH 1 to CH 5) on the line of its title or its figure.

### Don't:
- **Don't** mix worlds: no red wall, sage, aurora or B's tag magenta, emulsion, grease pencil, phosphor, phi gold, heat ramp or fonts of one world in another (The Closed World Rule).
- **Don't** write an accent hex in the chrome; the present is read from the world's `--accent-*`.
- **Don't** use diffuse elevation shadows on windows, panels or cards (The Flat Desk Rule). In B's chrome, no glow at all.
- **Don't** round windows, display cases, plates or panels. The only curves are those of the real object: the 1984 button, the radios, C's frames, gate and cans, and D's GIN cursor ring.
- **Don't** scale the pixel font of A, B or C to non-native sizes, or upscale pixels by fractional factors.
- **Don't** put the chapter number or channel (room, plate, reel, station, CH) above the title; it goes on the same line.
- **Don't** write pack figures by hand, or use material from the reference site credited in the README.
- **Don't**, in D, fill, grade or give glow to the chrome (The Stroke Only Rule), or use the generic science-fiction HUD: corner brackets, glowing edges, scanlines.
- **Don't**, in E, use gradients, transparencies or `color-mix` in the chrome (The Flat Field Rule), or set label figures in Handjet (The Readable Zero Rule).
- **Don't** let a neon or a diagram from the bake use the NOW's color in the scene: it is repainted in memory to a deep tone of the palette.

## Playground: three candidate landings

Three candidate landings for the door of the crewtives playground, first published at `/landings/game-center/`, `/landings/wind-up-empire/` and `/landings/bloomscope/` (now `/bloomscope/`), plus the comparison page `/landings/`, which has since been removed (see the museum's route status below). This section comes from the shipped build (`sites/playground/landings/*/index.html`, `sites/playground/bloomscope/index.html`, `src/playground/<world>/tokens.css` and their style sheets, `src/playground/shared/*`) and from the design briefs (`.impeccable/surfaces/playground-landings-*.md` and `.impeccable/surfaces/playground-bloomscope-index-html.md`). Where they differ, the build wins.

**How to read the tokens.** The landings' front-matter tokens carry their world's prefix: `gc-*` (Game Center Yonjigen), `we-*` (Wind-Up Empire) and `bs-*` (Bloomscope). In code, each landing declares its custom properties in its own `tokens.css`, with names of its own (`--enamel`, `--sodium`… in Game Center; `--space`, `--tin`… in Wind-Up Empire; `--chartreuse`, `--petal`… in Bloomscope). What the engine reads does have a common name: `--pal-16-0..15`, `--pal-1bit-0..1` and `--engine-z`. The display palettes go as `gc-pal-*`, `we-pal-*` and `bs-pal-*`, with the index in the name.

### What is shared

- **Three closed worlds.** Each landing has its palette, its fonts, its kind of field and its signature interaction. No font is shared between landings or with 4D.OS. 4D.OS's The Closed World Rule applies here too, in both directions.
- **The index is the second section.** The five 4D.OS worlds, plus the launcher, go in the second section of each page, and the first screen links to it. The data comes from `src/playground/shared/worlds.ts`: name, line, route, shared WebP still image and credit. Each world carries "synthetic scene" and, on A, B and C, the credit "Cat" by J-Toastie, CC-BY 3.0, next to the image. The still images are not re-dithered with CSS, and in Game Center they are only shown `pixelated` at integer multiples of 400×300. `checkIndexHtml` fails if anything is missing.
- **Honesty.** Every figure is computed in the browser or labeled as an estimate. Nothing is made up: there are no rankings, no coins and no real economy. The page stores nothing except the sound preference (and, in Game Center, the service switches and the "this browser only" HI), and it says so. The images the browser generates (sticker, press proof, herbarium strip) carry their provenance in a PNG tEXt chunk. The footer names each font with its license and ends with the mark "demo build 0.1" and "One of three candidate landings".
- **Sound off by default** (`shared/sound.ts`): WebAudio synthesis only, no files, −18 dB before a compressor and 24 voices at most. The `AudioContext` is created inside a visitor gesture and is suspended when the tab is hidden. The control always says "Sound off" / "Sound on" in the world's voice: a speaker grille, a tin bell or a glass gem.
- **A single display control per page** (`shared/displays.ts`): 1-bit / 16 / Millions changes all the page's `RetroDisplay`s at once. It can have synchronized mirrors (in Game Center, the SCREEN selector and DIP SW2–SW3), but it is a single state.
- **Live reduced motion** (`shared/motion.ts`): the toys learn of the change without reloading, nothing starts by itself and each toy jumps to its result.
- **Without WebGL2** (`shared/probe.ts`, `importIfWebGL2`): the chunk with three and the `Engine` is not requested. The page stays whole with its static HTML (fields, texts, index and still images), and each toy draws itself in Canvas2D at run time, with nothing baked into the build.
- **A single 3D scene.** There is one `Engine` per page. The DOM that goes over the views rises above `--engine-z: 5`, and the engine paints no frames at rest.
- **Phones: one vocabulary in each world's language** (spec `phone-ergonomics`). Every section uses one of five patterns: a **pinned stage** (the visual sticks at the top while its own controls scroll under it, on the section's field with a hard edge; Bloomscope Sow and the lathe, Game Center 4F, Wind-Up Empire's proof bed), a **stage deck** (4D.OS D and E), a **window dock** (4D.OS A, B and C), a **bottom bar** (the museum clock, the Wind-Up Empire band) and **side by side** in landscape. Four micro-rules go with them: the drawing stays and the hit grows to 44 × 44 CSS px on a coarse pointer (45 in world A); a gesture that competes with scrolling is claimed only from a grip or a control built to be dragged; the result goes to the toy, where the hand already is; and every held button gets the hold trio (`touch-action: none`, no selection, no callout). Pinned stages take at most 56% of `svh` and sit below `--engine-z`; decks and docks inside a sticky hero sit above it with opaque cards. Sizes use `svh`, never `dvh`. Each work keeps its own phone breakpoint, and phone-only nodes are created by script under that gate, so the desktop document never changes. There is no drawer and no bottom sheet anywhere.
- **Comparison page (since removed).** `/landings/` was neutral on purpose: `system-ui` on white (`#ffffff`), ink `#16161a`, 6 px cards with a `#d9d9df` rule and blue focus. It was not a fourth world, and no landing took anything from it.

### Game Center Yonjigen

**Thesis.** The playground is a Tokyo game center building. Each floor is a genre, each toy is a cabinet you really play, and scrolling is the elevator ride.

**Colors.** Each floor is a lit enamel at full width, with no grays: each field has its secondary ink of the same hue. Night lives only inside the CRTs, in the machines' glass and on the roof.

| Token | Role |
|---|---|
| `gc-enamel` / `gc-enamel-2` | Field of 1F RAIN RUN (vermilion) and its secondary ink |
| `gc-sodium` / `gc-sodium-2` | Field of 2F 4D.OS (the index) and the marquee; secondary ink |
| `gc-candy` / `gc-candy-2` | Field of 3F PRIZE (the crane) |
| `gc-mint` / `gc-mint-2` | Field of 4F PARLOUR (pachinko glass) |
| `gc-carpet` / `gc-carpet-2` | Field of 5F LAB: a violet carpet with 1-bit sodium and candy stars on a 96 px tile |
| `gc-night` / `gc-night-2` | Field of the RF roof |
| `gc-ink` | 18 px hard-edged slabs between floors, the directory, floor plates, the bezel and text on the light fields |
| `gc-acrylic` | Text on the dark floors, on the CRT and on the directory; the cap of the START button |
| `gc-cobalt`, `gc-cobalt-deep`, `gc-cobalt-2` | Only the plastic of the control decks; never a field |
| `gc-crt` | Glass of the screens when off and the HUD's pixel outline |
| `gc-amber`, `gc-wine`, `gc-tube`, `gc-uv` | Machine parts: lamps, felt, tubes and black light |
| `gc-chrome-hi`, `gc-chrome`, `gc-chrome-lo` | Claw, T-molding and chrome fittings |
| `gc-paper` / `gc-paper-ink` | Thermal tickets and 調整中 cards taped to the glass |

**Display palette** (`gc-pal-0` to `gc-pal-15`). All the building's screens share these 16 colors, quantized in OKLab with 8×8 Bayer: they are the enamels, the cobalt, the tubes and the CRT's night, plus `gc-pal-6-deep-mint`, `gc-pal-13-haze` and `gc-pal-14-pale-acrylic`, which exist only for dithering. The 1-bit is a sodium monochrome monitor: `gc-crt` and `gc-sodium`. The lips of the five 2F cabinets take a color from their 4D.OS world.

**Typography.** Four self-hosted OFL-1.1 fonts: Bungee Shade (`gc-marquee`, the marquee only, `font-display: block`), Bungee (`gc-headline` in capitals for the floor titles, `gc-numeral` for the floor plates, `gc-title` for buttons and cards, and `gc-label` for tags), DotGothic16 (`gc-screen`: HUD, displays and **all** Japanese, with a subset for the fixed glossary) and M PLUS Rounded 1c 400/800 (`gc-body`, `gc-lead`). The marquee and the floor numerals do not exceed 96 px. Figures use tabular numerals.

**Layout and first screen.** The building's grid has 78 px columns (`gc-col`), a 24 px gutter and an elevator directory fixed on the right (`gc-dir`: 76 px, 56 px below 1280 and hidden below 768). At 1440×900 you see the front of the vermilion cabinet: a sodium marquee with PLAYGROUND and the mirrored ゲーム / 四次元 signs, an ink bezel with the band "LIVE · 16 COLOURS · EVERY MOMENT STAYS ON SCREEN", the centered 4:3 CRT with Rain Run in ATTRACT, HOW TO PLAY in the left wing, SCREEN and SYNTHETIC SCENE in the right one, and below them the cobalt deck with the joystick, A/B/C and 1P START. On a phone, the CRT turns to portrait 3:4, the deck adds the elevator button and there is a visible link to 2F ("5 worlds"). The order of the floors is 1F RAIN RUN, 2F 4D.OS, 3F PRIZE, 4F PARLOUR, 5F LAB and RF ROOF. Each floor has its address `#1f`…`#rf`, with a history entry.

**Components.** The elevator directory (six cells RF→1F, a floor display, the sound grille). The floor plate: a Bungee numeral painted in the field's color on ink, with a 10 px radius. Candy microswitch buttons with a radial cap gradient and a 3 px bottom edge. START in acrylic with a 3 px ink rule. Tags with a 1.5 px rule, a 4 px radius and capitals. The SCREEN selector as a three-position radio group. A service panel with eight DIP switches (Sound, Screen ×2, Rain, Ghosts, Flip, Attract and a fixed Free). Paper 調整中 cards tilted −2°. Thermal tickets that come out of the printer with `steps(8)`. The five 2F cabinets carry a marquee, a CRT with the still image, a plate, a line, a credit and "Open"; next to them is a six-row board.

**Motion.** A 120 BPM master clock (`--beat: 500ms`) keeps time for lamps, blinks and cadences. The arcade press is 140 ms with `cubic-bezier(0.16, 1, 0.3, 1)`. The UI moves like sprites (`steps()`). Only the 3D scenes move continuously, and there the motion is the physics. The elevator is free scroll, with no pinning, and the CRT turns on only once. There are never more than 3 flashes per second.

**Toys.** Rain Run (1F): an air taxi in a mirrored canyon of signs under the rain, with 90 s games and 3 lives, a ghost rebuilt from recorded poses and a local HI. The signature interaction is **TIME VIEW**: at GAME OVER, or with C during PLAY, the camera turns 90° in 1.2 s and shows the whole flight as a ribbon (one pose in 3), with "N MOMENTS" and a time strip traversed at 1/12 s. The Win a World crane (3F): discs on the x–z plane, 80% printed from the seed and a downloadable D6 sticker. Parlour Glass (4F): pachinko glass with *heso*, tulips and FEVER on every 7th ball, mirrored twin launchers, a J/K/L jog wheel, a shutter and COPY THIS MACHINE. 5F: three 調整中 cabinets. RF: Gas Tuner, an eight-tube YONJIGEN sign with five real gases, the moon and the service panel.

**Sound, reduced motion and no WebGL2.** There are synthesized voices per machine (C-major pentatonic on the doors, motor hums, ballast and rain) and a ding per floor. With reduced motion, all animations and transitions are cut, the CRT shows a pre-exposed image and there is no automatic demo. Without WebGL2, the CRT shows a still image of the same canyon dithered on the CPU to the 16 colors, the glass runs in Canvas2D with fewer balls and no rewind, and the Gas Tuner (SVG and CSS) works the same.

**Do / Don't.**
- **Do** give each new floor its own full-width enamel, with its secondary ink of the same hue and an 18 px ink slab on top.
- **Do** put Japanese only in DotGothic16 and only with words from the fixed glossary.
- **Do** move the UI with `steps()` to the pace of `--beat`.
- **Don't** use the cobalt as a floor field: it is only the plastic of the control decks (The Cobalt Is Plastic Rule).
- **Don't** exceed 96 px in the marquee or the floor numerals.
- **Don't** put the night outside the CRTs, the machines' glass or the roof.

**Phones.** Portrait (below 768 px): the TATE cabinet scales with `u` but the cobalt deck floors at `--du: max(u, 1px)` (0.889 px below 360) and stands on the cabinet's bottom above `--safe-b`; the 3:4 CRT takes the rest (241 × 321 at 390 × 664). The HUD scales with the bezel but never grows. On a coarse pointer the TIME VIEW strip gets a 44 px touch box. SCREEN and its tag sit in the cabinet's last row (`--screen-row`, 112 px). The hold trio is on the stick's arrows, A, B, C and START. 3F: the ticket rack sits under the crane. 4F is a pinned stage: the chrome cabinet sticks with its candy marquee 80 px above the top (`--parlour-pin`), the glass is `min(100vw − 68px, 56svh − 108px)`, a 28 px mint apron hides the panels under its rounded corners, and HOW TO PLAY slides over the stage. RF: tubes are 44 × 44 from 390 px and 40 × 52 below. Every upper floor has a round ink elevator call button on its plate row (created by script; the panel keeps `aria-expanded` on its invoker and Back returns to the floor the visitor was on). Push-button labels are 12 px; tags and DIP names 11 px. Landscape touch (at most 500 px tall): the handheld, with a 40 px marquee, a 4:3 CRT at full height between two cobalt wings of at least 150 px (the stick on the left; START, B, A and C on the right; sound, lift and 2F at the wings' tops). Wings, CRT and directory keep at least the `--safe-*` insets (`viewport-fit=cover`). The crane becomes [glass | buttons] with the rack beside it, and 4F pins as a left column. A mouse at any size keeps the tablet or desktop layout.

### Wind-Up Empire

**Thesis.** A space empire you wind up by hand: a lithographed tin toy game with friction rockets, a tin black hole (the Whirl) and a fake economy that resets on reload.

**Colors.** Flat lithography inks at page scale, with the box unfolded and one ink per face. There is no neutral ground anywhere: the tin and the paper are objects on drenched fields.

| Token | Role |
|---|---|
| `we-space` | Field of the lid (the hero and the body): printed space, never a black screen |
| `we-turquoise` | Field of the die-cut tray, which is the index |
| `we-vermilion` | Field of the side face, the control board ("Run the empire"), with `we-white` text |
| `we-orange` | Field of the "How to play" leaflet (**orange, not chrome**: yellow as a field read the same as Game Center's sodium) |
| `we-space-deep` | Field of the press proof and the colophon; the orrery's 1-bit ink |
| `we-chrome` | The H1, the lid's litho frame, the bottom band, yellow buttons and focus |
| `we-lemon` / `we-orange` | Top highlight and bottom edge of the chrome buttons' relief |
| `we-pink` | Celluloid: the "DEMO MODEL · FAKE ECONOMY" sticker, windows and the newest exposure |
| `we-tin`, `we-tin-hi`, `we-tin-shade`, `we-tin-text` | Riveted tin plates, the resource strip and tin buttons |
| `we-ink` | Text on the light fields, strokes and the band's button |
| `we-oxblood`, `we-teal-deep`, `we-space-bright`, `we-sky-tint` | Deep and light tones of each ink, for dither and stroke |
| `we-paper` | Paper of the cards and of the 1-bit |

**Display palette** (`we-pal-0` to `we-pal-15`). It is a single 16-ink lithographic screen with 8×8 Bayer, shared by the WebGL display and by the shading of the lid's edges (PNG tiles made at startup, whose density grows with the wind). The 1-bit is a one-ink press: `we-space` on `we-paper`, so the lid stays cobalt. The tray's tops are dithered with the 16 real inks of their world, written by hand in `worldInks.ts` and watched by a drift test.

**Typography.** Four self-hosted OFL-1.1 fonts. Tilt Warp (`we-display`, `we-headline`, `we-title`) sets the box's lettering: the H1 is in chrome with a 7 px ink outline (`paint-order: stroke fill`) and leans back with the wind (XROT/YROT axes, `--wind`). Rampart One (`we-plate`) goes only on the tops' embossed plates, at 16 px or more. Libre Franklin 500/700 (`we-body`, `we-label`) is the voice of the leaflet and of the buttons. Sono (`we-numeral`) goes **only on figures**: each run of digits goes in its own `<span class="num">`, and the odometer drums roll digit by digit.

**Layout and first screen.** The grid is 8 px: a 56 px strip (`we-strip`), a 24 px gutter and a 32 px side (16 px at 560 px or less). At 1440×900 you see the pressed tin strip, sticky and with a 3 px toothed edge: the brand and the pink sticker, the Tin/Spring/Spark drums with the spark wheel in the center, and Worlds / How to play / the "Sound off" bell. Below it, the cobalt lid inside a 4 px chrome frame (16 px inset, 14 px radius), composed with diagonal C2 symmetry: the H1 "WIND-UP EMPIRE" tilted −8° at the top left, the orrery in the center (the Whirl, seven √φ rings, five world-tops on a golden spiral and the home top with the rocket on the "PULL BACK TO LAUNCH" plate), BUILD (wing key and ticket) at the top right and FLEET (gauge and logbook) at the bottom left. At the bottom goes the chrome band "DEMO MODEL · FAKE ECONOMY · RESETS ON RELOAD" with the ink button "Five real worlds inside · Open the box". At 900 px or less, the instruments leave the corners and move to two tiles under the orrery. The faces go in this order: lid, tray (index), board, leaflet and proof.

**Components.** The tin button and the chrome button: 2 px of ink, an 8 px radius, capitals, an inner relief of 2 and 3 px and a short 3 px shadow; when pressed they sink, and focus is a 5 px ink ring. Tin plates with four rivets (Construction, Litho Press, Hangar). Tin cards (queue ticket, logbook) with an 8 px radius. A pink sticker turned −3°. A chrome band with an ink button. Three-position slide switches on the press. The die-cut tray: each cavity is a cardboard hole (evenodd clip-path) that follows its image, its plate and its top's socket, with an inward shadow. **The Stroke State Rule:** state lives in the stroke: solid is done, hatched is queued and dotted is locked.

**Motion.** "A spring unwinding": settling by exponential decay; notches with a stiff spring and a 1 px jolt; stamps that enter from 1.035 to 1 in 110 ms; CLACK from 1.06 to 1 in 90 ms. There is a single scroll moment, the lifting of the lid: the lid translates 1.35× the scroll, the camera pitches from 0 to 10° and the lid casts its shadow on the tray. There are no other entrances. Never more than 3 flashes per second, and the sparks are local, 120 at most.

**Toys.** The signature interaction is the **friction rocket**: it is pulled back like a slingshot with 12 notches and ±60° of aim. A hatched ghost route shows 3 s of flight. On release, it flies a real Verlet orbit around the Whirl and stamps an exposure every 1/12 s, which ages from full ink to 1-bit dotted by dither density, never by alpha; the newest one is pink. There are also the winding key (a 45° ratchet that stamps a rosette), the planet-tops you strike and that hum, the spark wheel you rub, the build queue and the press, all on a 10 Hz economy with its own clock. At the end comes the press proof "Every moment of your visit, at once." (1200×900, a PNG with provenance).

**Sound, reduced motion and no WebGL2.** There are synthesized tin voices (clicks, CLACK, the tops' hum). With reduced motion, transitions and animations last 0 ms, the drums change without rolling and each toy jumps to its printed result. Without WebGL2, the orrery is printed in Canvas2D with the same geometry and the same flight model, and a precomputed flight appears as a chronophotograph ("Printed flight (static view)").

**Do / Don't.**
- **Do** drench each new face in one of the box's inks and put the tin and the paper on it as objects.
- **Do** put every figure in Sono inside `.num`, and the words in Libre Franklin.
- **Do** age exposures by dither density and mark state by the kind of stroke.
- **Don't** use the chrome `we-chrome` as a face field: it is lettering, band, frame and button. The leaflet is orange.
- **Don't** stack shadows on the H1, or use a black screen background or a neutral gray.
- **Don't** read the 4D.OS inks in the build or at run time: they are copied into `worldInks.ts`.

**Phones.** The lid keeps its controls under their effect: the work moves the feedback to the hand, docks the route and claims touches only from grips, in its own tin, chrome and ink (no drawer, no sheet). Where the key is a tile, the chrome tag hanging from it doubles as the build queue's stub: WIND ME, WINDING wound/needed (digits in Sono), RUNNING, HOLD, QUEUE EMPTY, and on CLACK the LV n seal in vermilion for 1.2 s (a cut under reduced motion). A 4 px spring-hatched coil along the tile shows the job's progress. Both are `aria-hidden`; the ticket's chip and the log speak. An empty ticket shows a 44 px ink tab, "Queue a build", to the side panel. In portrait from 640 px of height, the chrome band is sticky at the bottom while its place is below the fold and settles as the lid ends; a compact lid below 760 px keeps the rail clear. The rocket's grab keeps `pan-y`: a first move away from the Whirl pulls, and anything else is the browser's scroll. Only a round grip on the key's face winds. The Litho Press pulls its own flat proof (`print2d`, "Proof · printed flat"), pinned under the strip while its rows scroll, printed on each committed change, never animated. In landscape (at most 500 px tall) the strip is one 52 px row with the menu, and the lid has two columns (orrery | title, rail, tiles) with the band whole along the bottom. Spring shows two reels on narrow and landscape phones.

### Bloomscope

**Thesis.** A kaleidoscope that makes the symmetries of flowers and honeycombs by itself, and whose finale is the angle no mirror can make: the golden angle.

**Colors.** Backlit colored glass on toy-tube paper, in full daylight. Each section is one whole piece of one color, hard-edged and without blends. All text on light fields is in plum ink.

| Token | Role |
|---|---|
| `bs-chartreuse` + `bs-vogel` | Field of the Scope (the hero), with a tonal print of 1,200 Vogel points centered on the eyepiece |
| `bs-petal` | Field of the index ("Load another wheel.") |
| `bs-lilac` | Field of Sow (the golden angle) |
| `bs-glaucous` | Field of the lathe (Lathe, rosettes) |
| `bs-honey` | Field of the honeycomb (Hive) and the brass of the ring and of the wheels |
| `bs-ink` | All the text, the 2 px rules and the footer's field |
| `bs-sheet` | Daylight paper: the eyepiece's ground, the readout pill and the footer text |
| `bs-now` | The only NOW, ruby, always with a 2 px ink keyline: the notch at 12 o'clock on the ring |
| `bs-pollen`, `bs-cobalt`, `bs-sky`, `bs-violet`, `bs-bottle`, `bs-leaf`, `bs-vermilion`, `bs-propolis` | Glasses that live only inside gems, beads and the kaleidoscope. The propolis is the ring's knurling |

**Display palette** (`bs-pal-0` to `bs-pal-15`). These are 16 glasses in four value ramps, so the flat faces dither cleanly. The dither goes after the folding, in screen space, so it never appears mirrored at the seams. The 1-bit is ink on the section's field: each section redefines `--pal-1bit-1` with its color. The gems use five flat tones per glass (`.glass-*`: hi, lt, base, dk, deep).

**Typography.** Ultra (Apache-2.0, an "equivalent free license", like Permanent Marker) sets the wood-type slab headlines: `bs-display` at 96 px as the ceiling, `bs-headline`, and `bs-title` for the wheel names, with `font-display: block`. Recursive (OFL-1.1) goes in CASL 0 for the body (`bs-body`, `bs-sub`), in CASL 1 only for the labels (`bs-label`) and in tabular Mono for the readouts (`bs-mono`). The footer names both licenses.

**Layout and first screen.** A 72 px top bar, with 64 px sides. At 1440×900 you see the chartreuse field with the Vogel print and a live 720 px eyepiece centered at (1024, 486), made circular by the display's mask, inside a 28 px brass ring with 72 knurls and the ruby notch fixed at 12 o'clock. The Mono readout (`D5 · 135° · 3 specimens · 18 beads`) sits on a paper pill, and the "What the mirrors see" inset shows the raw cell. In the left column (x 64–560) go "Turn the / garden." in Ultra 96 px, the subtitle, "Drag the brass ring" with a curved SVG arrow, four mirror gems, the main gem "Every turn at once" with "Shake" and "Exposures", the display beads, the "In the chamber" tray and the link to the five worlds. On a phone, the 358 px ring, the 52 px gems, "Every turn at once" at full width and the link to the worlds fit above the fold. The sections go in this order: Scope, Worlds, Sow, Lathe, Hive and the ink footer. On the workbenches, the peepholes keep the camera in view.

**Components.** The gems are faceted glass buttons in flat SVG: an elongated hexagon cut with `clip-path`, 3 or 4 flat tones, an ink keyline and **a real offset shadow** (`drop-shadow(0 3px 6px)`, which rises to `0 6px 10px` on hover). When pressed, they scale to 0.94. Selection slides the facet's highlight in 220 ms. There are display beads for 1-bit / 16 / Millions. The readout pill is paper, with a 12 px radius and a 1.5 px rule. The index is a set of kaleidoscope wheels: a knurled brass disc with a 4 px ink keyline and a 6-blade iris that opens over the still image. The launcher is an order-8 Petrie tesseract, and the lab's empty cells carry a 1-bit Vogel stipple. Arrows and turns are the project's own SVGs.

**Motion.** Physics rules the toys (bodies, the ring's inertia, re-seeding, falling), never tweens. There is one authored moment per section, the bloom: the first time the section enters the screen, the specimen assembles in birth order with a single display reveal. Texts and controls are visible from the start and do not animate in. State changes last 420 ms with `cubic-bezier(0.16, 1, 0.3, 1)`. On load, three specimens and the beads fall in 1.2 s while the drum pre-turns about 90°. After that there is no idle spin and the engine stays at zero frames.

**Toys.** The signature interaction is **striking the brass ring**: the drum spins freely with inertia (ω·e^(−2.2·dt), ±720°/s at most) and only below 40°/s does a detent bring it to the nearest multiple of 15°, with a tick per detent. The camera tumbles and leaves 12 dotted exposures that the mirrors multiply into a flower of paths. "Every turn at once" makes one exact turn in 3 s with 24 exposures and then goes to HOLD. Sow is a dial with a vernier and a golden detent at 137.5°, with named states and a herbarium strip. Lathe builds echeveria and aloe rosettes, with "Stretch time" and the drop. Hive is a hexagonal B2/S34 Life with its wax stack. Each bench has "Put in the Scope". "Copy link to this garden" stores the state in `#g=`.

**Sound, reduced motion and no WebGL2.** Pentatonic notes sound in Sow, a bell at the golden angle, a marimba on the leaves, a drip and a wood knock, all by synthesis. With reduced motion, a pre-exposed HOLD plate is shown, the ring turns 1:1 without inertia and each toy jumps to its result; transitions last 0 ms. Without WebGL2, the Scope folds the cell pixel by pixel in Canvas2D with the same math as the shader, Sow draws its seeds, the lathe is seen from above (without "Stretch time") and the hive draws its frame.

**Do / Don't.**
- **Do** drench each whole section in one glass, hard-edged, and write on it in plum ink.
- **Do** mark the NOW only with the ruby and always with its 2 px ink keyline (The Ruby Keyline Rule).
- **Do** give the gems flat facets, an ink keyline and an offset shadow: in this world it is the material, not generic elevation.
- **Don't** use the cobalt as a section field: it is only one glass within the palette.
- **Don't** use `backdrop-filter`, blur or blends between sections.
- **Don't** type the glyphs `≈ → ↻ ↺ √ φ` in the text: arrows and turns are the project's own SVGs.

**Phones.** Sow and the lathe use the pinned stage. The gates are portrait `(max-width: 699px) and (min-height: 521px)` and landscape `(max-width: 1023px) and (max-height: 520px) and (orientation: landscape)`; `stage.ts` and `style.css` share the same strings. The toy (`--stage-s = min(100vw − 138px, 46svh − 16px)`: 252 / 222 / 292 px at 390 / 360 / 430) sits beside its 96 px peephole, full-bleed on the section's field with a 2 px ink edge, sticky at top 0 with `z-index: 2` (under the engine canvas at 5, over the controls at 1). The sub comes before the stage through `display: contents` and `order`, so DOM and tab order do not change. The stage releases where the controls end, and focus clears it with `scroll-margin-top` = stage + 32 px. In landscape the stage is a left sticky column `min(100svh − 24px, 40vw)`; the lathe's sliders restack and keep a tail of field after Pixels, and the Hive puts its frame left and controls right. The peephole's frame shows the chamber count in a readout pill (Recursive Mono 700, 12 px, paper with a 1.5 px ink keyline) below the view's circle. Put sends the chip into the peephole, and the section's live region says "In the chamber: n of 7" ("Chamber full"); the gem stays tucked while a peephole shows. GOLDEN moves onto the band at 12 o'clock (16 px). Under a coarse pointer: the dial's outer grip is at least 44 px thick and inside the dial's box, with a non-passive `touchstart` on both grips; "Hold to sow" gets the hold trio; the wordmark, "Worlds" and the footer links are 44 px; tick labels, the gem drawings and the hidden radios pass touches to their controls. Under a stage gate the toy's own view also starts its bloom.

## Playground: the museum "The épure"

The playground museum at `/` (`sites/playground/index.html`). The build generates its body (`src/playground/museum/build/render.ts`, with the épures of `epure.ts`, `method.ts` and `axonometry.ts`); the styles are `src/playground/museum/tokens.css` and `style.css`, and the behavior is `main.ts`, `player.ts`, `clock.ts`, `fold.ts` and `fold3d.ts`. This section comes from that build; the design brief (`.impeccable/surfaces/playground-index-html.md`) and `openspec/changes/archive/2026-09-28-add-playground-museum/design.md` (D3, D4, D8, D9) are context. Where they differ, the build wins.

**How to read the tokens.** The museum's front-matter tokens carry the `mu-*` prefix. In code, the house declares its custom properties in `tokens.css` with short names: `--sheet`, `--ink`, `--graphite`, `--rule`, `--rule-strong`, `--east-1/2`, `--west-1/2`, `--now-forward`, `--now-rewind`, `--font-text`, `--font-mono` and the module `--M`. The fold's palette goes as `--pal-16-*` and `--pal-1bit-*`, and in the front matter as `mu-pal-*`, with the index in the name.

**Route status** (since `add-playground-museum`; see `deploy/_redirects` and `sites/playground/vite.config.ts`):
- `/` is the museum: the build publishes it at `dist/index.html`, with no redirect.
- `/landings/` and `/landings` answer with a 301 to `/`. The comparison page is no longer built and no longer exists.
- Bloomscope moved to `/bloomscope/`. `/landings/bloomscope/` and `/landings/bloomscope` answer with a 301 to `/bloomscope/`, and the browser keeps the `#g=…` fragment when it follows the 301. Its footer leads back to its sheet with "Playground · Sheet 004" (`/#sheet-004`).
- Game Center Yonjigen and Wind-Up Empire are still published at `/landings/game-center/` and `/landings/wind-up-empire/`, **outside the collection**: they have no sheet and no row in the index, and their footer says "Not in the collection yet · Playground", linked to `/`. The index's three workshop rows (△, "Being drawn. Not public yet.") carry no number, name, link or date, and they are not these two landings.
- No footer says "candidate" any more. The section "Playground: three candidate landings" describes the state before the museum.

### The épure

**Thesis.** Each work is a sheet of Monge's descriptive geometry. The VISTA shows the work alive, in its recorded loop, and its épure draws all its moments at once: the plan, below, says where; the elevation, above, says when; the ground line joins them and a single NOW crosses them. Every work's épure has the same axes, so time becomes an axis.

**Colors.** A daylit drawing room, read the Bauhaus way. Only the sheet, the ink and the graphite carry text. Light is wash, never field. Each work brings its own color in its passe-partout.

| Token | Role |
|---|---|
| `mu-sheet` | The sheet: the background of the page, the bar, the title block, the tools and the phone's fixed clock; text on ink |
| `mu-ink` | All main text, the 1 px rules, the ground line, the loop segment, the NOW's ring, the active button and the background of "Enter <title>" |
| `mu-graphite` | Secondary text (the clock line, captions, credits, the épure's labels, the workshop rows) and the full dotted trail |
| `mu-rule` | Inner rules of the title block and the index, the full grid, button hover |
| `mu-rule-strong` | Zone marks every M in the margins, the bar and the sheet frame; the dotted rule of what is pending |
| `mu-east-1` / `mu-east-2` | Morning wash (lavender) anchored at the top; `mu-east-2` is also the vertical plane of the fold's axonometry |
| `mu-west-1` / `mu-west-2` | Afternoon wash (apricot) anchored at the bottom; `mu-west-2` is also the background of the notice "the work has changed since" |
| `mu-now-forward` | The NOW moving forward: the épure's dot, the scrubber's knob and FORWARD's circle |
| `mu-now-rewind` | The NOW rewinding: the same places, with the clock in REWIND |

**Passe-partout.** The VISTA has a passe-partout (`mat` in code) in the background or frame color of its work, read from the work's tokens in the build (`collection.ts`): `a-wall`, `b-plate` and `c-leader` on 001 (one VISTA per world), `d-glass` on 002, `e-void` on 003 and `bs-sheet` on 004. The house tints no work, and the passe-partout belongs to the work, not to the house's chrome.

**Display palette** (`mu-pal-0` to `mu-pal-14`). Only the fold uses it; it paints the dihedron with the same `RetroDisplay` as the works (16 colors, `pixelScale: 3`). There are 15 colors: ink, sheet, three graphites, the two lights with a deep tone each, the NOW's cyan and amber with their deep tones, an indigo and an ink shade. The colors are kept far apart so the sheet and the flat planes are not dithered; the light is dithered, in the planes' gradient. The 1-bit is ink on sheet (`--pal-1bit-0` and `--pal-1bit-1`). A "House pixels" selector (1-bit / 16 / Millions) changes only the fold views of that sheet.

**Typography.** Two self-hosted OFL-1.1 families, the museum's own (none of the 4D.OS or landing fonts): variable Geologica (100–900, Latin and Greek) for titles, text and navigation, and Fira Mono 400/500 (Latin and Greek) **only for data**: the sheet number, the title block, the clock, the tools, the épure's labels and captions, the index's dates and dimensions, the credits and the technical notes. The Geologica weights the house uses are 380 (text), 500 (navigation), 600 ("Enter <title>") and 620 (titles). `mu-title` is the only `h1`, "crewtives playground". `mu-heading` is used for "Index of sheets" and "Colophon". `mu-sheet-title` is used for the title in the title block. `mu-wall-text` is the wall text, with a maximum of 34em (about 70 characters). `mu-sheet-number` is the sheet number, tabular. `mu-control` is used for the clock's states (0.08em spacing) and the tools (0.06em). `mu-epure-label` grows by layout range so it reads at 12 px or more: 13 units at 1440 or more, 16 below 1440, 18 between 760 and 1099 and 21.5 at 759 or less. Arrows, the chevron, the square root and the form marks ○ □ △ are the project's own SVGs, drawn with the house's stroke.

**Layout and first screen.**
- **Module.** `mu-module` (`--M`) is 30 px at 1440 (48 modules) and never goes below 16. Everything is measured in M: the museum's maximum width is 48M with a 1M margin, and the sheet's frame has a 1 px rule with M − 1 px of padding, so the columns fall on the grid lines.
- **Sheet columns.** A 26M VISTA, a 2M gutter and a 16M épure, in the ratio 13 : 8. At 1440, the VISTA runs from x 60 to 840 and the épure from 900 to 1380. Sheet 000 uses two 20M columns with a 2M gutter (1 : 1): Gaudí's double-twist column and the tesseract.
- **Épure.** It measures 480 × 600 viewBox units (1 unit = 1 px at 1440): the elevation from y 36 to 282, the ground line at y 300 with two 12-unit ticks, the plan from y 318 to 564. Its caption says "plan: where · elevation: when".
- **Visible grid.** Zone marks every M, 6 px long, in both page margins, under the bar and outside the top and left rules of each sheet. The ratio "13 : 8" is labeled on the top rule, in the gutter. G, or the "Grid" button (coarse pointer only), shows the full grid and the gutter band with its label.
- **Three ranges.**
  - **1100 or more:** a one-row bar (title, centered clock, navigation), the VISTA on the left across two rows, the épure and the title block on the right, and the wall text under the VISTA. "of sheets" is hidden below 1360.
  - **760 to 1099:** the VISTA takes the full width at the top, in a square slot that fits entirely on screen; below it go the épure and the title block side by side. The clock drops to a second row of the bar and the ratio is not labeled.
  - **759 or less:** a single column (VISTA, tools, épure, title block, text). The frame thins to 0.25M, the VISTA goes in a square slot and the épure shrinks (down to 17M or 78%), never the VISTA. The bar sheds its title row: it is sticky with `top: -30px`, so once past the title only the navigation row stays, 45 px (75 px at load). The clock is a fixed bar at the bottom, 79 px plus the bottom safe area (`--clock-h`, which feeds `body` padding-bottom and `scroll-padding-bottom`): the loops line in two lines above the states, which lose most of their tracking (0.02em, 5 px inline padding), and the scrubber, which takes the rest (151 px at 390, 121 at 360, 81 at 320). Jumps land at 61 px (`scroll-padding-top` 45 + M). In portrait the index rows re-flow: number and form above the poster in a 5M column, the text in the rest, the dimensions on one line (954 px at 390).
  - **Phone in landscape (at most 500 px tall):** the bar is static in one 45 px row; the clock is docked at the bottom in one 47 px row (states, a long scrubber, the loops line in two lines at the right); each single-VISTA sheet reads as on the desktop, the VISTA fitted to the height (221 px, k = 3) beside its 17M épure; sheet 001's three VISTAS sit side by side, the épure and the title block below; sheet 000 in two columns.
- **Order.** The featured sheet (the most recent acquisition, 004) goes first; then the index of sheets, the other sheets, 000 and the colophon. Each sheet has its address `#sheet-NNN`.

**Components.**
- **Sheet.** A frame with an ink rule and zone marks, and three pieces:
  - the **VISTA**, with the loop in its passe-partout, an ink rule and 1M of padding, and the view's label on 001 ("A · Vitrine"…);
  - the **épure**, with the full trail in dotted graphite 3 3, the loop segment in 2 px ink, the dotted 1 3 reference line and the NOW, a colored dot with a 2 px ink ring (on 004, points: faint graphite for all the seeds, ink for those in the loop);
  - the **title block**, which is the label: the sheet number in mono and the title in the grotesque, in ruled boxes; the visible "synthetic" mark; "Sheet data" in a native `<details>` with a drawn chevron (series, form, date, technique, dimensions, weight, rule and provenance); and "Enter <title>" in ink with an arrow as the last box.
  The "Fold" tool and, with reduced motion, "Play loop" sit on the top rule, on the right; on the phone they have their own row.
- **Page clock.** Three mono buttons REWIND · HOLD · FORWARD in a ruled box, with the active one in ink and its circle in the state's color. Beside it is the scrubber, 9M × 28 px: a rail with 45 ticks, a 3 px knob with an 11 px circle and, while it chases, a hollow mark at the requested position and the knob in solid ink. Below, the line "Loops recorded from the live render; the works run live.". On a coarse pointer the scrubber's hit is 44 px (`::before`), and it selects no text.
- **Index of sheets.** Rows at least 3M tall: number, form mark, a cropped 4M × 2.5M poster, title and line, dimensions and date. An unnumbered gate row leads to `/4d-os/`. The row where the date changes has a 2 px ink rule on top (after the Eameses' History Wall). After them come the 000 row and three workshop rows in graphite, with a dotted thumbnail. A row's loop appears on keyboard focus or after 300 ms of pointer rest (not on a press, so a tap or a quick click follows the link), and follows the clock. Typing a three-digit number (less than 1 s between digits) jumps the page to that sheet.
- **Colophon.** Two columns: the build mark, what each loop is, the typefaces with their licenses, three.js, the model credit, what the page stores and the "Keyboard shortcuts: on" button; then the references, the glossary and "Back to the top".
- **Bar.** Sticky, on the sheet, with an ink rule below: the `h1`, the clock, "Index of sheets", "Grid" (coarse pointer only), "Sound off" and "crewtives.com". On a phone in portrait only its navigation row stays pinned.

**Motion.**
- **One page clock** (`PageClock`, a `TimeController`) governs all the loops, the index previews and every NOW. All loops have 45 frames at 15 fps, so the clock's position is the same frame in every VISTA. It has three states without speeds: J, K and L give REWIND, HOLD and FORWARD, and repeating the key does not speed up. The step from the last frame to the first is a declared cut on a painted frame, never a crossfade. At rest, with the tab hidden or with no loops on screen, nothing is painted.
- **Scrubber.** Dragging it moves every work and every NOW at once, and releasing it leaves the clock in HOLD at that frame. `ScrubChase` chases the requested position at 2 frames per step at most (one step every 1/15 s) and does not reverse before 1/3 s: that way a violent drag stays under 3 flashes per second. The arrows, Home and End go through the same chase and do not wrap around the loop. A drag never scrolls the page or selects text; the scrubber takes focus, so the arrows keep working after it. Its exposed position (`aria-valuenow`, and `aria-valuetext` "frame N of 45, playing forward", "rewinding" or "held") is written on focus and on every state change, at most once a second while the clock runs unfocused, and not while it runs focused (`clockAria.ts`).
- **Fold.** "Fold", the F key or a vertical drag on the ground line (from 8 px) turn the vertical plane from 0° to 90° around the ground line, in 0.9 s with a quartic ease-out. The drag leaves the plane at the gesture's fraction, and releasing past halfway finishes raising it. The 3D code is only requested on the first gesture. On a touch screen the drag starts only from the grip (below); after a fold on a phone the page scrolls the least distance that shows the fold view, unless the visitor touched the page since pressing Fold (instant with reduced motion).
- **Light.** The wash's alpha depends only on the scroll position: the morning goes from 0.9 to 0.15 and the afternoon from 0.15 to 0.5. Without JavaScript, or with reduced motion, it stays fixed at 0.85 and 0.5.
- **Jumps between sheets.** They are `smooth` scrolls, or `instant` with reduced motion. The "Sheet data" chevron and the "Enter" arrow move in 160 ms with `cubic-bezier(0.16, 1, 0.3, 1)`, and without a transition with reduced motion.
- **Nothing else moves:** neither with time nor with the pointer outside the clock.

**Reduced motion, sound, no WebGL2 and no JavaScript.** With reduced motion, live, the clock starts in HOLD at the poster frame and each sheet shows "Play loop". A gesture on the clock requests the loops of the sheets on screen, the fold jumps to its final position and the light stays fixed. Sound is off by default ("Sound off"), and the fold makes a synthesized hinge "clack" when it settles. Without WebGL2, the loops keep running, and the fold is shown as an SVG axonometry made in the build, with a note that explains it. Without JavaScript, the page is a complete document: posters at integer scale in CSS px, SVG épures, title blocks, the index and the colophon.

**Named Rules.**

**The One Now Per Sheet Rule.** Each sheet shows a single instant: the position its VISTAS paint (all three, on 001), the NOW of its épure and that of its fold are decided in one place (`main.ts`). While any loop is missing, everything stays at the poster frame. There is no second NOW and no NOW without an ink ring.

**The Integer Vista Rule.** Each VISTA goes at an integer scale in device pixels, the largest that fits (k = floor(dpr · slot / native)), without smoothing. Only if not even k = 1 fits is it scaled down with smoothing. Without JavaScript, the scale is an integer in CSS px. The slot grows or the passe-partout absorbs what is left over; the VISTA does not stretch.

**The Recorded Loop Rule.** Every loop is labeled as recorded: the clock's line ("Loops recorded from the live render; the works run live."), the accessible description of each VISTA ("A loop recorded from the live render.") and the title block's provenance line (native size, colors, frames at fps, date and commit). The 4D.OS scenes carry "synthetic".

**The Wash Is Light Rule.** The wash is light, not field: two radials anchored at the top and at the bottom, behind everything (z-index −1), with their alpha moved only by scrolling. Ink and graphite give 4.5:1 or more on the most intense wash (`tokens.test.ts` checks it).

**The Mono Is Data Rule.** Fira Mono carries only data, readings, the title block, the clock and the tools. Navigation, titles and wall text are in Geologica.

**The Drawing Stays, the Hit Grows Rule.** On a coarse pointer each control keeps its drawn size; a transparent centered `::after` (`::before` on the scrubber) grows its hit to 44 × 44. Full-width ruled rows (Sheet data, Enter, Keyboard shortcuts, the gate row, the House pixels labels, Back to the top) simply become 44 px tall; in House pixels the legend then takes its own line, so the three options share one row from 360 px wide.

**The Grip, Not Strip Rule.** The ground line claims no touch (`pointer-events: none` on a coarse pointer): a swipe anywhere on an épure scrolls. The fold is dragged from a grip at the line's right end: a 14 px square ink mark split by the line, flush with the épure's right edge, its 44 px hit growing 30 px to the left; square so it is never read as the NOW; hidden while its sheet is folded; `aria-hidden` (Fold and F are the accessible path). A tap on it acts like Fold.

**Do / Don't.**
- **Do** measure everything in M and leave the grid visible in the margins and the rules, with the ratio labeled.
- **Do** give each new work its passe-partout from its own tokens, and give its épure the same axes: plan = where, elevation = when.
- **Do** let the page clock govern everything that changes with time, and the visitor everything else.
- **Don't** set text in any color other than ink, graphite or sheet, or body text on a wash field.
- **Don't** mark the NOW in any color other than the cyan or the amber, or without its 2 px ink ring.
- **Don't** play a loop with a crossfade, at a non-integer scale when an integer one fits, or without labeling it as recorded.
