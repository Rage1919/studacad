import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("authentication entry points use full-page links on the Sites runtime", async () => {
  const [accountNav, login, register] = await Promise.all([
    read("app/components/AccountNav.tsx"),
    read("app/login/page.tsx"),
    read("app/register/page.tsx"),
  ]);

  assert.doesNotMatch(accountNav, /from ["']next\/link["']/);
  assert.match(accountNav, /<a className=\{className\} href="\/login">/);
  assert.match(accountNav, /href="\/register"/);
  assert.match(accountNav, /href="\/account"/);

  assert.doesNotMatch(login, /from ["']next\/link["']/);
  assert.match(login, /<a href="\/register">Create an account<\/a>/);
  assert.doesNotMatch(register, /from ["']next\/link["']/);
  assert.match(register, /<a href="\/login">Log in<\/a>/);
});
