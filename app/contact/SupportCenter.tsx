"use client";
import { useState, type FormEvent } from "react";
type Data = {
  cases: Array<{
    id: string;
    case_number: string;
    category: string;
    subject: string;
    status: string;
    priority: string;
    response_due_at: string;
    created_at: string;
  }>;
  messages: Array<{
    id: string;
    support_case_id: string;
    body: string;
    created_at: string;
  }>;
};
export function SupportCenter({ initial }: { initial: Data }) {
  const [data, setData] = useState(initial);
  const [notice, setNotice] = useState("");
  const refresh = async () => {
    const response = await fetch("/api/support", { cache: "no-store" });
    if (response.ok) setData((await response.json()) as Data);
  };
  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(form)),
    });
    const body = (await response.json()) as {
      caseNumber?: string;
      error?: string;
    };
    setNotice(
      response.ok
        ? `Case ${body.caseNumber} created. Save this reference.`
        : (body.error ?? "Unable to create case."),
    );
    if (response.ok) {
      event.currentTarget.reset();
      await refresh();
    }
  };
  const reply = async (caseId: string) => {
    const message = window.prompt("Add information to this case")?.trim();
    if (!message) return;
    const response = await fetch("/api/support", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caseId, message }),
    });
    const body = (await response.json()) as { error?: string };
    setNotice(
      response.ok ? "Reply added." : (body.error ?? "Unable to reply."),
    );
    if (response.ok) await refresh();
  };
  return (
    <>
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      <form className="support-form" onSubmit={create}>
        <h2>Open a support case</h2>
        <label>
          Category
          <select name="category" required>
            <option value="account">Account</option>
            <option value="booking">Booking or lesson</option>
            <option value="payment">Credits, payment, or refund</option>
            <option value="tutor">Tutor conduct</option>
            <option value="safety">Urgent safety concern</option>
            <option value="privacy">Privacy or data rights</option>
            <option value="accessibility">Accessibility barrier</option>
            <option value="technical">Technical issue</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label>
          Subject
          <input name="subject" minLength={5} maxLength={150} required />
        </label>
        <label>
          Booking ID (optional)
          <input
            name="bookingId"
            placeholder="Only if this case concerns a booking"
          />
        </label>
        <label>
          What happened?
          <textarea
            name="message"
            minLength={10}
            maxLength={5000}
            rows={7}
            required
          />
        </label>
        <button>Create private case</button>
        <small>
          Safety cases receive urgent priority and target a four-hour initial
          response. This is not an emergency service.
        </small>
      </form>
      <section className="case-list">
        <h2>Your cases</h2>
        {data.cases.map((item) => (
          <article key={item.id}>
            <header>
              <strong>
                {item.case_number} · {item.subject}
              </strong>
              <span>{item.status}</span>
            </header>
            <small>
              {item.category} · response target{" "}
              {new Date(item.response_due_at).toLocaleString("en-BW")}
            </small>
            {data.messages
              .filter((message) => message.support_case_id === item.id)
              .map((message) => (
                <p key={message.id}>
                  {message.body}
                  <time>
                    {new Date(message.created_at).toLocaleString("en-BW")}
                  </time>
                </p>
              ))}
            {!["resolved", "closed"].includes(item.status) && (
              <button onClick={() => void reply(item.id)}>
                Add information
              </button>
            )}
          </article>
        ))}
        {!data.cases.length && <p>No support cases yet.</p>}
      </section>
    </>
  );
}
