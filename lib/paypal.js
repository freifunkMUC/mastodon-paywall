const PAYPAL_API_BASE = process.env.PAYPAL_API_BASE || "https://api-m.paypal.com";
const { PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET } = process.env;

let cachedToken = null;

// Cached across requests within this process — avoids a round trip to
// PayPal's OAuth endpoint on every subscription check / webhook delivery.
export const getAccessToken = async () => {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.value;
  }

  const credentials = Buffer.from(
    `${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`,
  ).toString("base64");

  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    throw new Error("Failed to authenticate with PayPal");
  }

  const data = await response.json();
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + Math.max(data.expires_in - 60, 30) * 1000,
  };
  return cachedToken.value;
};

export const getSubscription = async (subscriptionId) => {
  const accessToken = await getAccessToken();

  const response = await fetch(
    `${PAYPAL_API_BASE}/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!response.ok) {
    return null;
  }

  return response.json();
};

// Verifies a webhook delivery is genuinely from PayPal and untampered, via
// PayPal's own verification endpoint (https://developer.paypal.com/api/rest/webhooks/rest/#link-verifyeventsignature).
// Never act on a webhook payload without this — otherwise anyone who learns
// or guesses a subscriptionId could forge a "cancelled" event and disable an
// arbitrary user's account.
export const verifyWebhookSignature = async (headers, body, webhookId) => {
  const accessToken = await getAccessToken();

  const response = await fetch(
    `${PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        auth_algo: headers["paypal-auth-algo"],
        cert_url: headers["paypal-cert-url"],
        transmission_id: headers["paypal-transmission-id"],
        transmission_sig: headers["paypal-transmission-sig"],
        transmission_time: headers["paypal-transmission-time"],
        webhook_id: webhookId,
        webhook_event: body,
      }),
    },
  );

  if (!response.ok) {
    return false;
  }

  const data = await response.json();
  return data.verification_status === "SUCCESS";
};
