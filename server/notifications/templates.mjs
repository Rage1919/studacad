const catalog = Object.freeze({
  "auth.verification": [
    "Verify your Studacad email",
    "Verify your email to finish setting up your account.",
  ],
  "auth.recovery": [
    "Secure your Studacad account",
    "Use the secure account link you requested. If this was not you, contact support.",
  ],
  "tutor_application.submitted": [
    "Tutor application received",
    "Your tutor application was received and is waiting for review.",
  ],
  "tutor_application.under_review": [
    "Tutor application under review",
    "An administrator is reviewing your tutor application.",
  ],
  "tutor_application.changes_requested": [
    "Tutor application changes requested",
    "Open your application to review the requested changes.",
  ],
  "tutor_application.approved": [
    "Tutor application approved",
    "Your tutor application has been approved.",
  ],
  "tutor_application.rejected": [
    "Tutor application update",
    "Your tutor application was not approved. Open Studacad for the review outcome.",
  ],
  "tutor_application.suspended": [
    "Tutor profile suspended",
    "Your tutor access is suspended. Contact Studacad support for assistance.",
  ],
  "tutor_application.withdrawn": [
    "Tutor application withdrawn",
    "Your tutor application has been withdrawn.",
  ],
  "booking.confirmed": [
    "Lesson confirmed",
    "Your lesson is confirmed. Open Studacad for the current schedule.",
  ],
  "booking.rescheduled": [
    "Lesson rescheduled",
    "Your lesson schedule changed. Open Studacad to review the current time.",
  ],
  "booking.cancelled": [
    "Lesson cancelled",
    "Your lesson was cancelled. Open Studacad for the current booking and refund status.",
  ],
  "booking.reminder_24h": [
    "Lesson tomorrow",
    "Your Studacad lesson starts in about 24 hours.",
  ],
  "booking.reminder_1h": [
    "Lesson starting soon",
    "Your Studacad lesson starts in about one hour.",
  ],
  "meeting.ready": [
    "Online lesson room ready",
    "Your online lesson room is ready. Sign in to Studacad to access it when released.",
  ],
  "message.received": [
    "New Studacad message",
    "You have a new message in Studacad. Sign in to read it.",
  ],
  "payment.deposit_recorded": [
    "Credits added",
    "Your verified deposit was recorded. Sign in to review the transaction.",
  ],
  "booking.refunded": [
    "Booking refund recorded",
    "A booking refund was recorded. Sign in to review the transaction.",
  ],
  "payout.requested": [
    "Payout requested",
    "Your payout request is waiting for administrator review.",
  ],
  "payout.reviewing": [
    "Payout under review",
    "Your payout request is under review.",
  ],
  "payout.processing": [
    "Payout processing",
    "Your payout request is being processed.",
  ],
  "payout.paid": [
    "Payout completed",
    "Your payout was marked paid. Sign in to review its audited reference.",
  ],
  "payout.failed": [
    "Payout needs attention",
    "Your payout attempt failed and the reserved credits were returned.",
  ],
  "payout.cancelled": [
    "Payout cancelled",
    "Your payout request was cancelled and the reserved credits were returned.",
  ],
  "support.case_created": [
    "Support request received",
    "Your support request has a case ID and is waiting for triage.",
  ],
  "support.case_updated": [
    "Support case updated",
    "A support specialist replied to your case. Sign in to read the update.",
  ],
});

export const notificationTemplateKeys = Object.freeze(Object.keys(catalog));

export function renderNotification(templateKey, input) {
  const template = catalog[templateKey];
  if (!template) throw new Error("Unsupported notification template.");
  const recipientName =
    String(input?.recipientName ?? "")
      .trim()
      .slice(0, 100) || "there";
  const appUrl = new URL(String(input?.appUrl ?? "https://studacad.com"))
    .origin;
  const logoUrl = `${appUrl}/images/studacad-logo.png`;
  const [subject, line] = template;
  return {
    subject,
    text: `Hello ${recipientName},\n\n${line}\n\nOpen Studacad: ${appUrl}\n\nStudacad support will never ask for your password or one-time sign-in link.`,
    html: `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f3f7fd"><tr><td align="center" style="padding:32px 16px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background:#fff;border:1px solid #d6dfeb;border-radius:12px"><tr><td style="padding:28px 32px 18px;border-bottom:1px solid #d6dfeb"><a href="${escapeHtml(appUrl)}" style="display:inline-block;text-decoration:none"><img src="${escapeHtml(logoUrl)}" width="200" height="43" alt="Studacad" style="display:block;width:200px;max-width:100%;height:auto;border:0" /></a></td></tr><tr><td style="padding:36px 32px 32px"><p>Hello ${escapeHtml(recipientName)},</p><p>${escapeHtml(line)}</p><p><a href="${escapeHtml(appUrl)}" style="color:#0b3264;font-weight:700">Open Studacad</a></p><p style="color:#607086;font-size:13px"><small>Studacad support will never ask for your password or one-time sign-in link.</small></p></td></tr></table></td></tr></table>`,
  };
}

function escapeHtml(value) {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        character
      ],
  );
}
