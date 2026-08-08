'use client';

// CableFilterBar — a small floating popover that lets users toggle which
// cable kinds are visible in the city. An empty selection means "show all"
// (the default); a non-empty selection means "only show these kinds".
// Useful for large codebases where the full cable set is too noisy.
//
// The bar also shows a count of cables per kind, so users can see at a
// glance which kinds dominate their codebase's wiring graph.

import { usePlat } from '@/lib/plat/store';
import { LinkKind } from '@/lib/plat/types';
import { KIND_COLOR_BY_KIND, KIND_LABEL_BY_KIND } from '@/lib/plat/cable-colors';
import { useMemo } from 'react';

const ALL_KINDS: LinkKind[] = ['stem', 'kin', 'mark', 'mention'];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CableFilterBar({ open, onClose }: Props) {
  const links = usePlat((s) => s.links);
  const cableKinds = usePlat((s) => s.view.cableKinds);
  const toggleCableKind = usePlat((s) => s.toggleCableKind);
  const setCableKinds = usePlat((s) => s.setCableKinds);

  // Count cables per kind for the inline stat
  const counts = useMemo(() => {
    const m: Record<string, number> = { stem: 0, kin: 0, mark: 0, mention: 0 };
    for (const l of links) m[l.kind] = (m[l.kind] ?? 0) + 1;
    return m;
  }, [links]);

  if (!open) return null;

  const total = links.length;
  const visible = cableKinds.size === 0
    ? total
    : links.filter((l) => cableKinds.has(l.kind)).length;

  return (
    <div
      style={{
        position: 'absolute',
        top: 50,
        right: 12,
        zIndex: 35,
        width: 230,
        background: 'rgba(28,26,23,0.95)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderRadius: 8,
        border: '1px solid rgba(255,255,255,0.15)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)',
        padding: '10px 12px',
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
        marginBottom: 8,
      }}>
        <span style={{
          fontSize: 8.5,
          fontWeight: 700,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: 'rgba(239,233,220,0.55)',
        }}>
          cable filter
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
          title="close [F]"
        >
          ✕
        </button>
      </div>

      {/* Summary line */}
      <div style={{
        fontSize: 9,
        color: 'rgba(239,233,220,0.4)',
        marginBottom: 8,
        paddingBottom: 6,
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        justifyContent: 'space-between',
      }}>
        <span>showing</span>
        <span style={{ color: 'rgba(239,233,220,0.7)', fontVariantNumeric: 'tabular-nums' }}>
          {visible} / {total} cables
        </span>
      </div>

      {/* Kind toggles */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}>
        {ALL_KINDS.map((k) => {
          const color = KIND_COLOR_BY_KIND[k];
          const label = KIND_LABEL_BY_KIND[k];
          const count = counts[k] ?? 0;
          // When the filter set is empty, ALL kinds are "active" (shown).
          // When non-empty, only kinds in the set are active.
          const active = cableKinds.size === 0 || cableKinds.has(k);
          return (
            <button
              key={k}
              onClick={() => toggleCableKind(k)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '5px 7px',
                borderRadius: 4,
                background: active ? `${color}18` : 'rgba(255,255,255,0.03)',
                border: `1px solid ${active ? `${color}55` : 'rgba(255,255,255,0.08)'}`,
                cursor: 'pointer',
                transition: 'all 160ms ease',
                textAlign: 'left',
                fontFamily: 'inherit',
                color: 'inherit',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = active ? `${color}28` : 'rgba(255,255,255,0.06)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = active ? `${color}18` : 'rgba(255,255,255,0.03)';
              }}
            >
              {/* Color swatch — a thin cable-like line */}
              <span style={{
                display: 'inline-block',
                width: 22,
                height: 2,
                borderRadius: 1,
                background: active ? color : 'rgba(255,255,255,0.15)',
                boxShadow: active ? `0 0 6px ${color}88` : 'none',
                flexShrink: 0,
                transition: 'all 160ms ease',
              }} />
              {/* Label */}
              <span style={{
                fontSize: 9.5,
                fontWeight: active ? 600 : 400,
                color: active ? '#efe9dc' : 'rgba(239,233,220,0.45)',
                flex: 1,
                letterSpacing: '0.02em',
              }}>
                {label}
              </span>
              {/* Count */}
              <span style={{
                fontSize: 9,
                color: active ? `${color}cc` : 'rgba(239,233,220,0.3)',
                fontVariantNumeric: 'tabular-nums',
                minWidth: 22,
                textAlign: 'right',
              }}>
                {count}
              </span>
              {/* Checkbox-style indicator */}
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 12,
                height: 12,
                borderRadius: 2,
                background: active ? color : 'transparent',
                border: `1px solid ${active ? color : 'rgba(255,255,255,0.2)'}`,
                color: '#1c1a17',
                fontSize: 8,
                fontWeight: 900,
                flexShrink: 0,
                boxShadow: active ? `0 0 4px ${color}66` : 'none',
              }}>
                {active ? '✓' : ''}
              </span>
            </button>
          );
        })}
      </div>

      {/* Reset button */}
      <div style={{
        marginTop: 8,
        paddingTop: 6,
        borderTop: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        gap: 4,
      }}>
        <button
          onClick={() => setCableKinds([])}
          style={{
            flex: 1,
            padding: '4px 6px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 3,
            color: 'rgba(239,233,220,0.6)',
            fontSize: 8.5,
            fontWeight: 600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'all 120ms ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
            e.currentTarget.style.color = 'rgba(239,233,220,0.85)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
            e.currentTarget.style.color = 'rgba(239,233,220,0.6)';
          }}
        >
          show all
        </button>
        <button
          onClick={() => setCableKinds(['stem'])}
          style={{
            flex: 1,
            padding: '4px 6px',
            background: 'rgba(106,160,216,0.1)',
            border: '1px solid rgba(106,160,216,0.3)',
            borderRadius: 3,
            color: 'rgba(188,214,240,0.7)',
            fontSize: 8.5,
            fontWeight: 600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'all 120ms ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(106,160,216,0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(106,160,216,0.1)';
          }}
          title="only shared-name cables (the strongest signal)"
        >
          only stems
        </button>
      </div>

      {/* Hint */}
      <div style={{
        marginTop: 6,
        fontSize: 7.5,
        color: 'rgba(239,233,220,0.3)',
        fontStyle: 'italic',
        textAlign: 'center',
        letterSpacing: '0.04em',
      }}>
        empty selection = show all · click to toggle
      </div>
    </div>
  );
}
