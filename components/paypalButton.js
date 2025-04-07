import { useEffect } from "react";
import { PayPalButtons, usePayPalScriptReducer } from "@paypal/react-paypal-js";

export default function PaypalButton({
  getFormValues,
  triggerValidation,
  registerUser,
}) {
  const [{ options }, dispatch] = usePayPalScriptReducer();

  useEffect(() => {
    dispatch({
      type: "resetOptions",
      value: {
        ...options,
        intent: "subscription",
      },
    });
  }, [dispatch, options]); // Added 'dispatch' and 'options' to the dependency array

  return (
    <PayPalButtons
      createSubscription={(data, actions) =>
        actions.subscription.create({
          plan_id: process.env.NEXT_PUBLIC_PAYPAL_PLAN_ID,
        })
      }
      onApprove={async (data, actions) => {
        const subscriptionData = await actions.subscription.get();
        const formData = getFormValues();
        const userData = {
          ...formData,
          subscriptionId: subscriptionData.subscriptionID,
          orderId: subscriptionData.orderID,
        };

        return registerUser(userData);
      }}
      onClick={(data, actions) =>
        triggerValidation().then((isValid) =>
          isValid ? actions.resolve() : actions.reject(),
        )
      }
      style={{
        label: "subscribe",
      }}
    />
  );
}