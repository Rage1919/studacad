"use client";

import Link from "next/link";
import { useLms } from "./LmsProvider";

export function LmsHeader({ current }: { current?: "learn" | "wallet" | "admin" }) {
  const { credits } = useLms();
  return (
    <header className="lms-header">
      <Link className="brand" href="/"><span>LingoLift</span><i className="brand-mark"><b /><b /><b /></i></Link>
      <nav aria-label="Learning navigation">
        <Link className={current === "learn" ? "active" : ""} href="/learn">Learning hub</Link>
        <Link className={current === "admin" ? "active" : ""} href="/admin">Admin studio</Link>
      </nav>
      <Link className={`wallet-pill ${current === "wallet" ? "active" : ""}`} href="/wallet">
        <span className="coin">◆</span><span><small>Wallet</small><strong>{credits.toLocaleString()} credits</strong></span>
      </Link>
    </header>
  );
}

