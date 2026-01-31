import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import * as Yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { PayPalScriptProvider } from "@paypal/react-paypal-js";

import PaypalButton from "./paypalButton";

export default function Form() {
  const validationSchema = Yup.object().shape({
    username: Yup.string()
      .required("Username is required")
      .min(4, "Username must be at least 4 characters")
      .max(20, "Username must not exceed 20 characters")
      .matches(
        /^[a-zA-Z0-9_]+$/,
        "Username must contain only letters, numbers, and underscores",
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPayPalReady, setIsPayPalReady] = useState(false);
  const [config, setConfig] = useState(null);
  const [configError, setConfigError] = useState(null);

  const describedBy = (name, hasError) =>
    hasError ? `${name}-help ${name}-error` : `${name}-help`;

  useEffect(() => {
    let isMounted = true;

    const loadConfig = async () => {
      try {
        const response = await fetch("/api/public-config");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to load configuration.");
        }

        if (isMounted) {
          setConfig(data);
        }
      } catch (err) {
        if (isMounted) {
          setConfigError(err.message || "Failed to load configuration.");
        }
      }
    };

    loadConfig();

    return () => {
      isMounted = false;
    };
  }, []);

  const registerUser = async (data) => {
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);
    try {
      const r = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="register-form">
      {!success ? (
        <form
          className="form"
          noValidate
          onFocusCapture={() => setIsPayPalReady(true)}
        >
          {error && (
            <div className="alert alert-error" role="alert">
              {error}
            </div>
          )}
          {isSubmitting && (
            <div className="alert alert-info" role="status">
              Creating your account…
            </div>
          )}
          {configError && (
            <div className="alert alert-error" role="alert">
              {configError}
            </div>
          )}
          {!isPayPalReady && (
            <div className="alert alert-info" role="status">
              Start filling out the form to load PayPal checkout.
            </div>
          )}
          <div className="field">
            <label htmlFor="username" className="label">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              disabled={isSubmitting}
              aria-invalid={Boolean(errors.username)}
              aria-describedby={describedBy(
                "username",
                Boolean(errors.username),
              )}
              {...register("username")}
              className="input"
            />
            <p id="username-help" className="helper">
              4–20 characters, letters, numbers, or underscore.
            </p>
            {errors.username && (
              <p id="username-error" className="error-text" role="alert">
                {errors.username.message}
              </p>
            )}
          </div>

          <div className="field">
            <label htmlFor="email" className="label">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              disabled={isSubmitting}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={describedBy("email", Boolean(errors.email))}
              {...register("email")}
              className="input"
            />
            <p id="email-help" className="helper">
              We only use this for account access.
            </p>
            {errors.email && (
              <p id="email-error" className="error-text" role="alert">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="field">
            <label htmlFor="password" className="label">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              disabled={isSubmitting}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={describedBy(
                "password",
                Boolean(errors.password),
              )}
              {...register("password")}
              className="input"
            />
            <p id="password-help" className="helper">
              Use at least 8 characters.
            </p>
            {errors.password && (
              <p id="password-error" className="error-text" role="alert">
                {errors.password.message}
              </p>
            )}
          </div>
          <div className="field">
            <label htmlFor="confirmPassword" className="label">
              Confirm password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              disabled={isSubmitting}
              aria-invalid={Boolean(errors.confirmPassword)}
              aria-describedby={describedBy(
                "confirm",
                Boolean(errors.confirmPassword),
              )}
              {...register("confirmPassword")}
              className="input"
            />
            <p id="confirm-help" className="helper">
              Re-enter your password.
            </p>
            {errors.confirmPassword && (
              <p id="confirm-error" className="error-text" role="alert">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <div className="checkbox">
            <input
              id="acceptTerms"
              name="acceptTerms"
              type="checkbox"
              disabled={isSubmitting}
              aria-invalid={Boolean(errors.acceptTerms)}
              aria-describedby={describedBy(
                "terms",
                Boolean(errors.acceptTerms),
              )}
              {...register("acceptTerms")}
            />
            <div>
              <label htmlFor="acceptTerms" className="label">
                I have read and agree to the Terms
              </label>
              <p id="terms-help" className="helper">
                Your subscription starts after PayPal checkout.
              </p>
              {errors.acceptTerms && (
                <p id="terms-error" className="error-text" role="alert">
                  {errors.acceptTerms.message}
                </p>
              )}
            </div>
          </div>
          {config ? (
            <PayPalScriptProvider
              options={{
                "client-id": config.paypalClientId,
                components: "buttons",
                intent: "subscription",
                vault: true,
                currency: "EUR",
              }}
              deferLoading={!isPayPalReady}
            >
              <div className="paypal-wrapper">
                <PaypalButton
                  getFormValues={getFormValues}
                  triggerValidation={triggerValidation}
                  registerUser={registerUser}
                  planId={config.paypalPlanId}
                />
              </div>
            </PayPalScriptProvider>
          ) : (
            <div className="alert alert-info" role="status">
              Loading PayPal configuration…
            </div>
          )}
        </form>
      ) : (
        <div className="success-card" role="status">
          <h3>Account created 🎉</h3>
          <p>{success}</p>
          <p>
            You can now sign in at{" "}
            <a href="https://social.ffmuc.net" target="_blank" rel="noreferrer">
              social.ffmuc.net
            </a>
            .
          </p>
          <p className="helper">
            If you ever need a password reset, use the Mastodon login screen.
          </p>
        </div>
      )}
    </div>
  );
}
