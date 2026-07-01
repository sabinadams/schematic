# Contributing to Schematic

Thanks for contributing. This guide covers setup, workflow, and expectations for humans and AI agents.

## AI agents

**Start with [AGENTS.md](AGENTS.md).** It is the canonical guide for philosophy, dev practices, documentation upkeep, and Schematic-specific rules.

- Claude Code: [CLAUDE.md](CLAUDE.md) points to the same sources
- Cursor: rules in [.cursor/rules/](.cursor/rules/) (sources in [docs/agent-rules/](docs/agent-rules/))

## Setup

```bash
git clone <repo-url>
cd schematic
pnpm install
pnpm build
pnpm test
```

Requires Node.js >= 18.

## Development workflow

```bash
pnpm dev          # watch build
pnpm test         # run tests
pnpm test:watch   # watch mode
pnpm typecheck
pnpm lint
pnpm format:check
```

## Making changes

1. Read [docs/status.md](docs/status.md) — know what's implemented vs documented
2. Read [docs/plan.md](docs/plan.md) — understand target architecture
3. Keep diffs focused — minimal scope, match existing conventions
4. Test thoroughly — update tests when behavior changes
5. Update docs in the **same PR** as code (see AGENTS.md documentation maintenance table)

### Documentation

| Priority | File | When |
| -------- | ---- | ---- |
| Always | `docs/status.md` | Implementation changes |
| As needed | `docs/plan.md`, `architecture.md`, `handlers.md`, `README.md` | When your change affects them |
| As needed | `AGENTS.md`, `docs/agent-rules/` | Philosophy or agent workflow changes |

## Pull requests

Use the PR template checklist. Ensure:

- Tests pass
- Docs reflect code changes
- No feature-specific logic hard-coded in core

## Architecture principles

- **Pluggable handlers** — users define Zod schemas + SQL handlers
- **Core orchestrates** — extract, validate, state, diff, append migrations
- **Stored reversal SQL** — `downSql` persisted in state at creation

See [docs/architecture.md](docs/architecture.md) for details.

## Questions

Open an issue or refer to [docs/roadmap.md](docs/roadmap.md) and [docs/future.md](docs/future.md).
