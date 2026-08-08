'use client';

import { memo } from 'react';
import { District } from '@/lib/plat/types';
import { stratumOf, STRATA } from '@/lib/plat/types';
import { CUBE, UNIT } from '@/lib/plat/iso';
import { themeOf } from '@/lib/plat/theme';
import { usePlat } from '@/lib/plat/store';
import { Cube } from './Cube';
import { districtProgress } from '@/lib/plat/store';

interface BuildingProps {
  district: District;
  separated: boolean;
  focused: boolean; // is this district's stratum the focused one
  districtFocused: boolean; // is this district individually focused
  dimmed: boolean; // dimmed by focus or filter
  selected: { districtId: string; path: string } | null;
  hovered: { districtId: string; path: string } | null;
  colorblindMode: boolean;
  query: string;
  showStackNumbers: boolean;
  onSelect: (districtId: string, path: string) => void;
  // Takes the cube's identity plus whether it's now hovered, so this component
  // can hand the callback straight to each Cube instead of wrapping it in a
  // fresh closure per file (which defeated Cube's memo).
  onHover: (districtId: string, path: string, hovered: boolean) => void;
}

const E = CUBE * UNIT;
const PAD = E * 1.5; // base pad footprint
const PAD_DEPTH = E * 1.05;

function BuildingImpl({
  district,
  separated,
  focused,
  districtFocused,
  dimmed,
  selected,
  hovered,
  colorblindMode,
  query,
  showStackNumbers,
  onSelect,
  onHover,
}: BuildingProps) {
  const stratum = stratumOf(district.id);
  const lift = separated ? stratum.lift : 0;
  const { built, total } = districtProgress(district);
  const pct = total ? Math.round((built / total) * 100) : 0;

  // Theme palette — drives label background, ink color, and ground glow so
  // the building reads correctly in paper / blueprint / dark themes.
  const theme = usePlat((s) => s.view.theme);
  const palette = themeOf(theme);
  const ink = palette.ink;
  const labelBg = palette.labelBg;

  // File count breakdown by status
  const doneCount = district.files.filter((f) => f.status === 'done').length;
  const inProgressCount = district.files.filter((f) => f.status === 'in_progress').length;
  const plannedCount = district.files.filter((f) => f.status === 'planned').length;

  // Stratum role badge
  const STRATUM_BADGE: Record<string, { label: string; color: string }> = {
    surface: { label: 'UI', color: '#c96442' },
    wiring: { label: 'pipes', color: '#6aa0d8' },
    foundation: { label: 'data', color: '#7a8a72' },
  };
  const badge = STRATUM_BADGE[stratum.id] ?? { label: '', color: '' };

  // The building group sits at the anchor; its children stack upward.
  const ax = district.anchor.x;
  const az = district.anchor.z;
  const rot = district.anchor.rot;

  return (
    <div
      className="plat-building"
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: 0,
        height: 0,
        transformStyle: 'preserve-3d',
        transform: `translate3d(${ax * UNIT}px, 0px, ${az * UNIT}px)`,
        opacity: dimmed ? 0.08 : 1,
        transition: 'opacity 380ms ease, transform 520ms cubic-bezier(.2,.7,.2,1)',
        zIndex: focused ? 20 : districtFocused ? 15 : 1,
      }}
    >
      {/* ground shadow ellipse — enhanced with district color glow for focused building */}
      <div
        style={{
          position: 'absolute',
          width: PAD * 1.25,
          height: PAD * 0.95,
          left: '50%',
          top: '50%',
          marginLeft: -(PAD * 1.25) / 2,
          marginTop: -(PAD * 0.95) / 2,
          transform: `rotateX(90deg) translateZ(0.1px)`,
          background: `radial-gradient(ellipse, ${districtFocused ? district.color : ink}${districtFocused ? '35' : '22'} 0%, ${districtFocused ? district.color : ink}${districtFocused ? '10' : '00'} 70%)`,
          pointerEvents: 'none',
        }}
      />
      {/* soft ambient occlusion shadow — a wider, darker, more diffuse
          elliptical shadow under the cube stack. Simulates the soft contact
          shadow the stack would cast on the ground, giving the cubes more
          visual weight and addressing the "flat cube materials" VLM note.
          Stacks with more cubes cast a slightly larger shadow. */}
      <div
        style={{
          position: 'absolute',
          width: PAD * 1.9,
          height: PAD * 1.35,
          left: '50%',
          top: '50%',
          marginLeft: -(PAD * 1.9) / 2,
          marginTop: -(PAD * 1.35) / 2,
          transform: `rotateX(90deg) translateZ(0.08px)`,
          background: `radial-gradient(ellipse 50% 60% at 50% 50%, ${ink}30 0%, ${ink}18 35%, ${ink}08 60%, transparent 85%)`,
          pointerEvents: 'none',
          opacity: dimmed ? 0 : 0.85,
          transition: 'opacity 380ms ease',
          // No filter: blur() here. This element sits inside the preserve-3d
          // world, so a filter forces it onto its own layer and re-rasterises
          // every frame the camera moves — ten of them, once per district. The
          // gradient's own falloff (transparent by 85%) already reads as soft.
        }}
      />
      {/* ambient glow ring — a subtle district-colored ring on the ground that
          makes each building feel grounded and "lit from within" */}
      <div
        style={{
          position: 'absolute',
          width: PAD * 1.6,
          height: PAD * 1.2,
          left: '50%',
          top: '50%',
          marginLeft: -(PAD * 1.6) / 2,
          marginTop: -(PAD * 1.2) / 2,
          transform: 'rotateX(90deg) translateZ(0.05px)',
          background: `radial-gradient(ellipse, ${district.color}12 0%, transparent 60%)`,
          pointerEvents: 'none',
          opacity: dimmed ? 0 : 0.8,
          transition: 'opacity 380ms ease',
        }}
      />

      {/* base pad — the district's footprint on the ground, rotated to fight the grid */}
      <div
        style={{
          position: 'absolute',
          width: PAD,
          height: PAD_DEPTH,
          left: '50%',
          top: '50%',
          marginLeft: -PAD / 2,
          marginTop: -PAD_DEPTH / 2,
          transform: `rotateX(90deg) translateZ(-0.5px) rotateZ(${rot}rad)`,
          background: districtFocused ? `${district.color}25` : `${district.color}1a`,
          border: `1px solid ${districtFocused ? district.color : `${district.color}66`}`,
          boxShadow: districtFocused
            ? `0 0 0 1px ${district.color}55, 0 0 20px ${district.color}30, inset 0 0 0 4px ${district.color}15`
            : `0 0 0 1px ${ink}11, inset 0 0 0 4px ${district.color}0d`,
          pointerEvents: 'none',
          transition: 'background 380ms ease, border-color 380ms ease, box-shadow 380ms ease',
        }}
      />

      {/* stratum survey pin — a small triangular marker on the ground plane
          showing the district's stratum role (frontend/connective/backend).
          Acts as a surveyor's pin on the ground, colored by stratum. */}
      <div
        className="plat-stratum-pin"
        data-stratum={stratum.id}
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 0,
          height: 0,
          transformStyle: 'preserve-3d',
          transform: `translate3d(${PAD * 0.48}px, 0, ${PAD_DEPTH * 0.35}px) rotateX(90deg) translateZ(0.3px)`,
          pointerEvents: 'none',
          opacity: dimmed ? 0.15 : 0.7,
          transition: 'opacity 380ms ease',
        }}
      >
        <div
          style={{
            width: 0,
            height: 0,
            borderLeft: '4px solid transparent',
            borderRight: '4px solid transparent',
            borderBottom: `7px solid ${stratum.color}`,
            filter: `drop-shadow(0 0 2px ${stratum.color}66)`,
          }}
        />
      </div>

      {/* the stack of cubes — one per file, bottom to top in declared order */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          transformStyle: 'preserve-3d',
          transform: `translate3d(0, ${-lift * UNIT}px, 0)`,
          transition: 'transform 620ms cubic-bezier(.2,.7,.2,1)',
        }}
      >
        {district.files.map((f, i) => {
          if (f.status === 'removed') return null;
          const cy = (i + 0.5) * CUBE;
          const isSel =
            selected?.districtId === district.id && selected.path === f.path;
          const isHov =
            hovered?.districtId === district.id && hovered.path === f.path;
          // Search highlight: a cube matches the query if its path includes it.
          const matchesQuery =
            query.length > 0 && f.path.toLowerCase().includes(query);
          return (
            <Cube
              key={f.path}
              cube={f}
              districtId={district.id}
              color={district.color}
              x={0}
              y={cy}
              z={0}
              stackIndex={i}
              stackTotal={district.files.length}
              selected={isSel}
              hovered={isHov}
              dimmed={false}
              colorblindMode={colorblindMode}
              highlighted={matchesQuery}
              showStackNumber={showStackNumbers}
              onSelect={onSelect}
              onHover={onHover}
            />
          );
        })}

        {/* the "next ghost" — a faint outline of where the next file would go,
            so the stack reads as in-progress assembly, not a finished column */}
        {(() => {
          const lastBuilt = [...district.files]
            .map((f, i) => ({ f, i }))
            .filter(({ f }) => f.status !== 'planned' && f.status !== 'removed')
            .pop();
          if (!lastBuilt) return null;
          const nextIdx = lastBuilt.i + 1;
          const nextFile = district.files[nextIdx];
          if (!nextFile || nextFile.status !== 'planned') return null;
          return (
            <div
              style={{
                position: 'absolute',
                width: E,
                height: E,
                left: '50%',
                top: '50%',
                marginLeft: -E / 2,
                marginTop: -E / 2,
                transformStyle: 'preserve-3d',
                transform: `translate3d(0, ${-((nextIdx + 0.5) * CUBE) * UNIT}px, 0)`,
                pointerEvents: 'none',
                opacity: 0.6,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  border: `1px dashed ${district.color}80`,
                  transform: `translateZ(${E / 2}px)`,
                }}
              />
              {/* tiny 'next' label on ghost face */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: `translateZ(${E / 2 + 0.5}px)`,
                  fontFamily: 'var(--font-geist-mono), monospace',
                  fontSize: 7,
                  color: `${district.color}bb`,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}
              >
                next
              </div>
            </div>
          );
        })()}
      </div>

      {/* label billboard — floats above the building. Wrapped in a single
          solid-background plate so the multi-row label never collides with
          cables or other labels — the whole label group reads as one
          anchored tag, not a stack of floating text fragments. */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: `translate3d(0, ${-(lift + district.files.length * CUBE + 0.9) * UNIT}px, 0)`,
          transition: 'transform 620ms cubic-bezier(.2,.7,.2,1), opacity 380ms ease',
          pointerEvents: 'none',
          textAlign: 'center',
          whiteSpace: 'nowrap',
          opacity: dimmed ? 0.18 : 1,
        }}
      >
        {/* name badge — the primary identifier. Drawn first so the plate
            below can tuck under it without overlap. */}
        <div
          style={{
            fontFamily: 'var(--font-geist-mono), monospace',
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: ink,
            // The district tint layered over the theme's label plate. This
            // used to be a bare 13%-alpha tint made legible by a backdrop
            // blur — but a backdrop-filter inside the preserve-3d world forces
            // the compositor to re-read and re-blur the city behind it on
            // every camera frame, ten times over. An opaque plate underneath
            // does the same job for the reader and costs nothing to move.
            background: `linear-gradient(0deg, ${district.color}${districtFocused ? '30' : '22'}, ${district.color}${districtFocused ? '30' : '22'}), ${labelBg}`,
            border: `1px solid ${districtFocused ? district.color : `${district.color}55`}`,
            borderRadius: 3,
            padding: '3px 8px',
            transform: 'translateX(-50%)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            boxShadow: districtFocused
              ? `0 0 12px ${district.color}40, 0 0 4px ${district.color}20`
              : `0 2px 8px ${ink}15`,
          }}
        >
          {district.name}
          {/* stratum role badge */}
          {badge.label && (
            <span
              style={{
                fontSize: 7,
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: badge.color,
                background: `${badge.color}20`,
                border: `0.5px solid ${badge.color}55`,
                borderRadius: 2,
                padding: '0 3px',
                lineHeight: '14px',
              }}
            >
              {badge.label}
            </span>
          )}
          <span style={{ opacity: 0.6, marginLeft: 2, fontWeight: 400 }}>
            {built}/{total}
          </span>
          {/* district focus indicator */}
          {districtFocused && (
            <span
              style={{
                fontSize: 6,
                fontWeight: 800,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: district.color,
                background: `${district.color}25`,
                border: `0.5px solid ${district.color}60`,
                borderRadius: 2,
                padding: '0 3px',
                lineHeight: '14px',
                animation: 'plat-glow-pulse 2s ease-in-out infinite',
              }}
            >
              FOCUSED
            </span>
          )}
        </div>
        {/* detail plate — a single solid-background container that holds the
            stratum ribbon, breakdown, tag, progress bar, and stratum dots.
            Putting them all on one plate eliminates the visual clutter of
            five floating text fragments stacked above each other. */}
        <div
          style={{
            transform: 'translateX(-50%)',
            display: 'inline-block',
            marginTop: 3,
            padding: '4px 8px 5px',
            background: labelBg,
            border: `0.5px solid ${district.color}40`,
            borderRadius: 3,
            boxShadow: `0 2px 6px ${ink}22, inset 0 0 0 0.5px ${ink}33`,
            // No backdrop blur: `labelBg` is already a 91%-opaque plate, so
            // there was never anything visible behind this to blur — it was
            // paying full compositor price for an invisible effect.
          }}
        >
          {/* stratum color ribbon — the district's stratum assignment at a glance */}
          <div
            style={{
              width: 22,
              height: 2,
              borderRadius: 1,
              background: stratum.color,
              boxShadow: `0 0 4px ${stratum.color}66`,
              margin: '0 auto 3px',
            }}
          />
          {/* file count breakdown: done✓ inProgress◐ planned○ */}
          <div
            style={{
              fontFamily: 'var(--font-geist-mono), monospace',
              fontSize: 8.5,
              color: '#efe9dc',
              opacity: 0.85,
              letterSpacing: '0.04em',
              whiteSpace: 'nowrap',
              marginBottom: 1,
            }}
          >
            <span style={{ color: '#9bc59e' }}>{doneCount}</span><span style={{ opacity: 0.5 }}>✓</span>{' '}
            <span style={{ color: '#e8a93a' }}>{inProgressCount}</span><span style={{ opacity: 0.5 }}>◐</span>{' '}
            <span style={{ color: '#efe9dc99' }}>{plannedCount}</span><span style={{ opacity: 0.5 }}>○</span>
          </div>
          {/* tag — the district's one-line role description */}
          <div
            style={{
              fontFamily: 'var(--font-geist-mono), monospace',
              fontSize: 8.5,
              color: '#efe9dc',
              opacity: 0.55,
              fontStyle: 'italic',
              whiteSpace: 'nowrap',
              marginBottom: 3,
            }}
          >
            {district.tag}
          </div>
          {/* mini progress bar — built/total proportion */}
          <div
            style={{
              width: 36,
              height: 3,
              borderRadius: 1.5,
              background: `${district.color}33`,
              overflow: 'hidden',
              boxShadow: `inset 0 0 0 0.5px ${district.color}40`,
              margin: '0 auto 3px',
            }}
          >
            <div
              style={{
                width: `${pct}%`,
                height: '100%',
                background: district.color,
                borderRadius: 1.5,
                transition: 'width 320ms ease',
                boxShadow: `0 0 4px ${district.color}88`,
              }}
            />
          </div>
          {/* stratum indicator — three dots showing which layer this district
              lives in (filled = this one, hollow = the others) */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 3,
            }}
          >
            {STRATA.map((s) => (
              <span
                key={s.id}
                style={{
                  display: 'inline-block',
                  width: s.id === stratum.id ? 9 : 5,
                  height: 2,
                  borderRadius: 1,
                  background: s.id === stratum.id ? stratum.color : 'transparent',
                  border: `0.5px solid ${s.color}${s.id === stratum.id ? 'aa' : '40'}`,
                  opacity: s.id === stratum.id ? 1 : 0.6,
                  transition: 'all 200ms ease',
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export const DistrictBuilding = memo(BuildingImpl);
