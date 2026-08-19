"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Course, initialLmsState, Lesson, LmsState } from "../lib/lms";
import type { ReferralRewardEvent } from "../lib/referrals";

type LmsContextValue = LmsState & {
  ready: boolean;
  walletReady: boolean;
  walletError: string;
  referralCode: string;
  referredBy: string;
  visitorId: string;
  refreshWallet: () => Promise<void>;
  bookTutor: (tutorName: string, price: number, slot: string, format?: string) => { ok: boolean; message: string };
  bookTutorSlots: (tutorName: string, pricePerSlot: number, slots: string[], format: string) => { ok: boolean; message: string };
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

export function LmsProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<LmsState>(initialLmsState);
  const [ready, setReady] = useState(false);
  const [walletReady, setWalletReady] = useState(false);
  const [walletError, setWalletError] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [referredBy, setReferredBy] = useState("");
  const [visitorId, setVisitorId] = useState("");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as LmsState;
        setState({
          ...parsed,
          credits: 0,
          transactions: [],
          appliedReferralRewardIds: parsed.appliedReferralRewardIds ?? [],
          referralRewards: parsed.referralRewards ?? []
        });
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
      // Account-backed data will still load if browser storage is unavailable.
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, credits: 0, transactions: [] }));
  }, [ready, state]);

  const refreshWallet = useCallback(async () => {
    try {
      const response = await fetch("/api/wallet", { cache: "no-store" });
      if (!response.ok) {
        if (response.status === 401) {
          setWalletError("");
          return;
        }
        const result = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(result?.error ?? "Unable to load the wallet.");
      }
      const wallet = await response.json() as Pick<LmsState, "credits" | "transactions"> & { balance?: number };
      setState(current => ({ ...current, credits: wallet.balance ?? wallet.credits ?? 0, transactions: wallet.transactions ?? [] }));
      setWalletError("");
    } catch (error) {
      setWalletError(error instanceof Error ? error.message : "Unable to load the wallet.");
    } finally {
      setWalletReady(true);
    }
  }, []);

  useEffect(() => { void refreshWallet(); }, [refreshWallet]);

  const value = useMemo<LmsContextValue>(() => ({
    ...state,
    ready,
    walletReady,
    walletError,
    referralCode,
    referredBy,
    visitorId,
    refreshWallet,
    bookTutor: () => ({ ok: false, message: "Secure booking is being connected to your Studacad wallet." }),
    bookTutorSlots: (_tutorName, _pricePerSlot, slots) => {
      if (slots.length === 0) return { ok: false, message: "Choose at least one lesson time." };
      return { ok: false, message: "Secure booking is being connected to your Studacad wallet." };
    },
    purchaseCourse: (courseId) => {
      const course = state.courses.find(item => item.id === courseId);
      if (!course) return { ok: false, message: "Course not found." };
      if (state.purchasedCourseIds.includes(courseId)) return { ok: true, message: "Already in your learning library." };
      return { ok: false, message: "Secure course purchases are being connected to your Studacad wallet." };
    },
    recordQuiz: (lessonId, score) => setState(current => {
      const passed = score >= 70;
      return {
        ...current,
        completedLessonIds: passed ? Array.from(new Set([...current.completedLessonIds, lessonId])) : current.completedLessonIds,
        quizScores: { ...current.quizScores, [lessonId]: Math.max(score, current.quizScores[lessonId] ?? 0) }
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
      setState(current => ({
        ...current,
        appliedReferralRewardIds: [...(current.appliedReferralRewardIds ?? []), ...newRewards.map(reward => reward.id)],
        referralRewards: Array.from(new Map([...(current.referralRewards ?? []), ...newRewards].map(reward => [reward.id, reward])).values())
      }));
      return 0;
    },
    resetDemo: () => {
      setState(current => ({ ...initialLmsState, credits: current.credits, transactions: current.transactions }));
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }), [ready, referralCode, referredBy, refreshWallet, state, visitorId, walletError, walletReady]);

  return <LmsContext.Provider value={value}>{children}</LmsContext.Provider>;
}

export function useLms() {
  const context = useContext(LmsContext);
  if (!context) throw new Error("useLms must be used inside LmsProvider");
  return context;
}
