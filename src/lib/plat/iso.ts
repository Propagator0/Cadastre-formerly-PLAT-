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
// Mirrors the CSS chain: translateZ(-WORLD_DEPTH) rotateX(pitch) rotateZ(yaw)
// scale(zoom), then perspective divide.
export function projectPoint(p: WorldPoint, view: ViewState): { x: number; y: number; depth: number } {
  // CSS Y grows downward; world Y grows upward.
  let X = p.x * UNIT;
  let Y = -p.y * UNIT;
  let Z = p.z * UNIT;

  // scale
  X *= view.zoom;
  Y *= view.zoom;
  Z *= view.zoom;

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

  // translateZ(-WORLD_DEPTH)  → push back
  Z -= WORLD_DEPTH;

  // perspective divide. If the point is behind the camera, clamp.
  const denom = PERSPECTIVE - Z;
  const s = denom > 1 ? PERSPECTIVE / denom : PERSPECTIVE;
  return { x: X * s, y: Y * s, depth: Z };
}

// The CSS transform string for the world element. Must match projectPoint.
export function worldTransform(view: ViewState): string {
  return `translateZ(${-WORLD_DEPTH}px) rotateX(${-view.pitch}deg) rotateZ(${view.yaw}deg) scale(${view.zoom})`;
}

// The CSS perspective string for the scene parent.
export function scenePerspective(): string {
  return `${PERSPECTIVE}px`;
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
