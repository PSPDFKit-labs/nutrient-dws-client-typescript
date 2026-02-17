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
Create AI redactions and optionally apply them.

Usage:
  node scripts/redact-ai.mjs --input <path-or-url> --criteria <prompt> --out <output-pdf> [--mode stage|apply] [--pages start:end]

Examples:
  node scripts/redact-ai.mjs --input policy.pdf --criteria "Remove all emails" --mode apply --out redacted.pdf
`;

const args = parseArgs();
if (isHelpRequested(args)) {
  console.log(USAGE.trim());
  process.exit(0);
}

try {
  const input = requireArg(args, 'input', USAGE);
  const criteria = requireArg(args, 'criteria', USAGE);
  const out = requireArg(args, 'out', USAGE);

  const mode = args.mode ? String(args.mode) : 'stage';
  if (mode !== 'stage' && mode !== 'apply') {
    throw new Error('--mode must be either "stage" or "apply".');
  }

  const pageRange = args.pages ? parsePageRange(String(args.pages), 'pages') : undefined;

  const client = await createClient();
  const result = await client.createRedactionsAI(toFileInput(input), criteria, mode, pageRange);
  await writeWorkflowOutput(result, out);
} catch (error) {
  handleError(error);
}
