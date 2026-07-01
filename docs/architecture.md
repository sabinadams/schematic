# Architecture

## Overview

Schematic is a **pluggable annotation pipeline** for Prisma. Core provides orchestration; users provide Zod schemas and handlers for each annotation type. Nothing feature-specific is hard-coded.

---

## Quick Reference

### Folder Overview

| Folder           | Purpose                                                         |
| ---------------- | --------------------------------------------------------------- |
| `generator/`     | Prisma generator entry point — runs on `prisma generate`        |
| `registry/`      | Load and validate user handler modules                          |
| `state/`         | Extract, build, load, compare, and write state                  |
| `migrations/`    | Find latest Prisma migration and append Schematic SQL           |
| `cli/`           | `enhance` and `validate` commands                               |
| `types/`         | TypeScript types including public `AnnotationDefinition` API    |
| `utils/`         | Annotation parsing, file ops, hashing                           |

### Data Flow

```
Prisma Schema (/// @schematic.* doc comments)
        ↓
   Prisma DMMF (model.documentation, field.documentation)
        ↓
   extractFromDmmf() → parseAnnotation()
        ↓
   Match _schematic_type → registry handler
        ↓
   handler.schema.parse() (Zod)
        ↓
   handler.up() → { upSql, downSql }
        ↓
   State { features: StateFeature[] }
        ↓
   schematic enhance: diff vs git HEAD → append SQL to migration
```

---

## Design Philosophy

Schematic follows a **functional approach with small, focused files**.

### Core vs user code

| Responsibility         | Owner        |
| ---------------------- | ------------ |
| Parse doc comments     | Schematic    |
| Validate annotation args | User (Zod) |
| Generate SQL           | User (handler) |
| Track state            | Schematic    |
| Diff and emit migrations | Schematic  |

Handlers do **not** define where annotations come from. Core scans DMMF `documentation` on models and fields.

### Why functional?

This tool is primarily about transformations:

- Schema → State
- State A → State B (diffing)
- Diff → SQL
- Annotations → Parsed objects

Pure functions with clear inputs/outputs are easier to test, compose, and reason about.

---

## Folder Structure

```
src/
├── index.ts                  # Prisma generator entry (generatorHandler)
├── cli.ts                    # CLI entry (enhance, validate)
│
├── generator/
│   ├── generate.ts           # Orchestrate state generation on prisma generate
│   ├── config.ts             # Extract generator config (handlers path, etc.)
│   └── generate.test.ts
│
├── registry/
│   ├── loader.ts             # Dynamic import of user handlers module
│   ├── types.ts              # AnnotationDefinition (public API)
│   └── loader.test.ts
│
├── state/
│   ├── extractor.ts          # Scan DMMF documentation, parse, match handlers
│   ├── builder.ts            # Build state, merge previous downSql for stable ids
│   ├── loader.ts             # Load state from disk (null if missing)
│   ├── git-loader.ts         # Load baseline state from git HEAD
│   ├── writer.ts             # Write state to disk
│   ├── comparator.ts         # Diff old vs new state by feature id
│   └── *.test.ts
│
├── migrations/
│   ├── appender.ts           # Find latest migration, append SQL block
│   └── sql-emitter.ts        # Order drops/creates/mutations from diff
│
├── cli/
│   ├── enhance.ts            # enhance command
│   └── validate.ts           # validate command
│
├── types/
│   ├── definition.types.ts   # AnnotationDefinition, SqlPair, HandlerContext
│   ├── state.types.ts        # State, StateFeature
│   ├── schematic.types.ts    # SchematicConfig
│   └── prisma.types.ts       # Generator options
│
└── utils/
    ├── annotation.utils.ts   # parseAnnotation() — JSON-like arg parsing
    ├── file.utils.ts
    ├── hash.ts               # Stable id generation
    └── *.test.ts

examples/
└── handlers/
    ├── partial-index.ts
    ├── gin-index.ts
    ├── check-constraint.ts
    └── fk-index.ts
```

---

## Annotation Extraction

Annotations are doc comments in `schema.prisma`. Prisma exposes them on DMMF:

- `model.documentation` — for `///` comments above a model
- `field.documentation` — for `///` comments above a field

Core extraction (`state/extractor.ts`):

1. Walk `dmmf.datamodel.models`
2. Split `model.documentation` and each `field.documentation` by newline
3. Filter lines starting with `@${annotationPrefix}.`
4. Parse with `parseAnnotation()` → `{ _schematic_type, ...args }`
5. Attach context: `{ model, field?, ...parsed }`
6. Look up handler in registry by `definition.type === _schematic_type`
7. Validate with `definition.schema.parse()`

Unknown annotation types (no registered handler) throw immediately.

`@@` attribute blocks are not supported in v1 — only DMMF `documentation` strings.

---

## Handler Registry

Users export `AnnotationDefinition[]` from a module referenced in generator config:

```prisma
generator schematic {
  handlers = "./schematic.handlers.ts"
}
```

`registry/loader.ts` dynamically imports this module relative to the schema path. Each definition provides:

```typescript
interface AnnotationDefinition<TSchema extends z.ZodType> {
  type: string;
  schema: TSchema;
  dropPriority?: number;
  handlers: {
    up: (input, ctx) => SqlPair;
    mutate?: (old, next, ctx) => SqlPair;
  };
}
```

---

## State Model

```typescript
interface State {
  version: '1';
  generatedAt: string;
  schemaHash: string;
  features: StateFeature[];
}

interface StateFeature {
  id: string;           // hash(type + model + field? + canonicalJson(input))
  type: string;
  model: string;
  field?: string;
  input: Record<string, unknown>;
  upSql: string;
  downSql: string;
  createdAt: string;
}
```

### Key invariants

1. **`downSql` is persisted at creation** — never recomputed on removal
2. **Unchanged features preserve stored SQL** — matched by stable `id`; `up()` is not re-called
3. **State file is committed to git** — like `package-lock.json` for DB enhancements

---

## Generate Path (`prisma generate`)

`generator/generate.ts`:

1. Load handler registry from config
2. Load previous state from disk (null on first run)
3. Extract and validate annotations from DMMF
4. For each feature:
   - If `id` exists in previous state with same input → preserve stored `upSql`/`downSql`
   - Otherwise → call `handler.up()`, store new SQL pair
5. Write updated state via `state/writer.ts`

Generate does **not** append SQL to migrations. That is the CLI's job.

---

## Enhance Path (`schematic enhance`)

`cli/enhance.ts`:

1. Parse schema and build DMMF
2. Load **baseline state from git HEAD** (`state/git-loader.ts`) — not current disk file
3. Build current state (same pipeline as generate)
4. Diff via `state/comparator.ts`:
   - **Added** — `id` in current, not in baseline → emit `upSql`
   - **Removed** — `id` in baseline, not in current → emit stored `downSql` from baseline
   - **Changed** — same `id`, different input → emit `mutate()` or down + up
5. Order SQL via `migrations/sql-emitter.ts`:
   - Drops: `dropPriority` desc, then `createdAt` desc
   - Creates: stable order by `id`
   - Mutations: down then up per feature
6. Append to latest Prisma migration via `migrations/appender.ts`

### Why git HEAD baseline?

Workflow order:

```bash
prisma migrate dev --create-only   # 1. Prisma migration created
schematic enhance                  # 2. Schematic SQL appended (baseline = git HEAD)
prisma migrate dev                 # 3. Applied; prisma generate updates state file
```

If enhance used the disk state file after `prisma generate`, removals would lose their stored `downSql` before enhance runs.

---

## Reversal

| Scenario                         | Behavior                                                |
| -------------------------------- | ------------------------------------------------------- |
| Annotation removed from schema   | Enhance emits stored `downSql` from git HEAD baseline   |
| Handler removed from config      | Already-applied features still reversible via state     |
| Annotation in schema, no handler | Fail fast at validation                                 |
| Handler logic changed            | Unchanged `id` keeps stored SQL; new input = new `id`   |

---

## Module Responsibilities

### `generator/`

- **`generate.ts`** — orchestrate state generation on `prisma generate`
- **`config.ts`** — extract `handlers`, `stateFilePath`, `annotationPrefix`, `databaseProvider`

### `registry/`

- **`loader.ts`** — dynamic import of user handlers module
- **`types.ts`** — public `AnnotationDefinition` API exported from package

### `state/`

- **`extractor.ts`** — DMMF documentation scan, parse, validate via registry
- **`builder.ts`** — assemble state, merge previous SQL for stable ids
- **`loader.ts`** — read state from disk
- **`git-loader.ts`** — read state from `git show HEAD:path`
- **`writer.ts`** — write state JSON
- **`comparator.ts`** — diff by feature `id`

### `migrations/`

- **`appender.ts`** — find latest migration directory, append Schematic SQL block with separator comments
- **`sql-emitter.ts`** — convert diff to ordered SQL statements

### `cli/`

- **`enhance.ts`** — full enhance pipeline
- **`validate.ts`** — rebuild state, compare to committed state file

### `utils/`

- **`annotation.utils.ts`** — parse `@prefix.type(args)` strings with JSON-like arg syntax
- **`hash.ts`** — SHA256 for schema hash and stable feature ids
- **`file.utils.ts`** — read/write JSON, path resolution

---

## Testing Strategy

```typescript
// Unit: pure functions
describe('compareStates', () => {
  it('detects removed features and preserves downSql', () => {
    const oldState = { features: [featureWithDownSql] };
    const newState = { features: [] };
    const diff = compareStates(oldState, newState);
    expect(diff.removed[0].downSql).toBe('DROP INDEX IF EXISTS "foo";');
  });
});

// Integration: handler → state → diff → SQL
describe('enhance', () => {
  it('emits stored downSql when annotation removed and handler deleted', async () => {
    // baseline state has feature with downSql
    // current schema has no annotation
    // registry has no handler for that type
    // enhance still emits downSql from baseline
  });
});
```

---

## Anti-Patterns

### Don't hard-code feature types in core

```typescript
// BAD
if (type === 'partialIndex') { /* special logic */ }

// GOOD
const handler = registry.get(type);
handler.schema.parse(input);
handler.handlers.up(input, ctx);
```

### Don't re-call up() for unchanged features

Stored SQL pairs are migration history. Preserve them by stable `id`.

### Don't use disk state as enhance baseline

Use git HEAD to avoid losing `downSql` before enhance runs.

---

## Future Considerations

See [future.md](./future.md) for planned extensions: cloud state storage, `schematic diff`, introspection, `@@` attribute block support.

See [handlers.md](./handlers.md) for the handler authoring reference.
