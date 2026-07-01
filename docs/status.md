# Implementation Status

This document tracks **what is actually implemented in code** vs what the rest of the documentation describes as the target architecture.

**Last updated:** 2026-07-01 (branch: `docs/pluggable-annotation-pipeline`)

When implementing features, update this file in the same PR as the code changes.

---

## Summary

| Area | Documented | Implemented |
| ---- | ---------- | ----------- |
| Pluggable handler registry | Yes | No |
| DMMF documentation extraction | Yes | Partial (model docs only) |
| Generic `features[]` state | Yes | No (hard-coded `indexes[]`) |
| Stored `upSql` / `downSql` | Yes | No |
| State writer | Yes | No |
| State comparator | Yes | No |
| Git HEAD baseline loader | Yes | No |
| `schematic enhance` CLI | Yes | No |
| `schematic validate` CLI | Yes | No |
| Example handlers | Yes | No |
| Reversal without handler | Yes | No |

---

## Implemented (on `main` / early foundation)

- Prisma generator entry point (`src/index.ts`)
- Generator config extraction (`src/generator/config.ts`)
- Annotation parser (`src/utils/annotation.utils.ts`) — generic `@prefix.type(args)` parsing
- DMMF model documentation extraction (`src/state/extractor.ts`) — **model docs only**
- Closed Zod registry with single `index` type (`src/schemas/`)
- State builder with `generatedAt`, `schemaHash`, `indexes[]` (`src/state/builder.ts`)
- State loader from disk (`src/state/loader.ts`) — throws if missing (should return null)
- File utils, hash utils
- Unit tests for above modules

## Not implemented (documented as target)

### Registry & handlers

- [ ] `AnnotationDefinition` public API (`src/registry/types.ts`)
- [ ] Dynamic handler loader from generator `handlers` config (`src/registry/loader.ts`)
- [ ] Remove closed `src/schemas/index.ts` registry
- [ ] Move `index.schema.ts` to `examples/handlers/`

### State

- [ ] `State.features[]` replacing `State.indexes[]`
- [ ] Stable feature `id` generation
- [ ] Persist `upSql` and `downSql` per feature
- [ ] Merge previous state to preserve SQL for unchanged ids (`src/state/builder.ts`)
- [ ] State writer (`src/state/writer.ts`)
- [ ] Loader returns `null` on missing file (first run)
- [ ] Field-level documentation scanning in extractor

### Diff & migrations

- [ ] State comparator (`src/state/comparator.ts`)
- [ ] Git HEAD baseline loader (`src/state/git-loader.ts`)
- [ ] Migration appender (`src/migrations/appender.ts`)
- [ ] SQL emitter with drop ordering (`src/migrations/sql-emitter.ts`)

### CLI

- [ ] Separate `dist/cli.js` binary
- [ ] `schematic enhance` command
- [ ] `schematic validate` command

### Examples

- [ ] `examples/handlers/partial-index.ts`
- [ ] `examples/handlers/gin-index.ts`
- [ ] `examples/handlers/check-constraint.ts`
- [ ] `examples/handlers/fk-index.ts`

---

## Intentionally not planned (core)

- Hard-coded `partialIndex`, `ginIndex`, `check` in core
- Built-in `autoIndexForeignKeys` (example handler only)
- Cloud state storage
- Database introspection
- `@@` attribute block annotations (v1)

See [future.md](./future.md).

---

## How to update this file

When completing an item:

1. Move it from "Not implemented" to "Implemented" with the file path
2. Update the summary table
3. If docs claimed completion prematurely, no doc change needed once code lands

When partially implementing:

1. Note exactly what works and what doesn't
2. Don't mark roadmap items complete in [roadmap.md](./roadmap.md) until reflected here
