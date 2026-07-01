---
name: schematic
description: >-
  Implement or extend Schematic (pluggable Prisma annotation pipeline). Use when
  working on Schematic core, state/diff/migrations, handler registry, CLI
  enhance/validate, or when the user asks to implement the next phase from
  docs/status.md.
---

# Schematic Development

## Start here

1. Read [AGENTS.md](../../AGENTS.md)
2. Read [docs/status.md](../../docs/status.md) — **implementation truth**; do not trust roadmap/README alone
3. Read [docs/plan.md](../../docs/plan.md) for architecture invariants

## Non-negotiables

- No hard-coded annotation types in `src/`
- Annotations from DMMF `documentation` only
- Persist `upSql` + `downSql` in state; enhance baselines git HEAD
- Update `docs/status.md` + affected docs in the same PR as code

## Implementing the next phase

1. Open `docs/status.md` and pick an unchecked item from "Not implemented"
2. Implement the smallest vertical slice with tests
3. Update `docs/status.md` (move item to Implemented)
4. Update other docs if behavior/architecture/user-facing API changed (see AGENTS.md table)
5. Run `pnpm test && pnpm typecheck && pnpm lint`

## Key modules (target layout)

| Module | Role |
| ------ | ---- |
| `src/registry/` | Load user `AnnotationDefinition[]` |
| `src/state/extractor.ts` | Scan DMMF docs, match handlers |
| `src/state/builder.ts` | Build state, preserve stored SQL by id |
| `src/state/comparator.ts` | Diff by feature id |
| `src/migrations/` | Append ordered SQL to Prisma migrations |
| `src/cli/` | `enhance`, `validate` |

## Testing focus

- Parser edge cases (`annotation.utils.ts`)
- Diff/reversal: removed feature emits stored `downSql` without handler
- Builder preserves SQL for unchanged ids
- Delete ordering: `dropPriority`, then reverse `createdAt`

## References

- Handler API: [docs/handlers.md](../../docs/handlers.md)
- Architecture: [docs/architecture.md](../../docs/architecture.md)
- Example handlers: `examples/handlers/` (when present)
