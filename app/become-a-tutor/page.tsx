import type { Metadata } from "next";
import Link from "next/link";
import { LmsHeader } from "../components/LmsHeader";
import { TutorApplicationForm } from "./TutorApplicationForm";
import "./become-a-tutor.css";

export const metadata: Metadata = {
  title: "Become a tutor | Studacad",
  description:
    "Teach PSLE, JCE, and BGCSE learners across Botswana with Studacad. Set your schedule, subject focus, and lesson format.",
};

const steps = [
  [
    "1",
    "Create your profile",
    "Tell learners what you teach, your experience, and when you are available.",
  ],
  [
    "2",
    "Get verified",
    "We review your identity, qualifications, subject knowledge, and safeguarding details.",
  ],
  [
    "3",
    "Start teaching",
    "Publish your schedule, meet matched learners, and build a strong tutor reputation.",
  ],
];

const benefits = [
  [
    "Set your own rate",
    "Choose a fair credit price for private, group, online, or in-person tutorials.",
  ],
  [
    "Teach on your terms",
    "Open the time slots that work for you without a minimum weekly commitment.",
  ],
  [
    "Track your work",
    "Confirmed lessons, earnings, payout requests, messages, and support stay attached to your account.",
  ],
];

const questions = [
  [
    "Who can become a Studacad tutor?",
    "Qualified teachers, university graduates, experienced subject specialists, and high-performing professionals may apply. Every applicant completes identity and subject checks.",
  ],
  [
    "Which subjects can I teach?",
    "Studacad focuses on Botswana PSLE, JCE, and BGCSE subjects, including Mathematics, English, Sciences, Setswana, Accounting, Geography, and Business Studies.",
  ],
  [
    "How does tutor approval work?",
    "You create a complete profile, upload supporting documents, and complete a short subject and teaching review. Approved profiles can then publish availability.",
  ],
  [
    "Can I teach online and in person?",
    "Yes. You can offer online private, online group, tutor-location, or learner-location sessions when those formats suit your subject and schedule.",
  ],
  [
    "What equipment do I need?",
    "For online lessons you need a reliable internet connection, a laptop or tablet, a clear microphone, and a quiet teaching space.",
  ],
  [
    "How much can I earn?",
    "You choose your credit rate and available hours. Earnings depend on lesson format, demand, learner retention, and the schedule you publish.",
  ],
  [
    "Do I have to teach a minimum number of hours?",
    "No. You control your availability and can adjust future time slots whenever your schedule changes.",
  ],
];

export default function BecomeATutorPage() {
  return (
    <main className="tutor-landing">
      <LmsHeader current="become-tutor" />

      <section className="tutor-join-hero" id="top">
        <div className="tutor-join-shell">
          <div className="tutor-join-copy">
            <p className="tutor-kicker">Teach with Studacad</p>
            <h1>Make a living by helping Botswana learners move forward</h1>
            <div className="tutor-journey-steps">
              {steps.map(([number, title, description]) => (
                <article key={number}>
                  <span>{number}</span>
                  <h2>{title}</h2>
                  <p>{description}</p>
                </article>
              ))}
            </div>
            <Link className="tutor-cta" href="#apply">
              Create a tutor profile <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div
            className="tutor-hero-media"
            aria-label="Studacad tutor teaching online"
          >
            <img
              className="tutor-hero-slice slice-one"
              src="https://images.unsplash.com/photo-1580894732444-8ecded7900cd?auto=format&fit=crop&w=1000&q=88"
              alt=""
            />
            <img
              className="tutor-hero-slice slice-two"
              src="https://images.unsplash.com/photo-1580894732444-8ecded7900cd?auto=format&fit=crop&w=1000&q=88"
              alt=""
            />
            <img
              className="tutor-hero-main"
              src="https://images.unsplash.com/photo-1580894732444-8ecded7900cd?auto=format&fit=crop&w=1000&q=88"
              alt="Tutor smiling while teaching from a laptop"
            />
            <span className="tutor-photo-note note-one">Set your hours</span>
            <span className="tutor-photo-note note-two">
              Teach your subject
            </span>
          </div>
        </div>
      </section>

      <section className="tutor-benefit-strip" aria-label="Tutor benefits">
        {benefits.map(([title, description]) => (
          <article key={title}>
            <h2>{title}</h2>
            <p>{description}</p>
          </article>
        ))}
      </section>

      <section className="tutor-reach-section">
        <div className="tutor-reach-copy">
          <p className="tutor-kicker">One platform, every district</p>
          <h2>Teach learners across Botswana</h2>
          <p>
            Build a dependable tutoring practice with tools designed around
            local examinations and learner goals.
          </p>
          <ul>
            <li>Visibility after application approval</li>
            <li>A weekly availability calendar</li>
            <li>Private, group, online, and in-person formats</li>
            <li>Persistent bookings and messages</li>
            <li>Clear credit pricing before every booking</li>
            <li>Audited earnings and payout records</li>
          </ul>
          <Link className="tutor-cta" href="#apply">
            Create a tutor profile <span aria-hidden="true">→</span>
          </Link>
        </div>
        <div className="tutor-reach-media">
          <img
            src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1100&q=88"
            alt="Tutors collaborating around a laptop"
          />
          <div className="tutor-reach-crop">
            <img
              src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1100&q=88"
              alt=""
            />
          </div>
          <span>
            <strong>16+</strong> subjects
          </span>
        </div>
      </section>

      <section className="tutor-story-section">
        <div className="tutor-story-media">
          <img
            className="story-front"
            src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=88"
            alt="Tutor preparing an online lesson"
          />
        </div>
        <div className="tutor-story-copy">
          <h2>Approval comes before publication</h2>
          <p>
            Applications stay private while Studacad reviews identity,
            qualification, subject, and safeguarding evidence. Only an approved,
            active profile can appear in the marketplace.
          </p>
          <Link className="tutor-cta" href="/tutor-agreement">
            Read the tutor agreement <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      <section className="tutor-faq-section">
        <p className="tutor-kicker">What tutors ask us</p>
        <h2>Frequently asked questions</h2>
        <div className="tutor-faq-list">
          {questions.map(([question, answer], index) => (
            <details key={question} open={index === 0}>
              <summary>
                {question}
                <span aria-hidden="true">+</span>
              </summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="tutor-apply-panel" id="apply">
        <div className="tutor-apply-photo">
          <img
            src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=1100&q=88"
            alt="Tutor preparing an online lesson"
          />
        </div>
        <div className="tutor-apply-copy">
          <p className="tutor-kicker">Your profile starts here</p>
          <h2>Get paid to teach what you know</h2>
          <p>
            Introduce yourself, choose your teaching level, and take the first
            step toward joining Studacad.
          </p>
          <TutorApplicationForm />
        </div>
      </section>
    </main>
  );
}
