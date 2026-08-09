"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

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
      {submitted && (
        <div className="tutor-form-success" role="status">
          <span>Your starter profile is ready. Complete the remaining details to continue.</span>
          <Link href="/become-a-tutor/profile">Continue profile <span aria-hidden="true">→</span></Link>
        </div>
      )}
    </form>
  );
}
