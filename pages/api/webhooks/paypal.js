// Receives PayPal subscription lifecycle events and disables/re-enables the
// matching Mastodon account. Configure this URL as a webhook in the PayPal
// developer dashboard — see README.md for the required event types.
import { verifyWebhookSignature } from "../../../lib/paypal";
import { findBySubscriptionId, setSubscriptionStatus } from "../../../lib/db";
import { disableMastodonAccount, enableMastodonAccount } from "../../../lib/mastodon";

const { API_TOKEN, PAYPAL_WEBHOOK_ID } = process.env;

const DISABLING_EVENTS = new Set([
  "BILLING.SUBSCRIPTION.CANCELLED",
  "BILLING.SUBSCRIPTION.EXPIRED",
  "BILLING.SUBSCRIPTION.SUSPENDED",
]);

// ACTIVATED fires on initial activation, RE-ACTIVATED after a merchant/buyer
// reactivates a previously suspended subscription. Both are selectable event
// types in the PayPal webhook dashboard for this app.
const ENABLING_EVENTS = new Set([
  "BILLING.SUBSCRIPTION.ACTIVATED",
  "BILLING.SUBSCRIPTION.RE-ACTIVATED",
]);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  if (!API_TOKEN || !PAYPAL_WEBHOOK_ID) {
    res.status(500).json({
      error: "Missing webhook configuration. Set API_TOKEN and PAYPAL_WEBHOOK_ID on the server.",
    });
    return;
  }

  const body = req.body;
  if (!body || typeof body !== "object") {
    res.status(400).json({ error: "Missing request body" });
    return;
  }

  let verified = false;
  try {
    verified = await verifyWebhookSignature(req.headers, body, PAYPAL_WEBHOOK_ID);
  } catch (error) {
    console.error("Error verifying PayPal webhook signature:", error);
    res.status(502).json({ error: "Could not verify webhook signature" });
    return;
  }

  if (!verified) {
    res.status(400).json({ error: "Invalid webhook signature" });
    return;
  }

  const eventType = body.event_type;
  const subscriptionId = body.resource?.id;

  if (
    !subscriptionId ||
    !(DISABLING_EVENTS.has(eventType) || ENABLING_EVENTS.has(eventType))
  ) {
    // Not an event we act on — acknowledge so PayPal doesn't retry.
    res.status(200).json({ received: true });
    return;
  }

  try {
    const record = await findBySubscriptionId(subscriptionId);
    if (!record) {
      console.warn(`PayPal webhook for unknown subscription ${subscriptionId}`);
      res.status(200).json({ received: true });
      return;
    }

    if (DISABLING_EVENTS.has(eventType) && record.status !== "disabled") {
      await disableMastodonAccount(record.mastodonAccountId, API_TOKEN);
      await setSubscriptionStatus(subscriptionId, "disabled");
    } else if (ENABLING_EVENTS.has(eventType) && record.status !== "active") {
      await enableMastodonAccount(record.mastodonAccountId, API_TOKEN);
      await setSubscriptionStatus(subscriptionId, "active");
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error("Error handling PayPal webhook:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
