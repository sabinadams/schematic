# Pluggable Annotation Pipeline — Design Reference

This document describes the implemented architecture for Schematic's pluggable annotation system. It serves as the canonical design reference for the codebase.

---

## Goal

Users define annotation types via **Zod schema + handler**. Schematic orchestrates extraction, validation, state tracking, diffing, and migration SQL — nothing feature-specific is hard-coded in core.

**Reversal strategy:** persist exact `downSql` in state when a feature is first created, so removal never requires the handler to still exist.

---

## Core Contract

```typescript
interface AnnotationDefinition<TSchema extends z.ZodType> {
  type: string;
  schema: TSchema;
  dropPriority?: number;
  handlers: {
    up: (input: z.infer<TSchema>, ctx: HandlerContext) => SqlPair;
    mutate?: (old: z.infer<TSchema>, next: z.infer<TSchema>, ctx: HandlerContext) => SqlPair;
  };
}

interface SqlPair { upSql: string; downSql: string }

interface HandlerContext {
  model: string;
  field?: string;
  tableName: string;
  databaseProvider: string;
  dmmf: DMMF.Document;
}
```

Users export an array from a module referenced in generator config:

```prisma
generator schematic {
  provider  = "schematic"
  handlers  = "./schematic.handlers.ts"
}
```

---

## Annotation Extraction

Annotations are doc comments in `schema.prisma`. Prisma exposes them on DMMF `model.documentation` and `field.documentation`.

Core extraction pipeline (single shared function, not per-handler):

1. Walk DMMF `datamodel.models`
2. Read `model.documentation` and each `field.documentation`
3. Filter lines starting with `@${annotationPrefix}.`
4. Parse each line with `parseAnnotation()`
5. Attach context: `{ model, field?, ...parsed }`
6. Match `_schematic_type` to registered handler by `definition.type`
7. Validate with `definition.schema`

Handlers do not define where annotations come from.

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
  id: string;
  type: string;
  model: string;
  field?: string;
  input: Record<string, unknown>;
  upSql: string;
  downSql: string;
  createdAt: string;
}
```

Key invariant: `downSql` is written once when the feature first appears and never recomputed on removal.

---

## Data Flow

### `prisma generate`

1. Load registry from handlers config path
2. Build current state from DMMF
3. For each validated feature, call `handler.up()` → store `upSql` + `downSql`
4. Preserve existing SQL for unchanged features (match by `id`)
5. Write state to disk

### `schematic enhance`

1. Parse schema + DMMF
2. Baseline state = git HEAD committed state file
3. Build current state from schema
4. Diff via comparator
5. Emit ordered SQL, append to latest migration

**Critical workflow rule:** run `schematic enhance` before `prisma migrate dev` applies the migration.

---

## Reversal

| Case | Behavior |
| ---- | -------- |
| Annotation removed | Enhance emits stored `downSql` from git HEAD baseline |
| Handler removed | Already-applied features reversible via state; unknown types in schema fail fast |
| Handler logic changed | Unchanged ids preserve stored SQL; changed input = new id = remove + add |

### Delete ordering

Drops sorted by `dropPriority` desc, then `createdAt` desc. Handlers should use idempotent down SQL (`IF EXISTS`).

---

## What is not in core

- Hard-coded annotation types (partialIndex, ginIndex, etc.)
- Built-in FK auto-indexing
- Cloud state storage
- Database introspection
- `@@` attribute block annotations (v1 uses DMMF documentation only)

Example handlers live in `examples/handlers/`.

---

## Related docs

- [Architecture](./architecture.md) — module layout and implementation details
- [Handler guide](./handlers.md) — authoring reference for users
- [Roadmap](./roadmap.md) — completed features and future work
