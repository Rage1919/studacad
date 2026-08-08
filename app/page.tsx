"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useLms } from "./components/LmsProvider";
import { TutorMenu } from "./components/TutorMenu";
import { tutors } from "./lib/tutors";

const Arrow = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M14 7l5 5-5 5" /></svg>;
const Star = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2.8 2.8 5.7 6.3.9-4.6 4.5 1.1 6.3-5.6-3-5.6 3 1.1-6.3-4.6-4.5 6.3-.9L12 2.8Z" /></svg>;
const Chevron = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 9 5 5 5-5" /></svg>;

const subjects = [
  { name: "Mathematics", exam: "PSLE", count: "48", code: "P7" },
  { name: "English", exam: "PSLE", count: "36", code: "P7" },
  { name: "Science", exam: "PSLE", count: "31", code: "P7" },
  { name: "Setswana", exam: "PSLE", count: "27", code: "P7" },
  { name: "Mathematics", exam: "JCE", count: "42", code: "F3" },
  { name: "General Science", exam: "JCE", count: "39", code: "F3" },
  { name: "Social Studies", exam: "JCE", count: "24", code: "F3" },
  { name: "English", exam: "JCE", count: "34", code: "F3" },
  { name: "Mathematics", exam: "BGCSE", count: "51", code: "F5" },
  { name: "Biology", exam: "BGCSE", count: "33", code: "F5" },
  { name: "Physics", exam: "BGCSE", count: "29", code: "F5" },
  { name: "Chemistry", exam: "BGCSE", count: "28", code: "F5" },
  { name: "Accounting", exam: "BGCSE", count: "22", code: "F5" },
  { name: "Geography", exam: "BGCSE", count: "19", code: "F5" },
  { name: "Business Studies", exam: "BGCSE", count: "21", code: "F5" }
];

export default function Home() {
  const { credits } = useLms();
  const [showAll, setShowAll] = useState(false);
  const [modal, setModal] = useState<"search" | "login" | null>(null);
  const [examination, setExamination] = useState("PSLE");
  const [subject, setSubject] = useState("Mathematics");
  const visibleSubjects = useMemo(() => showAll ? subjects : subjects.slice(0, 9), [showAll]);
  const examSubjects = useMemo(() => Array.from(new Set(subjects.filter(item => item.exam === examination).map(item => item.name))), [examination]);

  const beginSearch = () => {
    setModal(null);
    window.location.href = `/tutors?exam=${encodeURIComponent(examination)}&subject=${encodeURIComponent(subject)}`;
  };

  return (
    <main>
      <div className="support-strip">
        <span className="heart">♥</span>
        <span>Tutors, revision, and assessment in one Botswana learning platform.</span>
        <a href="#how">See how it works</a>
      </div>

      <header className="nav">
        <a className="brand" href="#top" aria-label="Studacad home">
          <span>Studacad</span><i className="brand-mark"><b /><b /><b /></i>
        </a>
        <nav aria-label="Main navigation">
          <TutorMenu />
          <Link href="/learn">My learning</Link>
        </nav>
        <div className="nav-actions">
          <Link className="currency wallet-nav" href="/wallet">◆ {credits.toLocaleString()} credits</Link>
          <button className="help" aria-label="Help">?</button>
          <button className="login" onClick={() => setModal("login")}>↪ <span>Log in</span></button>
        </div>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">Botswana&apos;s tutoring and exam-prep platform</p>
          <h1>Get exam-ready<br />with the right<br />support.</h1>
          <div className="button-row hero-actions"><button className="primary hero-cta" onClick={() => setModal("search")}>Find a subject tutor <Arrow /></button><Link className="outline" href="/learn">Browse courses</Link></div>
          <div className="mini-proof">
            <div className="faces"><img src={tutors[0].image} alt="" /><img src={tutors[1].image} alt="" /><img src={tutors[2].image} alt="" /></div>
            <span>Focused on <strong>PSLE, JCE &amp; BGCSE</strong></span>
          </div>
        </div>
        <div className="hero-visual" aria-label="Studacad online subject lesson preview">
          <div className="echo-card echo-one" /><div className="echo-card echo-two" />
          <div className="video-card">
            <img src="https://images.unsplash.com/photo-1580894732444-8ecded7900cd?auto=format&fit=crop&w=1000&q=88" alt="Tutor teaching a Botswana examination subject online" />
            <div className="student-pip"><img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=85" alt="Student in an online tutorial" /></div>
            <div className="lesson-pill"><span className="live-dot" /> BGCSE Mathematics</div>
            <div className="call-controls"><button>⌁</button><button>●</button><button className="end">×</button></div>
          </div>
        </div>
      </section>

      <section className="lms-promo">
        <div className="lms-promo-copy"><p className="eyebrow">One Studacad account</p><h2>Your tutor and revision plan<br />work together.</h2><p>Book a subject tutor, continue with syllabus-focused tutorial videos, download revision papers, and complete an end-of-lesson multiple-choice test—all with the same wallet and learning record.</p><div className="button-row"><Link className="primary" href="/learn">Open my learning <Arrow /></Link><a className="outline" href="#tutors">Meet subject tutors</a></div></div>
        <div className="lms-promo-board"><div className="promo-top"><span>My BGCSE plan</span><b>3 activities this week</b></div><div className="promo-module video-module"><i>▶</i><span><small>Tutor tutorial</small><strong>Factorise quadratic expressions</strong></span><b>24 min</b></div><div className="promo-module"><i>▤</i><span><small>Revision paper</small><strong>Quadratics practice set</strong></span><b>PDF</b></div><div className="promo-module quiz-module"><i>✓</i><span><small>Checkpoint passed</small><strong>Retention score</strong></span><b>90%</b></div></div>
      </section>

      <section className="metrics" aria-label="Studacad platform highlights">
        <div><strong>3</strong><span>Botswana exam pathways</span></div>
        <div><strong>15+</strong><span>Subject areas</span></div>
        <div><strong>1-to-1</strong><span>Live tutor support</span></div>
        <div><strong>24/7</strong><span>Revision access</span></div>
        <div><strong className="metric-stars">4.8 ★★★★★</strong><span>demo learner rating</span></div>
      </section>

      <section className="language-section" id="tutors">
        <div className="section-heading">
          <div><p className="eyebrow">Start with your examination</p><h2>What do you need help with?</h2></div>
          <p>Choose a PSLE, JCE, or BGCSE subject to meet tutors and find matching revision courses.</p>
        </div>
        <div className="exam-anchor-row" aria-label="Examination levels"><span id="psle">PSLE · Standard 7</span><span id="jce">JCE · Form 3</span><span id="bgcse">BGCSE · Form 5</span></div>
        <div className="language-grid">
          {visibleSubjects.map((item, index) => (
            <Link key={`${item.exam}-${item.name}`} className={`language-card color-${index % 5}`} href={`/tutors?exam=${encodeURIComponent(item.exam)}&subject=${encodeURIComponent(item.name)}`}>
              <span className="flag">{item.code}</span>
              <span><strong>{item.name}</strong><small>{item.exam} · {item.count} tutors</small></span>
              <Arrow />
            </Link>
          ))}
        </div>
        <button className="outline show-more" onClick={() => setShowAll(value => !value)}>{showAll ? "Show fewer subjects" : "Show all subjects"} <Chevron /></button>
      </section>

      <section className="tutor-showcase" id="tutor-results">
        <div className="section-heading compact">
          <div><p className="eyebrow">Popular Botswana exam tutors</p><h2>Meet tutors who know the syllabus.</h2></div>
          <Link className="outline" href="/tutors">Browse all tutors <Arrow /></Link>
        </div>
        <div className="tutor-grid">
          {tutors.map(tutor => (
            <article className="tutor-card" key={tutor.name}>
              <div className={`tutor-photo ${tutor.color}`}><img src={tutor.image} alt={`${tutor.name}, ${tutor.examination} ${tutor.subject} tutor`} /><button aria-label={`Save ${tutor.name}`}>♡</button><span>Available today</span></div>
              <div className="tutor-info">
                <div><h3>{tutor.name} <i>✓</i></h3><p>{tutor.examination} {tutor.subject} tutor</p></div>
                <div className="rating"><Star /><strong>{tutor.rating}</strong><small>{tutor.lessons}</small></div>
                <p className="bio">{tutor.headline}</p>
                <div className="price"><span><strong>{tutor.price}</strong> credits / 50-min lesson</span><Link href={`/tutor?id=${tutor.id}`}>View profile</Link></div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="how" id="how">
        <p className="eyebrow">One connected learning journey</p><h2>How Studacad works:</h2>
        <div className="steps">
          <article><span className="step-number">1</span><div className="step-art art-one"><div className="search-chip">⌕ BGCSE Maths · today</div><div className="mini-profile"><img src={tutors[0].image} alt="" /><span><strong>Masego</strong><small>Mathematics · 4.9 ★</small></span></div></div><h3>Find subject support.</h3><p>Choose your examination and subject, then match with a tutor by price, availability, and teaching style.</p></article>
          <article><span className="step-number">2</span><div className="step-art art-two"><div className="bubble b1">Let&apos;s factorise x² + 5x + 6.</div><div className="bubble b2">I get it now! ✨</div><div className="sound-wave">▂▄▆▃▇▄▂</div></div><h3>Learn live and online.</h3><p>Use credits to book focused one-to-one tutorials built around your PSLE, JCE, or BGCSE goals.</p></article>
          <article><span className="step-number">3</span><div className="step-art art-three"><div className="streak"><strong>86%</strong><span>quiz score</span></div><div className="chart"><i /><i /><i /><i /><i /></div></div><h3>Revise and test.</h3><p>Continue in My Learning with videos, revision papers, and short tests that record progress and reward mastery.</p></article>
        </div>
      </section>

      <section className="guarantee">
        <div className="guarantee-copy"><span className="spark">✦</span><h2>Support for the exam<br />in front of you.</h2><p>Switch tutors if your first match is not right and keep every purchased course in your library.</p><button className="primary" onClick={() => setModal("search")}>Find a tutor <Arrow /></button></div>
        <div className="quote-card"><div className="quote-stars">★★★★★</div><blockquote>“The tutor explained the topic, then the revision paper and quiz helped me see what I still needed to practise.”</blockquote><div className="quote-person"><img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=85" alt="Learner portrait" /><span><strong>Kabelo M.</strong><small>Preparing for BGCSE · Demo learner</small></span></div></div>
      </section>

      <section className="split-cta teach" id="teach">
        <div><p className="eyebrow">Teach Botswana learners</p><h2>Turn subject knowledge<br />into real progress.</h2><p>Join Studacad as a PSLE, JCE, or BGCSE tutor and support learners across Botswana.</p><ul><li>Teach your strongest examination subjects</li><li>Set your own credit price and schedule</li><li>Support lessons with revision and quizzes</li></ul><button className="primary">Become a tutor <Arrow /></button></div>
        <div className="cta-image tutor-desk"><img src="https://images.unsplash.com/photo-1580894732444-8ecded7900cd?auto=format&fit=crop&w=1000&q=85" alt="Subject tutor teaching online" /><span className="income-card"><small>This month</small><strong>2,840 credits</strong><i>↑ 18% from last month</i></span></div>
      </section>

      <section className="split-cta business" id="schools">
        <div className="business-art"><span className="word w1">PSLE</span><span className="word w2">JCE</span><span className="word w3">BGCSE</span><div className="orbit o1" /><div className="orbit o2" /><div className="orbit o3" /></div>
        <div><p className="eyebrow">Studacad for schools</p><h2>Extra learning support<br />your students can use.</h2><p>Subject tutoring, structured revision, and measurable lesson checks in one flexible platform.</p><div className="button-row"><button className="primary">Book a demo <Arrow /></button><button className="outline">Explore for schools</button></div></div>
      </section>

      <section className="final-cta"><div><p className="eyebrow">Your next result starts with one topic</p><h2>Ready to prepare with confidence?</h2></div><button className="primary light" onClick={() => setModal("search")}>Find subject support <Arrow /></button></section>

      <footer>
        <div className="footer-top"><a className="brand footer-brand" href="#top"><span>Studacad</span><i className="brand-mark"><b /><b /><b /></i></a><p>Botswana tutors, courses, revision papers, and tests in one place.</p><div className="socials"><button>in</button><button>◎</button><button>▶</button><button>f</button></div></div>
        <div className="footer-links"><div><h4>About Studacad</h4><a href="#how">How it works</a><a href="#schools">For schools</a><a href="#">Reviews</a><a href="#">Careers</a></div><div><h4>For students</h4><a href="#tutors">Find tutors</a><Link href="/learn">My learning</Link><Link href="/wallet">Credits wallet</Link><a href="#tutors">Browse subjects</a></div><div><h4>Exam pathways</h4><a href="#psle">PSLE subjects</a><a href="#jce">JCE subjects</a><a href="#bgcse">BGCSE subjects</a><a href="#teach">Become a tutor</a></div><div><h4>Learning tools</h4><Link href="/learn">Tutorial videos</Link><Link href="/learn">Revision papers</Link><Link href="/learn">Lesson tests</Link><a href="#schools">School support</a></div><div><h4>Support</h4><a href="#">Help centre</a><a href="#">Contact us</a><a href="#">Safety</a><a href="#">Community guidelines</a></div></div>
        <div className="footer-bottom"><span>© 2026 Studacad. Demo experience.</span><div><a href="#">Privacy</a><a href="#">Terms</a><a href="#">Accessibility</a></div></div>
      </footer>

      {modal && <div className="modal-backdrop" onMouseDown={() => setModal(null)}><div className="modal" onMouseDown={event => event.stopPropagation()}>
        <button className="modal-close" onClick={() => setModal(null)}>×</button>
        {modal === "search" ? <>
          <p className="eyebrow">Find your Studacad match</p><h2>Which subject needs support?</h2><label>Examination<select value={examination} onChange={event => { const exam = event.target.value; setExamination(exam); setSubject(subjects.find(item => item.exam === exam)?.name ?? "Mathematics"); }}><option>PSLE</option><option>JCE</option><option>BGCSE</option></select></label>
          <label>Subject<select value={subject} onChange={event => setSubject(event.target.value)}>{examSubjects.map(name => <option key={name}>{name}</option>)}</select></label>
          <button className="primary modal-primary" onClick={beginSearch}>See matching tutors <Arrow /></button><small className="fine-print">No payment required · Change your subject anytime</small>
        </> : <>
          <p className="eyebrow">Welcome back</p><h2>Log in to Studacad</h2><button className="social-login">G <span>Continue with Google</span></button><button className="social-login">◎ <span>Continue with Apple</span></button><div className="divider"><span>or</span></div><label>Email<input type="email" placeholder="you@example.com" /></label><button className="primary modal-primary">Continue with email <Arrow /></button><small className="fine-print">Demo only — no account will be created.</small>
        </>}
      </div></div>}
    </main>
  );
}
