"use client";

import Link from "next/link";
import { useState } from "react";

export function TutorMenu() {
  const [open, setOpen] = useState(false);

  return <div className={`tutor-menu ${open ? "open" : ""}`} onMouseLeave={() => setOpen(false)}>
    <button type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(value => !value)}>Find tutors <span>⌄</span></button>
    <div className="tutor-menu-panel" role="menu">
      <Link role="menuitem" href="/tutors"><span>All</span><b>Browse every tutor</b></Link>
      <Link role="menuitem" href="/favourites"><span>♥</span><b>Favourite tutors</b></Link>
      <Link role="menuitem" href="/tutors?exam=PSLE"><span>P7</span><b>PSLE tutors</b></Link>
      <Link role="menuitem" href="/tutors?exam=JCE"><span>F3</span><b>JCE tutors</b></Link>
      <Link role="menuitem" href="/tutors?exam=BGCSE"><span>F5</span><b>BGCSE tutors</b></Link>
    </div>
  </div>;
}
