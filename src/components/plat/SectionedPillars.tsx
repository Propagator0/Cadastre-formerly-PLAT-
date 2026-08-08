'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { usePlat } from '@/lib/plat/store';
import { STRATA } from '@/lib/plat/types';
import { BOARD, UNIT, projectPoint } from '@/lib/plat/iso';

// Pillars rendered as SVG lines in screen space, projected through the same
// iso transform as the rest of the scene. This is more reliable than rendering
// 3D box pillars inside the CSS preserve-3d scene — those get distorted by the
// perspective divide and end up off-screen when the lift is large.
//
// Each pillar is drawn as a thick line from the bottom (foundation) to the
// top (surface or wiring) with a small cap circle at the top. We also draw
// small horizontal "ticks" at each stratum level so the pillar reads as a
// structural column passing through each floor.
export function SectionedPillars() {
  const view = usePlat((s) => s.view);
  const focusStratum = usePlat((s) => s.view.focusStratum);
  const svgRef = useRef<SVGSVGElement | null>(null);
  // SVG dimensions — needed to align SVG-user-coords with the 3D scene.
  // See Cables.tsx for the same offset explanation.
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

  const pillars = useMemo(() => {
    if (!view.separated) return [];
    const W = BOARD - 1.5;
    const surfaceLift = STRATA.find((s) => s.id === 'surface')!.lift;
    const wiringLift = STRATA.find((s) => s.id === 'wiring')!.lift;

    // Tall pillars (foundation → surface) at corners.
    const tall: Array<{ x: number; z: number }> = [
      { x: -W, z: -W }, { x: W, z: -W }, { x: -W, z: W }, { x: W, z: W },
    ];
    // Short pillars (foundation → wiring) at mid-edges.
    const short: Array<{ x: number; z: number }> = [
      { x: 0, z: -W }, { x: 0, z: W }, { x: -W, z: 0 }, { x: W, z: 0 },
    ];

    const project = (x: number, y: number, z: number) => {
      const p = projectPoint({ x, y, z }, view);
      return { x: p.x, y: p.y, depth: p.depth };
    };

    const built: Array<{
      key: string;
      x1: number; y1: number; x2: number; y2: number;
      accent: string;
      midPoints: Array<{ x: number; y: number }>;
      topCap: { x: number; y: number };
      bottomCap: { x: number; y: number };
      dim: boolean;
    }> = [];

    for (let i = 0; i < tall.length; i++) {
      const p = tall[i]!;
      const bottom = project(p.x, 0, p.z);
      const top = project(p.x, surfaceLift, p.z);
      const midWiring = project(p.x, wiringLift, p.z);
      const dim = focusStratum !== null && focusStratum !== 'surface';
      built.push({
        key: `tall-${i}`,
        x1: bottom.x, y1: bottom.y,
        x2: top.x, y2: top.y,
        accent: '#c96442',
        midPoints: [{ x: midWiring.x, y: midWiring.y }],
        topCap: top,
        bottomCap: bottom,
        dim,
      });
    }
    for (let i = 0; i < short.length; i++) {
      const p = short[i]!;
      const bottom = project(p.x, 0, p.z);
      const top = project(p.x, wiringLift, p.z);
      const dim = focusStratum !== null && focusStratum !== 'wiring';
      built.push({
        key: `short-${i}`,
        x1: bottom.x, y1: bottom.y,
        x2: top.x, y2: top.y,
        accent: '#6aa0d8',
        midPoints: [],
        topCap: top,
        bottomCap: bottom,
        dim,
      });
    }
    return built;
  }, [view, focusStratum]);

  if (!view.separated || pillars.length === 0) return null;

  return (
    <svg
      ref={svgRef}
      className="plat-pillars"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        overflow: 'visible',
        zIndex: 25,
      }}
    >
      <defs>
        <linearGradient id="pillarGradOrange" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c96442" stopOpacity="0.95" />
          <stop offset="50%" stopColor="#3a3530" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#1a1714" stopOpacity="0.7" />
        </linearGradient>
        <linearGradient id="pillarGradBlue" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6aa0d8" stopOpacity="0.95" />
          <stop offset="50%" stopColor="#2a3540" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#141a20" stopOpacity="0.7" />
        </linearGradient>
        <filter id="pillarGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* Centering wrapper — see Cables.tsx for the offset explanation. */}
      <g transform={`translate(${svgSize.w / 2}, ${svgSize.h / 2})`}>
      {pillars.map((p) => {
        const grad = p.accent === '#c96442' ? 'url(#pillarGradOrange)' : 'url(#pillarGradBlue)';
        const opacity = p.dim ? 0.35 : 1;
        return (
          <g key={p.key} style={{ opacity, transition: 'opacity 380ms ease' }}>
            {/* shadow line — a slightly offset darker line behind for depth */}
            <line
              x1={p.x1 + 1.5}
              y1={p.y1}
              x2={p.x2 + 1.5}
              y2={p.y2}
              stroke="#000"
              strokeOpacity={0.5}
              strokeWidth={8}
              strokeLinecap="round"
            />
            {/* main shaft */}
            <line
              x1={p.x1}
              y1={p.y1}
              x2={p.x2}
              y2={p.y2}
              stroke={grad}
              strokeWidth={7}
              strokeLinecap="round"
            />
            {/* inner highlight stripe (the accent color runs through the middle) */}
            <line
              x1={p.x1}
              y1={p.y1}
              x2={p.x2}
              y2={p.y2}
              stroke={p.accent}
              strokeWidth={2}
              strokeLinecap="round"
              strokeOpacity={0.9}
            />
            {/* horizontal ticks where the pillar passes through each slab */}
            {p.midPoints.map((m, i) => (
              <circle
                key={i}
                cx={m.x}
                cy={m.y}
                r={4}
                fill={p.accent}
                fillOpacity={0.6}
                stroke="#1c1a17"
                strokeWidth={1}
              />
            ))}
            {/* top cap — a flared disc */}
            <circle
              cx={p.topCap.x}
              cy={p.topCap.y}
              r={8}
              fill={p.accent}
              fillOpacity={0.95}
              stroke="#fff"
              strokeWidth={1.5}
              strokeOpacity={0.5}
              filter="url(#pillarGlow)"
            />
            <circle
              cx={p.topCap.x}
              cy={p.topCap.y}
              r={4}
              fill="#fff"
              fillOpacity={0.7}
            />
            {/* bottom base — a small disc grounded */}
            <circle
              cx={p.bottomCap.x}
              cy={p.bottomCap.y}
              r={6}
              fill="#1c1a17"
              stroke={p.accent}
              strokeWidth={2}
              strokeOpacity={0.8}
            />
          </g>
        );
      })}
      </g>
    </svg>
  );
}
