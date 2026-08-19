import { PolicyPage } from "../legal/PolicyPage";
export default function Page() {
  return (
    <PolicyPage
      policy={{
        title: "Safety and Safeguarding",
        summary:
          "Practical safeguards for minors, guardians, online lessons, in-person lessons, and conduct reports.",
        sections: [
          {
            heading: "If someone is in immediate danger",
            body: [
              "Stop the interaction, move to a safe place, and contact Botswana emergency services or local authorities. Studacad support is not an emergency service. After immediate safety steps, open a Safety case so the platform can preserve records and restrict access.",
            ],
          },
          {
            heading: "For learners and guardians",
            body: [
              "Guardians should know the tutor, format, schedule, and location; supervise age-appropriately; use an open/shared room for online lessons; and keep communications on Studacad. Do not share private addresses until required for a confirmed in-person booking. Never send identity documents or payment details through messages.",
            ],
          },
          {
            heading: "For tutors",
            body: [
              "Maintain professional boundaries, use age-appropriate material, avoid private or secret communications with minors, do not transport learners, and do not meet at an unapproved location. Escalate disclosures or signs of harm under applicable safeguarding duties without investigating personally.",
            ],
          },
          {
            heading: "Platform response",
            body: [
              "Safety cases are marked urgent with a four-hour initial response target. Studacad can restrict messaging and meetings, suspend profiles, preserve relevant account, booking, and message records, contact guardians where lawful and appropriate, and cooperate with authorities. A target is not a guarantee during outages or extraordinary events.",
            ],
          },
        ],
      }}
    />
  );
}
