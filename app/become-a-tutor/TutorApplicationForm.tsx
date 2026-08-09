"use client";

import { FormEvent, useState } from "react";

export function TutorApplicationForm() {
  const [submitted, setSubmitted] = useState(false);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
  };

  return (
    <form className="tutor-application-form" onSubmit={submit}>
      <div className="tutor-form-row">
        <label>Full name<input name="name" autoComplete="name" required /></label>
        <label>Email address<input name="email" type="email" autoComplete="email" required /></label>
      </div>
      <div className="tutor-form-row">
        <label>Teaching level<select name="level" defaultValue="" required><option value="" disabled>Choose a level</option><option>PSLE</option><option>JCE</option><option>BGCSE</option><option>More than one</option></select></label>
        <label>Strongest subject<input name="subject" placeholder="e.g. Mathematics" required /></label>
      </div>
      <button type="submit">Create a tutor profile <span aria-hidden="true">→</span></button>
      <p className="tutor-form-note">Demo application — no information is sent or stored.</p>
      {submitted && <p className="tutor-form-success" role="status">Your demo profile is ready to continue. We&apos;ll add the full onboarding flow next.</p>}
    </form>
  );
}
