import { useEffect } from "react";
import { PayPalButtons, usePayPalScriptReducer } from "@paypal/react-paypal-js";

export default function PaypalButton({
  getFormValues,
  triggerValidation,
  registerUser,
}) {
  const [dispatch] = usePayPalScriptReducer();

  // Reset PayPal options to ensure the intent is set to "subscription"
  useEffect(() => {
    dispatch({
      type: "resetOptions",
      value: {
        intent: "subscription",
      },
    });
  }, [dispatch]); // Only 'dispatch' is needed as a dependency

  return (
    <PayPalButtons
      createSubscription={(data, actions) => {
        // Create a PayPal subscription with the specified plan ID
        return actions.subscription.create({
          plan_id: process.env.NEXT_PUBLIC_PAYPAL_PLAN_ID,
        });
      }}
      onApprove={async (data, actions) => {
        try {
          // Retrieve subscription details after approval
          const subscriptionData = await actions.subscription.get();
          const formData = getFormValues();

          // Combine form data with subscription details
          const userData = {
            ...formData,
            subscriptionId: subscriptionData.subscriptionID,
            orderId: subscriptionData.orderID,
          };

          // Register the user with the combined data
          await registerUser(userData);
        } catch (error) {
          console.error("Error during registration:", error);
          // Handle errors (e.g., display a message to the user)
        }
      }}
      onClick={async (data, actions) => {
        // Validate the form before proceeding with PayPal payment
        const isValid = await triggerValidation();
        if (isValid) {
          return actions.resolve(); // Proceed with payment
        } else {
          return actions.reject(); // Prevent payment if validation fails
        }
      }}
      onError={(error) => {
        // Handle PayPal payment errors
        console.error("PayPal error:", error);
        // Display an error message to the user
      }}
      style={{
        label: "subscribe", // Customize the button label
      }}
    />
  );
}