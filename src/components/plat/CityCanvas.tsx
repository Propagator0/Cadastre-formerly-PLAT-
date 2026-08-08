'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePlat } from '@/lib/plat/store';
import {
  BOARD,
  UNIT,
  worldTransform,
  scenePerspective,
  projectPoint,
} from '@/lib/plat/iso';
import { STRATA, stratumOf } from '@/lib/plat/types';
import { INK, PAPER, PAPER_DARK } from '@/lib/plat/color';
import { themeOf } from '@/lib/plat/theme';
import { DistrictBuilding } from './DistrictBuilding';
import { Cables } from './Cables';
import { SectionedPillars } from './SectionedPillars';
import { MiniMap } from './MiniMap';
import { CubeTooltip } from './CubeTooltip';
import { CityHealth } from './CityHealth';
import { LegendPanel } from './LegendPanel';
import { ElevationRuler } from './ElevationRuler';

// The checkered ground plane, rendered as a flat rotated div with an SVG
// checker data-URI so the squares stay crisp at any zoom.
function checkerDataUri(size: number, a: string, b: string): string {
  const s = size;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${s * 2}' height='${s * 2}'>
    <rect width='${s * 2}' height='${s * 2}' fill='${a}'/>
    <rect x='0' y='0' width='${s}' height='${s}' fill='${b}'/>
    <rect x='${s}' y='${s}' width='${s}' height='${s}' fill='${b}'/>
  </svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

export function CityCanvas() {
  const tower = usePlat((s) => s.tower);
  const view = usePlat((s) => s.view);
  const selected = usePlat((s) => s.selected);
  const hovered = usePlat((s) => s.hovered);
  const links = usePlat((s) => s.links);
  const statusFilter = usePlat((s) => s.statusFilter);
  const query = usePlat((s) => s.query);
  const loading = usePlat((s) => s.loading);
  const setCamera = usePlat((s) => s.setCamera);
  const selectCube = usePlat((s) => s.selectCube);
  const setHovered = usePlat((s) => s.setHovered);

  const dragRef = useRef<{ x: number; y: number; yaw: number; pitch: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  // Mouse position for the cube tooltip — only track when hovered
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  useEffect(() => {
    if (!hovered) return;
    const onMove = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [hovered]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      // only start orbit when clicking empty space (the canvas itself)
      if (e.target !== e.currentTarget && (e.target as HTMLElement).dataset.ground !== '1') return;
      dragRef.current = {
        x: e.clientX,
        y: e.clientY,
        yaw: view.yaw,
        pitch: view.pitch,
      };
      setDragging(true);
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [view.yaw, view.pitch],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const dx = e.clientX - d.x;
      const dy = e.clientY - d.y;
      let yaw = d.yaw + dx * 0.4;
      const pitch = Math.max(22, Math.min(78, d.pitch + dy * 0.3));
      // Grid-snap: round yaw to nearest 45° increment when gridSnap is on.
      // Makes screenshots cleaner and views repeatable.
      if (usePlat.getState().view.gridSnap) {
        yaw = Math.round(yaw / 45) * 45;
      }
      setCamera({ yaw, pitch });
    },
    [setCamera],
  );

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    dragRef.current = null;
    setDragging(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
  }, []);

  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      const next = Math.max(0.5, Math.min(1.9, view.zoom - e.deltaY * 0.0012));
      setCamera({ zoom: next });
    },
    [view.zoom, setCamera],
  );

  const focus = view.focusStratum;
  const focusDist = view.focusDistrict;
  const q = query.trim().toLowerCase();

  // The current viewport theme palette — drives bg, ground, ink, fog, grid
  // colors so the same city can be read in different "lights" (paper /
  // blueprint / dark).
  const theme = themeOf(view.theme);
  const paper = theme.paper;
  const paperDark = theme.paperDark;
  const ink = theme.ink;
  const inkSoft = theme.inkSoft;

  return (
    <div
      className="plat-canvas"
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        background: `radial-gradient(ellipse at 50% 35%, ${theme.bg[0]} 0%, ${theme.bg[1]} 60%, ${theme.bg[2]} 100%)`,
        cursor: dragging ? 'grabbing' : 'grab',
        perspective: scenePerspective(),
        perspectiveOrigin: '50% 42%',
        touchAction: 'none',
        // expose theme colors as CSS vars so children (DistrictBuilding labels,
        // Cube edges, etc.) can read them without prop drilling. Falls back to
        // the warm PAPER/INK defaults if a child doesn't override.
        // @ts-expect-error — custom CSS vars on style
        '--plat-ink': ink,
        '--plat-ink-soft': inkSoft,
        '--plat-paper': paper,
        '--plat-label-bg': theme.labelBg,
        '--plat-cube-glow-boost': theme.cubeGlowBoost,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
      onClick={() => selectCube(null)}
    >
      {/* the world — preserve-3d, rotated/scaled by the camera */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 0,
          height: 0,
          transformStyle: 'preserve-3d',
          transform: worldTransform(view),
          transition: dragging ? 'none' : 'transform 120ms linear',
        }}
      >
        {/* the ground — checkered grid plane */}
        <div
          data-ground="1"
          style={{
            position: 'absolute',
            width: BOARD * 2 * UNIT,
            height: BOARD * 2 * UNIT,
            left: '50%',
            top: '50%',
            marginLeft: -(BOARD * UNIT),
            marginTop: -(BOARD * UNIT),
            transform: 'rotateX(90deg) translateZ(0px)',
            backgroundImage: checkerDataUri(UNIT, paper, paperDark),
            backgroundSize: `${UNIT * 2}px ${UNIT * 2}px`,
            border: `1px solid ${ink}22`,
            boxShadow: `0 0 0 1px ${ink}11, inset 0 0 120px ${ink}14`,
            transformStyle: 'preserve-3d',
          }}
        >
          {/* compass markings at the board edges */}
          {[-BOARD, BOARD].map((edge) => (
            <div
              key={`mx${edge}`}
              style={{
                position: 'absolute',
                left: edge === -BOARD ? 0 : 'auto',
                right: edge === BOARD ? 0 : 'auto',
                top: '50%',
                width: 1,
                height: BOARD * 2 * UNIT,
                background: `${ink}22`,
                transform: 'translateY(-50%)',
              }}
            />
          ))}
          {/* cardinal scale ticks along the X axis (every 2 units) — gives the
              ground plane a surveyed-plate feel and helps judge distances. */}
          {Array.from({ length: BOARD + 1 }, (_, i) => i - BOARD / 2).filter((_, i) => i % 2 === 0).map((tick) => (
            <div
              key={`tx${tick}`}
              style={{
                position: 'absolute',
                left: `${50 + (tick / BOARD) * 50}%`,
                top: 0,
                width: 1,
                height: BOARD * 2 * UNIT,
                background: `${ink}10`,
                transform: 'translateX(-50%)',
                pointerEvents: 'none',
              }}
            />
          ))}
          {/* cardinal scale ticks along the Z axis */}
          {Array.from({ length: BOARD + 1 }, (_, i) => i - BOARD / 2).filter((_, i) => i % 2 === 0).map((tick) => (
            <div
              key={`tz${tick}`}
              style={{
                position: 'absolute',
                left: 0,
                top: `${50 + (tick / BOARD) * 50}%`,
                width: BOARD * 2 * UNIT,
                height: 1,
                background: `${ink}10`,
                transform: 'translateY(-50%)',
                pointerEvents: 'none',
              }}
            />
          ))}
        </div>

        {/* stratum floor slabs — when sectioned, each layer gets a translucent
            floor at its lift height with a big label, so the separation reads
            as three distinct plates, not a subtle lift */}
        {view.separated &&
          STRATA.map((s) => {
            const isFocus = focus === s.id;
            const isDim = focus !== null && !isFocus;
            return (
              <div
                key={s.id}
                style={{
                  position: 'absolute',
                  width: BOARD * 2 * UNIT,
                  height: BOARD * 2 * UNIT,
                  left: '50%',
                  top: '50%',
                  marginLeft: -(BOARD * UNIT),
                  marginTop: -(BOARD * UNIT),
                  transform: `rotateX(90deg) translateZ(${s.lift * UNIT}px)`,
                  transformStyle: 'preserve-3d',
                  pointerEvents: 'none',
                  opacity: isDim ? 0.35 : 1,
                  transition: 'opacity 380ms ease',
                }}
              >
                {/* the slab itself — solid enough to read as a floor, with a
                    visible edge frame so the layer reads as a physical plate */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    border: `2px ${isFocus ? 'solid' : 'dashed'} ${s.color}`,
                    background: isFocus
                      ? `linear-gradient(135deg, ${s.color}22 0%, ${s.color}0e 40%, transparent 80%)`
                      : `linear-gradient(135deg, ${s.color}14 0%, ${s.color}08 40%, transparent 80%)`,
                    boxShadow: isFocus
                      ? `0 0 0 2px ${s.color}55, 0 0 24px ${s.color}30, inset 0 0 0 1px ${s.color}33, inset 0 0 180px ${s.color}28, inset 0 0 500px ${s.color}0c, 0 8px 32px ${s.color}22`
                      : `0 0 0 1px ${ink}18, 0 0 12px ${s.color}08, inset 0 0 200px ${s.color}12, 0 4px 16px ${ink}18`,
                  }}
                />
                {/* cross-hatch floor pattern — subtle grid lines so the slab
                    reads as a surveyed floor, not a translucent sheet */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: `
                      linear-gradient(90deg, ${s.color}11 1px, transparent 1px),
                      linear-gradient(0deg, ${s.color}11 1px, transparent 1px)
                    `,
                    backgroundSize: `${UNIT * 2}px ${UNIT * 2}px`,
                    opacity: isDim ? 0.25 : 0.6,
                  }}
                />
                {/* secondary finer grid (measurement ticks) */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: `
                      linear-gradient(90deg, ${s.color}08 1px, transparent 1px),
                      linear-gradient(0deg, ${s.color}08 1px, transparent 1px)
                    `,
                    backgroundSize: `${UNIT}px ${UNIT}px`,
                    opacity: isDim ? 0.15 : 0.4,
                  }}
                />
                {/* corner ticks — a CAD/blueprint detail so each slab reads as a
                    surveyed plate, not a translucent sheet */}
                {[
                  { top: 0, left: 0 },
                  { top: 0, right: 0 },
                  { bottom: 0, left: 0 },
                  { bottom: 0, right: 0 },
                ].map((pos, i) => (
                  <div
                    key={i}
                    style={{
                      position: 'absolute',
                      width: 18,
                      height: 18,
                      border: `2px solid ${s.color}`,
                      opacity: isDim ? 0.5 : 0.95,
                      ...pos,
                    }}
                  />
                ))}
                <div
                  style={{
                    position: 'absolute',
                    left: 24,
                    top: 24,
                    fontFamily: 'var(--font-geist-mono), monospace',
                    fontSize: 28,
                    fontWeight: 800,
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    color: s.color,
                    textShadow: `0 1px 0 ${paper}, 0 0 24px ${s.color}40, 0 0 4px ${paper}`,
                  }}
                >
                  {s.name}
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      opacity: 0.75,
                      marginTop: 3,
                      letterSpacing: '0.06em',
                      textTransform: 'none',
                      fontStyle: 'italic',
                      color: ink,
                    }}
                  >
                    {s.gloss}
                  </div>
                  {/* elevation tag — shows the lift height in world units,
                      so the sectioned view reads as a surveyed cross-section */}
                  <div
                    style={{
                      fontSize: 9,
                      fontWeight: 400,
                      opacity: 0.5,
                      marginTop: 4,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: ink,
                      fontStyle: 'normal',
                    }}
                  >
                    elev. +{s.lift.toFixed(1)}u
                  </div>
                </div>
              </div>
            );
          })}

        {/* compass rose — N/E/S/W markers on the board edges */}
        {['N', 'E', 'S', 'W'].map((dir) => {
          const angle = { N: 0, E: 90, S: 180, W: 270 }[dir]!;
          const rad = (angle * Math.PI) / 180;
          const cx = Math.sin(rad) * (BOARD - 2.5);
          const cz = -Math.cos(rad) * (BOARD - 2.5);
          return (
            <div
              key={dir}
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: 0,
                height: 0,
                transformStyle: 'preserve-3d',
                transform: `translate3d(${cx * UNIT}px, 0px, ${cz * UNIT}px) rotateX(90deg) translateZ(1px)`,
                pointerEvents: 'none',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-geist-mono), monospace',
                  fontSize: 14,
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  color: `${ink}55`,
                  textShadow: `0 0 6px ${ink}22`,
                  transform: `translate(-50%, -50%) rotateZ(${-view.yaw}deg)`,
                  whiteSpace: 'nowrap',
                }}
              >
                {dir}
              </div>
            </div>
          );
        })}

        {/* atmospheric fog layer — a subtle radial vignette that darkens the
            board edges and gives the city a sense of atmosphere and depth */}
        <div
          data-ground="1"
          style={{
            position: 'absolute',
            width: BOARD * 2 * UNIT,
            height: BOARD * 2 * UNIT,
            left: '50%',
            top: '50%',
            marginLeft: -(BOARD * UNIT),
            marginTop: -(BOARD * UNIT),
            transform: 'rotateX(90deg) translateZ(0.2px)',
            background: `radial-gradient(ellipse 60% 55% at 50% 50%, transparent 0%, ${theme.fog}08 40%, ${theme.fog}18 70%, ${theme.fog}30 100%)`,
            pointerEvents: 'none',
            transformStyle: 'preserve-3d',
          }}
        />

        {/* stratum ground zone tinting — when NOT sectioned, each building
            casts a subtle stratum-colored halo on the ground plane so the
            frontend/backend split is visible even without section mode */}
        {!view.separated && tower.districts.map((d) => {
          const stratum = stratumOf(d.id);
          const dx = d.anchor.x * UNIT;
          const dz = d.anchor.z * UNIT;
          const radius = UNIT * 2.2;
          return (
            <div
              key={`zone-${d.id}`}
              style={{
                position: 'absolute',
                width: radius * 2,
                height: radius * 2,
                left: '50%',
                top: '50%',
                marginLeft: dx - radius,
                marginTop: dz - radius,
                transform: 'rotateX(90deg) translateZ(0.15px)',
                background: `radial-gradient(ellipse, ${stratum.color}0c 0%, ${stratum.color}06 40%, transparent 70%)`,
                pointerEvents: 'none',
                transformStyle: 'preserve-3d',
              }}
            />
          );
        })}

        {/* the buildings */}
        {tower.districts.map((d) => {
          const stratum = stratumOf(d.id);
          const isStratumFocus = focus === stratum.id;
          const isDistrictFocus = focusDist === d.id;
          const isDim =
            (focus !== null && !isStratumFocus) ||
            (focusDist !== null && !isDistrictFocus) ||
            !d.files.some((f) => statusFilter.has(f.status)) ||
            (q.length > 0 &&
              !d.files.some((f) => f.path.toLowerCase().includes(q)) &&
              !d.name.toLowerCase().includes(q) &&
              !d.tag.toLowerCase().includes(q));
          return (
            <DistrictBuilding
              key={d.id}
              district={d}
              separated={view.separated}
              focused={isStratumFocus || isDistrictFocus}
              districtFocused={isDistrictFocus}
              dimmed={isDim}
              selected={selected}
              hovered={hovered}
              colorblindMode={view.colorblindMode}
              query={q}
              showStackNumbers={view.showStackNumbers}
              onSelect={(districtId, path) => selectCube({ districtId, path })}
              onHover={setHovered}
            />
          );
        })}
      </div>

      {/* sectioned pillars overlay — 2D SVG pillars holding up the strata.
          Render BEFORE cables so cables draw on top. */}
      <SectionedPillars />

      {/* elevation ruler — vertical axis on the right of the scene showing
          each stratum's lift height + role label, so sectioned mode reads as
          a surveyed cross-section. Sits between pillars and cables so cables
          still draw on top of the ruler. */}
      <ElevationRuler />

      {/* cables overlay — 2D SVG projected to match the 3D scene */}
      <Cables />

      {/* mini-map (top-right corner) — top-down plan view + camera indicator */}
      <MiniMap />

      {/* cube hover tooltip — shows file info when hovering a cube */}
      <CubeTooltip
        tower={tower}
        hovered={hovered}
        mouseX={mousePos.x}
        mouseY={mousePos.y}
        links={links}
      />

      {/* city health dashboard — compact analytics widget */}
      <CityHealth />

      {/* legend panel — strata + status colors + keyboard shortcuts */}
      <LegendPanel />

      {/* loading overlay */}
      {loading && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: `radial-gradient(ellipse at 50% 35%, ${theme.bg[0]} 0%, ${theme.bg[1]} 60%, ${theme.bg[2]} 100%)`,
            zIndex: 50,
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                fontFamily: 'var(--font-geist-mono), monospace',
                fontSize: 28,
                fontWeight: 800,
                letterSpacing: '0.2em',
                color: ink,
                marginBottom: 12,
              }}
            >
              PLAT
            </div>
            <div
              style={{
                width: 120,
                height: 2,
                background: `${ink}22`,
                borderRadius: 1,
                overflow: 'hidden',
                margin: '0 auto',
              }}
            >
              <div
                style={{
                  width: '40%',
                  height: '100%',
                  background: ink,
                  borderRadius: 1,
                  animation: 'plat-load-slide 1.2s ease-in-out infinite',
                }}
              />
            </div>
            <div
              style={{
                fontFamily: 'var(--font-geist-mono), monospace',
                fontSize: 10,
                color: `${ink}55`,
                marginTop: 8,
                fontStyle: 'italic',
              }}
            >
              mapping the city…
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
