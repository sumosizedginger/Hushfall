# GROK SEES — HARDEN-001

Independent architecture audit of SUMO SAYS DRAW!. Read-only. No source edits, no install, no commit, no push, no browser suite.

## Ledger

| Field | Value |
| --- | --- |
| Repository | `D:\SUMO SAYS DRAW` |
| Remote intent | local checkout audited; no Git remote operation |
| Branch | `main` |
| Inspected SHA | `181cfcbfff0280262cf7ee68c6d43ee60945e7dd` |
| Commit | `feat: add local ai prep export packages` (2026-10-12 19:10 −0700) |
| Working tree at inspection | clean (`git status --porcelain` empty) |
| Audit date | 2026-10-12 |
| Required baseline | `181cfcbfff0280262cf7ee68c6d43ee60945e7dd` (matches HEAD) |
| Docs read | `docs/ROADMAP.md` HARDEN-001, `docs/ARCHITECTURE.md`, `docs/PROJECT_FORMAT.md`, `docs/ENGINEERING.md`, `docs/STUDIO.md`, `docs/ANIMATION.md`, `docs/EXPORT-005-R1.md` (open observation only) |
| Code inspected | `src/core` (controller, commands, history, ids, assets, schemas, validation, persistence, autosave, portable bundle), `src/rendering/renderArtwork.ts`, `src/exporting` (png via `src/ui/exportMedia.ts`, gif, webm, png sequence, ai prep), `src/tools/BrushTool.ts`, `src/ui/StudioShell.tsx`, `src/App.tsx`, `src/workers` call sites |
| Executed this audit | one Node evaluation of `createAssetId` (below). Not played. `pnpm test`, Chrome, bake, and export proofs were not re-run. |
| Checkpoint evidence used, not re-run | `docs/EXPORT-005-R1.md` records the importer id reuse as an open observation. `docs/ENGINEERING.md` §90–§93 records the `selectionIntegration.test.ts` fixed-wait autosave observation as OPEN. Those notes are not treated as proof that the code is fixed. |

Central result: the studio core is a real command/history/schema system, and several permanent invariants hold. One importer bug is a correctness failure: every reference import is forced onto the single asset id `ast_reference`, and the runtime store then overwrites the previous image.

## Verdict

HARDEN-001 does not pass. Fix `H1` before calling the domain hardened. `H2` and `H3` are the next correctness risks. The rest are boundary or resource defects, not reasons to reopen drawing, undo, or the exporters.

---

## H1 — P0 — Every imported reference is the same asset

**Where:** `src/core/assets/assetStore.ts` `decodeImageFile`, line 205. `src/core/ids.ts` `createAssetId`, lines 63–65. `src/core/assets/assetStore.ts` `AssetStore.register`, lines 27–43. `src/core/commands/executor.ts` `executeAddAsset`, lines 1869–1872. `src/core/controller.ts` `importReferenceImage`, lines 1683–1764.

**Invariant:** `PROJECT_FORMAT.md` §8 and §32, `ENGINEERING.md` §38, `ARCHITECTURE.md` §30. An imported asset gets a stable collision-resistant id. Identity is not a fixed label. Project data references assets by id. Two imports of two files are two assets. `docs/EXPORT-005-R1.md` already names this as an open importer concern and says AI Prep does not repair it.

**Proof:**

1. `createAssetId('reference')` always returns `ast_reference`. Executed on this SHA:

```text
{"a":"ast_reference","b":"ast_reference","same":true,"fresh":"ast_3565432532654cff"}
```

A call with no argument does mint a unique id. The importer does not use that call.

2. `decodeImageFile` sets `id: createAssetId('reference')` for every successful PNG, JPEG, or WebP.

3. `register` does `this.assets.set(record.id, …)`, so the second file replaces the decoded image, the blob, and the data URL for `ast_reference`.

4. `executeAddAsset` treats an existing id as success and returns the same project with no history entry. The first `AssetRecord` (file name, mime, byte length, pixel metadata) stays. The second record is discarded.

5. The second import still adds a reference layer and a drawing layer whose cel `assetId` is `ast_reference`. The first reference cel already points at that id. Both layers resolve one bitmap.

6. Undo of the second import removes the new layers only. The asset stays in `project.assets` and in the redo/undo retention set, so `pruneRuntimeAssets` keeps the overwritten bitmap. The first layer now shows the second file.

7. The next autosave calls `saveCurrentProject`, which reads `assetStore.getBlob('ast_reference')` and `IndexedDbProjectRepository.save` puts that blob at `[projectId, ast_reference]`. The first file’s bytes are replaced in IndexedDB.

**User-visible consequence:** Import a second reference and the first reference picture changes to the second file. Undo does not bring the first picture back. After the debounced save, reload still shows the second picture. Export metadata can describe the first file while the bytes are the second. Drawing on other layers is unaffected.

**Confidence:** High. False positive would require another production caller that rewrites the id after `decodeImageFile`. The only production `createAssetId(` call with an argument is this one.

**Minimal correction:** Mint the id with `createAssetId()` (no argument). Keep `executeAddAsset` rejecting a true collision instead of returning `ok: true` with no history. Do not call `register` until the new id is known, and register the blob only for that id.

**Regression tests:**

- Import two different PNG files into one project. Expect two asset ids, two records, and two bitmaps. The first layer’s pixels stay the first file after the second import, after undo, after redo, and after save/load.
- Import the same file twice. Expect two ids (two placements), not one overwritten record, unless a later product decision explicitly deduplicates by content hash.
- `executeAddAsset` with an id that is already in `project.assets` returns `ok: false` and does not report success.

---

## H2 — P2 — Project rename skips the dirty/autosave contract

**Where:** `src/core/controller.ts` `setProjectName`, lines 1102–1107. `src/App.tsx` `handleRenameProjectInStudio`, lines 500–519. `src/core/persistence/ProjectBrowserService.ts` `renameProject`, lines 122–132.

**Invariant:** `ARCHITECTURE.md` §28 and §36. Project name is persistent project state. A creative mutation marks the project dirty, then a debounced save writes it. `ENGINEERING.md` §35. Persistence errors must not be mistaken for a saved session. `setProjectName` is intentionally outside undo (`exportInclusion.test.ts` asserts that). Being outside undo does not make it exempt from persistence.

**Proof:**

1. `setProjectName` assigns `this.project.name` and calls `notify()`. It does not increment `projectRevision` and does not call `notifyProjectMutated`. `AutosaveCoordinator` only listens to project mutations, so the coordinator stays `saved` / not dirty.

2. The UI then flushes only when the coordinator is already dirty, and then calls `renameProject`. That path loads the stored document, sets the name, and saves. It is a second writer, not the autosave revision machine.

3. If `renameProject` throws, the `catch` only `console.error`s. The in-memory snapshot already shows the new name. Save status is still `saved` when nothing else was dirty. Refresh restores the old name.

4. A crash or a closed tab in the gap after `setProjectName` and before `renameProject` resolves drops the name the same way. `pagehide` flush cannot see the rename, because the coordinator was never marked dirty.

**User-visible consequence:** The title changes immediately. The save badge can keep saying saved. The stored project still has the previous name if the follow-up write fails or never runs.

**Confidence:** High on the control flow. Medium on how often the storage write fails. Not a false positive for the missing dirty bit.

**Minimal correction:** After a non-empty rename, bump the project revision, notify project-mutation listeners with the cloned snapshot, and let the existing debounced save persist the name. Surface a failed save as `failed`, not `saved`. Keep the operation out of the undo stack.

**Regression tests:**

- Rename with no other edits. Expect `dirty === true` until save, then the loaded document’s name matches.
- Force `renameProject` / `save` to reject. Expect status `failed` and the in-memory name retained until a successful save. A reload without that save keeps the old name, and the test asserts the UI was not left on `saved`.

---

## H3 — P2 — A nested transaction commits the outer one

**Where:** `src/core/history/historyManager.ts` `beginTransaction`, lines 145–149, and `commitTransaction`, lines 155–164. Callers: `StudioController.importReferenceImage` (line 1724), `StudioShell` `handleBeginSetOpacity` (line 1013), `handleBeginTransform` (line 1074).

**Invariant:** `ARCHITECTURE.md` §10. A command group is one undo step. An import is one group (“Import Reference”). An opacity drag is a different group. Starting a second group must not close the first.

**Proof:**

1. `beginTransaction` returns immediately when `activeTransaction` is already set. It does not stack, and it does not throw.

2. `commitTransaction` commits whatever group is active and clears it.

3. `importReferenceImage` always begins, dispatches, and commits. If an opacity or transform transaction is already open, the import’s `beginTransaction` does nothing, its commands join the gesture group, and its `commitTransaction` commits that group. The gesture’s later `commitTransaction` is a no-op.

**User-visible consequence:** One undo can roll back an in-progress opacity or transform gesture together with an import, or the gesture can commit early while the pointer is still down. The file picker is modal, so the overlap is uncommon. The API still allows it, and any future `await` between `beginTransaction` and `commitTransaction` widens the window.

**Confidence:** High on the control flow. Medium on current UI frequency. Possible false positive only if every `beginTransaction` caller is proven mutually exclusive. They are not locked.

**Minimal correction:** Reject a nested `beginTransaction` (`ok: false` / thrown domain error) or use a depth counter so only the matching commit closes the group. `importReferenceImage` should fail visibly if it cannot own the transaction.

**Regression tests:**

- Begin an opacity transaction, call `importReferenceImage`, then commit the gesture. Expect either a rejected import while the gesture stays open, or two independent history entries. Expect the gesture not to commit at the import’s `commitTransaction`.

---

## H4 — P3 — The core barrel imports React and publishes Dexie

**Where:** `src/core/index.ts` lines 21 and 24. `src/core/session/useStudioController.ts` line 6 imports `useSyncExternalStore` from `react`. `src/core/persistence/index.ts` re-exports `src/core/persistence/indexedDb/database.ts`, which imports `dexie` at line 6.

**Invariant:** `ARCHITECTURE.md` §8. The domain model must not import React, IndexedDB implementation details, Firebase, or UI components. Dependency direction is UI → studio API → domain. Persistence may use Dexie behind `ProjectRepository` (`ENGINEERING.md` §34). The domain itself must not.

**Proof:** `project.ts`, `commands/executor.ts`, `history/`, and `schemas/` do not import `react` or `dexie`. The violation is the barrel. `export * from './session/useStudioController'` and `export * from './persistence'` mean any import of `src/core` loads React and Dexie. Lesson tests import `{ createOperationId } from '../../core'`, which pulls both. A production cycle was not found: `controller.ts` does not import the autosave coordinator or UI. The portable bundle test imports `src/ui/homeViewUtils`; that edge is test-only.

**User-visible consequence:** None in the drawing loop. The cost is structural. A Node or worker consumer of the barrel cannot load the domain without React and Dexie.

**Confidence:** High. False positive only if “domain model” is defined to exclude `src/core/index.ts`. The file presents itself as the core entry.

**Minimal correction:** Stop exporting the React hook and the IndexedDB classes from `src/core/index.ts`. Export `useStudioController` from a UI module. Export `IndexedDbProjectRepository` from `src/core/persistence/indexedDb/` only. Keep the domain entry on types, commands, controller, and schemas.

**Regression test:** A module-resolution test that imports `src/core/index.ts` fails if the module graph contains `react` or `dexie`.

---

## H5 — P3 — Opening a project leaves the previous project’s bitmaps in the global store

**Where:** `src/core/assets/assetStore.ts` (`defaultAssetStore`, keyed only by asset id). `src/core/controller.ts` `loadProject`, lines 2064–2076. `src/App.tsx` lines 128–129 and 369–370 (`preserveAssetStore: true`). `src/core/persistence/ProjectBrowserService.ts` `openProject`, lines 110–114, restores before that load.

**Invariant:** `ARCHITECTURE.md` §30 and §35. Runtime object URLs are not project data. Resource ownership ends when the asset is no longer live for the active project or its undo stack. IndexedDB correctly uses the compound key `[projectId+assetId]` (`database.ts` lines 45–46). The in-memory store does not.

**Proof:** `loadProject` clears the store unless `preserveAssetStore` is set. Both recovery and Open Project set that flag. `openProject` re-registers the newly opened project’s blobs, so a shared id is overwritten with that project’s blob. Ids that belong only to the previous project are not pruned, because `loadProject` does not call `pruneRuntimeAssets`. `duplicateProject` (`ProjectBrowserService.ts` lines 144–172) keeps asset ids and copies blobs under the new project id. The store can therefore hold two projects’ decoded images for the rest of the page session.

**User-visible consequence:** Extra decoded images and object URLs after switching projects. With H1, every reference already shares `ast_reference`, so a switch at least replaces that one slot via `restoreProjectAssets`. The leak is the other ids. This is not, by itself, a cross-project pixel swap, because restore runs first.

**Confidence:** High on the retain. Medium on how large it gets in a long session.

**Minimal correction:** After a successful restore, `prune` the store to `computeLiveAssetIds` of the loaded project (empty history). Keep `preserveAssetStore` only as “do not wipe before restore,” not “keep strangers.”

**Regression test:** Open project A with asset `ast_a`, then project B with asset `ast_b`. Expect `ast_a` absent from the store and `ast_b` present. Expect B’s blob bytes, not A’s, if the ids were ever equal.

---

## H6 — P3 — Save accepts a project whose asset has no blob

**Where:** `src/core/persistence/ProjectPersistenceService.ts` `saveCurrentProject`, lines 84–97. `src/core/persistence/indexedDb/IndexedDbProjectRepository.ts` `save`, lines 161–191. Load, lines 101–109, throws `MISSING_ASSET` when the blob row is absent.

**Invariant:** `ARCHITECTURE.md` §29–§30 and `ENGINEERING.md` §44. A saved project that names an asset must be openable. Import of a portable bundle already refuses a missing asset (`ProjectBundleService.importProject`). Local save does not.

**Proof:** `saveCurrentProject` adds a blob only when `assetStore.getBlob(asset.id)` returns one. `save` writes the document, puts only the blobs it was given, and deletes stored rows that are no longer in `project.assets`. It never checks that every current asset id has a blob either in the map or already in the table. A first save of a new asset id with an empty map commits a document load cannot open.

The production autosave path usually has the blob, because `importReferenceImage` registers it before dispatch. `App.tsx` passes `defaultAssetStore` into `saveLessonAsProject`. The hole is the repository contract, not the current button wiring.

**User-visible consequence:** A save that races a store clear, or a caller that omits the store, produces a project the browser lists and then refuses to open (`MISSING_ASSET`).

**Confidence:** High on the missing check. Medium that today’s UI hits it without H1. H1 is the case that does hit a blob, and it is the wrong blob.

**Minimal correction:** Inside the write transaction, if any `project.assets` id has no blob in the map and no existing row, abort with `PersistenceError('MISSING_ASSET')` and do not put the project row.

**Regression test:** Save a valid document that lists `ast_new` with an empty blob map and an empty assets table. Expect a thrown `MISSING_ASSET` and no project row.

---

## Hypotheses (not filed as defects)

- `getActiveScene`, `getActiveLayer`, and `getLayers` return the live document, while `getProjectSnapshot` returns a deep-frozen clone (`controller.ts` `buildSnapshot`, lines 360–369). A caller that writes a field on the live scene bypasses commands and undo. Production UI and tools found in this pass only read those objects, except `setProjectName`, which is H2. Not upgraded to a defect without a writer.

- `selectionIntegration.test.ts` fixed-wait autosave flake remains an open note in `ENGINEERING.md` §90–§93. This audit did not re-run it. Do not treat a green local run as closing it.

- `pagehide` / `visibilitychange` call `flush()` without awaiting it (`AutosaveCoordinator.ts` lines 390–403). Browsers often discard that promise when the document is hidden. That matches the usual page-lifecycle limit. It is not a new logic bug on top of H2.

- Redo of `AddStroke` contains a branch that recreates a cel at `startFrame: 0` when `createdCel` is set and `createdCelDocument` is absent (`history/applier.ts` around lines 1232–1240). Both creation paths in `executeAddStroke` set `createdCelDocument`. The branch looks dead. Not filed.

- A GIF whose MIME is `image/png` is not rejected by the GIF extension check in `decodeImageFile` (lines 154–166). Decode still has to succeed. Not demonstrated with a fixture in this pass.

---

## Where the code meets the contract

- **React does not own the document.** Strokes commit through `StudioController.dispatch` → `executeStudioCommand`. `BrushTool` keeps the in-progress stroke off the document until pointer-up. Playback (`setPlaybackFrame`) writes editor state only. `ARCHITECTURE.md` §5 and §24 hold for those paths.

- **Undo is a real stack.** History entries are applied by `applyUndo` / `applyRedo`. Duplicate layer clones cels and mints new cel, operation, panel, and text ids (`executor.ts` `executeDuplicateLayer`). Zod `superRefine` on the project schema rejects duplicate scene, layer, and asset ids and a reference cel whose `assetId` is missing (`schemas/project.ts`). Portable import calls `validateSemanticProjectIds` and refuses a `projectId` that already exists locally.

- **Autosave is debounced and failure-tolerant.** Default delay is 1000 ms. An in-flight save sets `needsResave` instead of overlapping writes. A thrown persistence error sets status `failed` and leaves the in-memory document in place (`AutosaveCoordinator.ts`). It does not persist on each pointer sample. H2 is the hole in that story for rename only.

- **Exporters share `renderArtwork`.** PNG (`src/ui/exportMedia.ts`), GIF, WebM, and PNG sequence call it with `isMediaExport: true`. Onion skin is drawn by `CanvasRenderer`, not by `renderArtwork`. Guide layers and `includeInMediaExport !== true` reference layers are skipped. AI Prep strips reference and guide layers and packages chosen references as separate PNGs (`aiPrep/model.ts` `planAiPrep`). That split matches `EXPORT-005`, not a second compositor. Object URLs are rejected in portable JSON by `validateNoForbiddenUrls` (`blob:` and `data:image/`).

- **Workers are cancellable.** GIF and WebM clients `terminate()` the worker on abort and on failure (`gif/client.ts` `close`). Zip entry paths reject `..`, absolute paths, backslashes, and NUL (`zipSafety.ts`).

- **No `dangerouslySetInnerHTML`** in `src/`. User text is not injected as HTML by that API.

- **Duplicate project ids.** `duplicateProject` mints a new project id and deep-clones the document. Asset ids are intentionally kept and re-keyed by project id in IndexedDB. That part matches `PROJECT_FORMAT.md` §8. H1 and H5 are about the runtime id and the global store, not about this clone.

---

## What this pass did not do

No `pnpm install`, lint, typecheck, unit run, Chrome proof, or export proof. Appearance, animation feel, and the open autosave timing note are not re-measured here. Line numbers refer to `181cfcbfff0280262cf7ee68c6d43ee60945e7dd`.

## Foreman

Stop. H1 is the blocking correctness fix. H2 and H3 are the next patches. H4–H6 can ride with that persistence pass. Do not treat this note as authorization to edit the tree.
