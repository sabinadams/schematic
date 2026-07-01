# Agent Guide — Schematic

This file orients AI agents (Cursor, Claude, etc.) working in this repo. Read it first.

## What this project is

Schematic is a **Prisma generator + CLI** that lets users define custom database annotations via **Zod schemas and handlers**. Core orchestrates extraction, validation, state, diffing, and migration SQL. **Nothing feature-specific is hard-coded in core.**

Target workflow:

```bash
prisma migrate dev --create-only --name my_change
schematic enhance          # diff vs git HEAD, append SQL
prisma migrate dev         # apply + prisma generate updates state
```

## Documentation map

| Doc | Purpose |
| --- | ------- |
| [docs/plan.md](docs/plan.md) | Canonical design reference (start here for architecture) |
| [docs/architecture.md](docs/architecture.md) | Module layout, data flows, invariants |
| [docs/handlers.md](docs/handlers.md) | How users author handlers |
| [docs/status.md](docs/status.md) | **What is implemented vs documented** |
| [docs/roadmap.md](docs/roadmap.md) | Completed phases and future work |
| [docs/future.md](docs/future.md) | Explicitly out-of-scope / later items |
| [README.md](README.md) | User-facing overview |

## Non-negotiable design rules

1. **No hard-coded annotation types in core** — partial indexes, GIN indexes, FK auto-index, etc. belong in `examples/handlers/` or user projects, not `src/`.
2. **Annotations come from DMMF `documentation`** — doc comments (`///`) on models and fields. Handlers do not define where annotations are found.
3. **Persist `downSql` in state at creation** — reversals use stored SQL from the state file, not re-invoked handlers. This allows undo even after a handler is removed.
4. **`schematic enhance` baselines against git HEAD** — not the post-`prisma generate` disk state. See [docs/plan.md](docs/plan.md).
5. **Functional, small files** — pure functions, composition over inheritance. See [docs/architecture.md](docs/architecture.md).
6. **Minimal scope** — match existing conventions; don't add unrelated code, tests, or docs unless requested.

## Key types (target architecture)

```typescript
// User-facing (registry/types.ts)
interface AnnotationDefinition<TSchema extends z.ZodType> {
  type: string;
  schema: TSchema;
  dropPriority?: number;
  handlers: {
    up: (input, ctx) => { upSql: string; downSql: string };
    mutate?: (old, next, ctx) => SqlPair;
  };
}

// State (state.types.ts)
interface StateFeature {
  id: string;       // stable hash(type + model + field? + input)
  type: string;
  model: string;
  input: Record<string, unknown>;
  upSql: string;
  downSql: string;  // persisted at creation, used for reversal
  createdAt: string;
}
```

## Before making changes

1. Read [docs/status.md](docs/status.md) — docs may describe target state; code may lag.
2. Check `.cursor/rules/` for file-specific constraints.
3. Prefer extending the registry pipeline over adding special cases in extractor/builder.
4. Do not reintroduce closed registries like `src/schemas/index.ts` with hard-coded types.

## Common mistakes to avoid

- Adding `partialIndex`, `ginIndex`, etc. as built-in core logic
- Re-calling `handler.up()` for unchanged features (preserve stored SQL by stable `id`)
- Using disk state as enhance baseline instead of git HEAD
- Scanning for annotations outside DMMF `documentation` without an explicit design change
- Updating README/roadmap to claim features are done before code implements them (update `docs/status.md` instead)

## Testing expectations

- Unit test pure functions (parser, comparator, hash, builder)
- Test reversal: removal emits stored `downSql` even when handler is absent
- Test delete ordering: `dropPriority` then reverse `createdAt`

## Branch context

- `docs/pluggable-annotation-pipeline` — documentation describes target architecture
- Implementation work should align docs/code or update `docs/status.md` when intentionally partial

## Agent rules (Cursor)

Rule sources live in [`docs/agent-rules/`](docs/agent-rules/). Copy to `.cursor/rules/*.mdc` per that README, or switch to Agent mode to install them automatically.
