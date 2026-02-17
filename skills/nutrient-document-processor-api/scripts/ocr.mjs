#!/usr/bin/env node

import {
  createClient,
  handleError,
  isHelpRequested,
  parseArgs,
  parseCsv,
  requireArg,
  toFileInput,
  writeWorkflowOutput,
} from './lib/common.mjs';

const USAGE = `
Run OCR on a document.

Usage:
  node scripts/ocr.mjs --input <path-or-url> --languages <language[,language...]> --out <output-pdf>

Examples:
  node scripts/ocr.mjs --input scan.pdf --languages english --out scan-ocr.pdf
  node scripts/ocr.mjs --input scan.pdf --languages english,german --out scan-ocr.pdf
`;

const args = parseArgs();
if (isHelpRequested(args)) {
  console.log(USAGE.trim());
  process.exit(0);
}

try {
  const input = requireArg(args, 'input', USAGE);
  const languagesRaw = requireArg(args, 'languages', USAGE);
  const out = requireArg(args, 'out', USAGE);

  const languages = parseCsv(languagesRaw);
  const languageArg = languages.length === 1 ? languages[0] : languages;

  const client = await createClient();
  const result = await client.ocr(toFileInput(input), languageArg);
  await writeWorkflowOutput(result, out);
} catch (error) {
  handleError(error);
}
