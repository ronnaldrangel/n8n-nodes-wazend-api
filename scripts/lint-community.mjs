// Local replica of the checks that n8n runs through
// `npx @n8n/scan-community-package <package>`.
//
// It builds the same flat ESLint config (community node rules plus the
// `eslint-plugin-n8n-nodes-base` rulesets) and lints two things:
//   * the source checkout (default), mimicking the provenance source leg;
//   * the built tarball contents (`--dist`), mimicking the published leg.
//
// Usage: node scripts/lint-community.mjs [--dist]
import { ESLint } from 'eslint';
import { defineConfig } from 'eslint/config';
import glob from 'fast-glob';

const tsParserModule = await import('@typescript-eslint/parser');
const tsParser = tsParserModule.default ?? tsParserModule;
const { n8nCommunityNodesPlugin } = await import('@n8n/eslint-plugin-community-nodes');
const n8nNodesPluginModule = await import('eslint-plugin-n8n-nodes-base');
const n8nNodesPlugin = n8nNodesPluginModule.default ?? n8nNodesPluginModule;

const scanConfig = defineConfig(
	n8nCommunityNodesPlugin.configs.recommended,
	{ rules: { 'no-console': 'error' } },
	{ plugins: { 'n8n-nodes-base': n8nNodesPlugin } },
	{ files: ['package.json'], rules: { ...n8nNodesPlugin.configs.community.rules } },
	{
		files: ['**/credentials/**/*.ts'],
		rules: {
			...n8nNodesPlugin.configs.credentials.rules,
			'n8n-nodes-base/cred-class-field-documentation-url-miscased': 'off',
			'n8n-nodes-base/cred-class-field-type-options-password-missing': 'off',
		},
	},
	{
		files: ['**/nodes/**/*.ts'],
		rules: {
			...n8nNodesPlugin.configs.nodes.rules,
			'n8n-nodes-base/node-class-description-inputs-wrong-regular-node': 'off',
			'n8n-nodes-base/node-class-description-outputs-wrong': 'off',
			'n8n-nodes-base/node-param-type-options-max-value-present': 'off',
		},
	},
	{ files: ['**/*.json'], languageOptions: { parser: tsParser } },
	{ files: ['**/*.ts'], languageOptions: { parser: tsParser } },
);

const distMode = process.argv.includes('--dist');
const cwd = process.cwd();
const files = await glob(distMode ? ['dist/**/*.js', 'package.json'] : ['**/*.js', '**/*.ts', '**/*.json'], {
	cwd,
	absolute: true,
	ignore: [
		'node_modules/**',
		'**/package-lock.json',
		'.upstream/**',
		...(distMode ? [] : ['dist/**']),
	],
});

const eslint = new ESLint({
	cwd,
	allowInlineConfig: false,
	overrideConfigFile: true,
	overrideConfig: scanConfig,
	errorOnUnmatchedPattern: false,
});

const results = await eslint.lintFiles(files);
const formatter = await eslint.loadFormatter('stylish');
const output = await formatter.format(results);
if (output.trim()) {
	process.stdout.write(`${output}\n`);
}

const errors = results.reduce((total, result) => total + result.errorCount, 0);
const label = distMode ? 'published tarball' : 'source checkout';
if (errors > 0) {
	console.error(`\nn8n community node rules: ${errors} error(s) in the ${label}.`);
	process.exit(1);
}
console.log(`n8n community node rules: clean in the ${label} (${files.length} files).`);
