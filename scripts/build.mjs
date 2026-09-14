// Build step for the published package.
//
// n8n Cloud rejects community nodes that install runtime dependencies, so the
// node and credential entry points are bundled into self-contained files in
// `dist/`. Only `n8n-workflow` (and `n8n-core` for type compatibility) stay
// external, because the n8n runtime always provides them.
import { cpSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';

const root = process.cwd();
rmSync('dist', { recursive: true, force: true });

await build({
	entryPoints: {
		'nodes/Wazend/Wazend.node': path.resolve(root, 'nodes/Wazend/Wazend.node.ts'),
		'nodes/Wazend/WazendTrigger.node': path.resolve(root, 'nodes/Wazend/WazendTrigger.node.ts'),
		'credentials/WazendApi.credentials': path.resolve(root, 'credentials/WazendApi.credentials.ts'),
	},
	outdir: 'dist',
	absWorkingDir: root,
	bundle: true,
	platform: 'node',
	target: 'node18',
	format: 'cjs',
	sourcemap: false,
	// `n8n-workflow` and `lodash` are provided by the n8n runtime and are
	// explicitly allowed for community nodes. Bundling lodash would pull in
	// code that the n8n Cloud scanner rejects (Function constructor, process
	// globals), so it stays external on purpose.
	external: ['n8n-workflow', 'n8n-core', 'lodash'],
	// The OpenAPI builder bundles `pino` for its optional logger. n8n Cloud
	// rejects that code, so it is replaced with a no-op logger at build time.
	alias: {
		pino: path.resolve(root, 'scripts/stubs/pino.cjs'),
	},
	logLevel: 'info',
});

mkdirSync('dist/nodes/Wazend', { recursive: true });
mkdirSync('dist/credentials', { recursive: true });
cpSync('nodes/Wazend/wazend.svg', 'dist/nodes/Wazend/wazend.svg');
cpSync('nodes/Wazend/wazend.svg', 'dist/credentials/wazend.svg');
cpSync('nodes/Wazend/Wazend.node.json', 'dist/nodes/Wazend/Wazend.node.json');
cpSync('nodes/Wazend/WazendTrigger.node.json', 'dist/nodes/Wazend/WazendTrigger.node.json');
