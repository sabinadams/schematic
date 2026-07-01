# Future Enhancements

The pluggable annotation pipeline, state management, migration enhancement, and CLI are implemented. This document tracks what comes next.

---

## Near-term

### `schematic diff`

Preview SQL that would be appended by `enhance` without modifying migration files.

```bash
npx schematic diff
# Prints ordered SQL to stdout
```

Useful for PR review and debugging handler output.

### `@@` attribute block support

v1 reads annotations from DMMF `documentation` (doc comments). Some users prefer attribute-style syntax:

```prisma
model Post {
  status String

  @@schematic.partialIndex(columns: ["status"], where: "status = 'active'")
}
```

Investigate whether Prisma exposes these on DMMF in a parseable form. If not, a schema AST parser may be needed.

### Additional example handlers

- Composite indexes with sort order
- PostgreSQL `CONCURRENTLY` index creation (non-transactional — document constraints)
- SQLite-specific partial index patterns
- Multi-column GIN indexes

---

## Medium-term

### Cloud state storage

For distributed teams that want to avoid state file merge conflicts:

```prisma
generator schematic {
  provider     = "schematic"
  handlers     = "./schematic.handlers.ts"
  stateStorage = "gcp"
  stateBucket  = "my-company-bucket"
  stateKey     = "project/schematic-state.json"
}
```

Backends: GCP Cloud Storage, AWS S3, Azure Blob Storage.

Benefits: no merge conflicts, state locking, cleaner git history.

Trade-offs: cloud credentials, network dependency, additional cost.

### Optional introspection (`schematic clean`)

Detect orphaned database objects not tracked in state. Requires per-provider system table queries.

Not needed for v1 — idempotent SQL and state diffing cover the common case.

### Developer experience

- VSCode extension for annotation autocomplete based on registered handler types
- `schematic init` scaffold for `schematic.handlers.ts`
- Handler testing utilities (mock `HandlerContext`, assert SQL output)

---

## Long-term

- Triggers and stored procedures as example handlers
- Custom types and domains
- Web UI for migration preview and state inspection
- Schema migration history comparison (Schematic state diffs across migrations)

---

## Explicitly out of scope

These are intentionally not planned as core features — implement as handlers if needed:

- Built-in FK auto-indexing (available as example handler in `examples/handlers/fk-index.ts`)
- Built-in partial index / GIN index types (available as examples)
- Database introspection as default workflow
- Wrapping Prisma CLI commands (`schematic migrate dev` etc.)
