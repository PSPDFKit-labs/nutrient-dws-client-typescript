#!/usr/bin/env node

import path from 'node:path';

import {
  createClient,
  handleError,
  isHelpRequested,
  optionalArg,
  parseArgs,
  parsePageRangesCsv,
  requireArg,
  toFileInput,
  writeWorkflowOutput,
} from './lib/common.mjs';

const USAGE = `
Split one PDF into multiple PDFs by page ranges.

Usage:
  node scripts/split.mjs --input <pdf-path-or-url> --ranges <start:end,start:end,...> --out-dir <directory> [--prefix split]

Examples:
  node scripts/split.mjs --input report.pdf --ranges 0:2,3:5,-2:-1 --out-dir out --prefix section
`;

const args = parseArgs();
if (isHelpRequested(args)) {
  console.log(USAGE.trim());
  process.exit(0);
}

try {
  const input = requireArg(args, 'input', USAGE);
  const rangesRaw = requireArg(args, 'ranges', USAGE);
  const outDir = requireArg(args, 'out-dir', USAGE);
  const prefix = optionalArg(args, 'prefix', 'split');

  const ranges = parsePageRangesCsv(rangesRaw);

  const client = await createClient();
  const results = await client.split(toFileInput(input), ranges);

  for (let i = 0; i < results.length; i += 1) {
    const outputPath = path.join(outDir, `${prefix}-${String(i + 1).padStart(2, '0')}.pdf`);
    await writeWorkflowOutput(results[i], outputPath);
  }
} catch (error) {
  handleError(error);
}
