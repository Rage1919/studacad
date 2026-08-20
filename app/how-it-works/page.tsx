import Link from "next/link";
import { LmsHeader } from "../components/LmsHeader";

const journey = [
  [
    "01",
    "Choose a pathway",
    "Start with PSLE, JCE, or BGCSE, then choose the subject that needs attention.",
  ],
  [
    "02",
    "Compare tutors",
    "Filter by subject, availability, rating, and credit price before opening full profiles.",
  ],
  [
    "03",
    "Message or save",
    "Ask a tutor questions for free, save favourites, and share profiles with a parent or learner.",
  ],
  [
    "04",
    "Book your format",
    "Choose online private, online group, the tutor's place, or the student's place.",
  ],
  [
    "05",
    "Learn and revise",
    "Use tutorial videos, revision papers, and lesson tests inside the same Studacad account.",
  ],
];

const directory = [
  [
    "Tutor discovery",
    "Exam-level submenus, subject cards, search, availability, rating, and credit-price filters.",
  ],
  [
    "Approved profiles",
    "Biography, subjects, verified evidence summary, supported formats, live availability, and lesson price.",
  ],
  [
    "Before booking",
    "Free tutor messaging, persistent favourites, profile sharing, and a personal shortlist.",
  ],
  [
    "Flexible sessions",
    "Live private and group schedules, tutor-hosted, and learner-home tutorials.",
  ],
  [
    "Google Meet",
    "Confirmed online bookings prepare a Google Meet space and release the joining link to participants 24 hours before start.",
  ],
  [
    "Credits wallet",
    "Use verified deposited credits for bookings or courses and review every transaction.",
  ],
  [
    "Learning library",
    "Purchased courses appear under My learning with progress, lesson lists, and completion status.",
  ],
  [
    "Lesson resources",
    "Watch tutorial videos, download revision papers, and work through structured lesson material.",
  ],
  [
    "Retention tests",
    "Multiple-choice questions check understanding and save the recorded score without minting credits.",
  ],
  [
    "Administration",
    "Authorised admins create courses, upload lesson videos and papers, and write quiz questions.",
  ],
  [
    "Botswana curriculum",
    "Content and tutors are organised around PSLE, JCE, and BGCSE subjects.",
  ],
  [
    "Responsive access",
    "The marketplace, profiles, wallet, and LMS adapt to desktop, tablet, and mobile screens.",
  ],
];

export default function HowItWorksPage() {
  return (
    <main className="lms-page how-page">
      <LmsHeader current="how" />

      <section className="how-hero">
        <div className="how-hero-copy">
          <p className="eyebrow">One Botswana learning platform</p>
          <h1>From finding help to mastering the lesson</h1>
          <p>
            Studacad combines a tutor marketplace, credits wallet, bookings,
            online and in-person tutorials, revision resources, and an LMS for
            PSLE, JCE, and BGCSE learners.
          </p>
          <div className="how-hero-actions">
            <Link className="primary" href="/tutors">
              Find a tutor
            </Link>
            <Link className="how-outline" href="/courses">
              Explore courses
            </Link>
          </div>
        </div>
        <div className="how-hero-visual" aria-label="Studacad feature overview">
          <div className="how-browser-bar">
            <i />
            <i />
            <i />
            <span>studacad · learning dashboard</span>
          </div>
          <div className="how-visual-wallet">
            <small>Wallet</small>
            <strong>Live account balance</strong>
          </div>
          <div className="how-pathway-tabs">
            <span>PSLE</span>
            <span>JCE</span>
            <span>BGCSE</span>
          </div>
          <div className="how-visual-body">
            <div className="how-mini-profile">
              <div className="how-mini-photo">✓</div>
              <div>
                <small>Published marketplace</small>
                <strong>Approved tutor profile</strong>
                <span>Live price and availability</span>
              </div>
            </div>
            <div className="how-mini-learning">
              <span>Purchased course</span>
              <strong>Account-backed lesson progress</strong>
              <div>
                <i />
              </div>
              <small>Video · Revision file · knowledge check</small>
            </div>
          </div>
        </div>
      </section>

      <nav className="how-jump-nav" aria-label="How Studacad works sections">
        <a href="#journey">Learner journey</a>
        <a href="#marketplace">Find tutors</a>
        <a href="#profiles">Tutor profiles</a>
        <a href="#sessions">Book sessions</a>
        <a href="#credits">Credits</a>
        <a href="#lms">LMS</a>
        <a href="#admin">Administration</a>
      </nav>

      <section className="how-section how-journey" id="journey">
        <div className="how-section-heading">
          <p className="eyebrow">The complete journey</p>
          <h2>Five steps from a learning need to real progress</h2>
          <p>
            Every part connects. Learners do not have to leave Studacad to
            discover a tutor, pay with credits, attend a session, or revise
            afterwards.
          </p>
        </div>
        <div className="how-journey-grid">
          {journey.map(([number, title, copy]) => (
            <article key={number}>
              <span>{number}</span>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="how-section how-split" id="marketplace">
        <div className="how-copy-block">
          <p className="eyebrow">Tutor marketplace</p>
          <h2>Find the right subject specialist</h2>
          <p>
            The Find tutors menu opens PSLE, JCE, and BGCSE pathways. Selecting
            a subject opens a dedicated tutor grid instead of a generic list.
          </p>
          <ul>
            <li>Search by tutor name or subject.</li>
            <li>
              Filter by examination, subject, tutor availability, maximum credit
              price, and minimum rating.
            </li>
            <li>Sort recommendations by price or rating.</li>
            <li>
              Open any result to see the tutor&apos;s complete profile and
              current time slots.
            </li>
          </ul>
          <Link
            className="text-link"
            href="/tutors?exam=PSLE&subject=Mathematics"
          >
            See a filtered tutor grid →
          </Link>
        </div>
        <div className="how-market-visual">
          <div className="how-filter-row">
            <span>PSLE</span>
            <span>Mathematics</span>
            <span>Today</span>
          </div>
          <div className="how-results-count">
            <b>Live</b>
            <small>approved results</small>
          </div>
          <div className="how-result-cards">
            <article>
              <div className="how-avatar pink">✓</div>
              <strong>Approved profile</strong>
              <span>Subject and examination</span>
              <small>Recorded rating · live price</small>
            </article>
            <article>
              <div className="how-avatar blue">✓</div>
              <strong>Approved profile</strong>
              <span>Subject and examination</span>
              <small>Recorded lessons · live price</small>
            </article>
          </div>
        </div>
      </section>

      <section className="how-section how-split reverse" id="profiles">
        <div className="how-profile-visual">
          <div className="how-profile-head">
            <div className="how-avatar pink">✓</div>
            <div>
              <small>Exam · Subject</small>
              <strong>Approved tutor</strong>
              <span>Published profile information</span>
            </div>
          </div>
          <div className="how-action-icons" aria-hidden="true">
            <span>▭</span>
            <span>♡</span>
            <span>⇧</span>
          </div>
          <div className="how-video-panel">
            <span>▶</span>
            <div>
              <strong>Optional introduction video</strong>
              <small>Shown only when a verified file is published</small>
            </div>
          </div>
          <div className="how-resume-panel">
            <span>Education</span>
            <span>Experience</span>
            <span>Verified evidence</span>
          </div>
        </div>
        <div className="how-copy-block">
          <p className="eyebrow">Tutor profiles</p>
          <h2>Know the tutor before spending credits</h2>
          <p>
            Profiles publish only information approved through tutor review.
          </p>
          <ul>
            <li>
              <b>Message:</b> ask about a topic, learning level, or schedule
              before booking.
            </li>
            <li>
              <b>Favourite:</b> save tutors to a persistent shortlist for later
              comparison.
            </li>
            <li>
              <b>Share:</b> use the device share menu or copy the profile link.
            </li>
            <li>
              <b>Evidence:</b> see the subjects and formats approved by
              Studacad.
            </li>
            <li>
              <b>Availability:</b> choose only slots returned by the booking
              service.
            </li>
          </ul>
        </div>
      </section>

      <section className="how-section" id="sessions">
        <div className="how-section-heading">
          <p className="eyebrow">Flexible tutorials</p>
          <h2>Choose where and how the lesson happens</h2>
          <p>
            Open a tutor&apos;s private or group schedule, move between weeks,
            and reserve a live server-confirmed lesson time.
          </p>
        </div>
        <div className="how-session-layout">
          <div className="how-booking-visual">
            <div className="how-session-grid">
              <div className="selected">
                <b>Online private</b>
              </div>
              <div>
                <b>Online group</b>
              </div>
              <div>
                <b>At tutor&apos;s place</b>
              </div>
              <div>
                <b>At student&apos;s place</b>
              </div>
            </div>
            <p>Choose a time</p>
            <div className="how-time-grid">
              <span className="selected">Live available slot</span>
              <span>Next server slot</span>
              <span>Future server slot</span>
            </div>
          </div>
          <div className="how-session-notes">
            <article>
              <span>1</span>
              <div>
                <h3>Online private</h3>
                <p>
                  A focused lesson for one learner. Studacad prepares the Google
                  Meet step after booking.
                </p>
              </div>
            </article>
            <article>
              <span>2</span>
              <div>
                <h3>Online group</h3>
                <p>
                  The profile shows the tutor&apos;s approved group capacity and
                  server-owned per-learner price.
                </p>
              </div>
            </article>
            <article>
              <span>3</span>
              <div>
                <h3>Tutor&apos;s place</h3>
                <p>
                  The tutor&apos;s general location is visible first; the exact
                  address is shared after confirmation.
                </p>
              </div>
            </article>
            <article>
              <span>4</span>
              <div>
                <h3>Student&apos;s place</h3>
                <p>
                  The learner enters an address before booking so the tutor can
                  prepare for the home visit.
                </p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="how-section how-split reverse" id="credits">
        <div className="how-wallet-visual">
          <div className="how-wallet-card">
            <small>STUDACAD WALLET</small>
            <strong>Live</strong>
            <span>account balance</span>
            <i>◆</i>
          </div>
          <div className="how-credit-flow">
            <span>Verified deposit</span>
            <b>→</b>
            <span>Book or buy</span>
            <b>→</b>
            <span>Track</span>
          </div>
          <div className="how-transaction">
            <span>Confirmed booking hold</span>
            <b>Ledger</b>
          </div>
          <div className="how-transaction reward">
            <span>Eligible cancellation refund</span>
            <b>Ledger</b>
          </div>
        </div>
        <div className="how-copy-block">
          <p className="eyebrow">Credits wallet</p>
          <h2>One balance for the whole platform</h2>
          <p>
            Credits replace different checkout processes across the marketplace
            and LMS.
          </p>
          <ul>
            <li>
              Until a payment gateway is selected, an administrator records only
              a verified offline deposit.
            </li>
            <li>One whole BWP verified equals one credit.</li>
            <li>Use credits to book tutors or purchase learning programmes.</li>
            <li>See the cost before confirming any transaction.</li>
            <li>
              Review deposits, purchases, bookings, rewards, and refunds in one
              history.
            </li>
          </ul>
          <Link className="text-link" href="/wallet">
            Open the credits wallet →
          </Link>
        </div>
      </section>

      <section className="how-section how-split" id="lms">
        <div className="how-copy-block">
          <p className="eyebrow">Learning management system</p>
          <h2>Learn, practise, test, and retain</h2>
          <p>
            My learning contains purchased programmes and their lesson progress.
            Each lesson keeps instruction and revision together.
          </p>
          <ul>
            <li>Watch tutorial videos inside the lesson.</li>
            <li>
              Open or download revision papers supplied by the course
              administrator.
            </li>
            <li>Complete multiple-choice tests at the end of lessons.</li>
            <li>See the current score and best recorded score.</li>
            <li>Passing records completion; quizzes do not create credits.</li>
          </ul>
          <Link className="text-link" href="/learn">
            Go to My learning →
          </Link>
        </div>
        <div className="how-lms-visual">
          <div className="how-lms-sidebar">
            <b>Course lessons</b>
            <span className="done">✓ Number skills</span>
            <span className="active">▶ Fractions</span>
            <span>○ Measurement</span>
            <span>○ Geometry</span>
          </div>
          <div className="how-lms-content">
            <div className="how-player">
              <span>▶</span>
              <small>TUTORIAL VIDEO</small>
            </div>
            <div className="how-resource-row">
              <span>PDF</span>
              <div>
                <b>Revision paper</b>
                <small>Practice questions and memo</small>
              </div>
            </div>
            <div className="how-quiz-row">
              <b>Quick test</b>
              <span>4 / 5 correct</span>
              <i>80% mastery</i>
            </div>
          </div>
        </div>
      </section>

      <section className="how-section how-split reverse" id="admin">
        <div className="how-admin-visual">
          <div className="how-admin-tabs">
            <b>Courses</b>
            <span>Lessons</span>
            <span>Tests</span>
          </div>
          <div className="how-admin-form">
            <small>AUTHORISED CONTENT WORKSPACE</small>
            <span>Lesson title</span>
            <strong>Validated course content</strong>
            <div>
              <i>Video URL</i>
              <i>Revision file</i>
            </div>
            <span>Question</span>
            <strong>Reviewed assessment prompt</strong>
            <span>Publish after review</span>
          </div>
        </div>
        <div className="how-copy-block">
          <p className="eyebrow">Authorised administration</p>
          <h2>Publish Botswana focused learning material</h2>
          <p>
            The admin workspace is intentionally not linked in the public
            navigation. Authorised staff use it to maintain the LMS.
          </p>
          <ul>
            <li>Create PSLE, JCE, and BGCSE programmes.</li>
            <li>Add lessons with tutorial video links and revision papers.</li>
            <li>
              Write multiple-choice questions and define the correct answers.
            </li>
            <li>
              Publish material directly into the learner&apos;s course
              experience.
            </li>
            <li>
              Review the course library without mixing administration into the
              tutor marketplace.
            </li>
          </ul>
        </div>
      </section>

      <section className="how-section how-directory">
        <div className="how-section-heading">
          <p className="eyebrow">Feature directory</p>
          <h2>Everything working together in Studacad</h2>
        </div>
        <div className="how-directory-grid">
          {directory.map(([title, copy], index) => (
            <article key={title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="how-final-cta">
        <div>
          <p className="eyebrow">Ready to begin?</p>
          <h2>Choose the next step</h2>
        </div>
        <div>
          <Link className="primary light" href="/tutors">
            Find a tutor
          </Link>
          <Link className="how-outline light" href="/learn">
            Open My learning
          </Link>
        </div>
      </section>
    </main>
  );
}
