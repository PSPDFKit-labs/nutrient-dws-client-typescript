#!/usr/bin/env node

import {
  createClient,
  handleError,
  isHelpRequested,
  parseArgs,
  parsePageRange,
  requireArg,
  toFileInput,
  writeWorkflowOutput,
} from './lib/common.mjs';

const USAGE = `
Rotate pages in a PDF.

Usage:
  node scripts/rotate.mjs --input <path-or-url> --angle <90|180|270> --out <output-pdf> [--pages start:end]
`;

const args = parseArgs();
if (isHelpRequested(args)) {
  console.log(USAGE.trim());
  process.exit(0);
}

try {
  const input = requireArg(args, 'input', USAGE);
  const angleRaw = requireArg(args, 'angle', USAGE);
  const out = requireArg(args, 'out', USAGE);

  const angle = Number.parseInt(angleRaw, 10);
  if (![90, 180, 270].includes(angle)) {
    throw new Error('--angle must be one of 90, 180, or 270.');
  }

  const pageRange = args.pages ? parsePageRange(String(args.pages), 'pages') : undefined;

  const client = await createClient();
  const result = await client.rotate(toFileInput(input), angle, pageRange);
  await writeWorkflowOutput(result, out);
} catch (error) {
  handleError(error);
}
