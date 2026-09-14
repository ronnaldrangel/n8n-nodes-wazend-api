# Maintenance

## Automatic updates

The `Sync upstream` workflow checks `devlikeapro/n8n-nodes-waha` (`master`) daily at 06:23 UTC (01:23 Colombia time). It can also be run manually from GitHub Actions. GitHub schedules are best effort, so updates are not instantaneous.

When the commit changes, the workflow regenerates the package, checks branding, runs upstream tests, lints the sources against the n8n community node rules, compiles the bundle, lints the published bundle and packages the node. Only a successful validation produces an automatic commit on the default branch. A failed validation leaves the default branch unchanged; inspect the failed Actions run before adjusting the importer. New upstream assets or a changed source layout require maintenance.

The regenerated sources are also conformed to the n8n verification rules (see [Verification](#verification)). Every rewrite asserts its pattern, so an upstream refactor fails the sync instead of silently publishing a package that n8n rejects.

Validation runs without repository write credentials. A separate job applies the validated patch. Concurrent changes to the default branch cause the push to fail rather than overwriting newer work. The next scheduled run retries. Branch protection can block automatic commits and must be accounted for when configuring repository rules.

When the validated commit reaches the default branch, the workflow dispatches `Publish to npm` so the release follows automatically.

## Local regeneration

```sh
git clone --depth 1 --branch master https://github.com/devlikeapro/n8n-nodes-waha.git .upstream
node scripts/sync-upstream.mjs .upstream
npm ci --ignore-scripts
npm run check:branding
npm run lint
npm test
npm run build
npm run test:dist
npm run lint:dist
```

`upstream.json` records the source commit and generated file manifest. Do not edit generated files by hand: update `scripts/sync-upstream.mjs` or `branding/` instead. Original workflows, screenshots and publishing scripts are never imported. Upstream license notices are preserved verbatim. The upstream repository, NOTICE.md and external package names intentionally retain provenance references.

`package-lock.json` is owned by npm rather than by the importer: run `npm install` after a regeneration so the lockfile settles against the regenerated manifest, then commit both.

## GitHub setup

Synchronization needs no custom token: repository policy only has to permit the workflows' `contents: write` and `actions: write` permissions, and the schedule becomes active on the default branch. Publishing needs the `NPM_TOKEN` repository secret and a public repository, because npm provenance is generated against the public source.

## Publishing

`Publish to npm` (`.github/workflows/publish.yml`) checks branding, runs the tests, compiles the node and publishes with npm provenance. It triggers automatically:

- **Push to `main`.** When the version in `package.json` is not on npm yet, that version is published. When it is already published and the commit changed the distributed package (`nodes/`, `credentials/`, `scripts/`, `branding/`, `package.json`, `package-lock.json`, `upstream.json`), the workflow bumps a patch version, commits `chore(release): vX.Y.Z [skip ci]` and publishes the new version. Documentation-only commits stop before publishing.
- **Upstream synchronization.** `Sync upstream` dispatches this workflow once the validated commit is on the default branch, so accepted upstream updates become patch releases without manual work.
- **Tags `vX.Y.Z` and published releases.** The workflow publishes that exact version and fails when the tag does not match `package.json`.
- **Manual runs.** `Actions → Publish to npm → Run workflow` accepts `auto` (publish, or bump a patch when the version already exists), plus `patch`, `minor`, `major` and `none`.

Bumping the version in `package.json` before pushing keeps the release under maintainer control and is the recommended path for minor and major releases.

The `0.1.x` numbers are burned: npm rejects a version that existed before the package was unpublished on 2026-08-07, so the current line starts at `0.2.0`.

## Verification

Verified community nodes must satisfy the [n8n verification guidelines](https://docs.n8n.io/connect/create-nodes/build-your-node/reference/verification-guidelines/). The package is built for that gate:

- **No runtime dependencies.** `package.json` declares none; `n8n-workflow` is a peer dependency. `@devlikeapro/n8n-openapi-node` and `openapi-types` are development dependencies, and `scripts/build.mjs` compiles the OpenAPI builder into the published bundle with esbuild. `lodash` stays external because n8n allows it, and only `n8n-workflow` and `lodash` are required at runtime.
- **No forbidden build output.** n8n rejects bundles with logging transports, worker threads, `Function` constructor calls or restricted globals. The OpenAPI builder's optional `pino` logger is therefore replaced by `scripts/stubs/pino.cjs` at build time.
- **Community node conventions.** Node descriptions live in `<Name>.node.ts` files, `name` is camel case, every node version declares `usableAsTool`, node and credential classes declare their icons and documentation URL, and only `n8n-workflow`/`lodash` imports are used in shipped code.
- **Local checks.** `npm run lint` runs the same ESLint configuration as `npx @n8n/scan-community-package` over the sources, and `npm run lint:dist` runs it over the published bundle. Both run in CI and before every publication.
- **Bundle smoke test.** `npm run test:dist` requires every entry listed in `package.json#n8n` from `dist/` and instantiates it, the same way n8n loads a package. Static checks cannot see load-time failures such as a module binding read before initialization, so this runs in CI and before every publication.

Publication runs only from GitHub Actions with npm provenance, so publishing from a local machine is unnecessary for n8n verification. Submitting the node for review happens in the [n8n Creator Portal](https://creators.n8n.io/nodes) with the account that owns the npm package. Branding alone does not satisfy verification requirements.

Existing workflows that reference older Wazend or upstream packages are not migrated automatically. This package uses its own node and credential identifiers.
