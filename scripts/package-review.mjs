import { cp, mkdir, readdir } from "node:fs/promises";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";

const destination = resolve("artifacts", `review-${Date.now()}`);
const source = join(destination, "raees-atelier");
await mkdir(source, { recursive: true });

const entries = [
  ".env.example", ".gitignore", "README.md", "package.json", "package-lock.json",
  "wrangler.jsonc", "wrangler.production.jsonc", "drizzle.config.js",
  "db", "docs", "drizzle", "public", "server", "tests",
  "research/PAGE-INVENTORY.md",
];
for (const entry of entries) {
  await cp(resolve(entry), join(source, entry), {
    recursive: true,
    filter: (path) => !path.endsWith("axe.min.js"),
  });
}
await mkdir(join(source, "scripts"));
for (const file of await readdir("scripts")) {
  if (file.endsWith(".mjs")) await cp(join("scripts", file), join(source, "scripts", file));
}

const archive = join(destination, "raees-atelier-source.tar.gz");
const result = spawnSync("tar", ["-czf", archive, "-C", destination, "raees-atelier"], {
  stdio: "inherit",
});
if (result.error) throw result.error;
if (result.status !== 0) throw new Error("Source archive could not be created.");
console.log(`Review source: ${source}`);
console.log(`Source archive: ${archive}`);
