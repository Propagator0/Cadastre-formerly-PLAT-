'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { usePlat } from '@/lib/plat/store';
import { STRATA } from '@/lib/plat/types';
import { BOARD, UNIT, projectPoint } from '@/lib/plat/iso';

// Two-part elevation indicator for sectioned mode:
//
// 1. A fixed HTML overlay on the right edge of the canvas — always visible,
//    always in the same place. Shows the three strata stacked vertically with
//    their lift heights + role labels, color-coded. This is the "ruler" users
//    see and read.
//
// 2. An SVG-projected overlay that draws a tick + label at each stratum's
//    actual 3D-projected position. This ties the HTML ruler to the scene —
//    the user can see that "SURFACE +8.8u" in the ruler corresponds to the
//    top slab in the cityscape.
export function ElevationRuler() {
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

  const { ticks, baseY, topY, axisX } = useMemo(() => {
    // Project two points per stratum: one at the stratum's lift (the slab
    // level), one a bit inboard so the label has room to render toward the
    // canvas centre (away from the right-edge MiniMap/LegendPanel overlays).
    const x = BOARD - 0.5;
    const ticks = STRATA.map((s) => {
      const at = projectPoint({ x, y: s.lift, z: 0 }, view);
      const edge = projectPoint({ x: x - 1.2, y: s.lift, z: 0 }, view);
      return {
        id: s.id,
        name: s.name,
        role: s.role,
        color: s.color,
        lift: s.lift,
        at,
        edge,
        isFocus: focusStratum === s.id,
        isDim: focusStratum !== null && focusStratum !== s.id,
      };
    });
    const baseAt = projectPoint({ x, y: 0, z: 0 }, view);
    const topAt = projectPoint({ x, y: STRATA[0]!.lift + 0.6, z: 0 }, view);
    return {
      ticks,
      baseY: baseAt.y,
      topY: topAt.y,
      axisX: ticks[0]!.at.x,
    };
  }, [view, focusStratum]);

  if (!view.separated) return null;

  return (
    <>
      {/* ── Part 1: fixed HTML overlay ruler ─────────────────────────────
          A vertical stack on the right edge of the canvas. Always visible
          regardless of camera angle. Sits ABOVE the MiniMap (top-right) and
          to the LEFT of the LegendPanel (bottom-right) — positioned at
          right-3 top-1/2 so it floats in the right-center. */}
      <div
        className="plat-elevation-ruler-overlay"
        style={{
          position: 'absolute',
          right: 12,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 35,
          pointerEvents: 'none',
          display: 'flex',
          flexDirection: 'column',
          gap: 0,
          background: 'rgba(28,26,23,0.92)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 4,
          boxShadow: '0 6px 20px rgba(0,0,0,0.35), inset 0 0 0 0.5px rgba(255,255,255,0.05)',
          overflow: 'hidden',
          fontFamily: 'var(--font-geist-mono), monospace',
          minWidth: 116,
        }}
      >
        {/* header */}
        <div
          style={{
            padding: '4px 8px 3px',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            fontSize: 8,
            fontWeight: 700,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'rgba(239,233,220,0.55)',
            textAlign: 'center',
          }}
        >
          elevation
        </div>
        {/* ticks — top (surface) to bottom (foundation) */}
        {STRATA.map((s) => {
          const isFocus = focusStratum === s.id;
          const isDim = focusStratum !== null && focusStratum !== s.id;
          const arrow = s.role === 'frontend' ? '↑' : s.role === 'connective' ? '↔' : '↓';
          const roleLabel =
            s.role === 'frontend' ? 'FRONTEND' : s.role === 'connective' ? 'CONNECTIVE' : 'BACKEND';
          return (
            <div
              key={s.id}
              style={{
                padding: '5px 8px',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                borderTop: `2px solid ${s.color}`,
                background: isFocus ? `${s.color}22` : 'transparent',
                opacity: isDim ? 0.4 : 1,
                transition: 'opacity 380ms ease, background 380ms ease',
                cursor: 'pointer',
                pointerEvents: 'auto',
              }}
              onClick={() => {
                // Clicking a stratum in the ruler focuses it — same as
                // pressing 1/2/3. Makes the ruler interactive, not just
                // decorative.
                const { focusStratum: cur } = usePlat.getState().view;
                usePlat.getState().focusStratum(cur === s.id ? null : s.id);
              }}
              title={`${s.name} · ${s.gloss} · click to focus this stratum`}
            >
              {/* color dot */}
              <span
                style={{
                  display: 'inline-block',
                  width: 7,
                  height: 7,
                  borderRadius: 2,
                  background: s.color,
                  boxShadow: isFocus ? `0 0 6px ${s.color}` : 'none',
                  flexShrink: 0,
                }}
              />
              {/* name + role */}
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    fontSize: 9.5,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    color: '#efe9dc',
                    textTransform: 'uppercase',
                    lineHeight: 1.1,
                  }}
                >
                  {s.name.slice(0, 4)}
                </div>
                <div
                  style={{
                    fontSize: 7.5,
                    color: s.color,
                    fontWeight: 600,
                    letterSpacing: '0.06em',
                    marginTop: 1,
                  }}
                >
                  {arrow} {roleLabel}
                </div>
              </div>
              {/* lift value */}
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 600,
                  color: 'rgba(239,233,220,0.65)',
                  fontVariantNumeric: 'tabular-nums',
                  textAlign: 'right',
                  flexShrink: 0,
                }}
              >
                +{s.lift.toFixed(1)}u
              </div>
            </div>
          );
        })}
        {/* ground marker */}
        <div
          style={{
            padding: '3px 8px 4px',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span
            style={{
              display: 'inline-block',
              width: 7,
              height: 7,
              borderRadius: 2,
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.3)',
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: 8,
              color: 'rgba(239,233,220,0.4)',
              fontStyle: 'italic',
              flex: 1,
            }}
          >
            ground
          </span>
          <span
            style={{
              fontSize: 9,
              color: 'rgba(239,233,220,0.4)',
              fontWeight: 600,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            0.0u
          </span>
        </div>
      </div>

      {/* ── Part 2: SVG-projected overlay ───────────────────────────────
          Draws a tick + label at each stratum's actual 3D-projected
          position so the HTML ruler ties to the scene. Lighter weight than
          the HTML overlay — just enough to anchor the stratum levels to
          their actual positions in 3D space. */}
      <svg
        ref={svgRef}
        className="plat-elevation-ruler"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          overflow: 'visible',
          zIndex: 28,
        }}
      >
        {/* Centering wrapper — see Cables.tsx for the offset explanation. */}
        <g transform={`translate(${svgSize.w / 2}, ${svgSize.h / 2})`}>
        {/* vertical axis line — from foundation to surface. Solid + thin
            so it reads as a measurement axis without dominating the scene. */}
        <line
          x1={axisX}
          y1={topY}
          x2={axisX}
          y2={baseY}
          stroke="#1c1a17"
          strokeOpacity={0.35}
          strokeWidth={1}
          strokeDasharray="2 3"
        />
        {ticks.map((t, i) => {
          const labelOpacity = t.isDim ? 0.4 : 1;
          return (
            <g
              key={t.id}
              style={{ opacity: labelOpacity, transition: 'opacity 380ms ease' }}
            >
              {/* tick line — short stub extending inward from the axis */}
              <line
                x1={t.at.x}
                y1={t.at.y}
                x2={t.at.x - 12}
                y2={t.at.y}
                stroke={t.color}
                strokeWidth={t.isFocus ? 2.5 : 1.5}
                strokeOpacity={0.85}
              />
              {/* tick dot at axis */}
              <circle cx={t.at.x} cy={t.at.y} r={t.isFocus ? 4 : 3} fill={t.color} fillOpacity={0.95} stroke="#1c1a17" strokeWidth={0.5} />
              {/* elevation value — small, to the right of the axis (between
                  axis and the board edge) */}
              <text
                x={t.at.x + 6}
                y={t.at.y + 3}
                textAnchor="start"
                fontFamily="var(--font-geist-mono), monospace"
                fontSize={8.5}
                fontWeight={600}
                fill="#1c1a17"
                opacity={0.5}
              >
                +{t.lift.toFixed(1)}u
              </text>
            </g>
          );
        })}
        {/* ground tick */}
        <circle cx={axisX} cy={baseY} r={2.5} fill="#1c1a17" fillOpacity={0.6} />
        </g>
      </svg>
    </>
  );
}

