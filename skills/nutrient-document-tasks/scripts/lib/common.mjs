#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

export function parseArgs(argv = process.argv.slice(2)) {
  const args = { _: [] };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];

    if (!token.startsWith('--')) {
      args._.push(token);
      continue;
    }

    const keyValue = token.slice(2);
    const eqIndex = keyValue.indexOf('=');
    if (eqIndex >= 0) {
      const key = keyValue.slice(0, eqIndex);
      const value = keyValue.slice(eqIndex + 1);
      args[key] = value;
      continue;
    }

    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args[keyValue] = true;
      continue;
    }

    args[keyValue] = next;
    i += 1;
  }

  return args;
}

export function printUsage(usageText) {
  console.log(usageText.trim());
}

export function requireArg(args, key, usageText) {
  const value = args[key];
  if (value === undefined || value === null || value === '') {
    throw usageError(`Missing required --${key} argument.`, usageText);
  }
  return String(value);
}

export function optionalArg(args, key, defaultValue) {
  const value = args[key];
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }
  return String(value);
}

export function parseCsv(value) {
  if (!value) {
    return [];
  }

  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parseIntegerCsv(value, key) {
  return parseCsv(value).map((item) => {
    const parsed = Number.parseInt(item, 10);
    if (Number.isNaN(parsed)) {
      throw new Error(`Invalid integer value in --${key}: "${item}"`);
    }
    return parsed;
  });
}

export function parsePageRange(value, key = 'range') {
  if (!value) {
    return undefined;
  }

  const [rawStart, rawEnd] = String(value).split(':');
  const start = rawStart === undefined || rawStart === '' ? undefined : Number.parseInt(rawStart, 10);
  const end = rawEnd === undefined || rawEnd === '' ? undefined : Number.parseInt(rawEnd, 10);

  if (rawStart !== undefined && rawStart !== '' && Number.isNaN(start)) {
    throw new Error(`Invalid start in --${key}: "${rawStart}"`);
  }
  if (rawEnd !== undefined && rawEnd !== '' && Number.isNaN(end)) {
    throw new Error(`Invalid end in --${key}: "${rawEnd}"`);
  }

  if (start === undefined && end === undefined) {
    throw new Error(`Invalid --${key} value "${value}". Use start:end (for example 0:4 or -3:-1).`);
  }

  return { ...(start !== undefined ? { start } : {}), ...(end !== undefined ? { end } : {}) };
}

export function parsePageRangesCsv(value, key = 'ranges') {
  const items = parseCsv(value);
  if (items.length === 0) {
    throw new Error(`--${key} requires at least one range in start:end format.`);
  }

  return items.map((item) => parsePageRange(item, key));
}

export function toFileInput(value) {
  const input = String(value).trim();
  return input;
}

export function assertLocalFile(value, key) {
  const input = String(value).trim();
  if (input.startsWith('http://') || input.startsWith('https://')) {
    throw new Error(`--${key} must be a local file path for this operation.`);
  }
  return input;
}

export async function createClient() {
  const apiKey = process.env.NUTRIENT_API_KEY;

  if (!apiKey) {
    throw new Error('NUTRIENT_API_KEY is not set. Export it before running these scripts.');
  }

  let NutrientClient;
  try {
    ({ NutrientClient } = await import('@nutrient-sdk/dws-client-typescript'));
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(
      'Unable to import @nutrient-sdk/dws-client-typescript. Install latest with: ' +
        'npm install @nutrient-sdk/dws-client-typescript@latest\n' +
        `Original error: ${reason}`,
    );
  }

  return new NutrientClient({ apiKey });
}

export async function writeWorkflowOutput(result, outputPath) {
  if (!result || !result.buffer) {
    throw new Error('The operation did not return a binary output buffer.');
  }

  await ensureParentDir(outputPath);
  await fs.writeFile(outputPath, Buffer.from(result.buffer));
  console.log(`Wrote ${outputPath} (${result.mimeType ?? 'application/octet-stream'})`);
}

export async function writeJsonFile(outputPath, value) {
  await ensureParentDir(outputPath);
  await fs.writeFile(outputPath, JSON.stringify(value, null, 2), 'utf8');
  console.log(`Wrote ${outputPath}`);
}

export async function readJsonFile(filePath, key) {
  const raw = await fs.readFile(filePath, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid JSON in --${key} file (${filePath}): ${reason}`);
  }
}

export function parseJsonString(json, key) {
  try {
    return JSON.parse(json);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid JSON passed in --${key}: ${reason}`);
  }
}

export function usageError(message, usageText) {
  const error = new Error(`${message}\n\n${usageText.trim()}`);
  error.name = 'UsageError';
  return error;
}

export function isHelpRequested(args) {
  return args.help === true || args.h === true;
}

export function handleError(error) {
  const reason = error instanceof Error ? error.message : String(error);
  console.error(reason);
  process.exit(1);
}

async function ensureParentDir(filePath) {
  const absolute = path.resolve(filePath);
  const parent = path.dirname(absolute);
  await fs.mkdir(parent, { recursive: true });
}
