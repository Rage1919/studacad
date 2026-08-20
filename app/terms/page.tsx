import { PolicyPage } from "../legal/PolicyPage";
export default function Page() {
  return (
    <PolicyPage
      policy={{
        title: "Terms of Use",
        summary:
          "The rules for using Studacad accounts, credits, courses, bookings, messages, and support.",
        sections: [
          {
            heading: "Accounts and eligibility",
            body: [
              "Provide accurate information, protect one-time sign-in links, and keep contact details current. Adults responsible for minors must supervise their use. Accounts and access are personal and may be suspended for safety, fraud, abuse, or material breach.",
            ],
          },
          {
            heading: "Credits, purchases, and bookings",
            body: [
              "Studacad records whole credits: one whole Botswana pula verified as deposited equals one credit. Credits are an internal purchase balance, not a bank account, investment, or freely withdrawable learner cash. A live payment gateway is not enabled; only verified offline deposits recorded by an administrator are valid.",
              "Course purchases and bookings debit the server ledger. Booking prices, format, time, capacity, and tutor are shown before confirmation. Online lesson access is limited to authorized participants. Do not record lessons without the informed agreement of everyone involved.",
            ],
          },
          {
            heading: "Cancellations, disputes, and content",
            body: [
              "A learner may cancel any time before the scheduled start for a full credit refund; cancellation is blocked at or after start. Tutor cancellations refund affected learners. Booking disputes must be opened from the booking after start and no later than seven days after the end. See the Cancellation and Refund Policy.",
              "Course and tutor materials are licensed for the purchasing learner's personal study. Do not copy, sell, scrape, or redistribute them. Studacad may remove unsafe, infringing, deceptive, or unlawful content.",
            ],
          },
          {
            heading: "Service limits and responsibility",
            body: [
              "Tutors provide independent educational services and remain responsible for professional conduct and truthful qualifications. Studacad verifies submitted evidence but does not guarantee grades, admission, or a particular outcome. Service can be interrupted by providers; we preserve authoritative records and provide support rather than simulate success.",
              "To the extent allowed by applicable law, liability is limited to direct, proven loss associated with the affected transaction. Nothing excludes rights or liability that cannot legally be excluded. Botswana law and competent Botswana courts apply, subject to mandatory consumer rights.",
            ],
          },
        ],
      }}
    />
  );
}
