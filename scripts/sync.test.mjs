import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

const source = path.resolve(process.argv[2] || '.upstream');
const revision = JSON.parse(fs.readFileSync('upstream.json', 'utf8'));

test('regeneration is reproducible and preserves automation and license', () => {
  assert(fs.existsSync(path.join(source, '.git')), 'Pass an upstream checkout path');
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'wazend-sync-'));
  try {
    fs.cpSync('scripts', path.join(temp, 'scripts'), { recursive: true });
    fs.cpSync('branding', path.join(temp, 'branding'), { recursive: true });
    fs.copyFileSync('package.json', path.join(temp, 'package.json'));
    fs.mkdirSync(path.join(temp, '.github/workflows'), { recursive: true });
    const workflow = path.join(temp, '.github/workflows/sentinel.yml');
    fs.writeFileSync(workflow, 'keep downstream automation');
    const run = () => execFileSync(process.execPath, [path.join(temp, 'scripts/sync-upstream.mjs'), source], { stdio: 'pipe' });
    run();
    const first = fs.readFileSync(path.join(temp, 'upstream.json'), 'utf8');
    const generated = JSON.parse(first);
    assert.equal(generated.commit, revision.commit);
    for (const file of generated.files) {
      assert.deepEqual(fs.readFileSync(path.join(temp, file)), fs.readFileSync(file), file);
    }
    run();
    assert.equal(fs.readFileSync(path.join(temp, 'upstream.json'), 'utf8'), first);
    assert.equal(fs.readFileSync(workflow, 'utf8'), 'keep downstream automation');
    assert.deepEqual(fs.readFileSync(path.join(temp, 'LICENSE.md')), fs.readFileSync(path.join(source, 'LICENSE.md')));
    for (const file of generated.files.filter((name) => name.endsWith('/openapi.json'))) {
      const original = JSON.parse(fs.readFileSync(path.join(source, file.replace('nodes/Wazend/', 'nodes/WAHA/')), 'utf8'));
      const branded = JSON.parse(fs.readFileSync(path.join(temp, file), 'utf8'));
      assert.deepEqual(Object.keys(branded.paths), Object.keys(original.paths), 'HTTP paths must not change');
      for (const endpoint of Object.keys(original.paths)) {
        assert.deepEqual(Object.keys(branded.paths[endpoint]), Object.keys(original.paths[endpoint]));
        for (const method of Object.keys(original.paths[endpoint])) {
          assert.equal(branded.paths[endpoint][method].operationId, original.paths[endpoint][method].operationId);
        }
      }
    }
    // Reject traversal in a stale manifest before touching any generated file.
    fs.writeFileSync(path.join(temp, 'upstream.json'), JSON.stringify({ files: ['../escape.txt'] }));
    assert.throws(run);
    assert.equal(fs.readFileSync(workflow, 'utf8'), 'keep downstream automation');
  } finally {
    assert(path.dirname(temp) === os.tmpdir() && path.basename(temp).startsWith('wazend-sync-'));
    fs.rmSync(temp, { recursive: true, force: true });
  }
});
