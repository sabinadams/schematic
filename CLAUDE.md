# Schematic — Claude Code

Read @AGENTS.md first. It is the canonical source for project overview, philosophy, dev practices, documentation upkeep, and Schematic-specific rules.

## Before coding

1. @docs/status.md — what is implemented vs documented (do not assume docs match code)
2. @docs/plan.md — target architecture and invariants

## Quick reminders

- Pluggable handlers only — no feature-specific logic in `src/`
- Annotations from DMMF `documentation` (doc comments), not custom locate functions
- Persist `downSql` in state at creation; `enhance` baselines git HEAD
- Update docs in the same PR as code (see AGENTS.md documentation maintenance table)

## Commands

```bash
pnpm test && pnpm typecheck && pnpm lint
pnpm build
```

## Deep references

- Handler authoring: @docs/handlers.md
- Module layout: @docs/architecture.md
- Cursor rules: `.cursor/rules/` (also sourced from `docs/agent-rules/`)
