import { build, transform } from "esbuild";
import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
await mkdir("dist/server", { recursive: true });
await cp("public", "dist/client", {
  recursive: true,
  filter: (path) =>
    !path.includes("__qa") &&
    !path.endsWith("qa-runner.js") &&
    !path.endsWith("axe.min.js"),
});
await build({
  entryPoints: ["server/index.js"],
  bundle: true,
  format: "esm",
  platform: "neutral",
  target: "es2022",
  outfile: "dist/server/index.js",
  minify: true,
});
await build({
  entryPoints: ["public/app.js"],
  bundle: true,
  format: "esm",
  target: "es2022",
  outfile: "dist/client/app.js",
  minify: true,
});
const css = await transform(await readFile("public/style.css", "utf8"), {
  loader: "css",
  minify: true,
});
await writeFile("dist/client/style.css", css.code);
console.log("Built frontend assets and server bundle.");
