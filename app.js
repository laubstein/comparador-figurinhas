const fields = {
  userMissing: document.querySelector("#userMissing"),
  userRepeated: document.querySelector("#userRepeated"),
  friendMissing: document.querySelector("#friendMissing"),
  friendRepeated: document.querySelector("#friendRepeated"),
};

const compareButton = document.querySelector("#compareButton");
const clearButton = document.querySelector("#clearButton");
const tableButton = document.querySelector("#tableButton");
const helpButton = document.querySelector("#helpButton");
const closeHelpButton = document.querySelector("#closeHelpButton");
const helpDialog = document.querySelector("#helpDialog");
const showNamesToggle = document.querySelector("#showNamesToggle");
const sameNumberToggle = document.querySelector("#sameNumberToggle");
const parseSummary = document.querySelector("#parseSummary");
const impactSummary = document.querySelector("#impactSummary");
const userGivesCount = document.querySelector("#userGivesCount");
const tradeRows = document.querySelector("#tradeRows");
const emptyState = document.querySelector("#emptyState");
const tableWrap = document.querySelector(".table-wrap");
const swapCollectorsButton = document.querySelector("#swapCollectorsButton");
const copyWhatsAppButton = document.querySelector("#copyWhatsAppButton");
const copyWhatsAppLabel = copyWhatsAppButton.querySelector("span");
const shareComparisonButton = document.querySelector("#shareComparisonButton");

const formatSelectionLine = /(?:^|\s)([A-Z]{3})\s*(?:-|:)\s*(.*)$/;
const codedSticker = /\b([A-Z]{3,4})([0-9]{1,2})\b(?:\s*\(x\s*([0-9]+)\))?/gi;
const selectionSticker = /(\d+)(?:\s*\((?:[xX]\s*([0-9]+)|([0-9]+)\s*[xX])\))?/g;
const zeroStickerAny = /\b00\b(?:\s*\(x\s*([0-9]+)\))?/gi;
const extraSticker = /\b(REGU|BRON|PRAT|OURO)\b(?:\s*\(x\s*([0-9]+)\))?/gi;
const { TEAM_FLAGS, STICKER_NAMES, displayStickerCode } = window.STICKER_DATA;
const CODE_PREFIXES = Object.keys(TEAM_FLAGS);
const CODE_PREFIX_INDEX = Object.fromEntries(CODE_PREFIXES.map((prefix, index) => [prefix, index]));
let currentTrades = [];
let hasCompared = false;

const TRADE_KINDS = {
  FWC: "fwc",
  SPECIAL: "special",
  STANDARD: "standard",
  SAME_NUMBER: "sameNumber",
};

const TRADE_KIND_LABELS = {
  [TRADE_KINDS.FWC]: "FWC",
  [TRADE_KINDS.SPECIAL]: "1 ou 13",
  [TRADE_KINDS.STANDARD]: "Demais",
  [TRADE_KINDS.SAME_NUMBER]: "Mesmo número",
};
const SHARE_PARAM = "c";
const SHARE_SECTION_SEPARATOR = "~";
const SHARE_GROUP_SEPARATOR = "-";
const SHARE_GROUP_VALUE_SEPARATOR = "_";
const SHARE_LOOSE_GROUP = "x";
const STICKER_NUMBER_CHARS = "abcdefghijklmnopqrst";
const COPY_WHATSAPP_LABEL = "Copiar para WhatsApp";
const SHARE_COMPARISON_LABEL = "Compartilhar Comparação";
const FEEDBACK_TIMEOUT_MS = 1800;
let urlSyncTimer = null;

function parseList(rawText, mode) {
  const items = new Map();
  const text = rawText
    .normalize("NFKC")
    .replace(/\bFCW\b/g, "FWC")
    .toUpperCase();

  text.split(/\r?\n/).forEach((line) => {
    const formatSelectionMatch = line.match(formatSelectionLine);
    if (formatSelectionMatch) {
      const prefix = normalizePrefix(formatSelectionMatch[1]);
      const stickers = [...formatSelectionMatch[2].matchAll(selectionSticker)];
      stickers.forEach((match) => {
        const number = Number(match[1]);
        const quantity = mode === "repeated" ? Number(match[2] || match[3] || 1) : 1;
        addItem(items, stickerCode(prefix, number), quantity);
      });
      return;
    }

    for (const match of line.matchAll(codedSticker)) {
      const prefix = normalizePrefix(match[1]);
      const code = stickerCode(prefix, Number(match[2]));
      const quantity = mode === "repeated" ? Number(match[3] || 1) : 1;
      addItem(items, code, quantity);
    }

    for (const match of line.matchAll(zeroStickerAny)) {
      const quantity = mode === "repeated" ? Number(match[1] || 1) : 1;
      addItem(items, "FWC0", quantity);
    }

    for (const match of line.matchAll(extraSticker)) {
      const quantity = mode === "repeated" ? Number(match[2] || 1) : 1;
      addItem(items, match[1], quantity);
    }
  });

  return items;
}

function addItem(items, code, quantity) {
  if (!Number.isFinite(quantity) || quantity < 1) return;
  items.set(code, (items.get(code) || 0) + quantity);
}

function normalizePrefix(prefix) {
  return prefix === "FCW" ? "FWC" : prefix;
}

function stickerCode(prefix, number) {
  return `${prefix}${prefix === "FWC" && number === 0 ? 0 : number}`;
}

function totalQuantity(items) {
  return [...items.values()].reduce((sum, value) => sum + value, 0);
}

function setActionButtonsVisible(visible) {
  copyWhatsAppButton.hidden = !visible;
  shareComparisonButton.hidden = !visible;
}

function getParsedInputs() {
  return {
    userMissing: parseList(fields.userMissing.value, "missing"),
    userRepeated: parseList(fields.userRepeated.value, "repeated"),
    friendMissing: parseList(fields.friendMissing.value, "missing"),
    friendRepeated: parseList(fields.friendRepeated.value, "repeated"),
  };
}

function convertPanelFormat(target, format) {
  const missingField = target === "user" ? fields.userMissing : fields.friendMissing;
  const repeatedField = target === "user" ? fields.userRepeated : fields.friendRepeated;
  const missing = parseList(missingField.value, "missing");
  const repeated = parseList(repeatedField.value, "repeated");

  missingField.value = formatList(missing, "missing", format);
  repeatedField.value = formatList(repeated, "repeated", format);
  handleFormChanged();
}

function swapCollectors() {
  const userMissing = fields.userMissing.value;
  const userRepeated = fields.userRepeated.value;

  fields.userMissing.value = fields.friendMissing.value;
  fields.userRepeated.value = fields.friendRepeated.value;
  fields.friendMissing.value = userMissing;
  fields.friendRepeated.value = userRepeated;
  handleFormChanged();
}

function formatList(items, mode, format) {
  return format === "app"
    ? formatAppList(items, mode)
    : formatSelectionList(items, mode);
}

function formatSelectionList(items, mode) {
  const { numericGroups, looseItems } = groupItems(items);
  const lines = [];

  numericGroups.forEach((stickers, prefix) => {
    const numbers = stickers.map(({ number, quantity }) => formatNumberToken(number, quantity, mode));
    lines.push(`${formatGroupTitle(prefix, "selection")} - ${numbers.join(", ")}`);
  });

  if (looseItems.length > 0) {
    lines.push(looseItems.map(({ code, quantity }) => formatCodeToken(code, quantity, mode)).join(", "));
  }

  return lines.join("\n");
}

function formatAppList(items, mode) {
  const { numericGroups, looseItems } = groupItems(items);
  const blocks = [];

  numericGroups.forEach((stickers, prefix) => {
    const codes = stickers.map(({ code, quantity }) => formatCodeToken(code, quantity, mode));
    blocks.push(`${formatGroupTitle(prefix, "app")}\n${codes.join(", ")}`);
  });

  if (looseItems.length > 0) {
    blocks.push(`*Extra Stickers*\n${looseItems.map(({ code, quantity }) => formatCodeToken(code, quantity, mode)).join(", ")}`);
  }

  return blocks.join("\n\n");
}

function groupItems(items) {
  const numericGroups = new Map();
  const looseItems = [];

  [...items.entries()]
    .map(([code, quantity]) => ({ code, quantity }))
    .sort((a, b) => compareSticker(a.code, b.code))
    .forEach((item) => {
      const match = item.code.match(/^([A-Z]{3,4})(\d+)$/);
      if (!match) {
        looseItems.push(item);
        return;
      }

      const prefix = match[1];
      if (!numericGroups.has(prefix)) {
        numericGroups.set(prefix, []);
      }
      numericGroups.get(prefix).push({
        ...item,
        number: Number(match[2]),
      });
    });

  return { numericGroups, looseItems };
}

function formatNumberToken(number, quantity, mode) {
  const displayNumber = number === 0 ? "00" : String(number);
  return mode === "repeated" && quantity > 1 ? `${displayNumber} (x${quantity})` : displayNumber;
}

function formatCodeToken(code, quantity, mode) {
  const displayCode = displayStickerCode(code);
  return mode === "repeated" && quantity > 1 ? `${displayCode} (x${quantity})` : displayCode;
}

function formatGroupTitle(prefix, format) {
  const flag = TEAM_FLAGS[prefix];
  const title = flag ? `${flag} ${prefix}` : prefix;
  return format === "app" ? `*${title}*` : title;
}

function stickerKind(code) {
  const { prefix, number } = stickerInfo(code);

  if (prefix === "FWC") {
    return TRADE_KINDS.FWC;
  }

  if (number === 1 || number === 13) {
    return TRADE_KINDS.SPECIAL;
  }

  return TRADE_KINDS.STANDARD;
}

function kindLabel(kind) {
  return TRADE_KIND_LABELS[kind] || kind;
}

function stickerInfo(code) {
  const match = code.match(/^([A-Z]+)(\d+)$/);
  if (!match) {
    return { prefix: code, number: null };
  }

  return {
    prefix: match[1],
    number: Number(match[2]),
  };
}

function expandedMatches(repeated, missing) {
  const matches = [];

  repeated.forEach((quantity, code) => {
    if (!missing.has(code) || quantity < 1) return;
    matches.push({ code, kind: stickerKind(code) });
  });

  return matches.sort((a, b) => compareSticker(a.code, b.code));
}

function compareSticker(a, b) {
  const aInfo = stickerInfo(a);
  const bInfo = stickerInfo(b);
  const prefixCompare = aInfo.prefix.localeCompare(bInfo.prefix);
  if (prefixCompare !== 0) return prefixCompare;
  return (aInfo.number || 0) - (bInfo.number || 0);
}

function buildTrades(userRepeated, userMissing, friendRepeated, friendMissing, options = {}) {
  const userCanGive = expandedMatches(userRepeated, friendMissing);
  const friendCanGive = expandedMatches(friendRepeated, userMissing);
  const trades = [];

  if (options.sameNumber) {
    userCanGive.forEach((userItem) => {
      const userInfo = stickerInfo(userItem.code);
      const friendIndex = friendCanGive.findIndex((friendItem) => {
        return canTradeSameNumber(userInfo, stickerInfo(friendItem.code));
      });

      if (friendIndex === -1) return;

      const [friendItem] = friendCanGive.splice(friendIndex, 1);
      trades.push({
        give: userItem.code,
        receive: friendItem.code,
        kind: TRADE_KINDS.SAME_NUMBER,
      });
    });

    return trades;
  }

  [TRADE_KINDS.FWC, TRADE_KINDS.SPECIAL, TRADE_KINDS.STANDARD].forEach((kind) => {
    const userPool = userCanGive.filter((item) => item.kind === kind);
    const friendPool = friendCanGive.filter((item) => item.kind === kind);
    const amount = Math.min(userPool.length, friendPool.length);

    for (let index = 0; index < amount; index += 1) {
      trades.push({
        give: userPool[index].code,
        receive: friendPool[index].code,
        kind,
      });
    }
  });

  return trades;
}

function canTradeSameNumber(userInfo, friendInfo) {
  if (userInfo.number === null || friendInfo.number === null) return false;
  if (userInfo.number !== friendInfo.number) return false;
  return (userInfo.prefix === "FWC") === (friendInfo.prefix === "FWC");
}

function compare() {
  const parsed = getParsedInputs();
  const trades = buildTrades(parsed.userRepeated, parsed.userMissing, parsed.friendRepeated, parsed.friendMissing, {
    sameNumber: sameNumberToggle.checked,
  });

  currentTrades = trades;
  hasCompared = true;
  setActionButtonsVisible(true);
  syncUrlNow();
  renderSummary({ ...parsed, trades });
  renderTrades(trades);
}

function renderSummary(parsed) {
  userGivesCount.textContent = parsed.trades.length;
  parseSummary.textContent = [
    `Você: ${parsed.userMissing.size} faltando, ${totalQuantity(parsed.userRepeated)} repetidas`,
    `Pessoa: ${parsed.friendMissing.size} faltando, ${totalQuantity(parsed.friendRepeated)} repetidas`,
  ].join(" | ");

  renderImpactSummary(parsed);
}

function renderImpactSummary(parsed) {
  const tradeCount = parsed.trades.length;

  if (tradeCount === 0) {
    impactSummary.hidden = false;
    impactSummary.textContent = "Status após a troca: sem alteração.";
    return;
  }

  const userMissingAfter = Math.max(0, parsed.userMissing.size - tradeCount);
  const userRepeatedAfter = Math.max(0, totalQuantity(parsed.userRepeated) - tradeCount);
  const friendMissingAfter = Math.max(0, parsed.friendMissing.size - tradeCount);
  const friendRepeatedAfter = Math.max(0, totalQuantity(parsed.friendRepeated) - tradeCount);

  impactSummary.hidden = false;
  impactSummary.innerHTML = [
    `Status após a troca: Você: ${userMissingAfter} faltando, ${userRepeatedAfter} repetidas`,
    `Pessoa: ${friendMissingAfter} faltando, ${friendRepeatedAfter} repetidas`,
  ].join(" | ");
}

function renderTrades(trades) {
  tradeRows.innerHTML = "";

  if (trades.length === 0) {
    renderEmptyResults("Nenhuma troca compatível foi encontrada com estes dados.");
    return;
  }

  emptyState.hidden = true;
  tableWrap.hidden = false;

  trades.forEach((trade, index) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${renderSticker(trade.give)}</td>
      <td>${renderSticker(trade.receive)}</td>
      <td><span class="trade-kind ${trade.kind}">${kindLabel(trade.kind)}</span></td>
    `;
    tradeRows.append(row);
  });
}

function renderSticker(code) {
  const name = showNamesToggle.checked ? STICKER_NAMES[code] : "";
  const nameMarkup = name ? `<span class="sticker-name">${escapeHtml(name)}</span>` : "";
  return `
    <span class="sticker-cell">
      <span class="sticker">${escapeHtml(displayStickerCode(code))}</span>
      ${nameMarkup}
    </span>
  `;
}

function formatStickerForMessage(code) {
  const info = stickerInfo(code);
  const flag = TEAM_FLAGS[info.prefix] ? `${TEAM_FLAGS[info.prefix]} ` : "";
  const name = showNamesToggle.checked && STICKER_NAMES[code] ? ` - ${STICKER_NAMES[code]}` : "";
  return `${flag}${displayStickerCode(code)}${name}`;
}

function buildWhatsAppText() {
  if (currentTrades.length === 0) {
    return "";
  }

  const lines = [
    "*Proposta de troca de figurinhas*",
    "",
    whatsappStrategyText(),
    "",
    "Eu entrego -> Pessoa entrega",
  ];

  currentTrades.forEach((trade, index) => {
    const kind = whatsappKindLabel(trade.kind);
    const kindText = kind ? ` (${kind})` : "";
    lines.push(`${index + 1}. ${formatStickerForMessage(trade.give)} -> ${formatStickerForMessage(trade.receive)}${kindText}`);
  });

  return lines.join("\n");
}

function buildShareUrl() {
  const payload = buildSharePayload();
  const url = new URL(window.location.href);

  if (payload) {
    url.search = `${SHARE_PARAM}=${payload}`;
  } else {
    url.search = "";
  }

  return url.toString();
}

function buildSharePayload() {
  const parsed = getParsedInputs();
  const sections = [
    sameNumberToggle.checked ? "1" : "0",
    encodeCompactSection(parsed.userMissing),
    encodeCompactSection(parsed.userRepeated),
    encodeCompactSection(parsed.friendMissing),
    encodeCompactSection(parsed.friendRepeated),
  ];

  if (sections[0] === "0" && sections.slice(1).every((section) => section === "")) {
    return "";
  }

  return sections.join(SHARE_SECTION_SEPARATOR);
}

function encodeCompactSection(items) {
  const { numericGroups, looseItems } = groupItems(items);
  const groups = [];
  const loose = [];

  numericGroups.forEach((stickers, prefix) => {
    const prefixIndex = CODE_PREFIX_INDEX[prefix];
    if (prefixIndex === undefined) {
      stickers.forEach(({ code }) => loose.push(code));
      return;
    }

    const numbers = stickers
      .map(({ number }) => numberToShareChar(number))
      .join("");
    groups.push(`${prefixIndex.toString(36)}${SHARE_GROUP_VALUE_SEPARATOR}${numbers}`);
  });

  looseItems.forEach(({ code }) => loose.push(code));

  if (loose.length > 0) {
    groups.push(`${SHARE_LOOSE_GROUP}${SHARE_GROUP_VALUE_SEPARATOR}${loose.join(SHARE_GROUP_VALUE_SEPARATOR)}`);
  }

  return groups.join(SHARE_GROUP_SEPARATOR);
}

function decodeCompactSection(section = "") {
  const items = new Map();
  if (!section) return items;

  section.split(SHARE_GROUP_SEPARATOR).forEach((group) => {
    const parts = group.split(SHARE_GROUP_VALUE_SEPARATOR);
    const prefixToken = parts.shift();
    if (prefixToken === SHARE_LOOSE_GROUP) {
      parts
        .filter(Boolean)
        .forEach((code) => addItem(items, code, 1));
      return;
    }

    const value = parts.join(SHARE_GROUP_VALUE_SEPARATOR);
    const prefixIndex = Number.parseInt(prefixToken, 36);
    const prefix = CODE_PREFIXES[prefixIndex];
    if (!prefix || !value) return;
    [...value]
      .map(shareCharToNumber)
      .filter((number) => number !== null)
      .forEach((number) => addItem(items, `${prefix}${number}`, 1));
  });

  return items;
}

function numberToShareChar(number) {
  if (number === 0) return "0";
  return STICKER_NUMBER_CHARS[number - 1] || "";
}

function shareCharToNumber(char) {
  if (char === "0") return 0;
  const index = STICKER_NUMBER_CHARS.indexOf(char);
  return index === -1 ? null : index + 1;
}

function loadSharedComparison() {
  const encoded = new URLSearchParams(window.location.search).get(SHARE_PARAM);
  if (!encoded) return;

  try {
    const [switches, userMissing, userRepeated, friendMissing, friendRepeated] = encoded.split(SHARE_SECTION_SEPARATOR);

    showNamesToggle.checked = false;
    sameNumberToggle.checked = switches === "1";
    fields.userMissing.value = formatSelectionList(decodeCompactSection(userMissing), "missing");
    fields.userRepeated.value = formatSelectionList(decodeCompactSection(userRepeated), "repeated");
    fields.friendMissing.value = formatSelectionList(decodeCompactSection(friendMissing), "missing");
    fields.friendRepeated.value = formatSelectionList(decodeCompactSection(friendRepeated), "repeated");
    compare();
  } catch (_error) {
    renderEmptyResults("Não foi possível carregar a comparação compartilhada.");
  }
}

function syncUrlNow() {
  const url = buildShareUrl();
  window.history?.replaceState?.(null, "", url);
}

function scheduleUrlSync() {
  window.clearTimeout(urlSyncTimer);
  urlSyncTimer = window.setTimeout(syncUrlNow, 250);
}

function handleFormChanged() {
  scheduleUrlSync();
  if (hasCompared) {
    clearComparison();
  }
}

function whatsappKindLabel(kind) {
  if (kind === TRADE_KINDS.FWC) return kindLabel(kind);
  return "";
}

function whatsappStrategyText() {
  if (sameNumberToggle.checked) {
    return "Nesta proposta combinei somente figurinhas com mesmo número.";
  }

  return "Nesta proposta estou considerando a troca de FWC com FWC e 1 e 13 somente entre elas.";
}

async function copyWhatsAppText() {
  const text = buildWhatsAppText();

  if (!text) {
    setCopyButtonLabel("Sem proposta");
    return;
  }

  try {
    await copyText(text);
    setCopyButtonLabel("Copiado");
  } catch (_error) {
    copyTextFallback(text);
    setCopyButtonLabel("Copiado");
  }
}

async function shareComparison() {
  const url = buildShareUrl();

  try {
    await copyText(url);
    setShareButtonLabel("Link copiado");
  } catch (_error) {
    copyTextFallback(url);
    setShareButtonLabel("Link copiado");
  }
}

function openUserTable() {
  syncUrlNow();
  const parsed = getParsedInputs();
  const payload = [
    "0",
    encodeCompactSection(parsed.userMissing),
    encodeCompactSection(parsed.userRepeated),
    "",
    "",
  ].join(SHARE_SECTION_SEPARATOR);
  const url = new URL("tabela.html", window.location.href);

  if (payload !== "0~~~~") {
    url.searchParams.set(SHARE_PARAM, payload);
  }

  window.open(url.toString(), "_blank", "noopener");
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  copyTextFallback(text);
}

function copyTextFallback(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "-1000px";
  document.body.append(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function setCopyButtonLabel(label) {
  setTemporaryText(copyWhatsAppLabel, label, COPY_WHATSAPP_LABEL);
}

function setShareButtonLabel(label) {
  setTemporaryText(shareComparisonButton, label, SHARE_COMPARISON_LABEL);
}

function setTemporaryText(element, label, original) {
  element.textContent = label;
  window.setTimeout(() => {
    element.textContent = original;
  }, FEEDBACK_TIMEOUT_MS);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;",
  }[char]));
}

function clearComparison() {
  tradeRows.innerHTML = "";
  currentTrades = [];
  hasCompared = false;
  setActionButtonsVisible(false);
  renderEmptyResults("Informe os quatro campos e clique em comparar.");
  parseSummary.textContent = "Aguardando dados.";
  impactSummary.hidden = true;
  impactSummary.textContent = "";
  userGivesCount.textContent = "0";
}

function renderEmptyResults(message) {
  emptyState.hidden = false;
  emptyState.textContent = message;
  tableWrap.hidden = true;
}

compareButton.addEventListener("click", compare);
clearButton.addEventListener("click", clearComparison);
tableButton.addEventListener("click", openUserTable);
swapCollectorsButton.addEventListener("click", swapCollectors);
copyWhatsAppButton.addEventListener("click", copyWhatsAppText);
shareComparisonButton.addEventListener("click", shareComparison);
document.querySelectorAll("[data-format-target][data-format]").forEach((button) => {
  button.addEventListener("click", () => {
    convertPanelFormat(button.dataset.formatTarget, button.dataset.format);
  });
});
Object.values(fields).forEach((field) => {
  field.addEventListener("input", handleFormChanged);
});
showNamesToggle.addEventListener("change", () => {
  if (!hasCompared) return;
  renderTrades(currentTrades);
});
sameNumberToggle.addEventListener("change", () => {
  if (hasCompared) {
    compare();
  } else {
    scheduleUrlSync();
  }
});
helpButton.addEventListener("click", () => {
  if (typeof helpDialog.showModal === "function") {
    helpDialog.showModal();
    document.body.classList.add("dialog-open");
    return;
  }

  helpDialog.setAttribute("open", "");
  document.body.classList.add("dialog-open");
});

closeHelpButton.addEventListener("click", () => {
  helpDialog.close();
});

helpDialog.addEventListener("close", () => {
  document.body.classList.remove("dialog-open");
});

helpDialog.addEventListener("click", (event) => {
  if (event.target === helpDialog) {
    helpDialog.close();
  }
});

loadSharedComparison();
