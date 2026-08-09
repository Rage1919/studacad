"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Course, CreditTransaction, initialLmsState, Lesson, LmsState } from "../lib/lms";
import type { ReferralRewardEvent } from "../lib/referrals";

type LmsContextValue = LmsState & {
  ready: boolean;
  referralCode: string;
  referredBy: string;
  visitorId: string;
  topUp: (amount: number) => void;
  bookTutor: (tutorName: string, price: number, slot: string, format?: string) => { ok: boolean; message: string };
  purchaseCourse: (courseId: string) => { ok: boolean; message: string };
  recordQuiz: (lessonId: string, score: number) => void;
  addCourse: (course: Course) => void;
  addLesson: (courseId: string, lesson: Lesson) => void;
  applyReferralRewards: (rewards: ReferralRewardEvent[]) => number;
  resetDemo: () => void;
};

const STORAGE_KEY = "studacad-lms-v2";
const REFERRAL_CODE_KEY = "studacad-referral-code";
const REFERRED_BY_KEY = "studacad-referred-by";
const VISITOR_ID_KEY = "studacad-visitor-id";
const LmsContext = createContext<LmsContextValue | null>(null);

const transaction = (type: CreditTransaction["type"], label: string, amount: number): CreditTransaction => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  type,
  label,
  amount,
  createdAt: new Date().toISOString()
});

export function LmsProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<LmsState>(initialLmsState);
  const [ready, setReady] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [referredBy, setReferredBy] = useState("");
  const [visitorId, setVisitorId] = useState("");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as LmsState;
        setState({ ...parsed, appliedReferralRewardIds: parsed.appliedReferralRewardIds ?? [], referralRewards: parsed.referralRewards ?? [] });
      }
      let identity = window.localStorage.getItem(VISITOR_ID_KEY);
      if (!identity) {
        identity = `visitor-${crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
        window.localStorage.setItem(VISITOR_ID_KEY, identity);
      }
      let ownCode = window.localStorage.getItem(REFERRAL_CODE_KEY);
      if (!ownCode) {
        ownCode = `STUD-${identity.replace(/[^a-z0-9]/gi, "").slice(-8).toUpperCase()}`;
        window.localStorage.setItem(REFERRAL_CODE_KEY, ownCode);
      }
      const incomingCode = new URLSearchParams(window.location.search).get("ref")?.trim().toUpperCase() ?? "";
      if (/^[A-Z0-9-]{6,32}$/.test(incomingCode) && incomingCode !== ownCode) {
        window.localStorage.setItem(REFERRED_BY_KEY, incomingCode);
      }
      setVisitorId(identity);
      setReferralCode(ownCode);
      setReferredBy(window.localStorage.getItem(REFERRED_BY_KEY) ?? "");
    } catch {
      // The seeded demo remains available if storage is unavailable.
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [ready, state]);

  const value = useMemo<LmsContextValue>(() => ({
    ...state,
    ready,
    referralCode,
    referredBy,
    visitorId,
    topUp: (amount) => setState(current => ({
      ...current,
      credits: current.credits + amount,
      transactions: [transaction("topup", `Wallet top-up · ${amount} credits`, amount), ...current.transactions]
    })),
    bookTutor: (tutorName, price, slot, format = "1-to-1 tutorial") => {
      if (state.credits < price) return { ok: false, message: "Not enough credits. Top up your wallet first." };
      setState(current => ({
        ...current,
        credits: current.credits - price,
        transactions: [transaction("purchase", `${format} with ${tutorName} · ${slot}`, -price), ...current.transactions]
      }));
      return { ok: true, message: `${format} with ${tutorName} booked for ${slot}.` };
    },
    purchaseCourse: (courseId) => {
      const course = state.courses.find(item => item.id === courseId);
      if (!course) return { ok: false, message: "Course not found." };
      if (state.purchasedCourseIds.includes(courseId)) return { ok: true, message: "Already in your learning library." };
      if (state.credits < course.price) return { ok: false, message: "Not enough credits. Top up your wallet first." };
      setState(current => ({
        ...current,
        credits: current.credits - course.price,
        purchasedCourseIds: [...current.purchasedCourseIds, courseId],
        transactions: [transaction("purchase", course.title, -course.price), ...current.transactions]
      }));
      return { ok: true, message: `${course.title} added to your library.` };
    },
    recordQuiz: (lessonId, score) => setState(current => {
      const passed = score >= 70;
      const firstPass = passed && !current.completedLessonIds.includes(lessonId);
      return {
        ...current,
        credits: current.credits + (firstPass ? 10 : 0),
        completedLessonIds: passed ? Array.from(new Set([...current.completedLessonIds, lessonId])) : current.completedLessonIds,
        quizScores: { ...current.quizScores, [lessonId]: Math.max(score, current.quizScores[lessonId] ?? 0) },
        transactions: firstPass ? [transaction("reward", "Lesson mastery reward", 10), ...current.transactions] : current.transactions
      };
    }),
    addCourse: (course) => setState(current => ({ ...current, courses: [course, ...current.courses] })),
    addLesson: (courseId, lesson) => setState(current => ({
      ...current,
      courses: current.courses.map(course => course.id === courseId ? { ...course, lessons: [...course.lessons, lesson] } : course)
    })),
    applyReferralRewards: (rewards) => {
      const applied = state.appliedReferralRewardIds ?? [];
      const newRewards = rewards.filter(reward => !applied.includes(reward.id));
      if (newRewards.length === 0) return 0;
      const total = newRewards.reduce((sum, reward) => sum + reward.amount, 0);
      setState(current => ({
        ...current,
        credits: current.credits + total,
        appliedReferralRewardIds: [...(current.appliedReferralRewardIds ?? []), ...newRewards.map(reward => reward.id)],
        referralRewards: Array.from(new Map([...(current.referralRewards ?? []), ...newRewards].map(reward => [reward.id, reward])).values()),
        transactions: [
          ...newRewards.map(reward => transaction("reward", `Referral reward · ${reward.tutorName} trial lesson`, reward.amount)),
          ...current.transactions
        ]
      }));
      return total;
    },
    resetDemo: () => {
      setState(initialLmsState);
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }), [ready, referralCode, referredBy, state, visitorId]);

  return <LmsContext.Provider value={value}>{children}</LmsContext.Provider>;
}

export function useLms() {
  const context = useContext(LmsContext);
  if (!context) throw new Error("useLms must be used inside LmsProvider");
  return context;
}
