import type { Metadata } from "next";
import { StructuredData } from "../../components/StructuredData";
import {
  privateMetadata,
  productionOrigin,
  publicMetadata,
} from "../../lib/seo";
import TutorProfilePage from "../../tutor/page";
import { getPublicTutorSeoProfile } from "../../../server/seo/catalog";

type Props = { params: Promise<{ slug: string }> };

const subjectNames = (subjects: unknown): string[] =>
  Array.isArray(subjects)
    ? subjects.flatMap((subject) =>
        subject && typeof subject === "object" && "subject" in subject
          ? [String(subject.subject)]
          : [],
      )
    : [];

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const tutor = await getPublicTutorSeoProfile(slug).catch(() => null);
  if (!tutor)
    return privateMetadata(
      "Tutor unavailable",
      "This tutor profile is not currently published.",
    );
  return publicMetadata({
    title: `${tutor.display_name} — approved subject tutor`,
    description: tutor.headline,
    path: `/tutors/${tutor.slug}`,
    type: "article",
  });
}

export default async function PublicTutorProfile({ params }: Props) {
  const { slug } = await params;
  const tutor = await getPublicTutorSeoProfile(slug).catch(() => null);
  const url = `${productionOrigin}/tutors/${slug}`;
  const structuredTutor = tutor
    ? {
        "@context": "https://schema.org",
        "@type": "Person",
        "@id": `${url}#tutor`,
        name: tutor.display_name,
        description: tutor.headline,
        url,
        jobTitle: "Tutor",
        address: {
          "@type": "PostalAddress",
          addressLocality: tutor.location,
          addressCountry: "BW",
        },
        knowsAbout: subjectNames(tutor.subjects),
      }
    : null;
  const breadcrumb = tutor
    ? {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Tutors",
            item: `${productionOrigin}/tutors`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: tutor.display_name,
            item: url,
          },
        ],
      }
    : null;
  return (
    <>
      {structuredTutor && <StructuredData data={structuredTutor} />}
      {breadcrumb && <StructuredData data={breadcrumb} />}
      <TutorProfilePage slug={slug} />
    </>
  );
}
