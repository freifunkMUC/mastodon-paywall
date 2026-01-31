# mastodon-paywall

Paywall-style signup page for a Mastodon instance. Users subscribe via PayPal and an
account is created through the Mastodon API.

## Requirements

- Node.js 20+ (or compatible with Next.js 16)
- A Mastodon API token with account creation permissions
- PayPal subscription client + plan IDs

## Environment variables

Server/runtime variables (set on the server, no rebuild required):

- `API_TOKEN` - Mastodon API token
- `PAYPAL_CLIENT_ID` - PayPal client ID
- `PAYPAL_PLAN_ID` - PayPal subscription plan ID

Local development:

```bash
cp .env.local.example .env.local
```

Fill in `.env.local` with the variables above.

## Development

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Production build

```bash
npm run build
npm run start
```

## Runtime config endpoint

The client fetches PayPal config at runtime from:

```
/api/public-config
```

This allows you to set PayPal IDs on the server without rebuilding.
