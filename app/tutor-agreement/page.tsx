import { PolicyPage } from "../legal/PolicyPage";
export default function Page() {
  return (
    <PolicyPage
      policy={{
        title: "Tutor Agreement",
        summary:
          "Additional marketplace, safeguarding, earnings, and professional obligations for verified Studacad tutors.",
        sections: [
          {
            heading: "Verification and professional duties",
            body: [
              "Submit truthful identity, qualification, experience, availability, location, and pricing information. Studacad may request updated evidence and suspend or remove a profile when evidence expires, a safety review requires it, or information is misleading.",
              "Plan suitable lessons, attend on time, maintain boundaries, follow school and safeguarding duties, and communicate only through approved channels. Never solicit direct off-platform payment, disclose private learner information, discriminate, harass, or promise examination results.",
            ],
          },
          {
            heading: "Bookings, records, and cancellations",
            body: [
              "Keep published availability accurate. Record completion or learner no-show only after the lesson ends. Tutor cancellations fully refund affected learners. Reschedules must preserve an accurate server booking; private arrangements do not change ledger obligations.",
            ],
          },
          {
            heading: "Fees, disputes, and payouts",
            body: [
              "Studacad retains 20% of completed booking credits, rounded to whole credits. The tutor's net earning remains pending through the seven-day dispute window. Refunds and disputes can reduce or reverse earnings and can create a negative adjustment after payout.",
              "Manual payouts require at least 100 available credits and settle one tutor credit as BWP 1.00. Tutors are responsible for lawful tax reporting and providing accurate payout ownership evidence through the approved external/manual process. Studacad stores only masked destinations and external KYC references.",
            ],
          },
          {
            heading: "Independent status and exit",
            body: [
              "The marketplace does not create employment, agency, or authority to bind Studacad. Tutors control accepted availability subject to confirmed bookings and these rules. Either side may end participation, while completed-booking, refund, safety, audit, and legal obligations survive.",
            ],
          },
        ],
      }}
    />
  );
}
