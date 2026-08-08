'use client';

import type { Part } from '@/lib/plat/parts';
import { memo, useEffect, useState } from 'react';
import { FileCube, STATUS_GLYPH, Status } from '@/lib/plat/types';
import { CUBE, UNIT } from '@/lib/plat/iso';
import { toneFor, INK } from '@/lib/plat/color';
import { CubeContextMenu } from './CubeContextMenu';

interface CubeProps {
  cube: FileCube;
  // The district this cube belongs to — needed by the context menu to
  // call store actions like setStatus / toggleMark / focusDistrict.
  districtId: string;
  color: string;
  // world-space centre of this cube (y = height of cube centre)
  x: number;
  y: number;
  z: number;
  // Stack position (1-based index in the district's file list, plus the total).
  // Used to render a small "3/14" label on the cube's side face when
  // showStackNumber is on, so the assembly order reads at a glance.
  stackIndex: number;
  stackTotal: number;
  selected: boolean;
  hovered: boolean;
  dimmed: boolean;
  colorblindMode: boolean;
  highlighted: boolean;
  showStackNumber: boolean;
  onSelect: () => void;
  onHover: (h: boolean) => void;
}

const E = CUBE * UNIT; // cube edge in px

// The six face transforms for a cube of edge E centred at the container origin.
const FACES = [
  { key: 'top', t: `rotateX(90deg) translateZ(${E / 2}px)` },
  { key: 'bottom', t: `rotateX(-90deg) translateZ(${E / 2}px)` },
  { key: 'front', t: `translateZ(${E / 2}px)` },
  { key: 'back', t: `rotateY(180deg) translateZ(${E / 2}px)` },
  { key: 'right', t: `rotateY(90deg) translateZ(${E / 2}px)` },
  { key: 'left', t: `rotateY(-90deg) translateZ(${E / 2}px)` },
] as const;

// Colorblind pattern overlays — a distinct background pattern per status so
// status is distinguishable by SHAPE, not just color.
function colorblindPattern(status: Status, color: string): string | null {
  switch (status) {
    case 'done':
      // Solid cross-hatch: thick diagonal lines
      return `repeating-linear-gradient(45deg, ${INK}33 0 2px, transparent 2px 8px)`;
    case 'in_progress':
      // Dotted grid
      return `radial-gradient(${INK}55 1px, transparent 1.5px)`;
    case 'stuck':
      // Heavy cross-hatch X
      return `repeating-linear-gradient(45deg, ${INK}55 0 2px, transparent 2px 6px), repeating-linear-gradient(-45deg, ${INK}55 0 2px, transparent 2px 6px)`;
    case 'abandoned':
      // Faded horizontal stripes
      return `repeating-linear-gradient(0deg, ${INK}22 0 1px, transparent 1px 8px)`;
    case 'planned':
      // Diagonal dashed (already done via ghost, but reinforce)
      return `repeating-linear-gradient(45deg, ${color}33 0 4px, transparent 4px 8px)`;
    default:
      return null;
  }
}

// One CSS gradient encoding the whole part list.
//
// Bottom of the face is the first part. A built band is filled and closed
// with a firm course line; an unbuilt one is left open under a faint one, so
// you can count what remains. Kept as a single gradient string rather than N
// child divs on purpose — this renderer is a CSS 3D transform pipeline and
// every extra element inside a face is another thing that can z-fight with
// the faces around it.
function courseBands(parts: Part[] | undefined, edge: string, color: string): string {
  const live = (parts ?? []).filter((p) => p.status !== 'removed');
  if (live.length === 0) {
    return `repeating-linear-gradient(0deg, transparent 0 9px, ${edge}26 9px 10px)`;
  }
  const step = 100 / live.length;
  const stops: string[] = [];
  // CSS gradients run top-down; the parts run bottom-up. Walk them reversed
  // so part one sits on the ground.
  [...live].reverse().forEach((part, i) => {
    const from = i * step;
    const to = (i + 1) * step;
    const built = part.status === 'done';
    const working = part.status === 'in_progress' || part.status === 'stuck';
    const fill = built ? `${edge}2e` : working ? `${color}22` : 'transparent';
    const line = built ? `${edge}aa` : `${edge}33`;
    const lineAt = Math.max(from, to - 1.2);
    stops.push(`${fill} ${from.toFixed(2)}%`);
    stops.push(`${fill} ${lineAt.toFixed(2)}%`);
    stops.push(`${line} ${lineAt.toFixed(2)}%`);
    stops.push(`${line} ${to.toFixed(2)}%`);
  });
  return `linear-gradient(0deg, ${stops.join(', ')})`;
}

function CubeImpl({
  cube,
  districtId,
  color,
  x,
  y,
  z,
  stackIndex,
  stackTotal,
  selected,
  hovered,
  dimmed,
  colorblindMode,
  highlighted,
  showStackNumber,
  onSelect,
  onHover,
}: CubeProps) {
  const tone = toneFor(color, cube.status);
  const ghost = cube.status === 'planned';
  const translucent =
    cube.status === 'in_progress' || cube.status === 'abandoned';

  // progress drives how "filled" an in-hand cube looks — a partial cube is
  // shorter, growing to full height as the file nears done. `progress` is now
  // a rollup of the cube's parts rather than a number someone dragged a
  // slider to, so this height IS the completion of the checklist.
  const growth =
    cube.status === 'in_progress'
      ? 0.45 + (cube.progress / 100) * 0.55
      : cube.status === 'abandoned'
        ? 0.7
        : 1;

  const opacity = dimmed ? 0.16 : 1;
  const scale = selected ? 1.12 : hovered ? 1.06 : 1;

  // Entrance animation: cubes drop in from above on first mount, staggered by
  // their stack index so the city assembles itself piece-by-piece. Uses a
  // single CSS transition triggered by an `entered` flag (one state, no
  // re-renders after) so it plays nicely with the existing CSS 3D pipeline.
  // (motion.div would conflict with the translate3d face transforms.)
  const [entered, setEntered] = useState(false);
  // Stagger by stack position (y is already proportional to stack index).
  const delay = Math.min(y * 28, 800);
  useEffect(() => {
    const t = setTimeout(() => setEntered(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  const enterY = entered ? 0 : -180;

  const faceBg = (key: string): string => {
    if (ghost) {
      // ghost slots get a faint district-tinted fill so the planned height
      // of the stack reads visibly — the "slot waiting to be filled".
      if (key === 'top') return `${color}1f`;
      return `${color}12`;
    }
    if (key === 'top') return tone.top;
    if (key === 'left') return tone.left;
    if (key === 'right') return tone.right;
    if (key === 'front') return tone.left;
    if (key === 'back') return tone.right;
    return tone.right; // bottom
  };

  return (
    <CubeContextMenu districtId={districtId} cube={cube}>
      <div
        className="plat-cube"
        style={{
          position: 'absolute',
          width: E,
          height: E,
          left: '50%',
          top: '50%',
          marginLeft: -E / 2,
          marginTop: -E / 2,
          transformStyle: 'preserve-3d',
          // The enterY offset is added BEFORE the world-space translate3d so the
          // cube drops in from above its target position, then settles. The
          // transition handles the drop; opacity fades in simultaneously.
          // After entrance, swap to a snappier transition for hover/select.
          transform: `translate3d(${x * UNIT}px, ${(-y * UNIT) + enterY}px, ${z * UNIT}px) scale(${scale})`,
          opacity: entered ? opacity : 0,
          transition: entered
            ? 'transform 220ms cubic-bezier(.2,.7,.2,1), opacity 200ms ease'
            : 'transform 520ms cubic-bezier(.34,1.36,.4,1), opacity 360ms ease-out',
          cursor: dimmed ? 'default' : 'pointer',
          pointerEvents: dimmed ? 'none' : 'auto',
          zIndex: ghost ? 0 : 1,
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        onPointerEnter={() => onHover(true)}
        onPointerLeave={() => onHover(false)}
        // NOTE: do NOT add an onContextMenu={(e) => e.preventDefault()} here.
        // Radix's ContextMenuTrigger (via asChild) composes its own
        // onContextMenu handler with any prop handler — and composeEventHandlers
        // skips Radix's open-menu logic if event.defaultPrevented is already
        // true. So a defensive preventDefault() would silently prevent the
        // custom menu from opening. Radix already calls preventDefault()
        // internally, which suppresses the browser's default menu.
      >
      {/* glow halo for stuck / in-progress */}
      {(cube.status === 'stuck' || cube.status === 'in_progress') && (
        <div
          style={{
            position: 'absolute',
            inset: -E * 0.35,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${tone.glow}${cube.status === 'stuck' ? '55' : '30'} 0%, transparent 70%)`,
            transform: 'translateZ(0)',
            pointerEvents: 'none',
            filter: cube.status === 'stuck' ? 'blur(6px)' : 'blur(8px)',
            animation: cube.status === 'stuck' ? 'plat-glow-pulse 1.2s ease-in-out infinite' : 'none',
          }}
        />
      )}

      {/* search-highlight ring — when this cube matches the current query,
          draw a pulsing yellow ring around it so it pops out of the stack. */}
      {highlighted && (
        <div
          style={{
            position: 'absolute',
            inset: -E * 0.18,
            borderRadius: 4,
            border: `2px solid #ffd27a`,
            boxShadow: `0 0 12px #ffd27a99, 0 0 24px #ffd27a55, inset 0 0 8px #ffd27a44`,
            transform: 'translateZ(0)',
            pointerEvents: 'none',
            animation: 'plat-highlight-pulse 1.4s ease-in-out infinite',
          }}
        />
      )}

      {FACES.map((f) => {
        const isTop = f.key === 'top';
        const isBottom = f.key === 'bottom';
        const isSide =
          f.key === 'left' || f.key === 'right' || f.key === 'front' || f.key === 'back';
        // For in-progress partial growth, shorten side faces from the bottom.
        const sideHeight = isSide ? E * growth : E;
        const sideShift = isSide ? (E - sideHeight) / 2 : 0;
        // Stacked cubes need a crisp top-edge highlight so each cube in the
        // stack reads as a distinct block, not a continuous column.
        const topEdge =
          !ghost && isTop
            ? `inset 0 0 0 1px ${tone.edge}, inset 0 1px 0 ${shade(tone.top, 0.35)}`
            : ghost
              ? 'none'
              : `inset 0 0 0 1px ${tone.edge}`;
        // Decide the background. If we have a gradient, put it in `background`
        // (which accepts both color and image); otherwise fall back to the
        // flat tone color. NEVER set both `background` and `backgroundImage`
        // — React warns about that and it produces inconsistent renders.
        let bg: string;
        if (ghost) {
          bg = isTop
            ? `${faceBg(f.key)} repeating-linear-gradient(45deg, transparent 0 6px, ${color}18 6px 7px)`
            : faceBg(f.key);
        } else if (isTop) {
          bg = `linear-gradient(135deg, ${shade(tone.top, 0.08)} 0%, ${shade(tone.top, -0.05)} 100%)`;
        } else if (isSide) {
          // Course banding. The side faces used to carry an even 9px stripe —
          // decoration standing in for masonry. Now each band is one PART of
          // the file, laid bottom-up: built parts are filled, the rest are a
          // hairline outline of a course that has been named and not made.
          //
          // So the side of a cube reads as a count of things done out of
          // things intended, from any distance, without a tooltip. That is
          // the piece-by-piece assembly the scalar could only approximate.
          bg = `${faceBg(f.key)} ${courseBands(cube.parts, tone.edge, color)}`;
        } else {
          bg = faceBg(f.key);
        }
        return (
          <div
            key={f.key}
            style={{
              position: 'absolute',
              width: E,
              height: sideHeight,
              left: 0,
              top: sideShift,
              transform: f.t,
              backfaceVisibility: 'hidden',
              background: bg,
              opacity: ghost ? 0.85 : translucent ? 0.9 : 1,
              boxShadow: isBottom && ghost ? 'none' : topEdge,
              border: ghost
                ? `1px ${isTop ? 'solid' : 'solid'} ${color}80`
                : 'none',
            }}
          />
        );
      })}

      {/* progress arc on top face — for in-progress cubes, a circular arc
          shows how far along the file is. Visible even from a distance as a
          bright partial ring on the top face. */}
      {cube.status === 'in_progress' && cube.progress > 0 && (
        <svg
          width={E}
          height={E}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            transform: `rotateX(90deg) translateZ(${E / 2 + 0.4}px)`,
            pointerEvents: 'none',
            overflow: 'hidden',
          }}
        >
          {/* background ring */}
          <circle
            cx={E / 2}
            cy={E / 2}
            r={E * 0.32}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={2}
          />
          {/* progress arc */}
          <circle
            cx={E / 2}
            cy={E / 2}
            r={E * 0.32}
            fill="none"
            stroke="#e8a93a"
            strokeWidth={2}
            strokeDasharray={`${(cube.progress / 100) * 2 * Math.PI * E * 0.32} ${2 * Math.PI * E * 0.32}`}
            strokeLinecap="round"
            transform={`rotate(-90 ${E / 2} ${E / 2})`}
            strokeOpacity={0.85}
            style={{
              transition: 'stroke-dasharray 300ms ease',
            }}
          />
          {/* center percentage text — only when progress is significant */}
          {cube.progress >= 20 && (
            <text
              x={E / 2}
              y={E / 2 + 1}
              textAnchor="middle"
              dominantBaseline="central"
              fill="rgba(239,233,220,0.75)"
              fontSize={E * 0.18}
              fontWeight={700}
              fontFamily="var(--font-geist-mono), monospace"
            >
              {cube.progress}
            </text>
          )}
        </svg>
      )}

      {/* selected ring on the ground */}
      {selected && (
        <div
          style={{
            position: 'absolute',
            width: E * 1.6,
            height: E * 1.6,
            left: '50%',
            top: '50%',
            marginLeft: -E * 0.8,
            marginTop: -E * 0.8,
            transform: `rotateX(90deg) translateZ(${-(y * UNIT) + 0.5}px)`,
            border: `2px solid ${INK}`,
            borderRadius: 4,
            pointerEvents: 'none',
            opacity: 0.8,
          }}
        />
      )}

      {/* colorblind-mode overlay — a status glyph + pattern on the top face,
          so cube status is readable by SHAPE, not just color. Rendered as a
          sibling of the faces, projected onto the top face via the same
          transform but pushed slightly above (translateZ(E/2 + 0.3px)). */}
      {colorblindMode && !ghost && (
        <div
          style={{
            position: 'absolute',
            width: E,
            height: E,
            left: 0,
            top: 0,
            transform: `rotateX(90deg) translateZ(${E / 2 + 0.3}px)`,
            pointerEvents: 'none',
            // Pattern overlay (subtle texture distinct per status)
            backgroundImage: colorblindPattern(cube.status, color) ?? undefined,
            backgroundSize: '12px 12px',
            backgroundRepeat: 'repeat',
            opacity: 0.6,
          }}
        >
          {/* big status glyph in the center, drawn not colored */}
          {STATUS_GLYPH[cube.status] && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--font-geist-mono), monospace',
                fontSize: E * 0.42,
                fontWeight: 800,
                color: cube.status === 'stuck' ? '#fff' : INK,
                opacity: 0.85,
                textShadow: cube.status === 'stuck' ? '0 0 4px #d63b2f' : '0 1px 0 rgba(255,255,255,0.3)',
                lineHeight: 1,
                transform: `rotateZ(${-0}rad)`,
              }}
            >
              {STATUS_GLYPH[cube.status]}
            </div>
          )}
        </div>
      )}

      {/* stack-position number — a small "3/14" label projected onto the
          front face so the assembly order reads at a glance. Pushed slightly
          above the face (translateZ(E/2 + 0.2px)) to avoid z-fighting.
          Rendered on the front face only — the most camera-facing side. */}
      {showStackNumber && !ghost && (
        <div
          style={{
            position: 'absolute',
            width: E,
            height: E,
            left: 0,
            top: 0,
            transform: `translateZ(${E / 2 + 0.2}px)`,
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'flex-start',
            padding: '2px 3px',
            fontFamily: 'var(--font-geist-mono), monospace',
            fontSize: Math.max(7, E * 0.13),
            fontWeight: 700,
            letterSpacing: '0.02em',
            color: cube.status === 'stuck' ? '#fff' : INK,
            opacity: 0.7,
            textShadow: cube.status === 'stuck'
              ? '0 0 3px #d63b2f, 0 1px 1px rgba(0,0,0,0.5)'
              : '0 1px 0 rgba(255,255,255,0.35)',
            fontVariantNumeric: 'tabular-nums',
            lineHeight: 1,
          }}
        >
          {stackIndex + 1}/{stackTotal}
        </div>
      )}
      </div>
    </CubeContextMenu>
  );
}

function shade(hex: string, amt: number): string {
  // small inline copy to avoid an extra import cycle for the gradient
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const mix = (c: number) =>
    Math.max(0, Math.min(255, Math.round(amt >= 0 ? c + (255 - c) * amt : c * (1 + amt))));
  return `#${mix(r).toString(16).padStart(2, '0')}${mix(g)
    .toString(16)
    .padStart(2, '0')}${mix(b)
    .toString(16)
    .padStart(2, '0')}`;
}

export const Cube = memo(CubeImpl);
