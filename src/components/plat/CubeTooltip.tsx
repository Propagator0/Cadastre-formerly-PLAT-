'use client';

import { useSyncExternalStore } from 'react';
import { Tower, CubeRef } from '@/lib/plat/types';
import { STATUS_LABEL, STATUS_GLYPH, Status, stratumOf } from '@/lib/plat/types';
import { cubeOf } from '@/lib/plat/store';
import { linksForCube, Link } from '@/lib/plat/wiring';

// Status dot color — matches the header/footer legend
const STATUS_DOT: Record<Status, string> = {
  planned: '#9a9a9a',
  in_progress: '#e8a93a',
  done: '#5a8a5e',
  stuck: '#d63b2f',
  abandoned: '#7a7a7a',
  removed: '#444',
};

interface CubeTooltipProps {
  tower: Tower;
  hovered: CubeRef | null;
  /** mouse position in viewport coordinates */
  mouseX: number;
  mouseY: number;
  /** cables (optional) — when provided, the tooltip shows a wire-count
   *  badge so a user hovering a cube immediately knows how many other
   *  files it's wired to. */
  links?: Link[];
}

export function CubeTooltip({ tower, hovered, mouseX, mouseY, links }: CubeTooltipProps) {
  // Check for fine pointer (mouse) — hide on coarse (touch) devices
  const hasFinePointer = useSyncExternalStore(
    (callback) => {
      const mql = window.matchMedia('(pointer: fine)');
      mql.addEventListener('change', callback);
      return () => mql.removeEventListener('change', callback);
    },
    () => window.matchMedia('(pointer: fine)').matches,
    () => true, // server snapshot: assume fine pointer
  );

  // Look up cube data
  const { district, cube } = hovered
    ? cubeOf(tower, hovered)
    : { district: undefined, cube: undefined };

  const visible = hasFinePointer && hovered != null && cube != null && district != null;

  // Position: offset to the right and below the cursor, clamped to viewport
  const OFFSET_X = 14;
  const OFFSET_Y = 14;
  const WIDTH = 180;
  // We don't know exact height but estimate ~120px max
  const EST_HEIGHT = 120;

  let left = mouseX + OFFSET_X;
  let top = mouseY + OFFSET_Y;
  // Clamp so it doesn't go off-screen right
  if (typeof window !== 'undefined' && left + WIDTH > window.innerWidth - 8) {
    left = mouseX - WIDTH - OFFSET_X;
  }
  // Clamp so it doesn't go off-screen bottom
  if (typeof window !== 'undefined' && top + EST_HEIGHT > window.innerHeight - 8) {
    top = mouseY - EST_HEIGHT - OFFSET_Y;
  }

  if (!cube || !district) {
    // Still render the container for the fade-out transition, but invisible
    return (
      <div
        style={{
          position: 'fixed',
          pointerEvents: 'none',
          zIndex: 60,
          opacity: 0,
          transform: 'translateY(4px)',
          transition: 'opacity 160ms ease, transform 160ms ease',
        }}
      />
    );
  }

  const stratum = stratumOf(district.id);
  const statusLabel = STATUS_LABEL[cube.status];
  const statusGlyph = STATUS_GLYPH[cube.status];
  const statusDot = STATUS_DOT[cube.status];

  // Compute wire count for this cube — surfaces a "wired to N" badge so the
  // user immediately knows this file has dependencies to inspect. Splits
  // the count into "up" (towards surface) and "down" (towards foundation)
  // so the badge also indicates the dependency direction.
  const cubeLinks = links && hovered
    ? linksForCube(links, hovered.districtId, hovered.path)
    : [];
  const wireCount = cubeLinks.length;
  const myDepth = stratum.id === 'surface' ? 0 : stratum.id === 'wiring' ? 1 : 2;
  let upCount = 0;
  let downCount = 0;
  for (const l of cubeLinks) {
    const otherDistrictId =
      l.from.districtId === hovered?.districtId && l.from.path === hovered?.path
        ? l.to.districtId
        : l.from.districtId;
    const otherStratum = stratumOf(otherDistrictId);
    const otherDepth = otherStratum.id === 'surface' ? 0 : otherStratum.id === 'wiring' ? 1 : 2;
    if (otherDepth < myDepth) upCount++;
    else if (otherDepth > myDepth) downCount++;
  }

  return (
    <div
      style={{
        position: 'fixed',
        left,
        top,
        pointerEvents: 'none',
        zIndex: 60,
        width: WIDTH,
        background: 'rgba(28,26,23,0.92)',
        backdropFilter: 'blur(6px)',
        borderRadius: 5,
        border: '1px solid rgba(255,255,255,0.12)',
        boxShadow: '0 6px 24px rgba(0,0,0,0.4)',
        padding: '8px 10px',
        fontFamily: 'var(--font-geist-mono), monospace',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(4px)',
        transition: 'opacity 160ms ease, transform 160ms ease',
      }}
    >
      {/* file path */}
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: '#efe9dc',
          letterSpacing: '0.02em',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          lineHeight: 1.3,
          marginBottom: 5,
        }}
        title={cube.path}
      >
        {cube.path}
      </div>

      {/* status row: dot + glyph + label */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          marginBottom: 5,
        }}
      >
        <span
          style={{
            display: 'inline-block',
            width: 7,
            height: 7,
            borderRadius: 2,
            background: statusDot,
            border: '1px solid rgba(255,255,255,0.2)',
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontSize: 10,
            color: 'rgba(239,233,220,0.7)',
            letterSpacing: '0.04em',
          }}
        >
          {statusGlyph && (
            <span style={{ marginRight: 3, opacity: 0.8 }}>{statusGlyph}</span>
          )}
          {statusLabel}
        </span>
      </div>

      {/* district name */}
      <div
        style={{
          fontSize: 9,
          color: district.color,
          fontWeight: 600,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          marginBottom: 4,
          opacity: 0.9,
        }}
      >
        {district.name}
      </div>

      {/* stratum: small colored bar + name */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          marginBottom: cube.status === 'in_progress' ? 6 : 0,
        }}
      >
        <span
          style={{
            display: 'inline-block',
            width: 14,
            height: 3,
            borderRadius: 1,
            background: stratum.color,
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontSize: 9,
            color: 'rgba(239,233,220,0.5)',
            letterSpacing: '0.04em',
            fontStyle: 'italic',
          }}
        >
          {stratum.name}
        </span>
      </div>

      {/* progress bar (only for in_progress) */}
      {cube.status === 'in_progress' && (
        <div
          style={{
            marginBottom: cube.marks.length > 0 ? 5 : 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <div
              style={{
                flex: 1,
                height: 3,
                borderRadius: 1,
                background: 'rgba(255,255,255,0.1)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${cube.progress}%`,
                  height: '100%',
                  borderRadius: 1,
                  background: STATUS_DOT.in_progress,
                  transition: 'width 200ms ease',
                }}
              />
            </div>
            <span
              style={{
                fontSize: 9,
                color: 'rgba(239,233,220,0.55)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {cube.progress}%
            </span>
          </div>
        </div>
      )}

      {/* marks */}
      {cube.marks.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            marginTop: 4,
          }}
        >
          {cube.marks.map((mark, i) => (
            <span
              key={i}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 14,
                height: 14,
                borderRadius: 2,
                fontSize: 9,
                fontWeight: 700,
                color: mark === '?' ? '#d63b2f' : mark === 'X' ? '#7a7a7a' : 'rgba(239,233,220,0.65)',
                background: mark === '?' ? 'rgba(214,59,47,0.15)' : mark === 'X' ? 'rgba(122,122,122,0.15)' : 'rgba(255,255,255,0.08)',
                border: `1px solid ${mark === '?' ? 'rgba(214,59,47,0.3)' : mark === 'X' ? 'rgba(122,122,122,0.3)' : 'rgba(255,255,255,0.1)'}`,
                lineHeight: 1,
              }}
            >
              {mark}
            </span>
          ))}
        </div>
      )}

      {/* wiring badge — shows the cable count + direction split (↑up / ↓down).
          Only rendered when links are passed in AND the cube has at least one
          wire. Hidden for unwired cubes to avoid clutter. */}
      {links && wireCount > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginTop: 6,
            paddingTop: 5,
            borderTop: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <svg width="11" height="11" viewBox="0 0 11 11" style={{ flexShrink: 0 }}>
            {/* a tiny cable-jack icon — two prongs */}
            <path d="M2 9 L2 5 M5.5 9 L5.5 2 M9 9 L9 5" stroke="#6aa0d8" strokeWidth="1.4" strokeLinecap="round" fill="none" />
            <circle cx="2" cy="5" r="1.2" fill="#6aa0d8" />
            <circle cx="5.5" cy="2" r="1.2" fill="#6aa0d8" />
            <circle cx="9" cy="5" r="1.2" fill="#6aa0d8" />
          </svg>
          <span
            style={{
              fontSize: 9,
              color: 'rgba(239,233,220,0.65)',
              letterSpacing: '0.04em',
            }}
          >
            wired to <span style={{ color: '#bcd6f0', fontWeight: 700 }}>{wireCount}</span>
          </span>
          {/* direction split — ↑up / ↓down arrows */}
          <span
            style={{
              marginLeft: 'auto',
              display: 'inline-flex',
              gap: 4,
              fontSize: 8.5,
            }}
          >
            {upCount > 0 && (
              <span
                style={{
                  color: '#c96442',
                  fontWeight: 600,
                  background: 'rgba(201,100,66,0.12)',
                  border: '0.5px solid rgba(201,100,66,0.3)',
                  borderRadius: 2,
                  padding: '0 4px',
                }}
                title={`${upCount} cable${upCount > 1 ? 's' : ''} going up (towards surface)`}
              >
                ↑{upCount}
              </span>
            )}
            {downCount > 0 && (
              <span
                style={{
                  color: '#7a8a72',
                  fontWeight: 600,
                  background: 'rgba(122,138,114,0.12)',
                  border: '0.5px solid rgba(122,138,114,0.3)',
                  borderRadius: 2,
                  padding: '0 4px',
                }}
                title={`${downCount} cable${downCount > 1 ? 's' : ''} going down (towards foundation)`}
              >
                ↓{downCount}
              </span>
            )}
          </span>
        </div>
      )}
    </div>
  );
}
