@AGENTS.md

File structure and working rules live in AGENTS.md above; this file only adds Claude Code-specific notes.

## Claude Code notes

- Formatting is automatic: `.claude/settings.json` runs `.claude/hooks/format.mjs` (`prettier --write`) as a PostToolUse hook after every Edit/Write/MultiEdit, so no manual `npx prettier --write` step is needed here.
- Skills in `.agents/skills/` are symlinked into `.claude/skills/` for discovery; install/update skills with `npx skills add ...` from the repo root, not by editing `.claude/skills/` directly.
