"use client";

import Link from "next/link";
import { useLms } from "./LmsProvider";
import { TutorMenu } from "./TutorMenu";

export function LmsHeader({ current }: { current?: "learn" | "wallet" }) {
  const { credits } = useLms();
  return (
    <header className="lms-header">
      <Link className="brand" href="/"><span>Studacad</span><i className="brand-mark"><b /><b /><b /></i></Link>
      <nav aria-label="Learning navigation">
        <TutorMenu />
        <Link className={current === "learn" ? "active" : ""} href="/learn">My learning</Link>
      </nav>
      <Link className={`wallet-pill ${current === "wallet" ? "active" : ""}`} href="/wallet">
        <span className="coin">◆</span><span><small>Wallet</small><strong>{credits.toLocaleString()} credits</strong></span>
      </Link>
    </header>
  );
}
