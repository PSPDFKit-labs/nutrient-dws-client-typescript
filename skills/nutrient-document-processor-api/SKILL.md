---
name: nutrient-document-processor-api
description: Execute common document-processing tasks with @nutrient-sdk/dws-client-typescript in Node.js scripts. Use when the user asks to convert, merge, split, OCR, extract text/tables/key-value pairs, watermark, redact, sign, optimize, protect, or reorder Document content, or when they need a custom multi-step document pipeline script built from Nutrient DWS workflow actions.
---

# Nutrient Document Processor API

## Quick Start

1. Ensure Node.js 18+ is available.
2. Install the latest client package in the target project:
  - `node skills/nutrient-document-processor-api/scripts/setup-latest-client.mjs npm`
3. Export the API key before running scripts:
   - `export NUTRIENT_API_KEY="nutr_sk_..."`
4. Run task scripts with `node` from the repository root.

## Task Scripts

Use one script per operation.

- Convert formats: `scripts/convert.mjs`
- Merge files: `scripts/merge.mjs`
- Split by ranges: `scripts/split.mjs`
- OCR documents: `scripts/ocr.mjs`
- Extract text: `scripts/extract-text.mjs`
- Extract tables: `scripts/extract-table.mjs`
- Extract key-value pairs: `scripts/extract-key-value-pairs.mjs`
- Add text watermark: `scripts/watermark-text.mjs`
- AI redaction: `scripts/redact-ai.mjs`
- Rotate pages: `scripts/rotate.mjs`
- Sign PDF: `scripts/sign.mjs`
- Optimize PDF: `scripts/optimize.mjs`
- Password protect PDF: `scripts/password-protect.mjs`
- Add blank pages: `scripts/add-pages.mjs`
- Delete pages: `scripts/delete-pages.mjs`
- Duplicate/reorder pages: `scripts/duplicate-pages.mjs`

Check exact arguments with `node <script> --help`.

## Custom Pipelines

When the user asks for a workflow not covered by the scripts above, create a new script rather than forcing ad hoc one-off commands.

1. Start from `assets/templates/custom-workflow-template.mjs`.
2. Save the new script in `scripts/` with a task-specific name (for example `scripts/redact-and-watermark.mjs`).
3. Keep API usage on `@nutrient-sdk/dws-client-typescript@latest`.
4. Prefer direct methods (`client.convert`, `client.merge`, etc.) for single-step tasks.
5. Use `client.workflow()` and `BuildActions` for multi-step tasks.
6. Keep every custom script CLI-driven (`--input`, `--out`, explicit options), deterministic, and runnable end-to-end.
7. Run the script with sample input to verify behavior before finalizing.

## Implementation Rules

- Fail fast when required arguments are missing.
- Require local input for operations that do not support URL input (`sign`).
- Write outputs to explicit paths and print created files.
- Do not log secrets.
- If the package import fails, install latest with `npm install @nutrient-sdk/dws-client-typescript@latest`.

## References

- Script matrix and method mapping: `references/script-catalog.md`
- Custom pipeline patterns: `references/custom-pipeline-guidelines.md`
