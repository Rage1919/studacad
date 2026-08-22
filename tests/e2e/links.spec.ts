import { expect, test } from "@playwright/test";

const publicRoutes = [
  "/",
  "/accessibility",
  "/become-a-tutor",
  "/cancellation-refunds",
  "/community-guidelines",
  "/cookies",
  "/courses",
  "/help",
  "/how-it-works",
  "/login",
  "/privacy",
  "/register",
  "/safety",
  "/terms",
  "/tutor-agreement",
  "/tutors",
];

test("every public page and its rendered internal links resolve", async ({
  page,
  request,
}) => {
  const targets = new Set<string>();
  const missingAssets: string[] = [];
  page.on("response", (response) => {
    const url = new URL(response.url());
    if (
      response.status() >= 400 &&
      (url.pathname.startsWith("/_next/") ||
        url.pathname.startsWith("/images/"))
    )
      missingAssets.push(`${response.status()} ${url.pathname}`);
  });

  for (const route of publicRoutes) {
    const response = await page.goto(route);
    expect(response?.status(), route).toBeLessThan(400);
    const hrefs = await page
      .locator("a[href]")
      .evaluateAll((links) =>
        links.map(
          (link) => (link as HTMLAnchorElement).getAttribute("href") ?? "",
        ),
      );
    for (const href of hrefs) {
      if (!href || /^(?:mailto:|tel:|javascript:)/i.test(href)) continue;
      const url = new URL(href, page.url());
      if (url.origin !== new URL(page.url()).origin) continue;
      if (url.hash && url.pathname === new URL(page.url()).pathname) {
        expect(
          await page.locator(`[id="${url.hash.slice(1)}"]`).count(),
          `${route} -> ${href}`,
        ).toBeGreaterThan(0);
      }
      targets.add(`${url.pathname}${url.search}`);
    }
  }

  for (const target of targets) {
    const response = await request.get(target);
    expect(response.status(), target).toBeLessThan(400);
  }
  expect(missingAssets).toEqual([]);
});

test("authentication and primary navigation links work as real clicks", async ({
  page,
}) => {
  const missingAssets: string[] = [];
  page.on("response", (response) => {
    const url = new URL(response.url());
    if (response.status() >= 400 && url.pathname.startsWith("/_next/"))
      missingAssets.push(`${response.status()} ${url.pathname}`);
  });

  await page.goto("/");
  await page.getByRole("link", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole("heading", { name: "Sign in to Studacad" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Create an account" }).click();
  await expect(page).toHaveURL(/\/register$/);
  await expect(
    page.getByRole("heading", { name: "Register for Studacad" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect(missingAssets).toEqual([]);
});

test("same-page navigation links reach their named sections", async ({
  page,
}) => {
  await page.goto("/how-it-works");
  await page.getByRole("link", { name: "Learner journey" }).click();
  await expect(page).toHaveURL(/#journey$/);
  await expect(page.locator("#journey")).toBeInViewport();

  await page.goto("/");
  await page.getByRole("link", { name: "See how it works" }).click();
  await expect(page).toHaveURL(/#how$/);
  await expect(page.locator("#how")).toBeInViewport();
});
