import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (relative) => readFile(path.join(root, relative), "utf8");

async function listCssFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return listCssFiles(entryPath);
      return entry.name.endsWith(".css") ? [entryPath] : [];
    }),
  );
  return files.flat();
}

const publicMetadataFiles = [
  "app/layout.tsx",
  "app/accessibility/layout.tsx",
  "app/become-a-tutor/page.tsx",
  "app/cancellation-refunds/layout.tsx",
  "app/community-guidelines/layout.tsx",
  "app/cookies/layout.tsx",
  "app/courses/page.tsx",
  "app/help/layout.tsx",
  "app/how-it-works/layout.tsx",
  "app/privacy/layout.tsx",
  "app/safety/layout.tsx",
  "app/terms/layout.tsx",
  "app/tutor-agreement/layout.tsx",
  "app/tutors/layout.tsx",
];

test("public routes have unique canonical social metadata and private routes fail closed", async () => {
  const sources = await Promise.all(publicMetadataFiles.map(read));
  const paths = sources.flatMap((source) =>
    [...source.matchAll(/path:\s*"([^"]+)"/g)].map((match) => match[1]),
  );
  const titles = sources.flatMap((source) =>
    [...source.matchAll(/title:\s*"([^"]+)"/g)].map((match) => match[1]),
  );
  assert.equal(new Set(paths).size, publicMetadataFiles.length);
  assert.equal(new Set(titles).size, publicMetadataFiles.length);
  const [seo, robots, sitemap] = await Promise.all([
    read("app/lib/seo.ts"),
    read("app/robots.ts"),
    read("app/sitemap.ts"),
  ]);
  assert.match(seo, /studacad\.com/);
  assert.match(seo, /summary_large_image/);
  assert.match(seo, /index:\s*false/);
  for (const privateRoute of [
    "/account",
    "/admin",
    "/bookings",
    "/messages",
    "/wallet",
  ])
    assert.ok(robots.includes(`"${privateRoute}"`));
  assert.match(sitemap, /listPublicTutorSeoProfiles/);
  assert.match(sitemap, /listPublicCourses/);
});

test("structured data and stable public URLs use authoritative records", async () => {
  const [catalog, course, tutor, home, marketplace] = await Promise.all([
    read("server/seo/catalog.ts"),
    read("app/courses/[slug]/page.tsx"),
    read("app/tutors/[slug]/page.tsx"),
    read("app/page.tsx"),
    read("app/tutors/page.tsx"),
  ]);
  assert.match(catalog, /eq\("status", "published"\)/);
  assert.match(catalog, /public_tutor_marketplace_profiles/);
  assert.match(course, /"@type": "Course"/);
  assert.match(tutor, /"@type": "Person"/);
  for (const source of [home, marketplace])
    assert.doesNotMatch(source, /\/tutor\?id=/);
  assert.match(await read("app/tutor/layout.tsx"), /privateMetadata/);
});

test("public media, dialogs, motion, and landmark source meet the enforced accessibility boundary", async () => {
  const appSources = await Promise.all([
    read("app/page.tsx"),
    read("app/tutor/page.tsx"),
    read("app/tutors/page.tsx"),
    read("app/favourites/page.tsx"),
    read("app/become-a-tutor/page.tsx"),
  ]);
  for (const source of appSources) {
    const images = source.match(/<img[\s\S]*?\/>/g) ?? [];
    for (const image of images) {
      assert.match(image, /width=/);
      assert.match(image, /height=/);
    }
  }
  const [layout, globalCss, dialogHook] = await Promise.all([
    read("app/layout.tsx"),
    read("app/globals.css"),
    read("app/lib/useDialogFocus.ts"),
  ]);
  assert.match(layout, /className="skip-link"/);
  assert.match(layout, /id="main-content"/);
  assert.match(globalCss, /prefers-reduced-motion:\s*reduce/);
  assert.match(dialogHook, /event\.key === "Escape"/);
  assert.match(dialogHook, /previous\?\.focus\(\)/);
});

test("analytics is absent and the build enforces public asset budgets", async () => {
  const [layout, packageJson, budget, operations] = await Promise.all([
    read("app/layout.tsx"),
    read("package.json"),
    read("scripts/performance/check-budgets.mjs"),
    read("docs/operations/seo-accessibility-performance.md"),
  ]);
  assert.doesNotMatch(
    layout,
    /google-analytics|googletagmanager|segment|mixpanel|posthog/i,
  );
  assert.match(packageJson, /check-budgets\.mjs/);
  assert.match(budget, /totalJavaScript:\s*800_000/);
  assert.match(operations, /never account IDs/);
});

test("platform typography uses the shared tracking scale", async () => {
  const cssFiles = await listCssFiles(path.join(root, "app"));
  const rawDeclarations = [];

  for (const cssFile of cssFiles) {
    const source = await readFile(cssFile, "utf8");
    for (const match of source.matchAll(/letter-spacing:\s*([^;]+);/g)) {
      const value = match[1].trim();
      if (!value.startsWith("var(")) {
        rawDeclarations.push(
          `${path.relative(root, cssFile).replaceAll("\\", "/")}:${value}`,
        );
      }
    }
  }

  assert.deepEqual(rawDeclarations.sort(), [
    "app/globals.css:3px",
    "app/globals.css:5px",
    "app/lms.css:4px",
  ]);

  const globalCss = await read("app/globals.css");
  for (const token of [
    "--tracking-normal",
    "--tracking-heading",
    "--tracking-label",
    "--tracking-eyebrow",
  ]) {
    assert.match(globalCss, new RegExp(`${token}:`));
  }
});
