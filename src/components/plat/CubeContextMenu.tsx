'use client';

import { useCallback, useState } from 'react';
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
  ContextMenuLabel,
} from '@/components/ui/context-menu';
import { usePlat } from '@/lib/plat/store';
import {
  STATUS_CYCLE,
  STATUS_GLYPH,
  STATUS_LABEL,
  BUILTIN_MARKS,
  Status,
  FileCube,
} from '@/lib/plat/types';

// Status dot color — matches the legend used in CubeTooltip / TowerPanel.
const STATUS_DOT: Record<Status, string> = {
  planned: '#9a9a9a',
  in_progress: '#e8a93a',
  done: '#5a8a5e',
  stuck: '#d63b2f',
  abandoned: '#7a7a7a',
  removed: '#444',
};

interface CubeContextMenuProps {
  districtId: string;
  cube: FileCube;
  children: React.ReactNode;
}

/**
 * Wraps a cube's outer div and provides a right-click context menu with
 * quick actions: set status, toggle marks, copy path, focus district,
 * remove cube, cycle status.
 *
 * Uses shadcn/ui's ContextMenu primitive (Radix under the hood). The
 * Content is rendered via Portal so it isn't affected by the parent's
 * preserve-3d / 3D transforms — verified in
 * `src/components/ui/context-menu.tsx` (ContextMenuContent wraps
 * ContextMenuPrimitive.Portal). We use `asChild` on the trigger so
 * the cube's outer div IS the trigger element — no extra wrapper that
 * would break the 3D layout.
 */
export function CubeContextMenu({ districtId, cube, children }: CubeContextMenuProps) {
  const focusedDistrict = usePlat((s) => s.view.focusDistrict);
  const setStatus = usePlat((s) => s.setStatus);
  const cycleStatus = usePlat((s) => s.cycleStatus);
  const toggleMark = usePlat((s) => s.toggleMark);
  const removeCube = usePlat((s) => s.removeCube);
  const focusDistrict = usePlat((s) => s.focusDistrict);

  const [copied, setCopied] = useState(false);

  const ref = { districtId, path: cube.path };
  const isFocusedHere = focusedDistrict === districtId;

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(`${districtId}/${cube.path}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard may be unavailable (e.g. insecure context) — silently ignore */
    }
  }, [districtId, cube.path]);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent
        className="bg-[#1c1a17] text-[#efe9dc] border-white/15 font-mono shadow-2xl max-w-[180px] p-1"
        style={{
          animation: 'plat-ctx-pop 120ms ease-out',
          borderRadius: 5,
        }}
      >
        {/* ── Status sub-menu ───────────────────────────────────────── */}
        <ContextMenuSub>
          <ContextMenuSubTrigger className="text-[11px] text-[#efe9dc] focus:bg-white/10 focus:text-[#efe9dc] data-[state=open]:bg-white/10 data-[state=open]:text-[#efe9dc]">
            <span
              style={{
                display: 'inline-block',
                width: 7,
                height: 7,
                borderRadius: 2,
                background: STATUS_DOT[cube.status],
                border: '1px solid rgba(255,255,255,0.25)',
                marginRight: 7,
                flexShrink: 0,
              }}
            />
            status
          </ContextMenuSubTrigger>
          <ContextMenuSubContent
            className="bg-[#1c1a17] text-[#efe9dc] border-white/15 font-mono shadow-2xl min-w-[140px] p-1"
            style={{ borderRadius: 5 }}
          >
            {STATUS_CYCLE.map((s) => {
              const isCurrent = cube.status === s;
              const dot = STATUS_DOT[s];
              const glyph = STATUS_GLYPH[s];
              return (
                <ContextMenuItem
                  key={s}
                  onSelect={() => setStatus(ref, s)}
                  className="text-[10.5px] text-[#efe9dc] focus:bg-white/10 focus:text-[#efe9dc] px-2 py-1 rounded-sm gap-2"
                >
                  <span
                    style={{
                      display: 'inline-block',
                      width: 7,
                      height: 7,
                      borderRadius: 2,
                      background: dot,
                      border: '1px solid rgba(255,255,255,0.25)',
                      flexShrink: 0,
                      boxShadow: isCurrent ? `0 0 6px ${dot}aa` : 'none',
                    }}
                  />
                  <span style={{ opacity: 0.8, width: 12, textAlign: 'center' }}>
                    {glyph || ' '}
                  </span>
                  <span style={{ flex: 1 }}>{STATUS_LABEL[s]}</span>
                  {isCurrent && (
                    <span
                      style={{
                        fontSize: 8,
                        color: '#9bc59e',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                      }}
                    >
                      ●
                    </span>
                  )}
                </ContextMenuItem>
              );
            })}
          </ContextMenuSubContent>
        </ContextMenuSub>

        {/* ── Marks sub-menu ────────────────────────────────────────── */}
        <ContextMenuSub>
          <ContextMenuSubTrigger className="text-[11px] text-[#efe9dc] focus:bg-white/10 focus:text-[#efe9dc] data-[state=open]:bg-white/10 data-[state=open]:text-[#efe9dc]">
            <span
              style={{
                display: 'inline-block',
                width: 7,
                height: 7,
                borderRadius: 2,
                background:
                  cube.marks.length > 0 ? '#efe9dc' : 'transparent',
                border: '1px solid rgba(255,255,255,0.25)',
                marginRight: 7,
                flexShrink: 0,
              }}
            />
            marks
            {cube.marks.length > 0 && (
              <span
                style={{
                  marginLeft: 5,
                  fontSize: 8,
                  color: 'rgba(239,233,220,0.45)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {cube.marks.length}
              </span>
            )}
          </ContextMenuSubTrigger>
          <ContextMenuSubContent
            className="bg-[#1c1a17] text-[#efe9dc] border-white/15 font-mono shadow-2xl p-1.5"
            style={{ borderRadius: 5, minWidth: 140 }}
          >
            <ContextMenuLabel
              className="text-[8.5px] uppercase tracking-[0.14em] text-white/35 px-1 pb-1 pt-0"
            >
              toggle mark
            </ContextMenuLabel>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 4,
              }}
            >
              {BUILTIN_MARKS.map((m) => {
                const checked = cube.marks.includes(m);
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleMark(ref, m);
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    style={{
                      width: 24,
                      height: 24,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: 'var(--font-geist-mono), monospace',
                      fontSize: 11,
                      fontWeight: 700,
                      color: checked
                        ? m === '?'
                          ? '#ff8d7e'
                          : m === 'X'
                            ? '#bdbdbd'
                            : '#efe9dc'
                        : 'rgba(239,233,220,0.55)',
                      background: checked
                        ? m === '?'
                          ? 'rgba(214,59,47,0.22)'
                          : m === 'X'
                            ? 'rgba(189,189,189,0.18)'
                            : 'rgba(255,255,255,0.14)'
                        : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${
                        checked
                          ? m === '?'
                            ? 'rgba(214,59,47,0.5)'
                            : m === 'X'
                              ? 'rgba(189,189,189,0.4)'
                              : 'rgba(255,255,255,0.35)'
                          : 'rgba(255,255,255,0.1)'
                      }`,
                      borderRadius: 3,
                      cursor: 'pointer',
                      transition: 'background 120ms ease, color 120ms ease, border-color 120ms ease',
                      lineHeight: 1,
                    }}
                    onMouseEnter={(e) => {
                      const t = e.currentTarget;
                      if (!checked) {
                        t.style.background = 'rgba(255,255,255,0.1)';
                        t.style.color = '#efe9dc';
                      }
                    }}
                    onMouseLeave={(e) => {
                      const t = e.currentTarget;
                      if (!checked) {
                        t.style.background = 'rgba(255,255,255,0.04)';
                        t.style.color = 'rgba(239,233,220,0.55)';
                      }
                    }}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </ContextMenuSubContent>
        </ContextMenuSub>

        <ContextMenuSeparator className="bg-white/10 my-1" />

        {/* ── Copy path ─────────────────────────────────────────────── */}
        <ContextMenuItem
          onSelect={(e) => {
            // Keep the menu open briefly so the "copied!" indicator is visible.
            e.preventDefault();
            void handleCopy();
          }}
          className="text-[10.5px] text-[#efe9dc] focus:bg-white/10 focus:text-[#efe9dc] px-2 py-1 rounded-sm gap-2"
        >
          <span style={{ width: 14, textAlign: 'center', opacity: 0.6 }}>
            {copied ? '✓' : '⧉'}
          </span>
          <span style={{ flex: 1 }}>{copied ? 'copied!' : 'copy path'}</span>
        </ContextMenuItem>

        {/* ── Focus district ───────────────────────────────────────── */}
        <ContextMenuItem
          disabled={isFocusedHere}
          onSelect={() => focusDistrict(districtId)}
          className="text-[10.5px] text-[#efe9dc] focus:bg-white/10 focus:text-[#efe9dc] px-2 py-1 rounded-sm gap-2 data-[disabled]:opacity-40"
        >
          <span style={{ width: 14, textAlign: 'center', opacity: 0.6 }}>◎</span>
          <span style={{ flex: 1 }}>
            {isFocusedHere ? 'already focused' : 'focus district'}
          </span>
        </ContextMenuItem>

        {/* ── Remove cube (destructive) ─────────────────────────────── */}
        <ContextMenuItem
          variant="destructive"
          onSelect={() => removeCube(ref)}
          className="text-[10.5px] text-[#ff8d7e] focus:bg-[#d63b2f]/20 focus:text-[#ff8d7e] px-2 py-1 rounded-sm gap-2"
        >
          <span style={{ width: 14, textAlign: 'center', opacity: 0.7 }}>✕</span>
          <span style={{ flex: 1 }}>remove cube</span>
        </ContextMenuItem>

        <ContextMenuSeparator className="bg-white/10 my-1" />

        {/* ── Cycle status ─────────────────────────────────────────── */}
        <ContextMenuItem
          onSelect={() => cycleStatus(ref)}
          className="text-[10.5px] text-[#efe9dc] focus:bg-white/10 focus:text-[#efe9dc] px-2 py-1 rounded-sm gap-2"
        >
          <span style={{ width: 14, textAlign: 'center', opacity: 0.6 }}>↻</span>
          <span style={{ flex: 1 }}>cycle status →</span>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
