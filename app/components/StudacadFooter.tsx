import Link from "next/link";

export function StudacadFooter() {
  return <footer className="site-footer">
    <div className="footer-top">
      <Link className="brand footer-brand" href="/#top"><span>Studacad</span><i className="brand-mark"><b /><b /><b /></i></Link>
      <p>Botswana tutors, courses, revision papers, and tests in one place.</p>
      <div className="socials" aria-label="Studacad social channels"><button type="button" aria-label="LinkedIn">in</button><button type="button" aria-label="Instagram">◎</button><button type="button" aria-label="YouTube">▶</button><button type="button" aria-label="Facebook">f</button></div>
    </div>
    <div className="footer-links">
      <div><h4>About Studacad</h4><Link href="/how-it-works">How it works</Link><Link href="/#schools">For schools</Link><Link href="/#tutor-results">Reviews</Link><Link href="/#teach">Careers</Link></div>
      <div><h4>For students</h4><Link href="/tutors">Find tutors</Link><Link href="/learn">My learning</Link><Link href="/wallet">Credits wallet</Link><Link href="/#tutors">Browse subjects</Link></div>
      <div><h4>Exam pathways</h4><Link href="/tutors?exam=PSLE">PSLE subjects</Link><Link href="/tutors?exam=JCE">JCE subjects</Link><Link href="/tutors?exam=BGCSE">BGCSE subjects</Link><Link href="/#teach">Become a tutor</Link></div>
      <div><h4>Learning tools</h4><Link href="/learn">Tutorial videos</Link><Link href="/learn">Revision papers</Link><Link href="/learn">Lesson tests</Link><Link href="/#schools">School support</Link></div>
      <div><h4>Support</h4><Link href="/how-it-works">Help centre</Link><Link href="/how-it-works">Contact us</Link><Link href="/how-it-works">Safety</Link><Link href="/how-it-works">Community guidelines</Link></div>
    </div>
    <div className="footer-bottom"><span>© 2026 Studacad. Demo experience.</span><div><Link href="/how-it-works">Privacy</Link><Link href="/how-it-works">Terms</Link><Link href="/how-it-works">Accessibility</Link></div></div>
  </footer>;
}
