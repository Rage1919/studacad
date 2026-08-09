"use client";

import Link from "next/link";

export function TutorMenu() {
  return <div className="tutor-menu">
    <Link href="/tutors" aria-haspopup="menu">Find tutors</Link>
    <div className="tutor-menu-panel" role="menu">
      <Link role="menuitem" href="/favourites"><span>♥</span><b>Favourite tutors</b></Link>
      <Link role="menuitem" href="/tutors?exam=PSLE"><span>PSLE</span><b>PSLE tutors</b></Link>
      <Link role="menuitem" href="/tutors?exam=JCE"><span>JCE</span><b>JCE tutors</b></Link>
      <Link role="menuitem" href="/tutors?exam=BGCSE"><span>BGCSE</span><b>BGCSE tutors</b></Link>
    </div>
  </div>;
}
