"use client";

import Link from "next/link";
import { useLms } from "./LmsProvider";
import { TutorMenu } from "./TutorMenu";
import { WalletIcon } from "./WalletIcon";

const MessageIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5.5h14v10H9l-4 3v-13Z" /><path d="M9 9h6M9 12h4" /></svg>;

export function LmsHeader({ current }: { current?: "learn" | "wallet" | "how" | "messages" | "referral" }) {
  const { credits } = useLms();
  return (
    <header className="lms-header">
      <Link className="brand" href="/"><span>Studacad</span><i className="brand-mark"><b /><b /><b /></i></Link>
      <nav aria-label="Learning navigation">
        <TutorMenu />
        <Link className={current === "how" ? "active" : ""} href="/how-it-works">How it works</Link>
        <Link className={current === "learn" ? "active" : ""} href="/learn">My learning</Link>
      </nav>
      <div className="lms-header-actions">
        <Link className={`message-header-button ${current === "messages" ? "active" : ""}`} href="/messages" aria-label="Messages" title="Messages"><MessageIcon /></Link>
        <Link className={current === "referral" ? "active referral-header-link" : "referral-header-link"} href="/referral">Refer a friend</Link>
        <Link
          className={`wallet-pill ${current === "wallet" ? "active" : ""}`}
          href="/wallet"
          aria-label={`Wallet balance: ${credits.toLocaleString()} credits`}
          title="Wallet"
        >
          <WalletIcon /><strong>{credits.toLocaleString()}</strong>
        </Link>
      </div>
    </header>
  );
}
