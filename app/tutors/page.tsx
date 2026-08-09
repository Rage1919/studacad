"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { LmsHeader } from "../components/LmsHeader";
import { tutors } from "../lib/tutors";

type SortOption = "recommended" | "price-low" | "rating";

const nextMatchingSlot = (slots: string[], filter: string) => {
  if (filter === "Today") return slots.find(slot => slot.startsWith("Today")) ?? slots[0];
  if (filter === "Tomorrow") return slots.find(slot => slot.startsWith("Tomorrow")) ?? slots[0];
  if (filter === "Weekend") return slots.find(slot => /^(Sat|Sun)/.test(slot)) ?? slots[0];
  if (filter === "Weekdays") return slots.find(slot => /^(Mon|Tue|Wed|Thu|Fri)/.test(slot)) ?? slots[0];
  return slots[0];
};

export default function TutorsPage() {
  const [ready, setReady] = useState(false);
  const [exam, setExam] = useState("All");
  const [subject, setSubject] = useState("All");
  const [availability, setAvailability] = useState("Any time");
  const [maxPrice, setMaxPrice] = useState("Any price");
  const [minimumRating, setMinimumRating] = useState("Any rating");
  const [sort, setSort] = useState<SortOption>("recommended");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setExam(params.get("exam") ?? "All");
    setSubject(params.get("subject") ?? "All");
    setAvailability(params.get("availability") ?? "Any time");
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const params = new URLSearchParams();
    if (exam !== "All") params.set("exam", exam);
    if (subject !== "All") params.set("subject", subject);
    if (availability !== "Any time") params.set("availability", availability);
    window.history.replaceState(null, "", `/tutors${params.size ? `?${params.toString()}` : ""}`);
  }, [availability, exam, ready, subject]);

  const subjectOptions = useMemo(() => Array.from(new Set(tutors.filter(tutor => exam === "All" || tutor.examination === exam).map(tutor => tutor.subject))).sort(), [exam]);

  const filteredTutors = useMemo(() => {
    const result = tutors.filter(tutor => {
      if (exam !== "All" && tutor.examination !== exam) return false;
      if (subject !== "All" && tutor.subject !== subject) return false;
      if (availability !== "Any time" && !tutor.availabilityGroups.includes(availability as "Today" | "Tomorrow" | "Weekdays" | "Weekend")) return false;
      if (maxPrice !== "Any price" && tutor.price > Number(maxPrice)) return false;
      if (minimumRating !== "Any rating" && Number(tutor.rating) < Number(minimumRating)) return false;
      if (search && !`${tutor.name} ${tutor.subject} ${tutor.examination}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
    return [...result].sort((a, b) => sort === "price-low" ? a.price - b.price : sort === "rating" ? Number(b.rating) - Number(a.rating) : Number(b.rating) - Number(a.rating) || b.lessons.localeCompare(a.lessons));
  }, [availability, exam, maxPrice, minimumRating, search, sort, subject]);

  const changeExam = (value: string) => {
    setExam(value);
    if (value !== "All" && !tutors.some(tutor => tutor.examination === value && tutor.subject === subject)) setSubject("All");
  };

  const clearFilters = () => {
    setExam("All");
    setSubject("All");
    setAvailability("Any time");
    setMaxPrice("Any price");
    setMinimumRating("Any rating");
    setSort("recommended");
    setSearch("");
  };

  const title = subject !== "All" ? `${exam !== "All" ? `${exam} ` : ""}${subject} tutors` : exam !== "All" ? `${exam} tutors` : "Find your subject tutor";

  return <main className="lms-page tutor-search-page">
    <LmsHeader />
    <section className="tutor-search-hero">
      <div><p className="eyebrow">Studacad tutor marketplace</p><h1>{title}</h1><p>Compare subject expertise, ratings, prices, and real availability—then open a profile and book with credits.</p></div>
      <div className="search-count"><strong>{filteredTutors.length}</strong><span>matching tutor{filteredTutors.length === 1 ? "" : "s"}</span></div>
    </section>

    <section className="tutor-filter-shell" aria-label="Tutor filters">
      <label className="filter-search">Search<input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Tutor or subject" /></label>
      <label>Examination<select value={exam} onChange={event => changeExam(event.target.value)}><option>All</option><option>PSLE</option><option>JCE</option><option>BGCSE</option></select></label>
      <label>Subject<select value={subject} onChange={event => setSubject(event.target.value)}><option>All</option>{subjectOptions.map(item => <option key={item}>{item}</option>)}</select></label>
      <label>Availability<select value={availability} onChange={event => setAvailability(event.target.value)}><option>Any time</option><option>Today</option><option>Tomorrow</option><option>Weekdays</option><option>Weekend</option></select></label>
      <label>Maximum price<select value={maxPrice} onChange={event => setMaxPrice(event.target.value)}><option>Any price</option><option value="20">20 credits</option><option value="25">25 credits</option><option value="30">30 credits</option></select></label>
      <label>Minimum rating<select value={minimumRating} onChange={event => setMinimumRating(event.target.value)}><option>Any rating</option><option value="4.8">4.8+</option><option value="4.9">4.9+</option><option value="5">5.0</option></select></label>
    </section>

    <section className="tutor-results-section">
      <div className="results-toolbar"><div><p className="eyebrow">Available tutors</p><h2>{title}</h2></div><div><label>Sort by<select value={sort} onChange={event => setSort(event.target.value as SortOption)}><option value="recommended">Recommended</option><option value="price-low">Lowest price</option><option value="rating">Highest rated</option></select></label><button onClick={clearFilters}>Clear filters</button></div></div>
      <div className="search-tutor-grid">
        {filteredTutors.map(tutor => <article className="search-tutor-card" key={tutor.id}>
          <Link className={`search-tutor-photo ${tutor.color}`} href={`/tutor?id=${tutor.id}`}><img src={tutor.image} alt={`${tutor.name}, ${tutor.examination} ${tutor.subject} tutor`} /><span>Next: {nextMatchingSlot(tutor.availability, availability)}</span></Link>
          <div className="search-tutor-body"><div className="search-tutor-name"><div><h3>{tutor.name} <i>✓</i></h3><p>{tutor.examination} · {tutor.subject}</p></div><span><b>★ {tutor.rating}</b><small>{tutor.lessons}</small></span></div><p className="search-tutor-headline">{tutor.headline}</p><div className="search-specialties">{tutor.specialties.slice(0, 3).map(item => <span key={item}>{item}</span>)}</div><div className="search-card-footer"><span><strong>{tutor.price}</strong> credits / 50 min</span><Link href={`/tutor?id=${tutor.id}`}>View profile →</Link></div></div>
        </article>)}
      </div>
      {ready && filteredTutors.length === 0 && <div className="no-tutor-results"><span>⌕</span><h2>No tutors match every filter</h2><p>Try another availability, price, or subject.</p><button className="primary" onClick={clearFilters}>Clear all filters</button></div>}
    </section>
  </main>;
}
