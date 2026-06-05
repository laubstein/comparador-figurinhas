const fs = require("fs");
const path = require("path");

const root = __dirname;
const dist = path.join(root, "dist");

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");
const js = fs.readFileSync(path.join(root, "app.js"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");

fs.writeFileSync(path.join(dist, "styles.min.css"), minifyCss(css));
fs.writeFileSync(path.join(dist, "app.min.js"), minifyJs(js));
fs.writeFileSync(path.join(dist, "LICENSE"), fs.readFileSync(path.join(root, "LICENSE"), "utf8"));
fs.mkdirSync(path.join(dist, "assets"), { recursive: true });
fs.copyFileSync(path.join(root, "assets", "favicon.svg"), path.join(dist, "assets", "favicon.svg"));

const distHtml = minifyHtml(
  html
    .replace('href="styles.css"', 'href="styles.min.css"')
    .replace('src="app.js"', 'src="app.min.js"')
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
