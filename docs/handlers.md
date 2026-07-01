# Handler Authoring Guide

Schematic core provides orchestration — extraction, validation, state management, diffing, and migration appending. **All feature logic lives in user-defined handlers.**

---

## Overview

Each annotation type you want to support requires:

1. A **Zod schema** — validates parsed annotation arguments
2. A **handler** — produces `upSql` and `downSql` for database changes
3. **Registration** — export from your `schematic.handlers.ts` module

Annotations are written as doc comments in `schema.prisma`:

```prisma
/// @schematic.partialIndex(columns: ["status"], where: "status = 'active'")
model Post {
  status String
}
```

Prisma surfaces these on DMMF `model.documentation` (and `field.documentation` for field-level annotations). Schematic core scans those strings — handlers do not define where annotations are found.

---

## The `AnnotationDefinition` Contract

```typescript
import { z } from 'zod';
import type { AnnotationDefinition, HandlerContext, SqlPair } from 'schematic';

export const partialIndex: AnnotationDefinition = {
  type: 'partialIndex',

  schema: z.object({
    model: z.string(),
    field: z.string().optional(),
    columns: z.array(z.string()).min(1),
    where: z.string(),
    name: z.string().optional(),
  }),

  dropPriority: 0,

  handlers: {
    up(input, ctx: HandlerContext): SqlPair {
      const name =
        input.name ?? `${ctx.model}_${input.columns.join('_')}_partial_idx`;
      const cols = input.columns.map((c) => `"${c}"`).join(', ');

      return {
        upSql: `CREATE INDEX IF NOT EXISTS "${name}" ON "${ctx.tableName}"(${cols}) WHERE ${input.where};`,
        downSql: `DROP INDEX IF EXISTS "${name}";`,
      };
    },

    mutate(old, next, ctx): SqlPair {
      // Optional: custom logic when args change but identity is preserved
      // Default behavior (if omitted): remove old + add new
      const down = partialIndex.handlers.up(old, ctx).downSql;
      const up = partialIndex.handlers.up(next, ctx).upSql;
      return { upSql: up, downSql: down };
    },
  },
};
```

### `HandlerContext`

| Field              | Description                                      |
| ------------------ | ------------------------------------------------ |
| `model`            | Prisma model name                                |
| `field`            | Field name, if annotation is on a field doc comment |
| `tableName`        | Database table name (`@@map` / `@map` resolved)  |
| `databaseProvider` | Datasource provider (`postgresql`, `mysql`, etc.) |
| `dmmf`             | Full Prisma DMMF document                        |

### `SqlPair`

Both fields are required from `up()`. The `downSql` is **persisted in the state file** and used for reversal — even if you later remove the handler from your config.

---

## Registration

Export an array from the module referenced in your generator config:

```typescript
// schematic.handlers.ts
import { partialIndex } from './handlers/partial-index';
import { ginIndex } from './handlers/gin-index';
import { checkConstraint } from './handlers/check-constraint';

export default [partialIndex, ginIndex, checkConstraint];
```

```prisma
generator schematic {
  provider  = "schematic"
  handlers  = "./schematic.handlers.ts"
}
```

Schematic loads this module at runtime via dynamic import, resolved relative to your schema file path.

---

## Annotation Syntax

Annotations use the format `@prefix.type(key: value, ...)` in doc comments:

```prisma
/// @schematic.partialIndex(columns: ["email"], where: "active = true")
/// @schematic.ginIndex(columns: ["title"], expression: "to_tsvector('english', title)")
/// @schematic.check(name: "positive_price", expression: "price > 0")
```

Supported value types in arguments: strings, numbers, booleans, arrays, and nested objects (JSON-like syntax).

The `annotationPrefix` generator option controls the prefix (default: `schematic`).

---

## Stable Feature Identity

Each feature in the state file has a stable `id`:

```
hash(type + model + field? + canonicalJson(validatedInput))
```

This identity drives diffing:

| Change                        | Behavior                                      |
| ----------------------------- | --------------------------------------------- |
| Same `id` in old and new state | Unchanged — preserve stored SQL pairs         |
| `id` in new but not old       | Added — emit `upSql`                          |
| `id` in old but not new       | Removed — emit stored `downSql` from baseline |
| Same `id`, different input    | Changed — emit `mutate()` or down + up        |

---

## Reversal Guarantees

### Annotation removed from schema

`schematic enhance` compares current schema against **git HEAD** state. Removed features emit their stored `downSql`. The handler does not need to exist anymore.

### Handler removed from config

- Features already in the committed state file: reversible via stored `downSql`
- Annotations still in schema with no registered handler: **fail fast** with `"Unknown annotation type: foo, no handler registered"`

### Handler logic updated

Features with unchanged `id` keep their original stored SQL pairs. This is intentional — applied migrations are immutable history. To change applied SQL, remove the old annotation and add a new one (or change inputs enough to produce a new `id`).

---

## Delete Ordering

When multiple features are removed in one migration, drops are ordered by:

1. `dropPriority` descending (higher drops first)
2. `createdAt` descending (newest first)

Set `dropPriority` on your definition when drop order matters:

```typescript
export const checkConstraint: AnnotationDefinition = {
  type: 'check',
  dropPriority: 10, // drop before indexes (priority 0)
  // ...
};
```

Always use idempotent down SQL (`IF EXISTS`) to tolerate ordering edge cases.

---

## Best Practices

1. **Idempotent SQL** — `CREATE INDEX IF NOT EXISTS`, `DROP INDEX IF EXISTS`
2. **Persistable down SQL** — write `downSql` assuming the feature was applied; it will be stored and reused
3. **Deterministic naming** — derive object names from model + columns so the same annotation always produces the same name
4. **Provider checks** — use `ctx.databaseProvider` to emit provider-specific SQL or throw early for unsupported providers
5. **No cross-feature coupling** — each handler should be self-contained

---

## Example Handlers

Reference implementations live in [`examples/handlers/`](../examples/handlers/):

| Handler            | Annotation type   | Description                    |
| ------------------ | ----------------- | ------------------------------ |
| `partial-index.ts` | `partialIndex`    | Indexes with `WHERE` clauses   |
| `gin-index.ts`     | `ginIndex`        | PostgreSQL GIN indexes         |
| `check-constraint.ts` | `check`        | `CHECK` constraints            |
| `fk-index.ts`      | `fkIndex`         | Optional FK column auto-index  |

These are examples, not built into Schematic core. Copy and adapt them for your project.
