/** Régression du correctif Prisma/config ; aucun accès à une base. */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { loadConfigFromFile } from '@prisma/config';

const require = createRequire(import.meta.url);
const configEntry = require.resolve('@prisma/config');
const fromConfig = createRequire(configEntry);
const deepmergeEntry = fromConfig.resolve('deepmerge-ts');
const { deepmerge } = await import(pathToFileURL(deepmergeEntry).href);

test('Prisma garde ses versions et utilise le correctif deepmerge ciblé', () => {
  assert.equal(require('prisma/package.json').version, '6.19.3');
  assert.equal(require('@prisma/client/package.json').version, '6.19.3');
  const installed = JSON.parse(readFileSync(path.resolve(path.dirname(deepmergeEntry), '..', 'package.json'), 'utf8'));
  assert.equal(installed.version, '8.0.2', 'contrôler les fichiers installés, pas seulement le lock');
  const manifest = require('../package.json');
  assert.equal(manifest.overrides['@prisma/config']['deepmerge-ts'], '8.0.2');
  assert.deepEqual(
    deepmerge({ nested: { a: 1 }, list: ['a'] }, { nested: { b: 2 }, list: ['b'] }),
    { nested: { a: 1, b: 2 }, list: ['a', 'b'] },
  );
});

test('le graphe cyclique de l’avis ne provoque plus de débordement de pile', () => {
  const left = { value: 1 }, right = { value: 2 };
  left.self = left;
  right.self = right;
  try {
    const value = deepmerge(left, right);
    assert.equal(value.value, 2);
  } catch (error) {
    assert.ok(!(error instanceof RangeError));
    assert.match(String(error.message), /circular|cyclic|depth|recurs/i);
  }
});

test('Prisma charge une configuration réelle avec le merger corrigé', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'prisma-config-security-'));
  try {
    await writeFile(path.join(root, 'prisma.config.mjs'),
      `import { defineConfig } from ${JSON.stringify(pathToFileURL(configEntry).href)};\n` +
      'export default defineConfig({schema:"schema.prisma",migrations:{path:"prisma/migrations"},datasource:{url:"mongodb://127.0.0.1:1/prisma_test_config"}});\n');
    const result = await loadConfigFromFile({ configRoot: root });
    assert.equal(result.error, undefined, 'chargement Prisma sans erreur');
    assert.equal(result.config.schema, path.join(root, 'schema.prisma'));
    assert.equal(result.config.migrations.path, path.join(root, 'prisma/migrations'));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
