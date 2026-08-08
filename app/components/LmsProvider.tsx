"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Course, CreditTransaction, initialLmsState, Lesson, LmsState } from "../lib/lms";

type LmsContextValue = LmsState & {
  ready: boolean;
  topUp: (amount: number) => void;
  purchaseCourse: (courseId: string) => { ok: boolean; message: string };
  recordQuiz: (lessonId: string, score: number) => void;
  addCourse: (course: Course) => void;
  addLesson: (courseId: string, lesson: Lesson) => void;
  resetDemo: () => void;
};

const STORAGE_KEY = "studacad-lms-v2";
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

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) setState(JSON.parse(stored));
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
    topUp: (amount) => setState(current => ({
      ...current,
      credits: current.credits + amount,
      transactions: [transaction("topup", `Wallet top-up · ${amount} credits`, amount), ...current.transactions]
    })),
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
    resetDemo: () => {
      setState(initialLmsState);
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }), [ready, state]);

  return <LmsContext.Provider value={value}>{children}</LmsContext.Provider>;
}

export function useLms() {
  const context = useContext(LmsContext);
  if (!context) throw new Error("useLms must be used inside LmsProvider");
  return context;
}
