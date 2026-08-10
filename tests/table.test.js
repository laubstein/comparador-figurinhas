const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");

function createElement(tagName = "div") {
  return {
    tagName: tagName.toUpperCase(),
    attributes: {},
    children: [],
    dataset: {},
    style: {},
    className: "",
    hidden: false,
    textContent: "",
    append(...children) {
      this.children.push(...children);
    },
    replaceChildren(...children) {
      this.children = children;
    },
    setAttribute(name, value) {
      this.attributes[name] = String(value);
    },
    addEventListener() {},
    getBoundingClientRect() {
      return { left: 0, top: 0, right: 10, bottom: 10, width: 10, height: 10 };
    },
  };
}

const elements = new Map([
  ["#albumTableHead", createElement("thead")],
  ["#albumTableBody", createElement("tbody")],
  ["#albumTableColumns", createElement("colgroup")],
  ["#tableSummary", createElement("p")],
  ["#printButton", createElement("button")],
  ["#backToComparator", createElement("a")],
  ["#stickerTooltip", createElement("div")],
]);

const document = {
  querySelector(selector) {
    return elements.get(selector);
  },
  createElement,
  addEventListener() {},
};

const context = vm.createContext({ console, document, URL, URLSearchParams });
context.window = context;
context.location = { href: "https://example.test/tabela.html", search: "" };
context.innerWidth = 1280;
context.innerHeight = 720;
context.print = () => {};

["sticker-data.js", "share-codec.js", "table.js"].forEach((file) => {
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
});

function progress(expression) {
  return vm.runInContext(expression, context);
}

const empty = progress("teamProgress({ code: 'BRA' }, new Set(), new Set(), false)");
assert.strictEqual(empty.owned, 0);
assert.strictEqual(empty.missing, 20);
assert.strictEqual(empty.percentage, 0);
assert.strictEqual(empty.status, "low");

const twenty = progress("teamProgress({ code: 'BRA' }, new Set(Array.from({ length: 16 }, (_, i) => `BRA${i + 5}`)), new Set(), true)");
assert.strictEqual(twenty.percentage, 20);
assert.strictEqual(twenty.status, "low");

const twentyFive = progress("teamProgress({ code: 'BRA' }, new Set(Array.from({ length: 15 }, (_, i) => `BRA${i + 6}`)), new Set(), true)");
assert.strictEqual(twentyFive.percentage, 25);
assert.strictEqual(twentyFive.status, "partial");

const ninetyFive = progress("teamProgress({ code: 'BRA' }, new Set(['BRA20']), new Set(), true)");
assert.strictEqual(ninetyFive.percentage, 95);
assert.strictEqual(ninetyFive.status, "partial");

const complete = progress("teamProgress({ code: 'BRA' }, new Set(), new Set(), true)");
assert.strictEqual(complete.percentage, 100);
assert.strictEqual(complete.status, "complete");

const repeated = progress("teamProgress({ code: 'BRA' }, new Set(Array.from({ length: 20 }, (_, i) => `BRA${i + 1}`)), new Set(['BRA1']), true)");
assert.strictEqual(repeated.owned, 1);
assert.strictEqual(repeated.missing, 19);

const fwc = progress("teamProgress({ code: 'FWC' }, new Set(), new Set(), false)");
assert.strictEqual(fwc.total, 20);

const cc = progress("teamProgress({ code: 'CC' }, new Set(['CC14']), new Set(), true)");
assert.strictEqual(cc.total, 14);
assert.strictEqual(cc.owned, 13);
assert.strictEqual(cc.percentage, 93);
assert.strictEqual(cc.status, "partial");

assert.strictEqual(progress("formatProgressTooltip({ missing: 1, total: 20 })"), "Falta 1 figurinha de 20.");
assert.strictEqual(progress("formatProgressTooltip({ missing: 0, total: 20 })"), "Faltam 0 figurinhas de 20.");
assert.strictEqual(progress("formatProgressTooltip({ missing: 4, total: 14 })"), "Faltam 4 figurinhas de 14.");

const tableBody = elements.get("#albumTableBody");
assert(tableBody.children.length > 0, "tabela deve renderizar linhas");
assert.strictEqual(tableBody.children[0].children[2].className, "country-cell");
assert.strictEqual(tableBody.children[0].children[2].children[0].children[1].attributes.role, "progressbar");

const rowCount = tableBody.children.length;
progress("setGroupSort(true)");
assert.strictEqual(tableBody.children.length, rowCount, "ordenação deve preservar todas as linhas");
assert.strictEqual(tableBody.children.at(-2).children[1].textContent, "FWC");
assert.strictEqual(tableBody.children.at(-1).children[1].textContent, "CC");

console.log("table-progress: ok");
