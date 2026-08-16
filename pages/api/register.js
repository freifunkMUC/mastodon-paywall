// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
// Uses the runtime's built-in fetch (global since Node 18) instead of node-fetch.
import { getSubscription } from "../../lib/paypal";
import { recordSubscription } from "../../lib/db";

const { API_TOKEN, PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET } = process.env;
const PAYPAL_PLAN_ID = process.env.PAYPAL_PLAN_ID || process.env.NEXT_PUBLIC_PAYPAL_PLAN_ID;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 10;
const rateLimitStore = new Map();
const subscriptionIdRegex = /^[A-Za-z0-9-]{5,40}$/;

// Best-effort replay guard: prevents the same subscriptionId from being used
// to create more than one account while this process is running. Since the
// app keeps no persistent store, this resets on restart and isn't shared
// across multiple instances — a stronger guarantee would need a database.
const usedSubscriptionIds = new Set();

// Verifies with PayPal itself that the subscription is real, active, and for
// the plan we expect — the client's word for it is not enough, since a POST
// straight to this endpoint with a made-up subscriptionId would otherwise
// create a free account with no payment behind it at all.
const isSubscriptionActive = async (subscriptionId) => {
  const subscription = await getSubscription(subscriptionId);
  return (
    Boolean(subscription) &&
    subscription.status === "ACTIVE" &&
    subscription.plan_id === PAYPAL_PLAN_ID
  );
};

const usernameRegex = /^[a-zA-Z0-9_]+$/;
const isValidEmail = (value) => {
  if (typeof value !== "string") {
    return false;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }

  if (trimmed.includes(" ")) {
    return false;
  }

  const atIndex = trimmed.indexOf("@");
  const lastAtIndex = trimmed.lastIndexOf("@");
  if (atIndex <= 0 || atIndex !== lastAtIndex) {
    return false;
  }

  const dotIndex = trimmed.indexOf(".", atIndex + 2);
  if (dotIndex === -1 || dotIndex === trimmed.length - 1) {
    return false;
  }

  return true;
};

// The left-most entries in X-Forwarded-For are client-supplied and trivially
// spoofable. When the app sits behind a single reverse proxy (the deployed
// setup), only the right-most (last) entry is one the proxy itself appended
// and can be trusted for rate limiting.
const getClientIp = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  const value = Array.isArray(forwarded) ? forwarded.join(",") : forwarded;

  if (typeof value === "string" && value.trim()) {
    const parts = value.split(",").map((part) => part.trim());
    const last = parts[parts.length - 1];
    if (last) {
      return last;
    }
  }

  return req.socket?.remoteAddress || "unknown";
};

const pruneRateLimitStore = (now) => {
  for (const [key, entry] of rateLimitStore) {
    if (now - entry.start > RATE_LIMIT_WINDOW_MS) {
      rateLimitStore.delete(key);
    }
  }
};

const isRateLimited = (ip) => {
  const now = Date.now();
  pruneRateLimitStore(now);

  const entry = rateLimitStore.get(ip) || { count: 0, start: now };

  if (now - entry.start > RATE_LIMIT_WINDOW_MS) {
    entry.count = 0;
    entry.start = now;
  }

  entry.count += 1;
  rateLimitStore.set(ip, entry);

  return entry.count > RATE_LIMIT_MAX;
};

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  if (!API_TOKEN) {
    res.status(500).json({
      error: "Missing API token. Set API_TOKEN on the server.",
    });
    return;
  }

  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET || !PAYPAL_PLAN_ID) {
    res.status(500).json({
      error:
        "Missing PayPal configuration. Set PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET and PAYPAL_PLAN_ID on the server.",
    });
    return;
  }

  const ip = getClientIp(req);
  if (isRateLimited(ip)) {
    res.status(429).json({ error: "Too many requests. Try again later." });
    return;
  }

  try {
    // Parse and validate the request body
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    if (!body) {
      res.status(400).json({ error: "Missing request body" });
      return;
    }

    const { username, email, password, subscriptionId } = body;

    if (!username || !email || !password || !subscriptionId) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    if (
      username.length < 4 ||
      username.length > 20 ||
      !usernameRegex.test(username)
    ) {
      res.status(400).json({ error: "Invalid username" });
      return;
    }

    if (!isValidEmail(email)) {
      res.status(400).json({ error: "Invalid email" });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({ error: "Password too short" });
      return;
    }

    if (
      typeof subscriptionId !== "string" ||
      !subscriptionIdRegex.test(subscriptionId)
    ) {
      res.status(400).json({ error: "Invalid subscription id" });
      return;
    }

    if (usedSubscriptionIds.has(subscriptionId)) {
      res.status(409).json({ error: "Subscription has already been used" });
      return;
    }

    let subscriptionActive = false;
    try {
      subscriptionActive = await isSubscriptionActive(subscriptionId);
    } catch (error) {
      console.error("Error verifying PayPal subscription:", error);
      res.status(502).json({ error: "Could not verify PayPal subscription" });
      return;
    }

    if (!subscriptionActive) {
      res.status(402).json({ error: "PayPal subscription is not active" });
      return;
    }

    usedSubscriptionIds.add(subscriptionId);

    // Prepare the payload for the external API
    const params = new URLSearchParams();
    params.append("username", username);
    params.append("email", email);
    params.append("password", password);
    params.append("agreement", "true");
    params.append("locale", "de");
    params.append("reason", `Paypal: ${subscriptionId}`);

    // Send the request to the external API
    const response = await fetch("https://social.ffmuc.net/api/v1/accounts", {
      method: "POST",
      body: params,
      headers: { Authorization: `Bearer ${API_TOKEN}` },
    });

    const data = await response.json().catch(() => ({}));

    // Handle the response from the external API
    if (response.ok) {
      try {
        await recordSubscription({
          subscriptionId,
          mastodonAccountId: data.id,
          username,
        });
      } catch (dbError) {
        // The Mastodon account already exists at this point — don't fail the
        // request over it, but this subscription won't be auto-disabled on
        // cancellation until the mapping can be saved.
        console.error("Error saving subscription record:", dbError);
      }
      res.status(200).json({ success: true });
    } else {
      // Account creation failed after payment was verified — free up the
      // subscriptionId so the user can retry without losing their payment.
      usedSubscriptionIds.delete(subscriptionId);
      res.status(response.status).json(data);
    }
  } catch (error) {
    console.error("Error during registration:", error);

    // Handle unexpected errors
    res.status(500).json({ error: "Internal Server Error" });
  }
}
