import { useEffect } from "react";
import { PayPalButtons, usePayPalScriptReducer } from "@paypal/react-paypal-js";

export default function PaypalButton({
  getFormValues,
  triggerValidation,
  registerUser,
}) {
  const [state, dispatch] = usePayPalScriptReducer(); // ✅ Fix: dispatch richtig extrahieren

  // Reset PayPal options to ensure the intent is set to "subscription"
  useEffect(() => {
    dispatch({
      type: "resetOptions",
      value: {
        intent: "subscription",
      },
    });
  }, [dispatch]);

  return (
    <PayPalButtons
      createSubscription={(data, actions) => {
        return actions.subscription.create({
          plan_id: process.env.NEXT_PUBLIC_PAYPAL_PLAN_ID,
        });
      }}
      onApprove={async (data, actions) => {
        try {
          const subscriptionData = await actions.subscription.get();
          const formData = getFormValues();

          const userData = {
            ...formData,
            subscriptionId: subscriptionData.subscriptionID,
            orderId: subscriptionData.orderID,
          };

          await registerUser(userData);
        } catch (error) {
          console.error("Error during registration:", error);
          // Optional: Show error message to user
        }
      }}
      onClick={async (data, actions) => {
        const isValid = await triggerValidation();
        if (isValid) {
          return actions.resolve();
        } else {
          return actions.reject();
        }
      }}
      onError={(error) => {
        console.error("PayPal error:", error);
        // Optional: Show error message to user
      }}
      style={{
        label: "subscribe",
      }}
    />
  );
}
