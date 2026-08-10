const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const context = vm.createContext({ console });
context.window = context;

["sticker-data.js", "share-codec.js", "input-parser.js"].forEach((file) => {
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
});

const { parseList, parseCombinedLists, mergeStickerLists } = context.INPUT_PARSER;

function readFixture(relativePath) {
  return fs.readFileSync(path.join(__dirname, "fixtures", relativePath), "utf8");
}

const fixtureCases = [
  ["formato-app/a_faltando.txt", "missing", 141],
  ["formato-app/a_repetidas.txt", "repeated", 143],
  ["formato-app/b_faltando.txt", "missing", 137],
  ["formato-app/b_repetidas.txt", "repeated", 536],
  ["formato-app/c_faltando.txt", "missing", 88],
  ["formato-app/c_repetidas.txt", "repeated", 101],
  ["formato-app/d_faltando.txt", "missing", 56],
  ["formato-app/d_repetidas.txt", "repeated", 171],
  ["formato-inline/inline_faltando.txt", "missing", 244],
  ["formato-inline/inline_repetidas.txt", "repeated", 307],
  ["formato-extenso/lista.txt", "missing", 142],
  ["restauracao-link/pessoa_faltantes.txt", "missing", 118],
  ["restauracao-link/voce_faltantes.txt", "missing", 43],
  ["restauracao-link/voce_repetidas.txt", "repeated", 503],
];

fixtureCases.forEach(([fixture, mode, expectedSize]) => {
  const parsed = parseList(readFixture(fixture), mode);
  assert.strictEqual(parsed.size, expectedSize, `${fixture} deve manter a contagem esperada`);
});

const combinedFixture = readFixture("formato-combinado/faltantes_repetidas.txt");
const combined = parseCombinedLists(combinedFixture);
assert(combined, "fixture combinada deve ser reconhecida");
assert.strictEqual(combined.missing.get("FWC3"), 1);
assert.strictEqual(combined.missing.get("CC9"), 1);
assert.strictEqual(combined.repeated.get("CAN4"), 3);
assert.strictEqual(combined.repeated.get("SEN9"), 2);

const inlineCombined = parseCombinedLists(readFixture("formato-inline/inline_faltando_duplicado.txt"));
assert(inlineCombined, "fixture inline combinada deve ser reconhecida");
assert.strictEqual(inlineCombined.missing.size, 244);
assert.strictEqual(inlineCombined.repeated.size, 307);
assert.strictEqual(inlineCombined.missing.get("FWC1"), 1);
assert.strictEqual(inlineCombined.repeated.get("MEX7"), 2);
assert.strictEqual(inlineCombined.repeated.get("RSA20"), 3);

const appCombinedA = parseCombinedLists(readFixture("formato-app/a_faltando_repetidas.txt"));
assert(appCombinedA, "fixture combinada A do app deve ser reconhecida");
assert.strictEqual(appCombinedA.missing.size, 141);
assert.strictEqual(appCombinedA.repeated.size, 143);
assert.strictEqual(appCombinedA.missing.get("FWC0"), 1);
assert.strictEqual(appCombinedA.repeated.get("RSA20"), 5);

const appCombinedC = parseCombinedLists(readFixture("formato-app/c_faltando_repetidas.txt"));
assert(appCombinedC, "fixture combinada C do app deve ser reconhecida");
assert.strictEqual(appCombinedC.missing.size, 88);
assert.strictEqual(appCombinedC.repeated.size, 101);
assert.strictEqual(appCombinedC.missing.get("BRA20"), 1);
assert.strictEqual(appCombinedC.repeated.get("SCO11"), 2);
assert.strictEqual(appCombinedC.repeated.get("ENG15"), 2);

const reversed = parseCombinedLists(`
**Duplicados:**
BRA 2 (x3)

_Faltando_
BRA 1
`);
assert(reversed, "cabeçalhos alternativos e ordem invertida devem funcionar");
assert.strictEqual(reversed.missing.get("BRA1"), 1);
assert.strictEqual(reversed.repeated.get("BRA2"), 3);

const descriptiveInline = parseCombinedLists(`
Estas são minhas figurinhas faltantes: BRA1
Estas são minhas figurinhas repetidas: BRA2 (x2)
`);
assert(descriptiveInline, "cabeçalhos descritivos com conteúdo inline devem funcionar");
assert.strictEqual(descriptiveInline.missing.get("BRA1"), 1);
assert.strictEqual(descriptiveInline.repeated.get("BRA2"), 2);

assert.strictEqual(parseCombinedLists("Faltantes\nBRA 1"), null);
assert.strictEqual(parseCombinedLists("Faltantes\ntexto\nRepetidas\noutro texto"), null);
assert.strictEqual(parseList("FWC - 20\nCC - 15\nBRA - 21", "missing").size, 0);
assert.strictEqual(parseList("BRA 1, BRA 1", "missing").get("BRA1"), 1);

const currentMissing = parseList("BRA - 1, 2", "missing");
const incomingMissing = parseList("BRA - 2, 3", "missing");
const mergedMissing = mergeStickerLists(currentMissing, incomingMissing, "missing");
assert.strictEqual(JSON.stringify([...mergedMissing.entries()]), JSON.stringify([["BRA1", 1], ["BRA2", 1], ["BRA3", 1]]));

const currentRepeated = parseList("BRA - 1 (x34), 2", "repeated");
const incomingRepeated = parseList("BRA - 1 (x3), 2 (x2)", "repeated");
const mergedRepeated = mergeStickerLists(currentRepeated, incomingRepeated, "repeated");
assert.strictEqual(mergedRepeated.get("BRA1"), 35);
assert.strictEqual(mergedRepeated.get("BRA2"), 3);

const extendedFixture = readFixture("formato-extenso/lista.txt");
const extended = parseList(extendedFixture, "missing");
assert(extended.has("CZE7"), "nome de país em português deve ser resolvido");

const sharedUrl = new URL(readFixture("restauracao-link/link.txt").trim());
const decoded = context.SHARE_CODEC.decodeSharePayload(sharedUrl.searchParams.get("c"));
assert.strictEqual(decoded.strategy, "4");
assert.strictEqual(decoded.userMissing.size, 43);
assert.strictEqual(decoded.userRepeated.size, 488);
assert.strictEqual(decoded.friendMissing.size, 114);
assert.strictEqual(decoded.friendRepeated.size, 0);

console.log("input-parser: ok");
