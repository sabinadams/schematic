# Schematic

> **Extend Prisma migrations with custom database features — you define the annotations and handlers**

Schematic is a Prisma generator and CLI that lets you declare database enhancements Prisma doesn't natively support — partial indexes, expression indexes, check constraints, and more — via doc-comment annotations in your schema. **Nothing is hard-coded in core.** You provide a Zod schema and handler for each annotation type you need.

---

## The Problem

Prisma handles tables, columns, relations, and basic indexes well. It does not support many provider-specific optimizations:

- Partial indexes (`WHERE` clauses)
- Expression indexes (full-text search, computed values)
- Provider-specific index types (GIN, GIST, etc.)
- Complex check constraints

You're left hand-writing raw SQL in migration files and keeping it in sync with your schema manually.

## The Solution

Define annotation handlers once, annotate your schema, and let Schematic manage state and migration SQL:

```prisma
generator schematic {
  provider          = "schematic"
  handlers          = "./schematic.handlers.ts"
  stateFilePath     = "./.schematic-state.json"
  annotationPrefix  = "schematic"
}

/// @schematic.partialIndex(columns: ["status"], where: "status = 'active'")
model Post {
  id     Int    @id @default(autoincrement())
  status String
}
```

Schematic reads annotations from Prisma's DMMF `documentation`, validates them with your Zod schemas, and appends the resulting SQL to Prisma migration files.

---

## Features

### Pluggable annotation system

- **You define annotation types** — Zod schema for validation, handler for SQL generation
- **Core is orchestration only** — extraction, state, diffing, migration appending
- **No built-in feature assumptions** — partial indexes, GIN indexes, etc. are example handlers, not core logic

### Prisma-native workflow

- Uses Prisma's migration system — no replacement tooling
- Appends SQL to existing Prisma migration files
- Production deploys use standard `prisma migrate deploy`

### Reversible by design

- Each feature stores `upSql` and `downSql` in the state file at creation time
- Removing an annotation generates the stored `downSql` — **even if the handler is later removed from your config**
- `schematic enhance` diffs against git HEAD baseline to detect additions and removals

### Production-ready

- Idempotent SQL (`IF NOT EXISTS`, `IF EXISTS`)
- Automatic cleanup when annotations are removed
- Git-friendly state file (commit like `package-lock.json`)
- CI validation via `schematic validate`

---

## Quick Start

### 1. Install

```bash
npm install schematic --save-dev
```

### 2. Define handlers

Create `schematic.handlers.ts` in your project root:

```typescript
import { z } from 'zod';
import type { AnnotationDefinition } from 'schematic';

const partialIndex: AnnotationDefinition = {
  type: 'partialIndex',
  schema: z.object({
    model: z.string(),
    field: z.string().optional(),
    columns: z.array(z.string()).min(1),
    where: z.string(),
    name: z.string().optional(),
  }),
  handlers: {
    up(input, ctx) {
      const name =
        input.name ?? `${ctx.model}_${input.columns.join('_')}_partial_idx`;
      const cols = input.columns.map((c) => `"${c}"`).join(', ');
      return {
        upSql: `CREATE INDEX IF NOT EXISTS "${name}" ON "${ctx.tableName}"(${cols}) WHERE ${input.where};`,
        downSql: `DROP INDEX IF EXISTS "${name}";`,
      };
    },
  },
};

export default [partialIndex];
```

### 3. Configure the generator

Add to `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

generator schematic {
  provider         = "schematic"
  handlers         = "./schematic.handlers.ts"
  stateFilePath    = "./.schematic-state.json"
  annotationPrefix = "schematic"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### 4. Annotate your schema

```prisma
/// @schematic.partialIndex(columns: ["status"], where: "status = 'active'")
model Post {
  id     Int    @id @default(autoincrement())
  status String
}
```

Annotations are doc comments (`///`). Prisma surfaces them on DMMF `model.documentation` and `field.documentation`.

### 5. Development workflow

```bash
# Create migration with Prisma (don't apply yet)
npx prisma migrate dev --create-only --name add_post_status_index

# Append Schematic SQL to the migration
npx schematic enhance

# Apply the combined migration (runs prisma generate, updates state file)
npx prisma migrate dev
```

**Important:** Run `schematic enhance` before `prisma migrate dev` applies the migration. The state file is updated by `prisma generate`, which runs after migrate — so `enhance` uses the git HEAD state file as its baseline for detecting removals.

### 6. Deploy to production

```bash
npx prisma migrate deploy
```

Migration files already contain all SQL. No Schematic CLI needed in production.

---

## How It Works

```
Prisma Schema (/// @schematic.* doc comments)
        ↓
   Prisma DMMF (model.documentation, field.documentation)
        ↓
   Schematic extracts & parses annotations
        ↓
   Match type → user handler registry
        ↓
   Validate with handler's Zod schema
        ↓
   handler.up() → upSql + downSql
        ↓
   State file (.schematic-state.json)
        ↓
   schematic enhance → diff vs git HEAD → append SQL to migration
```

### State file

`.schematic-state.json` tracks every Schematic-managed feature:

```json
{
  "version": "1",
  "generatedAt": "2026-07-01T10:00:00.000Z",
  "schemaHash": "abc123...",
  "features": [
    {
      "id": "a1b2c3...",
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

Commit this file to git. It is the source of truth for what Schematic manages and how to reverse it.

---

## Defining Handlers

### `AnnotationDefinition` contract

```typescript
interface AnnotationDefinition<TSchema extends z.ZodType> {
  /** Annotation name after @prefix. — e.g. "partialIndex" */
  type: string;

  /** Zod schema — validates parsed annotation args plus injected context (model, field) */
  schema: TSchema;

  /** Optional: higher = dropped first when multiple features are removed */
  dropPriority?: number;

  handlers: {
    /** Returns SQL pair when a feature is first created */
    up: (input: z.infer<TSchema>, ctx: HandlerContext) => SqlPair;

    /** Optional: returns SQL pair when args change but identity stays the same */
    mutate?: (old: z.infer<TSchema>, next: z.infer<TSchema>, ctx: HandlerContext) => SqlPair;
  };
}

interface SqlPair {
  upSql: string;
  downSql: string;
}

interface HandlerContext {
  model: string;
  field?: string;
  tableName: string;
  databaseProvider: string;
  dmmf: DMMF.Document;
}
```

### Handler author guidelines

- Use idempotent SQL (`IF NOT EXISTS` / `IF EXISTS`)
- Return both `upSql` and `downSql` from `up()` — the `downSql` is persisted in state and used for reversal
- Set `dropPriority` when your object must drop before others (e.g. constraints before indexes)
- Avoid cross-feature dependencies where possible

### Example handlers

See [`examples/handlers/`](examples/handlers/) for reference implementations:

- `partial-index.ts` — partial indexes with `WHERE` clauses
- `gin-index.ts` — PostgreSQL GIN indexes
- `check-constraint.ts` — check constraints

---

## CLI Reference

### `schematic enhance`

Diffs current schema against git HEAD state and appends SQL to the latest Prisma migration.

```bash
npx schematic enhance
```

Run after `prisma migrate dev --create-only` and before `prisma migrate dev`.

**SQL emission order:**

1. Drops (highest `dropPriority` first, then newest-first by `createdAt`)
2. Creates (stable order by feature `id`)
3. Mutations (down then up per changed feature)

### `schematic validate`

Validates the committed state file matches the current schema. Use in CI.

```bash
npx schematic validate
```

- Exit 0 if valid
- Exit 1 if out of sync (run `prisma generate` to fix)

---

## Configuration

```prisma
generator schematic {
  provider         = "schematic"
  handlers         = "./schematic.handlers.ts"
  stateFilePath    = "./.schematic-state.json"
  annotationPrefix = "schematic"
}
```

| Option             | Type   | Default                     | Description                                      |
| ------------------ | ------ | --------------------------- | ------------------------------------------------ |
| `provider`         | string | required                    | `"schematic"` or path to generator               |
| `handlers`         | string | required                    | Path to module exporting `AnnotationDefinition[]` |
| `stateFilePath`    | string | `"./.schematic-state.json"` | State file path (relative to schema)             |
| `annotationPrefix` | string | `"schematic"`               | Prefix for `@prefix.type(...)` annotations       |

---

## Reversal

### Removing an annotation from the schema

1. Delete the `/// @schematic.*` doc comment
2. Create a Prisma migration (`--create-only`)
3. Run `schematic enhance` — emits the stored `downSql` from git HEAD state
4. Run `prisma migrate dev` to apply

### Removing a handler from your config

Already-applied features can still be reversed — their `downSql` is stored in the committed state file. If an annotation remains in the schema but its handler is removed, Schematic fails fast with a clear error at validation time.

### Handler logic changes

Unchanged features (same stable `id`) keep their stored SQL pairs — migrations are immutable history. Changed inputs produce a new `id`, treated as remove old + add new.

---

## CI/CD

```yaml
name: Validate Schematic

on: [pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npx prisma generate
      - run: npx schematic validate
```

---

## FAQ

### Do I need Schematic in production?

No. Migration files contain all SQL after development. Use `prisma migrate deploy` in production.

### What if I get merge conflicts in the state file?

Regenerate it:

```bash
npx prisma generate
```

The state file is derived from your schema and handlers.

### Does Schematic introspect the database?

No. Schematic uses idempotent SQL and state-file diffing. This keeps the architecture simple and provider-agnostic.

### What about Prisma drift warnings?

Prisma may warn about indexes not declared in your schema. This is expected — Schematic manages them separately via the state file.

### Where do annotations come from?

Doc comments in `schema.prisma` (`///`). Prisma exposes them on DMMF `documentation` for models and fields. Schematic scans those strings — handlers do not define where annotations live.

---

## Documentation

- [AGENTS.md](AGENTS.md) — entry point for AI agents (read first)
- [Implementation status](docs/status.md) — what is built vs documented
- [Architecture](docs/architecture.md) — module layout, data flow, design decisions
- [Design reference](docs/plan.md) — canonical architecture spec
- [Handler guide](docs/handlers.md) — detailed handler authoring reference
- [Roadmap](docs/roadmap.md) — completed features and future work

---

## Development

```bash
git clone https://github.com/your-org/schematic.git
cd schematic
pnpm install
pnpm build
pnpm test
```

---

## License

ISC
