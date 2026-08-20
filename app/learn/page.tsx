"use client";

import Link from "next/link";
import { useState } from "react";
import { LmsHeader } from "../components/LmsHeader";
import { useLms } from "../components/LmsProvider";
import { credit } from "../lib/lms";

export default function LearningHub() {
  const { courses, purchasedCourseIds, completedLessonIds, quizScores, purchaseCourse, credits, ready, learningError } = useLms();
  const [notice, setNotice] = useState("");
  const [purchasing, setPurchasing] = useState("");
  const purchased = courses.filter(course => purchasedCourseIds.includes(course.id));
  const discover = courses.filter(course => !purchasedCourseIds.includes(course.id));
  const totalLessons = purchased.reduce((sum, course) => sum + course.lessons.length, 0);
  const completedCount = completedLessonIds.filter(id => purchased.some(course => course.lessons.some(lesson => lesson.id === id))).length;

  const buy = async (courseId: string) => {
    setPurchasing(courseId);
    const result = await purchaseCourse(courseId);
    setNotice(result.message);
    setPurchasing("");
    window.setTimeout(() => setNotice(""), 3500);
  };

  return (
    <main className="lms-page">
      <LmsHeader current="learn" />
      {notice && <div className="toast" role="status">{notice}</div>}
      {!ready && <div className="loading-state">Loading your learning library…</div>}
      {learningError && <div className="empty-state"><strong>Learning data is temporarily unavailable.</strong><p>{learningError}</p></div>}
      <section className="lms-hero">
        <div><p className="eyebrow">My Studacad</p><h1>Your exam prep dashboard</h1><p>Book subject support, watch syllabus-focused tutorials, download revision papers, and check your understanding after every lesson.</p></div>
        <div className="learning-stats">
          <div><strong>{completedCount}/{totalLessons || 0}</strong><span>lessons complete</span></div>
          <div><strong>{Object.values(quizScores).length ? Math.round(Object.values(quizScores).reduce((a, b) => a + b, 0) / Object.values(quizScores).length) : 0}%</strong><span>average score</span></div>
          <div><strong>{credits}</strong><span>credits available</span></div>
        </div>
      </section>

      <section className="lms-section">
        <div className="lms-section-heading"><div><p className="eyebrow">My library</p><h2>Continue learning</h2></div><Link className="outline" href="/wallet">Top up wallet</Link></div>
        <div className="course-grid">
          {purchased.map(course => {
            const done = course.lessons.filter(lesson => completedLessonIds.includes(lesson.id)).length;
            const percent = course.lessons.length ? Math.round(done / course.lessons.length * 100) : 0;
            return <article className="course-card owned" key={course.id} style={{ "--course-color": course.color } as React.CSSProperties}>
              <div className="course-banner"><span>{course.examination} · {course.subject}</span></div>
              <div className="course-body"><p className="course-author">With {course.instructor}</p><h3>{course.title}</h3><p>{course.description}</p><div className="progress-row"><span><b>{done}</b> of {course.lessons.length} lessons</span><strong>{percent}%</strong></div><div className="progress-track"><i style={{ width: `${percent}%` }} /></div>
                <div className="lesson-list">{course.lessons.map((lesson, index) => <Link key={lesson.id} href={`/lesson?course=${course.id}&lesson=${lesson.id}`}><span className={completedLessonIds.includes(lesson.id) ? "lesson-status complete" : "lesson-status"}>{completedLessonIds.includes(lesson.id) ? "✓" : index + 1}</span><span><strong>{lesson.title}</strong><small>{lesson.duration}{quizScores[lesson.id] !== undefined ? ` · Best score ${quizScores[lesson.id]}%` : ""}</small></span><b>→</b></Link>)}</div>
              </div>
            </article>;
          })}
        </div>
      </section>

      <section className="lms-section discover-section">
        <div className="lms-section-heading"><div><p className="eyebrow">Revision marketplace</p><h2>Add an exam prep course</h2></div><p>Purchase once with credits. Every tutorial, paper, and test stays in the same Studacad account.</p></div>
        <div className="course-grid discover-grid">
          {discover.map(course => <article className="course-card" key={course.id} style={{ "--course-color": course.color } as React.CSSProperties}>
            <div className="course-banner"><span>{course.examination} · {course.subject}</span></div>
            <div className="course-body"><p className="course-author">{course.lessons.length} lessons · With {course.instructor}</p><h3>{course.title}</h3><p>{course.description}</p><div className="course-purchase"><strong>{credit(course.price)}</strong><button onClick={() => void buy(course.id)} disabled={credits < course.price || purchasing === course.id}>{credits < course.price ? "Top up to unlock" : purchasing === course.id ? "Purchasing…" : "Buy course"}</button></div></div>
          </article>)}
          {discover.length === 0 && <div className="empty-state"><strong>Your library is full.</strong><p>You own every course currently available.</p></div>}
        </div>
      </section>
    </main>
  );
}
