// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import fetch from "node-fetch";

const { API_TOKEN } = process.env;

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  try {
    // Parse and validate the request body
    const body = JSON.parse(req.body);

    if (!body.username || !body.email || !body.password || !body.subscriptionId) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    // Prepare the payload for the external API
    const params = new URLSearchParams();
    params.append("username", body.username);
    params.append("email", body.email);
    params.append("password", body.password);
    params.append("agreement", "true");
    params.append("locale", "de");
    params.append("reason", `Paypal: ${body.subscriptionId}`);

    // Send the request to the external API
    const response = await fetch("https://social.ffmuc.net/api/v1/accounts", {
      method: "POST",
      body: params,
      headers: { Authorization: `Bearer ${API_TOKEN}` },
    });

    const data = await response.json();

    // Handle the response from the external API
    if (response.status === 200) {
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