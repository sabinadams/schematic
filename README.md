# Schematic

> **Enhance Prisma migrations with database-specific features**

Schematic extends Prisma with powerful database features that aren't natively supported—like partial indexes, auto-indexed foreign keys, and provider-specific optimizations—all while using Prisma's standard workflow.

---

## The Problem

Prisma is great, but it doesn't support many database-specific features:

❌ **No partial indexes** (PostgreSQL `WHERE` clauses)  
❌ **No expression indexes** (full-text search, computed values)  
❌ **Missing FK indexes on PostgreSQL** (causes slow joins and deletes)  
❌ **No provider-specific index types** (GIN, GIST, spatial indexes)  
❌ **Limited check constraints**

You're left writing raw SQL migrations by hand or missing out on critical optimizations.

## The Solution

Schematic analyzes your Prisma schema and automatically enhances your migrations with these features:

```prisma
// schema.prisma
model Post {
  id       Int     @id
  authorId Int
  author   User    @relation(fields: [authorId], references: [id])
  // ↑ Schematic auto-adds index on authorId (PostgreSQL needs this!)

  status   String
  /// @schematic.partialIndex(columns: ["status"], where: "status = 'active'")
  // ↑ Custom partial index for better performance

  title    String
  /// @schematic.ginIndex(columns: ["title"], expression: "to_tsvector('english', title)")
  // ↑ Full-text search (PostgreSQL GIN index)
}
```

**Schematic automatically generates:**

```sql
-- Auto-indexed foreign key for faster joins
CREATE INDEX IF NOT EXISTS "Post_authorId_idx"
  ON "Post"("authorId");

-- Partial index for common queries
CREATE INDEX IF NOT EXISTS "Post_status_active_idx"
  ON "Post"("status")
  WHERE "status" = 'active';

-- Full-text search index
CREATE INDEX IF NOT EXISTS "Post_title_search_idx"
  ON "Post" USING GIN (to_tsvector('english', "title"));
```

---

## Features

### 🚀 Auto-Optimization (Optional)

- **Automatic FK indexes**: Optionally index all foreign key columns (critical for PostgreSQL performance)
- **Smart defaults**: Only creates indexes where needed (skips @id, @unique, etc.)
- **Fully configurable**: Turn features on/off via generator config

### 🎯 Advanced Database Features

- **Partial indexes**: Index subsets of data with `WHERE` clauses
- **Expression indexes**: Index computed values, full-text search, etc.
- **Provider-specific types**: GIN, GIST, spatial indexes, and more
- **Complex constraints**: Check constraints beyond Prisma's limitations

### 🔧 Prisma-Native Workflow

- **Uses Prisma's migration system**: No separate tooling to learn
- **Modifies Prisma migrations**: Appends SQL to existing migration files
- **Standard commands**: `prisma migrate deploy` just works
- **Minimal CLI**: Only adds one command (`enhance`)

### ✅ Production-Ready

- **Idempotent SQL**: Safe to run multiple times (`IF NOT EXISTS`)
- **Git-friendly**: State file tracks desired features
- **CI/CD ready**: Validation command for pre-merge checks
- **No introspection**: Simple, fast, provider-agnostic

---

## Quick Start

### 1. Install

```bash
npm install @your-org/schematic --save-dev
```

### 2. Add Generator

Add to your `prisma/schema.prisma`:

```prisma
generator schematic {
  provider             = "schematic"
  output               = "../generated"
  stateFilePath        = "./.schematic-state.json"
  autoIndexForeignKeys = true  // Recommended for PostgreSQL
}
```

### 3. Use in Development

```bash
# Create migration with Prisma
npx prisma migrate dev --create-only --name add_user_email

# Enhance with Schematic features
npx schematic enhance

# Apply with Prisma
npx prisma migrate dev
```

### 4. Deploy to Production

```bash
# Standard Prisma command - just works!
npx prisma migrate deploy
```

---

## Usage Examples

### Auto-Index Foreign Keys

**Enable in generator config** to automatically index all foreign key columns:

```prisma
generator schematic {
  provider             = "schematic"
  autoIndexForeignKeys = true  // Enable auto-indexing
}

model Order {
  id         Int      @id
  customerId Int
  customer   Customer @relation(fields: [customerId], references: [id])
  // ↑ Schematic adds: CREATE INDEX "Order_customerId_idx" ON "Order"("customerId")
}
```

### Partial Indexes

Index only the rows you query frequently:

```prisma
model User {
  id     Int     @id
  email  String  @unique
  active Boolean @default(true)

  /// @schematic.partialIndex(columns: ["email"], where: "active = true")
  // ↑ Only indexes active users - smaller, faster index
}
```

Generates:

```sql
CREATE INDEX "User_email_active_idx"
  ON "User"("email")
  WHERE "active" = true;
```

### Full-Text Search (PostgreSQL)

```prisma
model Article {
  id      Int    @id
  title   String
  content String

  /// @schematic.ginIndex(columns: ["title", "content"], expression: "to_tsvector('english', title || ' ' || content)")
}
```

Generates:

```sql
CREATE INDEX "Article_search_idx"
  ON "Article" USING GIN (
    to_tsvector('english', title || ' ' || content)
  );
```

### Composite Indexes

```prisma
model Post {
  id        Int      @id
  authorId  Int
  status    String
  createdAt DateTime

  /// @schematic.index(columns: ["authorId", "status", "createdAt"])
  // ↑ Optimized for: WHERE authorId = ? AND status = ? ORDER BY createdAt
}
```

---

## How It Works

### Architecture

```
┌─────────────────────┐
│   Prisma Schema     │
└──────────┬──────────┘
           │
     ┌─────▼─────┐
     │  Prisma   │ ──────→ Tables, FKs, basic indexes
     └─────┬─────┘
           │
     ┌─────▼──────┐
     │ Schematic  │ ──────→ Advanced indexes, constraints
     └─────┬──────┘
           │
     ┌─────▼──────┐
     │  Database  │
     └────────────┘
```

### Workflow

1. **Generate**: Schematic generator runs during `prisma generate`, creates state file
2. **Enhance**: `schematic enhance` appends SQL to Prisma's migration file
3. **Apply**: `prisma migrate` applies the combined migration
4. **Deploy**: Standard `prisma migrate deploy` in production

### State File

`.schematic-state.json` tracks desired database features:

```json
{
	"version": "1.0.0",
	"schemaHash": "abc123...",
	"indexes": [
		{
			"name": "Post_authorId_idx",
			"table": "Post",
			"columns": ["authorId"],
			"source": "auto-fk-support"
		}
	],
	"partialIndexes": [
		{
			"name": "User_email_active_idx",
			"table": "User",
			"columns": ["email"],
			"where": "active = true",
			"source": "schema-annotation"
		}
	]
}
```

**Commit this file to git** - it's like `package-lock.json` for your database enhancements.

---

## CLI Reference

### `schematic enhance`

Appends Schematic-generated SQL to the most recent Prisma migration.

```bash
npx schematic enhance
```

**Use after:** `prisma migrate dev --create-only`  
**Use before:** `prisma migrate dev`

### `schematic validate`

Validates state file matches schema (for CI/CD).

```bash
npx schematic validate
```

**Returns:**

- Exit 0 if valid
- Exit 1 if out of sync (run `prisma generate` to fix)

### `schematic diff` _(coming soon)_

Preview SQL that would be added to migrations.

```bash
npx schematic diff
```

---

## Annotations Reference

### `@schematic.partialIndex`

Create index with `WHERE` clause:

```prisma
/// @schematic.partialIndex(columns: ["status"], where: "status IN ('active', 'pending')")
```

### `@schematic.ginIndex`

PostgreSQL GIN index (full-text, arrays, JSONB):

```prisma
/// @schematic.ginIndex(columns: ["tags"], expression: "tags")
```

### `@schematic.index`

Standard index (when you need more control):

```prisma
/// @schematic.index(columns: ["userId", "createdAt"], type: "btree")
```

### `@schematic.check`

Complex check constraints:

```prisma
/// @schematic.check(name: "valid_price", expression: "price > 0 AND price < 1000000")
```

---

## Configuration

Configure in your `schema.prisma`:

```prisma
generator schematic {
  provider      = "schematic"
  output        = "../generated"
  stateFilePath = "./.schematic-state.json"

  // Auto-optimization settings (all optional)
  autoIndexForeignKeys = true   // Automatically index FK columns (default: true, recommended for PostgreSQL)
  autoIndexEnumColumns = false  // Automatically index enum columns (default: false)
}
```

### Configuration Options

| Option                 | Type    | Default                     | Description                             |
| ---------------------- | ------- | --------------------------- | --------------------------------------- |
| `provider`             | string  | required                    | Package name or path to generator       |
| `output`               | string  | `"../generated"`            | Output directory for state file         |
| `stateFilePath`        | string  | `"./.schematic-state.json"` | Path to state file (relative to schema) |
| `autoIndexForeignKeys` | boolean | `true`                      | Auto-create indexes for FK columns      |
| `autoIndexEnumColumns` | boolean | `false`                     | Auto-create indexes for enum columns    |

---

## CI/CD Setup

### GitHub Actions

```yaml
name: Validate Migrations

on: [pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install dependencies
        run: npm ci

      - name: Generate Prisma Client and Schematic state
        run: npx prisma generate

      - name: Validate Schematic state
        run: npx schematic validate
```

---

## FAQ

### Do I need Schematic in production?

**No!** Once migrations are built, they contain all the SQL. Just run standard `prisma migrate deploy`.

Schematic is primarily a development tool.

### What if I get merge conflicts in state file?

Just regenerate it:

```bash
npx prisma generate
```

The state file is derived from your schema, so regenerating it resolves conflicts.

### Does this work with all databases?

Schematic works with all databases Prisma supports. However, some features are provider-specific:

- ✅ **Auto-FK-indexes**: All databases
- ✅ **Partial indexes**: PostgreSQL, SQLite
- ✅ **GIN/GIST indexes**: PostgreSQL only
- ✅ **Expression indexes**: PostgreSQL, SQLite

### Can I use this with an existing project?

**Yes!** Just add the generator and run `prisma generate`. Existing migrations aren't affected.

### What about Prisma's drift detection?

Prisma may warn about indexes not in your schema. This is expected—Schematic manages these separately.

To silence warnings, you can add regular `@@index` to your schema for the same columns (Prisma and Schematic will create the same index).

---

## Roadmap

See [docs/roadmap.md](./docs/roadmap.md) for detailed implementation plan.

**MVP (Phase 1):**

- ✅ Auto-index foreign keys
- ✅ State file generation
- ✅ `enhance` command
- ✅ Partial index support

**Future:**

- Expression indexes
- Check constraints
- Triggers and functions
- Introspection/drift detection
- Visual migration preview

---

## Contributing

Contributions welcome! Please see our [contributing guidelines](./CONTRIBUTING.md).

### Development Setup

```bash
# Clone repo
git clone https://github.com/your-org/schematic.git
cd schematic

# Install dependencies
pnpm install

# Build
pnpm build

# Watch mode
pnpm dev

# Test
pnpm test
```

---

## License

ISC

---

## Related Projects

- [Prisma](https://www.prisma.io/) - The ORM Schematic extends
- [Prisma Migrate](https://www.prisma.io/docs/orm/prisma-migrate) - Prisma's migration system
- [Atlas](https://atlasgo.io/) - Alternative migration tool with advanced features

---

**Built with ❤️ to make Prisma even better**
