import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  // Bundle declarations into dist/index.d.ts and dist/index.d.cts. Per-file
  // declarations keep extensionless relative imports, which TypeScript cannot
  // resolve under moduleResolution node16/nodenext.
  dts: {
    // tsup's declaration bundler sets `baseUrl`, which TypeScript 6 deprecates.
    // Scoped to the declaration build; the project tsconfig is unchanged.
    compilerOptions: { ignoreDeprecations: '6.0' },
  },
  clean: true,
  outDir: 'dist',
  outExtension({ format }) {
    return {
      js: `.${format === 'esm' ? 'js' : 'cjs'}`,
    };
  },
  target: 'es2020',
  platform: 'node',
  skipNodeModulesBundle: true,
  treeshake: true,
});
