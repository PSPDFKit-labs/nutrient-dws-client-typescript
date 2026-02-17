# Script Catalog

## Setup

- `scripts/setup-latest-client.mjs`
  - Install `@nutrient-sdk/dws-client-typescript@latest` with npm/pnpm/yarn.

## Core Document Operations

- `scripts/convert.mjs`
  - Method: `client.convert(input, format)`
  - Common use: office-to-pdf, pdf-to-markdown/html/image

- `scripts/merge.mjs`
  - Method: `client.merge(files)`
  - Common use: combine reports, append cover pages

- `scripts/split.mjs`
  - Method: `client.split(file, ranges)`
  - Common use: split sections into separate files

- `scripts/ocr.mjs`
  - Method: `client.ocr(file, language|language[])`
  - Common use: searchable text from scanned PDFs

- `scripts/extract-text.mjs`
  - Method: `client.extractText(file, pages?)`
  - Common use: content indexing and summarization input

- `scripts/extract-table.mjs`
  - Method: `client.extractTable(file, pages?)`
  - Common use: analytics ingest from PDFs

- `scripts/extract-key-value-pairs.mjs`
  - Method: `client.extractKeyValuePairs(file, pages?)`
  - Common use: forms, invoices, claims data extraction

## PDF Editing and Security

- `scripts/watermark-text.mjs`
  - Method: `client.watermarkText(file, text, options?)`

- `scripts/redact-ai.mjs`
  - Method: `client.createRedactionsAI(file, criteria, mode, pages?)`

- `scripts/rotate.mjs`
  - Method: `client.rotate(file, angle, pages?)`

- `scripts/sign.mjs`
  - Method: `client.sign(file, signatureData?, options?)`
  - Note: input must be local file path

- `scripts/optimize.mjs`
  - Method: `client.optimize(file, options?)`

- `scripts/password-protect.mjs`
  - Method: `client.passwordProtect(file, userPassword, ownerPassword, permissions?)`

- `scripts/add-pages.mjs`
  - Method: `client.addPage(file, count, index?)`

- `scripts/delete-pages.mjs`
  - Method: `client.deletePages(file, pageIndices)`

- `scripts/duplicate-pages.mjs`
  - Method: `client.duplicatePages(file, pageIndices)`

## Page Range Conventions

Use `start:end` and comma-separated lists for multi-range inputs.

Examples:
- `0:2` -> first three pages
- `-3:-1` -> last three pages
- `0:2,3:5` -> two segments
