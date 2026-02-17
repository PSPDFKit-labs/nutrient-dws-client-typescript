#!/usr/bin/env node

import {
  createClient,
  handleError,
  isHelpRequested,
  parseArgs,
  parseJsonString,
  readJsonFile,
  requireArg,
  toFileInput,
  writeWorkflowOutput,
} from './lib/common.mjs';

const USAGE = `
Optimize PDF size and quality.

Usage:
  node scripts/optimize.mjs --input <path-or-url> --out <output-pdf> [--options-json-file <path>] [--options-json <json>]

Examples:
  node scripts/optimize.mjs --input large.pdf --out optimized.pdf
  node scripts/optimize.mjs --input large.pdf --out optimized.pdf --options-json '{"mrcCompression":true,"imageOptimizationQuality":2}'
`;

const args = parseArgs();
if (isHelpRequested(args)) {
  console.log(USAGE.trim());
  process.exit(0);
}

try {
  const input = requireArg(args, 'input', USAGE);
  const out = requireArg(args, 'out', USAGE);

  let options;
  if (args['options-json-file']) {
    options = await readJsonFile(String(args['options-json-file']), 'options-json-file');
  }
  if (args['options-json']) {
    options = parseJsonString(String(args['options-json']), 'options-json');
  }

  const client = await createClient();
  const result = await client.optimize(toFileInput(input), options);
  await writeWorkflowOutput(result, out);
} catch (error) {
  handleError(error);
}
