"use client";

import { FormEvent, useState } from "react";

export default function AccountForm({ initial, roles }: { initial: { displayName: string; phoneE164: string; timezone: string }; roles: string[] }) {
  const [profile, setProfile] = useState(initial);
  const [notice, setNotice] = useState("");

  const save = async (event: FormEvent) => {
    event.preventDefault();
    const response = await fetch("/api/account", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(profile) });
    const result = await response.json() as { error?: string };
    setNotice(response.ok ? "Profile saved." : result.error ?? "Unable to save the profile.");
  };
  const requestExport = async () => {
    const response = await fetch("/api/account/export", { method: "POST" });
    setNotice(response.ok ? "Your export request has been recorded." : "Unable to request an export.");
  };
  const requestDeletion = async () => {
    if (!window.confirm("Request deletion of your Studacad account? You will be signed out.")) return;
    const response = await fetch("/api/account", { method: "DELETE" });
    if (response.ok) window.location.href = "/";
    else setNotice("Unable to request deletion.");
  };
  const signOut = async () => {
    await fetch("/api/auth/signout", { method: "POST" });
    window.location.href = "/";
  };

  return <>
    <div className="account-roles">{roles.map(role => <span key={role}>{role}</span>)}</div>
    <form className="account-form" onSubmit={save}>
      <label>Display name<input value={profile.displayName} onChange={event => setProfile({ ...profile, displayName: event.target.value })} minLength={2} maxLength={100} required /></label>
      <label>Phone number<input value={profile.phoneE164} onChange={event => setProfile({ ...profile, phoneE164: event.target.value })} placeholder="+267…" /></label>
      <label>Timezone<input value={profile.timezone} onChange={event => setProfile({ ...profile, timezone: event.target.value })} required /></label>
      <button className="primary" type="submit">Save profile</button>
    </form>
    {notice && <p className="account-notice" role="status">{notice}</p>}
    <div className="account-actions"><button onClick={requestExport}>Request my data export</button><button onClick={signOut}>Sign out</button><button className="danger" onClick={requestDeletion}>Request account deletion</button></div>
  </>;
}
