# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Security

- Updated `axios` from ^1.10.0 to ^1.13.2 to fix DoS vulnerability (GHSA-4hjh-wcwx-xvwj)
- Updated `form-data` from ^4.0.4 to ^4.0.5
- Added npm overrides for transitive dependency vulnerabilities:
  - `glob` ^11.0.4 (fixes GHSA-5j98-mcp5-4vw2 command injection)
  - `js-yaml` ^4.1.1 (fixes GHSA-mh29-5h37-fv8m prototype pollution)

### Changed

- Updated devDependencies to latest compatible versions:
  - `@eslint/eslintrc` ^3.3.3
  - `@eslint/js` ^9.39.2
  - `@types/node` ^24.10.7
  - `@typescript-eslint/eslint-plugin` ^8.53.0
  - `@typescript-eslint/parser` ^8.53.0
  - `dotenv` ^17.2.3
  - `eslint` ^9.39.2
  - `eslint-config-prettier` ^10.1.8
  - `eslint-plugin-jest` ^29.12.1
  - `globals` ^16.5.0
  - `jest` ^30.2.0
  - `openapi-typescript` ^7.10.1
  - `prettier` ^3.7.4
  - `rimraf` ^6.1.2
  - `ts-jest` ^29.4.6
  - `tsup` ^8.5.1
  - `tsx` ^4.21.0
  - `typescript` ^5.9.3
- Switched Jest coverage provider from Istanbul to V8 for Node.js 25+ compatibility
- Excluded generated API types from coverage collection (reduces noise in coverage reports)

### Added

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

[Unreleased]: https://github.com/PSPDFKit-labs/nutrient-dws-client-typescript/compare/v1.0.1...HEAD
[1.0.1]: https://github.com/PSPDFKit-labs/nutrient-dws-client-typescript/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/PSPDFKit-labs/nutrient-dws-client-typescript/releases/tag/v1.0.0
