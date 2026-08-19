"use client";
import { useState, type FormEvent } from "react";
type Snapshot = {
  balances: {
    pendingCredits: number;
    availableCredits: number;
    paidCredits: number;
  };
  earnings: Array<{
    id: string;
    booking_id: string;
    status: string;
    gross_credits: number;
    platform_fee_credits: number;
    net_credits: number;
    refunded_credits: number;
    available_at: string | null;
  }>;
  payouts: Array<{
    id: string;
    status: string;
    credits: number;
    destination_reference: string;
    requested_at: string;
    failure_reason: string | null;
  }>;
  destinations: Array<{
    id: string;
    provider: string;
    masked_reference: string;
  }>;
};
export function EarningsClient({ initial }: { initial: Snapshot }) {
  const [data, setData] = useState(initial);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const refresh = async () => {
    const response = await fetch("/api/tutor/earnings", { cache: "no-store" });
    if (response.ok) setData((await response.json()) as Snapshot);
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/tutor/earnings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        destinationId: form.get("destinationId"),
        credits: Number(form.get("credits")),
        idempotencyKey: crypto.randomUUID(),
      }),
    });
    const body = (await response.json()) as { error?: string };
    setNotice(
      response.ok
        ? "Payout request reserved for administrator review."
        : (body.error ?? "Unable to request payout."),
    );
    if (response.ok) {
      event.currentTarget.reset();
      await refresh();
    }
    setSaving(false);
  };
  return (
    <>
      <section className="balance-grid">
        <article>
          <span>Pending / held</span>
          <strong>{data.balances.pendingCredits}</strong>
          <small>credits</small>
        </article>
        <article>
          <span>Available</span>
          <strong>{data.balances.availableCredits}</strong>
          <small>credits = BWP {data.balances.availableCredits}</small>
        </article>
        <article>
          <span>Paid</span>
          <strong>{data.balances.paidCredits}</strong>
          <small>credits</small>
        </article>
      </section>
      {notice && (
        <p role="status" className="notice">
          {notice}
        </p>
      )}
      <section className="earnings-panel">
        <h2>Request manual payout</h2>
        {data.destinations.length ? (
          <form onSubmit={submit}>
            <label>
              Verified destination
              <select name="destinationId" required>
                {data.destinations.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.provider.replaceAll("_", " ")} ·{" "}
                    {item.masked_reference}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Whole credits
              <input
                name="credits"
                type="number"
                min="100"
                max={data.balances.availableCredits}
                required
              />
            </label>
            <button disabled={saving || data.balances.availableCredits < 100}>
              {saving ? "Reserving…" : "Request payout"}
            </button>
          </form>
        ) : (
          <p>
            An administrator must verify a masked payout destination before you
            can request payment. Studacad never stores full bank or KYC details.
          </p>
        )}
      </section>
      <section className="earnings-panel">
        <h2>Itemized earnings</h2>
        <div className="rows">
          {data.earnings.map((item) => (
            <article key={item.id}>
              <div>
                <strong>Booking {item.booking_id.slice(0, 8)}</strong>
                <span>{item.status}</span>
              </div>
              <p>
                {item.gross_credits} gross − {item.platform_fee_credits} fee ={" "}
                {item.net_credits} net
                {item.refunded_credits
                  ? ` · ${item.refunded_credits} refunded`
                  : ""}
              </p>
              <small>
                {item.available_at
                  ? `Available after ${new Date(item.available_at).toLocaleString()}`
                  : "Awaiting outcome"}
              </small>
            </article>
          ))}
          {!data.earnings.length && <p>No completed lesson earnings yet.</p>}
        </div>
      </section>
      <section className="earnings-panel">
        <h2>Payout history</h2>
        <div className="rows">
          {data.payouts.map((item) => (
            <article key={item.id}>
              <div>
                <strong>{item.credits} credits</strong>
                <span>{item.status}</span>
              </div>
              <p>{item.destination_reference}</p>
              <small>
                {new Date(item.requested_at).toLocaleString()}
                {item.failure_reason ? ` · ${item.failure_reason}` : ""}
              </small>
            </article>
          ))}
          {!data.payouts.length && <p>No payout requests yet.</p>}
        </div>
      </section>
    </>
  );
}
