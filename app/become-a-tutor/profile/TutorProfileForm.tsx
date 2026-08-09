"use client";

import { ChangeEvent, FormEvent, useState } from "react";

const steps = [
  ["About you", "Contact and profile"],
  ["Teaching", "Experience and subjects"],
  ["Lessons", "Formats and availability"],
  ["Verification", "Documents and review"]
];

const subjects = ["Mathematics", "English", "Setswana", "Integrated Science", "Biology", "Chemistry", "Physics", "Accounting", "Business Studies", "Geography"];
const levels = ["PSLE", "JCE", "BGCSE"];
const formats = ["Online private", "Online group", "At my location", "At the learner's location"];
const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type ProfileData = {
  phone: string;
  district: string;
  town: string;
  headline: string;
  bio: string;
  experience: string;
  qualification: string;
  institution: string;
  subjects: string[];
  levels: string[];
  formats: string[];
  languages: string;
  rate: string;
  duration: string;
  days: string[];
  startTime: string;
  endTime: string;
};

const initialProfile: ProfileData = {
  phone: "",
  district: "",
  town: "",
  headline: "",
  bio: "",
  experience: "",
  qualification: "",
  institution: "",
  subjects: [],
  levels: [],
  formats: [],
  languages: "",
  rate: "",
  duration: "60",
  days: [],
  startTime: "16:00",
  endTime: "19:00"
};

export function TutorProfileForm() {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState(initialProfile);
  const [submitted, setSubmitted] = useState(false);
  const [sectionError, setSectionError] = useState("");

  const update = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setProfile(current => ({ ...current, [event.target.name]: event.target.value }));
  };

  const toggle = (field: "subjects" | "levels" | "formats" | "days", value: string) => {
    setSectionError("");
    setProfile(current => ({
      ...current,
      [field]: current[field].includes(value)
        ? current[field].filter(item => item !== value)
        : [...current[field], value]
    }));
  };

  const next = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (step === 1 && (!profile.levels.length || !profile.subjects.length)) {
      setSectionError("Select at least one exam level and one subject to continue.");
      return;
    }
    if (step === 2 && (!profile.formats.length || !profile.days.length)) {
      setSectionError("Select at least one lesson format and one available day to continue.");
      return;
    }
    setSectionError("");
    if (step < steps.length - 1) {
      setStep(current => current + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (submitted) {
    return (
      <section className="onboarding-complete" aria-live="polite">
        <div className="onboarding-complete-mark" aria-hidden="true">✓</div>
        <p className="onboarding-eyebrow">Profile complete</p>
        <h1>Your tutor application is ready for review</h1>
        <p>All four sections are complete. This is a front-end demo, so no personal details or documents have been uploaded.</p>
        <div className="onboarding-review-grid">
          <div><span>Subjects</span><strong>{profile.subjects.length || 0} selected</strong></div>
          <div><span>Levels</span><strong>{profile.levels.join(", ") || "Not selected"}</strong></div>
          <div><span>Lesson rate</span><strong>{profile.rate ? `${profile.rate} credits` : "Not set"}</strong></div>
          <div><span>Availability</span><strong>{profile.days.length ? `${profile.days.length} days weekly` : "Not set"}</strong></div>
        </div>
        <button type="button" className="onboarding-primary" onClick={() => { setSubmitted(false); setStep(0); }}>Review profile details</button>
      </section>
    );
  }

  return (
    <div className="tutor-onboarding-layout">
      <aside className="onboarding-progress-card">
        <p className="onboarding-eyebrow">Tutor application</p>
        <h2>Build a profile learners can trust</h2>
        <ol>
          {steps.map(([title, description], index) => (
            <li className={index === step ? "active" : index < step ? "complete" : ""} key={title}>
              <button type="button" disabled={index > step} onClick={() => { setStep(index); setSectionError(""); }}>
                <span>{index < step ? "✓" : index + 1}</span>
                <span><strong>{title}</strong><small>{description}</small></span>
              </button>
            </li>
          ))}
        </ol>
        <div className="onboarding-help-card"><strong>Need help?</strong><p>Keep documents clear and make your bio specific to the learners you want to teach.</p></div>
      </aside>

      <form className="onboarding-form-card" onSubmit={next}>
        <div className="onboarding-form-heading">
          <span>Step {step + 1} of {steps.length}</span>
          <div><i style={{ width: `${((step + 1) / steps.length) * 100}%` }} /></div>
        </div>

        {step === 0 && (
          <fieldset>
            <legend>Tell learners about you</legend>
            <p className="onboarding-section-intro">Your name and email were captured in the starter form. Add the details learners need to understand where and how you teach.</p>
            <div className="onboarding-field-grid">
              <label>Mobile number<input name="phone" type="tel" value={profile.phone} onChange={update} placeholder="e.g. 71 234 567" required /></label>
              <label>District<select name="district" value={profile.district} onChange={update} required><option value="" disabled>Choose a district</option><option>Central</option><option>Chobe</option><option>Ghanzi</option><option>Kgalagadi</option><option>Kgatleng</option><option>Kweneng</option><option>North-East</option><option>North-West</option><option>South-East</option><option>Southern</option></select></label>
              <label className="full">Town or village<input name="town" value={profile.town} onChange={update} placeholder="e.g. Gaborone" required /></label>
              <label className="full">Profile headline<input name="headline" value={profile.headline} onChange={update} maxLength={80} placeholder="e.g. Patient BGCSE Mathematics tutor with classroom experience" required /><small>{profile.headline.length}/80 characters</small></label>
              <label className="full">About you<textarea name="bio" value={profile.bio} onChange={update} rows={7} minLength={80} maxLength={600} placeholder="Describe your teaching style, experience, and how you help learners improve." required /><small>{profile.bio.length}/600 characters · minimum 80</small></label>
            </div>
          </fieldset>
        )}

        {step === 1 && (
          <fieldset>
            <legend>Add your teaching background</legend>
            <p className="onboarding-section-intro">Choose every level and subject you are confident teaching. Verification helps your profile stand out.</p>
            <div className="onboarding-field-grid">
              <label>Teaching experience<select name="experience" value={profile.experience} onChange={update} required><option value="" disabled>Select experience</option><option>Less than 1 year</option><option>1–2 years</option><option>3–5 years</option><option>6–10 years</option><option>More than 10 years</option></select></label>
              <label>Highest qualification<input name="qualification" value={profile.qualification} onChange={update} placeholder="e.g. BSc Mathematics" required /></label>
              <label className="full">Institution<input name="institution" value={profile.institution} onChange={update} placeholder="School, college, or university" required /></label>
            </div>
            <div className="onboarding-choice-group"><span>Exam levels</span><div className="onboarding-choice-grid compact">{levels.map(level => <label key={level}><input type="checkbox" checked={profile.levels.includes(level)} onChange={() => toggle("levels", level)} /><span>{level}</span></label>)}</div><small>Select at least one level.</small></div>
            <div className="onboarding-choice-group"><span>Subjects</span><div className="onboarding-choice-grid">{subjects.map(subject => <label key={subject}><input type="checkbox" checked={profile.subjects.includes(subject)} onChange={() => toggle("subjects", subject)} /><span>{subject}</span></label>)}</div><small>You can add more subjects after verification.</small></div>
          </fieldset>
        )}

        {step === 2 && (
          <fieldset>
            <legend>Set up your lessons</legend>
            <p className="onboarding-section-intro">Tell learners which lesson formats you offer and the times you usually teach.</p>
            <div className="onboarding-choice-group"><span>Lesson formats</span><div className="onboarding-choice-grid two-column">{formats.map(format => <label key={format}><input type="checkbox" checked={profile.formats.includes(format)} onChange={() => toggle("formats", format)} /><span>{format}</span></label>)}</div></div>
            <div className="onboarding-field-grid">
              <label>Languages used in lessons<input name="languages" value={profile.languages} onChange={update} placeholder="e.g. English, Setswana" required /></label>
              <label>Rate per lesson<input name="rate" type="number" min="50" step="10" value={profile.rate} onChange={update} placeholder="Credits" required /><small>Minimum 50 credits</small></label>
              <label>Session length<select name="duration" value={profile.duration} onChange={update}><option value="30">30 minutes</option><option value="45">45 minutes</option><option value="60">60 minutes</option><option value="90">90 minutes</option></select></label>
              <div className="onboarding-time-row"><label>From<input name="startTime" type="time" value={profile.startTime} onChange={update} /></label><label>Until<input name="endTime" type="time" value={profile.endTime} onChange={update} /></label></div>
            </div>
            <div className="onboarding-choice-group"><span>Days usually available</span><div className="onboarding-day-grid">{days.map(day => <label key={day}><input type="checkbox" checked={profile.days.includes(day)} onChange={() => toggle("days", day)} /><span>{day}</span></label>)}</div><small>You will set exact weekly time slots after approval.</small></div>
          </fieldset>
        )}

        {step === 3 && (
          <fieldset>
            <legend>Verification and review</legend>
            <p className="onboarding-section-intro">Add clear documents so Studacad can verify your identity and teaching background.</p>
            <div className="onboarding-upload-grid">
              <label><span className="upload-icon" aria-hidden="true">◎</span><strong>Profile photo</strong><small>Clear head-and-shoulders JPG or PNG</small><input type="file" accept="image/png,image/jpeg" required /></label>
              <label><span className="upload-icon" aria-hidden="true">▤</span><strong>Qualification proof</strong><small>Certificate, diploma, or transcript</small><input type="file" accept="image/png,image/jpeg,application/pdf" required /></label>
              <label><span className="upload-icon" aria-hidden="true">◇</span><strong>Identity document</strong><small>Omang or passport for verification</small><input type="file" accept="image/png,image/jpeg,application/pdf" required /></label>
            </div>
            <div className="onboarding-summary-card">
              <h3>Application summary</h3>
              <dl><div><dt>Location</dt><dd>{profile.town || "Not added"}{profile.district ? `, ${profile.district}` : ""}</dd></div><div><dt>Teaching</dt><dd>{profile.levels.join(", ") || "No levels selected"} · {profile.subjects.length} subjects</dd></div><div><dt>Lessons</dt><dd>{profile.formats.length} formats · {profile.rate || "—"} credits</dd></div><div><dt>Schedule</dt><dd>{profile.days.join(", ") || "No days selected"} · {profile.startTime}–{profile.endTime}</dd></div></dl>
            </div>
            <label className="onboarding-confirm"><input type="checkbox" required /><span>I confirm that these details are accurate and that I have permission to provide the selected documents for verification.</span></label>
            <p className="onboarding-privacy-note">Demo only: selected details and files remain in your browser and are not sent or stored.</p>
          </fieldset>
        )}

        {sectionError && <p className="onboarding-form-error" role="alert">{sectionError}</p>}
        <div className="onboarding-form-actions">
          {step > 0 ? <button type="button" className="onboarding-secondary" onClick={() => { setStep(current => current - 1); setSectionError(""); }}>Back</button> : <span />}
          <button type="submit" className="onboarding-primary">{step === steps.length - 1 ? "Submit for review" : "Save and continue"}<span aria-hidden="true">→</span></button>
        </div>
      </form>
    </div>
  );
}
