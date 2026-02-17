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

import { BuildActions } from '@nutrient-sdk/dws-client-typescript';

const USAGE = `
Template for multi-step custom workflows.

Usage:
  node <script>.mjs --input <path-or-url> --out <output-pdf>
`;

const args = parseArgs();
if (isHelpRequested(args)) {
  console.log(USAGE.trim());
  process.exit(0);
}

try {
  const input = requireArg(args, 'input', USAGE);
  const out = requireArg(args, 'out', USAGE);

  const client = await createClient();

  // Customize this action list for the requested pipeline.
  const actions = [
    BuildActions.ocr('english'),
    BuildActions.watermarkText('DRAFT', { opacity: 0.25, rotation: 45 }),
  ];

  const result = await client
    .workflow()
    .addFilePart(toFileInput(input), undefined, actions)
    .outputPdf()
    .execute();

  await writeWorkflowOutput(result, out);
} catch (error) {
  handleError(error);
}
