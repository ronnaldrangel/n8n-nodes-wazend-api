import fs from 'node:fs';
import assert from 'node:assert/strict';
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const lock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
assert.equal(pkg.name, 'n8n-nodes-wazend-api');
assert.equal(lock.name, pkg.name);
assert.equal(lock.packages[''].name, pkg.name);
assert.equal(lock.version, pkg.version);
assert.equal(lock.packages[''].version, pkg.version);
for (const entry of [...pkg.n8n.nodes, ...pkg.n8n.credentials]) {
  assert(!/waha/i.test(entry), entry);
  assert(fs.existsSync(entry.replace(/^dist\//, '').replace(/\.js$/, '.ts')), entry);
}
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = `${dir}/${entry.name}`;
    assert(!/waha/i.test(entry.name), file);
    if (entry.isDirectory()) walk(file);
    else if (/\.(ts|json|svg)$/.test(entry.name)) {
      const text = fs.readFileSync(file, 'utf8');
      assert(!/\bWAHA\b|waha\.devlike\.pro|github\.com\/devlikeapro\/waha|dev\.likeapro|patreon\.com|boosty\.to/i.test(text), `Old branding in ${file}`);
    }
  }
}
walk('nodes');
walk('credentials');
assert(!/\bWAHA\b/i.test(fs.readFileSync('README.md', 'utf8')));
console.log('Wazend branding, node paths and package metadata validated.');
