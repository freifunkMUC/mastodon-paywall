import { useState } from "react";
import { useForm } from "react-hook-form";
import * as Yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import "bootstrap/dist/css/bootstrap.min.css";
import { PayPalScriptProvider } from "@paypal/react-paypal-js";
import PaypalButton from "./paypalButton";
import ClientOnly from "./ClientOnly";

export default function Form() {
  const validationSchema = Yup.object().shape({
    username: Yup.string()
      .required("Username is required")
      .min(4, "Username must be at least 4 characters")
      .max(20, "Username must not exceed 20 characters")
      .matches(
        /^[a-zA-Z0-9_]+$/,
        "Username must contain only letters, numbers, and underscores"
      ),
    email: Yup.string().required("Email is required").email("Email is invalid"),
    password: Yup.string()
      .required("Password is required")
      .min(8, "Password must be at least 8 characters"),
    confirmPassword: Yup.string()
      .required("Confirm Password is required")
      .oneOf([Yup.ref("password"), null], "Confirm Password does not match"),
    acceptTerms: Yup.bool().oneOf([true], "Accept Terms is required"),
  });

  const {
    register,
    trigger: triggerValidation,
    getValues: getFormValues,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(validationSchema),
  });

  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const registerUser = async (data) => {
    setError(null);
    setSuccess(null);
    try {
      const r = await fetch("/api/register", {
        method: "POST",
        body: JSON.stringify(data),
      });
      const d = await r.json();

      if (r.status === 200) {
        setSuccess("User wurde erfolgreich angelegt!");
      } else {
        setError(d.error || "An error occurred during registration.");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    }
  };

  return (
    <div className="register-form">
      {!success ? (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const isValid = await triggerValidation();
            if (isValid) {
              registerUser(getFormValues());
            }
          }}
        >
          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              {...register("username")}
              className={`form-control ${errors.username ? "is-invalid" : ""}`}
            />
            <div className="invalid-feedback">{errors.username?.message}</div>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              {...register("email")}
              className={`form-control ${errors.email ? "is-invalid" : ""}`}
            />
            <div className="invalid-feedback">{errors.email?.message}</div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              {...register("password")}
              className={`form-control ${errors.password ? "is-invalid" : ""}`}
            />
            <div className="invalid-feedback">{errors.password?.message}</div>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              {...register("confirmPassword")}
              className={`form-control ${
                errors.confirmPassword ? "is-invalid" : ""
              }`}
            />
            <div className="invalid-feedback">
              {errors.confirmPassword?.message}
            </div>
          </div>

          <div className="form-group form-check">
            <input
              id="acceptTerms"
              type="checkbox"
              {...register("acceptTerms")}
              className={`form-check-input ${
                errors.acceptTerms ? "is-invalid" : ""
              }`}
            />
            <label htmlFor="acceptTerms" className="form-check-label">
              I have read and agree to the Terms
            </label>
            <div className="invalid-feedback">
              {errors.acceptTerms?.message}
            </div>
          </div>

          {/* PayPal Button only client-side */}
          <ClientOnly>
            <PayPalScriptProvider
              options={{
                "client-id": process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID,
                components: "buttons",
                intent: "subscription",
                vault: true,
                currency: "EUR",
              }}
            >
              <PaypalButton
                getFormValues={getFormValues}
                triggerValidation={triggerValidation}
                registerUser={registerUser}
              />
            </PayPalScriptProvider>
          </ClientOnly>

          <button type="submit" className="btn-submit">
            Submit
          </button>
        </form>
      ) : (
        <div className="alert alert-success" role="alert">
          {success}
        </div>
      )}
    </div>
  );
}
