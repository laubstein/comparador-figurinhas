const fs = require("fs");
const crypto = require("crypto");
const path = require("path");

const root = __dirname;
const dist = path.join(root, "dist");

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");
const js = fs.readFileSync(path.join(root, "app.js"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const minifiedCss = minifyCss(css);
const minifiedJs = minifyJs(js);
const cssFile = `styles.${contentHash(minifiedCss)}.min.css`;
const jsFile = `app.${contentHash(minifiedJs)}.min.js`;

fs.writeFileSync(path.join(dist, cssFile), minifiedCss);
fs.writeFileSync(path.join(dist, jsFile), minifiedJs);
fs.writeFileSync(path.join(dist, "LICENSE"), fs.readFileSync(path.join(root, "LICENSE"), "utf8"));
fs.mkdirSync(path.join(dist, "assets"), { recursive: true });
fs.copyFileSync(path.join(root, "assets", "favicon.svg"), path.join(dist, "assets", "favicon.svg"));

const distHtml = minifyHtml(
  html
    .replace('href="styles.css"', `href="${cssFile}"`)
    .replace('src="app.js"', `src="${jsFile}"`)
);

fs.writeFileSync(path.join(dist, "index.html"), distHtml);

function minifyCss(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([{}:;,>])\s*/g, "$1")
    .replace(/;}/g, "}")
    .trim();
}

function minifyJs(source) {
  return source
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/\n\s*/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function minifyHtml(source) {
  return source
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/>\s+</g, "><")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function contentHash(source) {
  return crypto.createHash("sha256").update(source).digest("hex").slice(0, 10);
}
