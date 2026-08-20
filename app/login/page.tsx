"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import "./login.css";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [next, setNext] = useState("/account");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const staticPreview = process.env.NEXT_PUBLIC_STUDACAD_STATIC_PREVIEW === "true";

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setNext(params.get("next") || "/account");
    const error = params.get("error");
    if (error) setMessage("That sign-in link is invalid or expired. Request a new one below.");
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
        body: JSON.stringify({ email, next })
      });
      const result = await response.json() as { message?: string; error?: string };
      setMessage(result.message ?? result.error ?? "Unable to request a sign-in link.");
    } catch {
      setMessage("Unable to reach Studacad. Please try again.");
    } finally {
      setPending(false);
    }
  };

  return <main className="auth-page">
    <section className="auth-card">
      <Link className="auth-brand" href="/">Studacad</Link>
      <p className="eyebrow">One secure account</p>
      <h1>Sign in to Studacad</h1>
      <p>Enter your email and we&apos;ll send a one-time secure link. The same flow creates a new learner account after email verification.</p>
      <form onSubmit={submit}>
        <label htmlFor="auth-email">Email address</label>
        <input id="auth-email" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" />
        <button className="primary" type="submit" disabled={pending || staticPreview}>{pending ? "Sending…" : "Email me a secure link"}</button>
      </form>
      {staticPreview && <p className="auth-notice">Account sign-in is available on the server deployment, not this static preview.</p>}
      {message && <p className="auth-notice" role="status">{message}</p>}
      <small>No password to remember. Links are single-use and expire according to the authentication policy.</small>
    </section>
  </main>;
}
