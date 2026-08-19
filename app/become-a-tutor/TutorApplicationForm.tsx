"use client";

import { FormEvent, useState } from "react";

const staticPreview = process.env.NEXT_PUBLIC_STUDACAD_STATIC_PREVIEW === "true";

export function TutorApplicationForm() {
  const [legalName, setLegalName] = useState("");
  const [level, setLevel] = useState("PSLE");
  const [subject, setSubject] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [message, setMessage] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (staticPreview) {
      setStatus("error");
      setMessage("Tutor applications are available on the secure server deployment, not this static preview.");
      return;
    }
    setStatus("saving");
    setMessage("");
    try {
      const response = await fetch("/api/tutor-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId: null,
          payload: {
            legalName, levels: [level], subjects: [subject], phone: "", district: "", town: "", headline: "",
            biography: "", teachingExperience: "", qualification: "", institution: "", languages: "", formats: [],
            basePriceCredits: 0, sessionDurationMinutes: 60, days: [], startTime: "16:00", endTime: "19:00", consent: false
          }
        })
      });
      if (response.status === 401) {
        window.location.assign(`/login?next=${encodeURIComponent("/become-a-tutor/profile")}`);
        return;
      }
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok && response.status !== 409) throw new Error(result.error ?? "Unable to create your tutor application.");
      window.location.assign("/become-a-tutor/profile");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Unable to create your tutor application.");
    }
  };

  return (
    <form className="tutor-application-form" onSubmit={event => void submit(event)}>
      <div className="tutor-form-row">
        <label>Full legal name<input autoComplete="name" value={legalName} onChange={event => setLegalName(event.target.value)} required /></label>
        <label>Teaching level<select value={level} onChange={event => setLevel(event.target.value)} required><option>PSLE</option><option>JCE</option><option>BGCSE</option></select></label>
      </div>
      <label>Strongest subject<input value={subject} onChange={event => setSubject(event.target.value)} placeholder="e.g. Mathematics" required /></label>
      <button type="submit" disabled={status === "saving"}>{status === "saving" ? "Saving securely…" : "Create a tutor application"} <span aria-hidden="true">→</span></button>
      <p className="tutor-form-note">Sign in is required. Your draft is saved privately to your Studacad account.</p>
      {status === "error" && <p className="tutor-form-error" role="alert">{message}</p>}
    </form>
  );
}
