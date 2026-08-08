'use client';

import { usePlat, districtProgress, statusCounts } from '@/lib/plat/store';
import {
  STATUS,
  STATUS_LABEL,
  STATUS_GLYPH,
  STATUS_DESCRIPTION,
  Status,
  STRATA,
  stratumOf,
  Tower,
} from '@/lib/plat/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Search,
  RotateCcw,
  Layers,
  Cable,
  Eye,
  EyeOff,
  ChevronRight,
  Plus,
  X,
  Shuffle,
  Bookmark,
  History,
  Trash2,
  Download,
  Upload,
  GripVertical,
} from 'lucide-react';
import { LINK_KIND_LEGEND } from './Cables';
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const STATUS_DOT: Record<Status, string> = {
  planned: 'transparent',
  in_progress: '#e8a93a',
  done: '#5a8a5e',
  stuck: '#d63b2f',
  abandoned: '#7a7a7a',
  removed: '#444',
};

// Status health bar — a stacked horizontal bar showing the breakdown of file
// statuses in a district. Each segment is sized by file count and colored by
// status. Hovering shows the count in a tooltip.
function DistrictHealthBar({ district }: { district: { files: { status: Status }[]; color: string } }) {
  const counts: Record<Status, number> = {
    planned: 0,
    in_progress: 0,
    done: 0,
    stuck: 0,
    abandoned: 0,
    removed: 0,
  };
  for (const f of district.files) counts[f.status]++;
  const total = district.files.length || 1;
  const order: Status[] = ['done', 'in_progress', 'stuck', 'abandoned', 'planned'];
  return (
    <div
      className="flex h-1.5 w-full overflow-hidden rounded-full bg-white/8"
      title={`built ${counts.done} · in hand ${counts.in_progress} · stuck ${counts.stuck} · abandoned ${counts.abandoned} · planned ${counts.planned}`}
    >
      {order.map((s) => {
        const c = counts[s];
        if (c === 0) return null;
        const pct = (c / total) * 100;
        return (
          <div
            key={s}
            style={{
              width: `${pct}%`,
              background: STATUS_DOT[s] === 'transparent' ? '#ffffff15' : STATUS_DOT[s],
              borderRight: '1px solid #1c1a17',
            }}
          />
        );
      })}
    </div>
  );
}

// Radial (circular) progress indicator — a small SVG ring showing overall
// completion as an arc, with the percentage in the center.
function RadialProgress({ pct }: { pct: number }) {
  const r = 12;
  const C = 2 * Math.PI * r;
  const offset = C * (1 - pct / 100);
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" className="shrink-0">
      {/* background ring */}
      <circle
        cx="16" cy="16" r={r}
        fill="none" stroke="#ffffff15" strokeWidth="3"
      />
      {/* progress arc — rotated so it starts at 12 o'clock */}
      <circle
        cx="16" cy="16" r={r}
        fill="none" stroke="#9bc59e" strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={C}
        strokeDashoffset={offset}
        transform="rotate(-90 16 16)"
        className="transition-[stroke-dashoffset] duration-500"
      />
      {/* center percentage */}
      <text
        x="16" y="16"
        textAnchor="middle" dominantBaseline="central"
        fill="#efe9dc"
        fontSize="8"
        style={{ fontFamily: 'var(--font-geist-mono), monospace' }}
      >
        {Math.round(pct)}
      </text>
    </svg>
  );
}

// Compact progress dashboard — shows overall + per-stratum stats.
function ProgressDashboard({ tower }: { tower: Tower }) {
  // Aggregate all files and compute overall built/total.
  const allFiles = tower.districts.flatMap((d) => d.files);
  const totalCubes = allFiles.length;
  const builtCount = allFiles.filter(
    (f) => f.status === 'done' || f.status === 'in_progress',
  ).length;
  const overallPct = totalCubes > 0 ? (builtCount / totalCubes) * 100 : 0;

  // Per-stratum aggregation.
  const stratumStats = STRATA.map((s) => {
    const districts = tower.districts.filter(
      (d) => stratumOf(d.id).id === s.id,
    );
    const files = districts.flatMap((d) => d.files);
    const built = files.filter(
      (f) => f.status === 'done' || f.status === 'in_progress',
    ).length;
    const total = files.length;
    return { stratum: s, files, built, total };
  });

  return (
    <div className="px-4 py-2 border-b border-white/10">
      <div className="flex items-start gap-3">
        {/* left: stats text */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1.5">
            <span
              className="font-mono text-[13px] font-semibold text-[#efe9dc]"
              style={{ fontFamily: 'var(--font-geist-mono), monospace' }}
            >
              {builtCount}/{totalCubes}
            </span>
            <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-white/35">
              built
            </span>
            <span className="font-mono text-[9.5px] text-white/30">·</span>
            <span
              className="font-mono text-[11px] text-white/55"
              style={{ fontFamily: 'var(--font-geist-mono), monospace' }}
            >
              {Math.round(overallPct)}%
            </span>
          </div>
          {/* per-stratum rows */}
          <div className="mt-1.5 space-y-1">
            {stratumStats.map(({ stratum, files, built, total }) => (
              <div key={stratum.id} className="flex items-center gap-2">
                <span
                  className="font-mono text-[9px] uppercase tracking-[0.12em] shrink-0"
                  style={{ color: stratum.color }}
                >
                  {stratum.name.slice(0, 4)}
                </span>
                {/* colored bar background + fill */}
                <span className="flex-1 h-1.5 rounded-full bg-white/8 overflow-hidden">
                  <span
                    className="block h-full rounded-full transition-all duration-500"
                    style={{
                      width: total > 0 ? `${(built / total) * 100}%` : '0%',
                      background: stratum.color,
                    }}
                  />
                </span>
                {/* mini health bar */}
                <DistrictHealthBar district={{ files, color: stratum.color }} />
                <span
                  className="font-mono text-[9px] text-white/40 shrink-0"
                  style={{ fontFamily: 'var(--font-geist-mono), monospace' }}
                >
                  {built}/{total}
                </span>
              </div>
            ))}
          </div>
        </div>
        {/* right: radial progress */}
        <RadialProgress pct={overallPct} />
      </div>
    </div>
  );
}

export function TowerPanel() {
  const tower = usePlat((s) => s.tower);
  const selected = usePlat((s) => s.selected);
  const query = usePlat((s) => s.query);
  const setQuery = usePlat((s) => s.setQuery);
  const statusFilter = usePlat((s) => s.statusFilter);
  const toggleStatusFilter = usePlat((s) => s.toggleStatusFilter);
  const view = usePlat((s) => s.view);
  const setSeparated = usePlat((s) => s.setSeparated);
  // Was selecting the action, not the state — so `active` below was always
  // false and no stratum button ever lit up.
  const focusStratum = usePlat((s) => s.view.focusStratum);
  const setFocusStratum = usePlat((s) => s.focusStratum);
  const toggleCables = usePlat((s) => s.toggleCables);
  const selectCube = usePlat((s) => s.selectCube);
  const resetTower = usePlat((s) => s.resetTower);
  const addCube = usePlat((s) => s.addCube);
  const shuffleDistrict = usePlat((s) => s.shuffleDistrict);
  const saving = usePlat((s) => s.saving);
  const dirty = usePlat((s) => s.dirty);
  const snapshots = usePlat((s) => s.snapshots);
  const saveSnapshot = usePlat((s) => s.saveSnapshot);
  const loadSnapshot = usePlat((s) => s.loadSnapshot);
  const deleteSnapshot = usePlat((s) => s.deleteSnapshot);
  const listSnapshots = usePlat((s) => s.listSnapshots);
  const importTower = usePlat((s) => s.importTower);
  const reorderCube = usePlat((s) => s.reorderCube);

  const counts = statusCounts(tower);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  // District id currently showing the "add file" inline form, or null.
  const [addingTo, setAddingTo] = useState<string | null>(null);
  // The path being typed into the inline add form.
  const [addPath, setAddPath] = useState('');
  // Snapshot UI state.
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [snapshotName, setSnapshotName] = useState('');
  const [confirmRestore, setConfirmRestore] = useState<string | null>(null);

  // ---- drag-to-reorder state (kept local — this is UI-only state) ----
  // Path of the file row currently being dragged. Null when idle.
  const [draggingPath, setDraggingPath] = useState<string | null>(null);
  // District id of the row being dragged — used to forbid cross-district drops.
  const [draggingDistrictId, setDraggingDistrictId] = useState<string | null>(null);
  // Path of the row the pointer is currently hovering — gets the insertion
  // line above it.
  const [dropTargetPath, setDropTargetPath] = useState<string | null>(null);
  const clearDrag = useCallback(() => {
    setDraggingPath(null);
    setDraggingDistrictId(null);
    setDropTargetPath(null);
  }, []);

  // Import state.
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<{ tower: Tower; filename: string } | null>(null);

  // Export: serialize current tower and trigger browser download.
  const handleExport = useCallback(() => {
    const payload = { _platVersion: '0.8', tower };
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `${tower.name}-v0.10-${ts}.tower.json`;
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, [tower]);

  // Import: open file picker.
  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Import: read and validate the selected file.
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset the input value so the same file can be re-selected.
    e.target.value = '';
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        // Accept both wrapped ({ _platVersion, tower }) and bare tower objects.
        const candidate = parsed._platVersion ? parsed.tower : parsed;
        if (!candidate || !Array.isArray(candidate.districts)) {
          alert('Invalid file: expected a tower with districts array.');
          return;
        }
        setPendingImport({ tower: candidate as Tower, filename: file.name });
      } catch {
        alert('Could not parse JSON from the selected file.');
      }
    };
    reader.readAsText(file);
  }, []);

  // Import: confirm and apply.
  const handleImportConfirm = useCallback(async () => {
    if (!pendingImport) return;
    await importTower(pendingImport.tower, pendingImport.filename);
    setPendingImport(null);
  }, [pendingImport, importTower]);

  // Load snapshots list on mount.
  useEffect(() => {
    listSnapshots();
  }, [listSnapshots]);

  const handleSaveSnapshot = async () => {
    const trimmed = snapshotName.trim();
    if (!trimmed) return;
    await saveSnapshot(trimmed);
    setSnapshotName('');
    setShowSaveForm(false);
  };

  const handleRestore = async (id: string) => {
    await loadSnapshot(id);
    setConfirmRestore(null);
  };

  const toggleCollapsed = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const startAdd = (districtId: string) => {
    setAddingTo(districtId);
    setAddPath('');
  };

  const cancelAdd = () => {
    setAddingTo(null);
    setAddPath('');
  };

  const submitAdd = async (districtId: string) => {
    const trimmed = addPath.trim();
    if (trimmed) {
      await addCube(districtId, trimmed);
      // Auto-expand the district so the new cube is visible.
      setCollapsed((prev) => {
        const next = new Set(prev);
        next.delete(districtId);
        return next;
      });
    }
    cancelAdd();
  };

  return (
    <div className="flex h-full flex-col bg-[#1c1a17] text-[#efe9dc]">
      {/* header */}
      <div className="px-4 pt-4 pb-3 border-b border-white/10">
        <div className="flex items-baseline justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div
                className="font-mono text-2xl font-bold tracking-[0.18em] text-[#efe9dc]"
                style={{ fontFamily: 'var(--font-geist-mono), monospace' }}
              >
                PLAT
              </div>
              {/* save indicator dot */}
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{
                  background: saving ? '#e8a93a' : dirty ? '#e8a93a' : '#9bc59e',
                  opacity: saving ? 1 : dirty ? 0.6 : 0.8,
                }}
                title={saving ? 'saving…' : dirty ? 'unsaved changes' : 'saved'}
              >
                {saving && (
                  <span className="block h-full w-full rounded-full animate-ping bg-[#e8a93a]" />
                )}
              </span>
            </div>
            <div className="font-mono text-[11px] text-white/40 -mt-0.5">
              {tower.name}
              <span className="ml-2 text-white/25">v0.10</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={resetTower}
              className="h-7 px-2 text-[11px] text-white/50 hover:text-white/80 hover:bg-white/5"
              title="Reset the city to defaults"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              reset
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExport}
              className="h-7 px-2 text-[11px] text-white/50 hover:text-white/80 hover:bg-white/5"
              title="Export tower as JSON"
            >
              <Download className="h-3 w-3 mr-1" />
              export
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleImportClick}
              className="h-7 px-2 text-[11px] text-white/50 hover:text-white/80 hover:bg-white/5"
              title="Import tower from JSON"
            >
              <Upload className="h-3 w-3 mr-1" />
              import
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.tower.json"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </div>
        <p className="mt-2 text-[10.5px] leading-relaxed text-white/35 italic">
          a codebase is a city. files are cubes, languages are districts. pull
          the city apart to see what is wired to what.
        </p>
      </div>

      {/* progress dashboard */}
      <ProgressDashboard tower={tower} />

      {/* quick stats — compact analytics strip */}
      <div className="px-3 py-2 border-b border-white/10">
        <div className="grid grid-cols-3 gap-2">
          {(() => {
            const totalFiles = tower.districts.reduce((n, d) => n + d.files.length, 0);
            const totalDone = tower.districts.reduce((n, d) => n + d.files.filter(f => f.status === 'done').length, 0);
            const totalInProgress = tower.districts.reduce((n, d) => n + d.files.filter(f => f.status === 'in_progress').length, 0);
            const totalStuck = tower.districts.reduce((n, d) => n + d.files.filter(f => f.status === 'stuck').length, 0);
            const totalAbandoned = tower.districts.reduce((n, d) => n + d.files.filter(f => f.status === 'abandoned').length, 0);
            const completionRate = totalFiles ? Math.round((totalDone / totalFiles) * 100) : 0;
            const healthRate = totalFiles ? Math.round(((totalDone + totalInProgress) / totalFiles) * 100) : 0;
            const riskRate = totalFiles ? Math.round(((totalStuck + totalAbandoned) / totalFiles) * 100) : 0;
            return (
              <>
                <div className="flex flex-col items-center gap-0.5">
                  <span className="font-mono text-[14px] text-[#9bc59e]" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {completionRate}%
                  </span>
                  <span className="font-mono text-[7.5px] uppercase tracking-[0.1em] text-white/30">
                    complete
                  </span>
                </div>
                <div className="flex flex-col items-center gap-0.5">
                  <span className="font-mono text-[14px] text-[#e8a93a]" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {healthRate}%
                  </span>
                  <span className="font-mono text-[7.5px] uppercase tracking-[0.1em] text-white/30">
                    active
                  </span>
                </div>
                <div className="flex flex-col items-center gap-0.5">
                  <span className="font-mono text-[14px]" style={{ fontVariantNumeric: 'tabular-nums', color: riskRate > 10 ? '#d63b2f' : riskRate > 0 ? '#e8a93a' : '#7a7a7a' }}>
                    {riskRate}%
                  </span>
                  <span className="font-mono text-[7.5px] uppercase tracking-[0.1em] text-white/30">
                    risk
                  </span>
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* snapshots / bookmarks */}
      <div className="px-3 py-2.5 border-b border-white/10">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <Bookmark className="h-3 w-3 text-white/35" />
            <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-white/35">
              snapshots
            </span>
          </div>
          {!showSaveForm && (
            <button
              onClick={() => setShowSaveForm(true)}
              className="flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[9.5px] font-mono text-white/40 hover:text-white/70 hover:bg-white/5 transition"
            >
              <Plus className="h-2.5 w-2.5" />
              save
            </button>
          )}
        </div>

        {showSaveForm && (
          <div className="flex items-center gap-1.5 mb-2">
            <Input
              autoFocus
              value={snapshotName}
              onChange={(e) => setSnapshotName(e.target.value.slice(0, 30))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSaveSnapshot();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  setShowSaveForm(false);
                  setSnapshotName('');
                }
              }}
              placeholder="snapshot name…"
              className="h-6 flex-1 bg-white/5 border-white/10 text-[10.5px] text-white/85 placeholder:text-white/25 font-mono focus-visible:border-white/25"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSaveSnapshot}
              className="h-6 px-1.5 text-[9.5px] text-[#9bc59e] hover:bg-white/5"
            >
              save
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setShowSaveForm(false); setSnapshotName(''); }}
              className="h-6 w-6 p-0 text-white/35 hover:text-white/70 hover:bg-white/5"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}

        {snapshots.length === 0 && !showSaveForm && (
          <div className="font-mono text-[9.5px] text-white/20 italic">
            no snapshots yet
          </div>
        )}

        <div className="space-y-0.5 max-h-32 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#ffffff15 transparent' }}>
          {snapshots.map((snap) => {
            const isConfirming = confirmRestore === snap.id;
            const dateStr = new Date(snap.createdAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });
            return (
              <div
                key={snap.id}
                className="group flex items-center gap-1.5 rounded-sm px-1.5 py-1 hover:bg-white/5 transition"
              >
                {isConfirming ? (
                  <>
                    <span className="font-mono text-[9.5px] text-amber-400/80 truncate flex-1">
                      restore “{snap.name}”?
                    </span>
                    <button
                      onClick={() => handleRestore(snap.id)}
                      className="h-5 px-1.5 rounded-sm bg-[#9bc59e]/20 text-[9px] font-mono text-[#9bc59e] hover:bg-[#9bc59e]/30 transition"
                    >
                      yes
                    </button>
                    <button
                      onClick={() => setConfirmRestore(null)}
                      className="h-5 px-1.5 rounded-sm text-[9px] font-mono text-white/40 hover:text-white/70 hover:bg-white/5 transition"
                    >
                      no
                    </button>
                  </>
                ) : (
                  <>
                    <Bookmark className="h-2.5 w-2.5 text-white/20 shrink-0" />
                    <span
                      className="font-mono text-[10.5px] text-white/75 truncate flex-1"
                      title={snap.name}
                    >
                      {snap.name}
                    </span>
                    <span className="font-mono text-[8.5px] text-white/25 shrink-0">
                      {dateStr}
                    </span>
                    {/* restore button — visible on hover */}
                    <button
                      onClick={() => setConfirmRestore(snap.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity h-5 w-5 inline-flex items-center justify-center rounded-sm text-white/40 hover:text-[#9bc59e] hover:bg-white/5"
                      title={`Restore snapshot "${snap.name}"`}
                    >
                      <History className="h-2.5 w-2.5" />
                    </button>
                    {/* delete button — visible on hover */}
                    <button
                      onClick={() => deleteSnapshot(snap.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity h-5 w-5 inline-flex items-center justify-center rounded-sm text-white/40 hover:text-red-400 hover:bg-white/5"
                      title={`Delete snapshot "${snap.name}"`}
                    >
                      <Trash2 className="h-2.5 w-2.5" />
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* search */}
      <div className="px-3 py-2.5 border-b border-white/10">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="search paths, districts, tags…"
            className="h-8 pl-8 pr-2 bg-white/5 border-white/10 text-[12px] text-white/80 placeholder:text-white/25 focus-visible:border-white/20"
          />
        </div>
      </div>

      {/* status filter pills */}
      <div className="px-3 py-2.5 border-b border-white/10">
        <div className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-white/35 mb-1.5">
          status
        </div>
        <div className="flex flex-wrap gap-1">
          {STATUS.filter((s) => s !== 'removed').map((s) => {
            const on = statusFilter.has(s);
            return (
              <button
                key={s}
                onClick={() => toggleStatusFilter(s)}
                className={`group flex items-center gap-1.5 rounded-sm border px-1.5 py-0.5 text-[10.5px] font-mono transition ${
                  on
                    ? 'border-white/25 bg-white/10 text-white/80'
                    : 'border-white/10 bg-transparent text-white/30'
                }`}
                title={STATUS_DESCRIPTION[s]}
              >
                <span
                  className="inline-block h-2 w-2 rounded-[1px] border"
                  style={{
                    background: STATUS_DOT[s],
                    borderColor: on ? '#ffffff66' : '#ffffff33',
                  }}
                >
                  {s === 'planned' && on && (
                    <span className="block h-full w-full scale-[0.6] text-white/50 text-center leading-[5px]">
                      {STATUS_GLYPH[s]}
                    </span>
                  )}
                </span>
                <span>
                  {STATUS_LABEL[s]}
                  <span className="ml-1 opacity-50">{counts[s]}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* layer + cable controls */}
      <div className="px-3 py-2.5 border-b border-white/10 space-y-2">
        <div className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-white/35">
          view
        </div>
        <button
          onClick={() => setSeparated(!view.separated)}
          className={`flex w-full items-center gap-2 rounded-sm border px-2 py-1.5 text-[11px] transition ${
            view.separated
              ? 'border-[#c96442]/60 bg-[#c96442]/15 text-[#f0b89a]'
              : 'border-white/10 bg-transparent text-white/55 hover:bg-white/5'
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          section the city
          <span className="ml-auto font-mono text-[9.5px] uppercase tracking-wider opacity-70">
            {view.separated ? 'on' : 'off'}
          </span>
        </button>

        {view.separated && (
          <div className="flex gap-1 pl-5">
            {STRATA.map((s) => {
              const active = focusStratum === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setFocusStratum(active ? null : s.id)}
                  className={`flex-1 rounded-sm border px-1 py-1 text-[9.5px] font-mono uppercase tracking-wider transition ${
                    active
                      ? 'border-white/40 bg-white/15 text-white'
                      : 'border-white/10 text-white/40 hover:bg-white/5'
                  }`}
                  style={{ borderTopColor: s.color, borderTopWidth: 2 }}
                  title={s.gloss}
                >
                  {s.name.slice(0, 4)}
                </button>
              );
            })}
          </div>
        )}

        <button
          onClick={toggleCables}
          className={`flex w-full items-center gap-2 rounded-sm border px-2 py-1.5 text-[11px] transition ${
            view.showCables
              ? 'border-[#6aa0d8]/50 bg-[#6aa0d8]/12 text-[#bcd6f0]'
              : 'border-white/10 bg-transparent text-white/55 hover:bg-white/5'
          }`}
        >
          {view.showCables ? (
            <Eye className="h-3.5 w-3.5" />
          ) : (
            <EyeOff className="h-3.5 w-3.5" />
          )}
          wiring cables
          <span className="ml-auto font-mono text-[9.5px] uppercase tracking-wider opacity-70">
            {view.showCables ? 'on' : 'off'}
          </span>
        </button>

        {view.showCables && (
          <div className="flex flex-wrap gap-x-3 gap-y-1 pl-5 pt-0.5">
            {LINK_KIND_LEGEND.map((k) => (
              <div
                key={k.kind}
                className="flex items-center gap-1 text-[9px] font-mono text-white/40"
              >
                <span
                  className="inline-block h-0.5 w-3 rounded-full"
                  style={{ background: k.color }}
                />
                {k.label}
              </div>
            ))}
          </div>
        )}
      </div>

      <Separator className="bg-white/10" />

      {/* district / file tree */}
      <ScrollArea className="flex-1">
        <div className="px-2 py-2">
          {tower.districts.map((d) => {
            const { built, total } = districtProgress(d);
            const stratum = stratumOf(d.id);
            const isCollapsed = collapsed.has(d.id);
            const q = query.trim().toLowerCase();
            const matches =
              q.length === 0 ||
              d.name.toLowerCase().includes(q) ||
              d.tag.toLowerCase().includes(q) ||
              d.files.some((f) => f.path.toLowerCase().includes(q));
            if (!matches) return null;
            return (
              <div key={d.id} className="mb-1.5">
                <button
                  onClick={() => toggleCollapsed(d.id)}
                  className="group flex w-full items-center gap-2 rounded-sm px-1.5 py-1 hover:bg-white/5 transition border-l-2"
                  style={{ borderLeftColor: stratum.color }}
                >
                  <ChevronRight
                    className={`h-3 w-3 text-white/30 transition-transform ${
                      isCollapsed ? '' : 'rotate-90'
                    }`}
                  />
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-[2px] border border-white/20"
                    style={{ background: d.color }}
                  />
                  <span className="font-mono text-[11px] font-semibold tracking-wide text-white/85">
                    {d.name}
                  </span>
                  <span
                    className="font-mono text-[8px] uppercase tracking-wider px-1 py-0.5 rounded-sm border"
                    style={{
                      color: stratum.color,
                      borderColor: `${stratum.color}55`,
                      background: `${stratum.color}12`,
                    }}
                  >
                    {stratum.id === 'surface' ? 'S' : stratum.id === 'wiring' ? 'W' : 'F'}
                  </span>
                  <span className="font-mono text-[9.5px] text-white/30 italic">
                    {d.tag}
                  </span>
                  <span className="ml-auto font-mono text-[10px] text-white/40">
                    {built}/{total}
                  </span>
                  {/* stacked status health bar — shows the breakdown by status */}
                  <span
                    className="inline-block h-1.5 w-12 overflow-hidden rounded-full bg-white/10"
                    title={`${stratum.name} layer · ${built}/${total} built`}
                  >
                    <DistrictHealthBar district={d} />
                  </span>
                  {/* per-district shuffle button — randomizes this stack only */}
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      shuffleDistrict(d.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.stopPropagation();
                        e.preventDefault();
                        shuffleDistrict(d.id);
                      }
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex h-4 w-4 items-center justify-center rounded-sm text-white/40 hover:text-white/80 hover:bg-white/10 cursor-pointer"
                    title={`shuffle ${d.name} statuses`}
                  >
                    <Shuffle className="h-2.5 w-2.5" />
                  </span>
                </button>

                {/* Add-file inline form: shows when the + button is clicked.
                    Press Enter to add, Escape to cancel. */}
                {addingTo === d.id && (
                  <div className="ml-5 mt-1 flex items-center gap-1.5">
                    <Plus className="h-3 w-3 text-white/30 shrink-0" />
                    <Input
                      autoFocus
                      value={addPath}
                      onChange={(e) => setAddPath(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          submitAdd(d.id);
                        } else if (e.key === 'Escape') {
                          e.preventDefault();
                          cancelAdd();
                        }
                      }}
                      placeholder={`new file (e.g. new${d.id === 'py' ? '.py' : `.${d.id}`})`}
                      className="h-6 flex-1 bg-white/5 border-white/10 text-[10.5px] text-white/85 placeholder:text-white/25 font-mono focus-visible:border-white/25"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => submitAdd(d.id)}
                      className="h-6 px-1.5 text-[9.5px] text-[#9bc59e] hover:bg-white/5"
                    >
                      add
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={cancelAdd}
                      className="h-6 w-6 p-0 text-white/35 hover:text-white/70 hover:bg-white/5"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}

                {!isCollapsed && (
                  <div className="ml-5 mt-0.5 border-l border-white/8 pl-2">
                    {d.files.map((f) => {
                      const isSel =
                        selected?.districtId === d.id && selected.path === f.path;
                      const matchesQ =
                        q.length === 0 || f.path.toLowerCase().includes(q);
                      if (!matchesQ) return null;
                      return (
                        <button
                          key={f.path}
                          draggable
                          onDragStart={(e) => {
                            setDraggingPath(f.path);
                            setDraggingDistrictId(d.id);
                            setDropTargetPath(null);
                            e.dataTransfer.effectAllowed = 'move';
                            e.dataTransfer.setData(
                              'text/plain',
                              JSON.stringify({ districtId: d.id, path: f.path }),
                            );
                          }}
                          onDragOver={(e) => {
                            // Only allow drops within the SAME district — files
                            // are scoped to their language, so cross-district
                            // reordering is meaningless. Also skip self.
                            if (
                              draggingDistrictId !== d.id ||
                              draggingPath === f.path
                            )
                              return;
                            e.preventDefault();
                            e.dataTransfer.dropEffect = 'move';
                            if (dropTargetPath !== f.path) setDropTargetPath(f.path);
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            try {
                              const parsed = JSON.parse(
                                e.dataTransfer.getData('text/plain'),
                              ) as { districtId: string; path: string };
                              // Guard again: same district, different path.
                              if (
                                parsed.districtId === d.id &&
                                parsed.path !== f.path
                              ) {
                                void reorderCube(d.id, parsed.path, f.path);
                              }
                            } catch {
                              /* ignore malformed payloads — drag from outside */
                            }
                            clearDrag();
                          }}
                          onDragEnd={clearDrag}
                          onClick={() =>
                            selectCube({ districtId: d.id, path: f.path })
                          }
                          className={`group/file flex w-full items-center gap-2 rounded-sm px-1.5 py-[3px] text-left transition ${
                            isSel
                              ? 'bg-white/12 ring-1 ring-white/20'
                              : 'hover:bg-white/5'
                          } ${
                            draggingPath === f.path
                              ? 'cursor-grabbing opacity-40'
                              : 'cursor-grab'
                          }`}
                          style={{
                            // Lift the row being dragged — uses the
                            // plat-drag-lift keyframe feel (a 2px nudge up).
                            transform:
                              draggingPath === f.path
                                ? 'translateY(-2px)'
                                : undefined,
                            // Insertion line above the drop target — drawn as
                            // an inset top box-shadow so it overlays without
                            // shifting the row's layout.
                            boxShadow:
                              dropTargetPath === f.path &&
                              draggingDistrictId === d.id
                                ? `inset 0 2px 0 0 ${d.color}`
                                : undefined,
                          }}
                        >
                          {/* Drag handle — subtle, only fully visible on hover. */}
                          <GripVertical className="h-3 w-3 shrink-0 text-white/30 opacity-0 transition-opacity group-hover/file:opacity-100" />
                          <span
                            className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-[2px] border text-[9px] leading-none"
                            style={{
                              borderColor: f.status === 'planned' ? '#ffffff33' : d.color,
                              background:
                                f.status === 'done'
                                  ? d.color
                                  : f.status === 'in_progress'
                                    ? `${d.color}55`
                                    : f.status === 'stuck'
                                      ? '#d63b2f'
                                      : f.status === 'abandoned'
                                        ? '#3a3a3a'
                                        : 'transparent',
                              color: '#fff',
                            }}
                          >
                            {STATUS_GLYPH[f.status]}
                          </span>
                          <span
                            className={`flex-1 truncate font-mono text-[10.5px] ${
                              f.status === 'planned'
                                ? 'text-white/40'
                                : f.status === 'abandoned'
                                  ? 'text-white/35 line-through'
                                  : 'text-white/80'
                            }`}
                          >
                            {f.path}
                          </span>
                          {f.status === 'in_progress' && (
                            <span className="font-mono text-[8.5px] text-amber-400/70">
                              {f.progress}%
                            </span>
                          )}
                          {f.marks.length > 0 && (
                            <span className="flex gap-0.5">
                              {f.marks.slice(0, 3).map((m, i) => (
                                <span
                                  key={i}
                                  className="rounded-[2px] bg-white/10 px-1 font-mono text-[8px] text-white/60"
                                >
                                  {m}
                                </span>
                              ))}
                            </span>
                          )}
                        </button>
                      );
                    })}
                    {/* Add-file trigger row at the bottom of the file list. */}
                    <button
                      onClick={() => startAdd(d.id)}
                      className="flex w-full items-center gap-2 rounded-sm px-1.5 py-[3px] text-left text-white/30 hover:text-white/55 hover:bg-white/5 transition"
                    >
                      <Plus className="h-3 w-3" />
                      <span className="font-mono text-[10px] italic">
                        add a file to the stack
                      </span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Import confirmation dialog */}
      <AlertDialog open={!!pendingImport} onOpenChange={(open) => { if (!open) setPendingImport(null); }}>
        <AlertDialogContent className="bg-[#1c1a17] border-white/15 text-[#efe9dc]">
          <AlertDialogHeader>
            <AlertDialogTitle>Import tower?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/50">
              Import &apos;{pendingImport?.tower.name ?? 'unknown'}&apos;? This replaces the current city.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/20 text-white/60 hover:bg-white/10 hover:text-white/80">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleImportConfirm}
              className="bg-[#5a8a5e] text-white hover:bg-[#5a8a5e]/90"
            >
              Import
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
