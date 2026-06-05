const fs = require("fs");
const crypto = require("crypto");
const path = require("path");

const root = __dirname;
const dist = path.join(root, "dist");

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");
const minifiedCss = minifyCss(css);
const cssFile = `styles.${contentHash(minifiedCss)}.min.css`;
const pages = [
  { html: "index.html", scripts: ["sticker-data.js", "app.js"] },
  { html: "tabela.html", scripts: ["sticker-data.js", "table.js"] },
];
const scriptFiles = new Map();

fs.writeFileSync(path.join(dist, cssFile), minifiedCss);
fs.writeFileSync(path.join(dist, "LICENSE"), fs.readFileSync(path.join(root, "LICENSE"), "utf8"));
fs.mkdirSync(path.join(dist, "assets"), { recursive: true });
for (const asset of ["favicon.svg", "og-image.png"]) {
  fs.copyFileSync(path.join(root, "assets", asset), path.join(dist, "assets", asset));
}

pages.forEach(({ scripts }) => {
  scripts.forEach((script) => {
    if (scriptFiles.has(script)) return;
    const sourceJs = fs.readFileSync(path.join(root, script), "utf8");
    const minifiedJs = minifyJs(sourceJs);
    const jsFile = `${path.basename(script, ".js")}.${contentHash(minifiedJs)}.min.js`;

    fs.writeFileSync(path.join(dist, jsFile), minifiedJs);
    scriptFiles.set(script, jsFile);
  });
});

pages.forEach(({ html, scripts }) => {
  const sourceHtml = fs.readFileSync(path.join(root, html), "utf8");
  const distHtml = minifyHtml(scripts.reduce((currentHtml, script) => {
    return currentHtml.replace(`src="${script}"`, `src="${scriptFiles.get(script)}"`);
  }, sourceHtml.replace('href="styles.css"', `href="${cssFile}"`)));

  fs.writeFileSync(path.join(dist, html), distHtml);
});

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
