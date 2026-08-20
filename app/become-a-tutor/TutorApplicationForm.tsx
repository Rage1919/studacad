"use client";

import { FormEvent, useState } from "react";

const staticPreview =
  process.env.NEXT_PUBLIC_STUDACAD_STATIC_PREVIEW === "true";

export function TutorApplicationForm() {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  const continueToApplication = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (staticPreview) {
      setMessage(
        "Tutor applications require the secure server deployment and are unavailable in this static preview.",
      );
      return;
    }
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/me", { cache: "no-store" });
      window.location.assign(
        response.ok
          ? "/become-a-tutor/profile"
          : `/login?next=${encodeURIComponent("/become-a-tutor/profile")}`,
      );
    } catch {
      setMessage("Unable to reach Studacad. Please try again.");
      setPending(false);
    }
  };

  return (
    <form
      className="tutor-application-form"
      onSubmit={(event) => void continueToApplication(event)}
    >
      <p>
        Sign in to complete the private application, upload verification
        evidence, save your progress, and submit for review.
      </p>
      <button type="submit" disabled={pending || staticPreview}>
        {pending ? "Opening securely…" : "Continue to secure application"}{" "}
        <span aria-hidden="true">→</span>
      </button>
      <p className="tutor-form-note">
        Nothing is published until an authorised administrator approves the
        application.
      </p>
      {staticPreview && (
        <p className="tutor-form-error" role="status">
          Applications are available only on the secure server deployment.
        </p>
      )}
      {message && (
        <p className="tutor-form-error" role="alert">
          {message}
        </p>
      )}
    </form>
  );
}
