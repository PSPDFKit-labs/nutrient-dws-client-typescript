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
Convert a document to another format.

Usage:
  node scripts/convert.mjs --input <path-or-url> --format <pdf|pdfa|pdfua|docx|xlsx|pptx|png|jpeg|jpg|webp|html|markdown> --out <output-file>
`;

const args = parseArgs();
if (isHelpRequested(args)) {
  console.log(USAGE.trim());
  process.exit(0);
}

try {
  const input = requireArg(args, 'input', USAGE);
  const format = requireArg(args, 'format', USAGE);
  const out = requireArg(args, 'out', USAGE);

  const client = await createClient();
  const result = await client.convert(toFileInput(input), format);
  await writeWorkflowOutput(result, out);
} catch (error) {
  handleError(error);
}
