"use client";

import { useEffect, useMemo, useState } from "react";
import type { TutorApplicationStatus } from "../../../server/db/models";
import type { TutorApplicationView } from "../../../server/tutor-onboarding/types";

const actions: Partial<Record<TutorApplicationStatus, Array<{ status: TutorApplicationStatus; label: string; tone?: string }>>> = {
  submitted: [{ status: "under_review", label: "Begin review" }],
  under_review: [
    { status: "changes_requested", label: "Request changes" },
    { status: "approved", label: "Approve and publish", tone: "approve" },
    { status: "rejected", label: "Reject", tone: "danger" }
  ],
  approved: [{ status: "suspended", label: "Suspend profile", tone: "danger" }],
  suspended: [{ status: "approved", label: "Restore profile", tone: "approve" }]
};

export function ReviewQueue() {
  const [applications, setApplications] = useState<TutorApplicationView[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [internalNote, setInternalNote] = useState("");
  const [applicantMessage, setApplicantMessage] = useState("");
  const [notice, setNotice] = useState("");

  const load = async () => {
    const response = await fetch("/api/admin/tutor-applications", { cache: "no-store" });
    const result = await response.json() as { applications?: TutorApplicationView[]; error?: string };
    if (!response.ok) throw new Error(result.error ?? "Unable to load the tutor review queue.");
    setApplications(result.applications ?? []);
    setSelectedId(current => current && result.applications?.some(item => item.id === current) ? current : result.applications?.[0]?.id ?? null);
  };

  useEffect(() => { void load().catch(error => setNotice(error.message)).finally(() => setLoading(false)); }, []);
  const selected = useMemo(() => applications.find(item => item.id === selectedId) ?? null, [applications, selectedId]);

  const transition = async (targetStatus: TutorApplicationStatus) => {
    if (!selected) return;
    if (["changes_requested", "rejected"].includes(targetStatus) && !applicantMessage.trim()) {
      setNotice("Add an applicant-facing explanation before this decision.");
      return;
    }
    if (!window.confirm(`Confirm ${targetStatus.replaceAll("_", " ")} for ${selected.applicantName ?? "this applicant"}?`)) return;
    setSubmitting(true); setNotice("");
    try {
      const response = await fetch(`/api/admin/tutor-applications/${selected.id}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetStatus, internalNote, applicantMessage })
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Unable to record the review decision.");
      setNotice(`Application moved to ${targetStatus.replaceAll("_", " ")}.`);
      setInternalNote(""); setApplicantMessage("");
      await load();
    } catch (error) { setNotice(error instanceof Error ? error.message : "Unable to record the review decision."); }
    finally { setSubmitting(false); }
  };

  if (loading) return <div className="review-empty">Loading the secure review queue…</div>;
  if (!applications.length) return <div className="review-empty"><strong>No tutor applications need review.</strong><span>Submitted applications will appear here.</span></div>;

  return <div className="review-layout">
    <aside className="review-list" aria-label="Tutor applications">
      {applications.map(application => <button key={application.id} className={application.id === selectedId ? "active" : ""} onClick={() => { setSelectedId(application.id); setNotice(""); }}>
        <span>{application.status.replaceAll("_", " ")}</span><strong>{application.applicantName}</strong><small>{application.payload.subjects.join(", ") || "No subjects"} · updated {new Date(application.updatedAt).toLocaleDateString("en-BW")}</small>
      </button>)}
    </aside>
    {selected && <section className="review-detail">
      <header><div><p className="eyebrow">Application version {selected.version}</p><h2>{selected.applicantName}</h2><p>{selected.applicantEmail} · {selected.payload.phone}</p></div><span className={`review-status ${selected.status}`}>{selected.status.replaceAll("_", " ")}</span></header>
      <div className="review-security-note"><strong>Confidential reviewer workspace</strong><span>Identity evidence must not be downloaded, copied, or shared outside the verification process.</span></div>
      <div className="review-facts">
        <div><span>Location</span><strong>{selected.payload.town}, {selected.payload.district}</strong></div>
        <div><span>Experience</span><strong>{selected.payload.teachingExperience}</strong></div>
        <div><span>Rate</span><strong>{selected.payload.basePriceCredits} credits</strong></div>
        <div><span>Formats</span><strong>{selected.payload.formats.map(item => item.replaceAll("_", " ")).join(", ")}</strong></div>
      </div>
      <article><h3>{selected.payload.headline}</h3><p>{selected.payload.biography}</p></article>
      <div className="review-evidence"><h3>Subjects and evidence</h3><p><strong>{selected.payload.levels.join(", ")}</strong> · {selected.payload.subjects.join(", ")}</p><p>{selected.payload.qualification} · {selected.payload.institution}</p><div>{selected.documents.map(document => <a key={document.fileId} href={`/api/tutor-applications/documents/${document.fileId}`} target="_blank" rel="noreferrer">{document.documentType.replaceAll("_", " ")} <span>{document.scanStatus}</span></a>)}</div></div>
      <div className="review-notes"><label>Internal note<textarea rows={4} value={internalNote} onChange={event => setInternalNote(event.target.value)} placeholder="Visible only to authorized administrators" /></label><label>Message to applicant<textarea rows={4} value={applicantMessage} onChange={event => setApplicantMessage(event.target.value)} placeholder="Required when requesting changes or rejecting" /></label></div>
      {notice && <p className="review-notice" role="status">{notice}</p>}
      <footer>{(actions[selected.status] ?? []).map(action => <button key={action.status} className={action.tone ?? ""} disabled={submitting} onClick={() => void transition(action.status)}>{submitting ? "Recording…" : action.label}</button>)}</footer>
    </section>}
  </div>;
}
