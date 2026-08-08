'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { usePlat } from '@/lib/plat/store';
import { Link } from '@/lib/plat/types';
import { stratumOf } from '@/lib/plat/types';
import { projectPoint, cubeTopPos } from '@/lib/plat/iso';
import { KIND_COLOR_BY_KIND as KIND_COLOR } from '@/lib/plat/cable-colors';
import { CableTooltip } from './CableTooltip';
interface Endpoint {
  world: ReturnType<typeof cubeTopPos>;
  link: Link;
  isFrom: boolean;
}
// Cable flow particles — animated dots that flow along cables to visualize
// the direction of data flow (from deeper strata upward to surface).
// Each cable gets 2-3 small dots that animate along the bezier path.

function FlowParticles({ pathData, time }: {
  pathData: Array<{
    d: string;
    link: Link;
    color: string;
    width: number;
    highlight: boolean;
    ax: number;
    ay: number;
    bx: number;
    by: number;
    c1x: number;
    c1y: number;
    c2x: number;
    c2y: number;
  }>;
  time: number;
}) {
  if (pathData.length === 0) return null;

  return (
    <g>
      {pathData.map((p) => {
        // 3 particles per cable, evenly spaced in time
        const count = 3;
        return Array.from({ length: count }, (_, i) => {
          // Each particle travels the cable in ~3s, offset by i/count
          const period = 3000;
          const t = ((time + (i / count) * period) % period) / period;
          // Cubic bezier position
          const x = cubicBezier(t, p.ax, p.c1x, p.c2x, p.bx);
          const y = cubicBezier(t, p.ay, p.c1y, p.c2y, p.by);
          // Fade in at start, fade out at end
          const alpha = Math.sin(t * Math.PI) * (p.highlight ? 0.9 : 0.4);
          const r = p.highlight ? 2.5 : 1.5;
          return (
            <circle
              key={`${p.link.id}-p${i}`}
              cx={x}
              cy={y}
              r={r}
              fill={p.color}
              fillOpacity={alpha}
            />
          );
        });
      })}
    </g>
  );
}

// Cubic bezier evaluation at t
function cubicBezier(t: number, p0: number, p1: number, p2: number, p3: number): number {
  const u = 1 - t;
  return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
}

export function Cables() {
  const tower = usePlat((s) => s.tower);
  const links = usePlat((s) => s.links);
  const view = usePlat((s) => s.view);
  const selected = usePlat((s) => s.selected);
  const hovered = usePlat((s) => s.hovered);

  // Animation time for flow particles
  const [time, setTime] = useState(0);
  // Hovered cable id — set when the cursor enters a cable's hit area. Drives
  // the CableTooltip and the per-cable highlight (stroke thickening).
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement | null>(null);
  // SVG dimensions — needed to align SVG-user-coords with the 3D scene.
  // projectPoint returns coords relative to the world origin (which sits at
  // the canvas centre), but SVG-user-coords are relative to the SVG's
  // top-left. We track the SVG's pixel size and apply a translate() to a
  // wrapper <g> so cables land on the cubes instead of floating off-screen.
  const [svgSize, setSvgSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const update = () => setSvgSize({ w: svg.clientWidth, h: svg.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(svg);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    let raf: number;
    let start: number | null = null;
    const tick = (ts: number) => {
      if (start === null) start = ts;
      setTime(ts - start);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Track mouse position globally so the tooltip can position itself even when
  // the cursor moves quickly between cables.
  useEffect(() => {
    const onMove = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  const pathData = useMemo(() => {
    // Build a lookup of district anchor + per-file index.
    const idx = new Map<string, { anchor: { x: number; z: number; rot: number }; fileIndex: Map<string, number> }>();
    for (const d of tower.districts) {
      const m = new Map<string, number>();
      d.files.forEach((f, i) => m.set(f.path, i));
      idx.set(d.id, { anchor: d.anchor, fileIndex: m });
    }

    const out: Array<{
      d: string;
      link: Link;
      color: string;
      width: number;
      highlight: boolean;
      ax: number;
      ay: number;
      bx: number;
      by: number;
      c1x: number;
      c1y: number;
      c2x: number;
      c2y: number;
    }> = [];

    for (const link of links) {
      // Cable-kind visibility filter: an empty set means "show all", a
      // non-empty set means "only show cables whose kind is in the set".
      if (view.cableKinds.size > 0 && !view.cableKinds.has(link.kind)) continue;
      const fd = idx.get(link.from.districtId);
      const td = idx.get(link.to.districtId);
      if (!fd || !td) continue;
      const fi = fd.fileIndex.get(link.from.path);
      const ti = td.fileIndex.get(link.to.path);
      if (fi === undefined || ti === undefined) continue;
      const fLift = view.separated ? stratumOf(link.from.districtId).lift : 0;
      const tLift = view.separated ? stratumOf(link.to.districtId).lift : 0;
      const a = cubeTopPos(fd.anchor, fi, fLift);
      const b = cubeTopPos(td.anchor, ti, tLift);

      // Control points bow toward the viewer (+z) so the cable reads as
      // floating in 3D, not pasted flat.
      const bow = 1.6 + Math.abs(a.x - b.x) * 0.08 + Math.abs(a.z - b.z) * 0.08;
      const c1 = { x: a.x, y: (a.y + b.y) / 2 + 0.4, z: a.z + bow };
      const c2 = { x: b.x, y: (a.y + b.y) / 2 + 0.4, z: b.z + bow };

      const pa = projectPoint(a, view);
      const pc1 = projectPoint(c1, view);
      const pc2 = projectPoint(c2, view);
      const pb = projectPoint(b, view);

      const d = `M ${pa.x} ${pa.y} C ${pc1.x} ${pc1.y}, ${pc2.x} ${pc2.y}, ${pb.x} ${pb.y}`;
      // A cable is highlighted if either endpoint is the selected or hovered
      // cube. The hovered-link check (which sets the tooltip) is handled
      // separately at render time via the `emphasized` flag.
      const endpointHL =
        (selected != null &&
          selected.districtId === link.from.districtId &&
          selected.path === link.from.path) ||
        (selected != null &&
          selected.districtId === link.to.districtId &&
          selected.path === link.to.path) ||
        (hovered != null &&
          hovered.districtId === link.from.districtId &&
          hovered.path === link.from.path) ||
        (hovered != null &&
          hovered.districtId === link.to.districtId &&
          hovered.path === link.to.path);
      out.push({
        d,
        link,
        color: KIND_COLOR[link.kind],
        width: 0.6 + link.strength * 2.2,
        highlight: endpointHL,
        ax: pa.x,
        ay: pa.y,
        bx: pb.x,
        by: pb.y,
        c1x: pc1.x,
        c1y: pc1.y,
        c2x: pc2.x,
        c2y: pc2.y,
      });
    }
    return out;
  }, [tower, links, view, selected, hovered]);

  if (!view.showCables) return null;

  const hoveredLinkObj = hoveredLink
    ? pathData.find((p) => p.link.id === hoveredLink)?.link ?? null
    : null;

  return (
    <>
      <svg
        ref={svgRef}
        className="plat-cables"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          // SVG itself doesn't receive events — so cube hovers/clicks pass
          // through. Hit-area paths set pointer-events:stroke to override
          // and receive hovers on the cable curve.
          pointerEvents: 'none',
          overflow: 'visible',
          zIndex: 30,
        }}
      >
        <defs>
          <filter id="cableGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="cableGlowSoft" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="particleGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* drop shadow so cables read against the light checkerboard */}
          <filter id="cableDrop" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="0.8" floodColor="#1c1a17" floodOpacity="0.4" />
          </filter>
        </defs>
        {/* Centering wrapper — projectPoint returns coords relative to the
            world origin (canvas centre), but SVG-user-coords are relative to
            the SVG's top-left. Translating by (w/2, h/2) aligns them. */}
        <g transform={`translate(${svgSize.w / 2}, ${svgSize.h / 2})`}>
          {pathData.map((p, i) => {
            const isHovered = hoveredLink === p.link.id;
            // A cable is drawn emphasized if it's hovered (cursor) or if either
            // endpoint is the selected/hovered cube. The two signals stack so a
            // hovered cable always wins for visibility.
            const emphasized = isHovered || p.highlight;
            return (
              <g key={p.link.id}>
                {/* background glow trace — always visible, subtle. Doubled on
                    emphasis so the cable pops when relevant. */}
                <path
                  d={p.d}
                  fill="none"
                  stroke={p.color}
                  strokeWidth={p.width * (emphasized ? 1.4 : 0.8)}
                  strokeOpacity={emphasized ? 0.22 : 0.12}
                  strokeLinecap="round"
                  filter="url(#cableGlowSoft)"
                  style={{ pointerEvents: 'none' }}
                />
                {/* main cable — boosted base opacity (0.55 vs 0.35) so cables
                    are readable against the light checkerboard floor even when
                    not highlighted. */}
                <path
                  d={p.d}
                  fill="none"
                  stroke={p.color}
                  strokeWidth={emphasized ? p.width * 2.4 : p.width}
                  strokeOpacity={emphasized ? 0.95 : 0.55}
                  strokeLinecap="round"
                  strokeDasharray={emphasized ? undefined : '6 4'}
                  filter={emphasized ? 'url(#cableGlow)' : 'url(#cableDrop)'}
                  style={{
                    pointerEvents: 'none',
                    transition: 'stroke-opacity 200ms, stroke-width 200ms',
                    animation: emphasized ? undefined : 'plat-cable-dash 1.5s linear infinite',
                  }}
                />
                {/* always-on endpoint dots — small, low-opacity, so every cable
                    reads as anchored to a real cube even when nothing is
                    highlighted. Fixes the "orphaned cable" look. */}
                <circle cx={p.ax} cy={p.ay} r={emphasized ? 4.5 : 2.5} fill={p.color} fillOpacity={emphasized ? 0.9 : 0.5} style={{ transition: 'r 200ms, fill-opacity 200ms', pointerEvents: 'none' }} />
                <circle cx={p.bx} cy={p.by} r={emphasized ? 4.5 : 2.5} fill={p.color} fillOpacity={emphasized ? 0.9 : 0.5} style={{ transition: 'r 200ms, fill-opacity 200ms', pointerEvents: 'none' }} />
                {/* hover halo on emphasized endpoint dots */}
                {emphasized && (
                  <>
                    <circle cx={p.ax} cy={p.ay} r={6.5} fill={p.color} fillOpacity={0.2} style={{ pointerEvents: 'none' }} />
                    <circle cx={p.bx} cy={p.by} r={6.5} fill={p.color} fillOpacity={0.2} style={{ pointerEvents: 'none' }} />
                  </>
                )}
                {/* invisible wide hit area so the cable is easy to hover even at
                    thin stroke widths. Uses pointer-events:stroke with a wide
                    transparent stroke — the stroke is invisible but still
                    receives pointer events. */}
                <path
                  d={p.d}
                  fill="none"
                  stroke="#000"
                  strokeOpacity={0}
                  strokeWidth={Math.max(16, p.width * 5)}
                  strokeLinecap="round"
                  style={{ pointerEvents: 'stroke', cursor: 'help' }}
                  onPointerEnter={() => setHoveredLink(p.link.id)}
                  onPointerLeave={() => setHoveredLink((cur) => (cur === p.link.id ? null : cur))}
                />
              </g>
            );
          })}
          {/* flow particles — animated dots traveling along cables */}
          <FlowParticles pathData={pathData} time={time} />
        </g>
      </svg>
      <CableTooltip
        tower={tower}
        link={hoveredLinkObj}
        mouseX={mousePos.x}
        mouseY={mousePos.y}
      />
    </>
  );
}

// Kind legend, rendered by the parent.
export const LINK_KIND_LEGEND: Array<{ kind: Link['kind']; label: string; color: string }> = [
  { kind: 'stem', label: 'shared name', color: KIND_COLOR.stem },
  { kind: 'kin', label: 'containment', color: KIND_COLOR.kin },
  { kind: 'mark', label: 'shared mark', color: KIND_COLOR.mark },
  { kind: 'mention', label: 'note ref', color: KIND_COLOR.mention },
];
