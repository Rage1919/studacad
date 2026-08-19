"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LmsHeader } from "../components/LmsHeader";
import type { Tutor } from "../lib/tutors";
import { useTutorFavourites } from "../lib/useTutorFavourites";

export default function FavouriteTutorsPage() {
  const { favouriteIds, ready, error: favouriteError, toggleFavourite } = useTutorFavourites();
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [tutorError, setTutorError] = useState("");
  useEffect(() => {
    void fetch("/api/tutors", { cache: "no-store" }).then(async response => {
      const payload = await response.json() as { tutors?: Tutor[]; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to load published tutors.");
      setTutors(payload.tutors ?? []);
    }).catch(error => setTutorError(error instanceof Error ? error.message : "Unable to load published tutors."));
  }, []);
  const favourites = tutors.filter(tutor => favouriteIds.includes(tutor.profileId ?? tutor.id));

  return <main className="lms-page">
    <LmsHeader />
    <section className="favourites-hero">
      <p className="eyebrow">Saved for later</p>
      <h1>Your favourite tutors</h1>
      <p>Keep a shortlist, compare profiles, and message a tutor before you book.</p>
    </section>
    <section className="favourites-section">
      {(favouriteError || tutorError) && <div className="empty-favourites"><span>!</span><h2>Favourites are temporarily unavailable</h2><p>{favouriteError || tutorError}</p></div>}
      {!ready ? <div className="loading-state">Loading favourites…</div> : favourites.length ? <div className="search-tutor-grid">
        {favourites.map(tutor => <article className="search-tutor-card" key={tutor.id}>
          <Link className={`search-tutor-photo ${tutor.color}`} href={`/tutor?id=${tutor.id}`}><img src={tutor.image} alt={tutor.name} /><span>Available this week</span></Link>
          <div className="search-tutor-body">
            <div className="search-tutor-name"><div><h3>{tutor.name} <i>✓</i></h3><p>{tutor.examination} {tutor.subject}</p></div><span><b>★ {tutor.rating}</b><small>{tutor.lessons}</small></span></div>
            <p className="search-tutor-headline">{tutor.headline}</p>
            <div className="search-card-footer"><span><strong>{tutor.price}</strong> credits / lesson</span><Link href={`/tutor?id=${tutor.id}`}>View profile</Link></div>
            <button className="remove-favourite" type="button" onClick={() => void toggleFavourite(tutor.profileId ?? tutor.id)}>♥ Remove from favourites</button>
          </div>
        </article>)}
      </div> : <div className="empty-favourites"><span>♡</span><h2>Your shortlist is empty</h2><p>Open a tutor profile and select the heart to save it here.</p><Link className="primary" href="/tutors">Find a tutor</Link></div>}
    </section>
  </main>;
}
