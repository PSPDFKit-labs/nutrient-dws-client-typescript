/**
 * Live smoke test for the Data Extraction API (`POST /extraction/parse`).
 *
 * Invocation (from the `examples/` directory, after building the package):
 *
 *   # 1. Build + pack the parent package
 *   cd ..
 *   npm install && npm run build && npm pack
 *
 *   # 2. Install the packed tarball into examples/
 *   cd examples
 *   npm install
 *
 *   # 3. Run the smoke test
 *   NUTRIENT_API_KEY=pdf_live_... npx tsx src/parse_smoke.ts
 *
 * Optional environment:
 *   NUTRIENT_PARSE_INPUT         — Local file path or https:// URL to parse.
 *                                  Defaults to `assets/sample.pdf`.
 *   NUTRIENT_PARSE_MODE          — `text` | `structure` | `understand` | `agentic`. Defaults to `text`.
 *   NUTRIENT_PARSE_OUTPUT        — `markdown` | `spatial`. Server default depends on mode.
 *   NUTRIENT_PARSE_INCLUDE_WORDS — Truthy value enables word-level OCR data in spatial output.
 *   NUTRIENT_PARSE_BASE_URL      — Override base URL (e.g. staging).
 *
 * The script prints a short summary plus the first elements / first 800 chars of
 * markdown for inspection. It exits non-zero on failure. It is intentionally
 * read-only: it does not write files, push branches, or modify the worktree.
 *
 * Billing note: every call against `/extraction/parse` debits the account's
 * **extraction credits** bucket (separate from the **processor API credits**
 * used by `/build`, `/sign`, OCR, etc.). The cheapest mode (`text`) costs
 * 1 extraction credit per page, so this smoke test against a 1-page PDF
 * costs 1 extraction credit.
 */

import * as fs from 'fs';
import * as path from 'path';
import { NutrientClient } from '@nutrient-sdk/dws-client-typescript';
import type {
  ParseMode,
  ParseOptions,
  ParseOutputFormat,
} from '@nutrient-sdk/dws-client-typescript';

function envBool(name: string): boolean {
  const v = process.env[name];
  return v !== undefined && v !== '' && v !== '0' && v.toLowerCase() !== 'false';
}

function parseModeOrDie(value: string | undefined, fallback: ParseMode): ParseMode {
  const candidate = value ?? fallback;
  const allowed: ParseMode[] = ['text', 'structure', 'understand', 'agentic'];
  if (!allowed.includes(candidate as ParseMode)) {
    console.error(`Invalid NUTRIENT_PARSE_MODE='${candidate}'. Allowed: ${allowed.join(', ')}`);
    process.exit(2);
  }
  return candidate as ParseMode;
}

function parseOutputOrUndefined(value: string | undefined): ParseOutputFormat | undefined {
  if (value === undefined || value === '') return undefined;
  if (value === 'markdown' || value === 'spatial') return value;
  console.error(`Invalid NUTRIENT_PARSE_OUTPUT='${value}'. Allowed: markdown, spatial`);
  process.exit(2);
}

async function main(): Promise<void> {
  const apiKey = process.env['NUTRIENT_API_KEY'];
  if (!apiKey) {
    console.error('Error: NUTRIENT_API_KEY is not set. Export your DWS API key before running:');
    console.error('  export NUTRIENT_API_KEY=pdf_live_...');
    process.exit(1);
  }

  const inputArg =
    process.env['NUTRIENT_PARSE_INPUT'] ?? path.resolve(__dirname, '..', 'assets', 'sample.pdf');
  const isUrl = /^https?:\/\//i.test(inputArg);
  if (!isUrl && !fs.existsSync(inputArg)) {
    console.error(`Input file not found: ${inputArg}`);
    process.exit(1);
  }

  const mode = parseModeOrDie(process.env['NUTRIENT_PARSE_MODE'], 'text');
  const outputFormat = parseOutputOrUndefined(process.env['NUTRIENT_PARSE_OUTPUT']);
  const includeWords = envBool('NUTRIENT_PARSE_INCLUDE_WORDS');

  const client = new NutrientClient({
    apiKey,
    ...(process.env['NUTRIENT_PARSE_BASE_URL']
      ? { baseUrl: process.env['NUTRIENT_PARSE_BASE_URL'] }
      : {}),
  });

  const options: ParseOptions = { mode };
  if (outputFormat !== undefined) {
    options.output = { format: outputFormat };
    if (outputFormat === 'spatial') options.output.includeWords = includeWords;
  }

  console.log('--- /extraction/parse smoke test ---');
  console.log('Input:', inputArg);
  console.log('Mode:', mode);
  console.log('Output:', options.output ?? '<server default>');
  console.log('');

  const started = Date.now();
  const result = await client.parse(inputArg, options);
  const elapsed = Date.now() - started;

  console.log('--- response summary ---');
  console.log('Wall time:                    ', `${elapsed}ms`);
  console.log('Server processing time (ms):  ', result.metrics.processingTimeMs);
  console.log('Pages processed:              ', result.metrics.pagesProcessed);
  console.log('Configured mode:              ', result.configuration.mode);
  console.log('Configured output format:     ', result.configuration.outputFormat);
  console.log('Extraction credits used:      ', result.usage?.data_extraction_credits?.cost);
  console.log(
    'Extraction credits remaining: ',
    result.usage?.data_extraction_credits?.remainingCredits,
  );
  console.log('Request ID:                   ', result.requestId);
  console.log('');

  if (result.output.markdown !== undefined) {
    const md = result.output.markdown;
    console.log('--- markdown (first 800 chars) ---');
    console.log(md.length > 800 ? md.slice(0, 800) + '\n…[truncated]' : md);
  } else {
    const elements = result.output.elements;
    console.log(`--- spatial elements (${elements.length} total) ---`);
    for (const el of elements.slice(0, 5)) {
      const summary: Record<string, unknown> = {
        type: el.type,
        id: el.id,
        page: el.page.pageIndex,
        confidence: el.confidence,
      };
      if (el.type === 'paragraph' || el.type === 'handwriting') {
        summary['textPreview'] = el.text.slice(0, 80);
      } else if (el.type === 'table') {
        summary['rowsXcols'] = `${el.rowCount}x${el.columnCount}`;
      } else if (el.type === 'formula') {
        summary['latex'] = el.latex;
      } else if (el.type === 'picture') {
        summary['classification'] = el.classification;
      } else if (el.type === 'keyValueRegion') {
        summary['pairs'] = el.pairs.length;
      }
      console.log(summary);
    }
    if (elements.length > 5) console.log(`… ${elements.length - 5} more elements`);
  }
}

main().catch((err: unknown) => {
  const e = err as { message?: string; statusCode?: number; details?: unknown; code?: string };
  console.error('--- /extraction/parse smoke test FAILED ---');
  console.error('Message:    ', e.message ?? String(err));
  if (e.code !== undefined) console.error('Error code: ', e.code);
  if (e.statusCode !== undefined) console.error('HTTP status:', e.statusCode);
  if (e.details !== undefined) console.error('Details:    ', e.details);
  process.exit(1);
});
