# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [3.0.0] - 2026-08-03

This release has four breaking changes. Three originate upstream in the DWS
API spec bump from `1.10.0` to `1.15.1`; the fourth (the `sign()` default
removal, below) is a deliberate library change to stop overriding the
server's contract. See `docs/MIGRATION.md` for worked before/after examples
of each.

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

- Updated the vendored OpenAPI spec from `1.10.0` to `1.15.1`.
- Type generation now passes `--empty-objects-unknown` and
  `--default-non-nullable=false` to `openapi-typescript`, so the generated
  types are reproducible directly from the spec.
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
  cadesLevel: 'b-lt' }`. The request now omits `data` entirely, so the
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
