# Agent Rules Setup

Cursor reads rules from `.cursor/rules/*.mdc`. Source copies live in this directory as `.md` files (plan mode cannot write `.mdc` directly — copy manually or use Agent mode).

## Install (one-time per clone)

Create `.cursor/rules/schematic-core.mdc` from `schematic-core.md` with frontmatter:

```yaml
---
description: Schematic core design rules
alwaysApply: true
---
```

Create `.cursor/rules/schematic-handlers.mdc` from `schematic-handlers.md`:

```yaml
---
description: Handler authoring rules
globs: examples/**/*.ts,**/schematic.handlers.ts
alwaysApply: false
---
```

Create `.cursor/rules/schematic-state.mdc` from `schematic-state.md`:

```yaml
---
description: State and migration rules
globs: src/state/**/*.ts,src/migrations/**/*.ts,src/cli/**/*.ts
alwaysApply: false
---
```

## Rule files

| Source | Scope | Purpose |
| ------ | ----- | ------- |
| `schematic-core.md` | Always apply | Non-negotiable design rules |
| `schematic-handlers.md` | examples, handlers config | Handler authoring |
| `schematic-state.md` | state, migrations, cli | State, diff, migrations |

## For non-Cursor agents

Read [`AGENTS.md`](../../AGENTS.md) at the repo root — it consolidates the same rules plus doc map and status pointers.
