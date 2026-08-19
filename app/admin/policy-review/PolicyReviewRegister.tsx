"use client";
import { useState, type FormEvent } from "react";
type Data = {
  documents: Array<{
    key: string;
    version: string;
    title: string;
    effective_at: string;
    review_due_at: string;
  }>;
  reviews: Array<{
    id: string;
    policy_version: string;
    review_kind: string;
    reviewer_name: string;
    outcome: string;
    evidence_reference: string;
    next_review_at: string;
    created_at: string;
  }>;
};
export function PolicyReviewRegister({ initial }: { initial: Data }) {
  const [data, setData] = useState(initial);
  const [notice, setNotice] = useState("");
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/policies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(form)),
    });
    const body = (await response.json()) as { error?: string };
    setNotice(
      response.ok
        ? "Policy review attestation recorded immutably."
        : (body.error ?? "Unable to record review."),
    );
    if (response.ok) {
      const refreshed = await fetch("/api/admin/policies", {
        cache: "no-store",
      });
      if (refreshed.ok) setData((await refreshed.json()) as Data);
    }
  };
  return (
    <>
      {notice && (
        <p role="status" className="notice">
          {notice}
        </p>
      )}
      <section className="policy-current">
        <h2>Current documents</h2>
        {data.documents.map((item) => (
          <article key={item.key}>
            <strong>{item.title}</strong>
            <span>v{item.version}</span>
            <small>
              Review due{" "}
              {new Date(item.review_due_at).toLocaleDateString("en-BW")}
            </small>
          </article>
        ))}
      </section>
      <form onSubmit={submit}>
        <h2>Attest a completed review</h2>
        <label>
          Policy version
          <select name="version">
            {[...new Set(data.documents.map((item) => item.version))].map(
              (version) => (
                <option key={version}>{version}</option>
              ),
            )}
          </select>
        </label>
        <label>
          Review type
          <select name="kind">
            <option value="owner">Owner</option>
            <option value="legal">Legal</option>
            <option value="privacy">Privacy</option>
            <option value="safeguarding">Safeguarding</option>
            <option value="accessibility">Accessibility</option>
          </select>
        </label>
        <label>
          Reviewer name
          <input name="reviewer" required minLength={2} />
        </label>
        <label>
          Outcome
          <select name="outcome">
            <option value="approved">Approved</option>
            <option value="changes_required">Changes required</option>
          </select>
        </label>
        <label>
          Evidence reference
          <input
            name="evidence"
            required
            placeholder="Document, engagement, or case reference"
          />
        </label>
        <label>
          Next review
          <input name="nextReview" type="datetime-local" required />
        </label>
        <button>Record truthful attestation</button>
      </form>
      <section>
        <h2>Review history</h2>
        {data.reviews.map((item) => (
          <article key={item.id}>
            <strong>
              {item.review_kind} · {item.outcome}
            </strong>
            <span>{item.reviewer_name}</span>
            <small>
              {item.evidence_reference} · next{" "}
              {new Date(item.next_review_at).toLocaleDateString("en-BW")}
            </small>
          </article>
        ))}
        {!data.reviews.length && (
          <p>
            No reviews have been attested yet. This remains a go-live blocker.
          </p>
        )}
      </section>
    </>
  );
}
