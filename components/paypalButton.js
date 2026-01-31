import { useEffect } from "react";
import { PayPalButtons, usePayPalScriptReducer } from "@paypal/react-paypal-js";

export default function PaypalButton({
  getFormValues,
  triggerValidation,
  registerUser,
  planId,
}) {
  const [{ options }, dispatch] = usePayPalScriptReducer();

  useEffect(() => {
    if (options.intent !== "subscription") {
      dispatch({
        type: "resetOptions",
        value: {
          ...options,
          intent: "subscription",
        },
      });
    }
  }, [dispatch, options]);

  return (
    <PayPalButtons
      disabled={!planId}
      createSubscription={(data, actions) =>
        actions.subscription.create({
          plan_id: planId,
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
        layout: "vertical",
        shape: "pill",
        label: "subscribe",
      }}
    />
  );
}
