import Link from "next/link";
import "./help.css";
const faqs = [
  [
    "How do credits work?",
    "One whole Botswana pula verified as deposited equals one credit. Credits are an internal purchase balance, not a bank account. The live payment gateway is deferred.",
  ],
  [
    "Can I cancel a lesson?",
    "Yes. Cancel any time before its scheduled start for a full credit refund. At or after start, use the dispute route if the lesson outcome is wrong.",
  ],
  [
    "When does a tutor get paid?",
    "The tutor receives 80% after the lesson and seven-day dispute hold. Manual payouts start at 100 available credits.",
  ],
  [
    "Where is my Google Meet link?",
    "For an online booking, the authorized link appears in Bookings when it is released, normally 24 hours before start. It is never placed in public pages or general email.",
  ],
  [
    "How do I report a concern?",
    "Report a message from Messages, report tutor conduct from the tutor profile, raise a booking dispute in Bookings, or open an urgent Safety case.",
  ],
  [
    "How do I export or delete my data?",
    "Use Account settings. Export and deletion requests are recorded and audited; deletion blocks sign-in while the request is reviewed against retention obligations.",
  ],
  [
    "What should I include in support?",
    "Include the booking or case ID, what happened, and what you expected. Never send passwords, one-time links, full bank details, or identity documents.",
  ],
];
export default function Help() {
  return (
    <main className="help-page">
      <nav>
        <Link href="/">Studacad</Link>
        <Link href="/contact">Contact support</Link>
      </nav>
      <header>
        <p className="eyebrow">Help centre</p>
        <h1>Answers for learning, booking, and tutoring</h1>
        <p>
          Standard cases target an initial response within one business day.
          Safety cases target four hours. For imminent danger, contact local
          emergency services first.
        </p>
      </header>
      <section>
        {faqs.map(([q, a]) => (
          <details key={q}>
            <summary>{q}</summary>
            <p>{a}</p>
          </details>
        ))}
      </section>
      <aside>
        <h2>Still need help?</h2>
        <p>
          Sign in to create a private case with a trackable Studacad case ID.
        </p>
        <Link href="/contact">Contact support →</Link>
      </aside>
    </main>
  );
}
