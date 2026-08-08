# Parts — PLATWORM v0.11

`FileCube.progress` was a number 0..100 doing an honest job badly. A scalar
can say *how much* is done. It cannot say *what* is done, and it gives a
cable nowhere to land — which is why the wiring could only ever claim
`auth.tsx` relates to `auth.py`, never that `SessionForm` calls
`POST /session`.

## The change

`src/lib/plat/parts.ts` — a `Part` is a named thing inside a file with its
own status: an export, a component, a handler, a model.

- **`status` and `progress` are now derived.** `rollup(parts)` and
  `progressOf(parts)`. Both stay on the record because the panel, filters,
  health ring and search read them hot — but they are written in exactly one
  place, `applyParts()` in the store, and re-derived server-side in the cube
  PUT handler. There is no path left that sets either directly.
- **The cube assembles course by course.** `courseBands()` in `Cube.tsx`
  replaces the even 9px side stripe with one band per part, bottom-up. Built
  bands are filled and closed with a firm course line; intended ones are open
  under a faint one, so you can count what remains. One gradient string, no
  new elements inside the faces — this is a CSS 3D transform pipeline and
  extra children z-fight.
- **A `Link` can point at a part.** `Endpoint` gained `partId`, and a new
  strongest `LinkKind`: `wire`. A wire is a connection you asserted, so it
  outranks every heuristic and is the only kind allowed to run sideways
  within a stratum. Derived links keep `partId: null` and land on the cube.
- **`view.traced`** holds a `'districtId:path#partId'` ref. The store action
  and the inspector button are wired; the Cables/Cube dimming pass is not
  (see below).

Stratum and face coexist and answer different questions. `STRATUM_ASSIGNMENT`
maps a whole *district* to a layer — right for the exploded view, but it can
only say "ts is wiring". `faceOf(kind)` is the same distinction at part
granularity, so one file can honestly hold a `component` and the `handler`
behind it.

## Migration

Additive. `FileCubeRecord.parts String @default("[]")` follows the existing
`marks` convention exactly. On read, a row with no parts gets a skeleton
synthesised from its path, **seeded with the status and progress it already
had** — a cube that read 60% still reads 60%. Nothing looks different on the
day this lands; progress becomes granular the first time you tick a part.

Run `npx prisma db push`.

## Fixed on the way through

The tree had 15 type errors before I touched it, two of them real bugs:

- **`DistrictDependencyGraph`** selected `s.focusDistrict` for *both* the
  value and the setter. That is the action, so every comparison against a
  district id was false and the graph's highlight set could never populate
  from a focused district.
- **`TowerPanel`** made the same mistake with `focusStratum` — `active` was
  always false, so no stratum button ever lit up.
- Duplicate `bottom`/`left` keys in one style literal (the second pair was
  winning silently), `CubeRef` and `Link` not exported from the modules
  everything imports them from, `setNotepad` declared `Promise<void>` and
  returning `void`.

`tsc --noEmit` is now clean apart from `examples/websocket/` (missing
`socket.io` deps) and `src/lib/db.ts` (needs `prisma generate`, which can't
run here — the engine download is blocked). ESLint clean on every touched
file.

## Not done

- **Trace has no visual pass yet.** `view.traced` is set and read, but
  `Cables.tsx` doesn't filter on it and `Cube.tsx` doesn't dim. Roughly: in
  Cables, skip any link whose `fromRef`/`toRef` doesn't match; in CityCanvas,
  pass `dimmed` for cubes not on a matching link. The `dimmed` prop already
  exists on `Cube`.
- **No gesture for drawing a wire.** `toggleWire(ref, partId, targetRef)` is
  in the store and `parts[].wires` persists. Nothing calls it yet. Drag from
  one part row to another cube is the obvious move.
- **The build won't complete offline** — `next/font` can't reach
  fonts.googleapis.com from here. Unrelated to any of this.
