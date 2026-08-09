"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LmsHeader } from "../components/LmsHeader";
import { useLms } from "../components/LmsProvider";
import { ReferralRewardEvent, REFERRAL_REWARD_CREDITS } from "../lib/referrals";
import { tutors } from "../lib/tutors";

const CopyIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="11" height="11" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" /></svg>;
const ShareIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V3m0 0L8 7m4-4 4 4" /><path d="M7 10H5v10h14V10h-2" /></svg>;

export default function ReferralPage() {
  const { referralCode, ready, referralRewards: savedRewards, applyReferralRewards } = useLms();
  const [rewards, setRewards] = useState<ReferralRewardEvent[]>([]);
  const [notice, setNotice] = useState("");
  const [origin, setOrigin] = useState("");

  useEffect(() => setOrigin(window.location.origin), []);
  const referralLink = useMemo(() => referralCode && origin ? `${origin}/tutors?ref=${encodeURIComponent(referralCode)}` : "", [origin, referralCode]);

  const refreshRewards = useCallback(async () => {
    if (!referralCode) return;
    try {
      const response = await fetch(`/api/referrals?code=${encodeURIComponent(referralCode)}`, { cache: "no-store" });
      const payload = await response.json() as { rewards?: ReferralRewardEvent[] };
      const currentRewards = payload.rewards ?? [];
      setRewards(Array.from(new Map([...savedRewards, ...currentRewards].map(reward => [reward.id, reward])).values()));
      const added = applyReferralRewards(currentRewards);
      if (added > 0) setNotice(`${added} referral credits were added to your Studacad wallet.`);
    } catch {
      setNotice("Referral rewards will refresh when the connection is restored.");
    }
  }, [applyReferralRewards, referralCode, savedRewards]);

  useEffect(() => setRewards(savedRewards), [savedRewards]);

  useEffect(() => {
    if (!ready || !referralCode) return;
    void refreshRewards();
    const interval = window.setInterval(refreshRewards, 6000);
    return () => window.clearInterval(interval);
  }, [ready, referralCode, refreshRewards]);

  const copyLink = async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
    } catch {
      const input = document.createElement("textarea");
      input.value = referralLink;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
    }
    setNotice("Referral link copied. Share it with someone looking for a tutor.");
  };

  const shareLink = async () => {
    if (!referralLink) return;
    if (navigator.share) {
      await navigator.share({ title: "Find a tutor on Studacad", text: "Book a 20 minute trial lesson with a Botswana subject tutor on Studacad.", url: referralLink }).catch(() => undefined);
    } else {
      await copyLink();
    }
  };

  const earnedCredits = rewards.reduce((sum, reward) => sum + reward.amount, 0);

  return <main className="lms-page referral-page">
    <LmsHeader current="referral" />
    {notice && <div className="toast" role="status">{notice}</div>}

    <section className="referral-hero">
      <div className="referral-hero-copy">
        <p className="eyebrow">Studacad referrals</p>
        <h1>Refer a friend<br />earn 50 credits</h1>
        <p>Share your personal link. When a new learner uses it to book their first 20 minute trial lesson, you receive {REFERRAL_REWARD_CREDITS} credits in your Studacad wallet.</p>
        <div className="referral-link-box"><label htmlFor="referral-link">Your referral link</label><div><input id="referral-link" value={referralLink || "Preparing your link…"} readOnly /><button type="button" onClick={() => void copyLink()} disabled={!referralLink}><CopyIcon /> Copy</button><button type="button" onClick={() => void shareLink()} disabled={!referralLink} aria-label="Share referral link"><ShareIcon /></button></div></div>
        <small>The referred learner receives no discount or credit. The only referral benefit is 50 credits for you after an eligible trial booking.</small>
      </div>
      <div className="referral-visual" aria-label="A learner sharing Studacad with a friend">
        <div className="referral-photo primary-photo"><img src={tutors[0].image} alt="Studacad learner referring a friend" /><span>Try Studacad</span></div>
        <div className="referral-photo secondary-photo"><img src={tutors[3].image} alt="Friend finding a subject tutor" /><span>Trial booked</span></div>
        <div className="referral-reward-bubble"><strong>+50</strong><small>credits for referrer</small></div>
      </div>
    </section>

    <section className="referral-how">
      <div className="referral-section-heading"><p className="eyebrow">How it works</p><h2>Three steps to your reward</h2></div>
      <div className="referral-steps">
        <article><span>Step 1</span><div className="referral-step-art share-art"><i>↗</i><i>↗</i><i>↗</i></div><h3>Share your referral link</h3><p>Send your unique Studacad link to a friend who has not booked a tutorial before.</p></article>
        <article><span>Step 2</span><div className="referral-step-art trial-art"><strong>20</strong><small>MIN TRIAL</small></div><h3>They book a trial</h3><p>Your friend chooses a tutor and pays for their first 20 minute trial lesson. They receive no referral discount.</p></article>
        <article><span>Step 3</span><div className="referral-step-art credit-art"><strong>50</strong><small>CREDITS</small></div><h3>You receive 50 credits</h3><p>The reward is added automatically to the referrer&apos;s Studacad wallet and appears in wallet activity.</p></article>
      </div>
    </section>

    <section className="referral-status-section">
      <div className="referral-status-card"><p className="eyebrow">Your referral activity</p><div><span><strong>{rewards.length}</strong><small>eligible trial {rewards.length === 1 ? "booking" : "bookings"}</small></span><span><strong>{earnedCredits}</strong><small>credits earned</small></span></div><button className="outline" type="button" onClick={() => void refreshRewards()}>Refresh rewards</button></div>
      <div className="referral-faq"><p className="eyebrow">Referral questions</p><h2>Good to know</h2><details open><summary>When do I receive the 50 credits?</summary><p>As soon as the referred learner successfully books their first paid 20 minute trial lesson.</p></details><details><summary>Does my friend receive a discount?</summary><p>No. The referral programme has one benefit only: 50 credits for the referrer.</p></details><details><summary>Can the same learner earn more rewards for me?</summary><p>No. Each eligible referred learner can generate the 50-credit reward once.</p></details></div>
    </section>

    <section className="referral-cta"><div><p className="eyebrow">Know someone who needs subject support?</p><h2>Share Studacad today</h2></div><div><button className="primary light" type="button" onClick={() => void copyLink()}>Copy referral link</button><Link className="outline light" href="/tutors">Browse tutors</Link></div></section>
  </main>;
}
