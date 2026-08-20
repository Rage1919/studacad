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
