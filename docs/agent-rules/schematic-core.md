# Schematic Core Rules

> Cursor: copy to `.cursor/rules/schematic-core.mdc` with `alwaysApply: true` frontmatter. See [README.md](./README.md).

Schematic is a pluggable Prisma annotation pipeline. Read `AGENTS.md` and `docs/status.md` before coding.

## Must follow

- **No hard-coded annotation types in core** — features live in user handlers or `examples/handlers/`
- **Annotations from DMMF `documentation`** — model and field doc comments; not custom per-handler locate functions
- **Persist `downSql` in state at creation** — reversals use stored SQL, not re-invoked handlers
- **`enhance` baselines git HEAD state** — not post-generate disk state
- **Preserve stored SQL for unchanged feature ids** — do not re-call `handler.up()` on unchanged entries

## Code style

- Functional, small files, pure functions
- Minimal diff scope — no drive-by refactors
- Match existing naming and import patterns (`@/` aliases)

## Before claiming done

- Update `docs/status.md` with what is actually implemented
- Do not mark roadmap items complete without code + status update
