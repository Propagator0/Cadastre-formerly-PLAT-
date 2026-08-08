// PLAT — cable colors, shared by the Cables overlay and the Inspector.
import { LinkKind } from './types';

export const KIND_COLOR_BY_KIND: Record<LinkKind, string> = {
  // Explicit wires are the accent — they are the only cables the user
  // asserted rather than the app inferred, and they should be the first
  // thing the eye finds in a bundle.
  wire: '#c96442',
  stem: '#6aa0d8', // shared name — blue
  kin: '#7a8a72', // containment — green-grey
  mark: '#c8623a', // shared mark — terracotta
  mention: '#b0a898', // note reference — tan
};

// Human-readable labels for each link kind. Used by the cable tooltip and the
// legend so a user hovering a cable immediately knows what "stem" means.
export const KIND_LABEL_BY_KIND: Record<LinkKind, string> = {
  // Explicit wires are the accent — they are the only cables the user
  // asserted rather than the app inferred, and they should be the first
  // thing the eye finds in a bundle.
  wire: '#c96442',
  stem: 'shared name',
  kin: 'containment',
  mark: 'shared mark',
  mention: 'note ref',
};
