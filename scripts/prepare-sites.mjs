import { copyFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const distServer = resolve("dist", "server");
const distMeta = resolve("dist", ".openai");

mkdirSync(distServer, { recursive: true });
mkdirSync(distMeta, { recursive: true });
copyFileSync(resolve(".openai", "hosting.json"), resolve(distMeta, "hosting.json"));
