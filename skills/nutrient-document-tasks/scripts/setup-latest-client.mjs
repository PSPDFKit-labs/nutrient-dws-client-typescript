#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const packageManager = args[0] || 'npm';

const commandMap = {
  npm: ['install', '@nutrient-sdk/dws-client-typescript@latest'],
  pnpm: ['add', '@nutrient-sdk/dws-client-typescript@latest'],
  yarn: ['add', '@nutrient-sdk/dws-client-typescript@latest'],
};

const commandArgs = commandMap[packageManager];
if (!commandArgs) {
  console.error('Unsupported package manager. Use one of: npm, pnpm, yarn');
  process.exit(1);
}

console.log(`Installing @nutrient-sdk/dws-client-typescript@latest with ${packageManager}...`);
const result = spawnSync(packageManager, commandArgs, { stdio: 'inherit' });

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log('Installation complete.');
