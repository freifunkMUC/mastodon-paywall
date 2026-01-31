export default function handler(req, res) {
  const paypalClientId =
    process.env.PAYPAL_CLIENT_ID ||
    process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ||
    "";
  const paypalPlanId =
    process.env.PAYPAL_PLAN_ID ||
    process.env.NEXT_PUBLIC_PAYPAL_PLAN_ID ||
    "";

  if (!paypalClientId || !paypalPlanId) {
    res.status(500).json({
      error:
        "Missing PayPal configuration. Set PAYPAL_CLIENT_ID and PAYPAL_PLAN_ID on the server.",
    });
    return;
  }

  res.status(200).json({
    paypalClientId,
    paypalPlanId,
  });
}
