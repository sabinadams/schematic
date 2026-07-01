# Schematic Roadmap

## Overview

Schematic extends Prisma with custom database features via a pluggable annotation system. Users define Zod schemas and handlers; core handles extraction, state, diffing, and migration SQL.

**Key principles:**

- Prisma handles core schema (tables, columns, FKs, basic indexes)
- Schematic handles user-defined enhancements via annotations and handlers
- Use Prisma's built-in migration workflow — don't wrap or replace Prisma commands
- Minimal CLI surface area — `enhance` and `validate` only
- Nothing feature-specific is hard-coded in core

---

## Current Architecture

### Two-Phase Migration System

```
┌─────────────────────────────────────────────┐
│         Prisma Schema (schema.prisma)       │
│         + /// @schematic.* doc comments     │
│         + schematic.handlers.ts             │
└──────────────┬─────────────────┬────────────┘
               │                 │
         ┌─────▼──────┐    ┌─────▼──────────┐
         │   Prisma   │    │   Schematic    │
         │  Handles   │    │   Enhances     │
         └─────┬──────┘    └─────┬──────────┘
               │                 │
         ┌─────▼──────┐    ┌─────▼──────────┐
         │ Migration  │    │ Migration      │
         │   Files    │    │   Files        │
         └─────┬──────┘    └─────┬──────────┘
               │                 │
               └────────┬────────┘
                        ▼
         ┌──────────────────────────────────┐
         │         Database                 │
         │ ✅ Tables, FKs (Prisma)          │
         │ ✅ Basic indexes (Prisma)        │
         │ ✅ Custom features (Schematic)   │
         └──────────────────────────────────┘
```

### Responsibilities

#### Prisma Handles

- Tables, columns, data types
- Primary keys, unique constraints, foreign keys
- Basic indexes from `@@index`
- Enums, defaults, migration history, client generation

#### Schematic Handles

- Extract `@schematic.*` annotations from DMMF documentation
- Validate via user-provided Zod schemas
- Generate SQL via user-provided handlers (`up` / `mutate`)
- Track desired state in `.schematic-state.json`
- Diff and append SQL to Prisma migration files
- Reverse features using stored `downSql`

#### User Handlers Handle

- Annotation-specific validation (Zod schema)
- SQL generation (`upSql`, `downSql`)
- Provider-specific syntax (PostgreSQL GIN, partial indexes, etc.)

---

## Workflow

### Development

```bash
# 1. Modify schema and/or handlers
vim prisma/schema.prisma
vim schematic.handlers.ts

# 2. Create migration with Prisma
npx prisma migrate dev --create-only --name add_partial_index

# 3. Enhance migration with Schematic
npx schematic enhance

# 4. Apply with Prisma (updates state file via prisma generate)
npx prisma migrate dev
```

**Step 3 details (`schematic enhance`):**

- Loads baseline state from git HEAD
- Builds current state from schema + handlers
- Diffs to detect additions, removals, changes
- Appends ordered SQL to the latest Prisma migration file

**Step 4 details (`prisma migrate dev`):**

- Applies combined migration (Prisma + Schematic SQL)
- Runs `prisma generate` → Schematic generator writes updated state file

### Production Deployment

```bash
npx prisma migrate deploy
```

Migration files contain all SQL. No Schematic CLI needed in production.

---

## State File

### Purpose

`.schematic-state.json` tracks every Schematic-managed feature and its reversal SQL.

### Schema

```json
{
  "version": "1",
  "generatedAt": "2026-07-01T10:00:00.000Z",
  "schemaHash": "abc123def456",
  "features": [
    {
      "id": "a1b2c3d4...",
      "type": "partialIndex",
      "model": "Post",
      "input": {
        "columns": ["status"],
        "where": "status = 'active'"
      },
      "upSql": "CREATE INDEX IF NOT EXISTS \"Post_status_partial_idx\" ON \"Post\"(\"status\") WHERE status = 'active';",
      "downSql": "DROP INDEX IF EXISTS \"Post_status_partial_idx\";",
      "createdAt": "2026-07-01T10:00:00.000Z"
    }
  ]
}
```

### Management

- Commit to git (recommended) — like `package-lock.json`
- Regenerated on every `prisma generate`
- Merge conflicts: run `npx prisma generate` to regenerate
- CI validation: `npx schematic validate`

### Reversal

When an annotation is removed, `schematic enhance` emits the stored `downSql` from the git HEAD baseline. This works even if the handler is later removed from config — the state file is the source of truth for undo.

---

## CLI Commands

### `schematic enhance`

Appends Schematic SQL to the most recent Prisma migration file.

```bash
npx schematic enhance
```

Run after `prisma migrate dev --create-only` and before `prisma migrate dev`.

### `schematic validate`

Validates committed state file matches current schema.

```bash
npx schematic validate
```

---

## Completed Features

### Phase 1: Core Infrastructure

- [x] Pluggable `AnnotationDefinition` contract (Zod schema + handler)
- [x] Handler registry with dynamic import from generator config
- [x] DMMF documentation extraction (model + field)
- [x] Generic annotation parser (`@prefix.type(args)`)
- [x] State file generation with schema hash and stable feature ids
- [x] State file type definitions (`features[]` with stored SQL pairs)

### Phase 2: State Management

- [x] State writer (persist on `prisma generate`)
- [x] State loader (graceful null on first run)
- [x] Git HEAD baseline loader for enhance
- [x] State comparator (diff by feature id: added / removed / changed)
- [x] Preserve stored `downSql` for unchanged features

### Phase 3: Migration Integration

- [x] `schematic enhance` command
- [x] Find latest Prisma migration file
- [x] Ordered SQL emission (drops → creates → mutations)
- [x] Append SQL with separator comments
- [x] Delete ordering via `dropPriority` and `createdAt`

### Phase 4: CLI & Validation

- [x] `schematic validate` command
- [x] Separate CLI and generator binaries
- [x] Example handlers (partial index, GIN index, check constraint, FK index)
- [x] Handler authoring documentation

### Phase 5: Documentation

- [x] README with pluggable design
- [x] Architecture documentation
- [x] Handler authoring guide
- [x] Workflow and reversal guarantees documented

---

## Future Work

See [future.md](./future.md) for detailed plans.

### Near-term

- [ ] `schematic diff` — preview SQL without modifying migration files
- [ ] `@@schematic[...]` attribute block support (if DMMF exposes them)
- [ ] Field-level annotation examples and edge case tests

### Medium-term

- [ ] Cloud state storage (GCP, S3, Azure)
- [ ] State locking for concurrent operations
- [ ] Optional `schematic clean` with per-provider introspection
- [ ] VSCode extension for annotation autocomplete

### Long-term

- [ ] Triggers and stored procedures as example handlers
- [ ] Web UI for migration preview
- [ ] Schema migration history comparison

---

## Technical Decisions

### Why pluggable handlers instead of built-in annotation types?

Different projects need different database features. Hard-coding partial indexes, GIN indexes, etc. in core would require maintaining provider-specific logic for every feature. A registry-driven design lets users define exactly what they need.

### Why persist downSql in state?

When a handler is removed from config, Schematic still needs to reverse already-applied features. Storing `downSql` at creation time makes the committed state file the authoritative undo record — no handler required at removal time.

### Why git HEAD baseline for enhance?

Workflow order is: create migration → enhance → apply (which runs generate). If enhance used the post-generate disk state, removals would lose their stored `downSql` before enhance could emit it.

### Why append to Prisma's migration file?

- Official Prisma workflow for [unsupported features](https://www.prisma.io/docs/orm/prisma-migrate/workflows/unsupported-database-features)
- Single migration = single transaction = atomicity
- Standard `--create-only` workflow
- No duplicate migration history entries

### Why no introspection?

- 80% less code for marginal benefit in v1
- Idempotent SQL (`IF NOT EXISTS`) is sufficient
- State file diffing handles additions and removals
- Can add optional introspection later (`schematic clean`)

---

## Success Metrics

**v1.0 achieved:**

- Users define custom annotation types via Zod + handler
- Core has zero hard-coded feature logic
- `prisma generate` writes state file with stored SQL pairs
- `schematic enhance` diffs and appends migration SQL
- Removals work via stored `downSql`, even without handler
- Example handlers cover common PostgreSQL patterns
- CI validation via `schematic validate`
