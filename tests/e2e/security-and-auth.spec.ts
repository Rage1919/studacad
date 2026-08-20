import { expect, test } from "@playwright/test";

test("public pages return the production security envelope", async ({
  request,
}) => {
  const response = await request.get("/");
  expect(response.ok()).toBeTruthy();
  expect(response.headers()["content-security-policy"]).toContain(
    "frame-ancestors 'none'",
  );
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response.headers()["x-frame-options"]).toBe("DENY");
  expect(response.headers()["referrer-policy"]).toBe(
    "strict-origin-when-cross-origin",
  );
  expect(response.headers()["x-request-id"]).toBeTruthy();
});

test("email-link sign-in uses a neutral response", async ({ page }) => {
  await page.route("**/api/auth/email", (route) =>
    route.fulfill({
      status: 202,
      contentType: "application/json",
      body: JSON.stringify({
        message:
          "If that address can receive mail, a secure sign-in link is on its way.",
      }),
    }),
  );
  await page.goto("/login");
  await page.getByLabel("Email address").fill("learner@example.test");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Email me a secure link" }).click();
  await expect(page.getByRole("status")).toContainText(
    "If that address can receive mail",
  );
});

test("a fresh marketplace shows an honest empty state", async ({ page }) => {
  await page.route("**/api/tutors", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ tutors: [] }),
    }),
  );
  await page.goto("/tutors");
  await expect(
    page.getByRole("heading", {
      name: "No approved tutors match every filter",
    }),
  ).toBeVisible();
  await expect(page.getByText("Demo learner", { exact: false })).toHaveCount(0);
});

test("keyboard navigation reaches content and the tutor-search dialog restores focus", async ({
  page,
}) => {
  await page.route("**/api/tutors", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ tutors: [] }),
    }),
  );
  await page.goto("/");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to main content" });
  await expect(skip).toBeFocused();
  await skip.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();

  const opener = page.getByRole("button", { name: "Find a subject tutor" });
  await opener.click();
  const dialog = page.getByRole("dialog", {
    name: "Which subject needs support?",
  });
  await expect(dialog).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Close tutor search" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
});

test("public homepage stays within local layout-shift and load guardrails", async ({
  page,
}) => {
  await page.route("**/api/tutors", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ tutors: [] }),
    }),
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    const measuredWindow = window as Window & { __studacadCls?: number };
    measuredWindow.__studacadCls = 0;
    new PerformanceObserver((list) => {
      for (const item of list.getEntries()) {
        const entry = item as PerformanceEntry & {
          hadRecentInput: boolean;
          value: number;
        };
        if (!entry.hadRecentInput)
          measuredWindow.__studacadCls =
            (measuredWindow.__studacadCls ?? 0) + entry.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
  await page.goto("/");
  await page.waitForTimeout(750);
  const metrics = await page.evaluate(() => {
    const measuredWindow = window as Window & { __studacadCls?: number };
    const navigation = performance.getEntriesByType(
      "navigation",
    )[0] as PerformanceNavigationTiming;
    const paints = performance.getEntriesByType("largest-contentful-paint");
    return {
      cls: measuredWindow.__studacadCls ?? 0,
      lcp: paints.at(-1)?.startTime ?? 0,
      responseStart: navigation?.responseStart ?? 0,
      animationDuration: getComputedStyle(
        document.querySelector(".brand-mark") ?? document.body,
      ).animationDuration,
    };
  });
  expect(metrics.cls).toBeLessThanOrEqual(0.1);
  expect(metrics.lcp).toBeLessThanOrEqual(4_000);
  expect(metrics.responseStart).toBeLessThanOrEqual(1_500);
  expect(["0.01ms", "0.00001s", "1e-05s"]).toContain(metrics.animationDuration);
});

test("oversized API requests fail before route execution", async ({
  request,
}) => {
  const response = await request.post("/api/auth/email", {
    headers: {
      Origin: "https://studacad.test",
      "Content-Type": "application/json",
      "X-Forwarded-For": "198.51.100.21",
    },
    data: { email: `${"a".repeat(140_000)}@example.test` },
  });
  expect(response.status()).toBe(413);
  expect(await response.json()).toEqual({
    error: "Request body is too large.",
  });
});

test("sensitive sign-in requests are rate limited", async ({ request }) => {
  const headers = {
    Origin: "https://studacad.test",
    "Content-Type": "application/json",
    "X-Forwarded-For": "198.51.100.22",
  };
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await request.post("/api/auth/email", {
      headers,
      data: {},
    });
    expect(response.status()).toBe(400);
  }
  const limited = await request.post("/api/auth/email", { headers, data: {} });
  expect(limited.status()).toBe(429);
  expect(Number(limited.headers()["retry-after"])).toBeGreaterThan(0);
});
