'use client';

import { Tower } from '@/lib/plat/types';
import { Link } from '@/lib/plat/types';
import { stratumOf } from '@/lib/plat/types';
import { districtById } from '@/lib/plat/wiring';
import { KIND_COLOR_BY_KIND, KIND_LABEL_BY_KIND } from '@/lib/plat/cable-colors';

interface CableTooltipProps {
  tower: Tower;
  link: Link | null;
  mouseX: number;
  mouseY: number;
}

// A floating panel that appears next to the cursor when hovering a cable.
// Shows the from→to file paths, the kind (stem/mark/mention), the human
// reason, and a strength meter — so the cable stops being decoration and
// becomes an inspectable dependency.
export function CableTooltip({ tower, link, mouseX, mouseY }: CableTooltipProps) {
  if (!link) return null;

  const fromDistrict = districtById(tower, link.from.districtId);
  const toDistrict = districtById(tower, link.to.districtId);
  if (!fromDistrict || !toDistrict) return null;

  const fromStratum = stratumOf(link.from.districtId);
  const toStratum = stratumOf(link.to.districtId);
  const color = KIND_COLOR_BY_KIND[link.kind];
  const kindLabel = KIND_LABEL_BY_KIND[link.kind];

  // Tooltip placement — flip horizontally if too close to right edge so it
  // never gets clipped. Vertically, bias above the cursor; fall back below.
  const OFFSET_X = 16;
  const OFFSET_Y = 14;
  const TOOLTIP_W = 268;
  const TOOLTIP_H = 132;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1440;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 900;
  const flipX = mouseX + OFFSET_X + TOOLTIP_W > vw - 12;
  const flipY = mouseY - OFFSET_Y - TOOLTIP_H < 12;
  const left = flipX ? mouseX - TOOLTIP_W - OFFSET_X : mouseX + OFFSET_X;
  const top = flipY ? mouseY + OFFSET_Y : mouseY - TOOLTIP_H - OFFSET_Y;

  // Strength meter: 5 dots, filled by Math.round(strength * 5)
  const filled = Math.max(1, Math.round(link.strength * 5));

  return (
    <div
      className="plat-cable-tooltip"
      style={{
        position: 'fixed',
        left,
        top,
        width: TOOLTIP_W,
        zIndex: 60,
        pointerEvents: 'none',
        background: '#1c1a17',
        border: `1px solid ${color}66`,
        borderLeft: `3px solid ${color}`,
        borderRadius: 4,
        boxShadow: `0 8px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04), 0 0 16px ${color}22`,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        padding: '8px 10px',
        fontFamily: 'var(--font-geist-mono), monospace',
        color: '#efe9dc',
        animation: 'plat-ctx-pop 120ms ease-out',
      }}
    >
      {/* header — kind label + strength meter */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginBottom: 6,
        }}
      >
        <span
          style={{
            display: 'inline-block',
            width: 8,
            height: 8,
            borderRadius: 2,
            background: color,
            boxShadow: `0 0 6px ${color}88`,
          }}
        />
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color,
          }}
        >
          {kindLabel}
        </span>
        <span
          style={{
            marginLeft: 'auto',
            display: 'inline-flex',
            gap: 2,
          }}
          title={`strength ${link.strength.toFixed(2)}`}
        >
          {Array.from({ length: 5 }, (_, i) => (
            <span
              key={i}
              style={{
                display: 'inline-block',
                width: 4,
                height: 8,
                borderRadius: 1,
                background: i < filled ? color : '#ffffff14',
                boxShadow: i < filled ? `0 0 4px ${color}88` : 'none',
              }}
            />
          ))}
        </span>
      </div>

      {/* from row */}
      <PathRow
        label="from"
        path={link.from.path}
        districtName={fromDistrict.name}
        stratumName={fromStratum.name}
        stratumColor={fromStratum.color}
      />

      {/* connector arrow */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          margin: '4px 0 4px 28px',
          fontSize: 9,
          color: '#ffffff45',
          letterSpacing: '0.1em',
        }}
      >
        <span style={{ flex: 1, height: 1, background: `${color}33` }} />
        <span style={{ color, fontWeight: 700 }}>↓</span>
        <span style={{ flex: 1, height: 1, background: `${color}33` }} />
      </div>

      {/* to row */}
      <PathRow
        label="to"
        path={link.to.path}
        districtName={toDistrict.name}
        stratumName={toStratum.name}
        stratumColor={toStratum.color}
      />

      {/* reason */}
      <div
        style={{
          marginTop: 7,
          paddingTop: 6,
          borderTop: `1px solid ${color}22`,
          fontSize: 9.5,
          fontStyle: 'italic',
          color: '#ffffff65',
          lineHeight: 1.35,
        }}
      >
        <span style={{ color, fontWeight: 600, fontStyle: 'normal' }}>why </span>
        {link.reason}
      </div>
    </div>
  );
}

function PathRow({
  label,
  path,
  districtName,
  stratumName,
  stratumColor,
}: {
  label: string;
  path: string;
  districtName: string;
  stratumName: string;
  stratumColor: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
      <span
        style={{
          fontSize: 8,
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: '#ffffff35',
          width: 24,
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontSize: 10.5,
            fontWeight: 600,
            color: '#ffffffcc',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {path}
        </div>
        <div style={{ fontSize: 8.5, color: '#ffffff45', marginTop: 1 }}>
          <span
            style={{
              display: 'inline-block',
              width: 5,
              height: 5,
              borderRadius: 1,
              background: stratumColor,
              marginRight: 4,
              verticalAlign: 'middle',
            }}
          />
          {districtName} · {stratumName}
        </div>
      </div>
    </div>
  );
}
