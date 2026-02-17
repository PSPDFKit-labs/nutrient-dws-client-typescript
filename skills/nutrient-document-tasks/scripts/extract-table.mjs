#!/usr/bin/env node

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
Extract table data from a document.

Usage:
  node scripts/extract-table.mjs --input <path-or-url> --out <output-json> [--pages start:end]
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

  const client = await createClient();
  const result = await client.extractTable(toFileInput(input), pageRange);
  await writeJsonFile(out, result);
} catch (error) {
  handleError(error);
}
