// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import fetch from "node-fetch";

const { API_TOKEN } = process.env;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 10;
const rateLimitStore = new Map();

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

const getClientIp = (req) => {
  const forwarded = req.headers["x-forwarded-for"];

  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }

  if (Array.isArray(forwarded)) {
    return forwarded[0];
  }

  return req.socket?.remoteAddress || "unknown";
};

const isRateLimited = (ip) => {
  const now = Date.now();
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
      res.status(200).json({ success: true });
    } else {
      res.status(response.status).json(data);
    }
  } catch (error) {
    console.error("Error during registration:", error);

    // Handle unexpected errors
    res.status(500).json({ error: "Internal Server Error" });
  }
}
