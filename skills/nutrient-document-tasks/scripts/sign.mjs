#!/usr/bin/env node

import {
  assertLocalFile,
  createClient,
  handleError,
  isHelpRequested,
  parseArgs,
  parseJsonString,
  readJsonFile,
  requireArg,
  writeWorkflowOutput,
} from './lib/common.mjs';

const USAGE = `
Digitally sign a PDF.

Usage:
  node scripts/sign.mjs --input <local-pdf-path> --out <output-pdf> [--signature-json-file <path>] [--signature-json <json>] [--image <local-image-path>] [--graphic-image <local-image-path>]

Notes:
  - sign() only supports local file inputs for the main PDF.
  - If signature options are omitted, server defaults are used.
`;

const args = parseArgs();
if (isHelpRequested(args)) {
  console.log(USAGE.trim());
  process.exit(0);
}

try {
  const input = assertLocalFile(requireArg(args, 'input', USAGE), 'input');
  const out = requireArg(args, 'out', USAGE);

  let signatureData;
  if (args['signature-json-file']) {
    signatureData = await readJsonFile(String(args['signature-json-file']), 'signature-json-file');
  }
  if (args['signature-json']) {
    signatureData = parseJsonString(String(args['signature-json']), 'signature-json');
  }

  const options = {};
  if (args.image) {
    options.image = assertLocalFile(String(args.image), 'image');
  }
  if (args['graphic-image']) {
    options.graphicImage = assertLocalFile(String(args['graphic-image']), 'graphic-image');
  }

  const client = await createClient();
  const result = await client.sign(
    input,
    signatureData,
    Object.keys(options).length > 0 ? options : undefined,
  );

  await writeWorkflowOutput(result, out);
} catch (error) {
  handleError(error);
}
