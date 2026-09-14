// Loads the published bundle the way n8n does.
//
// n8n requires every entry listed in `package.json#n8n` and instantiates the
// exported class, so a bundle that merely "lints" can still be broken at load
// time (for example, a module-level binding read before it is initialized).
// This smoke test runs after `npm run build` and fails the release before the
// package reaches npm.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));

const entries = [
	...pkg.n8n.credentials.map((file) => ({ file, kind: 'credential' })),
	...pkg.n8n.nodes.map((file) => ({ file, kind: 'node' })),
];

for (const { file, kind } of entries) {
	const absolute = path.resolve(root, file);
	assert.ok(existsSync(absolute), `${file} is missing; run npm run build first`);

	let module;
	try {
		module = require(absolute);
	} catch (error) {
		assert.fail(`${file} could not be loaded: ${error.message}`);
	}

	const exported = Object.keys(module).filter((name) => name !== '__esModule');
	assert.equal(exported.length, 1, `${file} must export exactly one class, got: ${exported.join(', ')}`);

	const Class = module[exported[0]];
	let instance;
	try {
		instance = new Class();
	} catch (error) {
		assert.fail(`${file} could not be instantiated: ${error.message}`);
	}

	const description = kind === 'node' ? instance.description : instance;
	assert.ok(description?.name, `${file} does not expose a name`);
	assert.equal(instance.constructor.name, exported[0], `${file} class name mismatch`);

	if (kind === 'node') {
		const versions = Object.keys(instance.nodeVersions ?? {});
		assert.ok(versions.length > 0, `${file} exposes no node versions`);
		for (const [version, node] of Object.entries(instance.nodeVersions)) {
			assert.ok(node.description?.properties?.length, `${file} version ${version} has no properties`);
		}
	}

	console.log(`${file} -> ${exported[0]} (${description.name})`);
}

console.log(`n8n can load and instantiate all ${entries.length} package entries.`);
