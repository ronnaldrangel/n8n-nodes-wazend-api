import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.resolve(process.argv[2] || '.upstream');
if (source === root) throw new Error('Upstream must be a separate checkout');
const config = JSON.parse(fs.readFileSync(path.join(root, 'branding/config.json'), 'utf8'));
const read = (name) => fs.readFileSync(path.join(source, name), 'utf8');
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
      generated.set(rename(relative), content);
    } else if (entry.name !== 'waha.svg') {
      throw new Error(`New upstream asset needs review: ${relative}`);
    }
  }
}
walk('nodes');
walk('credentials');
for (const file of ['tsconfig.json', 'jest.config.js', '.eslintrc.js', '.eslintrc.prepublish.js', '.prettierrc.js', '.editorconfig', 'index.js', 'LICENSE.md']) {
  generated.set(file, file === 'LICENSE.md' ? read(file) : brand(read(file)));
}
generated.set('jest.config.js', generated.get('jest.config.js').replace("preset: 'ts-jest',", "preset: 'ts-jest',\n\tmodulePathIgnorePatterns: ['<rootDir>/dist/'],"));
for (const file of ['nodes/Wazend/base/node.ts', 'nodes/Wazend/base/trigger.ts', 'credentials/WazendApi.credentials.ts']) {
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
const pkg = { ...upstreamPackage,
  name: config.packageName, version: previousPackage?.version || '0.1.0',
  description: 'Wazend API nodes for WhatsApp messaging and webhook events in n8n',
  homepage: config.homepage, author: config.author,
  repository: { type: 'git', url: `https://github.com/${config.repository}.git` },
  bugs: { url: `https://github.com/${config.repository}/issues` },
  n8n: JSON.parse(brand(JSON.stringify(upstreamPackage.n8n))),
  files: ['dist', 'LICENSE.md', 'NOTICE.md'],
  scripts: {
    build: 'tsc && node scripts/copy-icons.mjs',
    test: 'jest --runInBand',
    'test:sync': 'node scripts/sync.test.mjs',
    'check:branding': 'node scripts/check-branding.mjs',
    lint: 'eslint nodes credentials package.json',
    prepublishOnly: 'npm run check:branding && npm test && npm run build',
  },
};
generated.set('package.json', JSON.stringify(pkg, null, 2) + '\n');
const lock = JSON.parse(read('package-lock.json'));
lock.name = pkg.name;
lock.version = pkg.version;
Object.assign(lock.packages[''], { name: pkg.name, version: pkg.version });
generated.set('package-lock.json', JSON.stringify(lock, null, 2) + '\n');

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
for (const file of previous.files) if (!generated.has(file)) fs.rmSync(target(file), { force: true });
for (const [file, text] of generated) {
  fs.mkdirSync(path.dirname(target(file)), { recursive: true });
  fs.writeFileSync(target(file), text);
}
fs.writeFileSync(manifestPath, JSON.stringify({ repository: 'devlikeapro/n8n-nodes-waha', branch: 'master', commit: sha, version: upstreamPackage.version, files: [...generated.keys()].sort() }, null, 2) + '\n');
console.log(`Imported upstream ${sha} with Wazend branding (${generated.size} files).`);
