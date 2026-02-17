#!/usr/bin/env node

import fs from 'node:fs/promises';

import {
  createClient,
  handleError,
  isHelpRequested,
  parseArgs,
  parsePageRange,
  requireArg,
  toFileInput,
  writeJsonFile,
} from './lib/common.mjs';

const USAGE = `
Extract text from a document as JSON, with optional plain-text export.

Usage:
  node scripts/extract-text.mjs --input <path-or-url> --out <output-json> [--pages start:end] [--plain-out <text-file>]
`;

const args = parseArgs();
if (isHelpRequested(args)) {
  console.log(USAGE.trim());
  process.exit(0);
}

try {
  const input = requireArg(args, 'input', USAGE);
  const out = requireArg(args, 'out', USAGE);
  const pageRange = args.pages ? parsePageRange(String(args.pages), 'pages') : undefined;
  const plainOut = args['plain-out'] ? String(args['plain-out']) : undefined;

  const client = await createClient();
  const result = await client.extractText(toFileInput(input), pageRange);

  await writeJsonFile(out, result);

  if (plainOut) {
    const text = (result.data.pages ?? [])
      .map((page) => page.plainText ?? '')
      .filter(Boolean)
      .join('\n\n');
    await fs.writeFile(plainOut, text, 'utf8');
    console.log(`Wrote ${plainOut}`);
  }
} catch (error) {
  handleError(error);
}
