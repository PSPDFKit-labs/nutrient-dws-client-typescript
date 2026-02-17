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
Protect a PDF with user/owner passwords.

Usage:
  node scripts/password-protect.mjs --input <path-or-url> --user-password <password> --owner-password <password> --out <output-pdf> [--permissions permission1,permission2]
`;

const args = parseArgs();
if (isHelpRequested(args)) {
  console.log(USAGE.trim());
  process.exit(0);
}

try {
  const input = requireArg(args, 'input', USAGE);
  const userPassword = requireArg(args, 'user-password', USAGE);
  const ownerPassword = requireArg(args, 'owner-password', USAGE);
  const out = requireArg(args, 'out', USAGE);

  const permissions = args.permissions ? parseCsv(String(args.permissions)) : undefined;

  const client = await createClient();
  const result = await client.passwordProtect(
    toFileInput(input),
    userPassword,
    ownerPassword,
    permissions,
  );
  await writeWorkflowOutput(result, out);
} catch (error) {
  handleError(error);
}
