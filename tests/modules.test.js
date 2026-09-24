// The browser loads src/ as native ES modules. Node tests only import the
// pure-logic modules, so guard the rest: every relative import in src/ and
// every script in index.html must point at a file that exists.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';

const root = join(dirname(new URL(import.meta.url).pathname), '..');

test('every relative import in src/ resolves to a file', () => {
  const dir = join(root, 'src');
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.js'))) {
    const src = readFileSync(join(dir, f), 'utf8');
    for (const m of src.matchAll(/\bfrom\s+['"](\.[^'"]+)['"]/g)) {
      assert.ok(existsSync(join(dir, m[1])), `${f} imports missing ${m[1]}`);
    }
  }
});

test('index.html module entry point exists', () => {
  const html = readFileSync(join(root, 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script[^>]*src="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(scripts.length > 0);
  for (const s of scripts) assert.ok(existsSync(join(root, s)), `missing ${s}`);
});

test('no external runtime assets: nothing loaded over the network', () => {
  const html = readFileSync(join(root, 'index.html'), 'utf8');
  assert.doesNotMatch(html, /(src|href)="https?:/);
  for (const f of readdirSync(join(root, 'src'))) {
    const src = readFileSync(join(root, 'src', f), 'utf8');
    assert.doesNotMatch(src, /\bfrom\s+['"]https?:/, f);
    assert.doesNotMatch(src, /fetch\(|new Audio\(|new Image\(/, f);
  }
});
