import * as path from 'node:path';
import ts from 'typescript';

/**
 * `src/index.ts` is a hand-curated export list, not a barrel: `src/types/index.ts` does
 * `export *`, but a type absent from `src/index.ts` is unreachable by consumers even when it
 * is the declared type of a public method's parameter. That gap is invisible to `tsc` — the
 * library compiles fine against its own internals — and shipped once already, when
 * `FileInputWithUrl` (the first parameter of ~20 public methods) was never exported.
 *
 * This test walks the real type nodes of every public `NutrientClient` member and fails when
 * one names a locally-declared type that consumers cannot reach.
 */

const SRC_DIR = path.resolve(__dirname, '../..');
const INDEX_FILE = path.join(SRC_DIR, 'index.ts');
const CLIENT_FILE = path.join(SRC_DIR, 'client.ts');

interface Reference {
  typeName: string;
  memberName: string;
}

/**
 * Leftmost identifier of a type reference: for `components['schemas']['X']` that is
 * `components`, which is the name a consumer actually has to import.
 */
function rootIdentifier(node: ts.EntityName): string {
  return ts.isIdentifier(node) ? node.text : rootIdentifier(node.left);
}

describe('public export surface', () => {
  const program = ts.createProgram([INDEX_FILE, CLIENT_FILE], {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    strict: true,
    skipLibCheck: true,
    noEmit: true,
  });
  const checker = program.getTypeChecker();

  const exportedNames: Set<string> = ((): Set<string> => {
    const source = program.getSourceFile(INDEX_FILE);
    if (!source) throw new Error(`Could not load ${INDEX_FILE}`);
    const symbol = checker.getSymbolAtLocation(source);
    if (!symbol) throw new Error('src/index.ts has no module symbol');
    return new Set(checker.getExportsOfModule(symbol).map((s) => s.getName()));
  })();

  /**
   * Type names referenced by public members of `NutrientClient`, keeping only those whose
   * declaration lives in this repo's `src/` (excluding `src/generated/`, which consumers reach
   * through the exported `components` / `operations` namespaces rather than by name).
   */
  const references: Reference[] = ((): Reference[] => {
    const source = program.getSourceFile(CLIENT_FILE);
    if (!source) throw new Error(`Could not load ${CLIENT_FILE}`);

    const classDecl = source.statements.find(
      (s): s is ts.ClassDeclaration =>
        ts.isClassDeclaration(s) && s.name?.text === 'NutrientClient',
    );
    if (!classDecl) throw new Error('NutrientClient class not found in src/client.ts');

    const found: Reference[] = [];

    for (const member of classDecl.members) {
      if (!ts.isMethodDeclaration(member) && !ts.isPropertyDeclaration(member)) continue;

      const modifiers = ts.canHaveModifiers(member) ? ts.getModifiers(member) : undefined;
      const isNonPublic = modifiers?.some(
        (m) => m.kind === ts.SyntaxKind.PrivateKeyword || m.kind === ts.SyntaxKind.ProtectedKeyword,
      );
      if (isNonPublic) continue;

      const memberName =
        member.name && ts.isIdentifier(member.name) ? member.name.text : '<unknown>';
      const parameterTypes = ts.isMethodDeclaration(member)
        ? member.parameters.map((p) => p.type).filter((t): t is ts.TypeNode => t !== undefined)
        : [];
      const typeNodes: ts.TypeNode[] = [...parameterTypes, ...(member.type ? [member.type] : [])];

      const visit = (node: ts.Node): void => {
        if (ts.isTypeReferenceNode(node)) {
          const name = rootIdentifier(node.typeName);
          const symbol = checker.getSymbolAtLocation(
            ts.isIdentifier(node.typeName) ? node.typeName : node.typeName.left,
          );
          const declarations = symbol?.getDeclarations() ?? [];
          // A method's own generic parameters are declared locally but are never something a
          // consumer imports, so they are not part of the export surface.
          const isTypeParameter = declarations.some(ts.isTypeParameterDeclaration);
          const isLocal = declarations.some((d) => {
            const file = d.getSourceFile().fileName;
            return (
              file.startsWith(SRC_DIR) &&
              !file.includes('node_modules') &&
              !file.includes(`${path.sep}generated${path.sep}`)
            );
          });
          if (isLocal && !isTypeParameter) found.push({ typeName: name, memberName });
        }
        ts.forEachChild(node, visit);
      };

      typeNodes.forEach(visit);
    }

    return found;
  })();

  it('finds public members to check (guards against the walker silently matching nothing)', () => {
    expect(references.length).toBeGreaterThan(10);
  });

  it('exports every locally-declared type named in a public member signature', () => {
    const missing = references.filter((r) => !exportedNames.has(r.typeName));

    const detail = [...new Map(missing.map((m) => [m.typeName, m])).values()]
      .map((m) => `  ${m.typeName} — used by NutrientClient.${m.memberName}()`)
      .join('\n');

    expect(
      missing.length === 0
        ? ''
        : `These types appear in public method signatures but are not exported from src/index.ts,\n` +
            `so consumers cannot name them. Add them to the curated export list.\n${detail}`,
    ).toBe('');
  });

  it('exports the generated-spec namespaces consumers need to reach indexed types', () => {
    for (const ns of ['components', 'operations', 'extractComponents']) {
      expect(exportedNames.has(ns)).toBe(true);
    }
  });
});
