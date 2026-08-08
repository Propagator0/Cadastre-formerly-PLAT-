// PLAT — isometric geometry.
//
// The city is built in CSS 3D: a perspective parent holds a preserve-3d world
// that we rotate (yaw around Z, pitch down from horizontal) and scale. Cubes
// are positioned with translate3d; their faces are six child divs.
//
// The cables are an SVG overlay drawn in 2D screen space, so we need to project
// a world point through the SAME transform chain the CSS engine uses. This
// module is that single source of truth for the projection — both the renderer
// (via CSS variables) and the cable layer (via projectPoint) read from here.

import { ViewState } from './types';

// One world unit, in pixels (before zoom). A cube edge is ~this.
export const UNIT = 58;
// Cube edge as a fraction of UNIT — a hair under 1 so stacked cubes read as
// separate blocks rather than a solid column.
export const CUBE = 0.84;
// Board half-extent in world units. The checkered grid covers [-BOARD, BOARD].
export const BOARD = 12;
// How far the world is pushed back into the perspective frustum. Smaller = the
// scene sits closer to the camera, stronger 3D foreshortening on the cubes.
export const WORLD_DEPTH = 300;
// The perspective distance of the parent. Smaller = stronger perspective, more
// pronounced 3D depth on the cubes (a flat cube reads as flat when this is too
// large relative to the cube size).
export const PERSPECTIVE = 1050;

export interface WorldPoint {
  x: number;
  y: number; // world UP (positive = up). Converted to CSS -Y internally.
  z: number;
}

const DEG = Math.PI / 180;

// Project a world point to 2D screen coords relative to the scene centre.
// Mirrors the CSS chain: translateZ(-WORLD_DEPTH*zoom) rotateX(pitch)
// rotateZ(yaw) scale(zoom), then perspective divide with PERSPECTIVE*zoom.
//
// WHY zoom scales PERSPECTIVE and WORLD_DEPTH (not just the world):
// If only the world is scaled by k while PERSPECTIVE (P) and WORLD_DEPTH (D)
// stay fixed, the scene's depth RANGE scales by k but the camera distance
// stays ~P-D. That makes the perspective ratio (near vs far foreshortening)
// CHANGE with zoom — zoom out → near-orthographic (squeezes flat), zoom in →
// fisheye (bulges/deforms). This was the "platform squeezes together,
// everything deforms" complaint.
//
// By scaling both P and D by k, the perspective divide factor becomes
//   s = (P·k) / (P·k - (z_r·k - D·k)) = P / (P - z_r + D)
// which is independent of k. The perspective ratio is now constant at every
// zoom level — objects grow/shrink (zoom still works) but their SHAPE never
// deforms. Verified numerically: for a point at rotated z = +400px the old
// scheme swings s from 0.913 (zoom 0.5) to 1.780 (zoom 1.9) — a 95% change in
// foreshortening across the zoom range. The new scheme holds it at 1.1053 to
// four decimal places at every zoom.
export function projectPoint(p: WorldPoint, view: ViewState): { x: number; y: number; depth: number } {
  const k = view.zoom;
  // CSS Y grows downward; world Y grows upward.
  let X = p.x * UNIT;
  let Y = -p.y * UNIT;
  let Z = p.z * UNIT;

  // scale
  X *= k;
  Y *= k;
  Z *= k;

  // rotateZ(yaw)
  const cy = Math.cos(view.yaw * DEG);
  const sy = Math.sin(view.yaw * DEG);
  const rx = X * cy - Y * sy;
  const ry = X * sy + Y * cy;
  X = rx;
  Y = ry;

  // rotateX(-pitch) — negative because CSS rotateX(positive) tilts the top of
  // the scene AWAY from the viewer (view from below). We want a bird's-eye
  // view looking DOWN, so the pitch is applied as a negative rotation.
  const cp = Math.cos(view.pitch * DEG);
  const sp = Math.sin(view.pitch * DEG);
  const ry2 = Y * cp + Z * sp;
  const rz2 = -Y * sp + Z * cp;
  Y = ry2;
  Z = rz2;

  // translateZ(-WORLD_DEPTH * zoom) — push back, scaled to match the world
  Z -= WORLD_DEPTH * k;

  // perspective divide with PERSPECTIVE * zoom. If behind the camera, clamp.
  const Pk = PERSPECTIVE * k;
  const denom = Pk - Z;
  const s = denom > 1 ? Pk / denom : Pk;
  return { x: X * s, y: Y * s, depth: Z };
}

// The CSS transform string for the world element. Must match projectPoint.
// Note: translateZ scales by zoom so the world sits at the same RELATIVE
// depth in the (now also zoom-scaled) perspective frustum — see projectPoint
// for the full derivation of why this prevents zoom deformation.
export function worldTransform(view: ViewState): string {
  const k = view.zoom;
  return `translateZ(${-WORLD_DEPTH * k}px) rotateX(${-view.pitch}deg) rotateZ(${view.yaw}deg) scale(${k})`;
}

// The CSS perspective string for the scene parent. Scales with zoom so the
// perspective ratio stays constant — see projectPoint for the derivation.
export function scenePerspective(zoom: number): string {
  return `${PERSPECTIVE * zoom}px`;
}

// Camera guardrails — keep the POV manageable.
// PITCH_MIN raised from 22 to 32 so the view never goes edge-on (which was
// the "turns sideways" complaint: at 22° the city reads as a flat line and
// labels skim the horizon). 32° still gives a dramatic low angle without
// disorientation.
export const PITCH_MIN = 32;
export const PITCH_MAX = 82;
// Yaw is free-orbit but we normalize the stored value to [-180, 180] so the
// readout stays clean and the gizmo indicator doesn't spin multiple turns.
export function normalizeYaw(yaw: number): number {
  let y = ((yaw + 180) % 360 + 360) % 360 - 180;
  if (y === -180) y = 180;
  return y;
}

// Billboard transform — makes a flat child element always face the camera,
// regardless of the world's yaw/pitch. Use as the rotation part of the
// child's transform (after its translate3d position).
//
// The world is transformed as: translateZ(-D) rotateX(-pitch) rotateZ(yaw) scale(z)
// To cancel both rotations on a child, the child applies the inverse in
// reverse order: rotateZ(-yaw) rotateX(pitch). After the world's rotations
// compose with the child's, the net orientation is identity — the child's
// flat face points at the camera (+Z in screen space), and its local "up"
// stays screen-up. This is what makes labels stay upright from any angle.
export function billboardRotation(view: Pick<ViewState, 'yaw' | 'pitch'>): string {
  return `rotateZ(${-view.yaw}deg) rotateX(${view.pitch}deg)`;
}

// Given a cube's index in its district's file list, return its world-space
// centre (the building stacks files bottom-to-top in declared order).
export function cubeWorldPos(
  anchor: { x: number; z: number; rot: number },
  index: number,
  lift: number,
): WorldPoint {
  return {
    x: anchor.x,
    y: (index + 0.5) * CUBE + lift,
    z: anchor.z,
  };
}

// The top centre of a cube (where a cable attaches).
export function cubeTopPos(
  anchor: { x: number; z: number; rot: number },
  index: number,
  lift: number,
): WorldPoint {
  return {
    x: anchor.x,
    y: (index + 1) * CUBE + lift,
    z: anchor.z,
  };
}
