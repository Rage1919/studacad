export type Tutor = {
  id: string;
  profileId?: string;
  name: string;
  examination: "PSLE" | "JCE" | "BGCSE";
  subject: string;
  rating: string;
  lessons: string;
  price: number;
  color: string;
  image: string;
  location: string;
  experience: string;
  headline: string;
  about: string;
  specialties: string[];
  approach: string[];
  availability: string[];
  availabilityGroups: Array<"Today" | "Tomorrow" | "Weekdays" | "Weekend">;
  sessionFormats: Array<
    "online-1to1" | "online-group" | "tutor-place" | "student-place"
  >;
  introVideo: string;
  resume: {
    education: string[];
    experience: Array<{
      role: string;
      organisation: string;
      period: string;
    }>;
    certifications: string[];
  };
};
