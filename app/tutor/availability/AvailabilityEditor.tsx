"use client";

import { useEffect, useState } from "react";

type Rule = { id?: string; weekday: number; localStartTime: string; localEndTime: string; timezone: string; format: string; slotDurationMinutes: number; leadTimeMinutes: number; bufferBeforeMinutes: number; bufferAfterMinutes: number; effectiveFrom: string; effectiveUntil: string | null };
type Exception = { id?: string; startsAt: string; endsAt: string; available: boolean; reason: string };
type Settings = { subjects: Array<{ examination: string; subject: string; priceCredits: number }>; formats: Array<{ format: string; groupCapacity: number; locationNote: string }> };
type AvailabilityPayload = { profile: { slug: string; timezone: string }; rules: Rule[]; exceptions: Exception[]; settings: Settings };

const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const formatLabel = (format: string) => ({ online_1to1: "Online private", online_group: "Online group", tutor_place: "At my place", student_place: "At learner's place" }[format] ?? format);
const today = () => new Date().toISOString().slice(0, 10);
const inputDateTime = (iso: string) => iso ? new Date(iso).toISOString().slice(0, 16) : "";

export function AvailabilityEditor() {
  const [data, setData] = useState<AvailabilityPayload | null>(null);
  const [notice, setNotice] = useState("Loading availability…");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const response = await fetch("/api/tutor/availability", { cache: "no-store" });
      const result = await response.json() as AvailabilityPayload & { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Unable to load availability.");
      setData(result);
      setNotice("");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Unable to load availability."); }
  };
  useEffect(() => { void load(); }, []);

  if (!data) return <section className="availability-shell"><p className="availability-notice" role="status">{notice}</p></section>;

  const updateRule = (index: number, patch: Partial<Rule>) => setData(current => current ? ({ ...current, rules: current.rules.map((rule, itemIndex) => itemIndex === index ? { ...rule, ...patch } : rule) }) : current);
  const addRule = () => setData(current => current ? ({ ...current, rules: [...current.rules, {
    weekday: 1, localStartTime: "16:00", localEndTime: "19:00", timezone: current.profile.timezone,
    format: current.settings.formats[0]?.format ?? "online_1to1", slotDurationMinutes: 50, leadTimeMinutes: 120,
    bufferBeforeMinutes: 0, bufferAfterMinutes: 10, effectiveFrom: today(), effectiveUntil: null
  }] }) : current);
  const addBlackout = () => {
    const start = new Date(Date.now() + 86_400_000); start.setHours(8, 0, 0, 0);
    const end = new Date(start); end.setHours(18, 0, 0, 0);
    setData(current => current ? ({ ...current, exceptions: [...current.exceptions, { startsAt: start.toISOString(), endsAt: end.toISOString(), available: false, reason: "Unavailable" }] }) : current);
  };

  const save = async () => {
    setSaving(true); setNotice("");
    try {
      const response = await fetch("/api/tutor/availability", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rules: data.rules, exceptions: data.exceptions, settings: data.settings })
      });
      const result = await response.json() as AvailabilityPayload & { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Unable to save availability.");
      setData(result); setNotice("Availability and lesson settings saved.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Unable to save availability."); }
    finally { setSaving(false); }
  };

  return <section className="availability-shell">
    <div className="availability-toolbar"><div><strong>Public schedule</strong><span>Times are interpreted in {data.profile.timezone} and stored as UTC bookings.</span></div><button className="primary" type="button" onClick={() => void save()} disabled={saving}>{saving ? "Saving…" : "Save all changes"}</button></div>
    {notice && <p className="availability-notice" role="status">{notice}</p>}

    <section className="availability-panel"><header><div><p className="eyebrow">Pricing</p><h2>Subjects and formats</h2></div></header>
      <div className="availability-settings-grid">
        <div>{data.settings.subjects.map((subject, index) => <label key={`${subject.examination}-${subject.subject}`}>{subject.examination} · {subject.subject}<span><input type="number" min="1" max="100000" value={subject.priceCredits} onChange={event => setData(current => current ? ({ ...current, settings: { ...current.settings, subjects: current.settings.subjects.map((item, itemIndex) => itemIndex === index ? { ...item, priceCredits: Number(event.target.value) } : item) } }) : current)} /> credits</span></label>)}</div>
        <div>{data.settings.formats.map((format, index) => <fieldset key={format.format}><legend>{formatLabel(format.format)}</legend>{format.format === "online_group" && <label>Group capacity<input type="number" min="1" max="100" value={format.groupCapacity} onChange={event => setData(current => current ? ({ ...current, settings: { ...current.settings, formats: current.settings.formats.map((item, itemIndex) => itemIndex === index ? { ...item, groupCapacity: Number(event.target.value) } : item) } }) : current)} /></label>}<label>Location or joining note<input maxLength={500} value={format.locationNote} onChange={event => setData(current => current ? ({ ...current, settings: { ...current.settings, formats: current.settings.formats.map((item, itemIndex) => itemIndex === index ? { ...item, locationNote: event.target.value } : item) } }) : current)} placeholder={format.format.startsWith("online") ? "Online joining details are shared after booking" : "Area or travel limits"} /></label></fieldset>)}</div>
      </div>
    </section>

    <section className="availability-panel"><header><div><p className="eyebrow">Recurring hours</p><h2>Weekly rules</h2></div><button className="outline" type="button" onClick={addRule}>＋ Add hours</button></header>
      <div className="availability-rule-list">{data.rules.map((rule, index) => <article key={rule.id ?? index}>
        <label>Day<select value={rule.weekday} onChange={event => updateRule(index, { weekday: Number(event.target.value) })}>{weekdays.map((day, dayIndex) => <option key={day} value={dayIndex}>{day}</option>)}</select></label>
        <label>Format<select value={rule.format} onChange={event => updateRule(index, { format: event.target.value })}>{data.settings.formats.map(format => <option key={format.format} value={format.format}>{formatLabel(format.format)}</option>)}</select></label>
        <label>Starts<input type="time" value={rule.localStartTime} onChange={event => updateRule(index, { localStartTime: event.target.value })} /></label>
        <label>Ends<input type="time" value={rule.localEndTime} onChange={event => updateRule(index, { localEndTime: event.target.value })} /></label>
        <label>Lesson minutes<input type="number" min="15" max="240" step="5" value={rule.slotDurationMinutes} onChange={event => updateRule(index, { slotDurationMinutes: Number(event.target.value) })} /></label>
        <label>Lead minutes<input type="number" min="0" max="10080" value={rule.leadTimeMinutes} onChange={event => updateRule(index, { leadTimeMinutes: Number(event.target.value) })} /></label>
        <label>Before buffer<input type="number" min="0" max="10080" value={rule.bufferBeforeMinutes} onChange={event => updateRule(index, { bufferBeforeMinutes: Number(event.target.value) })} /></label>
        <label>After buffer<input type="number" min="0" max="10080" value={rule.bufferAfterMinutes} onChange={event => updateRule(index, { bufferAfterMinutes: Number(event.target.value) })} /></label>
        <label>Effective from<input type="date" value={rule.effectiveFrom} onChange={event => updateRule(index, { effectiveFrom: event.target.value })} /></label>
        <label>Effective until<input type="date" value={rule.effectiveUntil ?? ""} onChange={event => updateRule(index, { effectiveUntil: event.target.value || null })} /></label>
        <button className="remove-rule" type="button" onClick={() => setData(current => current ? ({ ...current, rules: current.rules.filter((_, itemIndex) => itemIndex !== index) }) : current)}>Remove</button>
      </article>)}</div>
      {data.rules.length === 0 && <p className="availability-empty">No public hours are published. Add at least one rule before learners can book.</p>}
    </section>

    <section className="availability-panel"><header><div><p className="eyebrow">Exceptions</p><h2>Blackout periods</h2></div><button className="outline" type="button" onClick={addBlackout}>＋ Add blackout</button></header>
      <div className="blackout-list">{data.exceptions.map((exception, index) => <article key={exception.id ?? index}>
        <label>Starts<input type="datetime-local" value={inputDateTime(exception.startsAt)} onChange={event => setData(current => current ? ({ ...current, exceptions: current.exceptions.map((item, itemIndex) => itemIndex === index ? { ...item, startsAt: new Date(event.target.value).toISOString() } : item) }) : current)} /></label>
        <label>Ends<input type="datetime-local" value={inputDateTime(exception.endsAt)} onChange={event => setData(current => current ? ({ ...current, exceptions: current.exceptions.map((item, itemIndex) => itemIndex === index ? { ...item, endsAt: new Date(event.target.value).toISOString() } : item) }) : current)} /></label>
        <label>Reason<input maxLength={500} value={exception.reason} onChange={event => setData(current => current ? ({ ...current, exceptions: current.exceptions.map((item, itemIndex) => itemIndex === index ? { ...item, reason: event.target.value } : item) }) : current)} /></label>
        <button className="remove-rule" type="button" onClick={() => setData(current => current ? ({ ...current, exceptions: current.exceptions.filter((_, itemIndex) => itemIndex !== index) }) : current)}>Remove</button>
      </article>)}</div>
      {data.exceptions.length === 0 && <p className="availability-empty">No future blackout periods.</p>}
    </section>
  </section>;
}
