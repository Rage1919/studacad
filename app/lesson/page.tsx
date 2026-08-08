"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { LmsHeader } from "../components/LmsHeader";
import { useLms } from "../components/LmsProvider";

export default function LessonPage() {
  const { courses, purchasedCourseIds, recordQuiz, completedLessonIds, quizScores } = useLms();
  const [ids, setIds] = useState({ course: "", lesson: "" });
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<number | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setIds({ course: params.get("course") ?? "", lesson: params.get("lesson") ?? "" });
  }, []);

  const course = courses.find(item => item.id === ids.course);
  const lesson = course?.lessons.find(item => item.id === ids.lesson);
  const nextLesson = useMemo(() => {
    if (!course || !lesson) return null;
    return course.lessons[course.lessons.findIndex(item => item.id === lesson.id) + 1] ?? null;
  }, [course, lesson]);

  if (!course || !lesson) return <main className="lms-page"><LmsHeader current="learn" /><div className="loading-state">Loading lesson…</div></main>;
  if (!purchasedCourseIds.includes(course.id)) return <main className="lms-page"><LmsHeader current="learn" /><section className="locked-state"><span>🔒</span><h1>This course is locked.</h1><p>Purchase it with credits from the learning hub to access the lessons and tests.</p><Link className="primary" href="/learn">Return to learning hub</Link></section></main>;

  const downloadPaper = () => {
    if (/^https?:\/\//i.test(lesson.revisionContent)) {
      window.open(lesson.revisionContent, "_blank", "noopener,noreferrer");
      return;
    }
    const blob = new Blob([`${lesson.revisionTitle}\n\n${lesson.revisionContent}`], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${lesson.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-revision.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const submit = () => {
    const correct = lesson.quiz.filter(question => answers[question.id] === question.correctIndex).length;
    const score = Math.round(correct / lesson.quiz.length * 100);
    setResult(score);
    recordQuiz(lesson.id, score);
  };

  return <main className="lms-page lesson-page">
    <LmsHeader current="learn" />
    <div className="lesson-shell">
      <aside className="lesson-sidebar"><Link href="/learn">← My learning</Link><p className="eyebrow">{course.examination} · {course.subject}</p><h2>{course.title}</h2><div className="side-lessons">{course.lessons.map((item, index) => <Link key={item.id} className={item.id === lesson.id ? "active" : ""} href={`/lesson?course=${course.id}&lesson=${item.id}`}><span className={completedLessonIds.includes(item.id) ? "complete" : ""}>{completedLessonIds.includes(item.id) ? "✓" : index + 1}</span><span><strong>{item.title}</strong><small>{item.duration}</small></span></Link>)}</div><Link className="wallet-mini" href="/wallet">◆ Earn 10 credits for passing</Link></aside>
      <article className="lesson-content"><div className="lesson-title"><div><p className="eyebrow">Lesson · {lesson.duration}</p><h1>{lesson.title}</h1><p>{lesson.description}</p></div>{quizScores[lesson.id] !== undefined && <span className="best-score">Best score<strong>{quizScores[lesson.id]}%</strong></span>}</div>
        <div className="video-frame"><iframe src={lesson.videoUrl} title={`${lesson.title} tutorial video`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /><div className="video-fallback"><span>▶</span><p>Tutorial video</p></div></div>
        <section className="revision-card"><span className="paper-icon">▤</span><div><p className="eyebrow">Revision paper</p><h2>{lesson.revisionTitle}</h2><p>Keep the worked reminders and exam-style practice for offline revision.</p></div><button className="outline" onClick={downloadPaper}>{/^https?:\/\//i.test(lesson.revisionContent) ? "Open paper" : "Download paper"} ↓</button></section>
        {!showQuiz ? <section className="quiz-intro"><div><span>Knowledge check</span><h2>Ready to test what you retained?</h2><p>{lesson.quiz.length} multiple-choice questions · Score 70% to pass · Earn 10 credits on your first pass.</p></div><button className="primary" onClick={() => setShowQuiz(true)}>Start checkpoint quiz →</button></section> : <section className="quiz-card" id="quiz"><p className="eyebrow">Lesson checkpoint</p><h2>Show what you remember.</h2>{lesson.quiz.map((question, questionIndex) => <fieldset key={question.id}><legend><span>{questionIndex + 1}</span>{question.prompt}</legend>{question.options.map((option, index) => <label key={option} className={answers[question.id] === index ? "selected" : ""}><input type="radio" name={question.id} checked={answers[question.id] === index} onChange={() => setAnswers(current => ({ ...current, [question.id]: index }))} /><i>{String.fromCharCode(65 + index)}</i><span>{option}</span></label>)}</fieldset>)}{result === null ? <button className="primary submit-quiz" disabled={Object.keys(answers).length !== lesson.quiz.length} onClick={submit}>Submit answers →</button> : <div className={`quiz-result ${result >= 70 ? "pass" : "retry"}`}><span>{result >= 70 ? "✓" : "↻"}</span><div><p>{result >= 70 ? "Lesson passed" : "Keep practising"}</p><h3>{result}% score</h3><small>{result >= 70 ? "You retained the key ideas. Your lesson is complete." : "Review the video and paper, then try again."}</small></div>{result < 70 ? <button onClick={() => { setResult(null); setAnswers({}); }}>Try again</button> : nextLesson ? <Link href={`/lesson?course=${course.id}&lesson=${nextLesson.id}`}>Next lesson →</Link> : <Link href="/learn">Back to hub →</Link>}</div>}</section>}
      </article>
    </div>
  </main>;
}
