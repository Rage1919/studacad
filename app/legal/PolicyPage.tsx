import Link from "next/link";
import { StudacadFooter } from "../components/StudacadFooter";
import "./legal.css";
export type Policy = {
  title: string;
  summary: string;
  sections: Array<{ heading: string; body: string[] }>;
};
export function PolicyPage({ policy }: { policy: Policy }) {
  return (
    <>
      <main className="legal-page">
        <nav>
          <Link href="/">Studacad</Link>
          <Link href="/help">Help centre</Link>
        </nav>
        <header>
          <p className="eyebrow">
            Effective 20 August 2026 · version 2026-08-20
          </p>
          <h1>{policy.title}</h1>
          <p>{policy.summary}</p>
        </header>
        <aside>
          This document describes the Studacad service as implemented. For
          urgent safety concerns, use the safety report route and contact
          Botswana emergency services where there is imminent danger.
        </aside>
        {policy.sections.map((section) => (
          <section key={section.heading}>
            <h2>{section.heading}</h2>
            {section.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </section>
        ))}
        <section>
          <h2>Questions and review</h2>
          <p>
            Contact support and select the most relevant category. Policy
            changes receive a new version and effective date. The policy
            register is reviewed at least every six months and after material
            product, processor, or legal changes.
          </p>
          <p>
            <Link href="/contact">Contact Studacad support →</Link>
          </p>
        </section>
      </main>
      <StudacadFooter />
    </>
  );
}
