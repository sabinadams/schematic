# Agent Guide — Schematic

This file orients AI agents (Cursor, Claude, etc.) working in this repo. **Read it first.**

---

## Project overview

**Schematic** is a Prisma generator and CLI that lets users define custom database annotations via Zod schemas and handlers. Core orchestrates extraction, validation, state tracking, diffing, and migration SQL. Users bring the features; core brings the pipeline.

**Prisma owns:** tables, columns, relations, basic indexes, migration history.

**Schematic owns:** reading `@schematic.*` doc comments from DMMF, validating via user handlers, persisting desired state, diffing, and appending SQL to Prisma migrations.

**Users own:** annotation types, Zod schemas, and SQL generation logic (`upSql` / `downSql`).

Target dev workflow:

```bash
prisma migrate dev --create-only --name my_change
schematic enhance          # diff vs git HEAD, append SQL
prisma migrate dev         # apply + prisma generate updates state
```

User-facing docs: [README.md](README.md). Design spec: [docs/plan.md](docs/plan.md).

---

## Philosophy

These principles apply to **all** work in this repo — code, docs, and tests.

### Pluggable over prescriptive

Nothing feature-specific belongs in core. Partial indexes, GIN indexes, FK auto-indexing, check constraints — all are handler examples or user code, not built-in branches in `src/`.

### Functional and composable

This tool is a pipeline of transformations (schema → state → diff → SQL). Prefer small pure functions, clear inputs/outputs, and composition over inheritance or deep class hierarchies.

### Minimal scope

Use the simplest correct diff. Do not add unrelated code, refactors, tests, or docs unless requested or clearly required by the change. Match existing naming, imports, and file structure.

### State is the source of truth for reversal

When a feature is created, persist both `upSql` and `downSql` in the state file. Removals emit stored `downSql` — even if the handler is later deleted. Do not recompute reversal SQL at drop time.

### Docs must not lie about implementation

[docs/status.md](docs/status.md) tracks what is actually built. README and roadmap may describe target architecture. Before claiming a feature is done, update code **and** status.

### Docs stay in sync with code

Documentation updates belong in the **same PR** as code changes. See "Documentation maintenance" under Development practices for which files to update when.

---

## Development practices

### Commands

```bash
pnpm install
pnpm build
pnpm test              # run all tests
pnpm test:coverage     # coverage report
pnpm typecheck
pnpm lint
pnpm format:check
```

### Testing

**Test thoroughly.** There is no fixed coverage percentage enforced in CI today, but every change should be tested appropriately:

- **Update tests when you change behavior** — if you modify a module, update its tests in the same PR
- **Pure functions get unit tests** — parser, hash, comparator, builder, config extraction
- **Test behavior, not implementation** — especially diff/reversal paths (removed feature emits stored `downSql`; handler absent still reverses)
- **Avoid trivial tests** — don't assert the obvious; do cover edge cases and regressions
- **New modules ship with tests** — colocate as `*.test.ts` next to source (existing convention)

Critical paths that always need tests when touched:

| Area | Why |
| ---- | --- |
| `annotation.utils.ts` | Parsing is easy to break with edge-case strings |
| `state/comparator.ts` | Wrong diff = wrong migrations |
| `state/builder.ts` | Must preserve stored SQL for unchanged ids |
| `registry/loader.ts` | User handler loading must fail clearly |

Run `pnpm test` before considering work complete.

### Documentation maintenance

**Keep docs in sync with code.** Documentation drift is how agents and humans build the wrong thing. Update docs in the **same PR** as code changes — not in a follow-up.

#### Always update (when relevant to your change)

| Doc | Update when |
| --- | ----------- |
| [docs/status.md](docs/status.md) | Any implementation change — move items between implemented / not implemented |
| Tests | Behavior changes (see Testing above) |
| [AGENTS.md](AGENTS.md) | Project philosophy, dev practices, or agent workflow changes |
| [docs/agent-rules/](docs/agent-rules/) | Agent/Cursor rules change — keep in sync with AGENTS.md |

#### Update when the change affects them

| Doc | Update when |
| --- | ----------- |
| [docs/plan.md](docs/plan.md) | Architecture, invariants, or data flow change |
| [docs/architecture.md](docs/architecture.md) | Module layout, file paths, or responsibilities change |
| [docs/handlers.md](docs/handlers.md) | Public handler API or authoring contract changes |
| [README.md](README.md) | User-facing setup, config options, CLI, or workflow changes |
| [docs/roadmap.md](docs/roadmap.md) | A phased feature is **actually shipped** (code + status.md first) |
| [docs/future.md](docs/future.md) | Scope moves in or out of the project |
| [examples/handlers/](examples/handlers/) | Example handler API or patterns change |

#### Usually do not update

- **README / roadmap** for internal refactors with no user-visible change
- **plan.md / architecture.md** for bug fixes that don't change design
- **All docs** on every PR — only what your change touches

#### Consistency rules

1. **`docs/status.md` is the implementation truth** — if code exists, status must reflect it; if status claims done, code must exist
2. **Roadmap checkboxes follow status.md** — never mark complete in roadmap alone
3. **Agent docs follow human docs** — if workflow or architecture changes, update AGENTS.md and agent-rules together
4. **Don't document unimplemented behavior as current** — use "planned" in future.md or leave out of README until shipped
5. **Minimal doc diffs** — same as code; don't rewrite unrelated sections

### Code quality

- TypeScript strict — run `pnpm typecheck`
- ESLint + Prettier — match existing style (`pnpm lint`, `pnpm format:check`)
- `@/` path aliases — follow existing imports
- One concern per file — see [docs/architecture.md](docs/architecture.md)

### Before opening a PR

1. `pnpm test && pnpm typecheck && pnpm lint`
2. Tests updated for behavior changes
3. [docs/status.md](docs/status.md) updated if implementation changed
4. Other docs updated per the table above (plan, architecture, README, agent-rules — as applicable)
5. Do not mark roadmap items complete without code + status update
6. Keep diffs focused — no drive-by refactors or doc rewrites

### Commits

Only commit when asked. Follow existing commit message style (concise, explains why).

---

## Documentation map

| Doc | When to read |
| --- | ------------ |
| [docs/status.md](docs/status.md) | **Always** — what's implemented vs documented |
| [docs/plan.md](docs/plan.md) | Architecture decisions, data flow, invariants |
| [docs/architecture.md](docs/architecture.md) | Module layout and responsibilities |
| [docs/handlers.md](docs/handlers.md) | Authoring user-facing handlers |
| [docs/roadmap.md](docs/roadmap.md) | Completed phases and future work |
| [docs/future.md](docs/future.md) | Explicitly deferred items |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Human contributor setup and workflow |
| [CLAUDE.md](CLAUDE.md) | Claude Code entry point (imports this file + docs) |
| [docs/agent-rules/](docs/agent-rules/) | Cursor rule sources (installed to `.cursor/rules/`) |

---

## Schematic-specific rules

These are domain constraints agents must not violate. Details in [docs/plan.md](docs/plan.md).

1. **Annotations come from DMMF `documentation`** — `///` doc comments on models and fields. Handlers do not define where annotations are found.
2. **`schematic enhance` baselines git HEAD state** — not post-`prisma generate` disk state.
3. **Preserve stored SQL for unchanged feature ids** — do not re-call `handler.up()` on unchanged entries.
4. **No closed registries** — do not reintroduce hard-coded type lists like `src/schemas/index.ts`.
5. **Fail fast** on unknown annotation types when no handler is registered.

### Common mistakes

- Hard-coding `partialIndex`, `ginIndex`, etc. in core
- Bucketing state into `indexes[]`, `partialIndexes[]`, etc. instead of `features[]`
- Using disk state as enhance baseline
- Claiming features done in docs without updating `docs/status.md`

### Key types (target)

```typescript
interface AnnotationDefinition<TSchema extends z.ZodType> {
  type: string;
  schema: TSchema;
  dropPriority?: number;
  handlers: {
    up: (input, ctx) => { upSql: string; downSql: string };
    mutate?: (old, next, ctx) => SqlPair;
  };
}

interface StateFeature {
  id: string;
  type: string;
  model: string;
  input: Record<string, unknown>;
  upSql: string;
  downSql: string;
  createdAt: string;
}
```

---

## Cursor rules

Installed rules: [.cursor/rules/](.cursor/rules/) (auto-injected in Cursor).

Sources (keep in sync when editing): [docs/agent-rules/](docs/agent-rules/).

| Rule | Scope |
| ---- | ----- |
| `schematic-core.mdc` | Always — design non-negotiables |
| `schematic-handlers.mdc` | Handlers and examples |
| `schematic-state.mdc` | State, migrations, CLI |

Project skill: [.cursor/skills/schematic/SKILL.md](.cursor/skills/schematic/SKILL.md) — use when implementing phases from `docs/status.md`.

---

## Branch note

`docs/pluggable-annotation-pipeline` — documentation describes target architecture; verify against [docs/status.md](docs/status.md) before assuming code exists.
