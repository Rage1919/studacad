"use client";
import { useState } from "react";
type Data = {
  cases: Array<{
    id: string;
    case_number: string;
    requester_user_id: string;
    category: string;
    subject: string;
    status: string;
    priority: string;
    assigned_to_user_id: string | null;
    response_due_at: string;
  }>;
  messages: Array<{
    id: string;
    support_case_id: string;
    author_user_id: string;
    body: string;
    internal: boolean;
    created_at: string;
  }>;
  reports: Array<{
    id: string;
    support_case_id: string;
    status: string;
    reason: string;
  }>;
  accounts: Array<{ id: string; display_name: string; email: string }>;
};
export function SupportOperations({
  initial,
  viewerId,
}: {
  initial: Data;
  viewerId: string;
}) {
  const [data, setData] = useState(initial);
  const [notice, setNotice] = useState("");
  const refresh = async () => {
    const response = await fetch("/api/admin/support", { cache: "no-store" });
    if (response.ok) setData((await response.json()) as Data);
  };
  const send = async (body: unknown) => {
    const response = await fetch("/api/admin/support", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = (await response.json()) as { error?: string };
    setNotice(
      response.ok
        ? "Support action audited."
        : (payload.error ?? "Unable to update case."),
    );
    if (response.ok) await refresh();
  };
  const update = (item: Data["cases"][number]) => {
    const status = window
      .prompt(
        "Status: open, triaged, waiting_on_user, resolved, closed",
        item.status,
      )
      ?.trim();
    if (!status) return;
    const priority = window
      .prompt("Priority: urgent, high, normal, low", item.priority)
      ?.trim();
    if (!priority) return;
    const note =
      window.prompt("Public reply or resolution note (optional)") ?? "";
    void send({
      caseId: item.id,
      status,
      priority,
      assigneeId: item.assigned_to_user_id ?? viewerId,
      note,
    });
  };
  const message = (caseId: string, internal: boolean) => {
    const text = window
      .prompt(internal ? "Private administrator note" : "Reply to requester")
      ?.trim();
    if (text) void send({ action: "message", caseId, message: text, internal });
  };
  return (
    <>
      {notice && (
        <p role="status" className="notice">
          {notice}
        </p>
      )}
      <section className="support-queue">
        {data.cases.map((item) => (
          <article
            key={item.id}
            className={item.priority === "urgent" ? "urgent" : ""}
          >
            <header>
              <div>
                <strong>
                  {item.case_number} · {item.subject}
                </strong>
                <small>
                  {item.category} · requester {item.requester_user_id}
                </small>
              </div>
              <span>
                {item.priority} · {item.status}
              </span>
            </header>
            <p>
              Response due{" "}
              {new Date(item.response_due_at).toLocaleString("en-BW")}
            </p>
            <div className="thread">
              {data.messages
                .filter((message) => message.support_case_id === item.id)
                .map((entry) => (
                  <p
                    key={entry.id}
                    className={entry.internal ? "internal" : ""}
                  >
                    {entry.body}
                    <small>
                      {entry.internal
                        ? "Internal note"
                        : "Visible to requester"}{" "}
                      · {new Date(entry.created_at).toLocaleString("en-BW")}
                    </small>
                  </p>
                ))}
            </div>
            <footer>
              <button onClick={() => update(item)}>Triage / resolve</button>
              <button onClick={() => message(item.id, false)}>
                Public reply
              </button>
              <button onClick={() => message(item.id, true)}>
                Internal note
              </button>
            </footer>
          </article>
        ))}
        {!data.cases.length && <p>No support cases.</p>}
      </section>
    </>
  );
}
