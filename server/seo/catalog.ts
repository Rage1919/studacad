import "server-only";
import { getDatabaseAdminClient } from "../db/client";
import type {
  Course,
  Json,
  LessonRecord,
  PublicTutorMarketplaceProfile,
} from "../db/models";

export type PublicCourseSummary = Pick<
  Course,
  | "id"
  | "slug"
  | "title"
  | "examination"
  | "subject"
  | "description"
  | "price_credits"
  | "theme_color"
  | "published_at"
  | "updated_at"
>;

export type PublicCourseDetail = PublicCourseSummary & {
  lessons: Array<
    Pick<LessonRecord, "slug" | "title" | "description" | "duration_minutes">
  >;
};

export type PublicTutorSeoProfile = Pick<
  PublicTutorMarketplaceProfile,
  "slug" | "display_name" | "headline" | "location" | "published_at"
> & { subjects: Json };

export async function listPublicCourses(): Promise<PublicCourseSummary[]> {
  const result = await getDatabaseAdminClient()
    .from("courses")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false });
  if (result.error)
    throw new Error("Unable to load the public course catalog.");
  return (result.data as Course[]).map((course) => ({
    id: course.id,
    slug: course.slug,
    title: course.title,
    examination: course.examination,
    subject: course.subject,
    description: course.description,
    price_credits: course.price_credits,
    theme_color: course.theme_color,
    published_at: course.published_at,
    updated_at: course.updated_at,
  }));
}

export async function getPublicCourse(
  slug: string,
): Promise<PublicCourseDetail | null> {
  const courseResult = await getDatabaseAdminClient()
    .from("courses")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (courseResult.error || !courseResult.data) return null;
  const course = courseResult.data as Course;
  const lessonsResult = await getDatabaseAdminClient()
    .from("lessons")
    .select("*")
    .eq("course_id", course.id)
    .eq("status", "published")
    .order("position", { ascending: true });
  if (lessonsResult.error)
    throw new Error("Unable to load public course lessons.");
  return {
    id: course.id,
    slug: course.slug,
    title: course.title,
    examination: course.examination,
    subject: course.subject,
    description: course.description,
    price_credits: course.price_credits,
    theme_color: course.theme_color,
    published_at: course.published_at,
    updated_at: course.updated_at,
    lessons: (lessonsResult.data as LessonRecord[]).map((lesson) => ({
      slug: lesson.slug,
      title: lesson.title,
      description: lesson.description,
      duration_minutes: lesson.duration_minutes,
    })),
  };
}

export async function listPublicTutorSeoProfiles(): Promise<
  PublicTutorSeoProfile[]
> {
  const result = await getDatabaseAdminClient()
    .from("public_tutor_marketplace_profiles")
    .select("*")
    .order("published_at", { ascending: false });
  if (result.error) throw new Error("Unable to load public tutor profiles.");
  return (result.data as PublicTutorMarketplaceProfile[]).map((profile) => ({
    slug: profile.slug,
    display_name: profile.display_name,
    headline: profile.headline,
    location: profile.location,
    published_at: profile.published_at,
    subjects: profile.subjects,
  }));
}

export async function getPublicTutorSeoProfile(
  slug: string,
): Promise<PublicTutorSeoProfile | null> {
  const result = await getDatabaseAdminClient()
    .from("public_tutor_marketplace_profiles")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (result.error || !result.data) return null;
  const profile = result.data as PublicTutorMarketplaceProfile;
  return {
    slug: profile.slug,
    display_name: profile.display_name,
    headline: profile.headline,
    location: profile.location,
    published_at: profile.published_at,
    subjects: profile.subjects,
  };
}
