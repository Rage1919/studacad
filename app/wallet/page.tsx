"use client";

import Link from "next/link";
import { LmsHeader } from "../components/LmsHeader";
import { useLms } from "../components/LmsProvider";

export default function WalletPage() {
  const { credits, transactions, walletReady, walletError, refreshWallet } = useLms();

  return <main className="lms-page wallet-page">
    <LmsHeader current="wallet" />
    <section className="wallet-hero"><div><p className="eyebrow">Studacad wallet</p><h1>{walletReady ? credits.toLocaleString() : "…"} <span>credits</span></h1><p>Use credits to book subject tutors, unlock exam-preparation courses, and access revision resources.</p></div><div className="wallet-card"><span>Studacad</span><i>◆</i><small>Available balance</small><strong>{walletReady ? credits.toLocaleString() : "…"} CR</strong><b>Account wallet</b></div></section>
    <section className="lms-section topup-section"><div className="lms-section-heading"><div><p className="eyebrow">Deposits</p><h2>One pula, one credit</h2></div><p>Online deposits are not available yet. Once Studacad verifies a deposit, every whole BWP deposited adds exactly one credit—without bonus tiers or browser-generated balances.</p></div>{walletError && <div className="wallet-load-error" role="alert"><span>{walletError}</span><button className="outline" type="button" onClick={() => void refreshWallet()}>Try again</button></div>}</section>
    <section className="lms-section transactions-section"><div className="lms-section-heading"><div><p className="eyebrow">Wallet activity</p><h2>Transactions</h2></div><Link className="outline" href="/learn">Browse courses</Link></div>{walletReady && transactions.length === 0 ? <p className="wallet-empty">No wallet activity yet. Verified deposits, purchases, rewards, and refunds will appear here.</p> : <div className="transaction-list">{transactions.map(item => <div key={item.id}><span className={`transaction-icon ${item.type}`}>{item.amount >= 0 ? "+" : "−"}</span><span><strong>{item.label}</strong><small>{new Date(item.createdAt).toLocaleString()}</small></span><b className={item.amount >= 0 ? "positive" : "negative"}>{item.amount >= 0 ? "+" : ""}{item.amount.toLocaleString()} CR</b></div>)}</div>}</section>
  </main>;
}
