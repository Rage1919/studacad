"use client";

import Link from "next/link";
import { LmsHeader } from "../components/LmsHeader";
import { findTutor } from "../lib/tutors";
import { useTutorMessages } from "../lib/useTutorMessages";

export default function MessagesPage() {
  const { messages, ready, refresh } = useTutorMessages();
  const tutorIds = Array.from(new Set(messages.map(message => message.tutorId)));

  return <main className="lms-page messages-page">
    <LmsHeader current="messages" />
    <section className="messages-hero">
      <div><p className="eyebrow">Studacad and WhatsApp</p><h1>Your tutor messages</h1><p>Messages sent from tutor profiles stay here while WhatsApp delivers them to tutors and returns their replies through the connected webhook.</p></div>
      <button className="outline" type="button" onClick={() => void refresh()}>Refresh conversations</button>
    </section>
    <section className="messages-inbox">
      {!ready && <p className="message-empty">Loading conversations…</p>}
      {ready && tutorIds.length === 0 && <div className="message-empty"><h2>No conversations yet</h2><p>Open a tutor profile and send a question before booking.</p><Link className="primary" href="/tutors">Find a tutor</Link></div>}
      {tutorIds.map(tutorId => {
        const tutor = findTutor(tutorId);
        const thread = messages.filter(message => message.tutorId === tutorId);
        if (!tutor) return null;
        return <article className="inbox-thread" key={tutorId}>
          <header><img src={tutor.image} alt="" /><div><h2>{tutor.name}</h2><p>{tutor.examination} · {tutor.subject}</p></div><span>WhatsApp connected</span></header>
          <div className="inbox-messages">{thread.map(message => <div className={`thread-message ${message.direction}`} key={message.id}><p>{message.text}</p><small>{message.direction === "inbound" ? tutor.name : "You"} · {new Date(message.createdAt).toLocaleString()} · {message.status}</small></div>)}</div>
          <Link className="outline" href={`/tutor?id=${tutor.id}`}>Continue conversation</Link>
        </article>;
      })}
    </section>
  </main>;
}
