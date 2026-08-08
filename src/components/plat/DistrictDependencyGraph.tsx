'use client';

// DistrictDependencyGraph — a compact floating panel that shows which
// districts depend on which, derived from the cable links. Each district
// is a vertical bar sized by its file count; cables between districts are
// drawn as curved bezier lines colored by the dominant link kind.
//
// This is the "bird's-eye wiring map" — when the full 3D cable set is too
// dense to read, this panel gives you the high-level dependency graph in
// 2D. Clicking a district bar highlights its connections.
//
// The graph auto-derives district ordering by stratum (surface on top,
// foundation on bottom) so the dependency direction (who calls what)
// reads top-to-bottom, mirroring the sectioned city.

import { useMemo, useState } from 'react';
import { usePlat } from '@/lib/plat/store';
import { stratumOf, STRATA, District } from '@/lib/plat/types';
import { KIND_COLOR_BY_KIND } from '@/lib/plat/cable-colors';
import { INK } from '@/lib/plat/color';

interface Props {
  open: boolean;
  onClose: () => void;
}

interface DistrictEdge {
  from: string; // district id
  to: string; // district id
  count: number;
  dominantKind: keyof typeof KIND_COLOR_BY_KIND;
}

export function DistrictDependencyGraph({ open, onClose }: Props) {
  const tower = usePlat((s) => s.tower);
  const links = usePlat((s) => s.links);
  // Both of these used to select `s.focusDistrict`, which is the ACTION.
  // The value lives on the view. So `focusDistrict` was a function, every
  // comparison against a district id was false, and the highlight set in
  // this graph could never populate from a focused district.
  const focusDistrict = usePlat((s) => s.view.focusDistrict);
  const setFocusDistrict = usePlat((s) => s.focusDistrict);
  const [hovered, setHovered] = useState<string | null>(null);

  // Order districts by stratum depth (surface first → foundation last)
  // so the dependency direction reads top-to-bottom.
  const orderedDistricts = useMemo(() => {
    const stratumOrder: Record<string, number> = { surface: 0, wiring: 1, foundation: 2 };
    return [...tower.districts].sort((a, b) => {
      const sa = stratumOrder[stratumOf(a.id).id] ?? 1;
      const sb = stratumOrder[stratumOf(b.id).id] ?? 1;
      if (sa !== sb) return sa - sb;
      return a.name.localeCompare(b.name);
    });
  }, [tower.districts]);

  // Build district-to-district edges by aggregating links.
  const edges = useMemo<DistrictEdge[]>(() => {
    const map = new Map<string, DistrictEdge>();
    const kindCounts = new Map<string, Map<string, number>>();
    for (const link of links) {
      const key = `${link.from.districtId}→${link.to.districtId}`;
      const existing = map.get(key);
      if (existing) {
        existing.count++;
        const kc = kindCounts.get(key)!;
        kc.set(link.kind, (kc.get(link.kind) ?? 0) + 1);
        // Pick dominant kind
        let best = link.kind;
        let bestN = 0;
        for (const [k, n] of kc) {
          if (n > bestN) { best = k as any; bestN = n; }
        }
        existing.dominantKind = best as any;
      } else {
        map.set(key, {
          from: link.from.districtId,
          to: link.to.districtId,
          count: 1,
          dominantKind: link.kind,
        });
        kindCounts.set(key, new Map([[link.kind, 1]]));
      }
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [links]);

  // Per-district file counts for sizing the bars
  const fileCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of tower.districts) {
      m.set(d.id, d.files.filter((f) => f.status !== 'removed').length);
    }
    return m;
  }, [tower.districts]);

  if (!open) return null;

  // Layout constants
  const W = 280;
  const H = 240;
  const padX = 28;
  const padTop = 24;
  const padBottom = 28;
  const rowH = (H - padTop - padBottom) / Math.max(1, orderedDistricts.length);
  // District id → vertical center
  const yOf = (id: string) => {
    const i = orderedDistricts.findIndex((d) => d.id === id);
    return padTop + i * rowH + rowH / 2;
  };

  // Highlight set — a district is highlighted if it's hovered, focused, or
  // connected to the hovered/focused district.
  const highlightId = hovered ?? focusDistrict ?? null;
  const connectedIds = new Set<string>();
  if (highlightId) {
    connectedIds.add(highlightId);
    for (const e of edges) {
      if (e.from === highlightId) connectedIds.add(e.to);
      if (e.to === highlightId) connectedIds.add(e.from);
    }
  }

  const maxFiles = Math.max(1, ...Array.from(fileCounts.values()));

  return (
    <div
      style={{
        position: 'absolute',
        // Was declaring bottom/left twice in one literal — the second pair
        // won silently. Collapsed to the values that were actually taking
        // effect, so the intent is visible in the source.
        top: 50,
        left: 12,
        zIndex: 26,
        width: W,
        background: 'rgba(28,26,23,0.95)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderRadius: 8,
        border: '1px solid rgba(255,255,255,0.15)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)',
        padding: '10px 12px 8px',
        fontFamily: 'var(--font-geist-mono), monospace',
        color: '#efe9dc',
        animation: 'plat-ctx-pop 160ms ease-out',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6,
      }}>
        <span style={{
          fontSize: 8.5,
          fontWeight: 700,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: 'rgba(239,233,220,0.55)',
        }}>
          dependency graph
        </span>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'rgba(239,233,220,0.4)',
            cursor: 'pointer',
            fontSize: 12,
            padding: 0,
            lineHeight: 1,
          }}
          title="close"
        >
          ✕
        </button>
      </div>

      {/* Subtitle */}
      <div style={{
        fontSize: 7.5,
        color: 'rgba(239,233,220,0.35)',
        marginBottom: 6,
        fontStyle: 'italic',
        letterSpacing: '0.04em',
      }}>
        district-to-district wiring · {edges.length} edges
      </div>

      {/* SVG graph */}
      <svg
        width={W - 24}
        height={H}
        style={{ display: 'block', overflow: 'visible' }}
      >
        {/* Stratum band backgrounds — subtle horizontal bands showing the
            three strata so the user can see which districts are surface vs
            foundation at a glance. */}
        {STRATA.map((s) => {
          const districtsInS = orderedDistricts.filter((d) => stratumOf(d.id).id === s.id);
          if (districtsInS.length === 0) return null;
          const firstIdx = orderedDistricts.findIndex((d) => d.id === districtsInS[0]!.id);
          const lastIdx = orderedDistricts.findIndex((d) => d.id === districtsInS[districtsInS.length - 1]!.id);
          const y0 = padTop + firstIdx * rowH - 2;
          const y1 = padTop + (lastIdx + 1) * rowH + 2;
          return (
            <g key={s.id}>
              <rect
                x={padX - 18}
                y={y0}
                width={W - 24 - padX + 18}
                height={y1 - y0}
                fill={s.color}
                fillOpacity={0.05}
                stroke={s.color}
                strokeOpacity={0.15}
                strokeWidth={0.5}
                strokeDasharray="2 2"
                rx={3}
              />
              <text
                x={padX - 16}
                y={y0 + 7}
                fill={s.color}
                fillOpacity={0.55}
                fontSize={6}
                fontWeight={700}
                letterSpacing="0.12em"
                fontFamily="var(--font-geist-mono), monospace"
              >
                {s.name.toUpperCase()}
              </text>
            </g>
          );
        })}

        {/* Edges — bezier curves from district bar to district bar */}
        {edges.map((e, i) => {
          const fromD = tower.districts.find((d) => d.id === e.from);
          const toD = tower.districts.find((d) => d.id === e.to);
          if (!fromD || !toD) return null;
          const y1 = yOf(e.from);
          const y2 = yOf(e.to);
          const x1 = padX + 6 + (fileCounts.get(e.from) ?? 1) / maxFiles * 50;
          const x2 = padX + 6 + (fileCounts.get(e.to) ?? 1) / maxFiles * 50;
          // Bezier control points — bow rightward, but stay within the panel
          const cx = Math.min(Math.max(x1, x2) + 24 + Math.abs(y1 - y2) * 0.25, W - 24 - padX - 4);
          const cy1 = y1;
          const cy2 = y2;
          const color = KIND_COLOR_BY_KIND[e.dominantKind];
          const isHL = highlightId === e.from || highlightId === e.to;
          const opacity = highlightId === null ? 0.5 : isHL ? 0.95 : 0.12;
          const width = 0.8 + Math.min(e.count, 8) * 0.5;
          return (
            <g key={`${e.from}-${e.to}-${i}`}>
              <path
                d={`M ${x1} ${y1} C ${cx} ${cy1}, ${cx} ${cy2}, ${x2} ${y2}`}
                fill="none"
                stroke={color}
                strokeWidth={isHL ? width * 1.6 : width}
                strokeOpacity={opacity}
                strokeLinecap="round"
                style={{ transition: 'stroke-opacity 200ms, stroke-width 200ms' }}
              />
              {/* Edge count label on highlighted edges */}
              {isHL && e.count > 1 && (
                <text
                  x={(x1 + x2 + cx * 2) / 4}
                  y={(y1 + y2) / 2}
                  fill={color}
                  fontSize={7}
                  fontWeight={700}
                  textAnchor="middle"
                  fontFamily="var(--font-geist-mono), monospace"
                  style={{ pointerEvents: 'none' }}
                >
                  {e.count}
                </text>
              )}
            </g>
          );
        })}

        {/* District bars — vertical position by stratum, width by file count */}
        {orderedDistricts.map((d) => {
          const y = yOf(d.id);
          const fc = fileCounts.get(d.id) ?? 0;
          const barW = 4 + (fc / maxFiles) * 50;
          const isHL = highlightId === d.id;
          const isConnected = connectedIds.has(d.id);
          const opacity = highlightId === null ? 1 : isConnected ? 1 : 0.3;
          const stratum = stratumOf(d.id);
          return (
            <g
              key={d.id}
              style={{ cursor: 'pointer', transition: 'opacity 200ms' }}
              opacity={opacity}
              onMouseEnter={() => setHovered(d.id)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => setFocusDistrict(focusDistrict === d.id ? null : d.id)}
            >
              {/* invisible hit area */}
              <rect
                x={padX - 14}
                y={y - rowH / 2 + 2}
                width={W - 24 - padX + 14}
                height={rowH - 4}
                fill="transparent"
              />
              {/* stratum color tick */}
              <rect
                x={padX - 14}
                y={y - 5}
                width={2}
                height={10}
                fill={stratum.color}
                rx={1}
              />
              {/* district bar */}
              <rect
                x={padX + 6}
                y={y - 4}
                width={barW}
                height={8}
                fill={d.color}
                fillOpacity={isHL ? 0.95 : 0.55}
                stroke={isHL ? d.color : `${d.color}66`}
                strokeWidth={isHL ? 1.5 : 0.5}
                rx={1.5}
                style={{ transition: 'fill-opacity 160ms, stroke-width 160ms' }}
              />
              {/* district label */}
              <text
                x={padX + 12 + barW}
                y={y + 2.5}
                fill={isHL ? '#efe9dc' : 'rgba(239,233,220,0.8)'}
                fontSize={8.5}
                fontWeight={isHL ? 700 : 500}
                fontFamily="var(--font-geist-mono), monospace"
                letterSpacing="0.03em"
                style={{ pointerEvents: 'none' }}
              >
                {d.name}
              </text>
              {/* file count badge */}
              <text
                x={padX + 12 + barW}
                y={y + 11}
                fill="rgba(239,233,220,0.4)"
                fontSize={6.5}
                fontFamily="var(--font-geist-mono), monospace"
                style={{ pointerEvents: 'none' }}
              >
                {fc}f
              </text>
            </g>
          );
        })}
      </svg>

      {/* Footer hint */}
      <div style={{
        marginTop: 2,
        fontSize: 7,
        color: 'rgba(239,233,220,0.3)',
        fontStyle: 'italic',
        textAlign: 'center',
        letterSpacing: '0.04em',
      }}>
        hover a district to trace · click to focus
      </div>
    </div>
  );
}
