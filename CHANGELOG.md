# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

_Nothing yet._

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

[Unreleased]: https://github.com/PSPDFKit-labs/nutrient-dws-client-typescript/compare/v2.0.0...HEAD
[2.0.0]: https://github.com/PSPDFKit-labs/nutrient-dws-client-typescript/compare/v1.0.1...v2.0.0
[1.0.1]: https://github.com/PSPDFKit-labs/nutrient-dws-client-typescript/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/PSPDFKit-labs/nutrient-dws-client-typescript/releases/tag/v1.0.0
