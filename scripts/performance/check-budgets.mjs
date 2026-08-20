import assert from "node:assert/strict";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";

const clientRoot = path.resolve("dist/client");
const shareImage = path.resolve("public/images/studacad-share.jpg");
const budgets = {
  totalJavaScript: 800_000,
  largestJavaScript: 260_000,
  totalCss: 190_000,
  largestCss: 160_000,
  shareImage: 100_000,
};

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const target = path.join(directory, entry.name);
      return entry.isDirectory() ? filesUnder(target) : [target];
    }),
  );
  return nested.flat();
}

const files = await filesUnder(clientRoot);
const sizes = await Promise.all(
  files.map(async (file) => ({ file, bytes: (await stat(file)).size })),
);
const javascript = sizes.filter(({ file }) => /\.(?:js|mjs)$/.test(file));
const css = sizes.filter(({ file }) => file.endsWith(".css"));
const total = (entries) => entries.reduce((sum, entry) => sum + entry.bytes, 0);
const largest = (entries) =>
  Math.max(0, ...entries.map((entry) => entry.bytes));
const measured = {
  totalJavaScript: total(javascript),
  largestJavaScript: largest(javascript),
  totalCss: total(css),
  largestCss: largest(css),
  shareImage: (await stat(shareImage)).size,
};

for (const [name, limit] of Object.entries(budgets))
  assert.ok(
    measured[name] <= limit,
    `${name} is ${measured[name]} bytes; budget is ${limit} bytes`,
  );

console.log(
  `Performance budgets passed: JS ${measured.totalJavaScript}/${budgets.totalJavaScript}, CSS ${measured.totalCss}/${budgets.totalCss}, largest JS ${measured.largestJavaScript}/${budgets.largestJavaScript}, share image ${measured.shareImage}/${budgets.shareImage} bytes.`,
);
