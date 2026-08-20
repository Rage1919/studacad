import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(new URL("..", import.meta.url).pathname.slice(1));

async function sourceFiles(directory) {
  const entries = await readdir(path.join(root, directory), {
    withFileTypes: true,
  });
  const files = await Promise.all(
    entries.map((entry) => {
      const relative = path.join(directory, entry.name);
      return entry.isDirectory() ? sourceFiles(relative) : [relative];
    }),
  );
  return files
    .flat()
    .filter((file) => /\.(?:ts|tsx|mts|mjs|js|jsx)$/.test(file));
}

const read = (relative) => readFile(path.join(root, relative), "utf8");

test("production application code contains no browser-authoritative or fixture-backed state", async () => {
  const files = [
    ...(await sourceFiles("app")),
    ...(await sourceFiles("server")),
  ];
  const forbidden = [
    /localStorage/,
    /sessionStorage/,
    /demoTutors/,
    /findTutor\(/,
    /Math\.random\(/,
    /Demo learner/i,
    /Book a demo/i,
    /how-video-mock/,
    /how-resume-mock/,
  ];
  for (const file of files) {
    const source = await read(file);
    for (const pattern of forbidden)
      assert.doesNotMatch(source, pattern, `${file} contains ${pattern}`);
  }
});

test("public tutor surfaces use approved server records without bundled tutor fixtures", async () => {
  const [types, home, marketplace, profile, repository] = await Promise.all([
    read("app/lib/tutors.ts"),
    read("app/page.tsx"),
    read("app/tutors/page.tsx"),
    read("app/tutor/page.tsx"),
    read("server/tutor-onboarding/repository.ts"),
  ]);
  assert.doesNotMatch(types, /export const tutors|unsplash|mixkit/);
  for (const surface of [home, marketplace, profile])
    assert.match(surface, /\/api\/tutors/);
  assert.match(repository, /public_tutor_marketplace_profiles/);
  assert.doesNotMatch(repository, /years teaching experience|Exam technique/);
  assert.doesNotMatch(profile, /saveLocal|status:\s*["']queued/);
  assert.match(profile, /crypto\.randomUUID\(\)/);
});

test("wallet and learning state starts empty and can be changed only through APIs", async () => {
  const [model, provider, wallet] = await Promise.all([
    read("app/lib/lms.ts"),
    read("app/components/LmsProvider.tsx"),
    read("app/wallet/page.tsx"),
  ]);
  assert.match(model, /credits:\s*0/);
  assert.match(model, /courses:\s*\[\]/);
  assert.match(model, /transactions:\s*\[\]/);
  assert.match(provider, /fetch\(["']\/api\/wallet/);
  assert.match(provider, /fetch\(["']\/api\/lms/);
  assert.match(provider, /fetch\(["']\/api\/referrals/);
  assert.doesNotMatch(provider, /setState\([^)]*credits\s*\+/s);
  assert.match(wallet, /Online deposits are not available yet/);
});

test("development fixtures and static hosting fail closed outside their boundaries", async () => {
  const [seed, protectedPage, login, application] = await Promise.all([
    read("scripts/database/seed-development.mjs"),
    read("app/components/ProtectedPage.tsx"),
    read("app/login/page.tsx"),
    read("app/become-a-tutor/TutorApplicationForm.tsx"),
  ]);
  assert.match(seed, /new Set\(\["development", "test"\]\)/);
  assert.match(seed, /Development seed data may run only/);
  assert.match(protectedPage, /Secure account feature unavailable/);
  assert.match(login, /disabled=\{pending \|\| staticPreview\}/);
  assert.match(application, /disabled=\{pending \|\| staticPreview\}/);
});

test("checked route and action inventory covers every application page", async () => {
  const inventory = await read("docs/release/route-and-action-inventory.md");
  const pages = (await sourceFiles("app"))
    .filter((file) => /page\.tsx$/.test(file))
    .map((file) => {
      const route = file
        .replace(/^app[\\/]/, "")
        .replace(/[\\/]page\.tsx$/, "")
        .replace(/^page\.tsx$/, "");
      return route ? `/${route.replaceAll("\\", "/")}` : "/";
    });
  for (const route of pages)
    assert.ok(
      inventory.includes(`| \`${route}\``),
      `${route} is missing from the inventory`,
    );
});
