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
Add a text watermark to a document.

Usage:
  node scripts/watermark-text.mjs --input <path-or-url> --text <watermark-text> --out <output-pdf> [--opacity 0.3] [--font-size 48] [--rotation 45]
`;

const args = parseArgs();
if (isHelpRequested(args)) {
  console.log(USAGE.trim());
  process.exit(0);
}

try {
  const input = requireArg(args, 'input', USAGE);
  const text = requireArg(args, 'text', USAGE);
  const out = requireArg(args, 'out', USAGE);

  const options = {};
  if (args.opacity !== undefined) {
    options.opacity = Number.parseFloat(String(args.opacity));
  }
  if (args['font-size'] !== undefined) {
    options.fontSize = Number.parseInt(String(args['font-size']), 10);
  }
  if (args.rotation !== undefined) {
    options.rotation = Number.parseFloat(String(args.rotation));
  }

  const client = await createClient();
  const result = await client.watermarkText(toFileInput(input), text, options);
  await writeWorkflowOutput(result, out);
} catch (error) {
  handleError(error);
}
