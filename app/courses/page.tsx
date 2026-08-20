import Link from "next/link";
import { LmsHeader } from "../components/LmsHeader";
import { publicMetadata } from "../lib/seo";
import { listPublicCourses } from "../../server/seo/catalog";
import "./courses.css";

export const metadata = publicMetadata({
  title: "PSLE, JCE, and BGCSE revision courses",
  description:
    "Browse published Studacad revision courses for Botswana PSLE, JCE, and BGCSE subjects before signing in to purchase.",
  path: "/courses",
});

export default async function CoursesPage() {
  let courses: Awaited<ReturnType<typeof listPublicCourses>> = [];
  const staticPreview = Boolean(process.env.PAGES_BASE_PATH);
  let unavailable = staticPreview;
  if (!staticPreview) {
    try {
      courses = await listPublicCourses();
    } catch {
      unavailable = true;
    }
  }
  return (
    <main className="lms-page">
      <LmsHeader />
      <section className="course-catalog-page">
        <header>
          <p className="eyebrow">Published learning catalog</p>
          <h1>Revision courses for Botswana examinations</h1>
          <p>
            Compare approved published course information here. Purchase,
            protected lesson material, resources, quizzes, and progress remain
            inside your account.
          </p>
        </header>
        {unavailable && (
          <div className="locked-state" role="alert">
            <h2>Course catalog is temporarily unavailable</h2>
            <p>
              {staticPreview
                ? "Published course records require the Studacad server and are not bundled into this preview."
                : "Please try again after the connection is restored."}
            </p>
          </div>
        )}
        {!unavailable && courses.length === 0 && (
          <div className="locked-state">
            <h2>No courses are published yet</h2>
            <p>Only reviewed, published courses appear in this catalog.</p>
          </div>
        )}
        <div className="public-course-grid">
          {courses.map((course) => (
            <article className="public-course-card" key={course.id}>
              <p className="eyebrow">
                {course.examination} · {course.subject}
              </p>
              <h2>{course.title}</h2>
              <p>{course.description}</p>
              <strong>{course.price_credits} credits</strong>
              <Link href={`/courses/${course.slug}`}>View course →</Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
