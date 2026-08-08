// PLAT — color science for the plate.
//
// Every cube is drawn, not lit. The three visible faces get a fixed shade step
// (top brightest, left medium, right darkest) so the axonometric reads at any
// zoom without a lighting pass. Status tints the whole cube; the district colour
// is the base.

export interface CubeTone {
  top: string;
  left: string;
  right: string;
  edge: string;
  glow: string; // for stuck / in-progress emissive feel
}

function clamp(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

// hex (#rrggbb) -> {r,g,b}
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  const full =
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${clamp(r).toString(16).padStart(2, '0')}${clamp(g)
    .toString(16)
    .padStart(2, '0')}${clamp(b)
    .toString(16)
    .padStart(2, '0')}`;
}

function mix(a: string, b: string, t: number): string {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  return rgbToHex(
    x.r + (y.r - x.r) * t,
    x.g + (y.g - x.g) * t,
    x.b + (y.b - x.b) * t,
  );
}

function shade(hex: string, amt: number): string {
  // amt > 0 lightens toward white, < 0 darkens toward black
  if (amt >= 0) return mix(hex, '#ffffff', amt);
  return mix(hex, '#1a1a1a', -amt);
}

import { Status } from './types';

// The status overlay: tints the district colour, sets opacity, picks a glow.
const STATUS_TINT: Record<
  Status,
  { tint: string | null; opacity: number; glow: string | null; grayscale: number }
> = {
  planned: { tint: null, opacity: 0.22, glow: null, grayscale: 0 },
  in_progress: { tint: null, opacity: 0.6, glow: '#ffd27a', grayscale: 0 },
  done: { tint: null, opacity: 1, glow: null, grayscale: 0 },
  stuck: { tint: '#d63b2f', opacity: 1, glow: '#ff4d3d', grayscale: 0 },
  abandoned: { tint: '#6b6b6b', opacity: 0.4, glow: null, grayscale: 0.7 },
  removed: { tint: null, opacity: 0, glow: null, grayscale: 0 },
};

export function toneFor(districtColor: string, status: Status): CubeTone {
  const t = STATUS_TINT[status];
  let base = districtColor;
  if (t.tint) base = mix(districtColor, t.tint, 0.55);
  if (t.grayscale > 0) {
    const c = hexToRgb(base);
    const lum = c.r * 0.3 + c.g * 0.59 + c.b * 0.11;
    base = rgbToHex(
      c.r + (lum - c.r) * t.grayscale,
      c.g + (lum - c.g) * t.grayscale,
      c.b + (lum - c.b) * t.grayscale,
    );
  }
  return {
    top: shade(base, 0.22),
    left: shade(base, -0.04),
    right: shade(base, -0.32),
    edge: shade(base, -0.5),
    glow: t.glow ?? 'transparent',
  };
}

export const STATUS_OPACITY: Record<Status, number> = {
  planned: 0.22,
  in_progress: 0.6,
  done: 1,
  stuck: 1,
  abandoned: 0.4,
  removed: 0,
};

// The ink colour for the board lines / labels. A warm dark, not pure black,
// so the plate reads as drawn rather than rendered.
export const INK = '#2a2622';
export const PAPER = '#efe9dc'; // the warm off-white ground
export const PAPER_DARK = '#e3dccb'; // checker shadow square
