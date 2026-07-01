# State & Migration Rules

> Cursor: copy to `.cursor/rules/schematic-state.mdc` with `globs: src/state/**/*.ts,src/migrations/**/*.ts,src/cli/**/*.ts`.

See `docs/plan.md` for data flow. See `docs/status.md` for what exists today.

## State shape (target)

```typescript
interface State {
  version: '1';
  generatedAt: string;
  schemaHash: string;
  features: StateFeature[];  // NOT indexes[]
}

interface StateFeature {
  id: string;
  type: string;
  model: string;
  input: Record<string, unknown>;
  upSql: string;
  downSql: string;  // stored at creation, never recomputed on removal
  createdAt: string;
}
```

## Diff rules

- Match features by stable `id`
- **Added** → emit `upSql`
- **Removed** → emit stored `downSql` from baseline (git HEAD)
- **Changed** → emit `mutate()` or old `downSql` + new `upSql`

## Enhance SQL order

1. Drops: `dropPriority` desc, then `createdAt` desc
2. Creates: stable order by `id`
3. Mutations: down then up per feature

## Do not

- Bucket features into hard-coded arrays (`indexes`, `partialIndexes`, etc.)
- Recompute `downSql` on removal
- Use disk state as enhance baseline
