"use client";

import Link from "next/link";
import { useState } from "react";
import { LmsHeader } from "../components/LmsHeader";
import { useLms } from "../components/LmsProvider";

const packages = [
  { credits: 250, bonus: 0, label: "Starter" },
  { credits: 600, bonus: 50, label: "Most popular" },
  { credits: 1500, bonus: 200, label: "Power learner" }
];

export default function WalletPage() {
  const { credits, topUp, transactions } = useLms();
  const [notice, setNotice] = useState("");
  const add = (amount: number) => {
    topUp(amount);
    setNotice(`${amount.toLocaleString()} demo credits added to your wallet.`);
    window.setTimeout(() => setNotice(""), 3500);
  };

  return <main className="lms-page wallet-page">
    <LmsHeader current="wallet" />
    {notice && <div className="toast" role="status">{notice}</div>}
    <section className="wallet-hero"><div><p className="eyebrow">LingoLift wallet</p><h1>{credits.toLocaleString()} <span>credits</span></h1><p>Use credits to unlock courses, book tutors, and access premium learning resources.</p></div><div className="wallet-card"><span>LingoLift</span><i>◆</i><small>Available balance</small><strong>{credits.toLocaleString()} CR</strong><b>•••• 2840</b></div></section>
    <section className="lms-section topup-section"><div className="lms-section-heading"><div><p className="eyebrow">Demo top-up</p><h2>Add credits</h2></div><p>These buttons simulate a successful top-up. Connect Stripe or another processor before accepting real payments.</p></div><div className="credit-packages">{packages.map(item => <button key={item.credits} onClick={() => add(item.credits + item.bonus)}><span>{item.label}</span><strong>{item.credits.toLocaleString()} credits</strong>{item.bonus > 0 && <b>+{item.bonus} bonus credits</b>}<i>Top up wallet →</i></button>)}</div></section>
    <section className="lms-section transactions-section"><div className="lms-section-heading"><div><p className="eyebrow">Wallet activity</p><h2>Transactions</h2></div><Link className="outline" href="/learn">Browse courses</Link></div><div className="transaction-list">{transactions.map(item => <div key={item.id}><span className={`transaction-icon ${item.type}`}>{item.type === "topup" ? "+" : item.type === "reward" ? "★" : "−"}</span><span><strong>{item.label}</strong><small>{new Date(item.createdAt).toLocaleString()}</small></span><b className={item.amount >= 0 ? "positive" : "negative"}>{item.amount >= 0 ? "+" : ""}{item.amount.toLocaleString()} CR</b></div>)}</div></section>
  </main>;
}

