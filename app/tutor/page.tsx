"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LmsHeader } from "../components/LmsHeader";
import { useLms } from "../components/LmsProvider";
import { findTutor, Tutor } from "../lib/tutors";
import { useTutorFavourites } from "../lib/useTutorFavourites";

const MessageIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5.5h14v10H9l-4 3v-13Z" /><path d="M9 9h6M9 12h4" /></svg>;
const HeartIcon = ({ filled = false }: { filled?: boolean }) => <svg viewBox="0 0 24 24" aria-hidden="true" className={filled ? "filled" : ""}><path d="M12 20s-7-4.3-7-10a4 4 0 0 1 7-2.7A4 4 0 0 1 19 10c0 5.7-7 10-7 10Z" /></svg>;
const ShareIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V3m0 0L8 7m4-4 4 4" /><path d="M7 10H5v10h14V10h-2" /></svg>;

export default function TutorProfilePage() {
  const { credits, bookTutor } = useLms();
  const { favouriteIds, ready: favouritesReady, toggleFavourite } = useTutorFavourites();
  const [tutor, setTutor] = useState<Tutor | null | undefined>(undefined);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [notice, setNotice] = useState("");
  const [booked, setBooked] = useState(false);
  const [messageOpen, setMessageOpen] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [messageNotice, setMessageNotice] = useState("");
  const [actionNotice, setActionNotice] = useState("");

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id") ?? "";
    const match = findTutor(id) ?? null;
    setTutor(match);
    setSelectedSlot(match?.availability[0] ?? "");
  }, []);

  if (tutor === undefined) return <main className="lms-page"><LmsHeader /><div className="loading-state">Loading tutor profile…</div></main>;

  if (!tutor) return <main className="lms-page"><LmsHeader /><section className="locked-state"><span>?</span><h1>Tutor not found.</h1><p>This tutor profile may no longer be available.</p><Link className="primary" href="/tutors">Browse Studacad tutors</Link></section></main>;

  const isFavourite = favouriteIds.includes(tutor.id);

  const confirmBooking = () => {
    const result = bookTutor(tutor.name, tutor.price, selectedSlot);
    setNotice(result.message);
    setBooked(result.ok);
  };

  const handleFavourite = () => {
    const saved = toggleFavourite(tutor.id);
    setActionNotice(saved ? `${tutor.name} added to your favourites.` : `${tutor.name} removed from your favourites.`);
  };

  const shareTutor = async () => {
    const shareData = { title: `${tutor.name} on Studacad`, text: `View ${tutor.name}'s ${tutor.examination} ${tutor.subject} tutor profile.`, url: window.location.href };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setActionNotice("Tutor profile shared.");
      } else {
        await navigator.clipboard.writeText(shareData.url);
        setActionNotice("Tutor profile link copied.");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      const textArea = document.createElement("textarea");
      textArea.value = shareData.url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      textArea.remove();
      setActionNotice("Tutor profile link copied.");
    }
  };

  const sendMessage = () => {
    const cleanMessage = messageText.trim();
    if (!cleanMessage) {
      setMessageNotice("Write a message before sending.");
      return;
    }
    try {
      const key = "studacad-tutor-messages";
      const existing = JSON.parse(window.localStorage.getItem(key) ?? "[]");
      window.localStorage.setItem(key, JSON.stringify([{ tutorId: tutor.id, tutorName: tutor.name, text: cleanMessage, createdAt: new Date().toISOString() }, ...existing]));
    } catch {
      // The confirmation still demonstrates the messaging flow if storage is blocked.
    }
    setMessageText("");
    setMessageNotice(`Message sent to ${tutor.name}. You can book after they reply.`);
  };

  return <main className="lms-page tutor-profile-page">
    <LmsHeader />
    <div className="profile-shell">
      <div className="profile-main">
        <Link className="profile-back" href="/tutors">← Back to tutors</Link>

        <section className="profile-intro">
          <div className={`profile-photo ${tutor.color}`}><img src={tutor.image} alt={`${tutor.name}, ${tutor.examination} ${tutor.subject} tutor`} /><span>Available this week</span></div>
          <div className="profile-summary">
            <p className="eyebrow">{tutor.examination} · {tutor.subject}</p>
            <h1>{tutor.name} <i>✓</i></h1>
            <p className="profile-headline">{tutor.headline}</p>
            <div className="profile-facts"><span><b>★ {tutor.rating}</b> tutor rating</span><span><b>{tutor.lessons}</b> completed</span><span><b>{tutor.experience}</b></span><span><b>{tutor.location}</b></span></div>
          </div>
        </section>

        <div className="profile-actions" aria-label="Tutor profile actions">
          <button type="button" onClick={() => { setMessageOpen(true); setMessageNotice(""); }}><MessageIcon /><span>Message {tutor.name}</span></button>
          <button type="button" className={isFavourite ? "active" : ""} onClick={handleFavourite} disabled={!favouritesReady}><HeartIcon filled={isFavourite} /><span>{isFavourite ? "Saved to favourites" : "Add to favourites"}</span></button>
          <button type="button" onClick={shareTutor}><ShareIcon /><span>Share profile</span></button>
        </div>
        {actionNotice && <p className="profile-action-notice" role="status">{actionNotice} {isFavourite && <Link href="/favourites">View favourites →</Link>}</p>}

        <section className="profile-section">
          <p className="eyebrow">Meet your tutor</p>
          <h2>About {tutor.name}</h2>
          <p>{tutor.about}</p>
          <div className="specialty-list">{tutor.specialties.map(item => <span key={item}>{item}</span>)}</div>
        </section>

        <section className="profile-section video-profile-section">
          <p className="eyebrow">Tutor introduction</p>
          <h2>Meet {tutor.name} on video</h2>
          <div className="tutor-video-layout">
            <video controls preload="metadata" poster={tutor.image} aria-label={`${tutor.name}'s introductory video`}>
              <source src={tutor.introVideo} type="video/mp4" />
              Your browser does not support video playback.
            </video>
            <div><span className="video-duration">▶ 1 minute introduction</span><h3>Teaching style and lesson expectations</h3><p>Hear how {tutor.name} supports {tutor.examination} learners, structures tutorials, and helps students prepare for {tutor.subject} examinations.</p><small>Demonstration tutor introduction video.</small></div>
          </div>
        </section>

        <section className="profile-section">
          <p className="eyebrow">Qualifications and experience</p>
          <h2>{tutor.name}&apos;s résumé</h2>
          <div className="resume-grid">
            <div className="resume-column"><h3>Education</h3>{tutor.resume.education.map(item => <div className="resume-item" key={item}><span>ED</span><p>{item}</p></div>)}</div>
            <div className="resume-column"><h3>Teaching experience</h3>{tutor.resume.experience.map(item => <div className="resume-item resume-experience" key={`${item.role}-${item.period}`}><span>EX</span><div><strong>{item.role}</strong><p>{item.organisation}</p><small>{item.period}</small></div></div>)}</div>
            <div className="resume-column"><h3>Certifications</h3>{tutor.resume.certifications.map(item => <div className="resume-item" key={item}><span>✓</span><p>{item}</p></div>)}</div>
          </div>
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
        <button className="message-before-booking" type="button" onClick={() => { setMessageOpen(true); setMessageNotice(""); }}><MessageIcon /> Message before booking</button>
        <fieldset><legend>Choose a time</legend>{tutor.availability.map(slot => <label key={slot} className={selectedSlot === slot ? "selected" : ""}><input type="radio" name="lesson-slot" checked={selectedSlot === slot} onChange={() => { setSelectedSlot(slot); setNotice(""); setBooked(false); }} /><span>{slot}</span></label>)}</fieldset>
        {!booked ? <button className="primary booking-button" onClick={confirmBooking} disabled={!selectedSlot || credits < tutor.price}>{credits < tutor.price ? "Top up to book" : `Book with ${tutor.name}`}</button> : <div className="booking-success"><span>✓</span><div><strong>Lesson booked</strong><p>{selectedSlot}</p></div></div>}
        {notice && <p className={booked ? "booking-notice success" : "booking-notice"} role="status">{notice}</p>}
        {credits < tutor.price && <Link className="booking-topup" href="/wallet">Top up your Studacad wallet →</Link>}
        <small>Demo booking. Credits are deducted immediately and the transaction appears in your wallet.</small>
      </aside>
    </div>

    {messageOpen && <div className="message-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setMessageOpen(false); }}>
      <section className="message-modal" role="dialog" aria-modal="true" aria-labelledby="message-heading">
        <button className="message-close" type="button" aria-label="Close message window" onClick={() => setMessageOpen(false)}>×</button>
        <div className="message-tutor"><img src={tutor.image} alt="" /><div><p className="eyebrow">Message before booking</p><h2 id="message-heading">Ask {tutor.name} a question</h2></div></div>
        <p className="message-helper">Share the learner&apos;s level, the topic they need help with, and the times that suit you. Messaging is free and does not make a booking.</p>
        <label htmlFor="tutor-message">Your message</label>
        <textarea id="tutor-message" value={messageText} onChange={event => { setMessageText(event.target.value); setMessageNotice(""); }} placeholder={`Hello ${tutor.name}, I would like help with…`} rows={6} />
        {messageNotice && <p className={messageNotice.startsWith("Message sent") ? "message-status success" : "message-status"} role="status">{messageNotice}</p>}
        <div className="message-modal-actions"><button type="button" className="secondary" onClick={() => setMessageOpen(false)}>Cancel</button><button type="button" className="primary" onClick={sendMessage}>Send message</button></div>
      </section>
    </div>}
  </main>;
}
