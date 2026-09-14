# Wazend API for n8n

Connect WhatsApp messaging, sessions, contacts, groups and webhook events to your n8n workflows using Wazend API.

## Installation

Once the package is published, open **Settings → Community nodes → Install** in a self-hosted n8n instance and enter `n8n-nodes-wazend-api`.

This package is under development and is not currently verified for n8n Cloud.

## Credentials

Create a **Wazend API** credential:

- **Host URL:** your server URL, for example `https://tu-servidor.wazend.net`.
- **API Key:** your server API key. Requests authenticate through the `X-Api-Key` header.

## Send a message

1. Add the **Wazend** node and select your Wazend API credential.
2. Select the messaging resource and the send-text operation.
3. Set your session name, destination chat ID and message text.
4. Execute the node when you are ready to send the message.

## Receive events

Add **Wazend Trigger**, copy its webhook URL and configure your Wazend API session to send events to that URL. Use the test URL while listening in the editor and the production URL for an active workflow. Each event type has its own output.

Example media URLs under `example.com` are placeholders; replace them with reachable URLs for your own files.

[Wazend documentation](https://wazend.net/docs/introduccion)

## Development and synchronization

```sh
npm ci
npm run check:branding
npm test
npm run build
```

See [maintenance instructions](docs/MAINTENANCE.md) for automatic updates. This is a separate package: existing workflows using another package must be migrated explicitly, including credentials and webhook URLs.

## License

MIT. See [LICENSE.md](LICENSE.md) and [third-party notices](NOTICE.md).
