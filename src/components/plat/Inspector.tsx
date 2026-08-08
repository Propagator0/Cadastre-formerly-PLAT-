'use client';

import {
  PART_KINDS,
  PartKind,
  builtCount,
  faceOf,
  liveParts,
  partRef,
} from '@/lib/plat/parts';
import { usePlat, cubeOf, districtOf, statusCounts } from '@/lib/plat/store';
import {
  STATUS,
  STATUS_LABEL,
  STATUS_GLYPH,
  STATUS_DESCRIPTION,
  STATUS_CYCLE,
  BUILTIN_MARKS,
  Status,
  STRATA,
  stratumOf,
  nextStatus,
} from '@/lib/plat/types';
import { linksForCube, Link } from '@/lib/plat/wiring';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import {
  X,
  ArrowLeftRight,
  ArrowDown,
  ArrowUp,
  Tag,
  FileText,
  Link2,
  Trash2,
  Pencil,
  Check,
  Activity,
  AlertTriangle,
  MousePointerClick,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { KIND_COLOR_BY_KIND } from '@/lib/plat/cable-colors';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const STATUS_COLOR: Record<Status, string> = {
  planned: '#9a9a9a',
  in_progress: '#e8a93a',
  done: '#5a8a5e',
  stuck: '#d63b2f',
  abandoned: '#7a7a7a',
  removed: '#444',
};

const STATUS_DOT: Record<Status, string> = {
  planned: 'transparent',
  in_progress: '#e8a93a',
  done: '#5a8a5e',
  stuck: '#d63b2f',
  abandoned: '#7a7a7a',
  removed: '#444',
};

export function Inspector() {
  const tower = usePlat((s) => s.tower);
  const links = usePlat((s) => s.links);
  const selected = usePlat((s) => s.selected);
  const selectCube = usePlat((s) => s.selectCube);
  const cycleStatus = usePlat((s) => s.cycleStatus);
  const setStatus = usePlat((s) => s.setStatus);
  const setPartStatus = usePlat((s) => s.setPartStatus);
  const addPart = usePlat((s) => s.addPart);
  const removePart = usePlat((s) => s.removePart);
  const setTraced = usePlat((s) => s.setTraced);
  const traced = usePlat((s) => s.view.traced);
  const [partDraft, setPartDraft] = useState('');
  const [partKind, setPartKind] = useState<PartKind>('export');
  const setNotes = usePlat((s) => s.setNotes);
  const toggleMark = usePlat((s) => s.toggleMark);
  const removeCube = usePlat((s) => s.removeCube);
  const renameCube = usePlat((s) => s.renameCube);
  const activity = usePlat((s) => s.activity);

  const { district, cube } = selected ? cubeOf(tower, selected) : { district: undefined, cube: undefined };

  const cubeLinks = useMemo<Link[]>(() => {
    if (!selected) return [];
    return linksForCube(links, selected.districtId, selected.path);
  }, [links, selected]);

  if (!selected || !district || !cube) {
    // ── Empty-state: instead of a single dead-end message, surface useful
    //    context — overall status counts, the most at-risk cubes (stuck +
    //    abandoned) clickable to select, and the most recent activity entry.
    //    Turns the inspector from a "no selection" blank into a dashboard.
    return <InspectorEmptyState tower={tower} links={links} activity={activity} onSelect={selectCube} />;
  }

  const stratum = stratumOf(district.id);
  const idx = district.files.findIndex((f) => f.path === cube.path);

  return (
    <div className="flex h-full flex-col bg-[#1c1a17] text-[#efe9dc]">
      {/* header */}
      <div className="px-4 pt-4 pb-3 border-b border-white/10">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 rounded-[2px] border border-white/20 shrink-0"
                style={{ background: district.color }}
              />
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/40">
                {district.name} · {stratum.name}
              </span>
            </div>
            <RenameablePath
              key={selected.path}
              path={cube.path}
              onCommit={(newPath) => {
                if (newPath && newPath !== cube.path) {
                  renameCube(selected, newPath);
                }
              }}
            />
            <div className="font-mono text-[10px] text-white/30 italic mt-0.5">
              cube {idx + 1} of {district.files.length} in the stack
            </div>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-white/40 hover:text-[#d63b2f] hover:bg-[#d63b2f]/10"
                  title="remove this cube from the stack"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-[#1c1a17] border-white/15 text-[#efe9dc]">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-white/90 font-mono text-[13px]">
                    remove cube?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-white/55 font-mono text-[11px]">
                    This will delete <span className="text-white/85">{cube.path}</span> from
                    the <span className="text-white/85">{district.name}</span> stack. This
                    cannot be undone (a reset would restore only the default seed).
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="h-8 text-[11px] bg-white/5 border-white/15 text-white/70 hover:bg-white/10">
                    cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => removeCube(selected)}
                    className="h-8 text-[11px] bg-[#d63b2f]/80 hover:bg-[#d63b2f] text-white border-0"
                  >
                    remove
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => selectCube(null)}
              className="h-7 w-7 p-0 text-white/40 hover:text-white/70 hover:bg-white/5"
              title="close inspector"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-5">
          {/* status */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <div className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-white/35">
                status
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => cycleStatus(selected, true)}
                className="h-6 px-2 text-[10px] text-white/40 hover:text-white/70 hover:bg-white/5"
              >
                <ArrowLeftRight className="h-3 w-3 mr-1" />
                cycle back
              </Button>
            </div>
            <div className="grid grid-cols-5 gap-1">
              {STATUS_CYCLE.map((s) => {
                const active = cube.status === s;
                return (
                  <button
                    key={s}
                    onClick={() => setStatus(selected, s)}
                    className={`flex flex-col items-center gap-1 rounded-sm border py-1.5 transition ${
                      active
                        ? 'border-white/40 bg-white/12'
                        : 'border-white/8 hover:bg-white/5'
                    }`}
                    style={
                      active
                        ? { boxShadow: `inset 0 -2px 0 ${STATUS_COLOR[s]}` }
                        : undefined
                    }
                  >
                    <span
                      className="font-mono text-[11px]"
                      style={{ color: active ? STATUS_COLOR[s] : '#ffffff55' }}
                    >
                      {STATUS_GLYPH[s] || '·'}
                    </span>
                    <span
                      className={`font-mono text-[8.5px] uppercase tracking-wide ${
                        active ? 'text-white/80' : 'text-white/35'
                      }`}
                    >
                      {STATUS_LABEL[s]}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[10.5px] leading-relaxed text-white/40 italic">
              {STATUS_DESCRIPTION[cube.status]}
            </p>
          </section>

          {/* parts */}
          {/*
            The progress slider used to live here. It let you assert a number
            with nothing behind it — 60% of what? — and the cube grew to
            match. Parts replaced it: tick a part and the number moves,
            because the number IS the parts. There is nothing left to drag
            out of sync.
          */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <div className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-white/35">
                parts
              </div>
              <span className="font-mono text-[11px] text-white/45">
                {builtCount(cube.parts)}/{liveParts(cube.parts).length} · {cube.progress}%
              </span>
            </div>

            {/* Bottom of the list is the ground floor, so the list reads the
                way the cube does. */}
            <ol className="space-y-[3px]">
              {[...liveParts(cube.parts)].reverse().map((part) => {
                const ref = partRef(selected.districtId, selected.path, part.id);
                const face = faceOf(part.kind);
                const isTraced = traced === ref;
                return (
                  <li
                    key={part.id}
                    className="flex items-center gap-2 py-[2px] border-b border-white/[0.06]"
                  >
                    <button
                      title="click to advance · shift-click to reverse"
                      onClick={(e) =>
                        setPartStatus(
                          selected,
                          part.id,
                          nextStatus(part.status, e.shiftKey),
                        )
                      }
                      className="w-4 h-4 shrink-0 border text-[9px] leading-none flex items-center justify-center"
                      style={{
                        borderColor: STATUS_DOT[part.status] ?? '#6b6b6b',
                        color: STATUS_DOT[part.status] ?? '#6b6b6b',
                      }}
                    >
                      {STATUS_GLYPH[part.status]}
                    </button>
                    <span className="flex-1 truncate text-[11px] font-mono">
                      {part.name}
                    </span>
                    <span
                      className="font-mono text-[8.5px] uppercase tracking-[0.1em]"
                      style={{
                        color:
                          face === 'front'
                            ? '#c96442'
                            : face === 'back'
                              ? '#6aa0d8'
                              : 'rgba(255,255,255,0.28)',
                      }}
                      title={
                        face === 'front'
                          ? 'front of house'
                          : face === 'back'
                            ? 'backstage'
                            : ''
                      }
                    >
                      {part.kind}
                    </span>
                    <button
                      title="trace this part's wiring"
                      onClick={() => setTraced(isTraced ? null : ref)}
                      className="font-mono text-[9px] px-1 shrink-0"
                      style={{ color: isTraced ? '#c96442' : 'rgba(255,255,255,0.3)' }}
                    >
                      {part.wires.length > 0 ? `\u27FF ${part.wires.length}` : '\u27FF'}
                    </button>
                    <button
                      title="remove part"
                      onClick={() => removePart(selected, part.id)}
                      className="text-white/25 hover:text-white/70 text-[11px] leading-none shrink-0"
                    >
                      &times;
                    </button>
                  </li>
                );
              })}
            </ol>

            <div className="flex gap-1 mt-2">
              <input
                value={partDraft}
                placeholder="add a part\u2026"
                spellCheck={false}
                onChange={(e) => setPartDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter' || !partDraft.trim()) return;
                  addPart(selected, partDraft.trim(), partKind);
                  setPartDraft('');
                }}
                className="flex-1 min-w-0 bg-transparent border-b border-white/15 focus:border-white/40 outline-none text-[11px] font-mono py-1"
              />
              <select
                value={partKind}
                onChange={(e) => setPartKind(e.target.value as PartKind)}
                className="bg-transparent border border-white/15 text-[9px] font-mono uppercase tracking-[0.08em] text-white/50"
              >
                {PART_KINDS.map((k) => (
                  <option key={k} value={k} className="bg-neutral-900">
                    {k}
                  </option>
                ))}
              </select>
            </div>

            <p className="mt-2 text-[10px] text-white/35 italic">
              the cube lays one course per finished part. status and progress
              are rollups of this list.
            </p>
          </section>

          <Separator className="bg-white/8" />

          {/* marks */}
          <section>
            <div className="flex items-center gap-1.5 mb-2">
              <Tag className="h-3 w-3 text-white/35" />
              <div className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-white/35">
                marks
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {BUILTIN_MARKS.map((m) => {
                const on = cube.marks.includes(m);
                return (
                  <button
                    key={m}
                    onClick={() => toggleMark(selected, m)}
                    className={`h-6 w-6 rounded-sm border font-mono text-[11px] transition ${
                      on
                        ? 'border-white/40 bg-white/15 text-white'
                        : 'border-white/10 text-white/35 hover:bg-white/5'
                    }`}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[9.5px] text-white/30 italic">
              two cubes sharing a custom mark wire up automatically.
            </p>
          </section>

          <Separator className="bg-white/8" />

          {/* notes */}
          <section>
            <div className="flex items-center gap-1.5 mb-2">
              <FileText className="h-3 w-3 text-white/35" />
              <div className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-white/35">
                notes
              </div>
            </div>
            <NotesField
              key={selected.path}
              initial={cube.notes}
              onCommit={(v) => {
                if (v !== cube.notes) setNotes(selected, v);
              }}
            />
            <p className="mt-1.5 text-[9.5px] text-white/30 italic">
              mention another file by path and a cable appears.
            </p>
          </section>

          <Separator className="bg-white/8" />

          {/* wiring */}
          <section>
            <div className="flex items-center gap-1.5 mb-2">
              <Link2 className="h-3 w-3 text-white/35" />
              <div className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-white/35">
                wired to
              </div>
              <span className="ml-auto font-mono text-[10px] text-white/30">
                {cubeLinks.length}
              </span>
            </div>
            {cubeLinks.length === 0 ? (
              <p className="text-[10.5px] text-white/30 italic">
                nothing wired here yet. shared file names, matching marks, or a
                path mentioned in notes will draw a cable.
              </p>
            ) : (
              <div className="space-y-1.5">
                {cubeLinks.map((l) => {
                  const isFrom =
                    l.from.districtId === selected.districtId &&
                    l.from.path === selected.path;
                  const other = isFrom ? l.to : l.from;
                  const otherDistrict = districtOf(tower, other.districtId);
                  const otherStratum = stratumOf(other.districtId);
                  const goesDown =
                    stratumOf(selected.districtId).id !== otherStratum.id &&
                    ((isFrom &&
                      depthOf(otherStratum.id) >
                        depthOf(stratumOf(selected.districtId).id)) ||
                      (!isFrom &&
                        depthOf(otherStratum.id) >
                          depthOf(stratumOf(selected.districtId).id)));
                  return (
                    <button
                      key={l.id}
                      onClick={() =>
                        selectCube({
                          districtId: other.districtId,
                          path: other.path,
                        })
                      }
                      className="group flex w-full items-center gap-2 rounded-sm border border-white/8 bg-white/3 px-2 py-1.5 text-left hover:bg-white/8 hover:border-white/15 transition"
                    >
                      <span
                        className="inline-block h-0.5 w-4 rounded-full shrink-0"
                        style={{ background: KIND_COLOR_BY_KIND[l.kind] }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          {goesDown ? (
                            <ArrowDown className="h-3 w-3 text-white/40 shrink-0" />
                          ) : (
                            <ArrowUp className="h-3 w-3 text-white/40 shrink-0" />
                          )}
                          <span
                            className="font-mono text-[10.5px] text-white/80 truncate"
                            style={{ fontFamily: 'var(--font-geist-mono), monospace' }}
                          >
                            {other.path}
                          </span>
                        </div>
                        <div className="font-mono text-[9px] text-white/30">
                          {otherDistrict?.name} · {otherStratum.name}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono text-[8.5px] uppercase tracking-wide text-white/35">
                          {l.kind}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </ScrollArea>
    </div>
  );
}

function nextInCycle(s: Status): Status {
  const i = STATUS_CYCLE.indexOf(s);
  return STATUS_CYCLE[(i + 1) % STATUS_CYCLE.length]!;
}

function depthOf(stratumId: string): number {
  return stratumId === 'surface' ? 0 : stratumId === 'wiring' ? 1 : 2;
}

// Uncontrolled notes field — remounts per file (keyed by path) so it picks up
// the latest saved value without a setState-in-effect.
function NotesField({
  initial,
  onCommit,
}: {
  initial: string;
  onCommit: (v: string) => void;
}) {
  const [val, setVal] = useState(initial);
  return (
    <Textarea
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={() => onCommit(val)}
      placeholder="what this file does, what it leans on…"
      className="min-h-[72px] bg-white/5 border-white/10 text-[11px] text-white/75 placeholder:text-white/25 font-mono resize-none focus-visible:border-white/20"
    />
  );
}

// Inline-renameable path. Shows the file path as text; clicking the pencil
// turns it into an input. Enter commits, Escape cancels. The parent remounts
// this component via `key={selected.path}` so initial state stays in sync.
function RenameablePath({
  path,
  onCommit,
}: {
  path: string;
  onCommit: (newPath: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(path);

  if (editing) {
    return (
      <div className="mt-1 flex items-center gap-1">
        <Input
          autoFocus
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              setEditing(false);
              onCommit(val);
            } else if (e.key === 'Escape') {
              e.preventDefault();
              setVal(path);
              setEditing(false);
            }
          }}
          onBlur={() => {
            setVal(path);
            setEditing(false);
          }}
          className="h-7 flex-1 min-w-0 bg-white/5 border-white/15 text-[13px] text-white/90 font-mono focus-visible:border-white/30"
          style={{ fontFamily: 'var(--font-geist-mono), monospace' }}
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setEditing(false);
            onCommit(val);
          }}
          className="h-7 w-7 p-0 text-[#9bc59e] hover:bg-white/5"
          title="confirm rename"
        >
          <Check className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }
  return (
    <div className="mt-1 flex items-center gap-1.5 group">
      <div
        className="flex-1 min-w-0 font-mono text-[15px] font-semibold text-white/90 break-all"
        style={{ fontFamily: 'var(--font-geist-mono), monospace' }}
      >
        {path}
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          setVal(path);
          setEditing(true);
        }}
        className="h-6 w-6 p-0 shrink-0 text-white/25 hover:text-white/85 hover:bg-white/10 transition-opacity"
        title="rename file"
      >
        <Pencil className="h-3 w-3" />
      </Button>
    </div>
  );
}

// ── Empty-state component ───────────────────────────────────────────────
// Shows when no cube is selected. Surfaces (1) overall status counts with
// color dots, (2) up to 4 at-risk cubes (stuck + abandoned) clickable to
// select, (3) the most recent activity entry. Gives the inspector a useful
// default state instead of a dead-end "select a cube" message.
interface InspectorEmptyStateProps {
  tower: import('@/lib/plat/types').Tower;
  links: Link[];
  activity: import('@/lib/plat/store').ActivityEntry[];
  onSelect: (ref: { districtId: string; path: string } | null) => void;
}

function InspectorEmptyState({ tower, links, activity, onSelect }: InspectorEmptyStateProps) {
  const counts = statusCounts(tower);
  const total = tower.districts.reduce((n, d) => n + d.files.length, 0);
  const builtPct = total ? Math.round((counts.done / total) * 100) : 0;

  // At-risk cubes: stuck first, then abandoned, max 4.
  const atRisk: { districtId: string; districtName: string; path: string; status: Status; progress: number; districtColor: string }[] = [];
  for (const d of tower.districts) {
    for (const f of d.files) {
      if (f.status === 'stuck' || f.status === 'abandoned') {
        atRisk.push({
          districtId: d.id,
          districtName: d.name,
          path: f.path,
          status: f.status,
          progress: f.progress,
          districtColor: d.color,
        });
      }
    }
  }
  // Sort: stuck first, then abandoned; within each, by district then path.
  atRisk.sort((a, b) => {
    if (a.status === 'stuck' && b.status !== 'stuck') return -1;
    if (a.status !== 'stuck' && b.status === 'stuck') return 1;
    if (a.districtName !== b.districtName) return a.districtName.localeCompare(b.districtName);
    return a.path.localeCompare(b.path);
  });
  const topRisk = atRisk.slice(0, 4);

  // Most recent meaningful activity (status / progress / mark / notes — skip
  // rewind markers, snapshots, imports, shuffles, and resets for brevity).
  const recentActivity = activity.find(
    (a) => a.kind === 'status' || a.kind === 'progress' || a.kind === 'mark' || a.kind === 'notes',
  );

  return (
    <div className="flex h-full flex-col bg-[#1c1a17] text-[#efe9dc]">
      {/* header */}
      <div className="px-4 pt-4 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <MousePointerClick className="h-3.5 w-3.5 text-white/40" />
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/40">
            inspector · no cube selected
          </span>
        </div>
        <p className="mt-2 font-mono text-[12px] text-white/75 leading-relaxed">
          pick a cube to inspect it.
        </p>
        <p className="mt-1 font-mono text-[10px] text-white/35 leading-relaxed italic">
          click a building in the city, or a file in the tower.
          <br />
          meanwhile — here is the city at a glance.
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-5">
          {/* overall status overview */}
          <section>
            <div className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-white/35 mb-2">
              city overview
            </div>
            <div className="rounded-sm border border-white/8 bg-white/3 p-3">
              <div className="flex items-baseline gap-2 mb-2.5">
                <span className="font-mono text-[24px] font-bold text-[#9bc59e] leading-none">
                  {builtPct}%
                </span>
                <span className="font-mono text-[10px] text-white/45 uppercase tracking-wider">
                  built
                </span>
                <span className="ml-auto font-mono text-[10px] text-white/40">
                  {counts.done}/{total}
                </span>
              </div>
              {/* status grid */}
              <div className="grid grid-cols-5 gap-1">
                {STATUS_CYCLE.map((s) => {
                  const c = counts[s];
                  return (
                    <button
                      key={s}
                      onClick={() => onSelect(null)}
                      className="flex flex-col items-center gap-0.5 rounded-sm border border-white/8 py-1 hover:bg-white/5 transition"
                      title={`${STATUS_LABEL[s]}: ${c} cubes`}
                    >
                      <span
                        className="inline-block h-2 w-2 rounded-[1px] border border-white/20"
                        style={{ background: STATUS_DOT[s] }}
                      />
                      <span className="font-mono text-[9px] text-white/70">
                        {c}
                      </span>
                      <span className="font-mono text-[7.5px] uppercase tracking-wide text-white/35">
                        {STATUS_LABEL[s]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* at-risk cubes */}
          <section>
            <div className="flex items-center gap-1.5 mb-2">
              <AlertTriangle className="h-3 w-3 text-[#d63b2f]" />
              <div className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-white/35">
                needs attention
              </div>
              <span className="ml-auto font-mono text-[10px] text-white/30">
                {atRisk.length}
              </span>
            </div>
            {topRisk.length === 0 ? (
              <div className="rounded-sm border border-[#5a8a5e]/30 bg-[#5a8a5e]/8 p-3">
                <p className="font-mono text-[10.5px] text-[#9bc59e] leading-relaxed">
                  nothing stuck or abandoned. the city is healthy.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {topRisk.map((r) => (
                  <button
                    key={`${r.districtId}/${r.path}`}
                    onClick={() => onSelect({ districtId: r.districtId, path: r.path })}
                    className="group flex w-full items-center gap-2 rounded-sm border border-white/8 bg-white/3 px-2 py-1.5 text-left hover:bg-white/8 hover:border-white/15 transition"
                  >
                    <span
                      className="inline-block h-3 w-3 rounded-[2px] border shrink-0"
                      style={{
                        background: r.status === 'stuck' ? '#d63b2f' : '#3a3a3a',
                        borderColor: r.status === 'stuck' ? '#d63b2f88' : '#ffffff33',
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-[10.5px] text-white/85 truncate">
                        {r.path}
                      </div>
                      <div className="font-mono text-[9px] text-white/35 flex items-center gap-1">
                        <span
                          className="inline-block h-1.5 w-1.5 rounded-[1px]"
                          style={{ background: r.districtColor }}
                        />
                        {r.districtName}
                      </div>
                    </div>
                    <span
                      className="font-mono text-[8.5px] uppercase tracking-wide shrink-0"
                      style={{ color: r.status === 'stuck' ? '#d63b2f' : '#7a7a7a' }}
                    >
                      {STATUS_LABEL[r.status]}
                    </span>
                  </button>
                ))}
                {atRisk.length > topRisk.length && (
                  <p className="font-mono text-[9px] text-white/30 italic pt-1">
                    + {atRisk.length - topRisk.length} more…
                  </p>
                )}
              </div>
            )}
          </section>

          <Separator className="bg-white/8" />

          {/* wiring summary */}
          <section>
            <div className="flex items-center gap-1.5 mb-2">
              <Link2 className="h-3 w-3 text-white/35" />
              <div className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-white/35">
                wiring
              </div>
              <span className="ml-auto font-mono text-[10px] text-white/30">
                {links.length} cables
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1">
              {(['stem', 'mark', 'kin', 'mention'] as const).map((k) => {
                const c = links.filter((l) => l.kind === k).length;
                return (
                  <div
                    key={k}
                    className="flex items-center gap-1.5 rounded-sm border border-white/8 bg-white/3 px-2 py-1"
                  >
                    <span
                      className="inline-block h-0.5 w-3 rounded-full shrink-0"
                      style={{ background: KIND_COLOR_BY_KIND[k] }}
                    />
                    <span className="font-mono text-[9px] text-white/45 flex-1">
                      {k === 'stem' ? 'shared name' : k === 'kin' ? 'containment' : k === 'mark' ? 'shared mark' : 'note ref'}
                    </span>
                    <span className="font-mono text-[10px] text-white/70">
                      {c}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          <Separator className="bg-white/8" />

          {/* recent activity */}
          <section>
            <div className="flex items-center gap-1.5 mb-2">
              <Activity className="h-3 w-3 text-white/35" />
              <div className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-white/35">
                last action
              </div>
            </div>
            {recentActivity ? (
              <button
                onClick={() => {
                  if (recentActivity.districtId && recentActivity.path) {
                    onSelect({ districtId: recentActivity.districtId, path: recentActivity.path });
                  }
                }}
                disabled={!recentActivity.districtId || !recentActivity.path}
                className="group flex w-full items-start gap-2 rounded-sm border border-white/8 bg-white/3 px-2 py-1.5 text-left hover:bg-white/8 hover:border-white/15 transition disabled:cursor-default disabled:hover:bg-white/3"
              >
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full mt-1 shrink-0"
                  style={{
                    background:
                      recentActivity.kind === 'status'
                        ? '#e8a93a'
                        : recentActivity.kind === 'progress'
                          ? '#e8a93a'
                          : recentActivity.kind === 'mark'
                            ? '#c8623a'
                            : recentActivity.kind === 'notes'
                              ? '#b0a898'
                              : recentActivity.kind === 'rewind'
                                ? '#6aa0d8'
                                : '#ffffff55',
                  }}
                />
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-[10px] text-white/75 leading-snug">
                    {recentActivity.summary}
                  </div>
                  <div className="font-mono text-[8.5px] text-white/30 mt-1">
                    {recentActivity.districtName || 'city-wide'}
                    {recentActivity.path ? ` · ${recentActivity.path}` : ''}
                  </div>
                </div>
              </button>
            ) : (
              <p className="font-mono text-[10px] text-white/30 italic">
                no actions yet. try the build button.
              </p>
            )}
          </section>
        </div>
      </ScrollArea>
    </div>
  );
}
