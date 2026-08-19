import { PolicyPage } from "../legal/PolicyPage";
export default function Page() {
  return (
    <PolicyPage
      policy={{
        title: "Accessibility Statement",
        summary:
          "Studacad's commitment to an inclusive WCAG 2.2 AA learning and tutoring experience.",
        sections: [
          {
            heading: "Our target",
            body: [
              "Public, learner, tutor, and administrator journeys target WCAG 2.2 Level AA: keyboard operation, visible focus, meaningful labels and errors, semantic landmarks, sufficient contrast, reduced-motion respect, text resizing, captions or alternatives for learning media, and screen-reader announcements for state changes.",
            ],
          },
          {
            heading: "Known and reported barriers",
            body: [
              "The final release gate includes automated and manual accessibility checks. Third-party Meet, payment, WhatsApp, email, and embedded media experiences are also governed by their providers and may have separate limitations. Report a barrier with the page, task, device, browser, and assistive technology; do not include private account data.",
            ],
          },
          {
            heading: "Response and alternatives",
            body: [
              "Accessibility cases target an initial response within one business day. Studacad will investigate, offer a reasonable accessible alternative where possible, and track remediation. Formal accessibility reviews are versioned in the policy-review register.",
            ],
          },
        ],
      }}
    />
  );
}
