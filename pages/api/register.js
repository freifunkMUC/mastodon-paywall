// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import fetch from "node-fetch";

const { API_TOKEN } = process.env;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405);
  }

  const body = JSON.parse(req.body);

  const params = new URLSearchParams();
  params.append("username", body.username);
  params.append("email", body.email);
  params.append("password", body.password);
  params.append("agreement", "true");
  params.append("locale", "de");
  params.append("reason", `Paypal: ${body.subscriptionId}`);

  const r = await fetch("https://social.ffmuc.net/api/v1/accounts", {
    method: "POST",
    body: params,
    headers: { Authorization: `Bearer ${API_TOKEN}` },
  });
  const data = await r.json();
  if (r.status === 200) {
    res.json({ success: true });
  } else {
    res.status(r.status).json(data);
  }
}
