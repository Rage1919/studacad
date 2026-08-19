"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { initialLmsState, type LmsState } from "../lib/lms";

type ActionResult = { ok: boolean; message: string };
type QuizResult = ActionResult & { score?: number; passed?: boolean };

type LmsContextValue = LmsState & {
  ready: boolean;
  learningError: string;
  walletReady: boolean;
  walletError: string;
  referralCode: string;
  refreshLearning: () => Promise<void>;
  refreshWallet: () => Promise<void>;
  refreshReferrals: () => Promise<void>;
  bookTutor: (tutorName: string, price: number, slot: string, format?: string) => ActionResult;
  bookTutorSlots: (tutorName: string, pricePerSlot: number, slots: string[], format: string) => ActionResult;
  purchaseCourse: (courseId: string) => Promise<ActionResult>;
  recordQuiz: (lessonDatabaseId: string, answers: Array<{ questionId: string; optionId: string }>) => Promise<QuizResult>;
};

const LmsContext = createContext<LmsContextValue | null>(null);
const idempotencyKey = (prefix: string) => `${prefix}:${crypto.randomUUID()}`;

export function LmsProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<LmsState>(initialLmsState);
  const [ready, setReady] = useState(false);
  const [learningError, setLearningError] = useState("");
  const [walletReady, setWalletReady] = useState(false);
  const [walletError, setWalletError] = useState("");
  const [referralCode, setReferralCode] = useState("");

  const refreshLearning = useCallback(async () => {
    try {
      const response = await fetch("/api/lms", { cache: "no-store" });
      if (response.status === 401) { setLearningError(""); return; }
      const payload = await response.json() as LmsState & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to load learning data.");
      setState(current => ({ ...payload, credits: current.credits, transactions: current.transactions, referralRewards: current.referralRewards }));
      setLearningError("");
    } catch (error) {
      setLearningError(error instanceof Error ? error.message : "Unable to load learning data.");
    } finally {
      setReady(true);
    }
  }, []);

  const refreshWallet = useCallback(async () => {
    try {
      const response = await fetch("/api/wallet", { cache: "no-store" });
      if (response.status === 401) { setWalletError(""); return; }
      const wallet = await response.json() as Pick<LmsState, "credits" | "transactions"> & { balance?: number; error?: string };
      if (!response.ok) throw new Error(wallet.error ?? "Unable to load the wallet.");
      setState(current => ({ ...current, credits: wallet.balance ?? wallet.credits ?? 0, transactions: wallet.transactions ?? [] }));
      setWalletError("");
    } catch (error) {
      setWalletError(error instanceof Error ? error.message : "Unable to load the wallet.");
    } finally {
      setWalletReady(true);
    }
  }, []);

  const refreshReferrals = useCallback(async () => {
    try {
      const response = await fetch("/api/referrals", { cache: "no-store" });
      if (response.status === 401) return;
      const payload = await response.json() as { code?: string; rewards?: LmsState["referralRewards"]; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to load referral activity.");
      setReferralCode(payload.code ?? "");
      setState(current => ({ ...current, referralRewards: payload.rewards ?? [] }));
    } catch {
      // The referral page shows a retry state; core learning remains usable.
    }
  }, []);

  useEffect(() => {
    void Promise.all([refreshLearning(), refreshWallet(), refreshReferrals()]);
    const incoming = new URLSearchParams(window.location.search).get("ref")?.trim().toUpperCase();
    if (incoming && /^[A-Z0-9-]{6,32}$/.test(incoming)) {
      document.cookie = `studacad-referral=${encodeURIComponent(incoming)}; Path=/; Max-Age=2592000; SameSite=Lax; Secure`;
    }
  }, [refreshLearning, refreshReferrals, refreshWallet]);

  useEffect(() => {
    if (!referralCode) return;
    const incoming = document.cookie.split("; ").find(item => item.startsWith("studacad-referral="))?.split("=")[1];
    if (!incoming) return;
    void fetch("/api/referrals", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: decodeURIComponent(incoming) })
    }).then(response => {
      if (response.ok || response.status === 409) document.cookie = "studacad-referral=; Path=/; Max-Age=0; SameSite=Lax; Secure";
    });
  }, [referralCode]);

  const purchaseCourse = useCallback(async (courseId: string): Promise<ActionResult> => {
    try {
      const response = await fetch("/api/lms/purchases", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseSlug: courseId, idempotencyKey: idempotencyKey("course-purchase") })
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to purchase the course.");
      await Promise.all([refreshLearning(), refreshWallet()]);
      return { ok: true, message: "Course added to your learning library." };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "Unable to purchase the course." };
    }
  }, [refreshLearning, refreshWallet]);

  const recordQuiz = useCallback(async (lessonDatabaseId: string, answers: Array<{ questionId: string; optionId: string }>): Promise<QuizResult> => {
    try {
      const response = await fetch("/api/lms/quizzes", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId: lessonDatabaseId, answers, idempotencyKey: idempotencyKey("quiz-attempt") })
      });
      const payload = await response.json() as { attempt?: { scorePercent: number; passed: boolean }; error?: string };
      if (!response.ok || !payload.attempt) throw new Error(payload.error ?? "Unable to submit the quiz.");
      await refreshLearning();
      return { ok: true, message: payload.attempt.passed ? "Lesson passed." : "Keep practising and try again.", score: payload.attempt.scorePercent, passed: payload.attempt.passed };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "Unable to submit the quiz." };
    }
  }, [refreshLearning]);

  const value = useMemo<LmsContextValue>(() => ({
    ...state, ready, learningError, walletReady, walletError, referralCode,
    refreshLearning, refreshWallet, refreshReferrals,
    bookTutor: () => ({ ok: false, message: "Choose a real available slot to book this tutor." }),
    bookTutorSlots: (_tutorName, _pricePerSlot, slots) => slots.length
      ? { ok: false, message: "Choose a real available slot to book this tutor." }
      : { ok: false, message: "Choose at least one lesson time." },
    purchaseCourse, recordQuiz
  }), [learningError, purchaseCourse, ready, recordQuiz, referralCode, refreshLearning, refreshReferrals, refreshWallet, state, walletError, walletReady]);

  return <LmsContext.Provider value={value}>{children}</LmsContext.Provider>;
}

export function useLms() {
  const context = useContext(LmsContext);
  if (!context) throw new Error("useLms must be used inside LmsProvider");
  return context;
}
