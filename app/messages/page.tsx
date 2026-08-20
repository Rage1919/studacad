"use client";

import Link from "next/link";
import { useState } from "react";
import { LmsHeader } from "../components/LmsHeader";
import { findTutor } from "../lib/tutors";
import type { TutorMessage } from "../lib/tutorMessages";
import { useTutorMessages } from "../lib/useTutorMessages";

export default function MessagesPage() {
  const { messages, ready, refresh } = useTutorMessages();
  const [notice, setNotice] = useState("");
  const conversationIds = Array.from(
    new Set(messages.map((message) => message.conversationId)),
  );

  const moderate = async (
    message: TutorMessage,
    action: "report" | "block",
  ) => {
    const reason = window
      .prompt(
        action === "report"
          ? "Why are you reporting this message?"
          : "Why are you blocking this contact?",
        action === "report"
          ? "Inappropriate message"
          : "I do not want further contact",
      )
      ?.trim();
    if (!reason) return;
    const response = await fetch(
      `/api/messages/${message.conversationId}/moderation`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          messageId: action === "report" ? message.id : undefined,
          reason,
        }),
      },
    );
    const payload = (await response.json()) as { error?: string };
    setNotice(
      response.ok
        ? action === "report"
          ? "Message reported for private review."
          : "Contact blocked for this conversation."
        : (payload.error ?? "Unable to update the conversation."),
    );
    if (response.ok) await refresh();
  };

  return (
    <main className="lms-page messages-page">
      <LmsHeader current="messages" />
      <section className="messages-hero">
        <div>
          <p className="eyebrow">Private and persistent</p>
          <h1>Your tutor messages</h1>
          <p>
            In-app messages remain available in your account. A verified
            WhatsApp delivery state is shown separately when that channel is
            enabled for the tutor.
          </p>
        </div>
        <button
          className="outline"
          type="button"
          onClick={() => void refresh()}
        >
          Refresh conversations
        </button>
      </section>
      <section className="messages-inbox">
        {notice && (
          <p className="messages-notice" role="status">
            {notice}
          </p>
        )}
        {!ready && <p className="message-empty">Loading conversations…</p>}
        {ready && conversationIds.length === 0 && (
          <div className="message-empty">
            <h2>No conversations yet</h2>
            <p>Open a tutor profile and send a question before booking.</p>
            <Link className="primary" href="/tutors">
              Find a tutor
            </Link>
          </div>
        )}
        {conversationIds.map((conversationId) => {
          const thread = messages.filter(
            (message) => message.conversationId === conversationId,
          );
          const first = thread[0];
          if (!first) return null;
          const tutor = findTutor(first.tutorId);
          return (
            <article className="inbox-thread" key={conversationId}>
              <header>
                {tutor?.image && <img src={tutor.image} alt="" />}
                <div>
                  <h2>{first.tutorName}</h2>
                  <p>
                    {tutor
                      ? `${tutor.examination} · ${tutor.subject}`
                      : "Studacad conversation"}
                  </p>
                </div>
                <span>In-app active</span>
              </header>
              <div className="inbox-messages">
                {thread.map((message) => (
                  <div
                    className={`thread-message ${message.direction}`}
                    key={message.id}
                  >
                    <p>{message.text}</p>
                    <small>
                      {message.direction === "inbound"
                        ? message.tutorName
                        : "You"}{" "}
                      · {new Date(message.createdAt).toLocaleString()} · in-app{" "}
                      {message.status}
                      {message.providerStatus
                        ? ` · WhatsApp ${message.providerStatus.replaceAll("_", " ")}`
                        : ""}
                    </small>
                    {message.canReport && (
                      <button
                        className="message-report"
                        type="button"
                        onClick={() => void moderate(message, "report")}
                      >
                        Report
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="conversation-actions">
                <Link className="outline" href={`/tutor?id=${first.tutorId}`}>
                  Continue conversation
                </Link>
                <button
                  type="button"
                  onClick={() => void moderate(first, "block")}
                >
                  Block contact
                </button>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
