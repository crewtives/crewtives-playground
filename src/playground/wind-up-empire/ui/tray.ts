// The die-cut tray: each world sits in a well in the cardboard whose edge follows its image, its
// nameplate and the round socket of its top. The well is a hole (clip-path evenodd) in each cavity's
// cardboard cover; the shadow that cover casts inward gives it depth. The shape depends on the size
// of each part, so it is recomputed when the size changes.

type Point = [number, number];

/** Radius of the top's well: the 72 px socket plus a 6 px cardboard rim. */
export const LOBE_R = 42;
const CHAMFER = 14;
const PLATE_CHAMFER = 8;
/** Cardboard margin around the nameplate, inside its well. */
const PLATE_RIM = 8;

export interface WellGeometry {
  /** Width of the cavity. */
  w: number;
  /** Height of the image's well (0 when there is no image: the lab sockets). */
  still: number;
  /** Rectangle of the nameplate (cavity px). */
  plate: { l: number; t: number; r: number; b: number };
  /** Center of the top's socket, if there is one. */
  lobe: Point | null;
}

/** Arc of the circle (cx, cy, r) from t0 to t1 (degrees, increasing: clockwise on screen). */
function arc(cx: number, cy: number, r: number, t0: number, t1: number): Point[] {
  const steps = Math.max(2, Math.ceil((t1 - t0) / 12));
  const out: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = ((t0 + ((t1 - t0) * i) / steps) * Math.PI) / 180;
    out.push([cx + r * Math.cos(t), cy + r * Math.sin(t)]);
  }
  return out;
}

const deg = (rad: number) => (rad * 180) / Math.PI;

/**
 * Outline of the well, clockwise. With an image: the image's rectangle, the nameplate's rectangle
 * below it on the left and, to its right, the top's circle, which bites into the bottom edge of the
 * image. Without an image (lab): the blank nameplate and the circle, which bites into its right edge.
 */
export function wellOutline(g: WellGeometry): Point[] {
  const R = LOBE_R;
  const c = CHAMFER;
  const k = PLATE_CHAMFER;
  const pw = g.plate.r + PLATE_RIM;
  const pb = g.plate.b + PLATE_RIM;
  const pts: Point[] = [];

  if (g.still > 0) {
    const h = g.still;
    pts.push([c, 0], [g.w - c, 0], [g.w, c], [g.w, h - c], [g.w - c, h]);
    if (g.lobe) {
      const [sx, sy] = g.lobe;
      const dy = h - sy;
      if (Math.abs(dy) < R) {
        // The circle cuts the bottom edge of the image at sx ± dx.
        const dx = Math.sqrt(R * R - dy * dy);
        const t0 = deg(Math.atan2(dy, dx));
        pts.push([sx + dx, h], ...arc(sx, sy, R, t0, 180 - t0), [sx - dx, h]);
      }
    }
    pts.push([pw, h], [pw, pb - k], [pw - k, pb], [k, pb], [0, pb - k]);
    pts.push([0, c]);
    return pts;
  }

  // Lab: the blank nameplate from the top, and the circle that bites into its right edge.
  pts.push([k, 0], [pw - k, 0], [pw, k]);
  if (g.lobe) {
    const [sx, sy] = g.lobe;
    const dx = pw - sx;
    if (Math.abs(dx) < R) {
      const dy = Math.sqrt(R * R - dx * dx);
      const tUp = deg(Math.atan2(-dy, dx));
      const tDown = deg(Math.atan2(dy, dx));
      pts.push([pw, sy - dy], ...arc(sx, sy, R, tUp, tDown + 360 * (tDown < tUp ? 1 : 0)), [pw, sy + dy]);
    }
  }
  pts.push([pw, pb - k], [pw - k, pb], [k, pb], [0, pb - k], [0, k]);
  return pts;
}

/**
 * The cardboard cover overhangs the cavity: 10 visible px (so the well has cardboard above it and at
 * its sides to cast a shadow) and 20 more px that are clipped, so that its outer edges and their
 * shadows never fall inside what is visible.
 */
export const BLEED = 10;
const OVER = 20;

/**
 * Cardboard cover with the well: the whole rectangle and, with evenodd, the outline as a hole.
 * The outline is in cavity coordinates; the result is in cover coordinates.
 */
export function wellClipPath(w: number, h: number, outline: Point[]): string {
  const o = BLEED + OVER;
  const f = (p: Point) => `${(p[0] + o).toFixed(1)}px ${(p[1] + o).toFixed(1)}px`;
  const box: Point[] = [[-o, -o], [w + o, -o], [w + o, h + o], [-o, h + o], [-o, -o]];
  return `polygon(evenodd, ${[...box, ...outline, outline[0], [-o, -o] as Point].map(f).join(', ')})`;
}

/** Measures each cavity and cuts its well; it repeats when the size changes (fonts, width). */
export function cutTray(root: ParentNode = document): void {
  const cavities = Array.from(root.querySelectorAll<HTMLElement>('.cavity'));
  const cut = (cavity: HTMLElement) => {
    const well = cavity.querySelector<HTMLElement>('.well');
    const plate = cavity.querySelector<HTMLElement>('.tin-nameplate');
    if (!well || !plate) return;
    const windowEl = cavity.querySelector<HTMLElement>('.cavity-window');
    const socket = cavity.querySelector<HTMLElement>('.top-socket');
    const box = cavity.getBoundingClientRect();
    if (!box.width) return;
    // Layout positions (without the hover translate), relative to the cavity.
    const rel = (el: HTMLElement) => {
      let l = 0;
      let t = 0;
      for (let e: HTMLElement | null = el; e && e !== cavity; e = e.offsetParent as HTMLElement | null) {
        l += e.offsetLeft;
        t += e.offsetTop;
      }
      return { l, t, r: l + el.offsetWidth, b: t + el.offsetHeight };
    };
    const p = rel(plate);
    const s = socket ? rel(socket) : null;
    const outline = wellOutline({
      w: cavity.offsetWidth,
      still: windowEl ? windowEl.offsetHeight : 0,
      plate: { l: p.l - PLATE_RIM, t: p.t - PLATE_RIM, r: p.r, b: p.b },
      lobe: s ? [(s.l + s.r) / 2, (s.t + s.b) / 2] : null,
    });
    well.style.setProperty('--cut', wellClipPath(cavity.offsetWidth, cavity.offsetHeight, outline));
    cavity.classList.add('is-cut');
  };
  const observer = new ResizeObserver((entries) => {
    for (const entry of entries) cut(entry.target.closest<HTMLElement>('.cavity') ?? (entry.target as HTMLElement));
  });
  for (const cavity of cavities) {
    observer.observe(cavity);
    const plate = cavity.querySelector('.tin-nameplate');
    if (plate) observer.observe(plate);
  }
}
