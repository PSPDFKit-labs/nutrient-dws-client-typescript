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
Extract key-value pairs from forms or structured documents.

Usage:
  node scripts/extract-key-value-pairs.mjs --input <path-or-url> --out <output-json> [--pages start:end]
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
  const result = await client.extractKeyValuePairs(toFileInput(input), pageRange);
  await writeJsonFile(out, result);
} catch (error) {
  handleError(error);
}
