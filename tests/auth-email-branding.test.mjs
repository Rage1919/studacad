import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const templatePaths = [
  "supabase/templates/confirm-signup.html",
  "supabase/templates/magic-link.html",
];

test("authentication emails are fully Studacad branded", async () => {
  for (const path of templatePaths) {
    const template = await readFile(new URL(`../${path}`, import.meta.url), "utf8");
    assert.match(template, /Studacad/);
    assert.doesNotMatch(template, /supabase/i);
    assert.match(template, /https:\/\/studacad\.com/);
    assert.match(template, /\{\{ \.RedirectTo \}\}/);
    assert.match(template, /\{\{ \.TokenHash \}\}/);
    assert.match(template, /type=email/);
    assert.doesNotMatch(template, /<script/i);
  }
});

test("authentication email subjects use only Studacad branding", async () => {
  for (const path of [
    "supabase/templates/confirm-signup.subject.txt",
    "supabase/templates/magic-link.subject.txt",
  ]) {
    const subject = await readFile(new URL(`../${path}`, import.meta.url), "utf8");
    assert.match(subject, /Studacad/);
    assert.doesNotMatch(subject, /supabase/i);
  }
});
