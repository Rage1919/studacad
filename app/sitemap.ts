import type { MetadataRoute } from "next";
import { productionOrigin } from "./lib/seo";
import {
  listPublicCourses,
  listPublicTutorSeoProfiles,
} from "../server/seo/catalog";

const staticRoutes = [
  "",
  "/accessibility",
  "/become-a-tutor",
  "/cancellation-refunds",
  "/community-guidelines",
  "/cookies",
  "/courses",
  "/help",
  "/how-it-works",
  "/privacy",
  "/safety",
  "/terms",
  "/tutor-agreement",
  "/tutors",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const generatedAt = new Date();
  const entries: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
    url: `${productionOrigin}${route}`,
    lastModified: generatedAt,
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority:
      route === ""
        ? 1
        : route === "/tutors" || route === "/courses"
          ? 0.9
          : 0.6,
  }));
  try {
    const [tutors, courses] = await Promise.all([
      listPublicTutorSeoProfiles(),
      listPublicCourses(),
    ]);
    entries.push(
      ...tutors.map((tutor) => ({
        url: `${productionOrigin}/tutors/${tutor.slug}`,
        lastModified: new Date(tutor.published_at),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
      ...courses.map((course) => ({
        url: `${productionOrigin}/courses/${course.slug}`,
        lastModified: new Date(course.updated_at),
        changeFrequency: "monthly" as const,
        priority: 0.8,
      })),
    );
  } catch {
    // Static public routes remain discoverable while an unavailable catalog is retried.
  }
  return entries;
}
