import { PolicyPage } from "../legal/PolicyPage";
export default function Page() {
  return (
    <PolicyPage
      policy={{
        title: "Community Guidelines",
        summary:
          "Respectful, learning-focused conduct for learners, guardians, tutors, and support staff.",
        sections: [
          {
            heading: "Be safe and respectful",
            body: [
              "No harassment, threats, hate, sexual content, grooming, exploitation, impersonation, discrimination, exam cheating, fraud, spam, or illegal activity. Do not share passwords, one-time links, identity documents, banking details, private addresses, or a minor's unnecessary personal information in messages.",
            ],
          },
          {
            heading: "Keep learning and payment on platform",
            body: [
              "Use messages for genuine learning and booking questions. Do not evade Studacad fees, move payment off platform, send generated phone-number links, or pressure another user into private contact. Respect copyrights and examination-board rules.",
            ],
          },
          {
            heading: "Reporting and enforcement",
            body: [
              "Report messages from the conversation, block contact where available, report tutor conduct from the tutor profile, dispute a booking from Bookings, or open a safety support case. Studacad may preserve evidence, restrict messaging, suspend accounts, refund transactions, remove content, or refer imminent or unlawful matters to appropriate authorities. Reports are reviewed with least-privilege access and an audit trail.",
            ],
          },
        ],
      }}
    />
  );
}
