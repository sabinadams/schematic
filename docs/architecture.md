# Architecture

## Design Philosophy

Schematic follows a **functional approach with small, focused files** rather than a class-based builder pattern.

### Why Functional?

This tool is primarily about transformations:
- Schema → State
- State A → State B (diffing)
- State → SQL
- Annotations → Parsed objects

**Benefits:**
- ✅ Easier to test (pure functions with clear inputs/outputs)
- ✅ More composable (pipe transformations together)
- ✅ Better tree-shaking
- ✅ Simpler to reason about
- ✅ Matches the data flow nature of the tool

### When to Use Classes

Use classes sparingly, only for:
1. **Storage adapters** (GCP, S3) - they have persistent connections
2. **Configurable services** - if you need instance-specific configuration
3. **Complex state machines** - if state transitions become complex

## Folder Structure

```
src/
├── generator.ts              # Entry point (Prisma generator handler)
├── generate.ts               # Orchestrator for state generation
│
├── cli/
│   ├── enhance.ts            # CLI: schematic enhance
│   ├── validate.ts           # CLI: schematic validate
│   └── diff.ts               # CLI: schematic diff (future)
│
├── state/
│   ├── builder.ts            # Build state from DMMF + annotations
│   ├── comparator.ts         # Compare old vs new state (diff)
│   ├── loader.ts             # Load state from disk/git/cloud
│   └── writer.ts             # Write state to disk/cloud
│
├── schema/
│   ├── analyzer.ts           # Analyze DMMF (find FKs, relations)
│   ├── parser.ts             # Parse annotations from schema comments
│   └── validator.ts          # Validate schema annotations
│
├── sql/
│   ├── generator.ts          # Main SQL generation orchestrator
│   ├── index.sql.ts          # Index SQL generation (CREATE/DROP)
│   ├── constraint.sql.ts     # Constraint SQL generation
│   ├── postgres.sql.ts       # PostgreSQL-specific SQL
│   ├── mysql.sql.ts          # MySQL-specific SQL
│   └── sqlite.sql.ts         # SQLite-specific SQL
│
├── migrations/
│   ├── finder.ts             # Find latest migration file
│   ├── appender.ts           # Append SQL to migration files
│   └── reader.ts             # Read migration files
│
├── storage/
│   ├── local.ts              # Local filesystem storage
│   ├── gcp.ts                # GCP Cloud Storage
│   ├── s3.ts                 # AWS S3 (future)
│   └── azure.ts              # Azure Blob Storage (future)
│
├── utils/
│   ├── file.utils.ts         # File operations
│   ├── annotation.utils.ts   # Annotation parsing
│   ├── hash.utils.ts         # Schema hashing
│   └── logger.utils.ts       # Logging utilities
│
└── types/
    ├── prisma.types.ts       # Prisma-related types
    ├── state.types.ts        # State file types
    ├── sql.types.ts          # SQL generation types
    └── storage.types.ts      # Cloud storage types
```

## Key Principles

### 1. Small, Single-Purpose Files

Each file should do one thing well:

```typescript
// state/builder.ts - builds state from schema
export function buildState(dmmf: DMMF, annotations: Annotation[]): State {}

// state/comparator.ts - compares states
export function compareStates(oldState: State, newState: State): StateDiff {}

// sql/index.sql.ts - generates index SQL
export function createIndexSQL(index: Index, provider: Provider): string {}
export function dropIndexSQL(index: Index, provider: Provider): string {}
```

### 2. Composition Over Inheritance

```typescript
// cli/enhance.ts
import { loadState } from '../state/loader';
import { buildState } from '../state/builder';
import { compareStates } from '../state/comparator';
import { generateSQL } from '../sql/generator';
import { appendToMigration } from '../migrations/appender';

export async function enhance() {
  const oldState = await loadState();
  const newState = await buildState();
  const diff = compareStates(oldState, newState);
  const sql = generateSQL(diff);
  await appendToMigration(sql);
}
```

### 3. Provider Strategy Pattern

```typescript
// sql/providers.ts
export interface SQLProvider {
  createIndex(index: Index): string;
  dropIndex(index: Index): string;
  supportsIfNotExists: boolean;
  supportsConcurrently: boolean;
}

export const providers: Record<Provider, SQLProvider> = {
  postgres: new PostgresProvider(),
  mysql: new MySQLProvider(),
  sqlite: new SQLiteProvider(),
};
```

### 4. Storage Adapter Pattern

```typescript
// storage/gcp.ts
export class GCPStorage implements StorageAdapter {
  constructor(private config: GCPConfig) {}
  async load(): Promise<State> {}
  async save(state: State): Promise<void> {}
}

// storage/local.ts
export class LocalStorage implements StorageAdapter {
  constructor(private config: LocalConfig) {}
  async load(): Promise<State> {}
  async save(state: State): Promise<void> {}
}
```

## Data Flow

### State Generation (Generator)

```
Prisma Schema
    ↓
  DMMF
    ↓
[Analyze DMMF] ────→ Detect FKs
    ↓                    ↓
[Parse Annotations]      ↓
    ↓                    ↓
[Build State] ←──────────┘
    ↓
State File (.schematic-state.json)
```

### Migration Enhancement (CLI)

```
1. Find Latest Migration
    ↓
2. Load Old State (git/cloud/disk)
    ↓
3. Build New State
    ↓
4. Compare States (diff)
    ↓
5. Generate SQL (CREATE/DROP)
    ↓
6. Append to Migration File
    ↓
7. Save New State
```

### Detailed Flow Example

```typescript
// High-level flow in cli/enhance.ts
async function enhance() {
  // 1. Find migration
  const migration = await findLatestMigration();
  
  // 2. Load old state
  const oldState = await loadState();
  
  // 3. Build new state
  const dmmf = await parsePrismaSchema();
  const annotations = parseAnnotations(dmmf);
  const autoIndexes = detectForeignKeys(dmmf);
  const newState = buildState({ annotations, autoIndexes });
  
  // 4. Compare
  const diff = compareStates(oldState, newState);
  
  // 5. Generate SQL
  const sql = generateSQL(diff);
  
  // 6. Append
  await appendToMigration(migration, sql);
  
  // 7. Save
  await saveState(newState);
}
```

## Module Responsibilities

### `state/`
**Purpose:** State file management and comparison

- `builder.ts` - Constructs state object from DMMF and annotations
- `comparator.ts` - Compares old vs new state, produces diff
- `loader.ts` - Loads state from various sources (disk/git/cloud)
- `writer.ts` - Writes state to various destinations

### `schema/`
**Purpose:** Prisma schema analysis

- `analyzer.ts` - Analyzes DMMF structure (FK detection, relation mapping)
- `parser.ts` - Extracts and parses `@schematic.*` annotations
- `validator.ts` - Validates annotation syntax and values

### `sql/`
**Purpose:** SQL generation for various database providers

- `generator.ts` - Orchestrates SQL generation from state diff
- `index.sql.ts` - Index SQL (CREATE/DROP INDEX)
- `constraint.sql.ts` - Constraint SQL (CHECK, etc.)
- `postgres.sql.ts` - PostgreSQL-specific features (GIN, CONCURRENTLY)
- `mysql.sql.ts` - MySQL-specific features
- `sqlite.sql.ts` - SQLite-specific features

### `migrations/`
**Purpose:** Interaction with Prisma migration files

- `finder.ts` - Finds latest migration in `prisma/migrations/`
- `appender.ts` - Appends Schematic SQL to migration files
- `reader.ts` - Reads and parses existing migration files

### `storage/`
**Purpose:** State persistence backends

- `local.ts` - Local filesystem (default)
- `gcp.ts` - Google Cloud Storage
- `s3.ts` - AWS S3 (future)
- `azure.ts` - Azure Blob Storage (future)

### `cli/`
**Purpose:** Command-line interface

- `enhance.ts` - Append SQL to latest migration
- `validate.ts` - Validate state matches schema
- `diff.ts` - Preview changes (future)

### `utils/`
**Purpose:** Shared utilities

- `file.utils.ts` - File system operations
- `annotation.utils.ts` - Annotation parsing helpers
- `hash.utils.ts` - Schema hashing for validation
- `logger.utils.ts` - Logging utilities

### `types/`
**Purpose:** TypeScript type definitions

- `prisma.types.ts` - Prisma-related types (DMMF, config)
- `state.types.ts` - State file structure
- `sql.types.ts` - SQL generation types
- `storage.types.ts` - Storage adapter interfaces

## Testing Strategy

With this structure, testing is straightforward:

```typescript
// Unit tests - pure functions
describe('compareStates', () => {
  it('detects removed indexes', () => {
    const oldState = { indexes: [index1, index2] };
    const newState = { indexes: [index1] };
    const diff = compareStates(oldState, newState);
    expect(diff.removed.indexes).toEqual([index2]);
  });
});

// Integration tests - compose functions
describe('state building', () => {
  it('builds complete state from schema', async () => {
    const dmmf = await loadTestSchema();
    const state = await buildState(dmmf);
    expect(state.indexes).toHaveLength(5);
  });
});
```

## Implementation Order

Follow the roadmap phases, but build foundational modules first:

1. **Core types** (`types/`)
2. **Schema analysis** (`schema/analyzer.ts`)
3. **State building** (`state/builder.ts`)
4. **Annotation parsing** (`schema/parser.ts`)
5. **State comparison** (`state/comparator.ts`)
6. **SQL generation** (`sql/`)
7. **Migration interaction** (`migrations/`)
8. **CLI commands** (`cli/`)
9. **Cloud storage** (`storage/`)

## Examples

### Example: State Builder

```typescript
// state/builder.ts
import { DMMF } from '@prisma/generator-helper';
import { analyzeForeignKeys } from '@/schema/analyzer';
import { parseAnnotations } from '@/schema/parser';
import { State, Index } from '@/types/state.types';

export interface BuildStateOptions {
  dmmf: DMMF.Document;
  config: SchematicConfig;
}

export function buildState(options: BuildStateOptions): State {
  const { dmmf, config } = options;
  
  // Extract features from schema
  const autoIndexes = config.autoIndexForeignKeys
    ? analyzeForeignKeys(dmmf)
    : [];
  
  const annotations = parseAnnotations(dmmf);
  
  // Combine into state
  return {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    schemaHash: computeHash(dmmf),
    indexes: [...autoIndexes, ...annotations.indexes],
    partialIndexes: annotations.partialIndexes,
    checkConstraints: annotations.checkConstraints,
    triggers: [],
  };
}
```

### Example: SQL Generator

```typescript
// sql/generator.ts
import { StateDiff } from '@/types/state.types';
import { createIndexSQL, dropIndexSQL } from './index.sql';
import { getProviderAdapter } from './providers';

export interface GenerateSQLOptions {
  diff: StateDiff;
  provider: 'postgresql' | 'mysql' | 'sqlite';
}

export function generateSQL(options: GenerateSQLOptions): string {
  const { diff, provider } = options;
  const adapter = getProviderAdapter(provider);
  
  const statements: string[] = [];
  
  // Generate DROP statements first
  for (const index of diff.removed.indexes) {
    statements.push(dropIndexSQL(index, adapter));
  }
  
  // Generate CREATE statements
  for (const index of diff.added.indexes) {
    statements.push(createIndexSQL(index, adapter));
  }
  
  return statements.join('\n\n');
}
```

### Example: Storage Adapter

```typescript
// storage/local.ts
import fs from 'fs/promises';
import path from 'path';
import { State } from '@/types/state.types';
import { StorageAdapter } from '@/types/storage.types';

export class LocalStorage implements StorageAdapter {
  constructor(private filePath: string) {}
  
  async load(): Promise<State | null> {
    try {
      const content = await fs.readFile(this.filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      if (error.code === 'ENOENT') return null;
      throw error;
    }
  }
  
  async save(state: State): Promise<void> {
    const dir = path.dirname(this.filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(state, null, 2));
  }
}
```

## Anti-Patterns to Avoid

### ❌ Don't: Monolithic Files

```typescript
// BAD: One giant file doing everything
// generator.ts (1000+ lines)
export async function generate() {
  // Load state
  // Parse annotations
  // Build state
  // Compare state
  // Generate SQL
  // Write files
  // ...
}
```

### ✅ Do: Small, Composable Functions

```typescript
// GOOD: Small, focused files
// cli/enhance.ts
export async function enhance() {
  const oldState = await loadState();
  const newState = await buildState();
  const diff = compareStates(oldState, newState);
  const sql = generateSQL(diff);
  await appendToMigration(sql);
}
```

### ❌ Don't: Deep Class Hierarchies

```typescript
// BAD: Complex inheritance
class BaseGenerator {}
class IndexGenerator extends BaseGenerator {}
class PartialIndexGenerator extends IndexGenerator {}
```

### ✅ Do: Composition with Functions

```typescript
// GOOD: Compose behavior
const sql = pipe(
  buildIndexes,
  filterPartialIndexes,
  generateSQL
)(state);
```

### ❌ Don't: Stateful Singletons

```typescript
// BAD: Global mutable state
export const STATE = { current: null };

export function setState(s) { STATE.current = s; }
```

### ✅ Do: Pure Functions with Parameters

```typescript
// GOOD: Explicit dependencies
export function compareStates(
  oldState: State,
  newState: State
): StateDiff {
  // Pure function - no side effects
}
```

