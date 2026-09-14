# Third-party notices

This project derives from `devlikeapro/n8n-nodes-waha` (WAHA), distributed under the MIT license. Original license and copyright notices are preserved in LICENSE.md. The exact imported revision is recorded in upstream.json.

`@devlikeapro/n8n-openapi-node` (MIT) is declared as a development dependency and compiled into the published bundle, because verified community nodes cannot install runtime dependencies. Its optional `pino` logger is replaced at build time by a no-op implementation (`scripts/stubs/pino.cjs`) so the published package contains no logging transports, worker threads or `Function` constructor calls.

Wazend branding and downstream automation are maintained independently. This project does not claim endorsement or verification by n8n or the upstream authors. Runtime dependencies retain their original package names and licenses.
