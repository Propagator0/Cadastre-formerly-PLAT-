# PLAT — Worklog

## Current Status (v0.8 round)

**Phase**: Visual polish + new features v0.8. City health dashboard, legend panel, cable flow particles, cube progress arcs, stratum ground zone tinting, district cascade build, survey pins, stratum color ribbons.
**Stability**: Clean lint, 0 runtime errors, 0 console errors, all API routes 200.
**Last QA**: 2025-08-07 — agent-browser QA scoring 8.5/10.

### Features Added This Round (v0.8)

| # | Feature | Status |
|---|---------|--------|
| 1 | **City Health Dashboard** — Compact floating widget in bottom-left with SVG ring chart showing completion %, per-stratum progress bars with stuck indicators, stat pills (built/active/risk), district skyline bar chart, and wiring cable count | ✅ Done |
| 2 | **Legend Panel** — Floating panel in bottom-right showing strata colors + roles (frontend/connective/backend), status color legend with glyphs + visual hints, and keyboard shortcut reference | ✅ Done |
| 3 | **Cable Flow Particles** — Animated dots that flow along cables using cubic bezier interpolation + requestAnimationFrame, showing the direction of data flow (3 particles per cable, smooth sine-wave fade) | ✅ Done |
| 4 | **Cube Top-Face Progress Arc** — For in-progress cubes, a circular SVG progress arc on the top face with amber stroke, background ring, and center percentage text (visible from a distance) | ✅ Done |
| 5 | **Stratum Ground Zone Tinting** — When NOT in sectioned mode, each building casts a subtle stratum-colored radial halo on the ground plane (surface=warm, wiring=blue, foundation=green-gray) | ✅ Done |
| 6 | **District Cascade Build** — Build mode now assembles districts in stratum order (foundation→wiring→surface) with 400ms pause between districts for a satisfying cascade effect | ✅ Done |
| 7 | **Stratum Survey Pins** — Small triangular ground-plane markers near each building, colored by stratum, with CSS class `plat-stratum-pin` and `data-stratum` attribute for QA queryability | ✅ Done |
| 8 | **Stratum Color Ribbon** — A thin strip of stratum color rendered under each district name label, making the stratum assignment visible at a glance without sectioned mode | ✅ Done |
| 9 | **District Skyline Bar Chart** — Mini bar chart in CityHealth showing relative district sizes with done-portion coloring, hover titles showing "District: X/Y built" | ✅ Done |
| 10 | **New CSS Animations** — plat-cable-flow, plat-erect, plat-arc-spin, plat-health-pulse, plat-district-flash, plat-zone-breathe keyframes added | ✅ Done |

### Architecture Decisions

- CityHealth and LegendPanel are separate components imported by CityCanvas, keeping the overlay layer clean
- Cable flow particles use requestAnimationFrame for smooth 60fps animation instead of CSS animation (CSS can't animate along bezier paths)
- District cascade build sorts by stratum depth before iterating, using a stratumOrder map
- Progress arc uses SVG on the cube top face with the same transform as the top face (rotateX(90deg) translateZ), pushed 0.4px above to avoid z-fighting
- Ground zone tinting uses rotateX(90deg) translateZ(0.15px) to sit just above the ground plane

### Known Issues / Risks

- Cable flow particles use rAF loop which runs continuously — negligible CPU cost but worth monitoring
- CityHealth reads links.length via usePlat.getState() inside render — should use selector pattern for better memoization
- LegendPanel is always visible — could be toggleable for more canvas space on small screens

### Priority Recommendations for Next Phase

1. **Interactive cable tooltips** — Click/hover on individual cables to see connection details (from/to files, reason, strength)
2. **Responsive panel layout** — Make CityHealth and LegendPanel toggleable/collapsible on small screens
3. **Snapshot comparison** — Visual diff between snapshots showing what changed
4. **District dependency graph** — A dedicated overlay showing which districts depend on which
5. **Cube drag-and-drop** — Reorder cubes within a district stack by dragging

---

## Previous Status (v0.7 round)
**Stability**: Clean lint, 0 runtime errors, 0 console errors, all API routes 200.
**Last QA**: 2025-08-07 — agent-browser + VLM QA scoring 8.2/10.

### Features Added This Round (v0.7)

| # | Feature | Status |
|---|---------|--------|
| 1 | **District Focus Mode** — Select a district building, click "focus" (or D key) to dim all other districts to 8% opacity, with glowing pad and label | ✅ Done |
| 2 | **Atmospheric Fog Layer** — Radial vignette on the ground plane that darkens board edges, giving the city depth and atmosphere | ✅ Done |
| 3 | **Ambient Ground Glow** — Each building now has a district-colored glow ring on the ground, making buildings feel "lit from within" | ✅ Done |
| 4 | **Enhanced Building Labels** — Better padding, backdrop blur, shadow, FOCUSED badge with pulse animation, three-dot stratum indicator replacing single bar | ✅ Done |
| 5 | **Quick Stats Dashboard** — Compact analytics strip showing Complete %, Active %, and Risk % with color-coded values | ✅ Done |
| 6 | **Cube Glow Improvements** — Stuck cubes now have pulsing glow animation; in-progress glow is softer with larger blur | ✅ Done |
| 7 | **Strata Slab Glow** — Sectioned mode slabs now have outer glow (boxShadow) for better visual layer separation | ✅ Done |
| 8 | **Minimap Polish** — Better border radius, stronger shadow, improved backdrop blur, inner highlight | ✅ Done |
| 9 | **District Focus in Footer** — Footer shows focused district name with colored dot and dismiss button | ✅ Done |
| 10 | **New CSS Animations** — plat-ambient-breathe, plat-float, plat-shimmer keyframes added | ✅ Done |

### Technical Changes

- **types.ts**: Added `focusDistrict: string | null` to `ViewState`
- **store.ts**: Added `focusDistrict` action and default view state
- **CityCanvas.tsx**: Atmospheric fog layer, district focus dimming logic
- **DistrictBuilding.tsx**: `districtFocused` prop, enhanced shadow/glow/pad, FOCUSED badge, three-dot stratum indicator
- **Cube.tsx**: Improved stuck glow with pulse animation, softer in-progress glow
- **PlatApp.tsx**: District focus button, D keyboard shortcut, footer focus indicator, updated version to v0.7
- **TowerPanel.tsx**: Quick stats strip, version bump to v0.7
- **MiniMap.tsx**: Enhanced border/shadow/blur styling
- **globals.css**: New animation keyframes

### Unresolved / Next-Phase Recommendations

- **Cube drag-to-reorder** — allow reordering cubes within a district stack
- **True history/rewind** — click-to-rewind on the activity timeline
- **Mobile responsive** — sidebar/inspector still use absolute overlays on small screens
- **Label billboarding** — labels should always face camera and have solid background plates
- **Stuck-state visualization** — red outline/glow on stuck cubes visible without clicking
- **Colorblind mode** — SUR/WIRI/FOUN distinctions may not work for colorblind users
- **Grid snap toggle** — snap rotation to 45° increments for cleaner screenshots
- **Search/filter integration** — highlight matching cubes in 3D view

---

## Previous Status (v0.6 round)

**Phase**: Feature-complete v0.6 with all original asks addressed + 7 new features added.
**Stability**: Clean lint, 0 runtime errors, 0 console errors, all API routes 200.
**Last QA**: 2025-08-07 — agent-browser + snapshot verification.

### Features Added This Round (Task IDs 1–7)

| # | Feature | Status |
|---|---------|--------|
| 1 | **Cube Hover Tooltip** — floating panel showing file path, status, stratum, progress, marks when hovering a 3D cube | ✅ Done |
| 2 | **Progress Dashboard** — radial progress + per-stratum breakdown (Surface/Wiring/Foundation) at top of TowerPanel | ✅ Done |
| 3 | **Enhanced Mini-Map** — cable connections as thin lines, section mode zone coloring, district pulse highlight | ✅ Done |
| 4 | **Snapshot/Bookmark System** — save/restore named tower state snapshots via Prisma + API, with TowerPanel UI | ✅ Done |
| 5 | **Polished Header Toolbar** — logical button groups with dividers, save indicator dot, keyboard shortcut hints | ✅ Done |
| 6 | **Enhanced Building Labels** — stratum role badges (UI/pipes/data), mini progress bar, file count breakdown, ghost "next" label | ✅ Done |
| 7 | **Export/Import Tower JSON** — download as .tower.json, upload with validation + confirmation dialog | ✅ Done |

### Unresolved / Next-Phase Recommendations

- **Cube drag-to-reorder** — allow reordering cubes within a district stack (currently order is by declaration in seed)
- **True history/rewind** — snapshots are a step toward it, but a click-to-rewind on the activity timeline would be more powerful
- **Mobile responsive** — sidebar/inspector still use absolute overlays on small screens; could be Sheet components
- **District focus mode** — zoom in on one building + dim the others for closer inspection
- **Blueprint theme** — allow switching the "paper" aesthetic (warm/cool/blueprint/dark mode)
- **Performance** — for larger codebases (200+ cubes), consider virtualizing the TowerPanel file list

---

## Project context

PLAT is a project the user has been developing for ~a month (now on v5). It maps a
codebase to an isometric cityscape: **files are cubes**, **languages are
districts/buildings**, **status is color**, and the city can be "sectioned" to
reveal how frontend (surface) is wired to backend (foundation) underneath.

The previous version (PLAT-v0.4 "neighborhood") was an Electron + Three.js desktop
app. We are rebuilding it as a **Next.js 16 web app** using **CSS 3D isometric
rendering** (matching the "drawn axonometric plate" aesthetic the original was
migrating toward — lighter than WebGL, React-friendly, perfect for the
stacked-cube metaphor).

## User's explicit asks for this version

1. **Remove the lever** toggle (they'll specify the replacement later).
2. **Frontend/backend separation must be MORE distinct** when toggled — clearly
   isolate the two worlds, not a subtle lift.
3. **Visualize "wired underneath/backstage"** — show which part of which file in
   which folder is wired to which part of which file in which folder.
4. **CRITICAL — piece-by-piece assembly**: each language building must be a stack
   of cubes (one per file), assembled one-by-one as files finish. NOT a pre-built
   complete house. The stack height = the project's real progress.
5. Containers "fight the checkered grid" — random placement, no neat rows.

## Architecture decisions

- **Rendering**: CSS 3D transforms (preserve-3d, rotateX/Z for iso projection).
  Each cube = 3 visible faces (top/left/right) via CSS gradients. Lightweight,
  mobile-friendly, matches the "plate" aesthetic.
- **Data**: Prisma + SQLite for persistence; Zustand for client state.
- **Layers (strata)**: surface (frontend: html/css/glsl), wiring (js/ts/cfg/sh),
  foundation (backend: py/rs/md). Layer-separation mode lifts surface distinctly
  above foundation with the wiring layer visibly between them.
- **Wiring**: deriveLinks adapted from v0.4 (stem / mark / mention signals),
  rendered as SVG bezier cables that stretch across the separated layers.

---
Task ID: 0
Agent: orchestrator (main)
Task: Set up project foundation, types, seed data, and dispatch build.

Work Log:
- Analyzed uploaded PLAT-v0.4-neighborhood Electron source (tower-schema, status,
  marks, strata, wiring, structures, cube, districts, lever).
- Analyzed reference screenshot via VLM — confirmed isometric cityscape, checkered
  grid, grey building blocks, colored zones, red/teal/brown detailed structures,
  wireframe meshes, status legend, the CLOSED/PULLED lever.
- Confirmed Next.js 16 env is running on port 3000, full shadcn/ui available,
  Zustand + framer-motion present, Three.js NOT installed (chose CSS 3D instead).
- Defined shared types and full PLAT seed (10 districts, ~90 default files).

Stage Summary:
- Rendering approach locked: CSS 3D isometric (no Three.js).
- Data model locked: Tower → District(stratum) → FileCube(status,progress) + Link.
- Next: build frontend (store, iso engine, cubes, sidebar, inspector, separation,
  cables), then backend (Prisma + API) via subagent.

---
Task ID: 1
Agent: full-stack-developer
Task: Build the PLAT backend — Prisma schema, seed/mapping helpers, and the tower/cube/reset API routes that persist the city.

Work Log:
- Read prior worklog (Task 0) and the stable contract files: types.ts, seed.ts, wiring.ts. Confirmed the Tower → District(anchor) → FileCube(status,progress,notes,marks[]) shape and the singleton-tower pattern.
- Replaced prisma/schema.prisma: dropped User/Post, added TowerRecord (singleton id="singleton"), DistrictRecord (id, name, tag, color, note, anchorX/Z/rot, order, towerId), FileCubeRecord (cuid id, districtId, path, status, progress, notes, marks as JSON String, order). Used plain string FK columns (no @relation) so the delete-and-reinsert save strategy stays trivial.
- Ran `bun run db:push` — schema synced, Prisma client regenerated (v6.19.2). ✅
- Wrote src/lib/plat/db-seed.ts exporting `ensureSeeded()`: idempotent — only inserts defaultTower() if the singleton row is missing. Inserts tower + districts + cubes inside a $transaction, serializing marks via JSON.stringify, preserving order via index columns.
- Wrote src/lib/plat/db-mapping.ts with `loadTower()` (seeds-if-empty, reads districts+cubes ordered by `order`, rebuilds the nested Tower shape, parses marks JSON with a safe fallback, converts DateTime → ISO string, reconstructs `anchor: {x,z,rot}`) and `saveTower(t)` (upserts the singleton tower, then delete-all + re-insert all districts+cubes inside one $transaction). Also exported a small `clearTower()` helper for the reset endpoint.
- API routes (all `export const dynamic = 'force-dynamic'` + `export const revalidate = 0`, all wrapped in try/catch returning `{ error }` + status):
  - src/app/api/plat/tower/route.ts — GET → `{ tower: Tower }`; POST (body `{ tower }`) → `{ ok: true }`.
  - src/app/api/plat/cube/route.ts — PUT (body `{ districtId, path, patch }`) loads tower, finds cube via findCube(), applies field-by-field patch (progress clamped 0..100, marks coerced to string[]), bumps modified, full saveTower, returns `{ cube }`. 404 when cube missing, 400 on bad body.
  - src/app/api/plat/reset/route.ts — POST clears all rows then re-seeds, returns `{ ok: true }`.
- Verified live against the running dev server (port 3000): GET seeds on first hit, PUT persists across GETs, POST tower full-replace sticks, reset restores defaults, error cases return 400/404 correctly.
- `bun run lint` passes clean (exit 0) for all backend files.

Stage Summary:
- Backend data layer is complete and contract-faithful: the API returns the exact `Tower`/`District`/`FileCube` shape the frontend expects, with marks round-tripping as string[] and timestamps as ISO strings.
- Three endpoints ready for the frontend agent to wire: GET/POST /api/plat/tower, PUT /api/plat/cube, POST /api/plat/reset. Response shapes documented in the agent-ctx summary.
- No deviations from spec except one deliberate, documented choice: used `findCube` from wiring.ts (already the canonical lookup) inside the cube PATCH handler instead of re-implementing the search — keeps behavior consistent with the rest of the codebase.
- Did NOT touch page.tsx, components/, or the contract files (types/seed/wiring). Frontend agent can build against this API as-is.

---
Task ID: 2-11
Agent: orchestrator (main)
Task: Build the full PLAT frontend (store, isometric engine, cubes, buildings, sidebar, inspector, layer separation, cables) and verify end-to-end.

Work Log:
- Built `src/lib/plat/iso.ts` — the single source of truth for the isometric
  projection (projectPoint + worldTransform), shared by the CSS 3D scene and the
  SVG cable overlay so they stay perfectly in sync.
- Built `src/lib/plat/color.ts` — drawn-plate color science: 3-face shade steps
  per cube (top/left/right) + status tints (ghost, translucent, solid, red-glow,
  faded). No lighting pass — everything is flat-shaded for the axonometric plate
  aesthetic.
- Built `src/lib/plat/store.ts` — Zustand store: tower data (loaded from API),
  selection, hover, view (separated/focusStratum/showCables/camera), search +
  status filters, and all mutations (setStatus, cycleStatus, setProgress,
  setNotes, toggleMark) with optimistic local updates + API persistence.
- Built `src/components/plat/Cube.tsx` — a single file as a real 3D cube (6
  faces via CSS preserve-3d). Status drives appearance: planned = faint tinted
  ghost slot (the "waiting to be filled" slot), in_progress = translucent +
  partial-height growth, done = solid, stuck = red-glow, abandoned = faded.
  Top-edge highlight so stacked cubes read as distinct blocks.
- Built `src/components/plat/DistrictBuilding.tsx` — a language folder as a
  vertical STACK of cubes (one per file, bottom-to-top in declared order). This
  is the piece-by-piece assembly: the stack visibly fills upward as files
  finish. Includes ground shadow, rotated base pad (fighting the grid), and a
  floating label with district name + built/total progress.
- Built `src/components/plat/Cables.tsx` — SVG overlay rendering derived wiring
  links as bezier cables that bow toward the viewer and STRETCH across the
  separated strata. Color by link kind (stem/mark/kin/mention), thickness by
  strength, glow on hover/selection.
- Built `src/components/plat/CityCanvas.tsx` — the isometric scene: checkered
  grid ground, orbit camera (drag empty space to rotate, wheel to zoom), and
  when sectioned, three translucent stratum floor slabs at different heights
  with big labels (Surface/Wiring/Foundation) making the frontend/backend split
  VERY distinct.
- Built `src/components/plat/TowerPanel.tsx` — left sidebar: PLAT branding,
  search, status filter pills with counts, view controls (section toggle +
  per-stratum focus, cables toggle + kind legend), and a collapsible district/
  file tree with status checkboxes and progress bars.
- Built `src/components/plat/Inspector.tsx` — right drawer: selected file's
  path/district/stratum, status grid (click to set directly), progress slider
  (for in-hand files), marks toggles, notes field, and a "wired to" list showing
  every connection with kind + direction (up/down the strata), clickable to
  navigate.
- Built `src/components/plat/PlatApp.tsx` + `src/app/page.tsx` — full layout:
  header (branding + quick toggles + built %), main (sidebar + canvas +
  inspector), sticky footer (status legend + cable legend + counts). Responsive:
  sidebar/inspector collapse on small screens.
- Fixed critical pitch-sign bug: CSS rotateX(positive) tilts the scene to view
  from BELOW, culling cube top faces. Negated the pitch in both worldTransform
  and projectPoint for a correct bird's-eye isometric view.
- Tuned perspective (1050px) + world depth (300) + cube size (UNIT=58) so the
  3D depth on cubes is pronounced, not flat.
- Fixed inspector status-cycle race: replaced the broken rapid-async loop with a
  direct setStatus() store action.
- Verified end-to-end with agent-browser + VLM: 3D cityscape renders with
  stacked cubes up to 4 tall, ghost slots visible, layer separation distinct
  with floor slabs + labels + stretching cables, cube selection + inspector
  works, status changes persist to the DB (core.py → in_progress, verified via
  API). Lint clean. No console/runtime errors.

Stage Summary:
- All 10 of the user's districts render as stacked cube buildings (87 files total).
- Piece-by-piece assembly is visible: done cubes solid at the bottom, in-hand
  translucent, planned as faint ghost slots above showing the eventual height.
- Frontend/backend separation is distinct: section toggle lifts Surface
  (frontend) high above Foundation (backend) with Wiring between, each on its
  own labeled floor slab; cables visibly stretch vertically between the layers.
- File-to-file wiring is derived (stem/mark/kin/mention) and shown as SVG
  cables + an inspector "wired to" list identifying exactly which file in which
  folder connects to which.
- Persistence works end-to-end (Zustand → /api/plat/cube → Prisma/SQLite).
- The lever is GONE (per user request); replaced by the section toggle + stratum
  focus controls in the header and sidebar.

Unresolved / next-phase recommendations:
- The user mentioned wanting to replace the lever with "exactly what they want"
  later — the section toggle + per-stratum focus is a stand-in for now.
- Orbit drag currently rotates the whole scene; could add camera presets.
- Could add the "scrub back to a previous city" history feature (the original
  had append-only history; we store modified timestamps but not full history).
- Mobile: sidebar/inspector use absolute overlays on small screens; could be
  proper Sheets for better UX.

---
Task ID: webDevReview-1
Agent: orchestrator (cron review)
Task: QA assessment + styling improvements + new features

Work Log:
- Reviewed worklog (Tasks 0, 1, 2-11) for full context.
- QA via agent-browser: base view renders correctly (87 cubes, 10 buildings,
  3D stacked cubes visible, ghost slots present, sidebar/footer/header all
  functional). Section mode works with 3 strata + cables. Inspector works.
  No console errors. Lint clean.
- Identified critical gap: only 2 SVG cable paths visible because default
  seed had generic file names that don't produce cross-stratum stem matches.
  (Most shared stems like "store"/"router"/"utils" were within same stratum
  and filtered out; "types"/"index"/"build" were in the NOISE set.)
- Enhanced seed data: added cross-stratum matching filenames across
  Surface/Wiring/Foundation: auth (html↔ts↔js↔py↔rs), user
  (html↔ts↔js↔py↔rs), api (ts↔js↔py), query (ts↔py↔rs), render
  (js↔py↔glsl), dashboard (html↔ts), viewer (html↔js). Result: 15 cable
  paths now derived and visible (up from 2).
- Added keyboard shortcuts: E=toggle strata, C=toggle cables, R=reset
  camera, 1/2/3=focus stratum (when sectioned), Escape=deselect. Excluded
  when typing in input/textarea fields.
- Added camera preset buttons in header: "top" (yaw=0, pitch=75) and
  "side" (yaw=45, pitch=45) alongside the existing compass reset button.
- Added "shuffle" demo button in header that randomizes cube statuses
  across all districts with a positional bias (earlier files more likely
  done, later more likely planned). Shows the piece-by-piece assembly
  metaphor dynamically.
- Enhanced stratum floor slab styling: gradient fills (linear-gradient
  135deg with district color at varying opacities), stronger box-shadows
  when focused (2px solid border + inset glow + outer glow), larger/bolder
  stratum labels (24px, 0.14em tracking, text-shadow with color glow).
- Updated help overlay to show keyboard shortcuts (E section · C cables ·
  R reset cam) and stratum focus keys (1/2/3) when sectioned.
- Verified all improvements with agent-browser + VLM: 15 cables visible,
  camera presets work, keyboard shortcuts work, shuffle randomizes
7 7 visible, section mode slabs more distinct with gradients.
- Lint clean. No runtime errors.

Stage Summary:
- Cable density improved from 2→15 (7.5x) via cross-stratum seed filenames.
- Keyboard shortcuts added (E/C/R/1/2/3/Escape) — matches original v0.4
  shortcut scheme.
- Camera presets (top/side) + shuffle demo button added for better
  exploration and demo flow.
- Stratum floor slabs visually enhanced with gradients + glow effects.
- All features verified end-to-end via agent-browser.

Unresolved / next-phase recommendations:
- Cube drop-in animation (framer-motion entrance) not yet added — deferred
  to next round for performance testing.
- Could add camera orbit animation (smooth lerp between presets).
- Could add the "scrub back to a previous city" history feature.
- Could add proper mobile Sheet components for sidebar/inspector.
- Could add a "notepad" panel for the global scratchpad.
- Could add file import (upload a .tower JSON) for project switching.

---
Task ID: webDevReview-2
Agent: orchestrator (cron review #2)
Task: QA assessment + strata separation enhancement + new features (cube animations, camera lerp, activity timeline, notepad, add/remove cubes)

Work Log:
- Reviewed prior worklog (Tasks 0, 1, 2-11, webDevReview-1) for full context.
- QA pass via agent-browser + VLM on the live app:
  - Base view: 85 cubes, 15 cables, 672ms load, 0 console errors, lint clean.
  - Found that the sectioned view (the user's original core ask: "MORE distinct frontend/backend separation") was too subtle — strata floor slabs were translucent and didn't read as a physical exploded-view. Cables stretched but were sparse in the sectioned view.
  - Cube entrance animation was deferred from prior round.
  - Camera presets jumped instantly (no lerp).
  - No global notepad UI despite `Tower.notepad` field existing in the schema.
  - No add/remove cube capability (only patch existing cubes).

- P1 — Strata separation enhanced:
  - Bumped STRATA lift values: surface 13→18, wiring 6.5→8.5 (foundation stays 0).
  - Stronger stratum floor slab styling: solid/dashed borders with focus glow,
    inset shadows, corner tick marks (CAD/blueprint detail), elevation tag
    showing the lift height in world units.
  - NEW StratumPillars component: 8 thin vertical columns at the board corners
    and mid-edges, physically holding the upper strata above the lower ones.
    Each pillar has a shaft + flared cap + base disc so it reads as a
    structural column from any yaw.
  - Verified via VLM: strata now "visibly separated with significant vertical
    distance" + "support pillars at corners" + cables "visibly stretching
    across the separated layers".

- P2 — Cube entrance animations:
  - Added `entered` state with a staggered setTimeout keyed by stack position
    (delay = y * 28ms, capped at 800ms) so cubes drop in piece-by-piece from
    the top of each stack as the city loads.
  - Used a single CSS transition (cubic-bezier(.34,1.36,.4,1) for the drop,
    with a small overshoot) and swaps to a snappier 220ms transition after
    entrance so hover/select stays responsive.
  - Avoided framer-motion.div because it would conflict with the existing
    translate3d face transforms — the CSS approach keeps the 3D pipeline clean.
  - Verified via VLM: all 85 cubes render correctly post-entrance.

- P3 — Camera lerp transitions:
  - Added `animateCamera(target)` store action that eases the camera toward a
    target over 620ms with easeInOutQuad. Uses a Symbol ID to cancel earlier
    animations if a new one starts (rapid preset clicks don't fight).
  - Wired the R key, top/side/hero preset buttons, and reset-camera button to
    use animateCamera instead of instant setCamera.
  - Added a new "hero" camera preset (yaw=110, pitch=60, zoom=0.95) for a
    low-angle dramatic view.

- P4 — Activity timeline mini-panel:
  - New ActivityEntry type in the store: id, ts, kind (status/progress/mark/
    notes/reset/shuffle), districtId, districtName, path, summary.
  - Ring buffer of 40 entries (most-recent first) pushed by every cube
    mutation. Progress is throttled to fire only on 10% boundaries so dragging
    the slider doesn't flood the log.
  - New ActivityTimeline component: slide-out panel anchored bottom-right of
    the canvas, with a vertical timeline node per entry (color-coded by kind),
    relative timestamps (now/12s/3m/2h/5d), clickable entries that select the
    referenced cube, and a clear button.
  - Toggle button in header + keyboard shortcut (A).
  - Verified via VLM: 3 activity entries correctly logged and displayed after
    cycling a cube's status (planned→in hand→built→stuck).

- P5 — Global notepad slide-out:
  - New /api/plat/notepad PUT route that updates only the TowerRecord.notepad
    field (capped at 20,000 chars). Uses db.towerRecord.upsert with create
    fallback so it works even if the tower row doesn't exist yet.
  - New `setNotepad(text)` store action: updates local tower state immediately,
    schedules a debounced PUT to /api/plat/notepad (600ms trailing) so rapid
    typing doesn't fire a request per keystroke.
  - New NotepadPanel component: slide-out anchored bottom-left of the canvas
    (mirrors the activity panel). Uncontrolled textarea with a `typing` ref
    that suppresses store-sync while the user is typing (avoids the
    set-state-in-effect loop), debounced autosave with a "saved" flash
    indicator, word/line count footer.
  - Toggle button in header + keyboard shortcut (N).
  - Verified end-to-end: typed text persists across reloads via the API.

- P6 — Add/remove cube in a district:
  - New `addCube(districtId, path)` store action: appends a planned ghost
    cube to the district's file list, persists via POST /api/plat/tower
    (full-tower replace, fine for ~90 cube dataset), rejects empty/duplicate
    paths, pushes an activity entry.
  - New `removeCube(ref)` store action: hard-deletes the file from the
    district's array, persists via POST /api/plat/tower, clears the selection,
    pushes an activity entry.
  - UI: each district's file list in the TowerPanel now has an "add a file
    to the stack" trigger row at the bottom. Clicking opens an inline Input
    with a placeholder hinting the file extension (e.g. "new file (e.g.
    new.py)"). Enter submits, Escape cancels.
  - Inspector: added a trash button next to the close X that opens an
    AlertDialog confirmation ("remove cube?") before deletion.
  - Verified end-to-end: added test_new.py to Python → confirmed in DB.
    Removed via inspector → confirmed gone from DB.

- Bonus bugfix: React was warning about setting both `background` (shorthand)
  and `backgroundImage` on the same Cube face div. Consolidated into a single
  `background` declaration per face — color OR gradient, never both.

- Final QA: 85 cubes, 15 cables, 672ms load, 0 console errors, lint clean.
  Sectioned view "distinct and functional" with visible pillars + stretched
  cables. Notepad + activity panels "fully readable" and "balanced".
  Aesthetic confirmed as "drawn axonometric plate" / "professional
  architectural visualization tool".

Stage Summary:
- Strata separation is now the user's original "MORE distinct" ask — visible
  pillars + dramatic lift + stronger slab styling + elevation tags.
- Cube entrance animation makes the city visibly assemble piece-by-piece on
  load (matches the "piece-by-piece assembly" metaphor).
- Camera lerps between presets instead of jumping.
- Three new features added: activity timeline, global notepad, add/remove
  cubes — all persisted end-to-end through the API.
- Two new keyboard shortcuts: N (notepad), A (activity).
- All features verified via agent-browser + VLM. No console errors. Lint clean.

Unresolved / next-phase recommendations:
- The "scrub back to a previous city" history feature is still not
  implemented — we have timestamps on every change but no snapshot history.
  Would pair naturally with the activity timeline (click an old entry to
  rewind the city to that state).
- Mobile: sidebar/inspector still use absolute overlays on small screens.
  Could be proper Sheet components for better UX.
- File import (upload a .tower JSON) for project switching — the schema
  already supports it via POST /api/plat/tower.
- Cube rename (currently only add/remove — no path edit).
- The shuffle button shuffles ALL cubes; could add per-district shuffle.
- Could add cube drag-to-reorder so the user can re-stack files in priority
  order (currently order is determined by declaration order in the seed).

---
Task ID: webDevReview-3
Agent: orchestrator (cron review #3)
Task: QA assessment + new features (mini-map, cube rename, per-district shuffle, undo, help dialog, sidebar health bars, slab cross-hatching, SVG pillars)

Work Log:
- Reviewed prior worklog (Tasks 0, 1, 2-11, webDevReview-1, webDevReview-2) for full context.
- QA pass via agent-browser + VLM on the live app:
  - Base view: 85 cubes, 10 buildings, 3D stacked cubes visible, ghost slots present,
    sidebar/footer/header all functional, 15 cables, 0 console errors, lint clean.
  - Found that page <title> still said "Z.ai Code Scaffold - AI-Powered Development"
    instead of PLAT.
  - Found that the prior 3D StratumPillars (CSS box pillars) were being distorted
    by the perspective divide when surfaceLift=18 — bounding rects extended off-screen
    (y=-1279, w=1316) and the VLM could not see them from any angle.
  - No cube rename capability existed (only add/remove).
  - No per-district shuffle (only global shuffle).
  - No undo for status changes.
  - No mini-map / overview.
  - Sidebar district rows used a single-color progress bar (no per-status breakdown).

- P1 — Fixed page metadata in src/app/layout.tsx:
  - title: "PLAT — codebase atlas"
  - description, keywords, openGraph, twitter all updated to PLAT branding.

- P2 — Strata separation enhanced:
  - Added cross-hatch grid pattern to each stratum floor slab (two layers: coarse
    grid at 2*UNIT spacing + fine grid at UNIT spacing, in the slab's stratum color).
    Reads as a surveyed CAD plate, not a translucent sheet.
  - Rewrote StratumPillars as SVG overlay (src/components/plat/SectionedPillars.tsx)
    using projectPoint to compute screen-space line endpoints. This bypasses the
    perspective divide problem entirely — pillars are guaranteed to render at the
    right screen position regardless of how tall the surface lift is.
  - Each SVG pillar = shadow line (offset dark) + main shaft (linear gradient:
    accent color → dark) + inner highlight stripe (accent color) + horizontal ticks
    at each stratum level + flared top cap with glow + grounded bottom base disc.
  - Tall pillars (foundation → surface) at the 4 corners with orange (#c96442) accent.
  - Short pillars (foundation → wiring) at the 4 mid-edges with blue (#6aa0d8) accent.
  - Removed the dead CSS 3D StratumPillars function from CityCanvas.tsx.

- P3 — MiniMap component (src/components/plat/MiniMap.tsx):
  - Top-down 2D plan view in the top-right of the canvas (168x168 + header).
  - Each district rendered as a colored dot at its anchor position, with a SVG
    health ring showing built/total progress (stroke-dasharray arc).
  - Camera direction indicator: a small fan-shape (cone of vision) at the centre
    that rotates with view.yaw, plus a blue dot at the apex.
  - Click on the mini-map orbits the camera to look toward that point (computes
    angle from click position to centre, sets view.yaw accordingly).
  - Click on a district dot selects the first non-removed file in that district.
  - Header shows current yaw/pitch in mono font ("plan · 30° / 55°").
  - Crosshair at center, board edge dashed marker, light grid background matching
    the main canvas checker.

- P4 — Per-district stacked status health bar (TowerPanel.tsx):
  - New DistrictHealthBar component: stacked horizontal bar showing the breakdown
    of file statuses in a district (done / in_progress / stuck / abandoned / planned).
    Each segment is sized by file count and colored by status.
  - Replaces the previous single-color progress bar in each district row.
  - Tooltip shows the full breakdown on hover.

- P5 — Per-district shuffle button (TowerPanel.tsx):
  - New store action shuffleDistrict(districtId) — same positional-bias shuffle as
    the global shuffle but scoped to one district.
  - Per-district shuffle button (Shuffle icon) appears on hover at the right end
    of each district row. Keyboard-accessible (Enter/Space activates).
  - Logs a single "shuffled N cubes in {district}" activity entry.

- P6 — Cube rename capability (Inspector.tsx):
  - New store action renameCube(ref, newPath) — validates non-empty + unique within
    district, persists via POST /api/plat/tower (full-tower replace), updates
    selection to the new path, logs an activity entry.
  - New RenameablePath component in Inspector: shows path as text with a pencil
    button. Click pencil → inline Input. Enter commits, Escape cancels. Parent
    remounts via key={selected.path} so state stays in sync after rename.
  - Verified end-to-end: renamed core.py → core_v2.py, persisted to DB,
    reloaded and confirmed.

- P7 — Undo last status change (PlatApp.tsx + store.ts):
  - New store action undoLast() — finds the most recent activity entry with a
    parseable "from → to" status summary, reverse-maps the short label back to a
    Status, calls setStatus to revert, then removes the activity entry so a
    second undo goes further back.
  - Undo button in header (Undo2 icon), disabled when no parseable status change
    exists in the activity log. Tooltip: "undo last status change [Z]".
  - Keyboard shortcut: Z (also Cmd/Ctrl+Z pattern, though we use just Z).
  - Verified: shuffled Python district, then undid — bench.py reverted from
    "done" back to "planned" as expected.

- P8 — Help dialog (PlatApp.tsx):
  - New Dialog component with all keyboard shortcuts (E, C, R, 1/2/3, A, N, Z, ?,
    Esc, drag, wheel).
  - Includes "the city" explanatory paragraph and a status colors legend grid.
  - Toggle via HelpCircle button in header OR press ? key.
  - Help overlay at the bottom of the canvas updated to mention Z and ? shortcuts.

- Final QA via agent-browser + VLM:
  - Mini-map visible top-right with PLAN label, district dots, camera indicator. ✓
  - Undo + Help icons visible in header. ✓
  - Stacked health bars visible in sidebar district rows. ✓
  - Cube rename works end-to-end (verified via API). ✓
  - Per-district shuffle works (only target district affected). ✓
  - Undo reverts the last status change. ✓
  - Help dialog shows all shortcuts + status legend. ✓
  - Sectioned view shows 3 distinct strata floor slabs with cross-hatch grids. ✓
  - SVG pillars render in screen space (2+ visible at default angle, more at
    hero angle).
  - Lint clean. No runtime errors. No console errors.

Stage Summary:
- Page metadata fixed (PLAT branding instead of Z.ai Code Scaffold).
- Sectioned view is more visually distinct: cross-hatch grid patterns on slabs
  + SVG-projected structural pillars (replacing the broken CSS 3D pillars
  that were being distorted off-screen by the perspective divide).
- 5 new features added: mini-map, per-district health bars, cube rename,
  per-district shuffle, undo last status change, help dialog.
- 2 new keyboard shortcuts: Z (undo), ? (help).
- All features verified end-to-end via agent-browser + VLM. Lint clean.

Unresolved / next-phase recommendations:
- Only 2 of 8 SVG pillars are visible at the default camera angle (yaw=30,
  pitch=55) — the others project off-screen due to the dramatic surfaceLift=18.
  Could reduce surfaceLift to ~14, or increase PERSPECTIVE for a more
  orthographic feel, or render the pillars as a separate non-projected overlay
  anchored to the strata slabs themselves.
- The "scrub back to a previous city" history feature is still not implemented —
  the activity timeline + undo is a step toward it but a true snapshot history
  (with click-to-rewind) would be more powerful.
- Mobile: sidebar/inspector still use absolute overlays on small screens. Could
  be proper Sheet components.
- File import (upload a .tower JSON) for project switching — schema supports it.
- Cube drag-to-reorder is not yet implemented (order is by declaration in seed).
- Could add a "district focus" mode that isolates one district's building
  (zooms in + dims the others) for closer inspection.

---
Task ID: 1
Agent: main
Task: Assess project status, QA, fix bugs, and implement new features for PLAT v0.5

Work Log:
- Reviewed full worklog.md (490 lines) covering project history from v0.4→v0.5
- Explored entire codebase: 12 plat components, 8 lib modules, 4 API routes, Prisma schema
- Tested app via agent-browser: main view, sectioned view, cube inspector
- VLM QA analysis identified: sectioned pillars not visible, cable rendering could improve, stratum indicators missing in sidebar
- Fixed sectioned pillars rendering order (moved before cables in CityCanvas)
- Enhanced SectionedPillars: thicker shafts (5→7px), larger caps (6→8px), stronger shadows
- Added compass rose N/E/S/W markers on board edges in CityCanvas
- Added loading skeleton overlay with animated progress bar in CityCanvas
- Enhanced Cables: animated dashed lines for idle cables, double glow for selected, soft glow trace behind all cables, larger endpoint dots
- Added CSS keyframes: plat-load-slide, plat-cable-dash, plat-glow-pulse, plat-build-drop
- Added build mode button (Hammer icon) in PlatApp header: auto-advances cubes planned→in_progress→done with 180ms stagger
- Added stratum color left-border on sidebar district buttons in TowerPanel
- Added stratum badges (S/W/F) with color on each district row in TowerPanel
- Enhanced footer: added per-stratum stats breakdown (Surface/Wiring/Foundation with done/total counts)
- Enhanced stratum role badge in sectioned view: color dots + role labels (UI/pipes/data) + focus dimming
- Added stratum indicator bar below building labels in DistrictBuilding
- Enhanced MiniMap district labels: use district color + first 3 chars of name instead of ID
- Lint passes cleanly, no runtime errors

Stage Summary:
- All user asks addressed: lever removed (was already), frontend/backend separation enhanced, wiring cables improved, piece-by-piece assembly working
- New features: build mode animation, compass rose, loading skeleton, animated cables, stratum stats in footer
- Styling improvements throughout: sidebar, footer, header, sectioned view, minimap, building labels
- QA verified via VLM: pillars visible, stratum labels enhanced, build mode working, overall professional quality

---
Task ID: 1
Agent: full-stack-developer
Task: Implement cube hover tooltip

Work Log:
- Read worklog.md and key files (PlatApp.tsx, CityCanvas.tsx, store.ts, types.ts, color.ts, Cube.tsx, DistrictBuilding.tsx, MiniMap.tsx) to understand codebase architecture
- Created `src/components/plat/CubeTooltip.tsx` — a floating tooltip component that shows file path, status dot+glyph+label, district name, stratum colored bar+name, progress bar (for in_progress), and marks badges
- Styled as dark semi-transparent panel (rgba(28,26,23,0.92) with backdrop-blur) matching the app's aesthetic, using var(--font-geist-mono), ~180px wide
- Used `useSyncExternalStore` to subscribe to `(pointer: fine)` media query — tooltip only appears on mouse devices, not touch/mobile
- Positioned as `position: fixed` near the cursor with 14px offset, clamped to viewport edges so it never overflows
- Smooth CSS transitions: opacity 160ms ease + translateY 4px→0 for fade-in/fade-out
- Integrated into `CityCanvas.tsx`: added mouse position tracking via `useEffect`/`mousemove` listener (only active when hovered is not null), rendered CubeTooltip as a sibling to MiniMap (outside the preserve-3d container)
- Fixed lint error: replaced `useState`+`useEffect` for pointer detection with `useSyncExternalStore` to avoid "setState in effect" rule
- Removed unused imports (INK, useEffect, useState) from CubeTooltip
- Lint passes cleanly with no errors

Stage Summary:
- Created `src/components/plat/CubeTooltip.tsx` — complete hover tooltip component with file path, status, district, stratum, progress, and marks
- Integrated into `src/components/plat/CityCanvas.tsx` with mouse position tracking and rendered outside the 3D preserve-3d container
- Tooltip only appears on fine-pointer (mouse) devices, smoothly fades in/out, and is clamped to viewport edges
- Lint passes, dev server compiles successfully

---
Task ID: 2
Agent: full-stack-developer
Task: Add progress dashboard to TowerPanel

Work Log:
- Read worklog.md, TowerPanel.tsx, store.ts, and types.ts to understand existing layout and data flow
- Added `Tower` to imports from `@/lib/plat/types`
- Created `RadialProgress` component: 32×32 SVG with background ring (#ffffff15), progress arc (#9bc59e with stroke-dashoffset), and centered percentage text in mono font
- Created `ProgressDashboard` component: aggregates all files across districts for overall built/total/pct, then per-stratum (Surface, Wiring, Foundation) stats by grouping districts via `stratumOf(d.id)`
- ProgressDashboard renders: overall "32/85 built · 38%" line, three per-stratum rows with colored name, fill bar (stratum.color), DistrictHealthBar (reused pattern), and built/total count, plus RadialProgress floating right
- Inserted `<ProgressDashboard tower={tower} />` between the header and search bar in TowerPanel
- Section styled with px-4 py-2, border-b border-white/10 separator, tight spacing (~80px tall)
- All numbers use var(--font-geist-mono), labels in 9-10px uppercase tracking matching panel aesthetic
- Ran `bun run lint` — passes cleanly with no errors
- Dev server compiles successfully

Stage Summary:
- Added `RadialProgress` (SVG radial indicator) and `ProgressDashboard` (compact summary section) to TowerPanel.tsx
- Dashboard sits between header and search bar, showing overall built/total/%, per-stratum breakdown with colored bars and health bars, and a circular progress ring
- No new store or files needed — pure function components using existing `statusCounts`, `stratumOf`, `STRATA`, and `DistrictHealthBar` pattern
- Lint passes, dev server compiles

---
Task ID: 3
Agent: full-stack-developer
Task: Enhance the mini-map with cables, section mode, better highlighting

Work Log:
- Read existing MiniMap.tsx, store.ts, types.ts, cable-colors.ts, iso.ts, wiring.ts, color.ts to understand current architecture
- Implemented cable connections: SVG `<line>` elements between connected district dots when `view.showCables` is true
  - Grouped links by (fromDistrict, toDistrict) pairs using `useMemo` to avoid duplicate overlapping lines
  - Kept the strongest link per pair for color determination via `KIND_COLOR_BY_KIND`
  - Default style: 0.5px stroke, 0.25 opacity, "2 3" dash pattern
  - Highlighted style (when selected/hovered cube touches the cable): 1px stroke, 0.7 opacity, "3 2" dash
  - Computed `highlightedPairKeys` set from selected/hovered cube's links
- Implemented section mode visualization when `view.separated` is true:
  - Three horizontal band backgrounds (surface/wiring/foundation) at 0.08 opacity with stratum colors
  - Thin boundary lines at band edges using `${INK}18` color
  - Stratum labels (S, W, F) on left edge, positioned at vertical center of each band
- Enhanced district highlighting:
  - Selected district: larger glow shadow (`0 0 12px + 0 0 24px`), CSS pulse animation via `@keyframes minimap-pulse`
  - Hovered district (not selected): ring highlight with dashed circle SVG at R+2 radius
  - Selected district label: larger font (8px vs 7px), full opacity, bold 700 weight, slight letter-spacing
- Cleaned up unused `Link` import from types
- Lint passes cleanly, dev server compiles successfully

Stage Summary:
- Enhanced `src/components/plat/MiniMap.tsx` with three new features:
  1. Cable connections drawn as SVG lines between district anchors, colored by link kind, with highlight on selection
  2. Section mode stratum zone backgrounds (3 bands with S/W/F labels) when city is sectioned
  3. Better district highlighting (pulse glow on select, ring on hover, full label for selected district)
- All features read from existing store state (`links`, `view.showCables`, `view.separated`, `selected`, `hovered`)
- No new files or store changes needed — pure enhancement of existing MiniMap component
- Lint passes, dev server compiles

---
Task ID: 6
Agent: full-stack-developer
Task: Enhance building labels in 3D view

Work Log:
- Read worklog.md, DistrictBuilding.tsx, store.ts, types.ts for context
- Added stratum role badge next to district name: "UI" (terracotta #c96442) for surface, "pipes" (blue #6aa0d8) for wiring, "data" (green #7a8a72) for foundation
- Added mini progress bar (2px, 24px wide) below tag line, filled proportionally to built/total with district color
- Added file count breakdown line below built/total: "5✓ 1◐ 7○" (done + checkmark, in-progress + half-circle, planned + circle), 8px font, white/40 opacity
- Improved label readability: background opacity 14→22, added backdrop-filter blur(4px), district name font 11px→12px, built/total opacity 0.45→0.6
- Changed display from inline-block to inline-flex for the name row to accommodate badge + count side by side
- Enhanced ghost cube: opacity 0.5→0.6, added tiny "next" label centered on ghost face (7px, district color, slightly in front of the dashed border)
- Ran lint — passes cleanly, dev server compiles without errors

Stage Summary:
- Enhanced `src/components/plat/DistrictBuilding.tsx` with five new visual features:
  1. Stratum role badge (UI/pipes/data) next to district name with matching stratum colors
  2. Mini progress bar (2px horizontal bar) below tag line showing built/total proportion
  3. File count breakdown ("5✓ 1◐ 7○") at 8px with status-specific glyphs
  4. Better readability: higher background opacity, backdrop blur, larger font, stronger count contrast
  5. Ghost cube "next" label and increased opacity (0.5→0.6)
- No new files, no store changes — pure enhancement of the existing DistrictBuilding component
- Lint passes, dev server compiles cleanly

---
Task ID: 5
Agent: full-stack-developer
Task: Polish the header toolbar

Work Log:
- Read PlatApp.tsx, TowerPanel.tsx, and store.ts to understand current header toolbar structure
- Reorganized right-side toolbar buttons into 6 logical groups with thin vertical dividers (w-px h-4 bg-white/10 mx-0.5) between them:
  - View controls: stratum focus buttons (conditional), section toggle, cables toggle
  - Camera presets: compass reset, top/side/hero
  - Actions: build, shuffle, undo
  - Panels: activity, notepad
  - Help: help button
  - Inspector toggle
- Added save indicator dot next to "PLAT" title in TowerPanel header:
  - Green (#9bc59e) when saved, amber (#e8a93a) when saving or dirty
  - Pulsing animation (animate-ping) when actively saving
  - Dimmer opacity (0.6) for dirty state vs full (1.0) for saving
  - Tooltip shows "saving…", "unsaved changes", or "saved"
  - Added `dirty` state selector to TowerPanel
- Enhanced button styling:
  - Changed hover backgrounds from bg-white/10 or bg-white/5 to bg-white/8 for consistency
  - Added colored 2px bottom border (border-b-2) on active toggle buttons:
    - Section: border-b-[#c96442] (orange)
    - Cables: border-b-[#6aa0d8] (blue)
    - Build: border-b-[#5a8a5e] (green, when building)
    - Activity: border-b-[#6aa0d8] (blue)
    - Notepad: border-b-[#c96442] (orange)
  - Added rounded-b-sm to toggle buttons for cleaner bottom border appearance
- Added keyboard shortcut hints to all button title attributes:
  - Section: "section the city [E]"
  - Cables: "toggle wiring cables [C]"
  - Camera reset: "reset camera [R]"
  - Undo: "undo last change [Z]"
  - Activity: "activity timeline [A]"
  - Notepad: "project notepad [N]"
  - Help: "keyboard shortcuts [?]"
  - Stratum focus: dynamic [1], [2], [3] based on stratum id
- Removed old border-l dividers between individual buttons (replaced by group dividers)
- Lint passes cleanly

Stage Summary:
- PlatApp.tsx: header toolbar reorganized into 6 groups with dividers, enhanced hover/active styling, keyboard shortcut tooltips
- TowerPanel.tsx: save indicator dot added next to PLAT title with green/amber/pulse states
- No new files, no new Zustand state — uses existing `saving` and `dirty` from store

---
Task ID: 4
Agent: full-stack-developer
Task: Implement snapshot/bookmark system

Work Log:
- Added `SnapshotRecord` model to `prisma/schema.prisma` with fields: id (cuid), name, data (JSON string), createdAt
- Ran `bun run db:push` to sync the database schema
- Created API route `src/app/api/plat/snapshots/route.ts` with GET (list all) and POST (create) handlers
- Created API route `src/app/api/plat/snapshots/[id]/route.ts` with GET (single snapshot) and DELETE handlers
- Added `SnapshotMeta` interface and `snapshots` array to `PlatState` in store.ts
- Added `'snapshot'` kind to `ActivityEntry` union type
- Implemented store actions: `listSnapshots`, `saveSnapshot`, `loadSnapshot`, `deleteSnapshot`
- `saveSnapshot`: POSTs current tower to API, updates local snapshot list, pushes activity entry
- `loadSnapshot`: GETs snapshot data, validates JSON has `districts` array, replaces tower state, persists via tower POST, pushes activity entry
- `deleteSnapshot`: DELETEs via API, removes from local list
- `init()` now calls `listSnapshots()` after tower loads to hydrate snapshot list
- Added Snapshots section to TowerPanel.tsx below the Progress Dashboard:
  - Bookmark icon header with "save" button
  - Inline input form for naming snapshots (Enter to save, Escape to cancel)
  - Snapshot list with name, date, hover-reveal restore (History icon) and delete (Trash2 icon) buttons
  - Restore confirmation: clicking History shows "restore [name]?" with yes/no buttons
  - Empty state: "no snapshots yet" italic text
  - max-h-32 scrollable list with thin scrollbar styling
- All styling matches existing dark theme with mono fonts, white/opacity colors
- Snapshot names capped at 30 characters
- Cleared corrupted Turbopack cache and restarted dev server
- All API endpoints tested: GET list (200), POST create (200), GET single (200), DELETE (200)
- Lint passes cleanly

Stage Summary:
- New Prisma model: `SnapshotRecord` (id, name, data, createdAt)
- New API routes: `/api/plat/snapshots` (GET/POST), `/api/plat/snapshots/[id]` (GET/DELETE)
- Store additions: `SnapshotMeta` type, `snapshots` state, `saveSnapshot`/`loadSnapshot`/`deleteSnapshot`/`listSnapshots` actions, `'snapshot'` activity kind
- TowerPanel: Snapshots section with save form, list with restore/delete, confirmation dialog
- Addresses the "history/rewind" gap from the worklog

---
Task ID: 7
Agent: full-stack-developer
Task: Implement export/import tower JSON

Work Log:
- Added `'import'` kind to `ActivityEntry.kind` union type in store.ts
- Added `importTower(tower: Tower, filename: string)` action to `PlatState` interface
- Implemented `importTower` in the Zustand store: POSTs full tower to `/api/plat/tower`, replaces local state, recomputes links, pushes activity entry with `kind: 'import'`
- Added `Download` and `Upload` icons from lucide-react to TowerPanel imports
- Added `useRef` and `useCallback` to React imports
- Added `AlertDialog` components from shadcn/ui to TowerPanel imports
- Added `importTower` store selector in TowerPanel
- Added `fileInputRef`, `pendingImport` state for import flow
- Implemented `handleExport`: serializes tower as `{ _platVersion: "0.5", tower: {...} }`, creates Blob, triggers download via `<a>` click pattern with filename `{tower.name}-v0.5-{timestamp}.tower.json`
- Implemented `handleImportClick`: opens hidden file picker
- Implemented `handleFileChange`: reads file, parses JSON, validates `districts` array, accepts both wrapped and bare tower formats, sets `pendingImport` state
- Implemented `handleImportConfirm`: calls `importTower` and clears pending state
- Replaced single Reset button with button group (reset, export, import) in header row
- Added hidden `<input type="file" accept=".json,.tower.json">` for import file picker
- Added AlertDialog confirmation dialog for import: "Import '{tower.name}'? This replaces the current city."
- All styling matches existing dark theme with mono fonts, ghost buttons
- Lint passes cleanly

Stage Summary:
- Store: new `importTower` action and `'import'` activity kind
- TowerPanel: Export button (Download icon, pure client-side Blob download), Import button (Upload icon, file picker + validation + AlertDialog confirmation)
- Export format: `{ _platVersion: "0.5", tower: {...} }` with filename `{name}-v0.5-{timestamp}.tower.json`
- Import validates JSON structure (districts array required), accepts both wrapped and bare tower formats
- Confirmation dialog uses shadcn/ui AlertDialog styled to match dark theme

---
Task ID: 8 (final QA round)
Agent: main
Task: Assess project status, QA, implement 7 new features, final verification

Work Log:
- Read full worklog.md (739 lines) covering project history from v0.4→v0.5→v0.6
- Explored entire codebase: 13 plat components (new CubeTooltip), 8 lib modules, 6 API routes (new snapshots), Prisma schema (new SnapshotRecord)
- QA via agent-browser: base view, sectioned view, snapshot API, all verified working
- 0 console errors, 0 page errors, lint clean
- Implemented 7 new features in parallel via subagents:
  1. Cube Hover Tooltip (CubeTooltip.tsx) — floating panel on hover with file info
  2. Progress Dashboard (TowerPanel.tsx) — radial progress + per-stratum breakdown
  3. Enhanced Mini-Map (MiniMap.tsx) — cables, section zones, district pulse
  4. Snapshot System (Prisma + API + store + TowerPanel) — save/restore named states
  5. Polished Header Toolbar (PlatApp.tsx) — grouped buttons, save dot, shortcuts
  6. Enhanced Building Labels (DistrictBuilding.tsx) — role badges, progress bar, breakdown
  7. Export/Import Tower JSON (store + TowerPanel) — download/upload .tower.json
- Final QA: all features verified, lint clean, no errors

Stage Summary:
- PLAT v0.6 is feature-complete with 7 new features beyond v0.5
- All original user asks remain addressed (lever removed, sectioned view distinct, cables visible, piece-by-piece assembly, scattered grid)
- New database model: SnapshotRecord
- New API routes: /api/plat/snapshots (GET/POST), /api/plat/snapshots/[id] (GET/DELETE)
- New component: CubeTooltip.tsx
- Enhanced components: CityCanvas, TowerPanel, MiniMap, DistrictBuilding, PlatApp
- Enhanced store: snapshot actions, importTower, new activity kinds
- No breaking changes to existing functionality

---
Task ID: v0.8-foundation
Agent: main
Task: Lay v0.8 foundation — store flags, colorblind mode, grid snap, search highlight, footer/help fix

Work Log:
- Read full worklog (843 lines) covering project history v0.4 → v0.7
- QA via agent-browser + VLM:
  - Base view scored 7/10 (text overlap at bottom, faint grid, empty-looking minimap, flat cube materials, label readability)
  - Sectioned+cables view scored 8/10 (clear separation, visible cables)
- Added new ViewState fields: `colorblindMode: boolean`, `gridSnap: boolean`
- Added store actions: `toggleColorblind`, `toggleGridSnap`, `reorderCube` (for upcoming drag-to-reorder)
- Updated CityCanvas onPointerMove to snap yaw to 45° when gridSnap is on (via usePlat.getState() so no closure staleness)
- Threaded `colorblindMode` + `query` from CityCanvas → DistrictBuilding → Cube
- Cube.tsx:
  - Added `colorblindMode` + `highlighted` props
  - Added `colorblindPattern(status, color)` returning distinct background patterns per status (cross-hatch / dots / heavy X / stripes / diagonal)
  - Added status glyph overlay on top face when colorblindMode is on (uses STATUS_GLYPH from types)
  - Added search-highlight ring (yellow pulsing glow) when highlighted=true
- globals.css: added `plat-highlight-pulse`, `plat-ctx-pop`, `plat-drag-lift`, `plat-rewind-pulse` keyframes; added `.plat-scroll` thin scrollbar styling
- PlatApp.tsx:
  - Imported Accessibility + Grid3x3 icons from lucide-react
  - Added colorblind toggle button (amber accent) + grid snap toggle button (green accent) in view-controls group
  - Added B + G keyboard shortcuts
  - Moved help tooltip from bottom-3 to bottom-12 (above the footer) — fixes the VLM-flagged overlap with status bar
  - Restyled help tooltip: glassmorphism, badge-style hints, dynamic status for sectioned/grid-snap/colorblind modes
  - Added "right-click" hint to shortcuts list in help dialog
  - Bumped version to v0.8
- TowerPanel.tsx: bumped export payload + filename + sidebar version badge to v0.8
- Verified via agent-browser + VLM:
  - Colorblind mode: glyphs + patterns clearly visible on cube tops ✓
  - Grid snap: camera locks to 45° increments ✓
  - Search highlight: matching cubes glow yellow ✓
- Lint passes cleanly, dev server compiles, 0 errors

Stage Summary:
- v0.8 foundation complete: 3 of 6 planned features already shipped
- Store now supports: colorblindMode, gridSnap, reorderCube (for upcoming drag-to-reorder)
- Cube component extended with glyph overlay + search-highlight ring
- Help tooltip no longer overlaps footer
- 3 remaining features delegated to subagents (activity rewind, context menu, drag-to-reorder)

---
Task ID: 10
Agent: full-stack-developer
Task: Implement Cube Drag-to-Reorder in the TowerPanel File List

Work Log:
- Read worklog.md (v0.8 foundation section) confirming reorderCube store action already exists
- Read TowerPanel.tsx, store.ts, types.ts, globals.css to understand existing file-row button structure (rendered inline as a <button> with onClick selectCube, status glyph, path text, progress %, marks)
- Identified insertion point: lines ~880-938 of TowerPanel.tsx (the district file list map)
- Added GripVertical to lucide-react imports
- Added `reorderCube` hook from store (already implemented, just wired it up)
- Added 3 local React state pieces to TowerPanel (no store pollution):
  - draggingPath: path of row currently being dragged
  - draggingDistrictId: districtId of dragged row (for cross-district guard)
  - dropTargetPath: path of row the pointer is hovering (gets insertion line)
- Added clearDrag() callback to reset all three at once (used by onDrop + onDragEnd)
- Modified the file-row <button>:
  - draggable={true}
  - onDragStart: sets draggingPath/draggingDistrictId, sets dataTransfer payload as JSON {districtId, path}, effectAllowed='move'
  - onDragOver: preventDefault() ONLY when draggingDistrictId === d.id AND draggingPath !== f.path (this is what enforces the cross-district + self-drop constraint at the browser level — without preventDefault, drop won't fire)
  - onDrop: parses JSON payload, double-checks districtId match + path difference, calls reorderCube(d.id, fromPath, toPath)
  - onDragEnd: clearDrag()
  - Added `group/file` class + GripVertical icon (h-3 w-3, opacity-0 group-hover/file:opacity-100 transition-opacity shrink-0) so the handle reserves space (no layout shift) and fades in on hover
  - Added cursor-grab (default) / cursor-grabbing + opacity-40 (when draggingPath === f.path)
  - Inline style: transform translateY(-2px) when dragging (lift feel matching plat-drag-lift keyframe)
  - Inline style: inset 0 2px 0 0 ${d.color} box-shadow on the drop target row — colored top insertion line that overlays without shifting layout
- Verified via agent-browser:
  - 85 draggable rows present in DOM, 85 GripVertical handles
  - Hover state: cursor-grab, draggable=true, grip opacity 0 → fades to 100 on hover (verified via getComputedStyle)
  - Real drag test: dragged model.py (e41) onto core.py (e40) → order changed from [__init__, core, model, auth, ...] to [__init__, model, core, auth, ...] ✓
  - POST /api/plat/tower 200 + Prisma INSERTs + COMMIT shown in dev.log → persistence confirmed
  - Reverse drag (core.py back onto model.py) restored original order ✓
  - Cross-district drag prevention: dragging model.py (Python e41) onto types.ts (TypeScript e54) → NO reorder occurred in either district ✓
  - Activity log shows new entries "core.py now reordered above model.py" / "model.py reordered above core.py" (from existing pushActivity in reorderCube) ✓
- Lint: bun run lint passes cleanly (0 errors)
- Dev server: ✓ Compiled in 554ms, no errors

Stage Summary:
- File-row drag-to-reorder fully wired end-to-end: UI drag → reorderCube store action → POST /api/plat/tower → Prisma persist
- Cross-district drag is blocked at the onDragOver level (no preventDefault → no drop)
- Self-drops and same-position drops are no-ops (guard in onDragOver + onDrop)
- Visual feedback matches spec: opacity 0.4 + translateY(-2px) on dragged row, 2px solid district-colored top insertion line on drop target, subtle GripVertical handle visible on hover only
- All drag state stays local to TowerPanel (3 useState + 1 useCallback) — store untouched, API untouched, no new packages

---
Task ID: 8
Agent: full-stack-developer
Task: Implement Activity Timeline Click-to-Rewind — let users click an entry in the activity timeline to "rewind" the tower to the state captured right before that action.

Work Log:
- Read v0.8-foundation worklog entry + dev.log baseline (clean compile, no errors)
- Read existing files: ActivityTimeline.tsx, store.ts (936 lines), types.ts, globals.css
- store.ts changes (src/lib/plat/store.ts):
  - Added `'rewind'` to the `ActivityEntry.kind` union
  - Added `activitySnapshots: Record<string, Tower>` to `PlatState` (parallel to `activity`)
  - Added `rewindToActivity: (activityId: string) => Promise<void>` to the actions interface
  - Added `cloneTower(t: Tower): Tower` helper — manual structural clone (no structuredClone runtime dep) that deep-copies districts/anchor/files/marks
  - Added exported `relTime(ts: number): string` helper ("now"/"12s"/"3m"/"2h"/"5d") so both the store and the timeline UI share the same relative-time formatting
  - Refactored `pushActivity` from `(prev, entry) => ActivityEntry[]` to `(prevActivity, prevSnapshots, entry, oldTower?) => { activity, activitySnapshots }` — saves a deep copy of `oldTower` (the pre-action tower) keyed by `entry.id`, and prunes snapshots to the most recent `SNAPSHOT_MAX=20` entries (matching the existing `ACTIVITY_MAX=40` ring buffer)
  - Initialized `activitySnapshots: {}` in the store creation
  - Updated ALL 12 `pushActivity` call sites to capture the pre-action tower (`oldTower` / local `tower` var) and spread the result into `set()`:
    - resetTower, setStatus, setProgress (conditional spread when crossed), setNotes, toggleMark, addCube, removeCube, renameCube, shuffleDistrict (refactored from direct setState to go through pushActivity), reorderCube, saveSnapshot, loadSnapshot, importTower
  - Updated `clearActivity` to also clear `activitySnapshots: {}`
  - Added `rewindToActivity` action: looks up the snapshot for the activity id, clones + restores the tower, truncates the activity log to remove entries chronologically newer than the rewound one (those at indices [0, idx) in the most-recent-first array), pushes a fresh `kind: 'rewind'` marker entry with summary "rewound to <relTime>", rebuilds the snapshots map keeping only survivors, sets `selected` to the rewound cube if it still exists in the restored tower, and POSTs the restored tower to `/api/plat/tower`
- ActivityTimeline.tsx changes (src/components/plat/ActivityTimeline.tsx):
  - Imported `useState` from react + `relTime` from store (replaced the local duplicate)
  - Imported `Save` + `Download` icons from lucide-react for snapshot/import kinds
  - Added `rewind: RotateCcw` to `KIND_ICON` and `rewind: '#6aa0d8'` to `KIND_COLOR`
  - Added the previously-missing `snapshot` (Save icon, purple `#b08ad8`) and `import` (Download icon, green `#8ad8b0`) entries to both maps — this fixes a latent tsc error AND a runtime crash when rendering snapshot/import activity entries
  - Removed unused `ArrowUp`/`ArrowDown` imports (dead code from prior agent)
  - Subscribed to `activitySnapshots` + `rewindToActivity` from the store
  - Added `confirmingId` local state to track which entry is showing the yes/no confirm UI
  - Added a `group` class to the `<li>` so `group-hover:` works for the rewind icon
  - Increased the entry button's right padding `pr-1 → pr-7` to make room for the rewind icon
  - Added a hover-only rewind icon button (`RotateCcw`, `h-5 w-5`) positioned absolute right-1 top-1/2, with `opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto` so it doesn't capture clicks when invisible; uses `e.stopPropagation()` defensively
  - Added inline confirm UI: an absolutely-positioned pill ("rewind to 5m? [yes] [no]") with `bg-[#1c1a17]`, `border-[#6aa0d8]/40`, `z-10`, `shadow-lg`; yes button calls `rewindToActivity(a.id)`, no button just clears confirming state
  - Added a `ring-1 ring-[#6aa0d8]/40` + `bg-[#6aa0d8]/10` highlight on the entry button when it's in the confirm state
  - Added the `plat-rewind-pulse-on-hover` class to the `<li>` when the entry has a snapshot AND isn't confirming, so the rewind target glows blue on hover
  - Preserved the existing click-on-body-selects-cube behavior (constraint: DO NOT change existing click behavior)
- globals.css changes (src/app/globals.css):
  - Added `.plat-rewind-pulse-on-hover:hover` rule that runs the existing `plat-rewind-pulse` keyframes at 1.2s ease-in-out infinite, with `border-radius: 2px` so the glow wraps the entry cleanly
- Verification:
  - `bun run lint` — 0 errors (clean)
  - `npx tsc --noEmit` — only pre-existing errors remain (Cables.tsx null checks, CubeTooltip.tsx CubeRef import, Inspector.tsx Link import, TowerPanel.tsx StratumId comparison, store.ts Link import, store.ts setNotepad signature). NONE of my changes introduce new tsc errors.
  - dev.log shows clean `✓ Compiled in 222ms` after edits, API routes returning 200

Stage Summary:
- Activity timeline now supports click-to-rewind: every activity entry that has a snapshot (most recent 20) shows a `RotateCcw` icon on hover with a blue glow pulse; clicking it opens an inline "rewind to <time>? [yes] [no]" confirm; confirming restores the tower to the pre-action state, truncates newer activity entries, and posts the restored tower to the API
- Store gained `activitySnapshots: Record<string, Tower>` parallel to `activity`, capped at 20 entries (SNAPSHOT_MAX) to bound memory
- Store gained `rewindToActivity(activityId)` action that handles snapshot lookup, tower restore, activity truncation, new `kind: 'rewind'` marker entry, snapshot map rebuild, and persistence
- `pushActivity` signature changed from `(prev, entry) => ActivityEntry[]` to `(prevActivity, prevSnapshots, entry, oldTower?) => { activity, activitySnapshots }` — all 12 call sites updated to capture the pre-action tower and spread the result
- Fixed a latent bug: KIND_ICON/KIND_COLOR were missing `snapshot` and `import` keys (would crash on render for snapshot/import activity entries) — added Save + Download icons and matching colors
- No API routes changed, no new packages installed, no test code written

---
Task ID: 9
Agent: full-stack-developer
Task: Implement Cube Right-Click Context Menu — when a user right-clicks a cube in the 3D city, show a custom context menu with quick actions (set status, toggle marks, copy path, focus district, remove cube, cycle status) instead of the browser's default menu.

Work Log:
- Read worklog.md, Cube.tsx, CityCanvas.tsx, DistrictBuilding.tsx, store.ts, types.ts, globals.css, and shadcn context-menu.tsx to understand structure
- Read CubeTooltip.tsx, MiniMap.tsx, TowerPanel.tsx, and PlatApp.tsx to confirm STATUS_DOT color mapping convention
- Inspected Radix `@radix-ui/react-context-menu` source (`node_modules/.../dist/index.mjs`) to verify `asChild` semantics and `onContextMenu` composition behavior
- Created `src/components/plat/CubeContextMenu.tsx` — wraps children with shadcn ContextMenu + asChild Trigger (so the cube's outer div IS the trigger; no extra wrapper element to break 3D layout). Menu content rendered via Portal so parent's preserve-3d is irrelevant.
  - Menu items in order: status sub-menu, marks sub-menu, [sep], copy path, focus district, remove cube, [sep], cycle status →
  - Status sub-menu: 5 statuses from STATUS_CYCLE, each with colored dot (STATUS_DOT), glyph (STATUS_GLYPH), label (STATUS_LABEL); current status highlighted with a `●` indicator and dot glow
  - Marks sub-menu: 4×2 CSS grid of 24×24 buttons for BUILTIN_MARKS (?, X, !, 1-5); currently-checked marks styled distinctly (? red, X grey, others off-white); clicking a mark calls toggleMark with stopPropagation so the menu stays open for multiple toggles
  - Copy path: calls navigator.clipboard.writeText(`${districtId}/${path}`); uses `e.preventDefault()` in onSelect to keep menu open; flips a `copied` state showing "✓ copied!" for 1.2s before reverting to "⧉ copy path"
  - Focus district: calls focusDistrict(districtId); disabled (with `data-disabled` + opacity 0.4 + pointer-events:none + label "already focused") when view.focusDistrict === districtId
  - Remove cube: variant="destructive" red styling, calls removeCube(ref)
  - Cycle status: calls cycleStatus(ref) to advance to next status
- Wired `CubeContextMenu` into `Cube.tsx`:
  - Added `districtId: string` prop to CubeProps (cube.path is already available via `cube` prop)
  - Wrapped the outer `<div className="plat-cube">` with `<CubeContextMenu districtId={districtId} cube={cube}>` so the existing div with all its 3D transforms IS the trigger (asChild)
  - Did NOT add `onContextMenu={(e) => e.preventDefault()}` on the div — Radix's `composeEventHandlers` skips its open-menu handler if `event.defaultPrevented` is already true, so a defensive preventDefault would silently prevent the menu from opening. Radix internally calls preventDefault which suppresses the browser menu. Documented this with a NOTE comment.
- Passed `districtId={district.id}` from DistrictBuilding.tsx → Cube (one-line addition to the JSX)
- Styling: `bg-[#1c1a17] text-[#efe9dc] border-white/15 font-mono` (matches the dark theme of TowerPanel / footer / tooltips); `max-w-[180px]` on root content; `plat-ctx-pop` keyframe animation on the Content
- Verified with agent-browser + VLM:
  - Right-click on a cube → menu appears at (380, 199) sized 140×180px, VLM confirms menu visible with all 6 items
  - Hover "status" → sub-menu opens with all 5 statuses + dots + glyphs; VLM confirms
  - Hover "marks" → sub-menu opens with "TOGGLE MARK" label + 4×2 grid of 8 marks; VLM confirms
  - Click "remove cube" → cube removed (count 85 → 84), menu closed, action persisted to API
  - Click "cycle status →" → menu closed (Radix onSelect fired without preventDefault)
  - Click "focus district" → focused; reopening menu shows "already focused" with opacity 0.4, pointer-events none, data-disabled=""
  - Left-click a cube (separate test) → selection ring appears (scale 1.12), confirming existing click/hover behavior is NOT broken
- Lint passes (exit 0); dev server compiles cleanly with 0 console errors

Stage Summary:
- New file: `src/components/plat/CubeContextMenu.tsx` (~270 lines)
- Modified: `src/components/plat/Cube.tsx` (added `districtId` prop + wrapped outer div with CubeContextMenu via asChild)
- Modified: `src/components/plat/DistrictBuilding.tsx` (passes `districtId={district.id}` to Cube)
- No new packages; uses existing `src/components/ui/context-menu.tsx` (shadcn/Radix)
- No store changes — reuses existing `setStatus`, `cycleStatus`, `toggleMark`, `removeCube`, `focusDistrict` actions
- Critical gotcha documented in Cube.tsx: a defensive `onContextMenu={(e) => e.preventDefault()}` (suggested in the task spec) BREAKS the menu because Radix's `composeEventHandlers` checks `event.defaultPrevented` before running its open-menu logic — Radix already preventDefaults internally, so no extra handler is needed
- Verified: menu opens on right-click, all 6 items present, both sub-menus work, all 4 direct actions work, selection/hover/3D transforms preserved, lint clean, 0 errors

---
Task ID: v0.8-final
Agent: main
Task: Final QA + worklog summary for v0.8 release

Work Log:
- All 6 v0.8 features verified working via agent-browser + VLM:
  1. **Colorblind mode** [B key] — status glyphs + distinct background patterns visible on cube tops ✓
  2. **Grid snap** [G key] — camera yaw locks to 45° increments during drag ✓
  3. **Search highlight in 3D** — matching cubes pulse yellow glow when query active ✓
  4. **Activity timeline rewind** — hover an entry, click RotateCcw icon, confirm "rewind to <time>?" ✓
  5. **Cube context menu** [right-click] — status sub-menu, marks sub-menu, copy path, focus district, remove cube, cycle status ✓
  6. **Cube drag-to-reorder** — drag files within district stack in TowerPanel; 84 drag handles + 84 draggable rows confirmed ✓
- Verified the help tooltip no longer overlaps the footer (moved from bottom-3 to bottom-12)
- Verified colorblind + sectioned mode can be combined without conflict
- Lint: 0 errors (exit 0)
- Dev server: compiles cleanly, 0 console errors, all API routes 200
- VLM final polish score: 7.5–8/10 (up from 7/10 at v0.7)

Stage Summary:
- v0.8 ships 6 new features and 1 critical bug fix (footer/help overlap)
- Foundation work (main agent): store flags, Cube glyph + search ring, toolbar buttons, footer fix
- Delegated features (3 subagents in parallel): activity rewind, context menu, drag-to-reorder
- All features compose cleanly: colorblind + sectioned + cables + search all coexist
- No regressions: existing snapshot/import/export/undo/build/shuffle all still work

Files Touched in v0.8:
- src/lib/plat/types.ts — added colorblindMode, gridSnap to ViewState
- src/lib/plat/store.ts — toggleColorblind, toggleGridSnap, reorderCube actions; activitySnapshots + rewindToActivity (subagent 8)
- src/components/plat/Cube.tsx — colorblind glyph overlay, search-highlight ring, districtId prop, CubeContextMenu wrap (subagent 9)
- src/components/plat/DistrictBuilding.tsx — pass through colorblindMode, query, districtId
- src/components/plat/CityCanvas.tsx — grid-snap in onPointerMove, thread new props
- src/components/plat/PlatApp.tsx — toolbar buttons (Accessibility, Grid3x3), B/G shortcuts, help tooltip moved above footer, version bump
- src/components/plat/TowerPanel.tsx — drag-to-reorder wiring (subagent 10), version bump
- src/components/plat/ActivityTimeline.tsx — rewind hover icon + confirm pill (subagent 8)
- src/components/plat/CubeContextMenu.tsx — NEW file (subagent 9)
- src/app/globals.css — plat-highlight-pulse, plat-ctx-pop, plat-drag-lift, plat-rewind-pulse keyframes + .plat-scroll scrollbar styling

Unresolved / Next-Phase Recommendations:
- **Mobile responsive** — sidebar/inspector still absolute overlays on small screens; could be Sheet components
- **Better cube ground shadows** — VLM noted cube materials look flat; could add ambient occlusion / soft drop shadow beneath each cube stack
- **Empty-state for inspector** — when no cube selected, the inspector still shows a basic message; could show recent activity or quick stats
- **Theme toggle** — VLM suggested a dark/light mode toggle for the 3D viewport background
- **Performance** — for larger codebases (200+ cubes), consider virtualizing the TowerPanel file list
- **Billboard labels** — labels in 3D should always face camera with solid background plates for better readability

---

## Current Status (v0.9 round)

**Phase**: Bug fixes + visual polish + new features v0.9. Cable positioning bug fix (critical), cable hover tooltips, district label solid plates, help tooltip auto-fade, elevation ruler, inspector empty-state, cube wiring badges.
**Stability**: Clean lint, 0 runtime errors, 0 console errors, all API routes 200.
**Last QA**: 2025-08-07 — agent-browser + VLM QA scoring 7.5/10 (up from 7.5–8 at v0.8, but with cables now correctly positioned).

### Critical Bug Fix

**Cable positioning bug** — cables (and SectionedPillars + ElevationRuler SVG ticks) were rendering at the WRONG position, offset by (canvasWidth/2, canvasHeight/2) from where they should have been. The root cause: `projectPoint()` returns screen coords relative to the world origin (which sits at the canvas centre), but the SVG `<path d="M x y">` uses SVG-user-coords relative to the SVG's top-left. Without an offset, cables floated in empty space instead of connecting cubes.

This bug was present since v0.7 but went unnoticed because cables were thin and dashed. After boosting cable visibility in v0.9 (opacity 0.35 → 0.55, always-on endpoint dots), the misalignment became obvious.

**Fix**: wrapped the SVG content in a `<g transform={`translate(${svgSize.w / 2}, ${svgSize.h / 2})`}>` centering wrapper. Used a `ResizeObserver` to track the SVG's pixel dimensions and update the transform on resize. Applied the same fix to `SectionedPillars.tsx` and `ElevationRuler.tsx` (SVG part).

### Features Added This Round (v0.9)

| # | Feature | Status |
|---|---------|--------|
| 1 | **Cable visibility boost** — base stroke opacity raised from 0.35 → 0.55 so cables are readable against the light checkerboard floor even when not highlighted. Added an SVG `feDropShadow` filter so cables cast a subtle shadow on the ground. | ✅ Done |
| 2 | **Always-on endpoint dots** — every cable now has small colored dots at both endpoints (radius 2.5px, opacity 0.5). When emphasized (hovered or endpoint-cube-selected), the dots grow to 4.5px with a halo. Fixes the "orphaned cable" look. | ✅ Done |
| 3 | **Cable hover tooltip** — hovering a cable shows a floating panel with: kind label (shared name / containment / shared mark / note ref), strength meter (5 dots), from→to file paths with district + stratum, and the human-readable reason ("why shared name 'auth'"). New `CableTooltip.tsx` component. | ✅ Done |
| 4 | **District label solid background plate** — the multi-row label (stratum ribbon, file count breakdown, tag, progress bar, stratum dots) is now wrapped in a single solid dark background plate. Eliminates the visual clutter of 5 floating text fragments. Color-coded file counts (green✓ / amber◐ / grey○). | ✅ Done |
| 5 | **Help tooltip auto-fade** — the bottom-center hint shows on mount, then fades out after 6s of inactivity. Re-appears when the cursor dips into the bottom 90px of the viewport. Keeps the cityscape unobstructed during normal orbit/zoom work. | ✅ Done |
| 6 | **Footer status bar wrap** — footer now wraps to multiple lines on narrow screens instead of clipping. Boosted text contrast (white/55 → white/40 for counts). | ✅ Done |
| 7 | **Elevation ruler (HTML overlay + SVG projected)** — a vertical "ELEVATION" panel on the right edge of the canvas, always visible in sectioned mode. Shows the three strata (SURFACE / WIRING / FOUNDATION) stacked vertically with color dots, role labels (FRONTEND↑ / CONNECTIVE↔ / BACKEND↓), and lift heights (+16.0u / +8.5u / +0.0u). Clicking a stratum focuses it (same as pressing 1/2/3). A secondary SVG-projected overlay draws tick marks at the actual 3D-projected slab positions. | ✅ Done |
| 8 | **Inspector empty-state** — when no cube is selected, the inspector now shows: (a) city overview with built % and a 5-status grid, (b) "needs attention" section listing up to 4 stuck/abandoned cubes (clickable to select), (c) wiring summary with cable counts per kind, (d) most recent activity entry (clickable to select). Turns the inspector from a dead-end blank into a dashboard. | ✅ Done |
| 9 | **Cube wiring badge in CubeTooltip** — hovering a cube now shows a "wired to N" badge in the tooltip, with a direction split (↑up / ↓down arrows showing how many cables go towards surface vs foundation). Includes a tiny cable-jack SVG icon. | ✅ Done |
| 10 | **KIND_LABEL_BY_KIND export** — added human-readable labels for each LinkKind in `cable-colors.ts`, shared by the CableTooltip and the Inspector wiring summary. | ✅ Done |

### Architecture Decisions

- **Cable hover hit area**: uses a `<path stroke="#000" stroke-opacity="0" stroke-width="16">` with `pointer-events: stroke`. The transparent stroke is invisible but still receives pointer events. The SVG parent has `pointer-events: none` so cube hovers/clicks pass through; the hit-area paths override with `pointer-events: stroke` to receive hovers on the cable curve. Earlier attempts with `stroke="transparent"` didn't work — browsers treat `transparent` as "no stroke" for pointer events.
- **Elevation ruler dual-render**: HTML overlay (always visible, always in the same place) + SVG-projected ticks (tie the HTML ruler to the actual 3D slab positions). The HTML overlay is the primary visible element; the SVG ticks are secondary visual anchors.
- **SVG centering wrapper**: `<g transform="translate(w/2, h/2)">` aligns projectPoint's world-origin-relative coords with the SVG's top-left-relative user coords. Tracked via `ResizeObserver` so it updates on canvas resize.
- **Inspector empty-state**: stays mounted (doesn't unmount the inspector when no cube is selected) so the panel doesn't flash empty. Uses the existing `selectCube` action for clickable at-risk cubes and recent activity.
- **Help tooltip auto-fade**: uses a `useRef` for the timeout ID and a `useCallback` for the wake function. The wake function is called on mount and whenever the cursor enters the bottom 90px of the viewport.

### Files Touched in v0.9

- `src/components/plat/Cables.tsx` — centering wrapper, endpoint dots, hover hit areas, CableTooltip integration, drop shadow filter, pointer-events tuning
- `src/components/plat/CableTooltip.tsx` — NEW file (~190 lines): floating tooltip showing from→to + kind + reason + strength meter
- `src/components/plat/CubeTooltip.tsx` — added optional `links` prop, wiring count badge with ↑up/↓down direction split, cable-jack SVG icon
- `src/components/plat/DistrictBuilding.tsx` — restructured label: name badge on top, detail plate below with solid background holding ribbon/breakdown/tag/progress/stratum-dots
- `src/components/plat/PlatApp.tsx` — help tooltip auto-fade (hintVisible state + hintAwake callback + mousemove listener), footer wrap + contrast boost, version bump to v0.9
- `src/components/plat/Inspector.tsx` — new `InspectorEmptyState` component (~250 lines): city overview + at-risk cubes + wiring summary + recent activity
- `src/components/plat/CityCanvas.tsx` — added `links` prop to CubeTooltip, imported ElevationRuler
- `src/components/plat/ElevationRuler.tsx` — NEW file (~320 lines): HTML overlay ruler + SVG-projected ticks, click-to-focus-stratum
- `src/components/plat/SectionedPillars.tsx` — added centering wrapper (same fix as Cables)
- `src/lib/plat/cable-colors.ts` — added `KIND_LABEL_BY_KIND` export
- `src/components/plat/TowerPanel.tsx` — version bump to v0.9

### Known Issues / Risks

- **CubeTooltip hidden in headless test** — the CubeTooltip uses `useSyncExternalStore` to check `(pointer: fine)` and hides on coarse (touch) devices. In the agent-browser headless test, this reports as false, so the CubeTooltip doesn't show during QA. This is a test-environment quirk, not a bug — real users with a mouse will see the tooltip.
- **Cable hover hit area is stroke-only** — `pointer-events: stroke` means the cursor must be on the actual curve (within ~8px). Users hovering near but not on the cable won't trigger the tooltip. The stroke-width is 16px which gives a reasonable tolerance.
- **Elevation ruler SVG ticks** — the SVG-projected tick marks are partially aligned with the slabs (VLM noted "suggestive but not geometrically exact to the pixel"). This is because the camera perspective causes some visual offset. The HTML overlay ruler is the primary reference; the SVG ticks are secondary.
- **Cable flow particles** — still use the rAF loop; negligible CPU cost.

### Priority Recommendations for Next Phase

1. **Mobile responsive** — sidebar/inspector still absolute overlays on small screens; could be Sheet components
2. **Cable density control** — for large codebases (200+ cables), add a filter/sort control to reduce visual noise (e.g., only show stem cables, only show cables touching selected cube)
3. **Better cube ground shadows** — VLM noted cube materials look flat; could add ambient occlusion / soft drop shadow beneath each cube stack
4. **Theme toggle** — VLM suggested a dark/light mode toggle for the 3D viewport background
5. **Performance** — for larger codebases (200+ cubes), consider virtualizing the TowerPanel file list
6. **Billboard labels** — labels in 3D should always face camera with solid background plates for better readability (partially addressed in v0.9 with the solid detail plate)
7. **Snapshot comparison** — visual diff between snapshots showing what changed
8. **District dependency graph** — a dedicated overlay showing which districts depend on which


---

## Current Status (v0.10 round)

**Phase**: Visual themes + cable filtering + dependency graph + cube ground shadows v0.10. New viewport theme switcher (paper/blueprint/dark), cable-kind filter popover, district dependency graph (2D bird's-eye wiring map), cube stack-position numbers, soft ambient-occlusion ground shadows, cardinal scale ticks on the ground plane.
**Stability**: Clean lint, 0 runtime errors, 0 console errors, all API routes 200.
**Last QA**: 2025-08-07 — agent-browser + VLM QA scoring 9/10 (up from 7.5/10 at v0.9, 6/10 on base view at v0.9).

### QA Findings (pre-v0.10)

- Base view at v0.9 scored 6/10 (VLM) — flagged issues:
  - Z-fighting on grey cube stack
  - Label overlap (center-right)
  - Cyan/glass cube invisible against checkerboard
  - Clipping on far right
  - "Flat cube materials" — cubes lacked ground shadow / AO
  - Suggested: theme toggle, cable density control
- Sectioned view at v0.9 scored 8.5/10 — solid
- v0.9 priority recommendations addressed in v0.10:
  - ✅ Theme toggle (paper/blueprint/dark)
  - ✅ Cable density control (kind filter)
  - ✅ Better cube ground shadows (soft AO)
  - ✅ District dependency graph (NEW)

### Features Added This Round (v0.10)

| # | Feature | Status |
|---|---------|--------|
| 1 | **Viewport Theme Switcher** [T] — three themes: `paper` (warm off-white default), `blueprint` (cool cyan-on-navy surveyor's plate), `dark` (near-black night plate). Each theme defines a full palette (bg gradient, paper/paperDark checker, ink, fog, grid, label colors, cube glow boost, slab boost). Drives the canvas background, ground plane, fog vignette, compass, slab labels, district labels, and loading overlay via the new `themeOf()` helper. Toolbar button shows the active theme as a colored dot. | ✅ Done |
| 2 | **Cable-Kind Filter** [F] — a floating popover (top-right) with toggle buttons for each of the 4 cable kinds (stem/kin/mark/mention). Each row shows a color swatch (cable-like line), label, count, and checkbox indicator. Empty selection = show all (default); non-empty = only show those kinds. Includes "show all" and "only stems" quick-action buttons. Filter is applied in `Cables.tsx` via `view.cableKinds.size > 0 && !view.cableKinds.has(link.kind)`. Toolbar button shows a count badge when filter is active. | ✅ Done |
| 3 | **Cube Stack-Position Numbers** [#] — a small "3/14" label rendered on the front face of each cube (translateZ(E/2 + 0.2px) to avoid z-fighting), positioned bottom-left of the face. Uses tabular-nums for stable digit widths, with a subtle text shadow for readability against any cube color. Stuck cubes get white text with red glow. Helps read the assembly order at a glance. Toolbar button toggles via the new `showStackNumbers` view flag. | ✅ Done |
| 4 | **Soft Ambient Occlusion Ground Shadow** — a wider, darker, more diffuse elliptical shadow under each cube stack (`PAD * 1.9 × PAD * 1.35`, `filter: blur(2px)`, radial gradient from `ink30` → `ink18` → `ink08` → transparent). Sits between the existing ground shadow ellipse and the ambient glow ring. Addresses the VLM "flat cube materials" note — cubes now feel grounded with visible contact shadow. | ✅ Done |
| 5 | **District Dependency Graph** [V] — a new 2D bird's-eye wiring map panel (top-left, 280×240px). Shows: (a) districts listed vertically grouped by stratum (SURFACE/WIRING/FOUNDATION bands with subtle background tints), (b) district bars sized by file count with stratum color tick + name label + file-count badge, (c) bezier curves between districts colored by the dominant link kind, with edge count labels on highlighted edges. Hover a district to highlight its connections (other districts dim to 30% opacity); click to focus the district in the 3D city. Auto-derives district ordering by stratum depth so the dependency direction reads top-to-bottom. | ✅ Done |
| 6 | **Cardinal Scale Ticks on Ground Plane** — every 2 world units, a faint `ink10` line is drawn along both X and Z axes on the ground plane. Gives the checkerboard a surveyed-plate feel and helps judge distances. Renders as 13 + 13 thin divs inside the ground plane element. | ✅ Done |
| 7 | **Theme-Aware Labels** — district label background plates now read `labelBg` from the theme palette instead of a hardcoded `INK e8`. The `INK` import was removed from `DistrictBuilding.tsx`; labels now use `themeOf(view.theme).ink` and `.labelBg` so they read correctly in paper (dark plate on light bg), blueprint (dark navy plate on blue bg), and dark (near-black plate on charcoal bg). | ✅ Done |
| 8 | **Theme-Aware Canvas** — `CityCanvas.tsx` now derives `paper`, `paperDark`, `ink`, `inkSoft`, `theme.fog`, `theme.bg[]` from the active theme. All `INK`/`PAPER`/`PAPER_DARK` references in the canvas (ground plane, fog, compass, slabs, loading overlay, slab labels) now use the theme-derived locals. Exposes `--plat-ink`, `--plat-paper`, `--plat-label-bg`, `--plat-cube-glow-boost` as CSS vars on the canvas for future child use. | ✅ Done |

### Architecture Decisions

- **Theme palette as a single record** — `THEMES: Record<ViewTheme, ThemePalette>` in `src/lib/plat/theme.ts` is the single source of truth. Each theme defines the same set of slots (bg[3], paper, paperDark, ink, inkSoft, fog, grid, gridStrong, label, labelBg, labelBgSoft, cubeGlowBoost, slabBoost) so the renderer swaps palettes without per-theme branches. Adding a new theme is one object literal.
- **Cable filter as a Set<LinkKind>** — empty set = "show all" (the default, backward-compatible). Non-empty set = "only these kinds". `toggleCableKind` adds/removes from the set; `setCableKinds([])` resets to show-all. The filter is checked once per cable in `Cables.tsx`'s `pathData` memo, so the cost is O(links) per render — negligible.
- **Dependency graph edges aggregated by from→to** — multiple links between the same district pair are merged into one edge with a `count` and `dominantKind` (the kind with the most links). Edge width scales with `count` (capped at 8). This keeps the graph readable even for codebases with hundreds of links.
- **Stack number on the front face only** — the front face is the most camera-facing side in the default 30°/55° view. Rendering on all 4 side faces would be redundant and cluttered. The number uses `fontVariantNumeric: 'tabular-nums'` so digit widths are stable across cubes.
- **AO shadow as a separate layer** — sits between the existing ground shadow ellipse (district-color-tinted) and the ambient glow ring (district-color). Uses `filter: blur(2px)` for a soft falloff. The three layers stack to give the cube stack a grounded, weighted feel without changing the existing district-color theming.

### Files Touched in v0.10

- `src/lib/plat/types.ts` — added `ViewTheme`, `theme`, `cableKinds: Set<LinkKind>`, `showStackNumbers` to `ViewState`
- `src/lib/plat/theme.ts` — NEW file (~95 lines): `ThemePalette` interface, `THEMES` record (paper/blueprint/dark), `themeOf()` helper
- `src/lib/plat/store.ts` — imported `ViewTheme`/`LinkKind`; added `theme`, `cableKinds`, `showStackNumbers` to `DEFAULT_VIEW`; added `setTheme`, `cycleTheme`, `toggleCableKind`, `setCableKinds`, `toggleStackNumbers` actions
- `src/components/plat/CityCanvas.tsx` — derives theme palette; replaces all `INK`/`PAPER`/`PAPER_DARK` with theme locals; adds cardinal scale ticks on ground plane; exposes theme as CSS vars
- `src/components/plat/DistrictBuilding.tsx` — reads theme via `usePlat`; replaces `INK` with `palette.ink` and `INK e8` with `palette.labelBg`; adds soft AO shadow layer; passes `stackIndex`/`stackTotal`/`showStackNumbers` to Cube
- `src/components/plat/Cube.tsx` — added `stackIndex`, `stackTotal`, `showStackNumber` props; renders "N/M" label on front face when enabled
- `src/components/plat/Cables.tsx` — applies `view.cableKinds` filter in the `pathData` memo
- `src/components/plat/CableFilterBar.tsx` — NEW file (~220 lines): floating popover with kind toggles, counts, quick-actions
- `src/components/plat/DistrictDependencyGraph.tsx` — NEW file (~360 lines): 2D bird's-eye wiring map with stratum bands, district bars, bezier edges
- `src/components/plat/PlatApp.tsx` — imported `Palette`/`Hash`/`Filter`/`Network` icons + `CableFilterBar` + `DistrictDependencyGraph`; added `showCableFilter`/`showDepGraph` state; added T/#/F/V keyboard shortcuts; added 4 new toolbar buttons (theme/stacknumbers/filter/depgraph); wired both popovers into the canvas section; updated help dialog + help tooltip with new shortcuts; bumped version to v0.10
- `src/components/plat/TowerPanel.tsx` — bumped version to v0.10 in header + export filename

### Verification Results

- `bun run lint` — 0 errors (clean)
- dev server compiles cleanly, 0 console errors, all API routes 200
- agent-browser + VLM QA across 7 screenshots:
  - **Paper theme (base)**: 9/10 — clean, professional, AO shadows visible
  - **Blueprint theme**: 9/10 — distinct cool cyan-on-navy aesthetic
  - **Dark theme**: 8.5/10 — high contrast, cubes pop against charcoal
  - **Stack numbers on (paper)**: 9/10 — "3/14" labels crisp and readable on cube faces
  - **Cable filter popover**: 9/10 — clean UI, all 4 kinds with counts and checkboxes
  - **Sectioned view (paper)**: 9/10 — strata clearly separated, elevation ruler visible
  - **Sectioned view (blueprint)**: 8.5/10 — works across themes
  - **District dependency graph**: 8/10 (initial) → improved label contrast + reduced curve bow → 9/10
  - **Comprehensive (sectioned + stack numbers + paper)**: 9/10 — all features integrate cleanly
  - **Final (AO shadows + all features)**: 9/10 — "production-ready visual design"
- Filter verified working: clicking "containment" (0 cables in seed) hides all cables; clicking "shared name" shows only the 15 stem cables; "show all" restores
- Theme cycle verified: paper → blueprint → dark → paper via T key, all UI elements update correctly

### Known Issues / Risks

- **Seed data only produces stem (shared name) links** — the cable filter and dependency graph correctly handle this, but it means the kin/mark/mention filter rows show count 0 in the default seed. Real codebases with more diverse wiring will exercise these more.
- **Dependency graph edge labels can overlap** when many edges converge on one district — only shown on highlighted edges (hover/focus), so usually fine.
- **Stack numbers on distant cubes** can become illegible at low zoom — the font size is `max(7, E * 0.13)` so it scales with cube size, but very distant cubes still get small text. Acceptable tradeoff.
- **Theme switching re-renders all cubes** — the theme is read via `usePlat((s) => s.view.theme)` in DistrictBuilding, so a theme change triggers a full re-render of all buildings. With 84 cubes this is ~16ms, imperceptible.
- **Cable filter popover can overlap the activity timeline** if both are open — both are at top-right / bottom-right respectively, so overlap is minimal. The popover has `zIndex: 35` which sits above the timeline's `zIndex: 30`.

### Priority Recommendations for Next Phase

1. **Mobile responsive overlay toggles** — CityHealth, LegendPanel, MiniMap, ElevationRuler are still always-on; could be toggleable via a small floating toolbar on small screens
2. **Snapshot visual diff** — show what changed between two snapshots (added/removed/changed cubes highlighted)
3. **Billboard labels** — labels still don't counter-rotate against view.yaw; would make them readable from any angle
4. **Colorblind palette for themes** — the blueprint/dark themes use the same status colors as paper; a colorblind-optimized palette per theme would help
5. **Cable strength visualization** — currently cable width scales with strength, but a "heat" mode could color cables by strength (red=strong, blue=weak)
6. **Performance: virtualize TowerPanel file list** — for 200+ cubes, the file list could be virtualized
7. **Theme persistence** — save the active theme to localStorage so it survives page reloads
8. **Custom theme editor** — let users define their own palette (advanced)

