import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LmsHeader } from "../../components/LmsHeader";
import { StructuredData } from "../../components/StructuredData";
import {
  privateMetadata,
  productionOrigin,
  publicMetadata,
} from "../../lib/seo";
import { getPublicCourse } from "../../../server/seo/catalog";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const course = await getPublicCourse(slug).catch(() => null);
  if (!course)
    return privateMetadata(
      "Course unavailable",
      "This course is not currently published.",
    );
  return publicMetadata({
    title: `${course.title} — ${course.examination} ${course.subject}`,
    description: course.description,
    path: `/courses/${course.slug}`,
  });
}

export default async function CoursePage({ params }: Props) {
  const { slug } = await params;
  const course = await getPublicCourse(slug);
  if (!course) notFound();
  const courseUrl = `${productionOrigin}/courses/${course.slug}`;
  const structuredCourse = {
    "@context": "https://schema.org",
    "@type": "Course",
    "@id": `${courseUrl}#course`,
    name: course.title,
    description: course.description,
    url: courseUrl,
    provider: {
      "@type": "Organization",
      "@id": `${productionOrigin}/#organization`,
      name: "Studacad",
    },
    educationalLevel: course.examination,
    about: course.subject,
    inLanguage: "en-BW",
  };
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Courses",
        item: `${productionOrigin}/courses`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: course.title,
        item: courseUrl,
      },
    ],
  };
  return (
    <main className="lms-page">
      <StructuredData data={structuredCourse} />
      <StructuredData data={breadcrumb} />
      <LmsHeader />
      <section className="course-catalog-page">
        <article className="course-detail">
          <Link href="/courses">← All published courses</Link>
          <p className="eyebrow">Published course</p>
          <h1>{course.title}</h1>
          <p>{course.description}</p>
          <div className="course-detail-meta">
            <span>{course.examination}</span>
            <span>{course.subject}</span>
            <span>{course.price_credits} credits</span>
          </div>
          <h2>Published lessons</h2>
          {course.lessons.length === 0 ? (
            <p>No lessons are currently published for this course.</p>
          ) : (
            <div className="public-lesson-list">
              {course.lessons.map((lesson) => (
                <article key={lesson.slug}>
                  <h2>{lesson.title}</h2>
                  <p>{lesson.description}</p>
                  <small>{lesson.duration_minutes} minutes</small>
                </article>
              ))}
            </div>
          )}
          <Link className="primary" href="/learn">
            Open My learning to purchase
          </Link>
        </article>
      </section>
    </main>
  );
}
