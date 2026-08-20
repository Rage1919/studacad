"use client";

import { FormEvent, useState } from "react";

type FormState = {
  learnerEmail: string;
  amountBwp: string;
  depositReference: string;
  idempotencyKey: string;
};

const blankForm = (): FormState => ({
  learnerEmail: "",
  amountBwp: "",
  depositReference: "",
  idempotencyKey: crypto.randomUUID()
});

export function VerifiedDepositForm() {
  const [form, setForm] = useState<FormState>(() => blankForm());
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const amount = Number(form.amountBwp);
    if (!window.confirm(`Confirm that ${amount.toLocaleString()} BWP was received for ${form.learnerEmail}? This will issue ${amount.toLocaleString()} credits.`)) return;
    setSubmitting(true);
    setNotice("");
    try {
      const response = await fetch("/api/admin/wallet/deposits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, amountBwp: amount })
      });
      const result = await response.json().catch(() => null) as { error?: string; credits?: number; learner?: { displayName: string }; transactionId?: string } | null;
      if (!response.ok) throw new Error(result?.error ?? "Unable to record the deposit.");
      setNotice(`${result?.credits?.toLocaleString()} credits issued to ${result?.learner?.displayName}. Transaction ${result?.transactionId}.`);
      setForm(blankForm());
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to record the deposit.");
    } finally {
      setSubmitting(false);
    }
  };

  return <form className="admin-form verified-deposit-form" onSubmit={submit}>
    <div className="deposit-warning"><strong>Verify before posting</strong><span>This action creates immutable ledger entries and an audit record. It does not move money.</span></div>
    <label>Learner account email<input type="email" required autoComplete="off" value={form.learnerEmail} onChange={event => setForm({ ...form, learnerEmail: event.target.value })} placeholder="learner@example.com" /></label>
    <div className="field-grid">
      <label>Amount received (BWP)<input type="number" min="1" max="1000000" step="1" required value={form.amountBwp} onChange={event => setForm({ ...form, amountBwp: event.target.value })} /></label>
      <label>Credits to issue<input value={form.amountBwp || "0"} readOnly aria-describedby="credit-parity-note" /></label>
    </div>
    <small id="credit-parity-note">Whole BWP only. The server enforces one credit for each BWP.</small>
    <label>Verified deposit reference<input minLength={4} maxLength={100} required value={form.depositReference} onChange={event => setForm({ ...form, depositReference: event.target.value })} placeholder="Bank statement or receipt reference" /></label>
    <label>Idempotency key<input minLength={8} maxLength={100} required value={form.idempotencyKey} onChange={event => setForm({ ...form, idempotencyKey: event.target.value })} /><small>Keep this unchanged when retrying the same deposit.</small></label>
    <button className="primary" type="submit" disabled={submitting}>{submitting ? "Recording…" : "Record verified deposit"}</button>
    {notice && <p className="deposit-notice" role="status">{notice}</p>}
  </form>;
}
