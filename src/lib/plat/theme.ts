// PLAT — viewport themes.
//
// The city can be read in three "lights":
//   - paper:      the default warm off-white "drawn plate" — soft beige ground,
//                 warm dark ink, low contrast for long reading sessions.
//   - blueprint:  a cool cyan-on-navy surveyor's plate — high contrast, the
//                 classic engineering aesthetic. Ground is deep blue, ink is
//                 pale cyan, grid lines glow softly.
//   - dark:       a near-black night plate — for dim rooms and dramatic
//                 screenshots. Ground is charcoal, ink is warm off-white,
//                 cubes glow more strongly against the dark backdrop.
//
// Each theme defines the SAME set of palette slots so the renderer can swap
// them in without per-theme branches. The slots are:
//   - bg:         the canvas radial-gradient stops (center, mid, edge)
//   - paper:      the light checker square
//   - paperDark:  the dark checker square
//   - ink:        the warm/cool dark line + label color
//   - inkSoft:    a softer ink for secondary lines
//   - fog:        the radial vignette color (low opacity)
//   - grid:       the ground-plane grid line color
//   - label:      the floating label text color (defaults to ink)
//   - cubeGlow:   a multiplier on cube stuck/in-progress glow intensity

import { ViewTheme } from './types';

export interface ThemePalette {
  // Background radial-gradient stops — [center, mid, edge]
  bg: [string, string, string];
  paper: string;
  paperDark: string;
  ink: string;
  inkSoft: string;
  fog: string;
  grid: string;
  gridStrong: string;
  label: string;
  labelBg: string;
  labelBgSoft: string;
  // Glow multiplier — dark themes get stronger glows so cubes pop
  cubeGlowBoost: number;
  // Stratum slab tint multiplier — dark themes need brighter slab fills
  slabBoost: number;
}

export const THEMES: Record<ViewTheme, ThemePalette> = {
  paper: {
    bg: ['#efe9dc', '#e0d9c6', '#d6cfbd'],
    paper: '#efe9dc',
    paperDark: '#e3dccb',
    ink: '#2a2622',
    inkSoft: '#5a534a',
    fog: '#2a2622',
    grid: '#2a262240',
    gridStrong: '#2a262255',
    label: '#2a2622',
    labelBg: '#2a2622e8',
    labelBgSoft: '#2a262299',
    cubeGlowBoost: 1,
    slabBoost: 1,
  },
  blueprint: {
    bg: ['#0f1a2e', '#0a1424', '#070f1c'],
    paper: '#142340',
    paperDark: '#0e1a36',
    ink: '#cfe3f5',
    inkSoft: '#7a9bbf',
    fog: '#000814',
    grid: '#5a8fc855',
    gridStrong: '#7ab0e077',
    label: '#cfe3f5',
    labelBg: '#0a1424ee',
    labelBgSoft: '#5a8fc855',
    cubeGlowBoost: 1.2,
    slabBoost: 1.3,
  },
  dark: {
    bg: ['#1a1814', '#131110', '#0a0908'],
    paper: '#1f1c18',
    paperDark: '#161310',
    ink: '#efe9dc',
    inkSoft: '#9a9088',
    fog: '#000000',
    grid: '#efe9dc22',
    gridStrong: '#efe9dc33',
    label: '#efe9dc',
    labelBg: '#0a0908ee',
    labelBgSoft: '#efe9dc22',
    cubeGlowBoost: 1.35,
    slabBoost: 1.4,
  },
};

export function themeOf(t: ViewTheme): ThemePalette {
  return THEMES[t] ?? THEMES.paper;
}
