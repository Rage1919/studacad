import Link from "next/link";

export function StudacadFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-top">
        <Link className="brand footer-brand" href="/#top">
          <span>Studacad</span>
          <i className="brand-mark">
            <b />
            <b />
            <b />
          </i>
        </Link>
        <p>
          Botswana tutors, courses, revision papers, and tests in one place.
        </p>
        <div className="socials" aria-label="Studacad social channels">
          <button type="button" aria-label="LinkedIn">
            in
          </button>
          <button type="button" aria-label="Instagram">
            ◎
          </button>
          <button type="button" aria-label="YouTube">
            ▶
          </button>
          <button type="button" aria-label="Facebook">
            f
          </button>
        </div>
      </div>
      <div className="footer-links">
        <div>
          <h4>About Studacad</h4>
          <Link href="/how-it-works">How it works</Link>
          <Link href="/#schools">For schools</Link>
          <Link href="/#tutor-results">Reviews</Link>
          <Link href="/become-a-tutor">Careers</Link>
        </div>
        <div>
          <h4>For students</h4>
          <Link href="/tutors">Find tutors</Link>
          <Link href="/learn">My learning</Link>
          <Link href="/wallet">Credits wallet</Link>
          <Link href="/referral">Refer a friend</Link>
        </div>
        <div>
          <h4>Exam pathways</h4>
          <Link href="/tutors?exam=PSLE">PSLE subjects</Link>
          <Link href="/tutors?exam=JCE">JCE subjects</Link>
          <Link href="/tutors?exam=BGCSE">BGCSE subjects</Link>
          <Link href="/become-a-tutor">Become a tutor</Link>
        </div>
        <div>
          <h4>Learning tools</h4>
          <Link href="/learn">Tutorial videos</Link>
          <Link href="/learn">Revision papers</Link>
          <Link href="/learn">Lesson tests</Link>
          <Link href="/#schools">School support</Link>
        </div>
        <div>
          <h4>Support</h4>
          <Link href="/help">Help centre</Link>
          <Link href="/contact">Contact us</Link>
          <Link href="/safety">Safety</Link>
          <Link href="/community-guidelines">Community guidelines</Link>
          <Link href="/cancellation-refunds">Cancellations & refunds</Link>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© 2026 Studacad.</span>
        <div>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/tutor-agreement">Tutor agreement</Link>
          <Link href="/cookies">Cookies</Link>
          <Link href="/accessibility">Accessibility</Link>
        </div>
      </div>
    </footer>
  );
}
