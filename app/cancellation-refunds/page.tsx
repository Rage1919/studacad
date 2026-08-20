import { PolicyPage } from "../legal/PolicyPage";
export default function Page() {
  return (
    <PolicyPage
      policy={{
        title: "Cancellation and Refund Policy",
        summary:
          "The exact rules enforced by Studacad's booking and credit ledger.",
        sections: [
          {
            heading: "Before a lesson starts",
            body: [
              "A learner may cancel any time before the scheduled start and receives a full credit refund for their place. At or after the scheduled start, learner cancellation is blocked. If the tutor cancels before start, all affected active learner places receive full credit refunds.",
            ],
          },
          {
            heading: "After start and disputes",
            body: [
              "A participating learner may raise a dispute after the lesson starts and through seven days after the scheduled end. Studacad holds tutor earnings during that window and reviews attendance, messages, provider state, and supplied evidence using least privilege. A tutor may record completion or learner no-show only after the lesson ends.",
            ],
          },
          {
            heading: "Adjustments and courses",
            body: [
              "Approved partial or full booking refunds are immutable ledger transactions. Before earning release they return credits from escrow; after release they create matching tutor and platform adjustments. Over-refunds and duplicate requests are rejected. Failed payout reservations are returned to available tutor earnings.",
              "Digital course access is normally final once delivered, except where required by law, content was not provided, duplicate debit occurred, or Studacad approves a support remedy. Deposits and provider refunds remain subject to the verified source and future payment-provider rules.",
            ],
          },
          {
            heading: "How to ask for review",
            body: [
              "Use Raise dispute in Bookings for lesson outcomes or Contact Support for payment, course, and technical problems. Include the case or booking ID, what happened, and the remedy requested; never include full bank or identity details. Standard cases target an initial response within one business day.",
            ],
          },
        ],
      }}
    />
  );
}
