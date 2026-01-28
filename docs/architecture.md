# Architecture

## Quick Reference

### Folder Overview (TL;DR)

| Folder | Purpose | Status |
|--------|---------|--------|
| **`generator/`** | Entry point & orchestration. Runs when `prisma generate` executes | ✅ Complete |
| **`state/`** | Build, load, compare, write internal state from annotations | 🟡 Core done, comparator/writer TODO |
| **`schemas/`** | Zod validation schemas for annotation types (`@schematic.index`, etc.) | ✅ Index schema complete |
| **`dialects/`** | Database-specific SQL generation (PostgreSQL, MySQL, SQLite, etc.) | 🔴 TODO |
| **`types/`** | TypeScript type definitions used throughout codebase | ✅ Complete |
| **`utils/`** | Reusable helpers (annotation parsing, file ops, hashing) | ✅ Complete |

### Data Flow (Current)

```
Prisma Schema → DMMF → Extract Annotations → Validate with Zod → Build State → (TODO: Write to disk)
```

---

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
├── index.ts                  # Entry point (exports generator)
│
├── generator/
│   ├── generate.ts           # Main generator orchestrator
│   ├── generate.test.ts      # Generator tests
│   ├── config.ts             # Extract/validate generator config
│   └── config.test.ts        # Config tests
│
├── state/
│   ├── builder.ts            # Build state from DMMF + annotations
│   ├── builder.test.ts       # Builder tests
│   ├── extractor.ts          # Extract annotations from DMMF
│   ├── comparator.ts         # Compare old vs new state (diff) [TODO]
│   ├── loader.ts             # Load state from disk
│   ├── loader.test.ts        # Loader tests
│   └── writer.ts             # Write state to disk [TODO]
│
├── schemas/
│   ├── index.ts              # Export all schemas + SchemaType
│   ├── base.schema.ts        # Base Zod schema (model field)
│   └── index.schema.ts       # Index annotation validation
│
├── dialects/
│   ├── index.ts              # Export dialect registry
│   ├── base.dialect.ts       # Base dialect interface
│   └── cockroachdb.dialect.ts # CockroachDB SQL generation [TODO]
│
├── types/
│   ├── schematic.types.ts    # Core types (Config, Annotation, etc.)
│   ├── state.types.ts        # State structure types
│   └── prisma.types.ts       # Prisma generator types
│
└── utils/
    ├── annotation.utils.ts   # Parse @schematic.* annotations
    ├── annotation.utils.test.ts
    ├── file.utils.ts         # File system operations
    ├── file.utils.test.ts
    ├── hash.ts               # SHA256 hashing for change detection
    └── hash.test.ts
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

### Current Implementation: State Generation

```
Prisma Schema (with @schematic annotations)
          ↓
    [Prisma DMMF]
          ↓
[generator/config.ts] Extract config from generator options
          ↓
[generator/generate.ts] Orchestrate generation
          ↓
[state/loader.ts] Load previous state (if exists)
          ↓
[state/extractor.ts] Parse annotations from DMMF
          ↓
          ├─→ [utils/annotation.utils] Parse @schematic.* strings
          ├─→ [schemas/] Validate with Zod
          └─→ Returns: { indexes: [...] }
          ↓
[state/builder.ts] Build complete state
          ├─→ generatedAt: ISO timestamp
          ├─→ schemaHash: SHA256 of DMMF
          └─→ indexes: validated annotations
          ↓
    State Object { generatedAt, schemaHash, indexes }
          ↓
[state/writer.ts] Write to disk [TODO]
```

### Future: Migration Enhancement Flow

```
[TODO] This flow is planned but not yet implemented:

1. Find Latest Prisma Migration
    ↓
2. Load Old State (from disk/git)
    ↓
3. Build New State (from DMMF)
    ↓
4. [state/comparator.ts] Compare old vs new
    ↓
5. [dialects/] Generate database-specific SQL
    ↓
6. Append SQL to Prisma migration file
    ↓
7. [state/writer.ts] Save new state
```

### Detailed Flow Example (Current Implementation)

```typescript
// Actual implementation in generator/generate.ts
export async function generate(options: GeneratorOptions) {
  // 1. Extract config from generator options
  const config = extractConfig(options);
  const { dmmf } = options;
  
  // 2. Load previous state (for future comparison)
  const previousState = await loadState(config.stateFilePath);
  logger.info('Previous state loaded:', previousState);
  
  // 3. Build new state
  //    ├─ Extract annotations from DMMF
  //    ├─ Validate with Zod schemas
  //    └─ Combine with metadata
  const currentState = buildState(dmmf, config);
  logger.info('Current state built:', currentState);
  
  // 4. Ensure output directory exists
  await ensureDirectoryExists(config.outputPath);
  
  // TODO: Compare states (comparator.ts)
  // TODO: Generate SQL (dialects/)
  // TODO: Write migration files
  // TODO: Save new state (writer.ts)
}
```

## Module Responsibilities

### `generator/` - Core Generator Logic
**Purpose:** Entry point and orchestration for the Prisma generator

- **`generate.ts`** - Main generation function that coordinates:
  - Config extraction
  - State building (via builder)
  - State loading (for comparison)
  - Output directory creation
- **`config.ts`** - Extracts and validates configuration from Prisma generator options:
  - `databaseProvider` (from datasource)
  - `autoIndexForeignKeys` (boolean)
  - `annotationPrefix` (default: 'schematic')
  - `stateFilePath` (default: './schematic.state.json')
  - `outputPath` (default: './generated')

### `state/` - State Management
**Purpose:** Build, load, compare, and write the internal state representation

- **`builder.ts`** - Builds current state from DMMF:
  - Generates timestamp (`generatedAt`)
  - Computes schema hash (`schemaHash`)
  - Calls `extractor` to get annotations
  - Returns complete `State` object
- **`extractor.ts`** - Extracts and validates annotations from DMMF:
  - Parses model documentation for `@schematic.*` annotations
  - Validates using Zod schemas
  - Filters by annotation type (e.g., `index`)
  - Returns structured data (e.g., `{ indexes: [...] }`)
- **`loader.ts`** - Loads previously saved state from JSON file:
  - Reads state file from disk
  - Handles missing file gracefully
  - Validates JSON structure
- **`comparator.ts`** - [TODO] Compares old vs new state to detect changes
- **`writer.ts`** - [TODO] Writes current state to JSON file

### `schemas/` - Zod Validation
**Purpose:** Validate extracted annotations match expected structure

- **`base.schema.ts`** - Base Zod schema with common fields:
  - `model: z.string()` - Model name
  - Shared by all annotation schemas
- **`index.schema.ts`** - Validates `@schematic.index` annotations:
  - `name?: string` - Index name (optional, can be auto-generated)
  - `fields: string[]` - Array of field names (min 1 required)
  - `type?: 'id' | 'unique' | 'normal'` - Index type
  - `where?: string` - SQL condition for partial indexes
  - Returns validated `Index` type
- **`index.ts`** - Central export point:
  - Exports `schemas` object with all validators
  - Exports `SchemaType` = union of schema keys (e.g., `"index"`)
  - Used for type safety throughout codebase

### `dialects/` - Database-Specific SQL Generation
**Purpose:** Generate database-specific SQL DDL statements

- **`base.dialect.ts`** - [TODO] Base dialect interface/abstract class
- **`cockroachdb.dialect.ts`** - [TODO] CockroachDB-specific SQL generation
- **`index.ts`** - Exports dialect registry

> **Note:** Different databases have different syntax:
> - PostgreSQL: `CONCURRENTLY`, GIN/GiST indexes, partial indexes
> - MySQL: Different index syntax, no partial indexes
> - SQLite: Limited index features

### `types/` - TypeScript Type Definitions
**Purpose:** Centralized type definitions for the entire codebase

- **`schematic.types.ts`** - Core types:
  - `SchematicConfig` - Generator configuration
  - `RawParsedAnnotation` - Annotation before validation (string type)
  - `ParsedAnnotation` - Validated annotation (SchemaType)
  - `Annotation` - ParsedAnnotation + model name
- **`state.types.ts`** - State structure:
  - `State` - Complete state file structure
  - `ExtendedIndex` - Enhanced DMMF.Index with extras (e.g., `where`)
  - `Extractor<T>` - Generic extractor function type
- **`prisma.types.ts`** - Prisma generator types:
  - `GeneratorOptions` - Prisma's generator config options

### `utils/` - Utility Functions
**Purpose:** Reusable helper functions used across the codebase

- **`annotation.utils.ts`** - Parse `@schematic.*` annotations:
  - `parseAnnotation(annotation, prefix)` → `RawParsedAnnotation`
  - Strips `@prefix.` from annotation
  - Parses arguments using JSON5-like syntax
  - Handles strings, numbers, booleans, arrays, objects
  - Returns `{ _schematic_type, ...args }`
- **`file.utils.ts`** - File system operations:
  - `fileExists(path)` → `boolean`
  - `readJSONFile<T>(path)` → `Promise<T>`
  - `writeJSONFile(path, data)` → `Promise<void>`
  - `ensureDirectoryExists(path)` → `Promise<void>`
- **`hash.ts`** - SHA256 hashing for change detection:
  - `computeHash(data)` → `string`
  - Converts objects to stable JSON
  - Used to detect schema changes

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

## Implementation Status

### ✅ Completed (Phase 1)

1. **Core types** (`types/`) - All basic types defined
2. **Annotation parsing** (`utils/annotation.utils.ts`) - Parses `@schematic.*` strings
3. **State building** (`state/builder.ts`) - Builds state from DMMF
4. **State extraction** (`state/extractor.ts`) - Extracts & validates annotations
5. **State loading** (`state/loader.ts`) - Loads previous state from disk
6. **Zod validation** (`schemas/`) - Validates annotation structure
7. **Generator orchestration** (`generator/generate.ts`) - Main entry point
8. **Configuration** (`generator/config.ts`) - Extracts generator config
9. **Utilities** - File ops, hashing, annotation parsing
10. **Test coverage** - All core modules have comprehensive tests (130 tests)

### 🚧 In Progress / Next Steps (Phase 2)

1. **State comparison** (`state/comparator.ts`) - Diff old vs new state
2. **State writer** (`state/writer.ts`) - Persist state to disk
3. **SQL generation** (`dialects/`) - Generate database-specific DDL
4. **Migration integration** - Append SQL to Prisma migrations

### 🔮 Future (Phase 3+)

1. **Additional annotation types** - Checks, triggers, custom types
2. **CLI commands** - `schematic validate`, `schematic diff`
3. **Cloud storage** - GCP, S3, Azure backends
4. **Advanced features** - Rollback, preview, validation

## Examples

### Example: Complete Flow (Current Implementation)

**1. User writes annotation in Prisma schema:**
```prisma
model User {
  id    Int    @id @default(autoincrement())
  email String @unique
  name  String
  
  /// @schematic.index(fields: ["email", "name"], where: "name IS NOT NULL")
  @@index([email, name])
}
```

**2. Annotation is extracted (`state/extractor.ts`):**
```typescript
// Finds annotation in model documentation
const annotation = '@schematic.index(fields: ["email", "name"], where: "name IS NOT NULL")';

// Parses annotation (utils/annotation.utils.ts)
const parsed = parseAnnotation(annotation, 'schematic');
// → { _schematic_type: "index", fields: ["email", "name"], where: "name IS NOT NULL" }

// Adds model context
const withModel = { model: "User", ...parsed };
// → { _schematic_type: "index", model: "User", fields: ["email", "name"], where: "name IS NOT NULL" }
```

**3. Annotation is validated (`schemas/index.schema.ts`):**
```typescript
// Validates with Zod schema
const validated = IndexSchema.parse(withModel);
// → { model: "User", fields: ["email", "name"], where: "name IS NOT NULL" }
// ✅ Throws if invalid fields or structure
```

**4. State is built (`state/builder.ts`):**
```typescript
const state = buildState(dmmf, config);
// → {
//   generatedAt: "2026-01-28T08:00:00.000Z",
//   schemaHash: "76c25371021f96c0...",
//   indexes: [
//     { model: "User", fields: ["email", "name"], where: "name IS NOT NULL" }
//   ]
// }
```

**5. State is saved (TODO: `state/writer.ts`):**
```json
// Written to ./schematic.state.json
{
  "generatedAt": "2026-01-28T08:00:00.000Z",
  "schemaHash": "76c25371021f96c0...",
  "indexes": [
    {
      "model": "User",
      "fields": ["email", "name"],
      "where": "name IS NOT NULL"
    }
  ]
}
```

### Example: State Builder (Actual Code)

```typescript
// state/builder.ts
import { DMMF } from '@prisma/generator-helper';
import computeHash from '@/utils/hash';
import { State } from '@/types/state.types';
import { SchematicConfig } from '@/types/schematic.types';
import extract from './extractor';

export default function buildState(
  dmmf: DMMF.Document,
  config: SchematicConfig
): State {
  // Extract annotations from DMMF and validate
  const extractions = extract(dmmf, config);

  return {
    generatedAt: new Date().toISOString(),
    schemaHash: computeHash(dmmf),
    ...extractions, // Contains: { indexes: [...] }
  };
}
```

```typescript
// state/extractor.ts
export default function extract(
  dmmf: DMMF.Document,
  config: SchematicConfig
): Omit<State, 'generatedAt' | 'schemaHash'> {
  const annotations = getAnnotations(dmmf, config.annotationPrefix);
  const extractions = [];
  
  annotations.forEach((annotation) => {
    const schemaType = annotation._schematic_type;
    
    // Validate annotation type exists
    if (!(schemaType in schemas)) {
      throw new Error(`Unknown annotation type: ${schemaType}`);
    }

    // Validate annotation structure with Zod
    const extraction = schemas[schemaType as SchemaType](annotation as unknown);
    extractions.push(extraction);
  });

  return {
    indexes: extractions.filter(
      (extraction) => extraction._schematic_type === 'index'
    ),
  };
}
```

### Example: Annotation Parser (Actual Code)

```typescript
// utils/annotation.utils.ts
export function parseAnnotation(
  annotation: string,
  annotationPrefix: string
): RawParsedAnnotation {
  const cleaned = annotation.trim();

  // Strip @prefix. in one step: '@schematic.partialIndex(...)' → 'partialIndex(...)'
  const prefixPattern = new RegExp(`^@${annotationPrefix}\\.`);
  if (!prefixPattern.test(cleaned)) {
    throw new Error(
      `Annotation must start with @${annotationPrefix}. Got: ${annotation}`
    );
  }

  const withoutPrefix = cleaned.replace(prefixPattern, '');

  // Extract type and arguments: 'partialIndex(...)' → ['partialIndex', '...']
  const match = withoutPrefix.match(/^(\w+)(?:\((.*)\))?$/s);
  if (!match) {
    throw new Error(`Invalid annotation format: ${annotation}`);
  }

  const [, type, argsString] = match;
  const args = argsString ? parseArguments(argsString) : {};

  return {
    _schematic_type: type,
    ...args,
  };
}

// Parses: 'fields: ["email"], where: "active = true"'
// Returns: { fields: ["email"], where: "active = true" }
function parseArguments(argsString: string): Record<string, unknown> {
  // ... complex parsing logic for JSON5-like syntax ...
}
```

### Example: State Loader (Actual Code)

```typescript
// state/loader.ts
import { readJSONFile, fileExists } from '@/utils/file.utils';
import { State } from '@/types/state.types';
import { logger } from '@prisma/internals';

export default async function loadState(
  filePath: string
): Promise<State | null> {
  try {
    const exists = await fileExists(filePath);
    if (!exists) {
      logger.info(`No state file found at ${filePath}`);
      return null;
    }

    const state = await readJSONFile<State>(filePath);
    logger.info(`Loaded state from ${filePath}:`, state);
    return state;
  } catch (error) {
    logger.error(`Failed to load state from ${filePath}:`, error);
    throw new Error(`Failed to load state: ${error.message}`);
  }
}
```

```typescript
// utils/file.utils.ts
export async function readJSONFile<T>(filePath: string): Promise<T> {
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content) as T;
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
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

