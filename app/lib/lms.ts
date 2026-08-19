export type ExamLevel = "PSLE" | "JCE" | "BGCSE";
export type ContentStatus = "draft" | "published" | "archived";

export type QuizQuestion = {
  id: string;
  prompt: string;
  options: string[];
  optionIds?: string[];
  correctIndex?: number;
};

export type Lesson = {
  id: string;
  databaseId?: string;
  title: string;
  duration: string;
  description: string;
  videoUrl: string;
  revisionTitle: string;
  revisionContent: string;
  quiz: QuizQuestion[];
  status?: ContentStatus;
};

export type Course = {
  id: string;
  databaseId?: string;
  title: string;
  examination: ExamLevel;
  subject: string;
  description: string;
  color: string;
  price: number;
  instructor: string;
  lessons: Lesson[];
  status?: ContentStatus;
};

export type CreditTransaction = {
  id: string;
  type: "topup" | "purchase" | "reward" | "refund" | "adjustment" | "hold" | "release" | "chargeback" | "earning" | "payout";
  label: string;
  amount: number;
  createdAt: string;
};

export type ReferralReward = {
  id: string;
  amount: number;
  status: "pending" | "earned" | "reversed";
  qualifyingBookingId: string;
  createdAt: string;
  earnedAt: string | null;
};

export type LmsState = {
  credits: number;
  courses: Course[];
  purchasedCourseIds: string[];
  completedLessonIds: string[];
  quizScores: Record<string, number>;
  transactions: CreditTransaction[];
  referralRewards: ReferralReward[];
};

export const initialLmsState: LmsState = {
  credits: 0,
  courses: [],
  purchasedCourseIds: [],
  completedLessonIds: [],
  quizScores: {},
  transactions: [],
  referralRewards: []
};

export const credit = (amount: number) => `${amount.toLocaleString()} credits`;
