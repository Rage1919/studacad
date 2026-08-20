"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import type { SessionFormat } from "../../../server/db/models";
import type { TutorApplicationPayload, TutorApplicationView } from "../../../server/tutor-onboarding/types";

const steps = ["About you", "Teaching", "Lessons", "Verification"];
const subjects = ["Mathematics", "English", "Setswana", "Integrated Science", "Biology", "Chemistry", "Physics", "Accounting", "Business Studies", "Geography"];
const levels = ["PSLE", "JCE", "BGCSE"] as const;
const formats: Array<{ value: SessionFormat; label: string }> = [
  { value: "online_1to1", label: "Online private" },
  { value: "online_group", label: "Online group" },
  { value: "tutor_place", label: "At my location" },
  { value: "student_place", label: "At the learner's location" }
];
const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const staticPreview = process.env.NEXT_PUBLIC_STUDACAD_STATIC_PREVIEW === "true";

const blankProfile: TutorApplicationPayload = {
  legalName: "", phone: "", district: "", town: "", headline: "", biography: "", teachingExperience: "",
  qualification: "", institution: "", subjects: [], levels: [], formats: [], languages: "", basePriceCredits: 0,
  sessionDurationMinutes: 60, days: [], startTime: "16:00", endTime: "19:00", consent: false
};

const statusCopy: Record<string, { title: string; body: string }> = {
  submitted: { title: "Application submitted", body: "Your documents passed the upload checks and your application is waiting for an administrator to begin review." },
  under_review: { title: "Review in progress", body: "A Studacad administrator is checking your application and verification evidence." },
  approved: { title: "Your tutor profile is approved", body: "Your verified profile is live in the tutor marketplace. Proposed edits create a new review version while the approved profile remains visible." },
  rejected: { title: "Application not approved", body: "Review the administrator's explanation below. You may start a new application with corrected evidence." },
  suspended: { title: "Tutor profile suspended", body: "Your public profile and booking access are paused. Contact Studacad support about the review decision." },
  withdrawn: { title: "Application withdrawn", body: "This application is closed. You may start another application when you are ready." }
};

export function TutorProfileForm() {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<TutorApplicationPayload>(blankProfile);
  const [application, setApplication] = useState<TutorApplicationView | null>(null);
  const [files, setFiles] = useState<Partial<Record<"profile_image" | "qualification" | "identity", File>>>({});
  const [loading, setLoading] = useState(!staticPreview);
  const [saving, setSaving] = useState(false);
  const [sectionError, setSectionError] = useState("");
  const [notice, setNotice] = useState("");

  const loadApplication = async () => {
    const response = await fetch("/api/tutor-applications", { cache: "no-store" });
    if (response.status === 401) {
      window.location.assign(`/login?next=${encodeURIComponent("/become-a-tutor/profile")}`);
      return;
    }
    const result = await response.json() as { application?: TutorApplicationView | null; error?: string };
    if (!response.ok) throw new Error(result.error ?? "Unable to load your tutor application.");
    setApplication(result.application ?? null);
    if (result.application) setProfile(result.application.payload);
  };

  useEffect(() => {
    if (staticPreview) return;
    void loadApplication().catch(error => setSectionError(error instanceof Error ? error.message : "Unable to load your tutor application.")).finally(() => setLoading(false));
  }, []);

  const update = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const value = event.target.type === "number" ? Number(event.target.value) : event.target.value;
    setProfile(current => ({ ...current, [event.target.name]: value }));
  };

  const toggle = (field: "subjects" | "levels" | "formats" | "days", value: string) => {
    setSectionError("");
    setProfile(current => {
      const currentValues = current[field] as string[];
      return { ...current, [field]: currentValues.includes(value) ? currentValues.filter(item => item !== value) : [...currentValues, value] };
    });
  };

  const saveDraft = async (payload = profile) => {
    const response = await fetch("/api/tutor-applications", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationId: application?.editable ? application.id : null, payload })
    });
    const result = await response.json() as { application?: TutorApplicationView; error?: string };
    if (!response.ok || !result.application) throw new Error(result.error ?? "Unable to save your application.");
    setApplication(result.application);
    setProfile(result.application.payload);
    return result.application;
  };

  const uploadSelectedDocuments = async (applicationId: string) => {
    for (const documentType of ["profile_image", "qualification", "identity"] as const) {
      const file = files[documentType];
      if (!file) continue;
      const body = new FormData();
      body.set("documentType", documentType);
      body.set("file", file);
      const response = await fetch(`/api/tutor-applications/${applicationId}/documents`, { method: "POST", body });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? `Unable to upload ${documentType.replaceAll("_", " ")}.`);
    }
  };

  const updateStatus = async (applicationId: string, targetStatus: "submitted" | "withdrawn" = "submitted") => {
    const response = await fetch(`/api/tutor-applications/${applicationId}/submit`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetStatus })
    });
    const result = await response.json() as { error?: string };
    if (!response.ok) throw new Error(result.error ?? "Unable to update the application.");
    await loadApplication();
  };

  const next = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (step === 1 && (!profile.levels.length || !profile.subjects.length)) return setSectionError("Select at least one exam level and one subject to continue.");
    if (step === 2 && (!profile.formats.length || !profile.days.length)) return setSectionError("Select at least one lesson format and one available day to continue.");
    setSaving(true); setSectionError(""); setNotice("");
    try {
      if (step < steps.length - 1) {
        await saveDraft({ ...profile, consent: false });
        setStep(current => current + 1); setNotice("Draft saved securely.");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      const existingTypes = new Set(application?.documents.filter(item => item.scanStatus === "clean").map(item => item.documentType) ?? []);
      const missing = (["profile_image", "qualification", "identity"] as const).filter(type => !existingTypes.has(type) && !files[type]);
      if (missing.length) throw new Error(`Add your ${missing[0].replaceAll("_", " ")} before submitting.`);
      const saved = await saveDraft({ ...profile, consent: true });
      await uploadSelectedDocuments(saved.id);
      await updateStatus(saved.id);
      setFiles({}); setNotice("Application submitted for review.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setSectionError(error instanceof Error ? error.message : "Unable to save your application.");
    } finally { setSaving(false); }
  };

  if (staticPreview) return <section className="onboarding-complete"><p className="onboarding-eyebrow">Static preview</p><h1>Tutor applications require the secure Studacad server</h1><p>Open the production site to sign in, save a draft, upload verification documents, and submit for review.</p></section>;
  if (loading) return <section className="onboarding-complete"><p>Loading your secure tutor application…</p></section>;

  const status = application?.status;
  const lockedCopy = status ? statusCopy[status] : null;
  if (application && lockedCopy && !application.editable) {
    return <section className="onboarding-complete" aria-live="polite">
      <div className="onboarding-complete-mark" aria-hidden="true">{status === "approved" ? "✓" : "i"}</div>
      <p className="onboarding-eyebrow">Application version {application.version} · {application.status.replaceAll("_", " ")}</p>
      <h1>{lockedCopy.title}</h1><p>{lockedCopy.body}</p>
      {application.latestApplicantMessage && <div className="onboarding-status-message"><strong>Message from Studacad</strong><p>{application.latestApplicantMessage}</p></div>}
      <div className="onboarding-review-grid">
        <div><span>Subjects</span><strong>{application.payload.subjects.length} selected</strong></div>
        <div><span>Documents</span><strong>{application.documents.filter(item => item.scanStatus === "clean").length} verified uploads</strong></div>
        <div><span>Lesson rate</span><strong>{application.payload.basePriceCredits} credits</strong></div>
        <div><span>Last updated</span><strong>{new Date(application.updatedAt).toLocaleDateString("en-BW")}</strong></div>
      </div>
      {(status === "submitted" || status === "under_review") && <button type="button" className="onboarding-secondary" disabled={saving} onClick={() => { setSaving(true); void updateStatus(application.id, "withdrawn").catch(error => setSectionError(error.message)).finally(() => setSaving(false)); }}>{saving ? "Updating…" : "Withdraw application"}</button>}
      {status === "approved" && <button type="button" className="onboarding-primary" onClick={() => { setApplication(null); setStep(0); setNotice("Your approved profile remains live until these proposed edits pass review."); }}>Propose profile updates</button>}
      {(status === "rejected" || status === "withdrawn") && <button type="button" className="onboarding-primary" onClick={() => { setApplication(null); setProfile(blankProfile); setFiles({}); setStep(0); }}>Start a new application</button>}
      {sectionError && <p className="onboarding-form-error" role="alert">{sectionError}</p>}
    </section>;
  }

  return <div className="tutor-onboarding-layout">
    <aside className="onboarding-progress-card">
      <p className="onboarding-eyebrow">Tutor application</p><h2>Build a profile learners can trust</h2>
      {status === "changes_requested" && <div className="onboarding-status-message"><strong>Changes requested</strong><p>{application?.latestApplicantMessage ?? "Update the requested details and resubmit the same application."}</p></div>}
      <ol>{steps.map((title, index) => <li className={index === step ? "active" : index < step ? "complete" : ""} key={title}><button type="button" disabled={index > step || saving} onClick={() => { setStep(index); setSectionError(""); }}><span>{index < step ? "✓" : index + 1}</span><span><strong>{title}</strong></span></button></li>)}</ol>
      <div className="onboarding-help-card"><strong>Private by default</strong><p>Identity and qualification files are malware-scanned and kept in protected storage for authorized review only.</p></div>
    </aside>

    <form className="onboarding-form-card" onSubmit={event => void next(event)}>
      <div className="onboarding-form-heading"><span>Step {step + 1} of {steps.length}</span><div><i style={{ width: `${((step + 1) / steps.length) * 100}%` }} /></div></div>
      {step === 0 && <fieldset>
        <legend>Tell learners about you</legend><p className="onboarding-section-intro">Use your legal details for verification and write the public introduction learners will see after approval.</p>
        <div className="onboarding-field-grid">
          <label className="full">Full legal name<input name="legalName" autoComplete="name" value={profile.legalName} onChange={update} required /></label>
          <label>Mobile number<input name="phone" type="tel" autoComplete="tel" value={profile.phone} onChange={update} placeholder="+267 71 234 567" required /></label>
          <label>District<select name="district" value={profile.district} onChange={update} required><option value="" disabled>Choose a district</option>{["Central", "Chobe", "Ghanzi", "Kgalagadi", "Kgatleng", "Kweneng", "North-East", "North-West", "South-East", "Southern"].map(item => <option key={item}>{item}</option>)}</select></label>
          <label className="full">Town or village<input name="town" value={profile.town} onChange={update} placeholder="e.g. Gaborone" required /></label>
          <label className="full">Profile headline<input name="headline" value={profile.headline} onChange={update} minLength={20} maxLength={80} required /><small>{profile.headline.length}/80 characters</small></label>
          <label className="full">About you<textarea name="biography" value={profile.biography} onChange={update} rows={7} minLength={80} maxLength={600} required /><small>{profile.biography.length}/600 characters · minimum 80</small></label>
        </div>
      </fieldset>}
      {step === 1 && <fieldset>
        <legend>Add your teaching background</legend><p className="onboarding-section-intro">Select every level and subject you are qualified and confident to teach.</p>
        <div className="onboarding-field-grid">
          <label>Teaching experience<select name="teachingExperience" value={profile.teachingExperience} onChange={update} required><option value="" disabled>Select experience</option>{["Less than 1 year", "1–2 years", "3–5 years", "6–10 years", "More than 10 years"].map(item => <option key={item}>{item}</option>)}</select></label>
          <label>Highest qualification<input name="qualification" value={profile.qualification} onChange={update} placeholder="e.g. BSc Mathematics" required /></label>
          <label className="full">Institution<input name="institution" value={profile.institution} onChange={update} required /></label>
        </div>
        <div className="onboarding-choice-group"><span>Exam levels</span><div className="onboarding-choice-grid compact">{levels.map(level => <label key={level}><input type="checkbox" checked={profile.levels.includes(level)} onChange={() => toggle("levels", level)} /><span>{level}</span></label>)}</div></div>
        <div className="onboarding-choice-group"><span>Subjects</span><div className="onboarding-choice-grid">{subjects.map(subject => <label key={subject}><input type="checkbox" checked={profile.subjects.includes(subject)} onChange={() => toggle("subjects", subject)} /><span>{subject}</span></label>)}</div></div>
      </fieldset>}
      {step === 2 && <fieldset>
        <legend>Set up your lessons</legend><p className="onboarding-section-intro">These are review details; exact bookable slots are configured after approval.</p>
        <div className="onboarding-choice-group"><span>Lesson formats</span><div className="onboarding-choice-grid two-column">{formats.map(format => <label key={format.value}><input type="checkbox" checked={profile.formats.includes(format.value)} onChange={() => toggle("formats", format.value)} /><span>{format.label}</span></label>)}</div></div>
        <div className="onboarding-field-grid">
          <label>Languages used<input name="languages" value={profile.languages} onChange={update} placeholder="English, Setswana" required /></label>
          <label>Rate per lesson<input name="basePriceCredits" type="number" min="50" step="10" value={profile.basePriceCredits || ""} onChange={update} required /><small>Minimum 50 credits</small></label>
          <label>Session length<select name="sessionDurationMinutes" value={profile.sessionDurationMinutes} onChange={update}><option value="30">30 minutes</option><option value="45">45 minutes</option><option value="60">60 minutes</option><option value="90">90 minutes</option></select></label>
          <div className="onboarding-time-row"><label>From<input name="startTime" type="time" value={profile.startTime} onChange={update} required /></label><label>Until<input name="endTime" type="time" value={profile.endTime} onChange={update} required /></label></div>
        </div>
        <div className="onboarding-choice-group"><span>Days usually available</span><div className="onboarding-day-grid">{days.map(day => <label key={day}><input type="checkbox" checked={profile.days.includes(day)} onChange={() => toggle("days", day)} /><span>{day}</span></label>)}</div></div>
      </fieldset>}
      {step === 3 && <fieldset>
        <legend>Verification and review</legend><p className="onboarding-section-intro">PDF, JPG, or PNG only. Files are signature-checked, malware-scanned, and privately stored.</p>
        <div className="onboarding-upload-grid">
          {([{"type":"profile_image","title":"Profile photo","help":"Clear head-and-shoulders JPG or PNG","accept":"image/png,image/jpeg"},{"type":"qualification","title":"Qualification proof","help":"Certificate, diploma, or transcript","accept":"image/png,image/jpeg,application/pdf"},{"type":"identity","title":"Identity document","help":"Omang or passport for verification","accept":"image/png,image/jpeg,application/pdf"}] as const).map(item => {
            const existing = application?.documents.find(document => document.documentType === item.type && document.scanStatus === "clean");
            return <label key={item.type}><span className="upload-icon" aria-hidden="true">{existing ? "✓" : "◇"}</span><strong>{item.title}</strong><small>{existing ? `${existing.filename} · security scan passed` : item.help}</small><input type="file" accept={item.accept} required={!existing} onChange={event => setFiles(current => ({ ...current, [item.type]: event.target.files?.[0] }))} /></label>;
          })}
        </div>
        <div className="onboarding-summary-card"><h3>Application summary</h3><dl><div><dt>Location</dt><dd>{profile.town || "Not added"}, {profile.district || "district not added"}</dd></div><div><dt>Teaching</dt><dd>{profile.levels.join(", ") || "No levels"} · {profile.subjects.length} subjects</dd></div><div><dt>Lessons</dt><dd>{profile.formats.length} formats · {profile.basePriceCredits || "—"} credits</dd></div><div><dt>Schedule</dt><dd>{profile.days.join(", ") || "No days"} · {profile.startTime}–{profile.endTime}</dd></div></dl></div>
        <label className="onboarding-confirm"><input type="checkbox" checked={profile.consent} onChange={event => setProfile(current => ({ ...current, consent: event.target.checked }))} required /><span>I confirm these details are accurate and consent to private verification and the documented retention policy.</span></label>
        <p className="onboarding-privacy-note">Rejected or withdrawn evidence is scheduled for deletion after 30 days. Approved evidence is retained for re-verification for up to two years.</p>
      </fieldset>}
      {notice && <p className="onboarding-form-success" role="status">{notice}</p>}
      {sectionError && <p className="onboarding-form-error" role="alert">{sectionError}</p>}
      <div className="onboarding-form-actions">{step > 0 ? <button type="button" className="onboarding-secondary" disabled={saving} onClick={() => { setStep(current => current - 1); setSectionError(""); }}>Back</button> : <span />}<button type="submit" className="onboarding-primary" disabled={saving}>{saving ? "Saving securely…" : step === steps.length - 1 ? "Submit for review" : "Save and continue"}<span aria-hidden="true">→</span></button></div>
    </form>
  </div>;
}
