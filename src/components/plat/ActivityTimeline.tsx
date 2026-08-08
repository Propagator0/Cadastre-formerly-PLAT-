'use client';

import { useState } from 'react';
import { usePlat, ActivityEntry, relTime } from '@/lib/plat/store';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import {
  X,
  History,
  Eraser,
  Tag,
  FileText,
  RotateCcw,
  Shuffle,
  Circle,
  Save,
  Download,
} from 'lucide-react';

const KIND_ICON = {
  status: Circle,
  progress: Circle,
  mark: Tag,
  notes: FileText,
  reset: RotateCcw,
  shuffle: Shuffle,
  rewind: RotateCcw,
  snapshot: Save,
  import: Download,
} as const;

const KIND_COLOR: Record<ActivityEntry['kind'], string> = {
  status: '#e8a93a',
  progress: '#9bc59e',
  mark: '#c8623a',
  notes: '#b0a898',
  reset: '#7a8a72',
  shuffle: '#6aa0d8',
  rewind: '#6aa0d8',
  snapshot: '#b08ad8',
  import: '#8ad8b0',
};

interface ActivityTimelineProps {
  onClose: () => void;
}

export function ActivityTimeline({ onClose }: ActivityTimelineProps) {
  const activity = usePlat((s) => s.activity);
  const activitySnapshots = usePlat((s) => s.activitySnapshots);
  const selectCube = usePlat((s) => s.selectCube);
  const clearActivity = usePlat((s) => s.clearActivity);
  const rewindToActivity = usePlat((s) => s.rewindToActivity);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  return (
    <div className="flex h-full flex-col bg-[#1c1a17] text-[#efe9dc]">
      {/* header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
        <div className="flex items-center gap-1.5">
          <History className="h-3.5 w-3.5 text-white/40" />
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/55">
            activity
          </span>
          <span className="font-mono text-[9.5px] text-white/30 ml-1">
            {activity.length}
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={clearActivity}
            disabled={activity.length === 0}
            className="h-6 px-1.5 text-[9.5px] text-white/35 hover:text-white/70 hover:bg-white/5 disabled:opacity-30"
            title="clear activity log"
          >
            <Eraser className="h-3 w-3 mr-1" />
            clear
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0 text-white/40 hover:text-white/70 hover:bg-white/5"
            title="close activity panel"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* list */}
      <ScrollArea className="flex-1">
        <div className="px-2 py-2">
          {activity.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
              <History className="h-6 w-6 mb-2 opacity-30" />
              <p className="font-mono text-[10px] leading-relaxed text-white/30">
                no activity yet.
                <br />
                <span className="text-white/20">
                  change a cube&apos;s status, mark, or notes to log it here.
                </span>
              </p>
            </div>
          ) : (
            <ol className="space-y-0.5">
              {activity.map((a, i) => {
                const Icon = KIND_ICON[a.kind];
                const color = KIND_COLOR[a.kind];
                const clickable = !!a.districtId;
                const hasSnapshot = !!activitySnapshots[a.id];
                const isConfirming = confirmingId === a.id;
                // The rewind pulse only fires on hover when the entry is
                // rewindable AND not currently in the confirm state.
                const rewindable =
                  hasSnapshot && !isConfirming ? 'plat-rewind-pulse-on-hover' : '';
                return (
                  <li
                    key={a.id}
                    className={`group relative pl-5 ${rewindable}`}
                    style={{
                      opacity: Math.max(0.35, 1 - i * 0.05),
                    }}
                  >
                    {/* timeline node */}
                    <span
                      className="absolute left-1.5 top-2 h-1.5 w-1.5 rounded-full"
                      style={{
                        background: color,
                        boxShadow: `0 0 0 2px ${color}33`,
                      }}
                    />
                    {/* vertical connector (except last) */}
                    {i < activity.length - 1 && (
                      <span
                        className="absolute left-[7px] top-4 h-[calc(100%+2px)] w-px"
                        style={{ background: `${color}22` }}
                      />
                    )}
                    <button
                      onClick={() =>
                        clickable
                          ? selectCube({ districtId: a.districtId, path: a.path })
                          : undefined
                      }
                      disabled={!clickable}
                      className={`w-full text-left py-1 pr-7 rounded-sm transition ${
                        clickable
                          ? 'hover:bg-white/5 cursor-pointer'
                          : 'cursor-default'
                      } ${isConfirming ? 'bg-[#6aa0d8]/10 ring-1 ring-[#6aa0d8]/40' : ''}`}
                    >
                      <div className="flex items-baseline gap-1.5">
                        <Icon
                          className="h-2.5 w-2.5 shrink-0 translate-y-0.5"
                          style={{ color }}
                        />
                        <span
                          className="font-mono text-[10px] text-white/75 truncate flex-1"
                          style={{ fontFamily: 'var(--font-geist-mono), monospace' }}
                        >
                          {a.path || a.summary}
                        </span>
                        <span className="font-mono text-[8.5px] text-white/30 shrink-0">
                          {relTime(a.ts)}
                        </span>
                      </div>
                      <div className="font-mono text-[9px] text-white/35 truncate pl-4">
                        {a.path ? a.summary : ''}
                        {a.districtName && (
                          <span className="text-white/25 ml-1.5">
                            · {a.districtName}
                          </span>
                        )}
                      </div>
                    </button>
                    {/* rewind icon — appears on hover, only when a snapshot
                        exists for this entry. Hidden while confirming. */}
                    {hasSnapshot && !isConfirming && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmingId(a.id);
                        }}
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center rounded-sm text-white/40 hover:text-[#6aa0d8] hover:bg-white/5 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition"
                        title={`rewind to ${relTime(a.ts)}`}
                        aria-label={`rewind to ${relTime(a.ts)}`}
                      >
                        <RotateCcw className="h-3 w-3" />
                      </button>
                    )}
                    {/* inline confirm UI: "rewind to <time>? [yes] [no]" */}
                    {isConfirming && (
                      <div className="absolute right-1 top-1/2 -translate-y-1/2 z-10 flex items-center gap-1 bg-[#1c1a17] border border-[#6aa0d8]/40 rounded-sm px-1 py-0.5 shadow-lg">
                        <span className="font-mono text-[8.5px] text-white/70 whitespace-nowrap">
                          rewind to {relTime(a.ts)}?
                        </span>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            setConfirmingId(null);
                            await rewindToActivity(a.id);
                          }}
                          className="font-mono text-[8.5px] px-1 py-0.5 rounded-sm bg-[#6aa0d8]/25 text-[#9bc5e8] hover:bg-[#6aa0d8]/40 transition"
                        >
                          yes
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmingId(null);
                          }}
                          className="font-mono text-[8.5px] px-1 py-0.5 rounded-sm text-white/50 hover:bg-white/5 transition"
                        >
                          no
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
