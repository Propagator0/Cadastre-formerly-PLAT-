'use client';

import { usePlat, statusCounts } from '@/lib/plat/store';
import { STRATA, stratumOf, Status } from '@/lib/plat/types';
import { useMemo } from 'react';

// City Health Dashboard — a compact floating analytics widget that shows
// the overall city health at a glance: completion ring, risk index,
// in-progress count, and per-stratum breakdowns.

const STATUS_COLOR: Record<Status, string> = {
  planned: '#9a9a9a',
  in_progress: '#e8a93a',
  done: '#5a8a5e',
  stuck: '#d63b2f',
  abandoned: '#7a7a7a',
  removed: '#444',
};

export function CityHealth() {
  const tower = usePlat((s) => s.tower);
  const view = usePlat((s) => s.view);

  const counts = statusCounts(tower);
  const totalCubes = tower.districts.reduce((n, d) => n + d.files.filter(f => f.status !== 'removed').length, 0);

  const builtPct = totalCubes ? Math.round((counts.done / totalCubes) * 100) : 0;
  const activePct = totalCubes ? Math.round((counts.in_progress / totalCubes) * 100) : 0;
  const riskPct = totalCubes ? Math.round(((counts.stuck + counts.abandoned) / totalCubes) * 100) : 0;

  // Per-stratum progress
  const stratumStats = useMemo(() => {
    const stats: Record<string, { total: number; done: number; inProgress: number; stuck: number; color: string }> = {};
    for (const s of STRATA) {
      stats[s.id] = { total: 0, done: 0, inProgress: 0, stuck: 0, color: s.color };
    }
    for (const d of tower.districts) {
      const s = stratumOf(d.id);
      const st = stats[s.id]!;
      for (const f of d.files) {
        if (f.status === 'removed') continue;
        st.total++;
        if (f.status === 'done') st.done++;
        if (f.status === 'in_progress') st.inProgress++;
        if (f.status === 'stuck') st.stuck++;
      }
    }
    return stats;
  }, [tower]);

  // Ring chart dimensions
  const R = 24;
  const C = 2 * Math.PI * R;

  // Build the stacked arc segments for the ring chart
  const arcSegments = useMemo(() => {
    if (totalCubes === 0) return [];
    const segments: Array<{ pct: number; color: string; label: string }> = [
      { pct: counts.done / totalCubes, color: STATUS_COLOR.done, label: 'built' },
      { pct: counts.in_progress / totalCubes, color: STATUS_COLOR.in_progress, label: 'in hand' },
      { pct: counts.stuck / totalCubes, color: STATUS_COLOR.stuck, label: 'stuck' },
      { pct: counts.abandoned / totalCubes, color: STATUS_COLOR.abandoned, label: 'abandoned' },
      { pct: counts.planned / totalCubes, color: STATUS_COLOR.planned, label: 'planned' },
    ];
    return segments.filter(s => s.pct > 0);
  }, [counts, totalCubes]);

  // Compute cumulative offsets for each arc segment
  const arcOffsets = useMemo(() => {
    let offset = 0;
    return arcSegments.map(s => {
      const start = offset;
      offset += s.pct;
      return start;
    });
  }, [arcSegments]);

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 12,
        left: 12,
        zIndex: 25,
        width: 220,
        background: 'rgba(28,26,23,0.94)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        borderRadius: 8,
        border: '1px solid rgba(255,255,255,0.14)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)',
        padding: '10px 12px',
        fontFamily: 'var(--font-geist-mono), monospace',
        color: '#efe9dc',
        pointerEvents: 'auto',
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
          color: 'rgba(239,233,220,0.45)',
        }}>
          city health
        </span>
        <span style={{
          fontSize: 8,
          color: 'rgba(239,233,220,0.25)',
          letterSpacing: '0.04em',
        }}>
          {totalCubes} cubes
        </span>
      </div>

      {/* Ring chart + stats side by side */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        marginBottom: 8,
      }}>
        {/* SVG ring chart */}
        <svg
          width={R * 2 + 8}
          height={R * 2 + 8}
          style={{ flexShrink: 0 }}
        >
          {/* Background ring */}
          <circle
            cx={R + 4}
            cy={R + 4}
            r={R}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={5}
          />
          {/* Stacked arc segments */}
          {arcSegments.map((seg, i) => (
            <circle
              key={seg.label}
              cx={R + 4}
              cy={R + 4}
              r={R}
              fill="none"
              stroke={seg.color}
              strokeWidth={5}
              strokeDasharray={`${seg.pct * C} ${C}`}
              strokeDashoffset={-(arcOffsets[i] ?? 0) * C}
              strokeLinecap="butt"
              transform={`rotate(-90 ${R + 4} ${R + 4})`}
              style={{
                transition: 'stroke-dasharray 400ms ease, stroke-dashoffset 400ms ease',
              }}
            />
          ))}
          {/* Center text: built % */}
          <text
            x={R + 4}
            y={R + 1}
            textAnchor="middle"
            dominantBaseline="central"
            fill="#efe9dc"
            fontSize={13}
            fontWeight={800}
            fontFamily="var(--font-geist-mono), monospace"
          >
            {builtPct}
          </text>
          <text
            x={R + 4}
            y={R + 11}
            textAnchor="middle"
            dominantBaseline="central"
            fill="rgba(239,233,220,0.4)"
            fontSize={6}
            fontWeight={500}
            fontFamily="var(--font-geist-mono), monospace"
            letterSpacing="0.06em"
          >
            done
          </text>
        </svg>

        {/* Stat pills */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
          flex: 1,
          minWidth: 0,
        }}>
          <StatPill label="built" value={counts.done} pct={builtPct} color={STATUS_COLOR.done} />
          <StatPill label="active" value={counts.in_progress} pct={activePct} color={STATUS_COLOR.in_progress} />
          <StatPill label="risk" value={counts.stuck + counts.abandoned} pct={riskPct} color={riskPct > 0 ? STATUS_COLOR.stuck : 'rgba(255,255,255,0.15)'} />
        </div>
      </div>

      {/* Per-stratum breakdown */}
      <div style={{
        borderTop: '1px solid rgba(255,255,255,0.08)',
        paddingTop: 6,
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
      }}>
        {STRATA.map(s => {
          const st = stratumStats[s.id]!;
          const pct = st.total ? Math.round((st.done / st.total) * 100) : 0;
          return (
            <div
              key={s.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              {/* Colored stratum indicator */}
              <span style={{
                display: 'inline-block',
                width: 8,
                height: 3,
                borderRadius: 1,
                background: s.color,
                flexShrink: 0,
              }} />
              {/* Name */}
              <span style={{
                fontSize: 8,
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: s.color,
                opacity: 0.85,
                width: 56,
                flexShrink: 0,
              }}>
                {s.name}
              </span>
              {/* Mini progress bar */}
              <div style={{
                flex: 1,
                height: 3,
                borderRadius: 1,
                background: 'rgba(255,255,255,0.06)',
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${pct}%`,
                  height: '100%',
                  borderRadius: 1,
                  background: s.color,
                  transition: 'width 400ms ease',
                }} />
              </div>
              {/* Fraction */}
              <span style={{
                fontSize: 8,
                color: 'rgba(239,233,220,0.35)',
                fontVariantNumeric: 'tabular-nums',
                width: 28,
                textAlign: 'right',
                flexShrink: 0,
              }}>
                {st.done}/{st.total}
              </span>
              {/* Stuck indicator */}
              {st.stuck > 0 && (
                <span style={{
                  fontSize: 7,
                  fontWeight: 700,
                  color: STATUS_COLOR.stuck,
                  background: 'rgba(214,59,47,0.15)',
                  border: '0.5px solid rgba(214,59,47,0.3)',
                  borderRadius: 2,
                  padding: '0 3px',
                  lineHeight: '12px',
                  animation: 'plat-glow-pulse 2s ease-in-out infinite',
                }}>
                  {st.stuck}!
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Wiring summary */}
      {view.showCables && (
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.08)',
          marginTop: 5,
          paddingTop: 5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{
            fontSize: 7.5,
            color: 'rgba(239,233,220,0.3)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}>
            wiring
          </span>
          <span style={{
            fontSize: 8,
            color: 'rgba(106,160,216,0.7)',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {usePlat.getState().links.length} cables
          </span>
        </div>
      )}

      {/* District skyline — a tiny bar chart showing each district's
          relative size (number of files) colored by district color.
          Like a miniature city skyline at the bottom of the dashboard. */}
      <div style={{
        borderTop: '1px solid rgba(255,255,255,0.08)',
        marginTop: 5,
        paddingTop: 5,
      }}>
        <div style={{
          fontSize: 7,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'rgba(239,233,220,0.25)',
          marginBottom: 4,
        }}>
          districts
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 1.5,
          height: 22,
        }}>
          {tower.districts.map(d => {
            const maxFiles = Math.max(...tower.districts.map(dd => dd.files.filter(f => f.status !== 'removed').length));
            const fileCount = d.files.filter(f => f.status !== 'removed').length;
            const doneCount = d.files.filter(f => f.status === 'done').length;
            const heightPct = maxFiles ? (fileCount / maxFiles) * 100 : 0;
            const donePct = fileCount ? (doneCount / fileCount) * 100 : 0;
            return (
              <div
                key={d.id}
                title={`${d.name}: ${doneCount}/${fileCount} built`}
                style={{
                  flex: 1,
                  height: `${heightPct}%`,
                  borderRadius: 1,
                  background: `${d.color}30`,
                  position: 'relative',
                  overflow: 'hidden',
                  minWidth: 4,
                  transition: 'height 300ms ease',
                }}
              >
                {/* Done portion */}
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: `${donePct}%`,
                  borderRadius: 1,
                  background: d.color,
                  opacity: 0.8,
                  transition: 'height 300ms ease',
                }} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatPill({ label, value, pct, color }: {
  label: string;
  value: number;
  pct: number;
  color: string;
}) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 4,
    }}>
      <span style={{
        display: 'inline-block',
        width: 4,
        height: 4,
        borderRadius: 1,
        background: color,
        flexShrink: 0,
      }} />
      <span style={{
        fontSize: 8,
        color: 'rgba(239,233,220,0.4)',
        letterSpacing: '0.04em',
        width: 32,
        flexShrink: 0,
      }}>
        {label}
      </span>
      <span style={{
        fontSize: 10,
        fontWeight: 700,
        color,
        fontVariantNumeric: 'tabular-nums',
        width: 18,
        flexShrink: 0,
      }}>
        {value}
      </span>
      <div style={{
        flex: 1,
        height: 2,
        borderRadius: 1,
        background: 'rgba(255,255,255,0.06)',
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${pct}%`,
          height: '100%',
          borderRadius: 1,
          background: color,
          opacity: 0.7,
          transition: 'width 400ms ease',
        }} />
      </div>
    </div>
  );
}
