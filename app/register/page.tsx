"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- Vinext's current Sites link interceptor prevents these authentication navigations in production. */

import { FormEvent, useEffect, useState } from "react";

export default function RegisterPage() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [next, setNext] = useState("/account");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [acceptPolicies, setAcceptPolicies] = useState(false);
  const staticPreview =
    process.env.NEXT_PUBLIC_STUDACAD_STATIC_PREVIEW === "true";

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setNext(params.get("next") || "/account");
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (staticPreview) return;
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          email,
          next,
          mode: "register",
          acceptPolicies,
        }),
      });
      const result = (await response.json()) as {
        message?: string;
        error?: string;
      };
      setMessage(
        result.message ?? result.error ?? "Unable to start registration.",
      );
    } catch {
      setMessage("Unable to reach Studacad. Please try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <a className="auth-brand" href="/">
          Studacad
        </a>
        <p className="eyebrow">Create your learner account</p>
        <h1>Register for Studacad</h1>
        <p>
          Add your details, accept the platform policies, and confirm your email
          to activate your account.
        </p>
        <form onSubmit={submit}>
          <label htmlFor="register-name">Full name</label>
          <input
            id="register-name"
            type="text"
            autoComplete="name"
            minLength={2}
            maxLength={80}
            required
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Your full name"
          />
          <label htmlFor="register-email">Email address</label>
          <input
            id="register-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
          />
          <label className="policy-accept">
            <input
              type="checkbox"
              checked={acceptPolicies}
              onChange={(event) => setAcceptPolicies(event.target.checked)}
              required
            />
            <span>
              I accept the current{" "}
              <a href="/terms" target="_blank">
                Terms
              </a>{" "}
              and acknowledge the{" "}
              <a href="/privacy" target="_blank">
                Privacy Notice
              </a>
              . A guardian should supervise an account where required.
            </span>
          </label>
          <button
            className="primary"
            type="submit"
            disabled={pending || staticPreview}
          >
            {pending ? "Sending…" : "Send my confirmation link"}
          </button>
        </form>
        {staticPreview && (
          <p className="auth-notice">
            Registration is available on the server deployment, not this static
            preview.
          </p>
        )}
        {message && (
          <p className="auth-notice" role="status">
            {message}
          </p>
        )}
        <small>
          Already registered? <a href="/login">Log in</a>.
        </small>
      </section>
    </main>
  );
}
