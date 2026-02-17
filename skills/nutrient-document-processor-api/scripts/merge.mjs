#!/usr/bin/env node

import {
  createClient,
  handleError,
  isHelpRequested,
  parseArgs,
  parseCsv,
  requireArg,
  toFileInput,
  usageError,
  writeWorkflowOutput,
} from './lib/common.mjs';

const USAGE = `
Merge multiple documents into one PDF.

Usage:
  node scripts/merge.mjs --inputs <file1,file2,...> --out <output-pdf>
`;

const args = parseArgs();
if (isHelpRequested(args)) {
  console.log(USAGE.trim());
  process.exit(0);
}

try {
  const inputsRaw = requireArg(args, 'inputs', USAGE);
  const out = requireArg(args, 'out', USAGE);

  const inputs = parseCsv(inputsRaw).map(toFileInput);
  if (inputs.length < 2) {
    throw usageError('--inputs must contain at least 2 files.', USAGE);
  }

  const client = await createClient();
  const result = await client.merge(inputs);
  await writeWorkflowOutput(result, out);
} catch (error) {
  handleError(error);
}
