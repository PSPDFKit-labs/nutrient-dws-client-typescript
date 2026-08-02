# AGENTS.md

Agent instructions for this repository. Rules here; detail on demand via the table below.

## Rules

**1. Never hand-edit `src/generated/`.**
Regenerate instead: `npm run generate:types` / `npm run generate:types:extract`.
*Enforced by:* the `generated-types-drift` job in CI.
*Detail:* [docs/generated-types.md](docs/generated-types.md)

**2. Never drop the flags from the `generate:types*` scripts.**
`--empty-objects-unknown` and `--default-non-nullable=false` look removable and are not.
*Enforced by:* the same CI job, then `npm run typecheck`.
*Detail:* [docs/generated-types.md](docs/generated-types.md)

**3. Hand-written types go in `src/types/http.ts`, and only when the spec cannot express the shape.**
"The generated type is awkward" is not the bar. Prefer an alias derived from `components`/`operations`.
*Enforced by:* review.
*Detail:* [docs/generated-types.md](docs/generated-types.md)

**4. This repository is public.**
No internal ticket ids, tracker paths, repo names, or tool names — in code, comments, docs, or commit messages.
*Enforced by:* review.

## Definition of done

```bash
npm run typecheck && npm run lint && npm run test:unit
```

## Where to look

| If you are… | Read |
| --- | --- |
| changing an API type, or touching `src/generated/` | [docs/generated-types.md](docs/generated-types.md) |
| finding your way around the code | [docs/architecture.md](docs/architecture.md) |
| adding or changing a client method | [docs/METHODS.md](docs/METHODS.md) |
| working on the workflow builder | [docs/WORKFLOW.md](docs/WORKFLOW.md) |
| making a breaking change | [docs/MIGRATION.md](docs/MIGRATION.md) |
| setting up, or opening a PR | [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) |
