# Agent Rules Setup

Cursor rules are **installed** in [`.cursor/rules/`](../.cursor/rules/). Sources live here as `.md` files — edit sources, then sync to `.cursor/rules/*.mdc`.

## Sync after editing sources

When you change a file in this directory, update the matching `.mdc`:

```bash
# Example: after editing schematic-core.md, rebuild schematic-core.mdc
# (prepend YAML frontmatter from .cursor/rules/schematic-core.mdc, then append body from schematic-core.md skipping the Cursor install note line)
```

Or copy manually: frontmatter from existing `.mdc` + body from `.md` (skip line 3 install note).

## Rule files

| Source | Installed | Scope |
| ------ | --------- | ----- |
| `schematic-core.md` | `.cursor/rules/schematic-core.mdc` | Always apply |
| `schematic-handlers.md` | `.cursor/rules/schematic-handlers.mdc` | examples, handlers config |
| `schematic-state.md` | `.cursor/rules/schematic-state.mdc` | state, migrations, cli |

## For non-Cursor agents

- [AGENTS.md](../../AGENTS.md) — canonical guide
- [CLAUDE.md](../../CLAUDE.md) — Claude Code entry point
