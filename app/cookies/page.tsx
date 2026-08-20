import { PolicyPage } from "../legal/PolicyPage";
export default function Page() {
  return (
    <PolicyPage
      policy={{
        title: "Cookie Information",
        summary:
          "The small amount of browser storage currently used by Studacad and how optional analytics will be controlled.",
        sections: [
          {
            heading: "Essential storage",
            body: [
              "Studacad uses secure authentication cookies for signed-in sessions, request protection, and one-time-link completion. A short-lived referral cookie can remember an entered referral code until it is attached to the signed-in account. These functions are necessary to provide the requested service and cannot be disabled inside Studacad.",
            ],
          },
          {
            heading: "Preferences and analytics",
            body: [
              "Current production paths do not enable advertising cookies or optional analytics. Notification choices and authoritative product state are stored in the account database. If consent-aware analytics is added, it must remain off until a user chooses it, avoid sensitive identifiers, appear in this notice, and provide a withdrawal control before production activation.",
            ],
          },
          {
            heading: "Browser controls",
            body: [
              "You can delete or block cookies in browser settings, but blocking essential authentication storage will prevent sign-in and account features. Static preview and development fixtures do not grant production access or credits.",
            ],
          },
        ],
      }}
    />
  );
}
