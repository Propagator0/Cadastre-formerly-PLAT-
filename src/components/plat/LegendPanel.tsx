'use client';

import { STRATA, Status, STATUS_LABEL, STATUS_GLYPH } from '@/lib/plat/types';
import { usePlat } from '@/lib/plat/store';

// Floating legend panel — shows stratum colors and status color meanings.
// Compact, translucent, positioned at the bottom-right above the minimap.

const STATUS_COLOR: Record<Status, string> = {
  planned: '#9a9a9a',
  in_progress: '#e8a93a',
  done: '#5a8a5e',
  stuck: '#d63b2f',
  abandoned: '#7a7a7a',
  removed: '#444',
};

const STATUS_ORDER: Status[] = ['done', 'in_progress', 'stuck', 'planned', 'abandoned'];

export function LegendPanel() {
  // (No view subscription: this panel is static chrome. It used to select the
  // whole `view` object and never read it, which re-rendered the entire legend
  // on every camera frame because `view` is a fresh object each time.)

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 12,
        right: 12,
        zIndex: 24,
        width: 176,
        background: 'rgba(28,26,23,0.91)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        borderRadius: 8,
        border: '1px solid rgba(255,255,255,0.12)',
        boxShadow: '0 6px 24px rgba(0,0,0,0.45), 0 2px 6px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.05)',
        padding: '8px 10px',
        fontFamily: 'var(--font-geist-mono), monospace',
        color: '#efe9dc',
        pointerEvents: 'auto',
      }}
    >
      {/* Header */}
      <div style={{
        fontSize: 8,
        fontWeight: 700,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        color: 'rgba(239,233,220,0.4)',
        marginBottom: 6,
        display: 'flex',
        alignItems: 'center',
        gap: 5,
      }}>
        <span style={{
          display: 'inline-block',
          width: 6,
          height: 6,
          borderRadius: 1,
          background: 'rgba(239,233,220,0.2)',
          border: '1px solid rgba(239,233,220,0.15)',
        }} />
        legend
      </div>

      {/* Strata section */}
      <div style={{
        marginBottom: 6,
        paddingBottom: 5,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{
          fontSize: 7,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'rgba(239,233,220,0.25)',
          marginBottom: 4,
        }}>
          strata
        </div>
        {STRATA.map(s => (
          <div
            key={s.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 2.5,
            }}
          >
            {/* Stratum color bar */}
            <span style={{
              display: 'inline-block',
              width: 18,
              height: 3,
              borderRadius: 1,
              background: s.color,
              boxShadow: `0 0 4px ${s.color}44`,
              flexShrink: 0,
            }} />
            {/* Name */}
            <span style={{
              fontSize: 8.5,
              fontWeight: 600,
              letterSpacing: '0.05em',
              color: s.color,
              opacity: 0.85,
              width: 52,
              flexShrink: 0,
            }}>
              {s.name}
            </span>
            {/* Role */}
            <span style={{
              fontSize: 7,
              letterSpacing: '0.04em',
              color: 'rgba(239,233,220,0.3)',
              fontStyle: 'italic',
            }}>
              {s.role}
            </span>
          </div>
        ))}
      </div>

      {/* Status section */}
      <div>
        <div style={{
          fontSize: 7,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'rgba(239,233,220,0.25)',
          marginBottom: 4,
        }}>
          status
        </div>
        {STATUS_ORDER.map(s => (
          <div
            key={s}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              marginBottom: 2,
            }}
          >
            {/* Status dot */}
            <span style={{
              display: 'inline-block',
              width: 7,
              height: 7,
              borderRadius: 2,
              background: STATUS_COLOR[s],
              border: '1px solid rgba(255,255,255,0.12)',
              flexShrink: 0,
              boxShadow: s === 'stuck' ? `0 0 4px ${STATUS_COLOR.stuck}66` : 'none',
            }} />
            {/* Label */}
            <span style={{
              fontSize: 8.5,
              color: 'rgba(239,233,220,0.55)',
              letterSpacing: '0.03em',
              width: 52,
              flexShrink: 0,
            }}>
              {STATUS_LABEL[s]}
            </span>
            {/* Glyph */}
            <span style={{
              fontSize: 9,
              color: STATUS_COLOR[s],
              opacity: 0.7,
              fontWeight: 700,
              width: 12,
              flexShrink: 0,
            }}>
              {STATUS_GLYPH[s] || '·'}
            </span>
            {/* Description hint */}
            <span style={{
              fontSize: 6.5,
              color: 'rgba(239,233,220,0.2)',
              fontStyle: 'italic',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {s === 'done' ? 'solid' : s === 'in_progress' ? 'translucent' : s === 'planned' ? 'ghost' : s === 'stuck' ? 'red glow' : 'faded'}
            </span>
          </div>
        ))}
      </div>

      {/* Keyboard shortcuts hint */}
      <div style={{
        marginTop: 5,
        paddingTop: 4,
        borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        flexWrap: 'wrap',
        gap: 3,
      }}>
        {[
          { key: 'E', label: 'section' },
          { key: 'C', label: 'cables' },
          { key: 'D', label: 'focus' },
          { key: 'B', label: 'a11y' },
          { key: '?', label: 'help' },
        ].map(s => (
          <span
            key={s.key}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 13,
              height: 13,
              borderRadius: 2,
              background: 'rgba(255,255,255,0.06)',
              border: '0.5px solid rgba(255,255,255,0.1)',
              fontSize: 7,
              fontWeight: 700,
              color: 'rgba(239,233,220,0.5)',
            }}>
              {s.key}
            </span>
            <span style={{
              fontSize: 6.5,
              color: 'rgba(239,233,220,0.25)',
            }}>
              {s.label}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
