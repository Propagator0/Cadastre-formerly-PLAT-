'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { usePlat, statusCounts } from '@/lib/plat/store';
import { useShallow } from 'zustand/react/shallow';
import {
  STATUS,
  STATUS_LABEL,
  Status,
  STRATA,
  STATUS_CYCLE,
  stratumOf,
} from '@/lib/plat/types';
import { CityCanvas } from './CityCanvas';
import { TowerPanel } from './TowerPanel';
import { Inspector } from './Inspector';
import { ActivityTimeline } from './ActivityTimeline';
import { NotepadPanel } from './NotepadPanel';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Layers,
  Cable,
  PanelLeft,
  PanelRight,
  Eye,
  EyeOff,
  Compass,
  Maximize,
  History,
  NotebookPen,
  Undo2,
  HelpCircle,
  Hammer,
  Building2,
  X,
  Accessibility,
  Grid3x3,
  Palette,
  Hash,
  Filter,
  Network,
} from 'lucide-react';
import { LINK_KIND_LEGEND } from './Cables';
import { CableFilterBar } from './CableFilterBar';
import { DistrictDependencyGraph } from './DistrictDependencyGraph';

const STATUS_DOT: Record<Status, string> = {
  planned: 'transparent',
  in_progress: '#e8a93a',
  done: '#5a8a5e',
  stuck: '#d63b2f',
  abandoned: '#7a7a7a',
  removed: '#444',
};

export function PlatApp() {
  const init = usePlat((s) => s.init);
  const tower = usePlat((s) => s.tower);
  // Only the toggles this chrome actually reads — deliberately NOT yaw/pitch/
  // zoom. Selecting the whole `view` object meant the header, footer, legends
  // and help dialog were all rebuilt on every frame of an orbit drag, which
  // is most of a codebase's worth of JSX for a camera the toolbar can't see.
  // useShallow keeps the `view.x` call sites below working unchanged.
  const view = usePlat(
    useShallow((s) => ({
      separated: s.view.separated,
      focusStratum: s.view.focusStratum,
      focusDistrict: s.view.focusDistrict,
      showCables: s.view.showCables,
      colorblindMode: s.view.colorblindMode,
      gridSnap: s.view.gridSnap,
      theme: s.view.theme,
      showStackNumbers: s.view.showStackNumbers,
      cableKinds: s.view.cableKinds,
    })),
  );
  const setSeparated = usePlat((s) => s.setSeparated);
  const toggleCables = usePlat((s) => s.toggleCables);
  const focusStratum = usePlat((s) => s.focusStratum);
  const focusDistrict = usePlat((s) => s.focusDistrict);
  const setCamera = usePlat((s) => s.setCamera);
  const animateCamera = usePlat((s) => s.animateCamera);
  const undoLast = usePlat((s) => s.undoLast);
  const activity = usePlat((s) => s.activity);
  const selected = usePlat((s) => s.selected);
  const toggleColorblind = usePlat((s) => s.toggleColorblind);
  const toggleGridSnap = usePlat((s) => s.toggleGridSnap);
  const cycleTheme = usePlat((s) => s.cycleTheme);
  const toggleStackNumbers = usePlat((s) => s.toggleStackNumbers);
  const toggleCableKind = usePlat((s) => s.toggleCableKind);
  const setCableKinds = usePlat((s) => s.setCableKinds);

  const [showSidebar, setShowSidebar] = useState(true);
  const [showInspector, setShowInspector] = useState(true);
  const [showActivity, setShowActivity] = useState(false);
  const [showNotepad, setShowNotepad] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showCableFilter, setShowCableFilter] = useState(false);
  const [showDepGraph, setShowDepGraph] = useState(false);
  const [building, setBuilding] = useState(false);
  // Help tooltip auto-fade: the bottom-center hint shows on mount, then fades
  // out after ~6s of inactivity. It re-appears when the cursor dips into the
  // bottom 90px of the viewport (so a user reaching for the footer / help
  // hint gets a refresher). This keeps the cityscape unobstructed during
  // normal orbit/zoom work.
  const [hintVisible, setHintVisible] = useState(true);
  const hintTimer = useRef<number | null>(null);
  const hintAwake = useCallback(() => {
    setHintVisible(true);
    if (hintTimer.current) window.clearTimeout(hintTimer.current);
    hintTimer.current = window.setTimeout(() => setHintVisible(false), 6000);
  }, []);
  useEffect(() => {
    hintAwake();
    const onMove = (e: MouseEvent) => {
      // Wake the hint when the cursor is in the bottom 90px of the viewport.
      if (e.clientY > window.innerHeight - 90) hintAwake();
    };
    window.addEventListener('mousemove', onMove);
    return () => {
      window.removeEventListener('mousemove', onMove);
      if (hintTimer.current) window.clearTimeout(hintTimer.current);
    };
  }, [hintAwake]);

  useEffect(() => {
    init();
  }, [init]);

  // can we undo? only if there's a parseable status change in the activity log.
  const canUndo = activity.some(
    (a) => a.districtId && a.kind === 'status' && a.summary.includes(' → '),
  );

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Don't capture when typing in inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      switch (e.key.toLowerCase()) {
        case 'e':
          setSeparated(!view.separated);
          break;
        case 'c':
          toggleCables();
          break;
        case 'r':
          animateCamera({ yaw: 30, pitch: 55, zoom: 1 });
          break;
        case 'n':
          setShowNotepad((v) => !v);
          break;
        case 'a':
          setShowActivity((v) => !v);
          break;
        case '1':
          if (view.separated) focusStratum(view.focusStratum === 'surface' ? null : 'surface');
          break;
        case '2':
          if (view.separated) focusStratum(view.focusStratum === 'wiring' ? null : 'wiring');
          break;
        case '3':
          if (view.separated) focusStratum(view.focusStratum === 'foundation' ? null : 'foundation');
          break;
        case 'd':
          // Toggle district focus — if a cube is selected, focus its district
          if (selected) {
            const currentFocus = usePlat.getState().view.focusDistrict;
            focusDistrict(currentFocus === selected.districtId ? null : selected.districtId);
          }
          break;
        case 'b':
          // Toggle colorblind-friendly mode (B for "blind")
          toggleColorblind();
          break;
        case 'g':
          // Toggle grid snap (G for "grid")
          toggleGridSnap();
          break;
        case 't':
          // Cycle viewport theme: paper → blueprint → dark
          cycleTheme();
          break;
        case '#':
          // Toggle stack-position numbers on cube side faces (# = shift+3,
          // evokes "number"). Helps read the assembly order at a glance.
          toggleStackNumbers();
          break;
        case 'f':
          // Toggle the cable-kind filter popover
          setShowCableFilter((v) => !v);
          break;
        case 'v':
          // Toggle the district dependency graph popover
          setShowDepGraph((v) => !v);
          break;
        case 'escape':
          usePlat.getState().selectCube(null);
          focusDistrict(null);
          break;
        case 'z':
          // Undo last status change (Cmd/Ctrl+Z or just Z)
          undoLast();
          break;
        case '?':
          setShowHelp((v) => !v);
          break;
      }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [view.separated, view.focusStratum, view.focusDistrict, selected, setSeparated, toggleCables, animateCamera, focusStratum, focusDistrict, undoLast, toggleColorblind, toggleGridSnap, cycleTheme, toggleStackNumbers]);

  const counts = statusCounts(tower);
  const totalCubes = tower.districts.reduce((n, d) => n + d.files.length, 0);
  const builtPct = totalCubes
    ? Math.round((counts.done / totalCubes) * 100)
    : 0;

  // Build mode — auto-advances cubes from planned → in_progress → done one by
  // one with a district-cascade delay. Districts build one at a time, starting
  // from the deepest stratum (foundation → wiring → surface), so the city
  // assembles from the bottom up — foundations first, then plumbing, then UI.
  const startBuild = useCallback(() => {
    if (building) return;
    setBuilding(true);
    const state = usePlat.getState();
    const { tower: t } = state;
    // Sort districts by stratum depth (foundation first, surface last)
    // then collect their cubes in stack order within each district.
    const stratumOrder: Record<string, number> = { foundation: 0, wiring: 1, surface: 2 };
    const sortedDistricts = [...t.districts].sort((a, b) => {
      const da = stratumOrder[stratumOf(a.id).id] ?? 1;
      const db = stratumOrder[stratumOf(b.id).id] ?? 1;
      return da - db;
    });
    const pending: { districtId: string; path: string; districtIndex: number }[] = [];
    let distIdx = 0;
    for (const d of sortedDistricts) {
      for (const f of d.files) {
        if (f.status === 'removed' || f.status === 'done') continue;
        pending.push({ districtId: d.id, path: f.path, districtIndex: distIdx });
      }
      distIdx++;
    }
    if (pending.length === 0) {
      setBuilding(false);
      return;
    }
    let idx = 0;
    let lastDistrictIdx = -1;
    const tick = () => {
      const s = usePlat.getState();
      if (idx >= pending.length) {
        setBuilding(false);
        return;
      }
      const item = pending[idx]!;
      // When switching to a new district, add a longer pause so the
      // cascade reads as district-by-district, not a blur.
      const districtPause = item.districtIndex !== lastDistrictIdx ? 400 : 0;
      lastDistrictIdx = item.districtIndex;
      const cube = s.tower.districts
        .find((d) => d.id === item.districtId)
        ?.files.find((f) => f.path === item.path);
      if (!cube || cube.status === 'removed' || cube.status === 'done') {
        idx++;
        tick();
        return;
      }
      // Advance: planned → in_progress → done
      let nextStatus: Status;
      let nextProgress: number;
      if (cube.status === 'planned') {
        nextStatus = 'in_progress';
        nextProgress = 30;
      } else if (cube.status === 'in_progress') {
        nextStatus = 'done';
        nextProgress = 100;
      } else if (cube.status === 'stuck') {
        nextStatus = 'in_progress';
        nextProgress = 50;
      } else if (cube.status === 'abandoned') {
        nextStatus = 'in_progress';
        nextProgress = 20;
      } else {
        idx++;
        tick();
        return;
      }
      s.setStatus({ districtId: item.districtId, path: item.path }, nextStatus);
      if (nextStatus === 'in_progress') {
        s.setProgress({ districtId: item.districtId, path: item.path }, nextProgress);
      }
      idx++;
      setTimeout(tick, 160 + districtPause);
    };
    tick();
  }, [building]);

  // Shuffle progress for demo — randomizes cube statuses to show the assembly
  const shuffleProgress = useCallback(() => {
    const state = usePlat.getState();
    const { tower: t } = state;
    // Seeded random
    let seed = Date.now() & 0xffff;
    const rng = () => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >> 17; seed ^= seed << 5; seed >>>= 0; return seed / 4294967296; };
    let changes = 0;
    for (const d of t.districts) {
      for (let i = 0; i < d.files.length; i++) {
        const f = d.files[i];
        if (f.status === 'removed') continue;
        const r = rng();
        // Bias: earlier files more likely done, later more likely planned
        const threshold = (i + 1) / (d.files.length + 2);
        const newStatus: Status =
          r < threshold * 0.7 ? 'done'
          : r < threshold ? 'in_progress'
          : r < threshold + 0.05 ? 'stuck'
          : 'planned';
        const progress = newStatus === 'done' ? 100 : newStatus === 'in_progress' ? Math.round(20 + rng() * 60) : 0;
        if (newStatus !== f.status || progress !== f.progress) {
          state.setStatus({ districtId: d.id, path: f.path }, newStatus);
          changes++;
        }
      }
    }
    // Log the shuffle as one summary activity entry, bypassing the per-cube
    // log (which would flood).
    if (changes > 0) {
      usePlat.setState((s) => ({
        activity: [
          {
            id: `act-${Date.now()}-shuf`,
            ts: Date.now(),
            kind: 'shuffle' as const,
            districtId: '',
            districtName: '',
            path: '',
            summary: `shuffled ${changes} cubes`,
          },
          ...s.activity,
        ].slice(0, 40),
      }));
    }
  }, []);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#efe9dc]">
      {/* ===== header ===== */}
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-[#2a2622]/15 bg-[#1c1a17] px-3 text-[#efe9dc] z-40">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowSidebar((v) => !v)}
          className="h-8 w-8 p-0 text-white/60 hover:text-white hover:bg-white/8"
          title="toggle tower panel"
        >
          <PanelLeft className="h-4 w-4" />
        </Button>

        <div className="flex items-baseline gap-2">
          <span
            className="text-lg font-bold tracking-[0.2em]"
            style={{ fontFamily: 'var(--font-geist-mono), monospace' }}
          >
            PLAT
          </span>
          <span className="font-mono text-[10px] text-white/40">
            {tower.name} · v0.10
          </span>
        </div>

        <div className="ml-4 hidden md:flex items-center gap-1.5">
          <span className="font-mono text-[9.5px] uppercase tracking-wider text-white/35">
            built
          </span>
          <span className="font-mono text-[12px] text-[#9bc59e]">{builtPct}%</span>
          <span className="font-mono text-[10px] text-white/30">
            ({counts.done}/{totalCubes})
          </span>
        </div>

        <div className="ml-auto flex items-center gap-1">
          {/* ── View controls ── */}
          {view.separated &&
            STRATA.map((s) => {
              const active = view.focusStratum === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => focusStratum(active ? null : s.id)}
                  className={`hidden sm:flex items-center gap-1 rounded-sm border px-2 py-1 font-mono text-[9.5px] uppercase tracking-wider transition ${
                    active
                      ? 'border-white/40 bg-white/15 text-white'
                      : 'border-white/15 text-white/45 hover:bg-white/8'
                  }`}
                  style={{ borderTopColor: s.color, borderTopWidth: 2 }}
                  title={`${s.gloss} [${s.id === 'surface' ? '1' : s.id === 'wiring' ? '2' : '3'}]`}
                >
                  {s.name}
                </button>
              );
            })}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSeparated(!view.separated)}
            className={`h-8 px-2.5 text-[11px] rounded-b-sm ${
              view.separated
                ? 'text-[#f0b89a] bg-[#c96442]/15 hover:bg-[#c96442]/20 border-b-2 border-b-[#c96442]'
                : 'text-white/55 hover:text-white hover:bg-white/8'
            }`}
            title="section the city [E]"
          >
            <Layers className="h-3.5 w-3.5 mr-1.5" />
            <span className="hidden sm:inline">section</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={toggleCables}
            className={`h-8 w-8 p-0 rounded-b-sm ${
              view.showCables
                ? 'text-[#bcd6f0] bg-[#6aa0d8]/12 hover:bg-[#6aa0d8]/18 border-b-2 border-b-[#6aa0d8]'
                : 'text-white/55 hover:text-white hover:bg-white/8'
            }`}
            title="toggle wiring cables [C]"
          >
            {view.showCables ? <Cable className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </Button>

          {/* colorblind-friendly mode — adds status glyph overlays on cubes */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleColorblind}
            className={`h-8 w-8 p-0 rounded-b-sm ${
              view.colorblindMode
                ? 'text-[#f0d8a9] bg-[#e8a93a]/12 hover:bg-[#e8a93a]/18 border-b-2 border-b-[#e8a93a]'
                : 'text-white/55 hover:text-white hover:bg-white/8'
            }`}
            title="colorblind-friendly mode (status glyphs) [B]"
          >
            <Accessibility className="h-4 w-4" />
          </Button>

          {/* grid snap — snap yaw to 45° increments */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleGridSnap}
            className={`h-8 w-8 p-0 rounded-b-sm ${
              view.gridSnap
                ? 'text-[#c9d8a9] bg-[#9bc59e]/12 hover:bg-[#9bc59e]/18 border-b-2 border-b-[#9bc59e]'
                : 'text-white/55 hover:text-white hover:bg-white/8'
            }`}
            title="snap camera to 45° grid [G]"
          >
            <Grid3x3 className="h-4 w-4" />
          </Button>

          {/* theme cycle — paper / blueprint / dark */}
          <Button
            variant="ghost"
            size="sm"
            onClick={cycleTheme}
            className={`h-8 w-8 p-0 rounded-b-sm relative ${
              view.theme === 'paper'
                ? 'text-[#f0e0c0] bg-[#efe9dc]/12 hover:bg-[#efe9dc]/18 border-b-2 border-b-[#efe9dc]'
                : view.theme === 'blueprint'
                  ? 'text-[#bcd6f0] bg-[#5a8fc8]/15 hover:bg-[#5a8fc8]/20 border-b-2 border-b-[#5a8fc8]'
                  : 'text-[#c9d8e9] bg-[#7a8aa0]/15 hover:bg-[#7a8aa0]/20 border-b-2 border-b-[#7a8aa0]'
            }`}
            title={`theme: ${view.theme} [T] — cycle paper → blueprint → dark`}
          >
            <Palette className="h-4 w-4" />
            {/* tiny theme dot indicator */}
            <span
              className="absolute bottom-0.5 right-0.5 h-1 w-1 rounded-full"
              style={{
                background:
                  view.theme === 'paper' ? '#efe9dc'
                  : view.theme === 'blueprint' ? '#5a8fc8'
                  : '#7a8aa0',
              }}
            />
          </Button>

          {/* stack position numbers — show "3/14" on cube side faces */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleStackNumbers}
            className={`h-8 w-8 p-0 rounded-b-sm ${
              view.showStackNumbers
                ? 'text-[#f0d8a9] bg-[#e8a93a]/12 hover:bg-[#e8a93a]/18 border-b-2 border-b-[#e8a93a]'
                : 'text-white/55 hover:text-white hover:bg-white/8'
            }`}
            title="show stack-position numbers on cubes [#]"
          >
            <Hash className="h-4 w-4" />
          </Button>

          {/* cable-kind filter — show/hide cable types */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCableFilter((v) => !v)}
            className={`h-8 w-8 p-0 rounded-b-sm relative ${
              showCableFilter || view.cableKinds.size > 0
                ? 'text-[#bcd6f0] bg-[#6aa0d8]/12 hover:bg-[#6aa0d8]/18 border-b-2 border-b-[#6aa0d8]'
                : 'text-white/55 hover:text-white hover:bg-white/8'
            }`}
            title="filter cables by kind [F]"
          >
            <Filter className="h-4 w-4" />
            {view.cableKinds.size > 0 && (
              <span className="absolute -top-1 -right-1 h-3 min-w-3 px-0.5 rounded-full bg-[#6aa0d8] text-[8px] font-bold text-white flex items-center justify-center">
                {view.cableKinds.size}
              </span>
            )}
          </Button>

          {/* district dependency graph — bird's-eye wiring map */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDepGraph((v) => !v)}
            className={`h-8 w-8 p-0 rounded-b-sm ${
              showDepGraph
                ? 'text-[#c9d8a9] bg-[#7a8a72]/15 hover:bg-[#7a8a72]/20 border-b-2 border-b-[#7a8a72]'
                : 'text-white/55 hover:text-white hover:bg-white/8'
            }`}
            title="district dependency graph [V]"
          >
            <Network className="h-4 w-4" />
          </Button>

          <div className="w-px h-4 bg-white/10 mx-0.5" />

          {/* ── Camera presets ── */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => animateCamera({ yaw: 30, pitch: 55, zoom: 1 })}
            className="h-8 w-8 p-0 text-white/55 hover:text-white hover:bg-white/8"
            title="reset camera [R]"
          >
            <Compass className="h-4 w-4" />
          </Button>

          <div className="hidden md:flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => animateCamera({ yaw: 0, pitch: 75, zoom: 1.1 })}
              className="h-7 px-1.5 text-[9px] font-mono text-white/40 hover:text-white/70 hover:bg-white/8"
              title="overhead view"
            >
              top
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => animateCamera({ yaw: 45, pitch: 45, zoom: 1 })}
              className="h-7 px-1.5 text-[9px] font-mono text-white/40 hover:text-white/70 hover:bg-white/8"
              title="side view"
            >
              side
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => animateCamera({ yaw: 110, pitch: 60, zoom: 0.95 })}
              className="h-7 px-1.5 text-[9px] font-mono text-white/40 hover:text-white/70 hover:bg-white/8"
              title="low angle hero view"
            >
              hero
            </Button>
          </div>

          <div className="w-px h-4 bg-white/10 mx-0.5" />

          {/* ── Actions ── */}
          <Button
            variant="ghost"
            size="sm"
            onClick={startBuild}
            disabled={building}
            className={`h-8 px-2.5 text-[11px] rounded-b-sm ${
              building
                ? 'text-[#9bc59e] bg-[#5a8a5e]/15 border-b-2 border-b-[#5a8a5e]'
                : 'text-white/55 hover:text-white hover:bg-white/8'
            } disabled:cursor-wait`}
            title="build mode — auto-assemble cubes"
          >
            <Hammer className={`h-3.5 w-3.5 sm:mr-1.5 ${building ? 'animate-bounce' : ''}`} />
            <span className="hidden sm:inline font-mono text-[9.5px]">
              {building ? 'building…' : 'build'}
            </span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={shuffleProgress}
            className="h-8 px-2.5 text-[11px] text-white/55 hover:text-white hover:bg-white/8"
            title="shuffle cube statuses"
          >
            <span className="hidden sm:inline font-mono text-[9.5px]">shuffle</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => undoLast()}
            disabled={!canUndo}
            className="h-8 w-8 p-0 text-white/55 hover:text-white hover:bg-white/8 disabled:opacity-30 disabled:cursor-not-allowed"
            title="undo last change [Z]"
          >
            <Undo2 className="h-3.5 w-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (selected) {
                focusDistrict(view.focusDistrict === selected.districtId ? null : selected.districtId);
              }
            }}
            disabled={!selected}
            className={`h-8 px-2.5 text-[11px] rounded-b-sm ${
              view.focusDistrict
                ? 'text-[#f0b89a] bg-[#c96442]/15 hover:bg-[#c96442]/20 border-b-2 border-b-[#c96442]'
                : 'text-white/55 hover:text-white hover:bg-white/8'
            } disabled:opacity-30 disabled:cursor-not-allowed`}
            title="focus district [D]"
          >
            <Building2 className="h-3.5 w-3.3 sm:mr-1.5" />
            <span className="hidden sm:inline font-mono text-[9.5px]">
              {view.focusDistrict ? 'unfocus' : 'focus'}
            </span>
          </Button>

          <div className="w-px h-4 bg-white/10 mx-0.5" />

          {/* ── Panels ── */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowActivity((v) => !v)}
            className={`h-8 px-2.5 text-[11px] rounded-b-sm ${
              showActivity
                ? 'text-[#bcd6f0] bg-[#6aa0d8]/15 hover:bg-[#6aa0d8]/20 border-b-2 border-b-[#6aa0d8]'
                : 'text-white/55 hover:text-white hover:bg-white/8'
            }`}
            title="activity timeline [A]"
          >
            <History className="h-3.5 w-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline font-mono text-[9.5px]">activity</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowNotepad((v) => !v)}
            className={`h-8 px-2.5 text-[11px] rounded-b-sm ${
              showNotepad
                ? 'text-[#f0b89a] bg-[#c96442]/15 hover:bg-[#c96442]/20 border-b-2 border-b-[#c96442]'
                : 'text-white/55 hover:text-white hover:bg-white/8'
            }`}
            title="project notepad [N]"
          >
            <NotebookPen className="h-3.5 w-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline font-mono text-[9.5px]">notepad</span>
          </Button>

          <div className="w-px h-4 bg-white/10 mx-0.5" />

          {/* ── Help ── */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHelp(true)}
            className="h-8 w-8 p-0 text-white/55 hover:text-white hover:bg-white/8"
            title="keyboard shortcuts [?]"
          >
            <HelpCircle className="h-4 w-4" />
          </Button>

          <div className="w-px h-4 bg-white/10 mx-0.5" />

          {/* ── Inspector toggle ── */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowInspector((v) => !v)}
            className="h-8 w-8 p-0 text-white/60 hover:text-white hover:bg-white/8"
            title="toggle inspector"
          >
            <PanelRight className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* ===== main ===== */}
      <main className="flex flex-1 min-h-0 overflow-hidden">
        {/* left sidebar */}
        <aside
          className={`shrink-0 border-r border-[#2a2622]/15 overflow-hidden transition-all duration-300 ${
            showSidebar ? 'w-[280px]' : 'w-0'
          } max-md:absolute max-md:inset-y-0 max-md:left-0 max-md:top-12 max-md:z-30 max-md:shadow-2xl ${
            showSidebar ? 'max-md:w-[300px]' : 'max-md:w-0'
          }`}
        >
          <div className="h-full w-[280px] max-md:w-[300px]">
            <TowerPanel />
          </div>
        </aside>

        {/* canvas */}
        <section className="relative flex-1 min-w-0">
          <CityCanvas />

          {/* floating help (bottom-left of canvas) — sits ABOVE the footer so
              it never overlaps the status legend. Auto-fades after 6s of
              inactivity (no cursor in the bottom 90px) so the cityscape stays
              unobstructed during normal orbit/zoom work. */}
          <div
            className="pointer-events-none absolute bottom-12 left-1/2 -translate-x-1/2 z-20 select-none transition-opacity duration-500"
            style={{ opacity: hintVisible ? 1 : 0 }}
          >
            <div className="rounded-md bg-[#1c1a17]/90 px-3 py-2 backdrop-blur-md border border-white/12 shadow-lg">
              <div className="font-mono text-[9px] leading-relaxed text-white/55 text-center">
                <span className="text-white/70">drag</span> empty space to orbit
                <span className="text-white/25 mx-1">·</span>
                <span className="text-white/70">wheel</span> to zoom
                <span className="text-white/25 mx-1">·</span>
                <span className="text-white/70">click</span> a cube to inspect
                <span className="text-white/25 mx-1">·</span>
                <span className="text-white/70">hover</span> a cable for details
              </div>
              <div className="mt-1 pt-1 border-t border-white/8 font-mono text-[8.5px] leading-relaxed text-white/30 text-center">
                E section · C cables · B colorblind · G grid-snap · T theme · # numbers · F filter · V graph · R cam · D focus · ? help
                {view.separated && (
                  <span className="block mt-0.5 text-[#f0b89a]/80">
                    sectioned — focus a stratum · 1/2/3
                  </span>
                )}
                {view.gridSnap && (
                  <span className="block mt-0.5 text-[#9bc59e]/80">
                    grid-snap on — camera locks to 45°
                  </span>
                )}
                {view.colorblindMode && (
                  <span className="block mt-0.5 text-[#e8a93a]/80">
                    colorblind mode on — status glyphs visible
                  </span>
                )}
                {view.theme !== 'paper' && (
                  <span className="block mt-0.5 text-[#bcd6f0]/80">
                    {view.theme} theme — T to cycle
                  </span>
                )}
                {view.showStackNumbers && (
                  <span className="block mt-0.5 text-[#e8a93a]/80">
                    stack numbers visible — # to hide
                  </span>
                )}
                {view.cableKinds.size > 0 && (
                  <span className="block mt-0.5 text-[#bcd6f0]/80">
                    {view.cableKinds.size} cable kind{view.cableKinds.size === 1 ? '' : 's'} filtered — F to edit
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* stratum role badge (top-center of canvas) */}
          {view.separated && (
            <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 z-20 select-none">
              <div className="flex items-center gap-3 rounded-full bg-[#1c1a17]/90 px-4 py-1.5 backdrop-blur-md border border-white/12 shadow-lg">
                {STRATA.map((s, si) => {
                  const isFocus = view.focusStratum === s.id;
                  const isDim = view.focusStratum !== null && !isFocus;
                  return (
                    <div key={s.id} className="flex items-center gap-1.5" style={{ opacity: isDim ? 0.35 : 1, transition: 'opacity 380ms ease' }}>
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ background: s.color, boxShadow: isFocus ? `0 0 6px ${s.color}` : 'none' }}
                      />
                      <span className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-white/60">
                        {s.name}
                      </span>
                      <span className="font-mono text-[8px] text-white/30 italic">
                        {s.role === 'frontend' ? 'UI' : s.role === 'connective' ? 'pipes' : 'data'}
                      </span>
                      {si < STRATA.length - 1 && (
                        <span className="text-white/15 ml-1.5">→</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* activity timeline slide-out (bottom-right of canvas) */}
          <div
            className={`absolute bottom-3 right-3 top-12 z-30 w-[260px] transition-all duration-300 ${
              showActivity
                ? 'translate-x-0 opacity-100 pointer-events-auto'
                : 'translate-x-[110%] opacity-0 pointer-events-none'
            }`}
          >
            <div className="h-full rounded-md border border-white/15 bg-[#1c1a17]/95 backdrop-blur-md shadow-2xl overflow-hidden">
              <ActivityTimeline onClose={() => setShowActivity(false)} />
            </div>
          </div>

          {/* cable-kind filter popover — toggles which cable kinds are visible.
              Floats below the toolbar's filter button. */}
          <CableFilterBar open={showCableFilter} onClose={() => setShowCableFilter(false)} />

          {/* district dependency graph — bird's-eye 2D wiring map. Shows
              which districts depend on which, derived from the cable links.
              Floats top-left below the toolbar. */}
          <DistrictDependencyGraph open={showDepGraph} onClose={() => setShowDepGraph(false)} />

          {/* notepad slide-out (bottom-left of canvas, mirrors activity) */}
          <div
            className={`absolute bottom-3 left-3 top-12 z-30 w-[300px] transition-all duration-300 ${
              showNotepad
                ? 'translate-x-0 opacity-100 pointer-events-auto'
                : '-translate-x-[110%] opacity-0 pointer-events-none'
            }`}
          >
            <div className="h-full rounded-md border border-white/15 bg-[#1c1a17]/95 backdrop-blur-md shadow-2xl overflow-hidden">
              <NotepadPanel onClose={() => setShowNotepad(false)} />
            </div>
          </div>
        </section>

        {/* right inspector */}
        <aside
          className={`shrink-0 border-l border-[#2a2622]/15 overflow-hidden transition-all duration-300 ${
            showInspector && selected ? 'w-[300px]' : 'w-0'
          } max-lg:absolute max-lg:inset-y-0 max-lg:right-0 max-lg:top-12 max-lg:z-30 max-lg:shadow-2xl ${
            showInspector && selected ? 'max-lg:w-[320px]' : 'max-lg:w-0'
          }`}
        >
          <div className="h-full w-[300px] max-lg:w-[320px]">
            <Inspector />
          </div>
        </aside>
      </main>

      {/* ===== sticky footer ===== */}
      <footer className="mt-auto shrink-0 border-t border-[#2a2622]/15 bg-[#1c1a17] px-3 py-1.5 text-[#efe9dc] z-40">
        <div className="flex items-center gap-x-3 gap-y-1 overflow-x-auto flex-wrap">
          {/* status legend */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-white/30 whitespace-nowrap">
              status
            </span>
            <div className="flex items-center gap-2">
              {STATUS.filter((s) => s !== 'removed').map((s) => (
                <div
                  key={s}
                  className="flex items-center gap-1 whitespace-nowrap"
                  title={STATUS_LABEL[s]}
                >
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-[1px] border"
                    style={{
                      background: STATUS_DOT[s],
                      borderColor: '#ffffff33',
                    }}
                  />
                  <span className="font-mono text-[9px] text-white/55">
                    {STATUS_LABEL[s]}
                  </span>
                  <span className="font-mono text-[9px] text-white/40">
                    {counts[s]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="h-3 w-px bg-white/15 shrink-0" />

          {/* strata breakdown */}
          <div className="hidden sm:flex items-center gap-2">
            <span className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-white/30 whitespace-nowrap">
              strata
            </span>
            {STRATA.map((s) => {
              const districtIds = tower.districts
                .filter((d) => stratumOf(d.id).id === s.id)
                .map((d) => d.id);
              const stratumCubes = tower.districts
                .filter((d) => districtIds.includes(d.id))
                .reduce((n, d) => n + d.files.length, 0);
              const stratumDone = tower.districts
                .filter((d) => districtIds.includes(d.id))
                .reduce((n, d) => n + d.files.filter((f) => f.status === 'done').length, 0);
              return (
                <div
                  key={s.id}
                  className="flex items-center gap-1 whitespace-nowrap"
                  title={s.gloss}
                >
                  <span
                    className="inline-block h-2.5 w-1 rounded-[1px]"
                    style={{ background: s.color }}
                  />
                  <span className="font-mono text-[9px] text-white/55">
                    {s.name.slice(0, 4)}
                  </span>
                  <span className="font-mono text-[9px] text-white/40">
                    {stratumDone}/{stratumCubes}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="hidden sm:block h-3 w-px bg-white/15 shrink-0" />

          {/* cable legend */}
          {view.showCables && (
            <div className="hidden sm:flex items-center gap-2.5">
              <span className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-white/30 whitespace-nowrap">
                wiring
              </span>
              {LINK_KIND_LEGEND.map((k) => (
                <div
                  key={k.kind}
                  className="flex items-center gap-1 whitespace-nowrap"
                >
                  <span
                    className="inline-block h-0.5 w-3 rounded-full"
                    style={{ background: k.color }}
                  />
                  <span className="font-mono text-[9px] text-white/55">
                    {k.label}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* district focus indicator */}
          {view.focusDistrict && (
            <div className="hidden sm:flex items-center gap-2">
              <span className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-white/30 whitespace-nowrap">
                focus
              </span>
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{
                  background: tower.districts.find((d) => d.id === view.focusDistrict)?.color ?? '#fff',
                }}
              />
              <span className="font-mono text-[9px] text-white/55">
                {tower.districts.find((d) => d.id === view.focusDistrict)?.name ?? view.focusDistrict}
              </span>
              <button
                onClick={() => focusDistrict(null)}
                className="font-mono text-[8px] text-white/30 hover:text-white/60 transition-colors"
                title="clear district focus"
              >
                ✕
              </button>
            </div>
          )}

          {view.focusDistrict && <div className="hidden sm:block h-3 w-px bg-white/15 shrink-0" />}

          <div className="ml-auto flex items-center gap-3 whitespace-nowrap">
            <span className="hidden md:inline font-mono text-[9px] text-white/25 italic">
              a codebase mapped to a city · piece by piece
            </span>
            <span className="font-mono text-[9px] text-white/40">
              {tower.districts.length} districts · {totalCubes} files
            </span>
            {building && (
              <span className="font-mono text-[9px] text-[#9bc59e] animate-pulse">
                building…
              </span>
            )}
          </div>
        </div>
      </footer>

      {/* ===== help / shortcuts dialog ===== */}
      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent className="bg-[#1c1a17] border-white/15 text-[#efe9dc] max-w-[460px]">
          <DialogHeader>
            <DialogTitle
              className="font-mono text-[15px] tracking-[0.18em] text-white/90"
              style={{ fontFamily: 'var(--font-geist-mono), monospace' }}
            >
              PLAT · keyboard
            </DialogTitle>
            <DialogDescription className="text-white/40 font-mono text-[10.5px] italic">
              the city is meant to be driven from the keyboard.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-1.5 mt-2">
            <ShortcutRow keys="E" label="toggle the city's strata section" />
            <ShortcutRow keys="C" label="toggle wiring cables" />
            <ShortcutRow keys="B" label="toggle colorblind-friendly mode (status glyphs)" />
            <ShortcutRow keys="G" label="toggle grid-snap (camera locks to 45°)" />
            <ShortcutRow keys="T" label="cycle viewport theme: paper → blueprint → dark" />
            <ShortcutRow keys="#" label="toggle stack-position numbers on cube faces" />
            <ShortcutRow keys="F" label="open the cable-kind filter popover" />
            <ShortcutRow keys="V" label="open the district dependency graph popover" />
            <ShortcutRow keys="R" label="reset camera to default" />
            <ShortcutRow keys="1 / 2 / 3" label="focus surface / wiring / foundation (when sectioned)" />
            <ShortcutRow keys="D" label="focus the selected cube's district (dim others)" />
            <ShortcutRow keys="A" label="toggle the activity timeline panel" />
            <ShortcutRow keys="N" label="toggle the project notepad" />
            <ShortcutRow keys="Z" label="undo the last status change" />
            <ShortcutRow keys="?" label="this help dialog" />
            <ShortcutRow keys="Esc" label="deselect the current cube" />
            <ShortcutRow keys="drag" label="drag empty space to orbit the camera" />
            <ShortcutRow keys="wheel" label="scroll wheel to zoom" />
            <ShortcutRow keys="right-click" label="right-click a cube for the context menu" />
          </div>
          <div className="mt-3 pt-3 border-t border-white/10">
            <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/35 mb-2">
              the city
            </div>
            <p className="font-mono text-[10.5px] leading-relaxed text-white/55 italic">
              files are cubes. languages are districts. the stack fills upward
              piece-by-piece as files finish. pull the city apart to see what
              is wired to what — the surface (frontend) is held up by the
              wiring, which rests on the foundation (backend).
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-white/10">
            <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/35 mb-2">
              status colors
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {STATUS.filter((s) => s !== 'removed').map((s) => (
                <div key={s} className="flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-[1px] border border-white/25"
                    style={{ background: STATUS_DOT[s] }}
                  />
                  <span className="font-mono text-[10px] text-white/70">
                    {STATUS_LABEL[s]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ShortcutRow({ keys, label }: { keys: string; label: string }) {
  return (
    <div className="flex items-center gap-3 py-0.5">
      <kbd
        className="font-mono text-[10px] text-white/85 bg-white/10 border border-white/20 rounded-sm px-2 py-0.5 min-w-[64px] text-center"
        style={{ fontFamily: 'var(--font-geist-mono), monospace' }}
      >
        {keys}
      </kbd>
      <span className="font-mono text-[10.5px] text-white/65">{label}</span>
    </div>
  );
}
