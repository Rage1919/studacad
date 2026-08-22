import { access, readFile, readdir } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const appRoot = join(root, "app");
const distClient = join(root, "dist", "client");

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? filesUnder(path) : [path];
    }),
  );
  return nested.flat();
}

const sourceFiles = (await filesUnder(appRoot)).filter((path) =>
  /\.(?:tsx?|jsx?)$/.test(path),
);
const pageFiles = sourceFiles.filter((path) => path.endsWith(`${sep}page.tsx`));

const pageRoute = (path) => {
  const directory = relative(appRoot, dirname(path)).split(sep).join("/");
  return directory ? `/${directory}` : "/";
};

const routePatterns = pageFiles.map((path) => {
  const route = pageRoute(path);
  const pattern = route
    .split("/")
    .map((part) =>
      part.startsWith("[") && part.endsWith("]")
        ? part.startsWith("[[...")
          ? ".*"
          : part.startsWith("[...")
            ? ".+"
            : "[^/]+"
        : part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    )
    .join("/");
  return { path, route, regex: new RegExp(`^${pattern}/?$`) };
});

const sourceByRoute = new Map(
  await Promise.all(
    pageFiles
      .filter((path) => !pageRoute(path).includes("["))
      .map(async (path) => [pageRoute(path), await readFile(path, "utf8")]),
  ),
);

const problems = [];
let checkedLinks = 0;
let checkedAnchors = 0;

for (const path of sourceFiles) {
  const source = await readFile(path, "utf8");
  const currentRoute = path.endsWith(`${sep}page.tsx`) ? pageRoute(path) : null;
  const hrefs = source.matchAll(/\bhref\s*=\s*["']([^"']+)["']/g);
  for (const match of hrefs) {
    const href = match[1];
    if (/^(?:https?:|mailto:|tel:|javascript:)/i.test(href)) continue;
    checkedLinks += 1;

    if (href.startsWith("#")) {
      if (!currentRoute) continue;
      const target = href.slice(1);
      checkedAnchors += 1;
      if (
        target &&
        !new RegExp(
          `\\bid=["']${target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`,
        ).test(source)
      )
        problems.push(
          `${relative(root, path)} points to missing anchor ${href}`,
        );
      continue;
    }

    if (!href.startsWith("/")) continue;
    const parsed = new URL(href, "https://studacad.test");
    const targetRoute = decodeURIComponent(parsed.pathname);
    if (!routePatterns.some(({ regex }) => regex.test(targetRoute)))
      problems.push(
        `${relative(root, path)} points to missing route ${targetRoute}`,
      );

    if (parsed.hash) {
      checkedAnchors += 1;
      const targetSource = sourceByRoute.get(
        targetRoute.replace(/\/$/, "") || "/",
      );
      const id = decodeURIComponent(parsed.hash.slice(1));
      if (
        targetSource &&
        id &&
        !new RegExp(
          `\\bid=["']${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`,
        ).test(targetSource)
      )
        problems.push(
          `${relative(root, path)} points to missing anchor ${href}`,
        );
    }
  }
}

const manifestPaths = [
  join(root, "dist", "server", "__vite_rsc_assets_manifest.js"),
  join(root, "dist", "server", "vinext-client-assets.js"),
];
const referencedAssets = new Set();
for (const manifestPath of manifestPaths) {
  const manifest = await readFile(manifestPath, "utf8");
  for (const match of manifest.matchAll(
    /["']\/?(_next\/static\/(?:chunks|css)\/[^"']+)["']/g,
  ))
    referencedAssets.add(match[1]);
}

for (const asset of referencedAssets) {
  try {
    await access(join(distClient, ...asset.split("/")), constants.R_OK);
  } catch {
    problems.push(`build references missing client asset /${asset}`);
  }
}

if (problems.length) {
  process.stderr.write(`Link integrity failed:\n- ${problems.join("\n- ")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(
    `Link integrity passed (${checkedLinks} static links, ${checkedAnchors} anchors, ${referencedAssets.size} build assets).\n`,
  );
}
