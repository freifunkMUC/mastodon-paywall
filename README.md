# mastodon-paywall

Paywall-style signup page for a Mastodon instance. Users subscribe via PayPal and an
account is created through the Mastodon API. When a subscription is cancelled, expires,
or is suspended, a PayPal webhook automatically disables the matching Mastodon account
again (and re-enables it if the subscription becomes active again).

## Requirements

- Node.js 20.19+ (or compatible with Next.js 16)
- A Mastodon API token with `write:accounts` and `admin:write:accounts` permissions
  (the latter is needed to disable/enable accounts on cancellation)
- PayPal subscription client + plan IDs, plus a webhook (see below)

## Environment variables

Server/runtime variables (set on the server, no rebuild required):

- `API_TOKEN` - Mastodon API token
- `PAYPAL_CLIENT_ID` - PayPal client ID
- `PAYPAL_CLIENT_SECRET` - PayPal client secret, used to verify subscriptions
  server-side via PayPal's API before an account is created. Get this from
  the same PayPal developer app as `PAYPAL_CLIENT_ID`. **Never expose this
  to the client** (no `NEXT_PUBLIC_` prefix).
- `PAYPAL_PLAN_ID` - PayPal subscription plan ID
- `PAYPAL_API_BASE` - optional, defaults to `https://api-m.paypal.com`. Set
  to `https://api-m.sandbox.paypal.com` when testing against a PayPal
  sandbox account.
- `PAYPAL_WEBHOOK_ID` - ID of the PayPal webhook (see below). Required for
  automatic account disabling on cancellation; registration works without it.
- `DATABASE_URL` - optional, stores the subscription → Mastodon account
  mapping used to know which account to disable. Defaults to a local sqlite
  file at `./data/paywall.sqlite3` (no extra service needed). Also accepts
  `postgres://user:pass@host:5432/db` or `mysql://user:pass@host:3306/db` to
  use an external database instead.

### PayPal webhook setup

To auto-disable accounts when a subscription ends, add a webhook in the
[PayPal developer dashboard](https://developer.paypal.com/dashboard/) (under
your app → Webhooks):

- URL: `https://<your-domain>/api/webhooks/paypal`
- Events to subscribe to (dashboard labels shown in parentheses):
  - `BILLING.SUBSCRIPTION.CANCELLED` (Billing subscription cancelled)
  - `BILLING.SUBSCRIPTION.EXPIRED` (Billing subscription expired)
  - `BILLING.SUBSCRIPTION.SUSPENDED` (Billing subscription suspended)
  - `BILLING.SUBSCRIPTION.ACTIVATED` (Billing subscription activated) and
    `BILLING.SUBSCRIPTION.RE-ACTIVATED` (Billing subscription re-activated) —
    both re-enable the account if the subscription becomes active again
    after being suspended

  Not used: "Billing subscription created", "Billing subscription updated",
  "Billing subscription payment failed" — PayPal already moves the
  subscription to `SUSPENDED` after repeated payment failures, which the
  webhook above already reacts to.

Copy the resulting webhook ID into `PAYPAL_WEBHOOK_ID`. Every incoming
webhook is verified against PayPal's Verify Webhook Signature API before
anything is acted on.

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

## Data persistence (Docker)

If you're using the default sqlite database, mount a volume at `/app/data`
(already wired up in `docker-compose.yml`) so the subscription → account
mapping survives container restarts. If you point `DATABASE_URL` at an
external Postgres or MySQL/MariaDB instance instead, the volume isn't needed.
