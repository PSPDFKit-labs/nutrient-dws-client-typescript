# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [3.0.0] - 2026-08-03

This release has five breaking changes. Three originate upstream in the DWS
API spec bump from `1.10.0` to `1.15.1`; the fourth (the `sign()` default
removal, below) is a deliberate library change to stop overriding the
server's contract; the fifth raises the minimum Node.js version to 22. See
`docs/MIGRATION.md` for worked before/after examples of each.

### Added

- `NutrientClient.getUsage(product)` — fetches subscription and usage
  information for a single product (`processor`, `viewer`,
  `signing_workflow`, `accessibility`, `data_extraction`) on the current API
  key. DWS meters several independent credit systems, so a single flat total
  can no longer represent account usage.
- Public types: `AccountUsage`, `AccountUsageSubscription`, `UsageCounter`,
  `ProductName`, and `AccountInfo`.
- Exported `FileInputWithUrl` from the package root. It is the parameter type
  of roughly twenty public `NutrientClient` methods (`merge()`, `sign()`,
  `watermarkText()`, `applyRedactions()`, workflow `addFilePart()`, etc.) but
  was never itself exported in v2.1.0, so code that imported it to type a
  wrapper function or variable failed to compile.

### Deprecated

- `NutrientClient.getAccountInfo()` is deprecated in favor of
  `getUsage(product)`. The underlying `/account/info` endpoint is deprecated
  upstream. The method remains fully functional; every call now emits a
  runtime deprecation warning.

### Changed

- **Breaking:** The minimum supported Node.js version is now `22.0.0`, raised
  from `18.0.0`. Node.js 18 reached end-of-life in April 2025 and Node.js 20
  in April 2026; neither receives security patches, so neither can be tested
  or supported. CI now runs against Node.js 22 and 24. There is no API
  change — if you are already on Node.js 22 or later, nothing in your code
  needs to change. See `docs/MIGRATION.md`.
- Updated the vendored OpenAPI spec from `1.10.0` to `1.15.1`.
- Type generation now passes `--empty-objects-unknown` and
  `--default-non-nullable=false` to `openapi-typescript`, so the generated
  types are reproducible directly from the spec.
- Updated the development toolchain: ESLint `9.39.2` → `10.8.1` (with
  `@eslint/js` `9.39.2` → `10.0.1`), `globals` `16.5.0` → `17.9.0`,
  `@types/node` `24.10.7` → `26.2.0`, `typescript-eslint` `8.53.0` →
  `8.66.0`, `jest` `30.2.0` → `30.4.2`, `ts-jest` `29.4.6` → `29.4.12`,
  `prettier` `3.7.4` → `3.9.6`, `openapi-typescript` `7.10.1` → `7.13.0`,
  and six others to their latest in-range releases. `openapi-typescript`
  `7.13.0` regenerates both files in `src/generated/` byte-for-byte
  identically, so no generated type changed.
- Updated TypeScript from `5.9.3` to `6.0.3`. TypeScript 7 is not yet
  reachable — `ts-jest@29.4.12` requires `typescript <7` and
  `typescript-eslint@8.66.0` requires `<6.1.0` — but 6.0 is the supported
  bridge release toward it, and staying on 5.9 meant sitting on compiler
  options that 7.0 removes outright. Three changes came with it:
  - `moduleResolution` moves from `node` (node10) to `bundler`. TypeScript 6
    deprecates node10 and TypeScript 7 drops it. `bundler` matches how this
    package is actually built (tsup/esbuild bundles `src/`, and imports are
    extensionless); `node16`/`nodenext` would have required rewriting every
    relative import to carry a `.js` extension.
  - TypeScript 6 no longer implicitly pulls in every `node_modules/@types`
    package, so the test project now names `jest` and `node` explicitly.
  - `openapi-typescript@7.13.0` declares a `typescript: ^5.x` peer, which
    makes `npm ci` fail outright on TypeScript 6. A scoped `overrides` entry
    relaxes that single peer. The tool itself is unaffected: it regenerates
    both files in `src/generated/` byte-for-byte identically under 6.0.3,
    and CI's drift job re-checks that on every run.
- The `lint` and `lint:fix` scripts no longer pass `--ext .ts`. ESLint 10
  removes the flag, and it was already redundant under flat config — file
  coverage is unchanged at 31 files.
- Updated GitHub Actions: `checkout`, `setup-node` and `upload-artifact` to
  v7, and `github-script` to v9.
- `npm run typecheck` now also typechecks the test suite. Test files were
  excluded from the only project `tsc --noEmit` ran against, so they were
  never typechecked outside of `ts-jest` at test time.
- **Known limitation:** 1.15.1 widened `WatermarkDimension` (the type of
  `width`/`height`/`top`/`right`/`bottom`/`left` on watermark actions) from
  `{ value, unit }` to `number | string | { value, unit }`, adding a scalar
  shorthand. This client cannot express the new scalar forms: the vendored
  spec composes each of those slots as `allOf: [{ type: object, description
  }, $ref: WatermarkDimension]` — an anonymous, object-typed member
  intersected with a reference that now also permits a bare `number` or
  `string`. The two halves of that `allOf` are mutually contradictory (a
  scalar can never also be an object), and the codegen renders the
  contradiction faithfully as `Record<string, unknown> & WatermarkDimension`,
  which no `number` or `string` value satisfies. This is a spec-composition
  issue, not a consequence of the `--empty-objects-unknown` codegen flag:
  regenerating without that flag does not fix it and is strictly worse — the
  anonymous member then renders as `Record<string, never>` instead of
  `unknown`, which breaks the previously-working `{ value, unit }` object
  form as well. This does not affect existing code as shipped — the
  `{ value, unit }` object form is the only form v2.1.0 ever supported, and it
  still works unchanged.
- **Breaking (behavioral):** `client.sign(file)` called *without* a `data`
  argument no longer sends a client-side default of `{ signatureType: 'cades',
  cadesLevel: 'b-lt' }`. The request now sends an empty `data` object, so the
  server's documented default applies instead (`flatten: false`, invisible
  signature, no CAdES level forced). This is a library decision, not an
  upstream spec change — the client previously overrode the server's default
  and no longer does. **This is the change most likely to bite you silently**:
  it alters the signature a caller receives at runtime with no type error to
  flag it. `signatureType` and `cadesLevel` are also gone from the `data`
  type (see below), so there is no longer a supported way to request CAdES
  B-LT through this typed parameter at all. If your workflow depends on a
  specific signature type, consult the current `/sign` API reference and
  verify your signed output. See `docs/MIGRATION.md`.

### Removed

- Removed the Codecov integration. CI still runs the unit tests with
  `--coverage`, so the thresholds in `jest.config.mjs` (70% branches and
  functions, 75% lines and statements) continue to gate the build — coverage
  is simply no longer uploaded to a third-party service.
- Removed `tsconfig.test.json`. It existed only to give type-aware linting a
  project containing the tests; that role now belongs to
  `src/__tests__/tsconfig.json`, which typescript-eslint's project service
  discovers on its own as the nearest config to those files.
- **Breaking:** Removed `apiKeys` from the `getAccountInfo()` response type,
  following its removal from the upstream `/account/info` endpoint. If you
  read `accountInfo.apiKeys`, use `createToken()` / `deleteToken()` to manage
  authentication tokens instead.
- **Breaking:** Narrowed `OcrLanguage`, following the upstream spec. 14
  full-word language values were removed in favor of their existing ISO
  639-2 codes: `afrikaans`, `albanian`, `arabic`, `armenian`, `azerbaijani`,
  `basque`, `belarusian`, `bengali`, `bosnian`, `bulgarian`, `catalan`,
  `chinese`, `welsh`, and the stray, undocumented `sp1`. This affects
  `client.ocr()` and `BuildActions.ocr()`. See `docs/MIGRATION.md` for the
  full old-value → new-value mapping (`chinese` has no single successor and
  needs an explicit choice between `chi_sim` and `chi_tra`).
- **Breaking:** Removed `signatureType` and `cadesLevel` from
  `CreateDigitalSignature`, following the upstream spec. This changes the
  public type of `client.sign()`'s `data` parameter — code that set either
  field no longer compiles. See `docs/MIGRATION.md`.

### Fixed

- The `/build` endpoint's `200 application/json` response was typed in the
  generated `components`/`operations` namespaces as `JSONContentOutput` — the
  *request*-side `json-content` output-format config (`{ type, plainText,
  structuredText, ... }`) — instead of `BuildResponseJsonContents`, the
  actual response body (`{ pages: PageJsonContents[] }`). This was a v2
  typing bug in the raw generated types; the higher-level workflow API
  (`outputJson()` / `TypedWorkflowResult`) already used the correct shape and
  is unaffected. Consumers reading the low-level `components` or `operations`
  types directly for a `/build` JSON-content response now get the accurate
  shape.
- Removed a leaked deep import of
  `@typescript-eslint/eslint-plugin/dist/util` (a devDependency) from the
  published `dist/types/http.d.ts`. It was pulled in solely for a generic
  `ValueOf<T>` helper and, because that helper appeared in an exported type,
  the import statement was emitted into the public `.d.ts`. Under
  `skipLibCheck: false`, consumers who didn't happen to have that package on
  disk got `TS2307: Cannot find module`. `ValueOf<T>` is now defined locally.
- Removed nine redundant type assertions that newer `typescript-eslint`
  releases correctly flag as unnecessary, in `src/builders/workflow.ts` and
  two test files, and collapsed one `if (!config || !config.type)` guard to
  `if (!config?.type)`. All are semantics-preserving.

### Security

- Updated `axios` from `1.13.2` to `1.19.0`. The previously pinned range
  resolved to a release carrying 29 open advisories, several rated high: SSRF
  through `NO_PROXY` hostname and IP-alias bypass
  ([GHSA-3p68-rc4w-qgx5](https://github.com/advisories/GHSA-3p68-rc4w-qgx5),
  [GHSA-m7pr-hjqh-92cm](https://github.com/advisories/GHSA-m7pr-hjqh-92cm)),
  authentication bypass via a prototype-pollution gadget in the
  `validateStatus` merge strategy
  ([GHSA-w9j2-pvgh-6h63](https://github.com/advisories/GHSA-w9j2-pvgh-6h63)),
  header injection
  ([GHSA-6chq-wfr3-2hj9](https://github.com/advisories/GHSA-6chq-wfr3-2hj9)),
  CRLF injection in `multipart/form-data` bodies
  ([GHSA-445q-vr5w-6q77](https://github.com/advisories/GHSA-445q-vr5w-6q77)),
  and `Proxy-Authorization` credential leakage across an HTTP-to-HTTPS
  redirect
  ([GHSA-p92q-9vqr-4j8v](https://github.com/advisories/GHSA-p92q-9vqr-4j8v)).
- Updated `form-data` from `4.0.5` to `4.0.6`, fixing CRLF injection via
  unescaped multipart field names and filenames
  ([GHSA-hmw2-7cc7-3qxx](https://github.com/advisories/GHSA-hmw2-7cc7-3qxx)).

Both are runtime dependencies, so every consumer of this library inherits
them. Every file upload this client performs is built with `form-data` and
dispatched through `axios`, so the multipart and header injection paths were
reachable from ordinary use. Neither update changes any API.

## [2.1.0] - 2026-05-29

### Added

- First-class client support for the Data Extraction API (`POST /extraction/parse`).
  - `NutrientClient` accepts an `extractApiKey` option (string or async getter)
    that `parse()` uses in place of `apiKey`. Data Extraction is a separate
    product with its own credit pool, so the Processor key returns 403 against
    `/extraction/parse`. When `extractApiKey` is omitted, `parse()` falls back
    to `apiKey`, which works on tenants with global DWS keys.
  - `NutrientClient.parse(input, options?)` — full request/response surface with
    typed support for all four modes (`text`, `structure`, `understand`, `agentic`)
    and both output formats (`spatial`, `markdown`).
  - `NutrientClient.parseToMarkdown(input, mode?)` — convenience wrapper returning
    the whole-document Markdown string directly.
  - `NutrientClient.parseElements(input, mode?, includeWords?)` — convenience
    wrapper returning the spatial elements array directly.
  - Public types: hand-composed `ParseOutputOptions`, `ParseInstructions`,
    `ParseOptions`, `ParseResponse`, `ParseResponseSpatial`, `ParseResponseMarkdown`,
    and `ExtractionCredits`. The spec primitives (`Mode`, `Element` and the six
    subtypes, `Bounds`, `PageRef`, `Word`, `Metrics`, `Usage`, `Configuration`,
    `ParseErrorResponse`, etc.) are accessible via the `extractComponents`
    namespace re-export — same pattern as `components` for the Processor spec.
  - Billing note: `/extraction/parse` debits the account's **extraction
    credits** bucket, which is separate from the **processor API credits** used
    by the rest of `NutrientClient`. The response surfaces this explicitly in
    `usage.data_extraction_credits`.

## [2.0.0] - 2026-01-27

### Security

- Updated `axios` from ^1.10.0 to ^1.13.2 to fix DoS vulnerability (GHSA-4hjh-wcwx-xvwj)
- Updated `form-data` from ^4.0.4 to ^4.0.5
- Added npm overrides for transitive dependency vulnerabilities:
  - `glob` ^11.0.4 (fixes GHSA-5j98-mcp5-4vw2 command injection)
  - `js-yaml` ^4.1.1 (fixes GHSA-mh29-5h37-fv8m prototype pollution)
- URL inputs are no longer fetched client-side; URLs are passed to the server to mitigate SSRF risks

### Changed

- Most methods accept URL inputs via `FileInputWithUrl` and pass URLs to the server for fetching
- `sign()` now only accepts local files (file paths, Buffers, or Uint8Arrays); fetch remote files first
- Updated devDependencies to latest compatible versions
- Switched Jest coverage provider from Istanbul to V8 for Node.js 25+ compatibility
- Excluded generated API types from coverage collection (reduces noise in coverage reports)

### Removed

- Removed client-side URL fetching helper `processRemoteFileInput` from public exports
- Removed client-side PDF parsing helpers (`getPdfPageCount`, `isValidPdf`)

### Added

- SSRF protection documentation in README
- This CHANGELOG.md file to track project changes


## [1.0.1] - 2025-01-09

### Changed

- Bumped version in example

## [1.0.0] - 2025-01-09

### Added

- Initial release of the Nutrient DWS TypeScript client
- Full TypeScript support with comprehensive type definitions
- Fluent builder API for document workflows
- Support for all DWS API operations:
  - Document conversion (PDF, PDF/A, PDF/UA, images, Office formats, HTML, Markdown)
  - OCR processing
  - Watermarking (text and image)
  - Document merging and splitting
  - Text and table extraction
  - Redaction (text, regex, preset, AI-powered)
  - Annotation operations (XFDF, Instant JSON)
  - PDF optimization and security
- Comprehensive error handling with typed error classes
- AI agent integration rules for Claude Code, Cursor, GitHub Copilot, Junie, and Windsurf

[Unreleased]: https://github.com/PSPDFKit-labs/nutrient-dws-client-typescript/compare/v3.0.0...HEAD
[3.0.0]: https://github.com/PSPDFKit-labs/nutrient-dws-client-typescript/compare/v2.1.0...v3.0.0
[2.0.0]: https://github.com/PSPDFKit-labs/nutrient-dws-client-typescript/compare/v1.0.1...v2.0.0
[1.0.1]: https://github.com/PSPDFKit-labs/nutrient-dws-client-typescript/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/PSPDFKit-labs/nutrient-dws-client-typescript/releases/tag/v1.0.0
