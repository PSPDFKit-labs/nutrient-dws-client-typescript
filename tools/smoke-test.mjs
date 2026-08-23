/**
 * Packs the tarball, installs it into a scratch directory, and imports it the
 * way a consumer would.
 *
 * The test suite imports from `src/`, so nothing else in this repository
 * exercises the published shape of the package: the `exports` map, the `files`
 * whitelist, and the `bin` entries are all invisible to it.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const NPM = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const root = fileURLToPath(new URL('..', import.meta.url));
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const { name, version } = pkg;

if (!existsSync(join(root, 'dist', 'index.js'))) {
  throw new Error('dist/index.js is missing. Run `npm run build` before `npm run test:smoke`.');
}

const stage = mkdtempSync(join(tmpdir(), 'smoke-pack-'));
const work = mkdtempSync(join(tmpdir(), 'smoke-work-'));

const check = (label, argv, cwd) => {
  execFileSync('node', argv, { cwd, stdio: 'inherit', env: { ...process.env, EXPECTED: version } });
  console.log(`${label.padEnd(6)} ok`);
};

try {
  const packed = JSON.parse(
    execFileSync(NPM, ['pack', '--json', '--pack-destination', stage], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'inherit'],
    }),
  );
  // npm <11 emits an array of pack results; npm >=12 emits an object keyed by
  // package name. Support both.
  const packResult = Array.isArray(packed) ? packed[0] : packed[name];
  const tarball = join(stage, packResult.filename);

  execFileSync(NPM, ['init', '-y'], { cwd: work, stdio: 'ignore' });
  execFileSync(NPM, ['install', '--no-audit', '--no-fund', tarball], {
    cwd: work,
    stdio: 'inherit',
  });

  check(
    'CJS',
    [
      '-e',
      `const m = require(${JSON.stringify(name)});
     if (typeof m.NutrientClient !== 'function') throw new Error('CJS: NutrientClient is not exported');
     new m.NutrientClient({ apiKey: 'smoke-test-key' });
     if (m.getLibraryVersion() !== process.env.EXPECTED) {
       throw new Error('CJS: version is ' + m.getLibraryVersion() + ', expected ' + process.env.EXPECTED);
     }`,
    ],
    work,
  );

  check(
    'ESM',
    [
      '--input-type=module',
      '-e',
      `import { NutrientClient, getLibraryVersion } from ${JSON.stringify(name)};
     if (typeof NutrientClient !== 'function') throw new Error('ESM: NutrientClient is not exported');
     new NutrientClient({ apiKey: 'smoke-test-key' });
     if (getLibraryVersion() !== process.env.EXPECTED) {
       throw new Error('ESM: version is ' + getLibraryVersion() + ', expected ' + process.env.EXPECTED);
     }`,
    ],
    work,
  );

  const installed = join(work, 'node_modules', ...name.split('/'));
  const types = join(installed, 'dist', 'index.d.ts');
  if (!existsSync(types)) {
    throw new Error(`types entry is missing from the tarball: ${types}`);
  }
  console.log('types  ok');

  for (const command of Object.keys(pkg.bin ?? {})) {
    if (!existsSync(join(work, 'node_modules', '.bin', command))) {
      throw new Error(`bin ${command} is declared in package.json but missing from the tarball`);
    }
    console.log(`bin    ok  ${command}`);
  }

  console.log(`\n${name}@${version} passed the smoke test.`);
} finally {
  rmSync(stage, { recursive: true, force: true });
  rmSync(work, { recursive: true, force: true });
}
