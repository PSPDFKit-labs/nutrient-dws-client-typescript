# CLAUDE.md

Canonical agent instructions live in @AGENTS.md — read it first.

Restated here so it survives even if that import is not expanded: **never hand-edit anything
under `src/generated/`.** Regenerate with `npm run generate:types` /
`npm run generate:types:extract`; CI fails on drift.
See [docs/generated-types.md](docs/generated-types.md) to change an API type correctly.
