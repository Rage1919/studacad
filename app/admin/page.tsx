"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LmsHeader } from "../components/LmsHeader";
import type { Course, ExamLevel, QuizQuestion } from "../lib/lms";

const blankQuestion = (): QuizQuestion => ({ id: crypto.randomUUID(), prompt: "", options: ["", "", "", ""], correctIndex: 0 });

export default function AdminPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [tab, setTab] = useState<"lesson" | "course" | "library">("library");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [courseForm, setCourseForm] = useState({ title: "", examination: "PSLE" as ExamLevel, subject: "Mathematics", description: "", priceCredits: 120, themeColor: "#dbeafe" });
  const [lessonForm, setLessonForm] = useState({ courseId: "", title: "", duration: "15 min", description: "", videoUrl: "", revisionTitle: "", revisionContent: "" });
  const [questions, setQuestions] = useState<QuizQuestion[]>([blankQuestion()]);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/content", { cache: "no-store" });
      const payload = await response.json() as { courses?: Course[]; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to load content.");
      setCourses(payload.courses ?? []);
      setLessonForm(current => ({ ...current, courseId: current.courseId || payload.courses?.[0]?.databaseId || "" }));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to load content.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);
  const flash = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(""), 5000); };
  const command = async (body: unknown) => {
    const response = await fetch("/api/admin/content", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const payload = await response.json() as { id?: string; error?: string };
    if (!response.ok) throw new Error(payload.error ?? "Unable to save learning content.");
    return payload;
  };

  const createCourse = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true);
    try {
      const created = await command({ action: "createCourse", course: courseForm });
      setCourseForm({ title: "", examination: "PSLE", subject: "Mathematics", description: "", priceCredits: 120, themeColor: "#dbeafe" });
      setLessonForm(current => ({ ...current, courseId: created.id ?? "" }));
      await refresh(); setTab("lesson"); flash("Course saved as a draft. Add and publish a lesson before publishing the course.");
    } catch (error) { flash(error instanceof Error ? error.message : "Unable to create the course."); }
    finally { setSaving(false); }
  };

  const createLesson = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true);
    try {
      await command({ action: "createLesson", lesson: { ...lessonForm, questions } });
      setLessonForm(current => ({ ...current, title: "", duration: "15 min", description: "", videoUrl: "", revisionTitle: "", revisionContent: "" }));
      setQuestions([blankQuestion()]); await refresh(); setTab("library"); flash("Lesson saved as a draft. Review it in the library before publishing.");
    } catch (error) { flash(error instanceof Error ? error.message : "Unable to create the lesson."); }
    finally { setSaving(false); }
  };

  const setStatus = async (kind: "Course" | "Lesson", id: string | undefined, status: "draft" | "published" | "archived") => {
    if (!id) return;
    setSaving(true);
    try { await command({ action: `set${kind}Status`, id, status }); await refresh(); flash(`${kind} status changed to ${status}.`); }
    catch (error) { flash(error instanceof Error ? error.message : `Unable to update the ${kind.toLowerCase()}.`); }
    finally { setSaving(false); }
  };

  const lessonCount = useMemo(() => courses.reduce((sum, course) => sum + course.lessons.length, 0), [courses]);
  const updateQuestion = (index: number, patch: Partial<QuizQuestion>) => setQuestions(current => current.map((question, position) => position === index ? { ...question, ...patch } : question));
  const updateOption = (questionIndex: number, optionIndex: number, value: string) => setQuestions(current => current.map((question, position) => position === questionIndex ? { ...question, options: question.options.map((option, optionPosition) => optionPosition === optionIndex ? value : option) } : question));

  return <main className="lms-page admin-page">
    <LmsHeader />
    {notice && <div className="toast" role="status">{notice}</div>}
    <section className="admin-hero"><div><p className="eyebrow">Studacad content admin</p><h1>Build account-backed lessons</h1><p>Draft, review, publish, and archive real course records. Quiz answers remain server-side.</p></div><div className="admin-stats"><div><strong>{courses.length}</strong><span>courses</span></div><div><strong>{lessonCount}</strong><span>lessons</span></div></div></section>
    <div className="admin-tabs" role="tablist"><button className={tab === "lesson" ? "active" : ""} onClick={() => setTab("lesson")}>＋ New lesson</button><button className={tab === "course" ? "active" : ""} onClick={() => setTab("course")}>＋ New course</button><button className={tab === "library" ? "active" : ""} onClick={() => setTab("library")}>Content library</button><Link className="admin-review-link" href="/admin/wallet">Record deposit →</Link><Link className="admin-review-link" href="/admin/tutor-applications">Tutor verification →</Link><Link className="admin-review-link" href="/admin/message-reports">Message reports →</Link><Link className="admin-review-link" href="/admin/payouts">Payouts & refunds →</Link><Link className="admin-review-link" href="/admin/notifications">Notification failures →</Link></div>

    {tab === "course" && <section className="admin-workspace"><div className="form-intro"><span>01</span><div><p className="eyebrow">Create a course</p><h2>Start with a reviewed draft</h2></div></div><form className="admin-form" onSubmit={event => void createCourse(event)}><div className="field-grid"><label>Course title<input required minLength={3} value={courseForm.title} onChange={event => setCourseForm({ ...courseForm, title: event.target.value })} /></label><label>Examination<select value={courseForm.examination} onChange={event => setCourseForm({ ...courseForm, examination: event.target.value as ExamLevel })}><option>PSLE</option><option>JCE</option><option>BGCSE</option></select></label><label>Subject<input required value={courseForm.subject} onChange={event => setCourseForm({ ...courseForm, subject: event.target.value })} /></label><label>Price in credits<input type="number" min="0" required value={courseForm.priceCredits} onChange={event => setCourseForm({ ...courseForm, priceCredits: Number(event.target.value) })} /></label><label>Course color<input type="color" value={courseForm.themeColor} onChange={event => setCourseForm({ ...courseForm, themeColor: event.target.value })} /></label></div><label>Description<textarea required minLength={20} rows={4} value={courseForm.description} onChange={event => setCourseForm({ ...courseForm, description: event.target.value })} /></label><button className="primary" disabled={saving} type="submit">{saving ? "Saving…" : "Save course draft →"}</button></form></section>}

    {tab === "lesson" && <section className="admin-workspace lesson-builder"><div className="form-intro"><span>02</span><div><p className="eyebrow">Lesson builder</p><h2>Private content and server-scored quiz</h2></div></div>{courses.length === 0 ? <div className="empty-state"><strong>Create a course first.</strong><button className="primary" onClick={() => setTab("course")}>Create course</button></div> : <form className="admin-form" onSubmit={event => void createLesson(event)}><div className="field-grid"><label>Add to course<select required value={lessonForm.courseId} onChange={event => setLessonForm({ ...lessonForm, courseId: event.target.value })}>{courses.map(course => <option key={course.databaseId} value={course.databaseId}>{course.examination} · {course.title}</option>)}</select></label><label>Lesson title<input required value={lessonForm.title} onChange={event => setLessonForm({ ...lessonForm, title: event.target.value })} /></label><label>Duration<input required value={lessonForm.duration} onChange={event => setLessonForm({ ...lessonForm, duration: event.target.value })} placeholder="15 min" /></label><label>Tutorial video URL<input type="url" value={lessonForm.videoUrl} onChange={event => setLessonForm({ ...lessonForm, videoUrl: event.target.value })} /></label></div><label>Lesson summary<textarea required minLength={10} rows={3} value={lessonForm.description} onChange={event => setLessonForm({ ...lessonForm, description: event.target.value })} /></label><div className="field-grid"><label>Revision title<input required value={lessonForm.revisionTitle} onChange={event => setLessonForm({ ...lessonForm, revisionTitle: event.target.value })} /></label><label>Private revision content<textarea required rows={4} value={lessonForm.revisionContent} onChange={event => setLessonForm({ ...lessonForm, revisionContent: event.target.value })} /></label></div><div className="builder-divider"><span>Multiple-choice checkpoint</span><button type="button" onClick={() => setQuestions(current => [...current, blankQuestion()])}>＋ Add question</button></div><div className="question-builder">{questions.map((question, questionIndex) => <fieldset key={question.id}><div className="question-toolbar"><strong>Question {questionIndex + 1}</strong>{questions.length > 1 && <button type="button" onClick={() => setQuestions(current => current.filter((_, index) => index !== questionIndex))}>Remove</button>}</div><input required value={question.prompt} onChange={event => updateQuestion(questionIndex, { prompt: event.target.value })} placeholder="Question prompt" />{question.options.map((option, optionIndex) => <label key={optionIndex} className={question.correctIndex === optionIndex ? "correct-option" : ""}><span><input type="radio" name={`correct-${question.id}`} checked={question.correctIndex === optionIndex} onChange={() => updateQuestion(questionIndex, { correctIndex: optionIndex })} /> Correct answer</span><input required value={option} onChange={event => updateOption(questionIndex, optionIndex, event.target.value)} placeholder={`Option ${String.fromCharCode(65 + optionIndex)}`} /></label>)}</fieldset>)}</div><button className="primary publish-button" disabled={saving} type="submit">{saving ? "Saving…" : "Save lesson draft →"}</button></form>}</section>}

    {tab === "library" && <section className="admin-workspace content-library"><div className="form-intro"><span>03</span><div><p className="eyebrow">Content library</p><h2>Review publication state</h2><p>Publish at least one reviewed lesson before its course. Archiving removes content from the learner catalogue without deleting records.</p></div></div>{loading ? <div className="loading-state">Loading content…</div> : <div className="admin-course-list">{courses.map(course => <article key={course.databaseId}><div className="admin-course-head" style={{ borderColor: course.color }}><span>{course.examination}</span><div><h3>{course.title}</h3><p>{course.subject} · {course.price} credits · {course.status}</p></div><div><button disabled={saving || course.status === "published"} onClick={() => void setStatus("Course", course.databaseId, "published")}>Publish</button><button disabled={saving || course.status === "archived"} onClick={() => void setStatus("Course", course.databaseId, "archived")}>Archive</button></div></div>{course.lessons.map(lesson => <div className="admin-lesson-row" key={lesson.databaseId}><span>▶</span><div><strong>{lesson.title}</strong><small>{lesson.duration} · {lesson.status}</small></div><div><button disabled={saving || lesson.status === "published"} onClick={() => void setStatus("Lesson", lesson.databaseId, "published")}>Publish</button><button disabled={saving || lesson.status === "archived"} onClick={() => void setStatus("Lesson", lesson.databaseId, "archived")}>Archive</button></div></div>)}</article>)}</div>}</section>}
  </main>;
}
