"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { LmsHeader } from "../components/LmsHeader";
import { useLms } from "../components/LmsProvider";
import { Course, ExamLevel, Lesson, QuizQuestion } from "../lib/lms";

const blankQuestion = (): QuizQuestion => ({ id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, prompt: "", options: ["", "", "", ""], correctIndex: 0 });
const slug = (value: string) => `${value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${Date.now().toString().slice(-5)}`;

export default function AdminPage() {
  const { courses, addCourse, addLesson, resetDemo } = useLms();
  const [tab, setTab] = useState<"lesson" | "course" | "library">("lesson");
  const [notice, setNotice] = useState("");
  const [courseForm, setCourseForm] = useState({ title: "", examination: "PSLE" as ExamLevel, subject: "Mathematics", description: "", instructor: "", price: 120, color: "#dbeafe" });
  const [lessonForm, setLessonForm] = useState({ courseId: courses[0]?.id ?? "", title: "", duration: "15 min", description: "", videoUrl: "https://www.youtube.com/embed/PSqbQXy8oq0", revisionTitle: "", revisionContent: "" });
  const [questions, setQuestions] = useState<QuizQuestion[]>([blankQuestion()]);

  const flash = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(""), 4000); };

  const createCourse = (event: FormEvent) => {
    event.preventDefault();
    const course: Course = { ...courseForm, id: slug(courseForm.title), price: Number(courseForm.price), lessons: [] };
    addCourse(course);
    setLessonForm(current => ({ ...current, courseId: course.id }));
    setCourseForm({ title: "", examination: "PSLE", subject: "Mathematics", description: "", instructor: "", price: 120, color: "#dbeafe" });
    setTab("lesson");
    flash(`${course.title} created. Add its first lesson now.`);
  };

  const updateQuestion = (questionIndex: number, patch: Partial<QuizQuestion>) => setQuestions(current => current.map((question, index) => index === questionIndex ? { ...question, ...patch } : question));
  const updateOption = (questionIndex: number, optionIndex: number, value: string) => setQuestions(current => current.map((question, index) => index === questionIndex ? { ...question, options: question.options.map((option, i) => i === optionIndex ? value : option) } : question));

  const createLesson = (event: FormEvent) => {
    event.preventDefault();
    if (!lessonForm.courseId || questions.some(question => !question.prompt || question.options.some(option => !option))) {
      flash("Complete the lesson and every quiz option before publishing.");
      return;
    }
    const lesson: Lesson = { ...lessonForm, id: slug(lessonForm.title), quiz: questions };
    addLesson(lessonForm.courseId, lesson);
    setLessonForm(current => ({ ...current, title: "", duration: "15 min", description: "", revisionTitle: "", revisionContent: "" }));
    setQuestions([blankQuestion()]);
    flash(`${lesson.title} published with ${lesson.quiz.length} quiz question${lesson.quiz.length === 1 ? "" : "s"}.`);
  };

  const lessonCount = courses.reduce((sum, course) => sum + course.lessons.length, 0);
  const questionCount = courses.reduce((sum, course) => sum + course.lessons.reduce((lessonSum, lesson) => lessonSum + lesson.quiz.length, 0), 0);

  return <main className="lms-page admin-page">
    <LmsHeader />
    {notice && <div className="toast" role="status">{notice}</div>}
    <section className="admin-hero"><div><p className="eyebrow">Studacad content admin</p><h1>Build exam ready lessons</h1><p>Add PSLE, JCE, and BGCSE tutorial videos, revision papers, and end-of-lesson multiple-choice tests from one workspace.</p></div><div className="admin-stats"><div><strong>{courses.length}</strong><span>courses</span></div><div><strong>{lessonCount}</strong><span>lessons</span></div><div><strong>{questionCount}</strong><span>quiz questions</span></div></div></section>
    <div className="admin-tabs" role="tablist"><button className={tab === "lesson" ? "active" : ""} onClick={() => setTab("lesson")}>＋ New lesson</button><button className={tab === "course" ? "active" : ""} onClick={() => setTab("course")}>＋ New course</button><button className={tab === "library" ? "active" : ""} onClick={() => setTab("library")}>Content library</button><Link className="admin-review-link" href="/admin/tutor-applications">Tutor verification →</Link></div>

    {tab === "course" && <section className="admin-workspace"><div className="form-intro"><span>01</span><div><p className="eyebrow">Create a course</p><h2>Set up the exam learning path</h2><p>Learners purchase the course once with credits and receive every tutorial, revision paper, and test you publish inside it.</p></div></div><form className="admin-form" onSubmit={createCourse}><div className="field-grid"><label>Course title<input required value={courseForm.title} onChange={e => setCourseForm({ ...courseForm, title: e.target.value })} placeholder="e.g. BGCSE Physics Paper Skills" /></label><label>Instructor<input required value={courseForm.instructor} onChange={e => setCourseForm({ ...courseForm, instructor: e.target.value })} placeholder="Tutor name" /></label><label>Examination<select value={courseForm.examination} onChange={e => setCourseForm({ ...courseForm, examination: e.target.value as ExamLevel })}><option>PSLE</option><option>JCE</option><option>BGCSE</option></select></label><label>Subject<input required value={courseForm.subject} onChange={e => setCourseForm({ ...courseForm, subject: e.target.value })} placeholder="e.g. Mathematics" /></label><label>Price in credits<input type="number" min="1" required value={courseForm.price} onChange={e => setCourseForm({ ...courseForm, price: Number(e.target.value) })} /></label><label>Course color<input type="color" value={courseForm.color} onChange={e => setCourseForm({ ...courseForm, color: e.target.value })} /></label></div><label>Description<textarea required rows={4} value={courseForm.description} onChange={e => setCourseForm({ ...courseForm, description: e.target.value })} placeholder="Which Botswana examination skills will students master?" /></label><button className="primary" type="submit">Create course →</button></form></section>}

    {tab === "lesson" && <section className="admin-workspace lesson-builder"><div className="form-intro"><span>02</span><div><p className="eyebrow">Lesson builder</p><h2>Video, revision, retention</h2><p>Publish a complete Botswana exam-preparation unit with a tutorial, downloadable revision material, and a scored quiz.</p></div></div><form className="admin-form" onSubmit={createLesson}><div className="field-grid"><label>Add to course<select required value={lessonForm.courseId} onChange={e => setLessonForm({ ...lessonForm, courseId: e.target.value })}>{courses.map(course => <option key={course.id} value={course.id}>{course.examination} · {course.subject} · {course.title}</option>)}</select></label><label>Lesson title<input required value={lessonForm.title} onChange={e => setLessonForm({ ...lessonForm, title: e.target.value })} placeholder="e.g. Interpret motion graphs" /></label><label>Duration<input required value={lessonForm.duration} onChange={e => setLessonForm({ ...lessonForm, duration: e.target.value })} placeholder="15 min" /></label><label>Tutorial video URL<input required type="url" value={lessonForm.videoUrl} onChange={e => setLessonForm({ ...lessonForm, videoUrl: e.target.value })} placeholder="YouTube embed URL" /></label></div><label>Lesson summary<textarea required rows={3} value={lessonForm.description} onChange={e => setLessonForm({ ...lessonForm, description: e.target.value })} placeholder="Which syllabus outcome and exam skill will the learner practise?" /></label><div className="builder-divider"><span>Revision paper</span></div><div className="field-grid"><label>Paper title<input required value={lessonForm.revisionTitle} onChange={e => setLessonForm({ ...lessonForm, revisionTitle: e.target.value })} placeholder="Lesson revision sheet" /></label><label>Paper URL or revision notes<textarea required rows={4} value={lessonForm.revisionContent} onChange={e => setLessonForm({ ...lessonForm, revisionContent: e.target.value })} placeholder="Paste a PDF URL, or write exam-focused notes learners can download." /></label></div><div className="builder-divider"><span>Multiple-choice checkpoint</span><button type="button" onClick={() => setQuestions(current => [...current, blankQuestion()])}>＋ Add question</button></div><div className="question-builder">{questions.map((question, questionIndex) => <fieldset key={question.id}><div className="question-toolbar"><strong>Question {questionIndex + 1}</strong>{questions.length > 1 && <button type="button" onClick={() => setQuestions(current => current.filter((_, index) => index !== questionIndex))}>Remove</button>}</div><label>Question<input required value={question.prompt} onChange={e => updateQuestion(questionIndex, { prompt: e.target.value })} placeholder="What should the learner remember?" /></label><div className="option-grid">{question.options.map((option, optionIndex) => <label key={optionIndex} className={question.correctIndex === optionIndex ? "correct-option" : ""}><span><input type="radio" name={`correct-${question.id}`} checked={question.correctIndex === optionIndex} onChange={() => updateQuestion(questionIndex, { correctIndex: optionIndex })} /> Correct answer</span><input required value={option} onChange={e => updateOption(questionIndex, optionIndex, e.target.value)} placeholder={`Option ${String.fromCharCode(65 + optionIndex)}`} /></label>)}</div></fieldset>)}</div><button className="primary publish-button" type="submit">Publish lesson and test →</button></form></section>}

    {tab === "library" && <section className="admin-workspace content-library"><div className="form-intro"><span>03</span><div><p className="eyebrow">Content library</p><h2>Everything published</h2><p>Review the current PSLE, JCE, and BGCSE course structure, resources, and assessment counts.</p></div></div><div className="admin-course-list">{courses.map(course => <article key={course.id}><div className="admin-course-head" style={{ borderColor: course.color }}><span>{course.examination}</span><div><h3>{course.title}</h3><p>{course.subject} · {course.price} credits · {course.instructor}</p></div><strong>{course.lessons.length} lessons</strong></div>{course.lessons.map(lesson => <div className="admin-lesson-row" key={lesson.id}><span>▶</span><div><strong>{lesson.title}</strong><small>{lesson.duration} · {lesson.revisionTitle}</small></div><b>{lesson.quiz.length} MCQ</b></div>)}</article>)}</div><button className="reset-demo" onClick={() => { if (window.confirm("Reset all demo content, credits, purchases, and scores?")) { resetDemo(); flash("Demo data reset."); } }}>Reset demo data</button></section>}
  </main>;
}
