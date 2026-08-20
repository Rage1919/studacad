"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { LmsHeader } from "../../components/LmsHeader";
import "./reports.css";

type Report = {
  id: string;
  messageId: string;
  conversationId: string;
  reason: string;
  status: string;
  createdAt: string;
  messagePreview: string;
};

export default function MessageReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [notice, setNotice] = useState("Loading reports…");
  const load = useCallback(async () => {
    const response = await fetch("/api/admin/message-reports", {
      cache: "no-store",
    });
    const payload = (await response.json()) as {
      reports?: Report[];
      error?: string;
    };
    if (!response.ok)
      throw new Error(payload.error ?? "Unable to load reports.");
    setReports(payload.reports ?? []);
    setNotice("");
  }, []);
  useEffect(() => {
    void load().catch((error) => setNotice(error.message));
  }, [load]);

  const review = async (
    report: Report,
    status: "reviewing" | "resolved" | "dismissed",
  ) => {
    const resolutionNote = window
      .prompt(
        "Add a private moderation note.",
        status === "resolved"
          ? "Content removed after review"
          : "Reviewed against community guidelines",
      )
      ?.trim();
    if (!resolutionNote) return;
    const response = await fetch("/api/admin/message-reports", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId: report.id, status, resolutionNote }),
    });
    const payload = (await response.json()) as { error?: string };
    setNotice(
      response.ok
        ? `Report marked ${status}.`
        : (payload.error ?? "Unable to update the report."),
    );
    if (response.ok) await load();
  };

  return (
    <main className="lms-page report-review-page">
      <LmsHeader />
      <section className="report-review-hero">
        <div>
          <p className="eyebrow">Privacy-aware moderation</p>
          <h1>Message reports</h1>
          <p>
            Review only reported content and its stated reason. Every decision
            is attributed and audited.
          </p>
        </div>
        <Link href="/admin">← Admin</Link>
      </section>
      <section className="report-review-list">
        {notice && <p role="status">{notice}</p>}
        {!notice && reports.length === 0 && <p>No reports need review.</p>}
        {reports.map((report) => (
          <article key={report.id}>
            <header>
              <span>{report.status}</span>
              <time>{new Date(report.createdAt).toLocaleString("en-BW")}</time>
            </header>
            <h2>{report.reason}</h2>
            <blockquote>{report.messagePreview}</blockquote>
            <footer>
              <button onClick={() => void review(report, "reviewing")}>
                Begin review
              </button>
              <button onClick={() => void review(report, "dismissed")}>
                Dismiss
              </button>
              <button
                className="remove"
                onClick={() => void review(report, "resolved")}
              >
                Resolve and remove
              </button>
            </footer>
          </article>
        ))}
      </section>
    </main>
  );
}
