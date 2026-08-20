"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLms } from "./components/LmsProvider";
import { TutorMenu } from "./components/TutorMenu";
import { WalletIcon } from "./components/WalletIcon";
import { ReferralIcon } from "./components/ReferralIcon";
import { AccountNav } from "./components/AccountNav";
import type { Tutor } from "./lib/tutors";
import { useDialogFocus } from "./lib/useDialogFocus";

const Arrow = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 12h14M14 7l5 5-5 5" />
  </svg>
);
const Star = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="m12 2.8 2.8 5.7 6.3.9-4.6 4.5 1.1 6.3-5.6-3-5.6 3 1.1-6.3-4.6-4.5 6.3-.9L12 2.8Z" />
  </svg>
);
const MessageIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 5.5h14v10H9l-4 3v-13Z" />
    <path d="M9 9h6M9 12h4" />
  </svg>
);
const subjects = [
  { name: "Mathematics", exam: "PSLE" },
  { name: "English", exam: "PSLE" },
  { name: "Science", exam: "PSLE" },
  { name: "Setswana", exam: "PSLE" },
  { name: "Mathematics", exam: "JCE" },
  { name: "General Science", exam: "JCE" },
  { name: "Social Studies", exam: "JCE" },
  { name: "English", exam: "JCE" },
  { name: "Mathematics", exam: "BGCSE" },
  { name: "Biology", exam: "BGCSE" },
  { name: "Physics", exam: "BGCSE" },
  { name: "Chemistry", exam: "BGCSE" },
  { name: "Accounting", exam: "BGCSE" },
  { name: "Geography", exam: "BGCSE" },
  { name: "Business Studies", exam: "BGCSE" },
];

const popularSubjectRows = (["PSLE", "JCE", "BGCSE"] as const).map((exam) => ({
  exam,
  subjects: subjects.filter((subject) => subject.exam === exam).slice(0, 3),
}));

export default function Home() {
  const { credits } = useLms();
  const [modal, setModal] = useState<"search" | null>(null);
  const [examination, setExamination] = useState("PSLE");
  const [subject, setSubject] = useState("Mathematics");
  const [featuredTutors, setFeaturedTutors] = useState<Tutor[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [featuredError, setFeaturedError] = useState("");
  const closeSearch = useCallback(() => setModal(null), []);
  const searchDialogRef = useDialogFocus(modal === "search", closeSearch);
  const examSubjects = useMemo(
    () =>
      Array.from(
        new Set(
          subjects
            .filter((item) => item.exam === examination)
            .map((item) => item.name),
        ),
      ),
    [examination],
  );

  useEffect(() => {
    void fetch("/api/tutors", { cache: "no-store" })
      .then((response) =>
        response.ok
          ? response.json()
          : Promise.reject(new Error("Tutor marketplace unavailable")),
      )
      .then((result: { tutors?: Tutor[] }) =>
        setFeaturedTutors((result.tutors ?? []).slice(0, 6)),
      )
      .catch((error) =>
        setFeaturedError(
          error instanceof Error
            ? error.message
            : "Tutor marketplace unavailable",
        ),
      )
      .finally(() => setFeaturedLoading(false));
  }, []);

  const beginSearch = () => {
    closeSearch();
    window.location.href = `/tutors?exam=${encodeURIComponent(examination)}&subject=${encodeURIComponent(subject)}`;
  };

  return (
    <main>
      <div className="support-strip">
        <span className="heart">♥</span>
        <span>
          Tutors, revision, and assessment in one Botswana learning platform.
        </span>
        <a href="#how">See how it works</a>
      </div>

      <header className="nav">
        <Link className="brand" href="/" aria-label="Studacad home">
          <span>Studacad</span>
          <i className="brand-mark">
            <b />
            <b />
            <b />
          </i>
        </Link>
        <nav aria-label="Main navigation">
          <TutorMenu />
          <Link href="/how-it-works">How it works</Link>
          <Link href="/become-a-tutor">Become a tutor</Link>
          <Link href="/learn">My learning</Link>
        </nav>
        <div className="nav-actions">
          <Link
            className="message-nav"
            href="/messages"
            aria-label="Messages"
            title="Messages"
          >
            <MessageIcon />
          </Link>
          <Link
            className="referral-nav"
            href="/referral"
            aria-label="Refer a friend"
            title="Refer a friend"
          >
            <ReferralIcon />
            <strong>Refer</strong>
          </Link>
          <Link
            className="currency wallet-nav"
            href="/wallet"
            aria-label={`Wallet balance: ${credits.toLocaleString()} credits`}
            title="Wallet"
          >
            <WalletIcon />
            <strong>{credits.toLocaleString()}</strong>
          </Link>
          <Link className="help" href="/help" aria-label="Help">
            ?
          </Link>
          <AccountNav />
        </div>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">
            Botswana&apos;s tutoring and exam-prep platform
          </p>
          <h1>
            Get exam ready
            <br />
            with the right
            <br />
            support
          </h1>
          <div className="button-row hero-actions">
            <button
              className="primary hero-cta"
              onClick={() => setModal("search")}
            >
              Find a subject tutor <Arrow />
            </button>
            <Link className="outline" href="/courses">
              Browse courses
            </Link>
          </div>
          <div className="mini-proof">
            {featuredTutors.length > 0 && (
              <div className="faces">
                {featuredTutors.slice(0, 3).map((tutor) => (
                  <img
                    key={tutor.id}
                    src={tutor.image}
                    alt=""
                    width={320}
                    height={320}
                    decoding="async"
                  />
                ))}
              </div>
            )}
            <span>
              Focused on <strong>PSLE, JCE &amp; BGCSE</strong>
            </span>
          </div>
        </div>
        <div
          className="hero-visual"
          aria-label="Studacad online subject lesson preview"
        >
          <div className="echo-card echo-one" />
          <div className="echo-card echo-two" />
          <div className="video-card">
            <img
              src="https://images.unsplash.com/photo-1580894732444-8ecded7900cd?auto=format&fit=crop&w=1000&q=88"
              alt="Tutor teaching a Botswana examination subject online"
              width={1000}
              height={667}
              decoding="async"
              fetchPriority="high"
            />
            <div className="student-pip">
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=85"
                alt="Student in an online tutorial"
                width={400}
                height={400}
                decoding="async"
              />
            </div>
            <div className="lesson-pill">
              <span className="live-dot" /> BGCSE Mathematics
            </div>
            <div className="call-controls" aria-hidden="true">
              <span>⌁</span>
              <span>●</span>
              <span className="end">×</span>
            </div>
          </div>
        </div>
      </section>

      <section className="lms-promo">
        <div className="lms-promo-copy">
          <p className="eyebrow">One Studacad account</p>
          <h2>
            Your tutor and revision plan
            <br />
            work together
          </h2>
          <p>
            Book a subject tutor, continue with syllabus-focused tutorial
            videos, download revision papers, and complete an end-of-lesson
            multiple-choice test—all with the same wallet and learning record.
          </p>
          <div className="button-row">
            <Link className="primary" href="/learn">
              Open my learning <Arrow />
            </Link>
            <a className="outline" href="#tutors">
              Meet subject tutors
            </a>
          </div>
        </div>
        <div className="lms-promo-board">
          <div className="promo-top">
            <span>One learning record</span>
            <b>Saved to your account</b>
          </div>
          <div className="promo-module video-module">
            <i>▶</i>
            <span>
              <small>Tutorial</small>
              <strong>Watch published lesson material</strong>
            </span>
            <b>Video</b>
          </div>
          <div className="promo-module">
            <i>▤</i>
            <span>
              <small>Revision resource</small>
              <strong>Open an authorised course file</strong>
            </span>
            <b>File</b>
          </div>
          <div className="promo-module quiz-module">
            <i>✓</i>
            <span>
              <small>Knowledge check</small>
              <strong>Record your submitted result</strong>
            </span>
            <b>Saved</b>
          </div>
        </div>
      </section>

      <section className="metrics" aria-label="Studacad platform highlights">
        <div>
          <strong>3</strong>
          <span>Botswana exam pathways</span>
        </div>
        <div>
          <strong>15+</strong>
          <span>Subject areas</span>
        </div>
        <div>
          <strong>1-to-1</strong>
          <span>Live tutor support</span>
        </div>
        <div>
          <strong>1</strong>
          <span>Authoritative learning record</span>
        </div>
      </section>

      <section className="language-section" id="tutors">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Start with your examination</p>
            <h2>What do you need help with?</h2>
          </div>
          <p>
            Choose a PSLE, JCE, or BGCSE subject to meet tutors and find
            matching revision courses.
          </p>
        </div>
        <div className="popular-subject-rows">
          {popularSubjectRows.map((row, rowIndex) => (
            <div className="popular-subject-row" key={row.exam}>
              <div
                className="popular-subject-label"
                id={row.exam.toLowerCase()}
              >
                <span>Popular {row.exam} subjects</span>
              </div>
              <div className="language-grid">
                {row.subjects.map((item, subjectIndex) => (
                  <Link
                    key={`${item.exam}-${item.name}`}
                    className={`language-card color-${(rowIndex * 3 + subjectIndex) % 5}`}
                    href={`/tutors?exam=${encodeURIComponent(item.exam)}&subject=${encodeURIComponent(item.name)}`}
                  >
                    <span>
                      <strong>{item.name}</strong>
                      <small>{item.exam} subject</small>
                    </span>
                    <Arrow />
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="tutor-showcase" id="tutor-results">
        <div className="section-heading compact">
          <div>
            <p className="eyebrow">Featured Botswana exam tutors</p>
            <h2>Meet tutors who know the syllabus</h2>
          </div>
          <Link className="outline" href="/tutors">
            Browse all tutors <Arrow />
          </Link>
        </div>
        <div className="tutor-grid">
          {featuredTutors.map((tutor) => (
            <article className="tutor-card" key={tutor.name}>
              <div className={`tutor-photo ${tutor.color}`}>
                <img
                  src={tutor.image}
                  alt={`${tutor.name}, ${tutor.examination} ${tutor.subject} tutor`}
                  width={900}
                  height={900}
                  loading="lazy"
                  decoding="async"
                />
                <em className="featured-badge">Approved profile</em>
              </div>
              <div className="tutor-info">
                <div>
                  <h3>
                    {tutor.name} <i>✓</i>
                  </h3>
                  <p>
                    {tutor.examination} {tutor.subject} tutor
                  </p>
                </div>
                <div className="rating">
                  <Star />
                  <strong>{tutor.rating}</strong>
                  <small>{tutor.lessons}</small>
                </div>
                <p className="bio">{tutor.headline}</p>
                <div className="price">
                  <span>
                    <strong>{tutor.price}</strong> credits / 50-min lesson
                  </span>
                  <Link href={`/tutors/${tutor.id}`}>View profile</Link>
                </div>
              </div>
            </article>
          ))}
        </div>
        {featuredLoading && (
          <p className="loading-state">Loading approved tutor profiles…</p>
        )}
        {featuredError && (
          <div className="locked-state">
            <h3>Tutor profiles are temporarily unavailable</h3>
            <p>{featuredError}</p>
            <Link className="outline" href="/tutors">
              Try the marketplace
            </Link>
          </div>
        )}
        {!featuredLoading && !featuredError && featuredTutors.length === 0 && (
          <div className="locked-state">
            <h3>No approved tutor profiles are published yet</h3>
            <p>New profiles appear here only after verification.</p>
            <Link className="outline" href="/become-a-tutor">
              Apply to teach
            </Link>
          </div>
        )}
      </section>

      <section className="how" id="how">
        <p className="eyebrow">One connected learning journey</p>
        <h2>How Studacad works</h2>
        <div className="steps">
          <article>
            <span className="step-number">1</span>
            <div className="step-art art-one">
              <div className="search-chip">⌕ BGCSE Maths · today</div>
              {featuredTutors[0] && (
                <div className="mini-profile">
                  <img
                    src={featuredTutors[0].image}
                    alt=""
                    width={320}
                    height={320}
                    loading="lazy"
                    decoding="async"
                  />
                  <span>
                    <strong>{featuredTutors[0].name}</strong>
                    <small>
                      {featuredTutors[0].subject} · {featuredTutors[0].rating} ★
                    </small>
                  </span>
                </div>
              )}
            </div>
            <h3>Find subject support</h3>
            <p>
              Choose your examination and subject, then match with a tutor by
              price, availability, and teaching style.
            </p>
          </article>
          <article>
            <span className="step-number">2</span>
            <div className="step-art art-two">
              <div className="bubble b1">Let&apos;s factorise x² + 5x + 6.</div>
              <div className="bubble b2">I get it now! ✨</div>
              <div className="sound-wave">▂▄▆▃▇▄▂</div>
            </div>
            <h3>Learn live and online</h3>
            <p>
              Use credits to book focused one-to-one tutorials built around your
              PSLE, JCE, or BGCSE goals.
            </p>
          </article>
          <article>
            <span className="step-number">3</span>
            <div className="step-art art-three">
              <div className="streak">
                <strong>Saved</strong>
                <span>learning progress</span>
              </div>
              <div className="chart">
                <i />
                <i />
                <i />
                <i />
                <i />
              </div>
            </div>
            <h3>Revise and test</h3>
            <p>
              Continue in My Learning with videos, revision papers, and short
              tests that record progress.
            </p>
          </article>
        </div>
      </section>

      <section className="guarantee">
        <div className="guarantee-copy">
          <span className="spark">✦</span>
          <h2>
            Clear terms before
            <br />
            you commit credits
          </h2>
          <p>
            Every booking shows its live price and time. Cancel any time before
            the lesson starts for a full credit refund.
          </p>
          <button className="primary" onClick={() => setModal("search")}>
            Find a tutor <Arrow />
          </button>
        </div>
        <div className="quote-card">
          <h3>Account-backed from start to finish</h3>
          <p>
            Bookings, wallet activity, messages, purchased courses, lesson
            progress, refunds, and support cases are saved to your Studacad
            account.
          </p>
          <Link className="outline" href="/how-it-works">
            See how the platform works
          </Link>
        </div>
      </section>

      <section className="split-cta teach" id="teach">
        <div>
          <p className="eyebrow">Teach Botswana learners</p>
          <h2>
            Turn subject knowledge
            <br />
            into real progress
          </h2>
          <p>
            Join Studacad as a PSLE, JCE, or BGCSE tutor and support learners
            across Botswana.
          </p>
          <ul>
            <li>Teach your strongest examination subjects</li>
            <li>Set your own credit price and schedule</li>
            <li>Support lessons with revision and quizzes</li>
          </ul>
          <Link className="primary" href="/become-a-tutor">
            Become a tutor <Arrow />
          </Link>
        </div>
        <div className="cta-image tutor-desk">
          <img
            src="https://images.unsplash.com/photo-1580894732444-8ecded7900cd?auto=format&fit=crop&w=1000&q=85"
            alt="Subject tutor teaching online"
            width={1000}
            height={667}
            loading="lazy"
            decoding="async"
          />
        </div>
      </section>

      <section className="split-cta business" id="schools">
        <div className="business-art">
          <span className="word w1">PSLE</span>
          <span className="word w2">JCE</span>
          <span className="word w3">BGCSE</span>
          <div className="orbit o1" />
          <div className="orbit o2" />
          <div className="orbit o3" />
        </div>
        <div>
          <p className="eyebrow">Studacad for schools</p>
          <h2>
            Discuss learning support
            <br />
            for your students
          </h2>
          <p>
            School arrangements are handled through support while institutional
            tools are being assessed.
          </p>
          <div className="button-row">
            <Link className="primary" href="/contact">
              Contact Studacad <Arrow />
            </Link>
            <Link className="outline" href="/how-it-works">
              Explore the platform
            </Link>
          </div>
        </div>
      </section>

      <section className="final-cta">
        <div>
          <p className="eyebrow">Your next result starts with one topic</p>
          <h2>Ready to prepare with confidence?</h2>
        </div>
        <button className="primary light" onClick={() => setModal("search")}>
          Find subject support <Arrow />
        </button>
      </section>

      {modal && (
        <div className="modal-backdrop" onMouseDown={closeSearch}>
          <section
            ref={searchDialogRef}
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="home-search-heading"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              className="modal-close"
              type="button"
              aria-label="Close tutor search"
              onClick={closeSearch}
            >
              ×
            </button>
            <>
              <p className="eyebrow">Find your Studacad match</p>
              <h2 id="home-search-heading">Which subject needs support?</h2>
              <label>
                Examination
                <select
                  value={examination}
                  onChange={(event) => {
                    const exam = event.target.value;
                    setExamination(exam);
                    setSubject(
                      subjects.find((item) => item.exam === exam)?.name ??
                        "Mathematics",
                    );
                  }}
                >
                  <option>PSLE</option>
                  <option>JCE</option>
                  <option>BGCSE</option>
                </select>
              </label>
              <label>
                Subject
                <select
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                >
                  {examSubjects.map((name) => (
                    <option key={name}>{name}</option>
                  ))}
                </select>
              </label>
              <button className="primary modal-primary" onClick={beginSearch}>
                See matching tutors <Arrow />
              </button>
              <small className="fine-print">
                No payment required · Change your subject anytime
              </small>
            </>
          </section>
        </div>
      )}
    </main>
  );
}
