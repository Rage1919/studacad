import { PolicyPage } from "../legal/PolicyPage";
export default function Page() {
  return (
    <PolicyPage
      policy={{
        title: "Privacy Notice",
        summary:
          "How Studacad handles account, learning, tutoring, communications, and financial records while operating the marketplace.",
        sections: [
          {
            heading: "Information we process",
            body: [
              "We process account identity and contact details, email verification, roles, timezone, learning purchases and progress, tutor applications and verification evidence, availability, bookings, messages and reports, support cases, wallet and immutable ledger records, refunds, earnings and payout references, notification preferences, and security/audit events.",
              "Tutor identity and qualification evidence is private. We store file metadata and clean-scan references; approved non-profile evidence normally receives a two-year retention date, rejected or superseded evidence a shorter deletion date. Payout destinations are masked and KYC is referenced to an external case; full bank and KYC payloads are not stored in Studacad.",
            ],
          },
          {
            heading: "Why and how we use it",
            body: [
              "We use data to create and secure accounts, verify tutors, deliver courses and lessons, prevent double booking and abuse, hold and refund credits, settle tutor earnings, provide messages and notifications, answer support requests, enforce community rules, meet recordkeeping duties, and improve reliability. We rely on performance of the service, consent where required, legitimate safety/security interests, and applicable legal obligations.",
            ],
          },
          {
            heading: "Processors and international services",
            body: [
              "The implementation uses a production hosting provider and Supabase-compatible database, authentication, and private object storage. Configured services may include Google Meet, Meta WhatsApp, a transactional email gateway, malware scanning, and a future payment or payout provider. Data can be processed outside Botswana under the selected provider terms and safeguards. The deployment register must name the chosen vendors before launch.",
            ],
          },
          {
            heading: "Sharing, retention, and rights",
            body: [
              "Learners and tutors receive only the information needed for a booking. Private addresses and meeting links are released only to authorized participants. Administrators have role-limited operational access recorded in audit events. We disclose information when required by law or needed to protect safety and the service.",
              "Financial and audit records are retained for reconciliation and legal obligations. Account deletion immediately blocks sign-in and enters an reviewed deletion process; data that must be retained is restricted, not reused. Users may request access/export, correction, deletion, restriction, or object to appropriate processing from Account and Contact Support. Complaints can be raised with the applicable Botswana privacy authority.",
            ],
          },
          {
            heading: "Children and guardians",
            body: [
              "Studacad supports school-age learners. A parent or legal guardian should create or supervise an account where the learner cannot legally consent alone. Guardians should monitor communications and bookings, avoid sharing unnecessary child information, and use the safety route for concerns. Tutors must not move learner contact or payment outside approved Studacad flows.",
            ],
          },
        ],
      }}
    />
  );
}
