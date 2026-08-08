"use client";

import { useMemo, useState } from "react";

const Arrow = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M14 7l5 5-5 5" /></svg>;
const Star = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2.8 2.8 5.7 6.3.9-4.6 4.5 1.1 6.3-5.6-3-5.6 3 1.1-6.3-4.6-4.5 6.3-.9L12 2.8Z" /></svg>;
const Chevron = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 9 5 5 5-5" /></svg>;

const languages = [
  ["English", "34,218", "EN"], ["Spanish", "10,403", "ES"], ["French", "3,812", "FR"],
  ["German", "1,584", "DE"], ["Italian", "2,618", "IT"], ["Chinese", "5,390", "ZH"],
  ["Arabic", "3,742", "AR"], ["Japanese", "3,018", "JA"], ["Portuguese", "1,706", "PT"],
  ["Korean", "1,226", "KO"], ["Dutch", "406", "NL"], ["Turkish", "821", "TR"]
];

const tutors = [
  { name: "Amara", subject: "English tutor", rating: "4.9", lessons: "2,147 lessons", price: "$24", color: "peach", image: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=700&q=85" },
  { name: "Mateo", subject: "Spanish tutor", rating: "5.0", lessons: "1,684 lessons", price: "$19", color: "blue", image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=700&q=85" },
  { name: "Camille", subject: "French tutor", rating: "4.9", lessons: "983 lessons", price: "$27", color: "yellow", image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=700&q=85" }
];

export default function Home() {
  const [showAll, setShowAll] = useState(false);
  const [modal, setModal] = useState<"search" | "login" | null>(null);
  const [language, setLanguage] = useState("English");
  const [goal, setGoal] = useState("Conversation confidence");
  const visibleLanguages = useMemo(() => showAll ? languages : languages.slice(0, 9), [showAll]);

  const beginSearch = () => {
    setModal(null);
    document.getElementById("tutors")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <main>
      <div className="support-strip">
        <span className="heart">♥</span>
        <span>Every conversation can open a new world.</span>
        <a href="#mission">Our mission</a>
      </div>

      <header className="nav">
        <a className="brand" href="#top" aria-label="LingoLift home">
          <span>LingoLift</span><i className="brand-mark"><b /><b /><b /></i>
        </a>
        <nav aria-label="Main navigation">
          <a href="#tutors">Find tutors</a>
          <a href="#business">For business</a>
          <a href="#teach">Become a tutor</a>
          <a href="#progress">How it works</a>
        </nav>
        <div className="nav-actions">
          <button className="currency">English, USD <Chevron /></button>
          <button className="help" aria-label="Help">?</button>
          <button className="login" onClick={() => setModal("login")}>↪ <span>Log in</span></button>
        </div>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">1-to-1 online language lessons</p>
          <h1>Learn faster<br />with your best<br />language tutor.</h1>
          <button className="primary hero-cta" onClick={() => setModal("search")}>Find your tutor <Arrow /></button>
          <div className="mini-proof">
            <div className="faces"><img src={tutors[0].image} alt="" /><img src={tutors[1].image} alt="" /><img src={tutors[2].image} alt="" /></div>
            <span>Loved by <strong>300,000+</strong> learners</span>
          </div>
        </div>
        <div className="hero-visual" aria-label="Online language lesson preview">
          <div className="echo-card echo-one" /><div className="echo-card echo-two" />
          <div className="video-card">
            <img src="https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1000&q=88" alt="Smiling language tutor in an online lesson" />
            <div className="student-pip"><img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=85" alt="Student in video call" /></div>
            <div className="lesson-pill"><span className="live-dot" /> Live lesson</div>
            <div className="call-controls"><button>⌁</button><button>●</button><button className="end">×</button></div>
          </div>
        </div>
      </section>

      <section className="metrics" aria-label="Platform statistics">
        <div><strong>100,000+</strong><span>Experienced tutors</span></div>
        <div><strong>300,000+</strong><span>5-star tutor reviews</span></div>
        <div><strong>120+</strong><span>Subjects taught</span></div>
        <div><strong>180+</strong><span>Tutor nationalities</span></div>
        <div><strong className="metric-stars">4.8 ★★★★★</strong><span>from happy learners</span></div>
      </section>

      <section className="language-section" id="tutors">
        <div className="section-heading">
          <div><p className="eyebrow">Start with a language</p><h2>What do you want to learn?</h2></div>
          <p>Choose your subject and meet tutors who match your goals, schedule, and personality.</p>
        </div>
        <div className="language-grid">
          {visibleLanguages.map(([name, count, code], index) => (
            <button key={name} className={`language-card color-${index % 5}`} onClick={() => { setLanguage(name); setModal("search"); }}>
              <span className="flag">{code}</span>
              <span><strong>{name} tutors</strong><small>{count} teachers</small></span>
              <Arrow />
            </button>
          ))}
        </div>
        <button className="outline show-more" onClick={() => setShowAll(v => !v)}>{showAll ? "Show less" : "Show more languages"} <Chevron /></button>
      </section>

      <section className="tutor-showcase" id="progress">
        <div className="section-heading compact">
          <div><p className="eyebrow">Popular this week</p><h2>Meet tutors who get you talking.</h2></div>
          <button className="outline" onClick={() => setModal("search")}>Browse all tutors <Arrow /></button>
        </div>
        <div className="tutor-grid">
          {tutors.map(tutor => (
            <article className="tutor-card" key={tutor.name}>
              <div className={`tutor-photo ${tutor.color}`}><img src={tutor.image} alt={`${tutor.name}, ${tutor.subject}`} /><button aria-label={`Save ${tutor.name}`}>♡</button><span>Available today</span></div>
              <div className="tutor-info">
                <div><h3>{tutor.name} <i>✓</i></h3><p>{tutor.subject}</p></div>
                <div className="rating"><Star /><strong>{tutor.rating}</strong><small>{tutor.lessons}</small></div>
                <p className="bio">Friendly, certified tutor who makes every lesson practical, encouraging, and focused on your real-life goals.</p>
                <div className="price"><span><strong>{tutor.price}</strong> / 50-min lesson</span><button onClick={() => setModal("search")}>View profile</button></div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="how" id="mission">
        <p className="eyebrow">Simple by design</p><h2>How LingoLift works:</h2>
        <div className="steps">
          <article><span className="step-number">1</span><div className="step-art art-one"><div className="search-chip">⌕ French · today</div><div className="mini-profile"><img src={tutors[2].image} alt="" /><span><strong>Camille</strong><small>French · 4.9 ★</small></span></div></div><h3>Find your tutor.</h3><p>Filter by language, price, availability, and teaching style to meet your ideal match.</p></article>
          <article><span className="step-number">2</span><div className="step-art art-two"><div className="bubble b1">How was your weekend?</div><div className="bubble b2">¡Fue genial! ✨</div><div className="sound-wave">▂▄▆▃▇▄▂</div></div><h3>Start learning.</h3><p>Your tutor tailors every lesson to your goals so progress feels personal from day one.</p></article>
          <article><span className="step-number">3</span><div className="step-art art-three"><div className="streak"><strong>12</strong><span>week streak</span></div><div className="chart"><i /><i /><i /><i /><i /></div></div><h3>Make weekly progress.</h3><p>Build lasting confidence one real conversation—and one small win—at a time.</p></article>
        </div>
      </section>

      <section className="guarantee">
        <div className="guarantee-copy"><span className="spark">✦</span><h2>Lessons you’ll love.<br />Guaranteed.</h2><p>Try another tutor for free if your first match isn’t right.</p><button className="primary" onClick={() => setModal("search")}>Find your tutor <Arrow /></button></div>
        <div className="quote-card"><div className="quote-stars">★★★★★</div><blockquote>“I stopped translating in my head and finally started speaking with confidence.”</blockquote><div className="quote-person"><img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=85" alt="Learner portrait" /><span><strong>Daniel M.</strong><small>Learning Spanish · 8 months</small></span></div></div>
      </section>

      <section className="split-cta teach" id="teach">
        <div><p className="eyebrow">Teach from anywhere</p><h2>Share what you know.<br />Earn on your terms.</h2><p>Join a worldwide community of tutors and grow your independent teaching business.</p><ul><li>Find students from around the world</li><li>Set your own price and schedule</li><li>Get paid securely</li></ul><button className="primary">Become a tutor <Arrow /></button></div>
        <div className="cta-image tutor-desk"><img src="https://images.unsplash.com/photo-1580894732444-8ecded7900cd?auto=format&fit=crop&w=1000&q=85" alt="Tutor teaching from home" /><span className="income-card"><small>This month</small><strong>$2,840</strong><i>↑ 18% from last month</i></span></div>
      </section>

      <section className="split-cta business" id="business">
        <div className="business-art"><span className="word w1">Valise</span><span className="word w2">Maleta</span><span className="word w3">Luggage</span><div className="orbit o1" /><div className="orbit o2" /><div className="orbit o3" /></div>
        <div><p className="eyebrow">LingoLift for business</p><h2>Language training<br />your team will use.</h2><p>Personalized 1-to-1 lessons, measurable progress, and a flexible global tutor network.</p><div className="button-row"><button className="primary">Book a demo <Arrow /></button><button className="outline">Explore for business</button></div></div>
      </section>

      <section className="final-cta"><div><p className="eyebrow">Your next conversation starts here</p><h2>Ready to speak with confidence?</h2></div><button className="primary light" onClick={() => setModal("search")}>Find your tutor <Arrow /></button></section>

      <footer>
        <div className="footer-top"><a className="brand footer-brand" href="#top"><span>LingoLift</span><i className="brand-mark"><b /><b /><b /></i></a><p>Human connection is the fastest way to a new language.</p><div className="socials"><button>in</button><button>◎</button><button>▶</button><button>f</button></div></div>
        <div className="footer-links"><div><h4>About us</h4><a href="#mission">Who we are</a><a href="#progress">How it works</a><a href="#">Reviews</a><a href="#">Careers</a></div><div><h4>For students</h4><a href="#tutors">Find tutors</a><a href="#">Learning blog</a><a href="#">Language tests</a><a href="#">Student discount</a></div><div><h4>For tutors</h4><a href="#teach">Become a tutor</a><a href="#">Teaching resources</a><a href="#">Tutor community</a><a href="#">Online tutoring jobs</a></div><div><h4>For companies</h4><a href="#business">Team training</a><a href="#">English for teams</a><a href="#">Resource center</a><a href="#">Contact sales</a></div><div><h4>Support</h4><a href="#">Help center</a><a href="#">Contact us</a><a href="#">Safety</a><a href="#">Community guidelines</a></div></div>
        <div className="footer-bottom"><span>© 2026 LingoLift. Demo experience.</span><div><a href="#">Privacy</a><a href="#">Terms</a><a href="#">Accessibility</a></div></div>
      </footer>

      {modal && <div className="modal-backdrop" onMouseDown={() => setModal(null)}><div className="modal" onMouseDown={e => e.stopPropagation()}>
        <button className="modal-close" onClick={() => setModal(null)}>×</button>
        {modal === "search" ? <>
          <p className="eyebrow">Let’s find your match</p><h2>What would you like to learn?</h2><label>Language<select value={language} onChange={e => setLanguage(e.target.value)}>{languages.map(([name]) => <option key={name}>{name}</option>)}</select></label>
          <label>Your main goal<select value={goal} onChange={e => setGoal(e.target.value)}><option>Conversation confidence</option><option>Work and career</option><option>Travel</option><option>Exam preparation</option><option>Just for fun</option></select></label>
          <button className="primary modal-primary" onClick={beginSearch}>See matching tutors <Arrow /></button><small className="fine-print">No payment required · Change filters anytime</small>
        </> : <>
          <p className="eyebrow">Welcome back</p><h2>Log in to LingoLift</h2><button className="social-login">G <span>Continue with Google</span></button><button className="social-login">◎ <span>Continue with Apple</span></button><div className="divider"><span>or</span></div><label>Email<input type="email" placeholder="you@example.com" /></label><button className="primary modal-primary">Continue with email <Arrow /></button><small className="fine-print">Demo only — no account will be created.</small>
        </>}
      </div></div>}
    </main>
  );
}
