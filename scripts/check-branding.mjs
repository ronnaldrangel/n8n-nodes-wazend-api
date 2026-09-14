import fs from 'node:fs';
import assert from 'node:assert/strict';
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const lock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
assert.equal(pkg.name, 'n8n-nodes-wazend-api');
assert.equal(lock.name, pkg.name);
assert.equal(lock.packages[''].name, pkg.name);
assert.equal(lock.version, pkg.version);
assert.equal(lock.packages[''].version, pkg.version);
// n8n verification invariants. Reviewed community nodes must ship without
// runtime dependencies, keep n8n-workflow as a peer dependency and follow the
// community node file and metadata conventions. These asserts fail the build as
// soon as a sync, a manual edit or a version bump breaks them.
assert.equal(pkg.dependencies, undefined, 'community nodes must not declare runtime dependencies');
assert.equal(pkg.peerDependencies?.['n8n-workflow'], '*', 'n8n-workflow must be a peer dependency');
assert.ok(pkg.scripts.lint.includes('lint-community'), 'lint must run the n8n community rules');
assert.ok(pkg.scripts['lint:dist']?.includes('--dist'), 'the published bundle must be linted too');
assert.ok(fs.existsSync('nodes/Wazend/base/Wazend.node.ts'), 'base node description file is missing');
assert.ok(fs.existsSync('nodes/Wazend/base/WazendTrigger.node.ts'), 'base trigger description file is missing');
assert.ok(!fs.existsSync('nodes/Wazend/base/node.ts'), 'legacy base node filename is still present');
assert.ok(!fs.existsSync('nodes/Wazend/base/trigger.ts'), 'legacy base trigger filename is still present');
const baseNode = fs.readFileSync('nodes/Wazend/base/Wazend.node.ts', 'utf8');
assert.match(baseNode, /name: 'wazend',/, 'node name must be camel case');
assert.match(baseNode, /inputs: \['main'\]/, 'inputs must use the "main" connection type');
assert.match(baseNode, /outputs: \['main'\]/, 'outputs must use the "main" connection type');
const credential = fs.readFileSync('credentials/WazendApi.credentials.ts', 'utf8');
assert.match(credential, /documentationUrl = '/, 'credential must declare documentationUrl');
assert.match(credential, /icon = 'file:wazend\.svg'/, 'credential must declare an icon');
for (const version of ['v202409', 'v202502']) {
  for (const name of [`Wazend${version}.ts`, `WazendTriggerV${version.slice(1)}.ts`]) {
    const source = fs.readFileSync(`nodes/Wazend/${version}/${name}`, 'utf8');
    assert.match(source, /usableAsTool: true,/, `${name} must declare usableAsTool`);
  }
}
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
