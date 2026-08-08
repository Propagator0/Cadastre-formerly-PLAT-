'use client';

import { usePlat, districtProgress } from '@/lib/plat/store';
import { STRATA, stratumOf, Status, LinkKind } from '@/lib/plat/types';
import { BOARD, UNIT } from '@/lib/plat/iso';
import { PAPER, PAPER_DARK, INK } from '@/lib/plat/color';
import { KIND_COLOR_BY_KIND } from '@/lib/plat/cable-colors';
import { useCallback, useMemo } from 'react';

const STATUS_DOT: Record<Status, string> = {
  planned: '#9a9a9a',
  in_progress: '#e8a93a',
  done: '#5a8a5e',
  stuck: '#d63b2f',
  abandoned: '#7a7a7a',
  removed: '#444',
};

// Stratum zone colors — from STRATA definitions
const STRATUM_ZONE_COLORS: Record<string, string> = {
  surface: STRATA[0].color,   // #c96442
  wiring: STRATA[1].color,    // #6aa0d8
  foundation: STRATA[2].color, // #7a8a72
};

// Stratum short labels
const STRATUM_LABELS: Record<string, string> = {
  surface: 'S',
  wiring: 'W',
  foundation: 'F',
};

// The mini-map is a top-down (plan) view of the city in the corner of the
// canvas. It shows district footprints at their anchor positions, with a
// colored health arc, cable connections, section mode zones, and a camera
// direction indicator.
//
// Click on the mini-map to orbit the camera to a specific yaw (pan around the
// city quickly without dragging the main canvas).
export function MiniMap() {
  const tower = usePlat((s) => s.tower);
  const view = usePlat((s) => s.view);
  const selected = usePlat((s) => s.selected);
  const hovered = usePlat((s) => s.hovered);
  const links = usePlat((s) => s.links);
  const selectCube = usePlat((s) => s.selectCube);
  const setCamera = usePlat((s) => s.setCamera);

  // Mini-map dimensions (CSS pixels in the overlay).
  const W = 168;
  const H = 168;
  // World-to-minimap scale. We want to fit [-BOARD, BOARD] into [0, W].
  const scale = W / (BOARD * 2);

  // Convert a world (x, z) to minimap (x, y) — top-down, no iso projection.
  const worldToMap = useCallback(
    (x: number, z: number): { x: number; y: number } => ({
      x: W / 2 + x * scale * UNIT,
      y: H / 2 + z * scale * UNIT,
    }),
    [scale],
  );

  // Build a map from districtId to minimap position for cable drawing.
  const districtPositions = useMemo(() => {
    const m = new Map<string, { x: number; y: number; color: string; stratum: string }>();
    for (const d of tower.districts) {
      const { x, y } = worldToMap(d.anchor.x, d.anchor.z);
      const stratum = stratumOf(d.id).id;
      m.set(d.id, { x, y, color: d.color, stratum });
    }
    return m;
  }, [tower.districts, worldToMap]);

  // Group links by (fromDistrict, toDistrict) pair to avoid drawing
  // many overlapping lines for the same pair. Keep the strongest link
  // per pair so we use its kind for coloring.
  const cablePairs = useMemo(() => {
    if (!view.showCables) return [];
    const pairMap = new Map<string, { from: string; to: string; kind: LinkKind; strength: number }>();
    for (const link of links) {
      const key = `${link.from.districtId}->${link.to.districtId}`;
      const existing = pairMap.get(key);
      if (!existing || link.strength > existing.strength) {
        pairMap.set(key, {
          from: link.from.districtId,
          to: link.to.districtId,
          kind: link.kind,
          strength: link.strength,
        });
      }
    }
    return Array.from(pairMap.values());
  }, [links, view.showCables]);

  // Determine which district pairs are "highlighted" — i.e., the selected
  // or hovered cube's cables should be drawn more prominently.
  const highlightedPairKeys = useMemo(() => {
    const keys = new Set<string>();
    const ref = selected ?? hovered;
    if (!ref) return keys;
    // Find all links that touch the selected/hovered cube
    for (const link of links) {
      const touches =
        (link.from.districtId === ref.districtId && link.from.path === ref.path) ||
        (link.to.districtId === ref.districtId && link.to.path === ref.path);
      if (touches) {
        keys.add(`${link.from.districtId}->${link.to.districtId}`);
      }
    }
    return keys;
  }, [links, selected, hovered]);

  // Click on the mini-map: orbit the camera to look at that point.
  const onMapClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const dx = px - W / 2;
      const dy = py - H / 2;
      if (Math.abs(dx) < 3 && Math.abs(dy) < 3) return;
      const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      const newYaw = -angle - 90;
      setCamera({ yaw: ((newYaw % 360) + 360) % 360 });
    },
    [setCamera],
  );

  const isSeparated = view.separated;

  return (
    <div
      className="pointer-events-auto select-none"
      style={{
        position: 'absolute',
        top: 12,
        right: 12,
        zIndex: 25,
        width: W + 16,
        height: H + 42,
        background: 'rgba(28,26,23,0.94)',
        backdropFilter: 'blur(8px)',
        borderRadius: 8,
        border: '1px solid rgba(255,255,255,0.14)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)',
      }}
    >
      {/* header */}
      <div className="flex items-center justify-between px-2 pt-1.5 pb-1 border-b border-white/8">
        <span
          className="font-mono text-[8.5px] uppercase tracking-[0.16em] text-white/45"
          style={{ fontFamily: 'var(--font-geist-mono), monospace' }}
        >
          plan · {Math.round(view.yaw)}° / {Math.round(view.pitch)}°
        </span>
        <span className="font-mono text-[8px] text-white/25">click to orbit</span>
      </div>
      {/* map body */}
      <div
        onClick={onMapClick}
        style={{
          position: 'relative',
          width: W,
          height: H,
          marginLeft: 7,
          marginTop: 4,
          cursor: 'crosshair',
          background: `${PAPER}`,
          backgroundImage: `
            linear-gradient(90deg, ${PAPER_DARK}80 1px, transparent 1px),
            linear-gradient(0deg, ${PAPER_DARK}80 1px, transparent 1px)
          `,
          backgroundSize: `${scale * UNIT * 2}px ${scale * UNIT * 2}px`,
          border: `1px solid ${INK}33`,
          overflow: 'hidden',
        }}
      >
        {/* crosshair at the center */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: 1,
            height: 9,
            marginLeft: -0.5,
            marginTop: -4.5,
            background: `${INK}55`,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: 9,
            height: 1,
            marginLeft: -4.5,
            marginTop: -0.5,
            background: `${INK}55`,
          }}
        />

        {/* board edge marker */}
        <div
          style={{
            position: 'absolute',
            inset: 4,
            border: `1px dashed ${INK}22`,
            pointerEvents: 'none',
          }}
        />

        {/* ---- Section mode stratum zone backgrounds ---- */}
        {isSeparated && (
          <>
            {/* Surface zone — top third */}
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: W,
                height: H / 3,
                background: STRATUM_ZONE_COLORS.surface,
                opacity: 0.08,
                pointerEvents: 'none',
              }}
            />
            {/* Wiring zone — middle third */}
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: H / 3,
                width: W,
                height: H / 3,
                background: STRATUM_ZONE_COLORS.wiring,
                opacity: 0.08,
                pointerEvents: 'none',
              }}
            />
            {/* Foundation zone — bottom third */}
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: (H / 3) * 2,
                width: W,
                height: H / 3,
                background: STRATUM_ZONE_COLORS.foundation,
                opacity: 0.08,
                pointerEvents: 'none',
              }}
            />
            {/* Boundary lines */}
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: H / 3,
                width: W,
                height: 0,
                borderTop: `1px solid ${INK}18`,
                pointerEvents: 'none',
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: (H / 3) * 2,
                width: W,
                height: 0,
                borderTop: `1px solid ${INK}18`,
                pointerEvents: 'none',
              }}
            />
            {/* Stratum labels on left edge */}
            <span
              style={{
                position: 'absolute',
                left: 3,
                top: H / 6 - 4,
                fontFamily: 'var(--font-geist-mono), monospace',
                fontSize: 7,
                fontWeight: 700,
                color: STRATUM_ZONE_COLORS.surface,
                opacity: 0.5,
                pointerEvents: 'none',
              }}
            >
              {STRATUM_LABELS.surface}
            </span>
            <span
              style={{
                position: 'absolute',
                left: 3,
                top: H / 2 - 4,
                fontFamily: 'var(--font-geist-mono), monospace',
                fontSize: 7,
                fontWeight: 700,
                color: STRATUM_ZONE_COLORS.wiring,
                opacity: 0.5,
                pointerEvents: 'none',
              }}
            >
              {STRATUM_LABELS.wiring}
            </span>
            <span
              style={{
                position: 'absolute',
                left: 3,
                top: (H / 6) * 5 - 4,
                fontFamily: 'var(--font-geist-mono), monospace',
                fontSize: 7,
                fontWeight: 700,
                color: STRATUM_ZONE_COLORS.foundation,
                opacity: 0.5,
                pointerEvents: 'none',
              }}
            >
              {STRATUM_LABELS.foundation}
            </span>
          </>
        )}

        {/* ---- Cable connections SVG layer ---- */}
        {view.showCables && cablePairs.length > 0 && (
          <svg
            width={W}
            height={H}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              pointerEvents: 'none',
              overflow: 'visible',
            }}
          >
            {cablePairs.map((pair) => {
              const fromPos = districtPositions.get(pair.from);
              const toPos = districtPositions.get(pair.to);
              if (!fromPos || !toPos) return null;
              const isHighlighted = highlightedPairKeys.has(`${pair.from}->${pair.to}`);
              const color = KIND_COLOR_BY_KIND[pair.kind];
              return (
                <line
                  key={`${pair.from}->${pair.to}`}
                  x1={fromPos.x}
                  y1={fromPos.y}
                  x2={toPos.x}
                  y2={toPos.y}
                  stroke={color}
                  strokeWidth={isHighlighted ? 1 : 0.5}
                  strokeOpacity={isHighlighted ? 0.7 : 0.25}
                  strokeDasharray={isHighlighted ? '3 2' : '2 3'}
                />
              );
            })}
          </svg>
        )}

        {/* districts */}
        {tower.districts.map((d) => {
          const { x, y } = worldToMap(d.anchor.x, d.anchor.z);
          const { built, total } = districtProgress(d);
          const pct = total ? built / total : 0;
          const isSel = selected?.districtId === d.id;
          const isHov = hovered?.districtId === d.id;
          // Health ring radius
          const R = 8;
          const C = 2 * Math.PI * R;
          return (
            <div
              key={d.id}
              style={{
                position: 'absolute',
                left: x,
                top: y,
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'auto',
                cursor: 'pointer',
              }}
              onClick={(e) => {
                e.stopPropagation();
                // select the first non-removed file in the district
                const f = d.files.find((f) => f.status !== 'removed');
                if (f) selectCube({ districtId: d.id, path: f.path });
              }}
              title={`${d.name} · ${d.tag} · ${built}/${total}`}
            >
              {/* dot */}
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: d.color,
                  border: `1px solid ${isSel ? '#fff' : `${d.color}`}`,
                  boxShadow: isSel
                    ? `0 0 0 2px #fff, 0 0 12px ${d.color}, 0 0 24px ${d.color}66`
                    : isHov
                      ? `0 0 0 1.5px ${d.color}88, 0 0 8px ${d.color}66`
                      : `0 0 4px ${d.color}88`,
                  animation: isSel ? 'minimap-pulse 1.6s ease-in-out infinite' : 'none',
                }}
              />
              {/* health ring (SVG) — only show when district has progress */}
              {pct > 0 && (
                <svg
                  width={R * 2 + 4}
                  height={R * 2 + 4}
                  style={{
                    position: 'absolute',
                    left: -(R + 2),
                    top: -(R + 2),
                    pointerEvents: 'none',
                  }}
                >
                  <circle
                    cx={R + 2}
                    cy={R + 2}
                    r={R}
                    fill="none"
                    stroke={`${INK}22`}
                    strokeWidth={1.5}
                  />
                  <circle
                    cx={R + 2}
                    cy={R + 2}
                    r={R}
                    fill="none"
                    stroke={d.color}
                    strokeWidth={1.5}
                    strokeDasharray={`${C * pct} ${C}`}
                    strokeLinecap="round"
                    transform={`rotate(-90 ${R + 2} ${R + 2})`}
                  />
                </svg>
              )}
              {/* Hovered district ring highlight */}
              {isHov && !isSel && (
                <svg
                  width={R * 2 + 8}
                  height={R * 2 + 8}
                  style={{
                    position: 'absolute',
                    left: -(R + 4),
                    top: -(R + 4),
                    pointerEvents: 'none',
                  }}
                >
                  <circle
                    cx={R + 4}
                    cy={R + 4}
                    r={R + 2}
                    fill="none"
                    stroke={d.color}
                    strokeWidth={1}
                    strokeOpacity={0.5}
                    strokeDasharray="2 2"
                  />
                </svg>
              )}
              {/* label */}
              <span
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: R + 6,
                  transform: 'translateX(-50%)',
                  fontFamily: 'var(--font-geist-mono), monospace',
                  fontSize: isSel ? 8 : 7,
                  color: d.color,
                  opacity: isSel ? 1 : 0.7,
                  pointerEvents: 'none',
                  whiteSpace: 'nowrap',
                  fontWeight: isSel ? 700 : 600,
                  letterSpacing: isSel ? '0.04em' : '0em',
                }}
              >
                {d.name.slice(0, 3)}
              </span>
            </div>
          );
        })}

        {/* camera direction indicator — a triangle pointing the direction
            the user is currently looking at in the main 3D viewport. */}
        <CameraIndicator yaw={view.yaw} />

        {/* Pulse animation keyframes — injected once */}
        <style>{`
          @keyframes minimap-pulse {
            0%, 100% { box-shadow: 0 0 0 2px #fff, 0 0 12px currentColor, 0 0 24px currentColor; }
            50% { box-shadow: 0 0 0 3px #fff, 0 0 18px currentColor, 0 0 36px currentColor; }
          }
        `}</style>
      </div>
    </div>
  );
}

// The camera indicator: a small arrow at the centre of the mini-map that
// rotates with the yaw, showing which way the user is looking.
function CameraIndicator({ yaw }: { yaw: number }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: 0,
        height: 0,
        transform: `translate(-50%, -50%) rotate(${yaw}deg)`,
        pointerEvents: 'none',
      }}
    >
      {/* a fan-shape showing the field of view */}
      <div
        style={{
          position: 'absolute',
          left: -10,
          top: -28,
          width: 20,
          height: 28,
          background:
            'conic-gradient(from 270deg at 50% 100%, rgba(106,160,216,0.45) 0deg, transparent 60deg, transparent 300deg, rgba(106,160,216,0.45) 360deg)',
          clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
          opacity: 0.7,
        }}
      />
      {/* arrow tip */}
      <div
        style={{
          position: 'absolute',
          left: -3,
          top: -16,
          width: 6,
          height: 6,
          background: '#6aa0d8',
          border: '1px solid #fff',
          borderRadius: '50%',
          boxShadow: '0 0 4px #6aa0d8',
        }}
      />
    </div>
  );
}
