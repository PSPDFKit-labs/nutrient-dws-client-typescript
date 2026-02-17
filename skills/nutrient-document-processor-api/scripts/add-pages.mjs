#!/usr/bin/env node

import {
  createClient,
  handleError,
  isHelpRequested,
  parseArgs,
  requireArg,
  toFileInput,
  writeWorkflowOutput,
} from './lib/common.mjs';

const USAGE = `
Add blank pages to a PDF.

Usage:
  node scripts/add-pages.mjs --input <path-or-url> --count <n> --out <output-pdf> [--index <insert-index>]
`;

const args = parseArgs();
if (isHelpRequested(args)) {
  console.log(USAGE.trim());
  process.exit(0);
}

try {
  const input = requireArg(args, 'input', USAGE);
  const count = Number.parseInt(requireArg(args, 'count', USAGE), 10);
  if (!Number.isInteger(count) || count <= 0) {
    throw new Error('--count must be a positive integer.');
  }

  const out = requireArg(args, 'out', USAGE);
  const index = args.index !== undefined ? Number.parseInt(String(args.index), 10) : undefined;

  const client = await createClient();
  const result = await client.addPage(toFileInput(input), count, index);
  await writeWorkflowOutput(result, out);
} catch (error) {
  handleError(error);
}
