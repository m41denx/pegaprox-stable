import * as esbuild from "esbuild";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(__dirname, "..");
const originalShell = path.join(webRoot, "index.html.original");
const outJs = path.join(webRoot, "public", "legacy-app.js");
const outShell = path.join(webRoot, "public", "legacy-ui-shell.html");

await mkdir(path.dirname(outJs), { recursive: true });

await esbuild.build({
  entryPoints: [path.join(webRoot, "legacy", "legacyEntry.ts")],
  outfile: outJs,
  bundle: true,
  format: "iife",
  platform: "browser",
  target: "es2020",
  jsx: "transform",
  jsxFactory: "React.createElement",
  jsxFragment: "React.Fragment",
  loader: {
    ".js": "jsx",
  },
  banner: {
    js: "var React = window.React; var ReactDOM = window.ReactDOM;",
  },
  logLevel: "info",
  legalComments: "none",
});

let shell = await readFile(originalShell, "utf8");

shell = shell.replace(
  /\)\.then\(function\(\) \{\s*return loadScriptWithFallback\(\s*'https:\/\/cdn\.jsdelivr\.net\/npm\/@babel\/standalone@[^']+',\s*'\/static\/js\/babel\.min\.js',\s*'babel@[^']+'\s*\);\s*\}\)\.then\(function\(\) \{/s,
  ").then(function() {",
);

shell = shell.replace(
  /\}\)\.then\(function\(\) \{\s*\/\/ All libs loaded[^\n]*\n\s*window\.pegaproxLibsReady = true;\s*if \(window\.Babel\) \{[^}]+\}\s*\}\);/s,
  "}).then(function() {\n            window.pegaproxLibsReady = true;\n        });",
);

const marker = "    <!-- PEGAPROX_JSX_INSERT -->";
const idx = shell.indexOf(marker);
if (idx === -1) {
  throw new Error("PEGAPROX_JSX_INSERT not found in index.html.original");
}

const bodyClose = shell.indexOf("</body>", idx);
if (bodyClose === -1) {
  throw new Error("</body> not found after PEGAPROX_JSX_INSERT");
}

shell =
  shell.slice(0, idx) +
  '    <script src="/legacy-app.js"></script>\n\n' +
  shell.slice(bodyClose);

await writeFile(outShell, shell, "utf8");

const st = await stat(outJs);
console.log("legacy-app.js:", st.size, "bytes");
console.log("legacy-ui-shell.html written");
