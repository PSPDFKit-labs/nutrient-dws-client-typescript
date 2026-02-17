#!/usr/bin/env node

import {
  createClient,
  handleError,
  isHelpRequested,
  parseArgs,
  parseIntegerCsv,
  requireArg,
  toFileInput,
  usageError,
  writeWorkflowOutput,
} from './lib/common.mjs';

const USAGE = `
Create a new PDF from specific page indices (supports duplicates/reordering).

Usage:
  node scripts/duplicate-pages.mjs --input <path-or-url> --pages <index,index,...> --out <output-pdf>

Examples:
  node scripts/duplicate-pages.mjs --input doc.pdf --pages 2,0,1,1 --out reordered.pdf
`;

const args = parseArgs();
if (isHelpRequested(args)) {
  console.log(USAGE.trim());
  process.exit(0);
}

try {
  const input = requireArg(args, 'input', USAGE);
  const pagesRaw = requireArg(args, 'pages', USAGE);
  const out = requireArg(args, 'out', USAGE);

  const pageIndices = parseIntegerCsv(pagesRaw, 'pages');
  if (pageIndices.length === 0) {
    throw usageError('--pages must include at least one index.', USAGE);
  }

  const client = await createClient();
  const result = await client.duplicatePages(toFileInput(input), pageIndices);
  await writeWorkflowOutput(result, out);
} catch (error) {
  handleError(error);
}
