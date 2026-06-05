const fields = {
  userMissing: document.querySelector("#userMissing"),
  userRepeated: document.querySelector("#userRepeated"),
  friendMissing: document.querySelector("#friendMissing"),
  friendRepeated: document.querySelector("#friendRepeated"),
};

const clearButton = document.querySelector("#clearButton");
const tableButton = document.querySelector("#tableButton");
const helpButton = document.querySelector("#helpButton");
const closeHelpButton = document.querySelector("#closeHelpButton");
const helpDialog = document.querySelector("#helpDialog");
const showNamesToggle = document.querySelector("#showNamesToggle");
const strategyHelpButton = document.querySelector("#strategyHelpButton");
const strategyHelp = document.querySelector("#strategyHelp");
const strategyInputs = [...document.querySelectorAll("input[name='tradeStrategy']")];
const parseSummary = document.querySelector("#parseSummary");
const impactSummary = document.querySelector("#impactSummary");
const userGivesCount = document.querySelector("#userGivesCount");
const resultTitle = document.querySelector("#resultTitle");
const resultDescription = document.querySelector("#resultDescription");
const tradeRows = document.querySelector("#tradeRows");
const emptyState = document.querySelector("#emptyState");
const tableWrap = document.querySelector(".table-wrap");
const swapCollectorsButton = document.querySelector("#swapCollectorsButton");
const copyWhatsAppButton = document.querySelector("#copyWhatsAppButton");
const copyWhatsAppLabel = copyWhatsAppButton.querySelector("span");
const shareComparisonButton = document.querySelector("#shareComparisonButton");

const selectionLineSimple = /(?:^|\s)([A-Z]{2,4})\s*-\s*((?:\d|00).*)$/;
const selectionLineDecorated = /(?:^|\s)([A-Z]{2,4})\b[^:,-]*:\s*((?:\d|00).*)$/;
const codedSticker = /\b([A-Z]{2,4})([0-9]{1,2})\b(?:\s*\(x\s*([0-9]+)\))?/gi;
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
  CC: "cc",
  SPECIAL: "special",
  STANDARD: "standard",
  SAME_NUMBER: "sameNumber",
};

const TRADE_KIND_LABELS = {
  [TRADE_KINDS.FWC]: "FWC",
  [TRADE_KINDS.CC]: "CC",
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
const SHARE_QUANTITY_CHARS = "23456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const COPY_WHATSAPP_LABEL = "Copiar para WhatsApp";
const SHARE_COMPARISON_LABEL = "Compartilhar Comparação";
const FEEDBACK_TIMEOUT_MS = 1800;
let urlSyncTimer = null;

const TRADE_STRATEGIES = {
  DIRECT: "0",
  SAME_NUMBER: "1",
  REPEATED: "2",
  BALANCED_REPEATED: "3",
};

const TRADE_STRATEGY_LABELS = {
  [TRADE_STRATEGIES.DIRECT]: "Direta",
  [TRADE_STRATEGIES.SAME_NUMBER]: "Mesmo número",
  [TRADE_STRATEGIES.REPEATED]: "Repetidas",
  [TRADE_STRATEGIES.BALANCED_REPEATED]: "Repetidas balanceadas",
};

function parseList(rawText, mode) {
  const items = new Map();
  const text = rawText
    .normalize("NFKC")
    .replace(/\bFCW\b/g, "FWC")
    .toUpperCase();

  text.split(/\r?\n/).forEach((line) => {
    const selectionLine = parseSelectionLine(line);
    if (selectionLine) {
      selectionLine.stickers.forEach(({ number, quantity }) => {
        addItem(items, stickerCode(selectionLine.prefix, number), mode === "repeated" ? quantity : 1);
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

function parseSelectionLine(line) {
  const match = line.match(selectionLineSimple) || line.match(selectionLineDecorated);
  if (!match) return null;

  const stickers = [...match[2].matchAll(selectionSticker)].map((stickerMatch) => ({
    number: Number(stickerMatch[1]),
    quantity: Number(stickerMatch[2] || stickerMatch[3] || 1),
  }));

  if (stickers.length === 0) return null;
  return {
    prefix: normalizePrefix(match[1]),
    stickers,
  };
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
      const match = item.code.match(/^([A-Z]{2,4})(\d+)$/);
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

  if (prefix === "CC") {
    return TRADE_KINDS.CC;
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

function buildTrades(userRepeated, userMissing, friendRepeated, friendMissing, strategy = TRADE_STRATEGIES.DIRECT) {
  const pools = tradePools(userRepeated, userMissing, friendRepeated, friendMissing, strategy);
  return strategy === TRADE_STRATEGIES.SAME_NUMBER
    ? pairSameNumberTrades(pools.userCanGive, pools.friendCanGive)
    : pairByKindTrades(pools.userCanGive, pools.friendCanGive);
}

function tradePools(userRepeated, userMissing, friendRepeated, friendMissing, strategy) {
  if (strategy === TRADE_STRATEGIES.REPEATED) {
    return {
      userCanGive: expandedMatches(userRepeated, friendMissing),
      friendCanGive: repeatedTradeReturns(friendRepeated, userRepeated),
    };
  }

  if (strategy === TRADE_STRATEGIES.BALANCED_REPEATED) {
    return {
      userCanGive: balancedRepeatedReturns(userRepeated, friendRepeated),
      friendCanGive: balancedRepeatedReturns(friendRepeated, userRepeated),
    };
  }

  return {
    userCanGive: expandedMatches(userRepeated, friendMissing),
    friendCanGive: expandedMatches(friendRepeated, userMissing),
  };
}

function pairSameNumberTrades(userCanGive, friendCanGive) {
  const trades = [];

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

function pairByKindTrades(userCanGive, friendCanGive) {
  const trades = [];

  [TRADE_KINDS.FWC, TRADE_KINDS.CC, TRADE_KINDS.SPECIAL, TRADE_KINDS.STANDARD].forEach((kind) => {
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

function repeatedTradeReturns(sourceRepeated, targetRepeated) {
  const matches = [];

  sourceRepeated.forEach((quantity, code) => {
    if (targetRepeated.has(code) || quantity < 1) return;
    matches.push({ code, kind: stickerKind(code) });
  });

  return matches.sort((a, b) => compareSticker(a.code, b.code));
}

function balancedRepeatedReturns(sourceRepeated, targetRepeated) {
  const matches = [];

  sourceRepeated.forEach((quantity, code) => {
    if (targetRepeated.has(code) || quantity < 2) return;
    matches.push({ code, kind: stickerKind(code) });
  });

  return matches.sort((a, b) => compareSticker(a.code, b.code));
}

function canTradeSameNumber(userInfo, friendInfo) {
  if (userInfo.number === null || friendInfo.number === null) return false;
  if (userInfo.number !== friendInfo.number) return false;
  if (isSpecialFamily(userInfo.prefix) || isSpecialFamily(friendInfo.prefix)) {
    return userInfo.prefix === friendInfo.prefix;
  }
  return true;
}

function isSpecialFamily(prefix) {
  return prefix === "FWC" || prefix === "CC";
}

function compare() {
  const parsed = getParsedInputs();
  const trades = buildTrades(parsed.userRepeated, parsed.userMissing, parsed.friendRepeated, parsed.friendMissing, selectedStrategy());

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

  renderResultContext(parsed);
  renderImpactSummary(parsed);
}

function renderResultContext(parsed) {
  const strategy = selectedStrategy();
  const pools = tradePools(parsed.userRepeated, parsed.userMissing, parsed.friendRepeated, parsed.friendMissing, strategy);

  resultTitle.textContent = resultTitleText(strategy);
  resultDescription.textContent = resultDescriptionText(strategy, pools, parsed.trades.length);
}

function resultTitleText(strategy) {
  return {
    [TRADE_STRATEGIES.DIRECT]: "Proposta direta",
    [TRADE_STRATEGIES.SAME_NUMBER]: "Proposta por mesmo número",
    [TRADE_STRATEGIES.REPEATED]: "Proposta por repetidas",
    [TRADE_STRATEGIES.BALANCED_REPEATED]: "Proposta por repetidas balanceadas",
  }[strategy];
}

function resultDescriptionText(strategy, pools, tradeCount) {
  const userCandidates = pools.userCanGive.length;
  const friendCandidates = pools.friendCanGive.length;
  const strategyReason = {
    [TRADE_STRATEGIES.DIRECT]: "Entram figurinhas repetidas que faltam para a outra pessoa, pareadas com repetidas dela que faltam para você.",
    [TRADE_STRATEGIES.SAME_NUMBER]: "Entram apenas pares da troca direta com a mesma numeração, mantendo FWC e CC dentro da própria família.",
    [TRADE_STRATEGIES.REPEATED]: "Você entrega repetidas que faltam para a pessoa e recebe repetidas dela que não aparecem na sua lista de repetidas.",
    [TRADE_STRATEGIES.BALANCED_REPEATED]: "Entram apenas sobras com quantidade 2 ou maior, trocadas por sobras que o outro lado não tem como repetida.",
  }[strategy];

  if (tradeCount > 0) {
    const leftover = Math.max(userCandidates, friendCandidates) - tradeCount;
    return `${strategyReason} Foram selecionadas ${tradeCount} troca(s) a partir de ${userCandidates} candidata(s) suas e ${friendCandidates} da outra pessoa; ${leftover} candidata(s) ficaram fora por falta de par compatível.`;
  }

  return `${strategyReason} ${noTradeReason(strategy, userCandidates, friendCandidates)}`;
}

function noTradeReason(strategy, userCandidates, friendCandidates) {
  if (userCandidates === 0 && friendCandidates === 0) {
    return "Nenhuma figurinha ficou elegível nos dois lados com os dados informados.";
  }

  if (userCandidates === 0) {
    return "Nenhuma repetida sua ficou elegível para ser entregue nessa estratégia.";
  }

  if (friendCandidates === 0) {
    return "Nenhuma repetida da outra pessoa ficou elegível para voltar nessa estratégia.";
  }

  if (strategy === TRADE_STRATEGIES.SAME_NUMBER) {
    return "Há candidatas nos dois lados, mas nenhuma tem a mesma numeração com família especial compatível.";
  }

  return "Há candidatas nos dois lados, mas elas ficaram separadas pelas regras de FWC, CC, 1/13 e demais figurinhas.";
}

function renderImpactSummary(parsed) {
  const tradeCount = parsed.trades.length;

  if (tradeCount === 0) {
    impactSummary.hidden = false;
    impactSummary.textContent = "Status após a troca: sem alteração.";
    return;
  }

  const strategy = selectedStrategy();
  const userMissingAfter = strategyUsesUserMissing(strategy)
    ? Math.max(0, parsed.userMissing.size - tradeCount)
    : parsed.userMissing.size;
  const userRepeatedAfter = Math.max(0, totalQuantity(parsed.userRepeated) - tradeCount);
  const friendMissingAfter = strategyUsesFriendMissing(strategy)
    ? Math.max(0, parsed.friendMissing.size - tradeCount)
    : parsed.friendMissing.size;
  const friendRepeatedAfter = Math.max(0, totalQuantity(parsed.friendRepeated) - tradeCount);

  impactSummary.hidden = false;
  impactSummary.innerHTML = [
    `Status após a troca: Você: ${userMissingAfter} faltando, ${userRepeatedAfter} repetidas`,
    `Pessoa: ${friendMissingAfter} faltando, ${friendRepeatedAfter} repetidas`,
  ].join(" | ");
}

function strategyUsesUserMissing(strategy) {
  return strategy === TRADE_STRATEGIES.DIRECT || strategy === TRADE_STRATEGIES.SAME_NUMBER;
}

function strategyUsesFriendMissing(strategy) {
  return strategy !== TRADE_STRATEGIES.BALANCED_REPEATED;
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
    selectedStrategy(),
    encodeCompactSection(parsed.userMissing),
    encodeCompactSection(parsed.userRepeated),
    encodeCompactSection(parsed.friendMissing),
    encodeCompactSection(parsed.friendRepeated),
  ];

  if (sections[0] === TRADE_STRATEGIES.DIRECT && sections.slice(1).every((section) => section === "")) {
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
      .map(({ number, quantity }) => stickerToShareToken(number, quantity))
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
    shareTokens(value).forEach(({ number, quantity }) => {
      addItem(items, `${prefix}${number}`, quantity);
    });
  });

  return items;
}

function stickerToShareToken(number, quantity) {
  const numberToken = numberToShareChar(number);
  const quantityToken = quantityToShareChar(quantity);
  return `${quantityToken}${numberToken}`;
}

function numberToShareChar(number) {
  if (number === 0) return "0";
  return STICKER_NUMBER_CHARS[number - 1] || "";
}

function quantityToShareChar(quantity) {
  if (!Number.isFinite(quantity) || quantity <= 1) return "";
  const cappedQuantity = Math.min(quantity, 35);
  return SHARE_QUANTITY_CHARS[cappedQuantity - 2] || "";
}

function shareTokens(value) {
  const tokens = [];

  for (let index = 0; index < value.length; index += 1) {
    let quantity = shareCharToQuantity(value[index]);
    if (quantity > 1 && index + 1 < value.length) {
      index += 1;
    } else {
      quantity = 1;
    }

    const number = shareCharToNumber(value[index]);
    if (number !== null) {
      tokens.push({ number, quantity });
    }
  }

  return tokens;
}

function shareCharToNumber(char) {
  if (char === "0") return 0;
  const index = STICKER_NUMBER_CHARS.indexOf(char);
  return index === -1 ? null : index + 1;
}

function shareCharToQuantity(char) {
  const index = SHARE_QUANTITY_CHARS.indexOf(char);
  return index === -1 ? 1 : index + 2;
}

function loadSharedComparison() {
  const encoded = new URLSearchParams(window.location.search).get(SHARE_PARAM);
  if (!encoded) return;

  try {
    const [strategy, userMissing, userRepeated, friendMissing, friendRepeated] = encoded.split(SHARE_SECTION_SEPARATOR);

    showNamesToggle.checked = false;
    setSelectedStrategy(strategy);
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
  if (hasFormData()) {
    compare();
    return;
  }

  clearComparison();
  scheduleUrlSync();
}

function hasFormData() {
  return Object.values(fields).some((field) => field.value.trim() !== "");
}

function whatsappKindLabel(kind) {
  if (kind === TRADE_KINDS.FWC || kind === TRADE_KINDS.CC) return kindLabel(kind);
  return "";
}

function whatsappStrategyText() {
  return {
    [TRADE_STRATEGIES.DIRECT]: "Nesta proposta estou considerando a troca direta: FWC com FWC, CC com CC e 1 e 13 somente entre elas.",
    [TRADE_STRATEGIES.SAME_NUMBER]: "Nesta proposta combinei somente figurinhas com mesmo número.",
    [TRADE_STRATEGIES.REPEATED]: "Nesta proposta estou considerando troca de repetidas: eu entrego figurinhas que faltam para a outra pessoa e recebo repetidas que não estão na minha lista de repetidas.",
    [TRADE_STRATEGIES.BALANCED_REPEATED]: "Nesta proposta estou considerando troca de repetidas balanceadas: cada pessoa entrega uma sobra que a outra não tem como repetida.",
  }[selectedStrategy()];
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
    TRADE_STRATEGIES.DIRECT,
    encodeCompactSection(parsed.userMissing),
    encodeCompactSection(parsed.userRepeated),
    "",
    "",
  ].join(SHARE_SECTION_SEPARATOR);
  const url = new URL("tabela.html", window.location.href);

  if (payload !== `${TRADE_STRATEGIES.DIRECT}~~~~`) {
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
  renderStrategyIntro();
  renderEmptyResults(emptyStateMessage());
  parseSummary.textContent = "Aguardando dados.";
  impactSummary.hidden = true;
  impactSummary.textContent = "";
  userGivesCount.textContent = "0";
}

function emptyStateMessage() {
  return "Informe os dados e escolha uma estratégia de troca.";
}

function renderStrategyIntro() {
  const emptyPools = { userCanGive: [], friendCanGive: [] };
  const strategy = selectedStrategy();
  resultTitle.textContent = resultTitleText(strategy);
  resultDescription.textContent = resultDescriptionText(strategy, emptyPools, 0);
}

function selectedStrategy() {
  return strategyInputs.find((input) => input.checked)?.value || TRADE_STRATEGIES.DIRECT;
}

function setSelectedStrategy(strategy = TRADE_STRATEGIES.DIRECT) {
  const normalizedStrategy = TRADE_STRATEGY_LABELS[strategy] ? strategy : TRADE_STRATEGIES.DIRECT;
  strategyInputs.forEach((input) => {
    input.checked = input.value === normalizedStrategy;
  });
}

function openStrategyHelp() {
  openHelpDialog();
  window.setTimeout(() => {
    strategyHelp.scrollIntoView({ block: "start", behavior: "smooth" });
    strategyHelp.focus({ preventScroll: true });
    strategyHelp.classList.add("help-section-highlight");
    window.setTimeout(() => {
      strategyHelp.classList.remove("help-section-highlight");
    }, FEEDBACK_TIMEOUT_MS);
  }, 80);
}

function openHelpDialog() {
  if (typeof helpDialog.showModal === "function") {
    helpDialog.showModal();
    document.body.classList.add("dialog-open");
    return;
  }

  helpDialog.setAttribute("open", "");
  document.body.classList.add("dialog-open");
}

function renderEmptyResults(message) {
  emptyState.hidden = false;
  emptyState.textContent = message;
  tableWrap.hidden = true;
}

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
strategyInputs.forEach((input) => {
  input.addEventListener("change", () => {
    if (hasFormData()) {
      compare();
    } else {
      scheduleUrlSync();
      renderStrategyIntro();
      renderEmptyResults(emptyStateMessage());
    }
  });
});
strategyHelpButton.addEventListener("click", openStrategyHelp);
helpButton.addEventListener("click", () => {
  openHelpDialog();
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

renderStrategyIntro();
renderEmptyResults(emptyStateMessage());
loadSharedComparison();
