"use client";
import { useState, type FormEvent } from "react";
type Data = {
  payouts: Array<{
    id: string;
    tutor_user_id: string;
    credits: number;
    status: string;
    destination_reference: string;
    attempt_count: number;
    failure_reason: string | null;
  }>;
  destinations: Array<{
    id: string;
    tutor_user_id: string;
    masked_reference: string;
    provider: string;
  }>;
  refunds: Array<{
    id: string;
    booking_id: string;
    learner_user_id: string;
    credits: number;
    created_at: string;
  }>;
  tutors: Array<{ id: string; display_name: string; email: string }>;
  reconciliation: {
    clearingCredits: number;
    expectedClearingCredits: number;
    balanced: boolean;
  };
};
export function PayoutOperations({
  initial,
}: {
  initial: Data;
  viewerId: string;
}) {
  const [data, setData] = useState(initial);
  const [notice, setNotice] = useState("");
  const refresh = async () => {
    const response = await fetch("/api/admin/payouts", { cache: "no-store" });
    if (response.ok) setData((await response.json()) as Data);
  };
  const send = async (method: string, body: unknown) => {
    const response = await fetch("/api/admin/payouts", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = (await response.json()) as { error?: string };
    setNotice(
      response.ok
        ? "Operation recorded in the audit trail."
        : (payload.error ?? "Operation failed."),
    );
    if (response.ok) await refresh();
  };
  const destination = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    void send("POST", {
      action: "verifyDestination",
      tutorUserId: f.get("tutorUserId"),
      provider: f.get("provider"),
      maskedReference: f.get("maskedReference"),
      externalKycReference: f.get("externalKycReference"),
    });
  };
  const refund = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    void send("POST", {
      action: "refund",
      bookingId: f.get("bookingId"),
      learnerUserId: f.get("learnerUserId"),
      credits: Number(f.get("credits")),
      reason: f.get("reason"),
      idempotencyKey: crypto.randomUUID(),
    });
  };
  const transition = (payoutId: string, targetStatus: string) => {
    const providerReference =
      targetStatus === "paid"
        ? (window.prompt("Settlement reference") ?? "")
        : "";
    const reason = ["failed", "cancelled"].includes(targetStatus)
      ? (window.prompt("Reason") ?? "")
      : "";
    void send("PATCH", {
      action: "transition",
      payoutId,
      targetStatus,
      providerReference,
      reason,
    });
  };
  return (
    <>
      {notice && (
        <p role="status" className="notice">
          {notice}
        </p>
      )}
      <section
        className={
          data.reconciliation.balanced ? "reconcile good" : "reconcile bad"
        }
      >
        <strong>
          {data.reconciliation.balanced
            ? "Clearing reconciled"
            : "Reconciliation mismatch"}
        </strong>
        <span>
          Ledger {data.reconciliation.clearingCredits} · expected{" "}
          {data.reconciliation.expectedClearingCredits} credits
        </span>
      </section>
      <section className="ops-grid">
        <form onSubmit={destination}>
          <h2>Verify masked destination</h2>
          <select name="tutorUserId" required>
            <option value="">Select tutor</option>
            {data.tutors.map((t) => (
              <option key={t.id} value={t.id}>
                {t.display_name} · {t.email}
              </option>
            ))}
          </select>
          <select name="provider">
            <option value="manual_bank">Manual bank</option>
            <option value="manual_mobile_money">Manual mobile money</option>
          </select>
          <input name="maskedReference" placeholder="Bank •••• 1234" required />
          <input
            name="externalKycReference"
            placeholder="External KYC case reference"
            required
          />
          <button>Verify destination</button>
        </form>
        <form onSubmit={refund}>
          <h2>Record booking refund</h2>
          <input name="bookingId" placeholder="Booking UUID" required />
          <input name="learnerUserId" placeholder="Learner UUID" required />
          <input
            name="credits"
            type="number"
            min="1"
            placeholder="Credits"
            required
          />
          <textarea
            name="reason"
            minLength={5}
            placeholder="Audited reason"
            required
          />
          <button>Record refund</button>
        </form>
      </section>
      <section className="payout-list">
        <h2>Payout queue</h2>
        {data.payouts.map((p) => (
          <article key={p.id}>
            <div>
              <strong>
                {p.credits} credits · {p.destination_reference}
              </strong>
              <span>
                {p.status} · attempt {p.attempt_count}
              </span>
            </div>
            <small>Tutor {p.tutor_user_id}</small>
            <div className="actions">
              {p.status === "requested" && (
                <>
                  <button onClick={() => transition(p.id, "reviewing")}>
                    Review
                  </button>
                  <button onClick={() => transition(p.id, "cancelled")}>
                    Cancel
                  </button>
                </>
              )}
              {p.status === "reviewing" && (
                <>
                  <button onClick={() => transition(p.id, "processing")}>
                    Approve & process
                  </button>
                  <button onClick={() => transition(p.id, "cancelled")}>
                    Cancel
                  </button>
                </>
              )}
              {p.status === "processing" && (
                <>
                  <button onClick={() => transition(p.id, "paid")}>
                    Mark paid
                  </button>
                  <button onClick={() => transition(p.id, "failed")}>
                    Mark failed
                  </button>
                </>
              )}
              {p.status === "failed" && (
                <button onClick={() => transition(p.id, "processing")}>
                  Retry
                </button>
              )}
            </div>
          </article>
        ))}
        {!data.payouts.length && <p>No payout requests.</p>}
      </section>
    </>
  );
}
