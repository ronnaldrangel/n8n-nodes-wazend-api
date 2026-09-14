import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.resolve(process.argv[2] || '.upstream');
if (source === root) throw new Error('Upstream must be a separate checkout');
const config = JSON.parse(fs.readFileSync(path.join(root, 'branding/config.json'), 'utf8'));
const readRaw = (name) => fs.readFileSync(path.join(source, name), 'utf8');
// The repository enforces `eol=lf` through .gitattributes, so generated text is
// normalized instead of inheriting whatever the upstream checkout uses.
const read = (name) => readRaw(name).replace(/\r\n/g, '\n');
const upstreamPackage = JSON.parse(read('package.json'));
if (upstreamPackage.name !== '@devlikeapro/n8n-nodes-waha') throw new Error('Unexpected upstream package');
const sha = execFileSync('git', ['-c', `safe.directory=${source.replaceAll('\\', '/')}`, '-C', source, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
if (!/^[a-f0-9]{40}$/.test(sha)) throw new Error('Invalid upstream commit');

// Only these upstream files are imported. Upstream workflows and release scripts
// cannot replace this repository's automation or publish configuration.
const generated = new Map();
const rename = (value) => value.replaceAll('WAHA', 'Wazend').replaceAll('waha.svg', 'wazend.svg');
function brand(text) {
  return rename(text)
    .replaceAll('wahaApi', 'wazendApi')
    .replaceAll('wahaTrigger', 'wazendTrigger')
    .replaceAll('"example": "waha"', '"example": "wazend"')
    .replaceAll("path: 'waha'", "path: 'wazend'")
    .replace(/https?:\/\/github\.com\/devlikeapro\/waha\/raw\/core\/examples\/[^\s"'\\<>]+/g, (url) => {
      const extension = url.split('.').pop();
      return `https://example.com/media/sample.${extension}`;
    })
    .replace(/https?:\/\/(?:waha\.devlike\.pro|portal\.devlike\.pro)[^\s"'\\<>]*/g, config.documentationUrl)
    .replace(/https?:\/\/github\.com\/devlikeapro\/waha(?:-plus)?[^\s"'\\<>]*/g, config.documentationUrl)
    .replaceAll('n8n-nodes-waha', config.packageName);
}

// Verification conformance.
//
// n8n only verifies self-contained community nodes, so the imported sources are
// rewritten to match what the n8n node tooling generates and what
// `npx @n8n/scan-community-package` enforces:
//   * node descriptions live in `<Name>.node.ts` files with camelCase `name`;
//   * every node version declares `usableAsTool`;
//   * connection types are plain `'main'` strings, which work with both the
//     legacy `NodeConnectionType` enum and the current `NodeConnectionTypes`
//     object of n8n-workflow;
//   * type-only imports are marked as such so runtime dependencies stay empty.
// Each pattern must match, so an upstream refactor fails the sync loudly instead
// of silently publishing a package that n8n rejects.
function once(text, pattern, replacement, file) {
  if (!pattern.test(text)) {
    throw new Error(`Upstream structure changed, cannot rewrite ${file}: ${pattern}`);
  }
  return text.replace(pattern, replacement);
}

const versionedFix = (version) => (text, file) =>
  once(text, new RegExp(`version: ${version},`), `version: ${version},\n\t\tusableAsTool: true,`, file);

const conformRules = new Map([
  ['nodes/Wazend/base/Wazend.node.ts', [
    (text, file) => once(text, /import \{INodeTypeBaseDescription, NodeConnectionType\} from "n8n-workflow";/,
      'import type {INodeTypeBaseDescription, NodeConnectionType} from "n8n-workflow";', file),
    (text, file) => once(text, /export const BASE_DESCRIPTION/, `// Base descriptions shared by every version of the regular Wazend node.\nexport const BASE_DESCRIPTION`, file),
    (text, file) => once(text, /name: 'Wazend',/, "name: 'wazend',", file),
    (text, file) => once(text, /\tinputs: \[NodeConnectionType\.Main\],\n\toutputs: \[NodeConnectionType\.Main\],/,
      "\t// String literals keep the node working on both the legacy enum export and\n" +
      "\t// the current `NodeConnectionTypes` object of n8n-workflow.\n" +
      "\tinputs: ['main'] as NodeConnectionType[],\n" +
      "\toutputs: ['main'] as NodeConnectionType[],", file),
    // Renamed with a `wazend` prefix on purpose: the versioned node files use a
    // local `baseDescription` variable, so a plain `baseDescription` export
    // would shadow itself and throw "cannot access before initialization".
    (text) => text.replaceAll('BASE_DESCRIPTION', 'wazendBaseDescription').replaceAll('NODE_DESCRIPTION', 'wazendNodeDescription'),
  ]],
  ['nodes/Wazend/base/WazendTrigger.node.ts', [
    (text, file) => once(text, /export const BASE_TRIGGER_DESCRIPTION/,
      '// Base descriptions and webhook helpers shared by every version of the Wazend Trigger node.\nexport const BASE_TRIGGER_DESCRIPTION', file),
  ]],
  ['nodes/Wazend/Wazend.node.ts', [
    (text, file) => once(text, /from "\.\/base\/node"/, 'from "./base/Wazend.node"', file),
    (text) => text.replaceAll('BASE_DESCRIPTION', 'wazendBaseDescription'),
  ]],
  ['nodes/Wazend/WazendTrigger.node.ts', [
    (text, file) => once(text, /from "\.\/base\/trigger"/, 'from "./base/WazendTrigger.node"', file),
  ]],
  ...['v202409', 'v202502'].flatMap((dir, index) => {
    const version = index === 0 ? 202409 : 202502;
    return [
      [`nodes/Wazend/${dir}/Wazend${dir}.ts`, [
        (text, file) => once(text, /from '\.\.\/base\/node'/, "from '../base/Wazend.node'", file),
        versionedFix(version),
        (text) => text.replaceAll('BASE_DESCRIPTION', 'wazendBaseDescription').replaceAll('NODE_DESCRIPTION', 'wazendNodeDescription'),
      ]],
      [`nodes/Wazend/${dir}/WazendTriggerV${version}.ts`, [
        (text, file) => once(text, /from '\.\.\/base\/trigger'/, "from '../base/WazendTrigger.node'", file),
        (text, file) => once(text, /\tINodeTypeDescription, NodeConnectionType,\n\} from 'n8n-workflow';/,
          "\tINodeTypeDescription,\n} from 'n8n-workflow';\nimport type { NodeConnectionType } from 'n8n-workflow';", file),
        (text, file) => once(text, /const outputs = events\.map\(\(_\) => NodeConnectionType\.Main\);/,
          "const outputs: NodeConnectionType[] = events.map(() => 'main');", file),
        versionedFix(version),
      ]],
    ];
  }),
  ['nodes/Wazend/openapi/WazendOperationParser.ts', [
    (text, file) => once(text, /import \{OpenAPIV3\} from 'openapi-types';/, "import type {OpenAPIV3} from 'openapi-types';", file),
  ]],
  ['nodes/Wazend/openapi/WazendOperationsCollector.ts', [
    (text, file) => once(text, /import \{ OpenAPIV3 \} from 'openapi-types';/, "import type { OpenAPIV3 } from 'openapi-types';", file),
  ]],
  ['nodes/Wazend/openapi/WazendResourceParser.ts', [
    (text, file) => once(text, /import \{OpenAPIV3\} from 'openapi-types';/, "import type {OpenAPIV3} from 'openapi-types';", file),
  ]],
  ['nodes/Wazend/Wazend.node.json', [
    (text, file) => once(text, /"node": "n8n-nodes-wazend-api\.Wazend"/, '"node": "n8n-nodes-wazend-api.wazend"', file),
  ]],
]);

// The credential is small and stable, and verification requires an icon plus a
// documentation URL, so it is generated verbatim instead of patched.
function credentialFile() {
  return `import {
\tIAuthenticateGeneric,
\tICredentialTestRequest,
\tICredentialType,
\tINodeProperties,
} from 'n8n-workflow';

export class WazendApi implements ICredentialType {
\tname = 'wazendApi';
\tdisplayName = 'Wazend API';
\tdocumentationUrl = '${config.documentationUrl}';
\ticon = 'file:wazend.svg' as const;
\tproperties: INodeProperties[] = [
\t\t{
\t\t\tdisplayName: 'Host URL',
\t\t\tname: 'url',
\t\t\ttype: 'string',
\t\t\tdefault: 'https://tu-servidor.wazend.net',
\t\t},
\t\t{
\t\t\tdisplayName: 'API Key',
\t\t\tname: 'apiKey',
\t\t\ttype: 'string',
\t\t\ttypeOptions: { password: true },
\t\t\tdefault: '',
\t\t\trequired: false,
\t\t},
\t];

\tauthenticate: IAuthenticateGeneric = {
\t\ttype: 'generic',
\t\tproperties: {
\t\t\theaders: {
\t\t\t\t'X-Api-Key': '={{$credentials.apiKey}}',
\t\t\t},
\t\t},
\t};
\ttest: ICredentialTestRequest = {
\t\trequest: {
\t\t\tbaseURL: '={{$credentials.url}}',
\t\t\turl: '/api/sessions',
\t\t},
\t};
}
`;
}

function conform(file, text) {
  if (file === 'credentials/WazendApi.credentials.ts') return credentialFile();
  const rules = conformRules.get(file);
  if (!rules) return text;
  return rules.reduce((acc, rule) => rule(acc, file), text);
}

// Verified community nodes keep the node description in a file named after the
// node, so the upstream `base/` helpers are renamed on import.
const targetName = (relative) => rename(relative)
  .replace('nodes/Wazend/base/node.ts', 'nodes/Wazend/base/Wazend.node.ts')
  .replace('nodes/Wazend/base/trigger.ts', 'nodes/Wazend/base/WazendTrigger.node.ts');

function walk(dir) {
  for (const entry of fs.readdirSync(path.join(source, dir), { withFileTypes: true })) {
    const relative = `${dir}/${entry.name}`;
    if (entry.isSymbolicLink()) throw new Error(`Symlink rejected: ${relative}`);
    if (entry.isDirectory()) walk(relative);
    else if (/\.(ts|json)$/.test(entry.name)) {
      let content = brand(read(relative));
      if (entry.name === 'openapi.json') {
        const spec = JSON.parse(content);
        spec.info.title = 'Wazend API';
        spec.info.description = 'Connect WhatsApp to your workflows with Wazend API.';
        spec.info.contact = { name: 'Wazend', url: config.homepage };
        content = JSON.stringify(spec, null, 2) + '\n';
      }
      if (relative === 'credentials/WAHAApi.credentials.ts') {
        content = content.replace('http://localhost:3000', 'https://tu-servidor.wazend.net');
      }
      const file = targetName(relative);
      generated.set(file, conform(file, content));
    } else if (entry.name !== 'waha.svg') {
      throw new Error(`New upstream asset needs review: ${relative}`);
    }
  }
}
walk('nodes');
walk('credentials');
for (const file of ['tsconfig.json', 'jest.config.js', '.eslintrc.js', '.eslintrc.prepublish.js', '.prettierrc.js', '.editorconfig', 'index.js', 'LICENSE.md']) {
  generated.set(file, file === 'LICENSE.md' ? readRaw(file) : brand(read(file)));
}
generated.set('jest.config.js', generated.get('jest.config.js').replace("preset: 'ts-jest',", "preset: 'ts-jest',\n\tmodulePathIgnorePatterns: ['<rootDir>/dist/', '<rootDir>/.upstream/'],\n\ttestPathIgnorePatterns: ['/node_modules/', '<rootDir>/dist/', '<rootDir>/.upstream/'],"));
for (const file of ['nodes/Wazend/base/Wazend.node.ts', 'nodes/Wazend/base/WazendTrigger.node.ts', 'credentials/WazendApi.credentials.ts']) {
  if (!generated.has(file)) throw new Error(`Upstream structure changed: ${file}`);
}
generated.set('nodes/Wazend/wazend.svg', fs.readFileSync(path.join(root, 'branding/wazend.svg'), 'utf8'));
for (const [file, text] of generated) {
  if (file.endsWith('.node.json')) {
    const metadata = JSON.parse(text);
    metadata.resources = {
      credentialDocumentation: [{ url: config.documentationUrl }],
      primaryDocumentation: [{ url: config.documentationUrl }],
    };
    generated.set(file, JSON.stringify(metadata, null, 2) + '\n');
  }
}
const previousPackage = fs.existsSync(path.join(root, 'package.json'))
  ? JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')) : null;
// Verified community nodes must not install runtime dependencies: everything
// upstream lists under `dependencies` is compiled into the bundle instead, so it
// moves to `devDependencies` and n8n-workflow becomes a peer dependency.
const verificationTooling = {
  '@n8n/eslint-plugin-community-nodes': '^0.32.0',
  '@typescript-eslint/parser': '^8.35.0',
  esbuild: '^0.25.0',
  eslint: '^9.29.0',
  'eslint-plugin-n8n-nodes-base': '^1.16.7',
  'fast-glob': '^3.3.3',
};
const devDependencies = Object.fromEntries(
  Object.entries({
    ...upstreamPackage.devDependencies,
    ...upstreamPackage.dependencies,
    ...verificationTooling,
  }).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
);
const pkg = { ...upstreamPackage,
  name: config.packageName, version: previousPackage?.version || '0.1.0',
  description: 'Wazend API nodes for WhatsApp messaging and webhook events in n8n',
  homepage: config.homepage, author: config.author,
  repository: { type: 'git', url: `https://github.com/${config.repository}.git` },
  bugs: { url: `https://github.com/${config.repository}/issues` },
  n8n: JSON.parse(brand(JSON.stringify(upstreamPackage.n8n))),
  peerDependencies: { 'n8n-workflow': '*' },
  files: ['dist', 'LICENSE.md', 'NOTICE.md'],
  scripts: {
    build: 'node scripts/build.mjs',
    test: 'jest --runInBand',
    'test:dist': 'node scripts/smoke-dist.mjs',
    'test:sync': 'node scripts/sync.test.mjs',
    'check:branding': 'node scripts/check-branding.mjs',
    lint: 'node scripts/lint-community.mjs',
    'lint:dist': 'node scripts/lint-community.mjs --dist',
    prepublishOnly: 'npm run check:branding && npm run lint && npm test && npm run build && npm run test:dist && npm run lint:dist',
  },
  devDependencies,
};
delete pkg.dependencies;
// `peerDependencies` is new, so it is re-inserted right after `main` to keep the
// manifest readable.
const orderedPackage = {};
for (const [key, value] of Object.entries(pkg)) {
  orderedPackage[key] = value;
  if (key === 'main') {
    orderedPackage.peerDependencies = pkg.peerDependencies;
  }
}
orderedPackage.peerDependencies ??= pkg.peerDependencies;
generated.set('package.json', JSON.stringify(orderedPackage, null, 2) + '\n');
// `package-lock.json` is owned by npm: the post-generation `npm install` settles
// it against the regenerated manifest, so the sync never writes it.

// Validate all paths before replacing previously generated files. Handwritten
// branding, scripts, workflows and docs are outside the generated manifest.
const manifestPath = path.join(root, 'upstream.json');
const previous = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : { files: [] };
function target(file) {
  if (!/^(nodes\/|credentials\/|package(?:-lock)?\.json$|tsconfig\.json$|jest\.config\.js$|\.eslintrc(?:\.prepublish)?\.js$|\.prettierrc\.js$|\.editorconfig$|index\.js$|LICENSE\.md$)/.test(file)) throw new Error(`Unmanaged path: ${file}`);
  const absolute = path.resolve(root, file);
  if (!absolute.startsWith(root + path.sep)) throw new Error(`Unsafe path: ${file}`);
  return absolute;
}
for (const file of [...previous.files, ...generated.keys()]) target(file);
const npmOwned = new Set(['package-lock.json']);
for (const file of previous.files) {
  if (!generated.has(file) && !npmOwned.has(file)) fs.rmSync(target(file), { force: true });
}
for (const [file, text] of generated) {
  fs.mkdirSync(path.dirname(target(file)), { recursive: true });
  fs.writeFileSync(target(file), text);
}
fs.writeFileSync(manifestPath, JSON.stringify({ repository: 'devlikeapro/n8n-nodes-waha', branch: 'master', commit: sha, version: upstreamPackage.version, files: [...generated.keys()].sort() }, null, 2) + '\n');
console.log(`Imported upstream ${sha} with Wazend branding (${generated.size} files).`);
