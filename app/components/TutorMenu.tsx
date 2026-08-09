"use client";

import Link from "next/link";
import type { MouseEvent } from "react";

function followRenderedHref(event: MouseEvent<HTMLAnchorElement>) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

  event.preventDefault();
  window.location.assign(event.currentTarget.href);
}

export function TutorMenu() {
  return <div className="tutor-menu">
    <Link href="/tutors" aria-haspopup="menu" onClick={followRenderedHref}>Find tutors</Link>
    <div className="tutor-menu-panel" role="menu">
      <Link role="menuitem" href="/favourites" onClick={followRenderedHref}><span>♥</span><b>Favourite tutors</b></Link>
      <Link role="menuitem" href="/tutors?exam=PSLE" onClick={followRenderedHref}><span>PSLE</span><b>PSLE tutors</b></Link>
      <Link role="menuitem" href="/tutors?exam=JCE" onClick={followRenderedHref}><span>JCE</span><b>JCE tutors</b></Link>
      <Link role="menuitem" href="/tutors?exam=BGCSE" onClick={followRenderedHref}><span>BGCSE</span><b>BGCSE tutors</b></Link>
    </div>
  </div>;
}
