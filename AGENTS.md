# AGENTS.md

Instructions for AI coding agents (Claude Code, Cursor, Codex, Copilot, Windsurf, and others)
working in this repository. Read this before editing anything.

## Never edit `src/generated/` by hand

`src/generated/api-types.ts` and `src/generated/extract-types.ts` are emitted by
[`openapi-typescript`](https://openapi-ts.dev) from the vendored OpenAPI specs
(`dws-api-spec.yml` and `dws-data-extraction-spec.yml` respectively) via `npm run
generate:types` and `npm run generate:types:extract`. Both files carry a generated-file
header saying the same thing. Believe it.

**CI runs this on every PR.** The `generated-types-drift` job in `.github/workflows/ci.yml`
regenerates both files with `--check` and fails if the working tree would change; the
`build` job `needs` it, so a drift failure blocks `build` within that CI run. That said,
branch protection on `main` does not currently list `generated-types-drift` (or any job)
under required status checks, so a failing run does not by itself block a merge — a
reviewer still has to notice the red X and act on it. Making this job a required status
check in the repository's branch-protection settings would turn it from a signal into an
actual enforcement gate. See `src/generated/README.md` for the short version of this rule
placed directly in that directory.

If you need a different generated shape: fix the vendored spec, or fix the codegen flags
below — never patch the generated output directly. See "Changing an API type" below.

## The two codegen flags are load-bearing

`package.json`'s `generate:types` script passes two non-default flags to
`openapi-typescript`:

```
--empty-objects-unknown --default-non-nullable=false
```

Both look removable. They are not. Dropping both flags reintroduces 35 TypeScript errors
across the codebase (measured with `openapi-typescript` 7.10.1 against the current
`dws-api-spec.yml`; regenerate and run `npx tsc --noEmit` to reproduce). The two flags are
not equally load-bearing — dropping them individually gives:

- **`--default-non-nullable=false`** — several schema properties declare a `default:`
  value. openapi-typescript's default behavior is to treat a property with a `default`
  as always present on the response and therefore emit it as required. Server responses
  don't actually guarantee that; the flag turns that inference off. Dropping just this
  flag (keeping `--empty-objects-unknown`) produces 27 of the 35 errors — `default:`
  shows up on far more schema properties than the pattern below.
- **`--empty-objects-unknown`** — the spec uses `allOf: [$ref, {description}]` in several
  places (a `$ref` merged with just a sibling `description`, no added properties).
  Without this flag, openapi-typescript emits that pattern as
  `Record<string, never> & X`, and intersecting with `Record<string, never>` collapses
  every property of `X` to `never`. The flag tells the generator that an empty object
  schema in an `allOf` means "no additional constraints," not "no properties allowed."
  Dropping just this flag (keeping `--default-non-nullable=false`) produces the
  remaining 8 errors.

This is not hypothetical: an earlier version of this repository had these flags missing,
the generated file was hand-patched to work around the resulting type errors instead of
fixing the flags, and the hand-patch silently diverged from what `generate:types` would
produce — for months, undetected, because nothing checked. That drift is the entire
reason this document and the CI job exist. Do not repeat it by "cleaning up" the flags.

## Changing an API type

1. Update the vendored spec — either edit `dws-api-spec.yml` / `dws-data-extraction-spec.yml`
   directly, or replace it with a newer spec pulled from upstream.
2. Re-run the generator: `npm run generate:types` and/or `npm run generate:types:extract`.
3. Commit the regenerated output alongside the spec change, as one change.

If the regenerated shape is still wrong (missing property, wrong nullability, wrong
required set), the fix is in the spec or in a codegen flag — never in the generated
`.ts` file. If you believe a new flag is needed, document why in this file next to the
two above.

## Where hand-written types are legitimate

`src/types/http.ts` holds hand-written types for shapes the OpenAPI spec genuinely
cannot express — not for shapes that are merely inconvenient to consume as generated.
The worked example is the `/extraction/parse` block in that file (search for
`ParseOutputOptions`, `ParseInstructions`, `ParseOptions`, `ParseResponse`): the spec
marks `OutputOptions.includeWords` as required when the server actually defaults it, and
the response is a cross-field discriminated union the spec doesn't encode structurally.
Those are spec limitations, documented inline with a comment explaining the gap.

The bar for adding to `src/types/http.ts` is "the spec cannot express this," not "the
generated type is annoying to use." If you're tempted to hand-write a type purely for
ergonomics, prefer a type alias or utility type derived from the generated
`components`/`operations` types instead — see the existing `AccountInfo`, `AccountUsage`,
and `ProductName` aliases in that file.

## Repo orientation

- `src/client.ts` — `NutrientClient`, the public entry point.
- `src/http.ts` — `sendRequest()` is the **only** HTTP entry point in the library; every
  operation routes through it. Endpoint keys passed to it are literal request paths
  (`src/http.ts` builds the URL as `` `${baseUrl.replace(/\/$/, '')}${endpoint}` ``, so a
  trailing slash on `baseUrl` is stripped before the endpoint is appended).
- `src/types/http.ts` — `RequestTypeMap` and `ResponseTypeMap` are the per-endpoint
  request/response type maps that `sendRequest()` is generic over; this is where an
  endpoint's wire types are wired up, generated or hand-written.
- `src/generated/` — generated-only, see above.
- `src/builders/`, `src/workflow.ts`, `src/build.ts` — the fluent workflow builder API.
- `src/inputs.ts` — file/URL input normalization.
- `src/errors.ts` — the `NutrientError` hierarchy.

## Verification

Before considering a change done, run:

```
npm run typecheck
npm run lint
npm run test:unit
```

## Public repository

This repository is public. Do not put internal task/ticket ids, internal tracker
paths, internal repo names, or internal tool names in code, comments, docs, or commit
messages.
