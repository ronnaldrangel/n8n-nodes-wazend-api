# Maintenance

## Automatic updates

The `Sync upstream` workflow checks `devlikeapro/n8n-nodes-waha` (`master`) daily at 06:23 UTC (01:23 Colombia time). It can also be run manually from GitHub Actions. GitHub schedules are best effort, so updates are not instantaneous.

When the commit changes, the workflow regenerates the package, checks branding, runs upstream tests, compiles and packages the node. Only a successful validation produces an automatic commit on the default branch. A failed validation leaves the default branch unchanged; inspect the failed Actions run before adjusting the importer. New upstream assets or a changed source layout require maintenance.

Validation runs without repository write credentials. A separate job applies the validated patch. Concurrent changes to the default branch cause the push to fail rather than overwriting newer work. The next scheduled run retries. Branch protection can block automatic commits and must be accounted for when configuring repository rules.

The workflow does not publish to npm. This repository update mechanism and npm release management are separate. The package version remains under maintainer control.

## Local regeneration

```sh
git clone --depth 1 --branch master https://github.com/devlikeapro/n8n-nodes-waha.git .upstream
node scripts/sync-upstream.mjs .upstream
npm ci --ignore-scripts
npm run check:branding
npm test
npm run build
```

`upstream.json` records the source commit and generated file manifest. Do not edit generated files by hand: update `scripts/sync-upstream.mjs` or `branding/` instead. Original workflows, screenshots and publishing scripts are never imported. Upstream license notices are preserved verbatim. The upstream repository, NOTICE.md and external package names intentionally retain provenance references.

## GitHub setup

Create an independent private repository named `n8n-nodes-wazend-api`, push this tree to `main`, and enable GitHub Actions. The schedule becomes active on the default branch. No npm token or custom GitHub token is required for synchronization. Repository or organization policy must permit the workflow's `contents: write` permission.

## Publishing and verification

Before publishing, review the generated npm tarball and configure a separate GitHub Actions release using npm provenance. Do not publish from the local machine when targeting n8n verification. Verification also requires a public source repository and additional eligibility work, including removal of runtime external dependencies. Branding alone does not satisfy verification requirements.

Existing workflows that reference older Wazend or upstream packages are not migrated automatically. This package uses its own node and credential identifiers.
