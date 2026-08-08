"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LmsHeader } from "../components/LmsHeader";
import { useLms } from "../components/LmsProvider";
import { findTutor, Tutor } from "../lib/tutors";

export default function TutorProfilePage() {
  const { credits, bookTutor } = useLms();
  const [tutor, setTutor] = useState<Tutor | null | undefined>(undefined);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [notice, setNotice] = useState("");
  const [booked, setBooked] = useState(false);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id") ?? "";
    const match = findTutor(id) ?? null;
    setTutor(match);
    setSelectedSlot(match?.availability[0] ?? "");
  }, []);

  if (tutor === undefined) return <main className="lms-page"><LmsHeader /><div className="loading-state">Loading tutor profile…</div></main>;

  if (!tutor) return <main className="lms-page"><LmsHeader /><section className="locked-state"><span>?</span><h1>Tutor not found.</h1><p>This tutor profile may no longer be available.</p><Link className="primary" href="/#tutors">Browse Studacad tutors</Link></section></main>;

  const confirmBooking = () => {
    const result = bookTutor(tutor.name, tutor.price, selectedSlot);
    setNotice(result.message);
    setBooked(result.ok);
  };

  return <main className="lms-page tutor-profile-page">
    <LmsHeader />
    <div className="profile-shell">
      <div className="profile-main">
        <Link className="profile-back" href="/#tutor-results">← Back to tutors</Link>

        <section className="profile-intro">
          <div className={`profile-photo ${tutor.color}`}><img src={tutor.image} alt={`${tutor.name}, ${tutor.examination} ${tutor.subject} tutor`} /><span>Available this week</span></div>
          <div className="profile-summary">
            <p className="eyebrow">{tutor.examination} · {tutor.subject}</p>
            <h1>{tutor.name} <i>✓</i></h1>
            <p className="profile-headline">{tutor.headline}</p>
            <div className="profile-facts"><span><b>★ {tutor.rating}</b> tutor rating</span><span><b>{tutor.lessons}</b> completed</span><span><b>{tutor.experience}</b></span><span><b>{tutor.location}</b></span></div>
          </div>
        </section>

        <section className="profile-section">
          <p className="eyebrow">Meet your tutor</p>
          <h2>About {tutor.name}</h2>
          <p>{tutor.about}</p>
          <div className="specialty-list">{tutor.specialties.map(item => <span key={item}>{item}</span>)}</div>
        </section>

        <section className="profile-section">
          <p className="eyebrow">A complete Studacad lesson</p>
          <h2>What learning together looks like</h2>
          <div className="approach-grid">{tutor.approach.map((item, index) => <div key={item}><span>{index + 1}</span><p>{item}</p></div>)}</div>
        </section>

        <section className="profile-review">
          <div>★★★★★</div>
          <blockquote>“The explanations were clear and the practice questions showed exactly where more revision was needed.”</blockquote>
          <p>Demo learner review · {tutor.examination} {tutor.subject}</p>
        </section>
      </div>

      <aside className="booking-card">
        <p className="eyebrow">Book a 1-to-1 tutorial</p>
        <div className="booking-price"><strong>{tutor.price}</strong><span>credits<br />for 50 minutes</span></div>
        <div className="booking-balance"><span>Your wallet</span><b>{credits.toLocaleString()} credits</b></div>
        <fieldset><legend>Choose a time</legend>{tutor.availability.map(slot => <label key={slot} className={selectedSlot === slot ? "selected" : ""}><input type="radio" name="lesson-slot" checked={selectedSlot === slot} onChange={() => { setSelectedSlot(slot); setNotice(""); setBooked(false); }} /><span>{slot}</span></label>)}</fieldset>
        {!booked ? <button className="primary booking-button" onClick={confirmBooking} disabled={!selectedSlot || credits < tutor.price}>{credits < tutor.price ? "Top up to book" : `Book with ${tutor.name}`}</button> : <div className="booking-success"><span>✓</span><div><strong>Lesson booked</strong><p>{selectedSlot}</p></div></div>}
        {notice && <p className={booked ? "booking-notice success" : "booking-notice"} role="status">{notice}</p>}
        {credits < tutor.price && <Link className="booking-topup" href="/wallet">Top up your Studacad wallet →</Link>}
        <small>Demo booking. Credits are deducted immediately and the transaction appears in your wallet.</small>
      </aside>
    </div>
  </main>;
}
