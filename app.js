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
const combinedPasteDialog = document.querySelector("#combinedPasteDialog");
const combinedPasteCollector = document.querySelector("#combinedPasteCollector");
const closeCombinedPasteButton = document.querySelector("#closeCombinedPasteButton");
const distributeCombinedPasteButton = document.querySelector("#distributeCombinedPasteButton");
const pasteOnlyHereButton = document.querySelector("#pasteOnlyHereButton");
const showNamesToggle = document.querySelector("#showNamesToggle");
const strategyHelpButton = document.querySelector("#strategyHelpButton");
const strategyHelp = document.querySelector("#strategyHelp");
const strategyInputs = [...document.querySelectorAll("input[name='tradeStrategy']")];
const parseSummary = document.querySelector("#parseSummary");
const impactSummary = document.querySelector("#impactSummary");
const userGivesCount = document.querySelector("#userGivesCount");
const scoreboardLabel = document.querySelector("#scoreboardLabel");
const scoreboardDetail = document.querySelector("#scoreboardDetail");
const resultTitle = document.querySelector("#resultTitle");
const resultDescription = document.querySelector("#resultDescription");
const tradeHeadRow = document.querySelector("#tradeHeadRow");
const tradeRows = document.querySelector("#tradeRows");
const tradeFooter = document.querySelector("#tradeFooter");
const acceptTradeButton = document.querySelector("#acceptTradeButton");
const removePossibilitiesButton = document.querySelector("#removePossibilitiesButton");
const ignoredStickers = document.querySelector("#ignoredStickers");
const badgeEls = {
  user: {
    badge: document.querySelector("#userBadge"),
    input: document.querySelector("#userBadgeInput"),
    edit: document.querySelector("#userBadgeEdit"),
  },
  friend: {
    badge: document.querySelector("#friendBadge"),
    input: document.querySelector("#friendBadgeInput"),
    edit: document.querySelector("#friendBadgeEdit"),
  },
};
const possibilityNumberFilter = document.querySelector("#possibilityNumberFilter");
const possibilityNumberInput = document.querySelector("#possibilityNumberInput");
const ignorePossibilityNumberButton = document.querySelector("#ignorePossibilityNumberButton");
const ignoredNumbers = document.querySelector("#ignoredNumbers");
const emptyState = document.querySelector("#emptyState");
const emptyStateMessageElement = document.querySelector("#emptyStateMessage");
const undoTradeButton = document.querySelector("#undoTradeButton");
const undoTradeFooterButton = document.querySelector("#undoTradeFooterButton");
const tableWrap = document.querySelector(".table-wrap");
const swapCollectorsButton = document.querySelector("#swapCollectorsButton");
const copyWhatsAppButton = document.querySelector("#copyWhatsAppButton");
const copyWhatsAppLabel = copyWhatsAppButton.querySelector("span");
const shareComparisonButton = document.querySelector("#shareComparisonButton");
const tradeLegend = document.querySelector(".legend");
const tradeStickerTooltip = document.querySelector("#tradeStickerTooltip");

const { TEAMS, STICKER_NAMES, displayStickerCode } = window.STICKER_DATA;
const TEAM_BY_CODE = Object.fromEntries(TEAMS.map((team) => [team.code, team]));
const { parseList, parseCombinedLists, mergeStickerLists } = window.INPUT_PARSER;
const {
  SHARE_PARAM,
  UTM_CAMPAIGN,
  encodeSharePayload,
  decodeSharePayload,
  stickerInfo,
  compareSticker,
  groupItems,
} = window.SHARE_CODEC;
let currentTrades = [];
const ignoredTradeStickers = new Map();
const ignoredPossibilityNumbers = new Set();
let hasCompared = false;
const acceptedTradeHistory = [];
const MAX_UNDO_TRADES = 5;

const TRADE_KINDS = {
  FWC: "fwc",
  CC: "cc",
  NUMBER_ONE: "numberOne",
  NUMBER_THIRTEEN: "numberThirteen",
  SELECTION_SHINY: "selectionShiny",
  STANDARD: "standard",
  SAME_NUMBER: "sameNumber",
  FREE: "free",
};

const TRADE_KIND_LABELS = {
  [TRADE_KINDS.FWC]: "FWC",
  [TRADE_KINDS.CC]: "CC",
  [TRADE_KINDS.NUMBER_ONE]: "Número 1",
  [TRADE_KINDS.NUMBER_THIRTEEN]: "Número 13",
  [TRADE_KINDS.SELECTION_SHINY]: "FWC ou número 1",
  [TRADE_KINDS.STANDARD]: "Demais",
  [TRADE_KINDS.SAME_NUMBER]: "Mesmo número",
  [TRADE_KINDS.FREE]: "Livre",
};
const DEFAULT_COLLECTOR_NAMES = { user: "Você", friend: "Pessoa" };
const COLLECTOR_NAME_PARAM = { user: "un", friend: "pn" };
const MAX_COLLECTOR_NAME_LENGTH = 24;
const collectorNames = { ...DEFAULT_COLLECTOR_NAMES };
const COPY_WHATSAPP_LABEL = "Copiar para WhatsApp";
const SHARE_COMPARISON_LABEL = "Compartilhar Comparação";
const FEEDBACK_TIMEOUT_MS = 1800;
let urlSyncTimer = null;
let pendingCombinedPaste = null;

const TRADE_STRATEGIES = {
  BRIGHT: "0",
  SAME_NUMBER: "1",
  REPEATED: "2",
  BALANCED_REPEATED: "3",
  POSSIBILITIES: "4",
  DIRECT: "5",
  BRIGHT_SELECTIONS: "6",
};

const TRADE_STRATEGY_LABELS = {
  [TRADE_STRATEGIES.BRIGHT]: "Brilhantes",
  [TRADE_STRATEGIES.SAME_NUMBER]: "Mesmo número",
  [TRADE_STRATEGIES.REPEATED]: "Repetidas",
  [TRADE_STRATEGIES.BALANCED_REPEATED]: "Repetidas balanceadas",
  [TRADE_STRATEGIES.POSSIBILITIES]: "Possibilidades",
  [TRADE_STRATEGIES.DIRECT]: "Direta",
  [TRADE_STRATEGIES.BRIGHT_SELECTIONS]: "Brilhantes Seleções",
};

// Textos por estratégia: título do resultado, explicação da regra e frase da
// mensagem de WhatsApp. Nova estratégia = adicionar uma entrada aqui.
const STRATEGY_TEXTS = {
  [TRADE_STRATEGIES.BRIGHT]: {
    title: "Proposta de brilhantes",
    reason: "Entram figurinhas repetidas que faltam para o outro lado, mantendo FWC, CC, número 1 e demais figurinhas em seus grupos. O número 13 é tratado como comum.",
    whatsapp: "Nesta proposta estou considerando FWC com FWC, CC com CC e número 1 com número 1; o número 13 participa como figurinha comum.",
  },
  [TRADE_STRATEGIES.BRIGHT_SELECTIONS]: {
    title: "Proposta de brilhantes e seleções",
    reason: "FWC e figurinhas número 1 podem ser pareadas entre si; figurinhas número 13 só pareiam com outras número 13.",
    whatsapp: "Nesta proposta FWC e número 1 podem ser trocados entre si, enquanto número 13 troca somente com número 13.",
  },
  [TRADE_STRATEGIES.SAME_NUMBER]: {
    title: "Proposta por mesmo número",
    reason: "Entram apenas pares da troca direta com a mesma numeração, mantendo FWC e CC dentro da própria família.",
    whatsapp: "Nesta proposta combinei somente figurinhas com mesmo número.",
  },
  [TRADE_STRATEGIES.REPEATED]: {
    title: "Proposta por repetidas",
    reason: "Você entrega repetidas que faltam para a pessoa e recebe repetidas dela que não aparecem na sua lista de repetidas. A seleção distribui as figurinhas entre países e dá mais espaço aos países com maiores quantidades repetidas.",
    whatsapp: "Nesta proposta estou considerando troca de repetidas, distribuindo a seleção entre países e priorizando os que possuem maiores quantidades repetidas.",
  },
  [TRADE_STRATEGIES.BALANCED_REPEATED]: {
    title: "Proposta por repetidas balanceadas",
    reason: "Entram apenas sobras com quantidade 2 ou maior, trocadas por sobras que o outro lado não tem como repetida.",
    whatsapp: "Nesta proposta estou considerando troca de repetidas balanceadas: cada pessoa entrega uma sobra que a outra não tem como repetida.",
  },
  [TRADE_STRATEGIES.POSSIBILITIES]: {
    title: "Possibilidades encontradas",
    reason: "Entram todas as figurinhas que faltam para um lado e estão na lista de repetidas do outro, sem exigir uma contrapartida.",
    whatsapp: "Nesta lista estou considerando as figurinhas que faltam para um lado e aparecem nas repetidas do outro.",
  },
  [TRADE_STRATEGIES.DIRECT]: {
    title: "Proposta direta",
    reason: "Primeiro são priorizadas trocas entre FWC, CC, número 1 e demais figurinhas; depois as candidatas restantes são pareadas livremente. Em ambas as etapas, a seleção é distribuída entre países.",
    whatsapp: "Nesta proposta priorizei FWC, CC e número 1 entre seus grupos, distribuí a seleção entre países e completei as trocas restantes livremente.",
  },
};

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

function handleFieldPaste(fieldName, event) {
  const rawText = event.clipboardData?.getData("text/plain");
  const combined = parseCombinedLists(rawText);
  if (!combined) return;

  event.preventDefault();
  const field = fields[fieldName];
  pendingCombinedPaste = {
    fieldName,
    rawText,
    combined,
    selectionStart: field.selectionStart ?? field.value.length,
    selectionEnd: field.selectionEnd ?? field.value.length,
  };
  const side = fieldName.startsWith("user") ? "user" : "friend";
  combinedPasteCollector.textContent = collectorName(side);
  combinedPasteDialog.querySelector("input[value='merge']").checked = true;
  openCombinedPasteDialog();
}

function openCombinedPasteDialog() {
  if (typeof combinedPasteDialog.showModal === "function") {
    combinedPasteDialog.showModal();
  } else {
    combinedPasteDialog.setAttribute("open", "");
  }
  document.body.classList.add("dialog-open");
}

function completeCombinedPaste(action) {
  const pending = pendingCombinedPaste;
  if (!pending) return;
  pendingCombinedPaste = null;

  if (action === "distribute") {
    distributeCombinedLists(pending);
  } else {
    insertOriginalPaste(pending);
  }

  if (combinedPasteDialog.open && typeof combinedPasteDialog.close === "function") {
    combinedPasteDialog.close();
  } else {
    combinedPasteDialog.removeAttribute("open");
    document.body.classList.remove("dialog-open");
  }
}

function distributeCombinedLists({ fieldName, combined }) {
  const side = fieldName.startsWith("user") ? "user" : "friend";
  const missingField = fields[`${side}Missing`];
  const repeatedField = fields[`${side}Repeated`];
  const policy = combinedPasteDialog.querySelector("input[name='combinedPastePolicy']:checked")?.value;
  const missing = policy === "merge"
    ? mergeStickerLists(parseList(missingField.value, "missing"), combined.missing, "missing")
    : combined.missing;
  const repeated = policy === "merge"
    ? mergeStickerLists(parseList(repeatedField.value, "repeated"), combined.repeated, "repeated")
    : combined.repeated;

  missingField.value = formatSelectionList(missing, "missing");
  repeatedField.value = formatSelectionList(repeated, "repeated");
  fields[fieldName].focus();
  handleFormChanged();
}

function insertOriginalPaste({ fieldName, rawText, selectionStart, selectionEnd }) {
  const field = fields[fieldName];
  field.setRangeText(rawText, selectionStart, selectionEnd, "end");
  field.focus();
  handleFormChanged();
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
  ignoredTradeStickers.clear();
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

function formatNumberToken(number, quantity, mode) {
  const displayNumber = number === 0 ? "00" : String(number);
  return mode === "repeated" && quantity > 1 ? `${displayNumber} (x${quantity})` : displayNumber;
}

function formatCodeToken(code, quantity, mode) {
  const displayCode = displayStickerCode(code);
  return mode === "repeated" && quantity > 1 ? `${displayCode} (x${quantity})` : displayCode;
}

function formatGroupTitle(prefix, format) {
  const flag = TEAM_BY_CODE[prefix]?.flag;
  const title = flag ? `${flag} ${prefix}` : prefix;
  return format === "app" ? `*${title}*` : title;
}

function stickerKind(code, strategy = TRADE_STRATEGIES.BRIGHT) {
  const { prefix, number } = stickerInfo(code);

  if (strategy === TRADE_STRATEGIES.BRIGHT_SELECTIONS) {
    if (prefix === "FWC" || number === 1) return TRADE_KINDS.SELECTION_SHINY;
    if (prefix === "CC") return TRADE_KINDS.CC;
    if (number === 13) return TRADE_KINDS.NUMBER_THIRTEEN;
    return TRADE_KINDS.STANDARD;
  }

  if (prefix === "FWC") {
    return TRADE_KINDS.FWC;
  }

  if (prefix === "CC") {
    return TRADE_KINDS.CC;
  }

  if (number === 1) {
    return TRADE_KINDS.NUMBER_ONE;
  }

  return TRADE_KINDS.STANDARD;
}

function kindLabel(kind) {
  return TRADE_KIND_LABELS[kind] || kind;
}

// Percorre um Map de repetidas, filtra pelo predicado e devolve os itens
// ordenados por figurinha. Base comum dos builders de candidatas.
function collectFromRepeated(repeated, accepts, toItem, sortKey = "code") {
  const matches = [];

  repeated.forEach((quantity, code) => {
    if (!accepts(code, quantity)) return;
    matches.push(toItem(code, quantity));
  });

  return matches.sort((a, b) => compareSticker(a[sortKey], b[sortKey]));
}

function expandedMatches(repeated, missing, strategy) {
  return collectFromRepeated(
    repeated,
    (code, quantity) => missing.has(code) && quantity >= 1,
    (code, quantity) => ({ code, kind: stickerKind(code, strategy), quantity }),
  );
}

function buildTrades(userRepeated, userMissing, friendRepeated, friendMissing, strategy = TRADE_STRATEGIES.BRIGHT) {
  if (strategy === TRADE_STRATEGIES.POSSIBILITIES) {
    return [
      ...buildPossibilities(userMissing, friendRepeated, "user", "receive"),
      ...buildPossibilities(friendMissing, userRepeated, "friend", "give"),
    ];
  }

  const pools = tradePools(userRepeated, userMissing, friendRepeated, friendMissing, strategy);
  if (strategy === TRADE_STRATEGIES.DIRECT) {
    return pairPrioritizedTrades(pools.userCanGive, pools.friendCanGive, true);
  }

  if (strategy === TRADE_STRATEGIES.REPEATED) {
    return pairByKindTrades(pools.userCanGive, pools.friendCanGive, true);
  }

  if (strategy === TRADE_STRATEGIES.BRIGHT || strategy === TRADE_STRATEGIES.BRIGHT_SELECTIONS) {
    return pairByKindTrades(pools.userCanGive, pools.friendCanGive, true);
  }

  return strategy === TRADE_STRATEGIES.SAME_NUMBER
    ? pairSameNumberTrades(pools.userCanGive, pools.friendCanGive)
    : pairByKindTrades(pools.userCanGive, pools.friendCanGive);
}

function pairPrioritizedTrades(userCanGive, friendCanGive, spreadCountries = false) {
  const prioritized = pairByKindTrades(userCanGive, friendCanGive, spreadCountries);
  const usedGive = new Set(prioritized.map((trade) => trade.give));
  const usedReceive = new Set(prioritized.map((trade) => trade.receive));
  const remainingUserCandidates = userCanGive.filter((item) => !usedGive.has(item.code));
  const remainingFriendCandidates = friendCanGive.filter((item) => !usedReceive.has(item.code));
  const remainingUser = spreadCountries ? spreadCandidatesByPrefix(remainingUserCandidates) : remainingUserCandidates;
  const remainingFriend = spreadCountries ? spreadCandidatesByPrefix(remainingFriendCandidates) : remainingFriendCandidates;
  const amount = Math.min(remainingUser.length, remainingFriend.length);

  for (let index = 0; index < amount; index += 1) {
    prioritized.push({
      give: remainingUser[index].code,
      receive: remainingFriend[index].code,
      kind: TRADE_KINDS.FREE,
    });
  }

  return prioritized;
}

function buildPossibilities(missing, repeated, seeker, side) {
  return collectFromRepeated(
    repeated,
    (code, quantity) => missing.has(code) && quantity >= 1
      && !ignoredPossibilityNumbers.has(stickerInfo(code).number),
    (code, quantity) => ({ receive: code, quantity, possibility: true, seeker, side }),
    "receive",
  );
}

function tradePools(userRepeated, userMissing, friendRepeated, friendMissing, strategy) {
  if (strategy === TRADE_STRATEGIES.POSSIBILITIES) {
    return {
      userCanGive: buildPossibilities(friendMissing, userRepeated, "friend", "give"),
      friendCanGive: buildPossibilities(userMissing, friendRepeated, "user", "receive"),
    };
  }

  if (strategy === TRADE_STRATEGIES.REPEATED) {
    return {
      userCanGive: expandedMatches(userRepeated, friendMissing, strategy),
      friendCanGive: repeatedTradeReturns(friendRepeated, userRepeated, strategy),
    };
  }

  if (strategy === TRADE_STRATEGIES.BALANCED_REPEATED) {
    return {
      userCanGive: balancedRepeatedReturns(userRepeated, friendRepeated),
      friendCanGive: balancedRepeatedReturns(friendRepeated, userRepeated),
    };
  }

  return {
    userCanGive: expandedMatches(userRepeated, friendMissing, strategy),
    friendCanGive: expandedMatches(friendRepeated, userMissing, strategy),
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

function pairByKindTrades(userCanGive, friendCanGive, spreadCountries = false) {
  const trades = [];

  [
    TRADE_KINDS.FWC,
    TRADE_KINDS.CC,
    TRADE_KINDS.NUMBER_ONE,
    TRADE_KINDS.NUMBER_THIRTEEN,
    TRADE_KINDS.SELECTION_SHINY,
    TRADE_KINDS.STANDARD,
  ].forEach((kind) => {
    const userCandidates = userCanGive.filter((item) => item.kind === kind);
    const friendCandidates = friendCanGive.filter((item) => item.kind === kind);
    const userPool = spreadCountries ? spreadCandidatesByPrefix(userCandidates) : userCandidates;
    const friendPool = spreadCountries ? spreadCandidatesByPrefix(friendCandidates) : friendCandidates;
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

function spreadCandidatesByPrefix(candidates) {
  const groups = new Map();

  candidates.forEach((candidate) => {
    const prefix = stickerInfo(candidate.code).prefix;
    if (!groups.has(prefix)) {
      groups.set(prefix, { prefix, candidates: [], quantityTotal: 0, selected: 0 });
    }
    const group = groups.get(prefix);
    group.candidates.push(candidate);
    group.quantityTotal += candidate.quantity || 1;
  });

  const availableGroups = [...groups.values()].map((group) => ({
    ...group,
    weight: group.quantityTotal / group.candidates.length,
  }));
  const spread = [];

  while (availableGroups.length > 0) {
    availableGroups.sort((a, b) => {
      const pressure = (a.selected / a.weight) - (b.selected / b.weight);
      return pressure || a.prefix.localeCompare(b.prefix);
    });
    const group = availableGroups[0];
    spread.push(group.candidates.shift());
    group.selected += 1;
    if (group.candidates.length === 0) {
      availableGroups.shift();
    }
  }

  return spread;
}

function repeatedTradeReturns(sourceRepeated, targetRepeated, strategy) {
  return collectFromRepeated(
    sourceRepeated,
    (code, quantity) => !targetRepeated.has(code) && quantity >= 1,
    (code, quantity) => ({ code, kind: stickerKind(code, strategy), quantity }),
  );
}

function balancedRepeatedReturns(sourceRepeated, targetRepeated) {
  return collectFromRepeated(
    sourceRepeated,
    (code, quantity) => !targetRepeated.has(code) && quantity >= 2,
    (code) => ({ code, kind: stickerKind(code) }),
  );
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
  pruneIgnoredTradeStickers(parsed);
  const filtered = filterIgnoredTradeStickers(parsed);
  const trades = buildTrades(filtered.userRepeated, filtered.userMissing, filtered.friendRepeated, filtered.friendMissing, selectedStrategy());

  currentTrades = trades;
  hasCompared = true;
  setActionButtonsVisible(true);
  syncUrlNow();
  renderSummary({ ...parsed, trades });
  renderTrades(trades);
}

function pruneIgnoredTradeStickers(parsed) {
  ignoredTradeStickers.forEach(({ code, side }, key) => {
    const source = side === "give" ? parsed.userRepeated : parsed.friendRepeated;
    if (!source.has(code)) {
      ignoredTradeStickers.delete(key);
    }
  });
}

function filterIgnoredTradeStickers(parsed) {
  const filtered = {
    userMissing: new Map(parsed.userMissing),
    userRepeated: new Map(parsed.userRepeated),
    friendMissing: new Map(parsed.friendMissing),
    friendRepeated: new Map(parsed.friendRepeated),
  };

  ignoredTradeStickers.forEach(({ code, side }) => {
    if (side === "give") {
      filtered.userRepeated.delete(code);
    } else {
      filtered.friendRepeated.delete(code);
    }
  });

  return filtered;
}

// Ajusta rótulo do placar, legenda e título do botão de WhatsApp conforme o
// modo; o texto de detalhe varia por chamador e fica fora daqui.
function renderScoreboardChrome(possibilitiesMode) {
  scoreboardLabel.textContent = possibilitiesMode ? "possibilidades encontradas" : "trocas possíveis";
  tradeLegend.hidden = possibilitiesMode;
  copyWhatsAppButton.title = possibilitiesMode
    ? "Copiar lista abaixo para ser enviada por WhatsApp"
    : "Copiar proposta abaixo para ser enviada por WhatsApp";
}

function renderSummary(parsed) {
  const strategy = selectedStrategy();
  const possibilitiesMode = strategy === TRADE_STRATEGIES.POSSIBILITIES;
  userGivesCount.textContent = parsed.trades.length;
  renderScoreboardChrome(possibilitiesMode);
  scoreboardDetail.textContent = possibilitiesMode
    ? "faltam para um lado e estão repetidas com o outro"
    : strategy === TRADE_STRATEGIES.DIRECT
      ? "priorizando brilhantes"
      : "conforme a estratégia selecionada";
  parseSummary.textContent = [
    `${collectorName("user")}: ${parsed.userMissing.size} faltando, ${totalQuantity(parsed.userRepeated)} repetidas`,
    `${collectorName("friend")}: ${parsed.friendMissing.size} faltando, ${totalQuantity(parsed.friendRepeated)} repetidas`,
  ].join(" | ");

  renderResultContext(parsed);
  renderImpactSummary(parsed);
}

function renderResultContext(parsed) {
  const strategy = selectedStrategy();
  const filtered = filterIgnoredTradeStickers(parsed);
  const pools = tradePools(filtered.userRepeated, filtered.userMissing, filtered.friendRepeated, filtered.friendMissing, strategy);

  resultTitle.textContent = resultTitleText(strategy);
  resultDescription.textContent = resultDescriptionText(strategy, pools, parsed.trades.length);
}

function resultTitleText(strategy) {
  return STRATEGY_TEXTS[strategy].title;
}

function resultDescriptionText(strategy, pools, tradeCount) {
  const userCandidates = pools.userCanGive.length;
  const friendCandidates = pools.friendCanGive.length;
  const strategyReason = STRATEGY_TEXTS[strategy].reason;

  if (strategy === TRADE_STRATEGIES.POSSIBILITIES) {
    return tradeCount > 0
      ? `${strategyReason} Foram encontradas ${tradeCount} possibilidade(s).`
      : `${strategyReason} ${noTradeReason(strategy, userCandidates, friendCandidates)}`;
  }

  if (tradeCount > 0) {
    const leftover = Math.max(userCandidates, friendCandidates) - tradeCount;
    if (strategy === TRADE_STRATEGIES.DIRECT) {
      const freeTrades = currentTrades.filter((trade) => trade.kind === TRADE_KINDS.FREE).length;
      return `${strategyReason} Foram selecionadas ${tradeCount} troca(s): ${tradeCount - freeTrades} prioritária(s) e ${freeTrades} livre(s); ${leftover} candidata(s) ficaram sem par.`;
    }
    return `${strategyReason} Foram selecionadas ${tradeCount} troca(s) a partir de ${userCandidates} candidata(s) suas e ${friendCandidates} da outra pessoa; ${leftover} candidata(s) ficaram fora por falta de par compatível.`;
  }

  return `${strategyReason} ${noTradeReason(strategy, userCandidates, friendCandidates)}`;
}

function noTradeReason(strategy, userCandidates, friendCandidates) {
  if (strategy === TRADE_STRATEGIES.POSSIBILITIES) {
    return "Nenhuma figurinha repetida de um lado também aparece na lista de faltantes do outro.";
  }

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

  return "Há candidatas nos dois lados, mas elas ficaram separadas pelas regras da estratégia selecionada.";
}

function renderImpactSummary(parsed) {
  if (selectedStrategy() === TRADE_STRATEGIES.POSSIBILITIES) {
    impactSummary.hidden = true;
    impactSummary.textContent = "";
    return;
  }

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
    `Status após a troca: ${escapeHtml(collectorName("user"))}: ${userMissingAfter} faltando, ${userRepeatedAfter} repetidas`,
    `${escapeHtml(collectorName("friend"))}: ${friendMissingAfter} faltando, ${friendRepeatedAfter} repetidas`,
  ].join(" | ");
}

function strategyUsesUserMissing(strategy) {
  return strategy === TRADE_STRATEGIES.BRIGHT
    || strategy === TRADE_STRATEGIES.BRIGHT_SELECTIONS
    || strategy === TRADE_STRATEGIES.DIRECT
    || strategy === TRADE_STRATEGIES.SAME_NUMBER;
}

function strategyUsesFriendMissing(strategy) {
  return strategy !== TRADE_STRATEGIES.BALANCED_REPEATED;
}

// Títulos das colunas da tabela de resultados, por modo. Fonte única para o
// thead e para os rótulos dos cards em telas estreitas.
function tradeColumnLabels(possibilitiesMode) {
  return possibilitiesMode
    ? ["#", "Figurinha disponível", "Quantidade disponível"]
    : ["#", `${collectorName("user")} entrega`, `${collectorName("friend")} entrega`, "Tipo"];
}

// Toggles de visibilidade e textos dos controles que cercam a tabela.
function updateResultControls(possibilitiesMode, trades, hasIgnored) {
  tradeFooter.hidden = trades.length === 0 && !hasIgnored;
  acceptTradeButton.hidden = trades.length === 0;
  removePossibilitiesButton.hidden = !possibilitiesMode || trades.length === 0;
  acceptTradeButton.textContent = possibilitiesMode ? "Remover das repetidas" : "Troca aceita";
  acceptTradeButton.title = possibilitiesMode
    ? "Remover das listas de repetidas todas as possibilidades exibidas"
    : "Confirmar que a troca foi realizada e atualizar as listas de faltantes e repetidas das duas pessoas";
  renderIgnoredStickers();
  possibilityNumberFilter.hidden = !possibilitiesMode;
  renderIgnoredNumbers();
  updateUndoButtons();
  renderTradeHeader(possibilitiesMode);
}

function renderPossibilityRows(trades) {
  let currentSeeker = "";
  let possibilityIndex = 0;
  trades.forEach((trade) => {
    if (trade.seeker !== currentSeeker) {
      currentSeeker = trade.seeker;
      possibilityIndex = 0;
      const sectionRow = document.createElement("tr");
      sectionRow.className = "possibility-section";
      sectionRow.innerHTML = `<th colspan="3">Figurinhas que ${escapeHtml(collectorName(trade.seeker))} procura</th>`;
      tradeRows.append(sectionRow);
    }
    possibilityIndex += 1;
    const labels = tradeColumnLabels(true);
    const row = document.createElement("tr");
    row.innerHTML = `
      <td class="trade-index">${possibilityIndex}</td>
      <td data-label="${escapeHtml(labels[1])}">${renderTradeSticker(trade.receive, trade.side)}</td>
      <td data-label="${escapeHtml(labels[2])}">${trade.quantity}</td>
    `;
    tradeRows.append(row);
  });
}

function renderTradeRows(trades) {
  const labels = tradeColumnLabels(false);
  trades.forEach((trade, index) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td class="trade-index">${index + 1}</td>
      <td data-label="${escapeHtml(labels[1])}">${renderTradeSticker(trade.give, "give")}</td>
      <td data-label="${escapeHtml(labels[2])}">${renderTradeSticker(trade.receive, "receive")}</td>
      <td data-label="${escapeHtml(labels[3])}"><span class="trade-kind ${trade.kind}">${kindLabel(trade.kind)}</span></td>
    `;
    tradeRows.append(row);
  });
}

function renderTrades(trades) {
  tradeRows.innerHTML = "";
  const possibilitiesMode = selectedStrategy() === TRADE_STRATEGIES.POSSIBILITIES;
  const hasIgnored = ignoredTradeStickers.size > 0;
  updateResultControls(possibilitiesMode, trades, hasIgnored);

  if (trades.length === 0) {
    renderEmptyResults(possibilitiesMode
      ? "Nenhuma possibilidade foi encontrada com estes dados."
      : "Nenhuma troca compatível foi encontrada com estes dados.");
    if (hasIgnored) {
      tableWrap.hidden = false;
    }
    return;
  }

  emptyState.hidden = true;
  tableWrap.hidden = false;

  if (possibilitiesMode) {
    renderPossibilityRows(trades);
  } else {
    renderTradeRows(trades);
  }
}

function renderTradeSticker(code, side) {
  return `
    ${renderSticker(code, `
      <button class="remove-trade-sticker" type="button" data-ignore-code="${escapeHtml(code)}" data-ignore-side="${side}" title="Ignorar esta figurinha no resultado" aria-label="Ignorar ${escapeHtml(displayStickerCode(code))}">x</button>
    `)}
  `;
}

function renderIgnoredStickers() {
  ignoredStickers.innerHTML = "";

  [...ignoredTradeStickers.values()]
    .sort((a, b) => compareSticker(a.code, b.code) || a.side.localeCompare(b.side))
    .forEach(({ code, side }) => {
      const button = document.createElement("button");
      button.className = "ignored-sticker";
      button.type = "button";
      button.dataset.restoreCode = code;
      button.dataset.restoreSide = side;
      button.title = `${side === "give" ? collectorName("user") : collectorName("friend")} possui repetida: voltar esta figurinha para o resultado`;
      button.textContent = displayStickerCode(code);
      ignoredStickers.append(button);
    });
}

function ignoreTradeSticker(code, side) {
  ignoredTradeStickers.set(`${side}:${code}`, { code, side });
  compare();
}

function restoreTradeSticker(code, side) {
  ignoredTradeStickers.delete(`${side}:${code}`);
  compare();
}

function renderIgnoredNumbers() {
  ignoredNumbers.innerHTML = "";

  [...ignoredPossibilityNumbers]
    .sort((a, b) => a - b)
    .forEach((number) => {
      const button = document.createElement("button");
      button.className = "ignored-sticker";
      button.type = "button";
      button.dataset.restoreNumber = String(number);
      button.title = "Voltar este número para as possibilidades";
      button.textContent = `Nº ${number} ✕`;
      ignoredNumbers.append(button);
    });
}

function ignorePossibilityNumber(number) {
  if (!Number.isInteger(number) || number < 0) return;
  ignoredPossibilityNumbers.add(number);
  possibilityNumberInput.value = "";
  compare();
}

function restorePossibilityNumber(number) {
  ignoredPossibilityNumbers.delete(number);
  compare();
}

function sanitizeCollectorName(value) {
  return String(value ?? "").replace(/[\r\n\t]+/g, " ").trim().slice(0, MAX_COLLECTOR_NAME_LENGTH);
}

function collectorName(side) {
  return collectorNames[side] || DEFAULT_COLLECTOR_NAMES[side];
}

function renderCollectorNames() {
  badgeEls.user.badge.textContent = collectorName("user");
  badgeEls.friend.badge.textContent = collectorName("friend");
}

function setCollectorName(side, rawName) {
  const name = sanitizeCollectorName(rawName) || DEFAULT_COLLECTOR_NAMES[side];
  const changed = collectorNames[side] !== name;
  collectorNames[side] = name;
  renderCollectorNames();
  if (!changed) return;
  if (hasFormData()) {
    compare();
  } else {
    syncUrlNow();
  }
}

function startEditCollectorName(side) {
  const { badge, input, edit } = badgeEls[side];
  input.value = collectorName(side);
  badge.hidden = true;
  edit.hidden = true;
  input.hidden = false;
  input.focus();
  input.select();
}

function finishEditCollectorName(side, commit) {
  const { badge, input, edit } = badgeEls[side];
  if (input.hidden) return;
  input.hidden = true;
  badge.hidden = false;
  edit.hidden = false;
  if (commit) setCollectorName(side, input.value);
}

function loadCollectorNames() {
  const params = new URLSearchParams(window.location.search);
  ["user", "friend"].forEach((side) => {
    const raw = params.get(COLLECTOR_NAME_PARAM[side]);
    if (raw == null) return;
    const name = sanitizeCollectorName(raw);
    if (name) collectorNames[side] = name;
  });
  renderCollectorNames();
}

function renderTradeHeader(possibilitiesMode) {
  tradeHeadRow.innerHTML = tradeColumnLabels(possibilitiesMode)
    .map((label) => `<th>${escapeHtml(label)}</th>`)
    .join("");
  tradeFooter.querySelector("td").colSpan = possibilitiesMode ? 3 : 4;
}

function pushUndoSnapshot() {
  acceptedTradeHistory.push({
    strategy: selectedStrategy(),
    values: Object.fromEntries(Object.entries(fields).map(([name, field]) => [name, field.value])),
  });
  if (acceptedTradeHistory.length > MAX_UNDO_TRADES) {
    acceptedTradeHistory.shift();
  }
}

function acceptTrade() {
  if (currentTrades.length === 0) return;

  pushUndoSnapshot();

  const parsed = getParsedInputs();

  if (selectedStrategy() === TRADE_STRATEGIES.POSSIBILITIES) {
    removePossibilities(parsed, false);
    return;
  }

  currentTrades.forEach((trade) => {
    decrementRepeated(parsed.userRepeated, trade.give);
    receiveSticker(parsed.friendMissing, parsed.friendRepeated, trade.give);
    decrementRepeated(parsed.friendRepeated, trade.receive);
    receiveSticker(parsed.userMissing, parsed.userRepeated, trade.receive);
  });

  updateFieldsFromParsed(parsed);
  ignoredTradeStickers.clear();
  handleFormChanged();
}

function removePossibilitiesFromRepeatedAndMissing() {
  if (currentTrades.length === 0 || selectedStrategy() !== TRADE_STRATEGIES.POSSIBILITIES) return;

  pushUndoSnapshot();
  removePossibilities(getParsedInputs(), true);
}

function removePossibilities(parsed, removeMissing) {
  currentTrades.forEach((possibility) => {
    const repeated = possibility.side === "give" ? parsed.userRepeated : parsed.friendRepeated;
    repeated.delete(possibility.receive);
    if (removeMissing) {
      const missing = possibility.seeker === "user" ? parsed.userMissing : parsed.friendMissing;
      missing.delete(possibility.receive);
    }
  });
  updateFieldsFromParsed(parsed);
  handleFormChanged();
}

function updateFieldsFromParsed(parsed) {
  fields.userMissing.value = formatSelectionList(parsed.userMissing, "missing");
  fields.userRepeated.value = formatSelectionList(parsed.userRepeated, "repeated");
  fields.friendMissing.value = formatSelectionList(parsed.friendMissing, "missing");
  fields.friendRepeated.value = formatSelectionList(parsed.friendRepeated, "repeated");
}

function undoLastTrade() {
  const previous = acceptedTradeHistory.pop();
  if (!previous) return;

  Object.entries(previous.values).forEach(([name, value]) => {
    fields[name].value = value;
  });
  setSelectedStrategy(previous.strategy);
  handleFormChanged();
}

function updateUndoButtons(showInEmptyState = false) {
  const hasHistory = acceptedTradeHistory.length > 0;
  const lastActionWasPossibilities = acceptedTradeHistory.at(-1)?.strategy === TRADE_STRATEGIES.POSSIBILITIES;
  const label = lastActionWasPossibilities ? "Desfazer remoção" : "Desfazer última troca";
  const title = lastActionWasPossibilities
    ? "Restaurar as listas para o estado anterior à remoção"
    : "Restaurar as listas para o estado anterior à última troca aceita; até cinco ações podem ser desfeitas";
  undoTradeButton.textContent = label;
  undoTradeButton.title = title;
  undoTradeFooterButton.textContent = label;
  undoTradeFooterButton.title = title;
  undoTradeButton.hidden = !hasHistory || !showInEmptyState;
  undoTradeFooterButton.hidden = !hasHistory;
}

function decrementRepeated(repeated, code) {
  const quantity = repeated.get(code) || 0;
  if (quantity <= 1) {
    repeated.delete(code);
    return;
  }
  repeated.set(code, quantity - 1);
}

function receiveSticker(missing, repeated, code) {
  if (missing.delete(code)) return;
  repeated.set(code, Math.min((repeated.get(code) || 0) + 1, 35));
}

function renderSticker(code, actionMarkup = "") {
  const info = stickerInfo(code);
  const flag = TEAM_BY_CODE[info.prefix]?.flag ? `<span class="sticker-flag" aria-hidden="true">${TEAM_BY_CODE[info.prefix].flag}</span>` : "";
  const name = showNamesToggle.checked ? STICKER_NAMES[code] : "";
  const nameMarkup = name ? `<span class="sticker-name">${escapeHtml(name)}</span>` : "";
  const tooltip = escapeHtml(formatStickerTooltip(code));
  return `
    <span class="sticker-cell">
      <span class="sticker" data-tooltip="${tooltip}" tabindex="0">${flag}<span>${escapeHtml(displayStickerCode(code))}</span>${actionMarkup}</span>
      ${nameMarkup}
    </span>
  `;
}

function formatStickerTooltip(code) {
  const info = stickerInfo(code);
  const flag = TEAM_BY_CODE[info.prefix]?.flag ? `${TEAM_BY_CODE[info.prefix].flag} ` : "";
  const name = STICKER_NAMES[code] || "Nome do cromo não encontrado";
  return `${flag}${displayStickerCode(code)} - ${name}`;
}

function showTradeStickerTooltip(sticker) {
  const text = sticker.dataset.tooltip;
  if (!text) return;

  const rect = sticker.getBoundingClientRect();
  tradeStickerTooltip.textContent = text;
  tradeStickerTooltip.hidden = false;
  const left = rect.left + (rect.width / 2) - (tradeStickerTooltip.offsetWidth / 2);
  tradeStickerTooltip.style.left = `${Math.max(8, Math.min(left, window.innerWidth - tradeStickerTooltip.offsetWidth - 8))}px`;
  // Sem espaço abaixo (fim da viewport/rodapé), o tooltip abre acima.
  const below = rect.bottom + 8;
  const top = below + tradeStickerTooltip.offsetHeight > window.innerHeight - 8
    ? Math.max(8, rect.top - 8 - tradeStickerTooltip.offsetHeight)
    : below;
  tradeStickerTooltip.style.top = `${top}px`;
}

function hideTradeStickerTooltip() {
  tradeStickerTooltip.hidden = true;
}

// Liga hover, toque/clique e teclado do tooltip de figurinhas num container.
function bindStickerTooltip(container) {
  container.addEventListener("mouseup", (event) => {
    if (event.target.closest(".remove-trade-sticker")) return;
    const sticker = event.target.closest(".sticker[data-tooltip]");
    if (!sticker) return;
    showTradeStickerTooltip(sticker);
  });
  container.addEventListener("mouseover", (event) => {
    const sticker = event.target.closest(".sticker[data-tooltip]");
    if (!sticker) return;
    showTradeStickerTooltip(sticker);
  });
  container.addEventListener("mouseout", (event) => {
    if (!event.target.closest(".sticker[data-tooltip]")) return;
    hideTradeStickerTooltip();
  });
  container.addEventListener("focusin", (event) => {
    const sticker = event.target.closest(".sticker[data-tooltip]");
    if (!sticker) return;
    showTradeStickerTooltip(sticker);
  });
  container.addEventListener("focusout", hideTradeStickerTooltip);
}

function formatStickerForMessage(code) {
  const info = stickerInfo(code);
  const flag = TEAM_BY_CODE[info.prefix]?.flag ? `${TEAM_BY_CODE[info.prefix].flag} ` : "";
  const name = showNamesToggle.checked && STICKER_NAMES[code] ? ` - ${STICKER_NAMES[code]}` : "";
  return `${flag}${displayStickerCode(code)}${name}`;
}

function groupedPossibilitiesForMessage(possibilities) {
  const groups = new Map();

  possibilities.forEach(({ receive }) => {
    const { prefix, number } = stickerInfo(receive);
    if (!groups.has(prefix)) {
      groups.set(prefix, []);
    }
    groups.get(prefix).push(prefix === "FWC" && number === 0 ? "00" : String(number));
  });

  return [...groups.entries()].map(([prefix, numbers]) => {
    const flag = TEAM_BY_CODE[prefix]?.flag ? `${TEAM_BY_CODE[prefix].flag} ` : "";
    return `${flag}${prefix}: ${numbers.join(", ")}`;
  });
}

function appendPossibilityMessageSection(lines, title, description, possibilities) {
  if (possibilities.length === 0) return;
  if (lines.length > 0) lines.push("");
  lines.push(`*${title} (${possibilities.length})*`, "", description(possibilities.length), "", "```", ...groupedPossibilitiesForMessage(possibilities), "```");
}

function buildWhatsAppText() {
  if (currentTrades.length === 0) {
    return "";
  }

  if (selectedStrategy() === TRADE_STRATEGIES.POSSIBILITIES) {
    const lines = [];
    appendPossibilityMessageSection(
      lines,
      `Figurinhas que ${collectorName("user")} procura`,
      (count) => `Segue lista das ${count} figurinhas que ${collectorName("user")} procura e ${collectorName("friend")} tem disponível para troca.`,
      currentTrades.filter(({ seeker }) => seeker === "user"),
    );
    appendPossibilityMessageSection(
      lines,
      `Figurinhas que ${collectorName("friend")} procura`,
      (count) => `Segue lista das ${count} figurinhas que ${collectorName("friend")} procura e ${collectorName("user")} tem disponível para troca.`,
      currentTrades.filter(({ seeker }) => seeker === "friend"),
    );
    return lines.join("\n");
  }

  const lines = [
    "*Proposta de troca de figurinhas*",
    "",
    whatsappStrategyText(),
    "",
    `${collectorName("user")} entrega -> ${collectorName("friend")} entrega`,
    "```",
  ];

  currentTrades.forEach((trade, index) => {
    const kind = whatsappKindLabel(trade.kind);
    const kindText = kind ? ` (${kind})` : "";
    lines.push(`${index + 1}. ${formatStickerForMessage(trade.give)} -> ${formatStickerForMessage(trade.receive)}${kindText}`);
  });

  lines.push("```");
  return lines.join("\n");
}

function addUtmParams(url, source, medium) {
  url.searchParams.set("utm_source", source);
  url.searchParams.set("utm_medium", medium);
  url.searchParams.set("utm_campaign", UTM_CAMPAIGN);
  return url;
}

function buildShareUrl(source = "", medium = "") {
  const payload = buildSharePayload();
  const url = new URL(window.location.href);

  url.search = "";
  if (payload) {
    url.searchParams.set(SHARE_PARAM, payload);
  }
  ["user", "friend"].forEach((side) => {
    if (collectorNames[side] !== DEFAULT_COLLECTOR_NAMES[side]) {
      url.searchParams.set(COLLECTOR_NAME_PARAM[side], collectorNames[side]);
    }
  });
  if (source && medium) {
    addUtmParams(url, source, medium);
  }

  return url.toString();
}

function buildSharePayload() {
  return encodeSharePayload(selectedStrategy(), getParsedInputs());
}

function loadSharedComparison() {
  const encoded = new URLSearchParams(window.location.search).get(SHARE_PARAM);
  if (!encoded) return;

  try {
    const { strategy, userMissing, userRepeated, friendMissing, friendRepeated } = decodeSharePayload(encoded);

    showNamesToggle.checked = false;
    setSelectedStrategy(strategy);
    fields.userMissing.value = formatSelectionList(userMissing, "missing");
    fields.userRepeated.value = formatSelectionList(userRepeated, "repeated");
    fields.friendMissing.value = formatSelectionList(friendMissing, "missing");
    fields.friendRepeated.value = formatSelectionList(friendRepeated, "repeated");
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
  return STRATEGY_TEXTS[selectedStrategy()].whatsapp;
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
  const url = buildShareUrl("comparador", "share_link");

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
  const payload = encodeSharePayload(TRADE_STRATEGIES.BRIGHT, {
    userMissing: parsed.userMissing,
    userRepeated: parsed.userRepeated,
    friendMissing: new Map(),
    friendRepeated: new Map(),
  });
  const url = new URL("tabela.html", window.location.href);

  if (payload) {
    url.searchParams.set(SHARE_PARAM, payload);
  }
  addUtmParams(url, "comparador", "tabela");

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
  tradeFooter.hidden = true;
  ignoredTradeStickers.clear();
  renderIgnoredStickers();
  updateUndoButtons();
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
  const possibilitiesMode = strategy === TRADE_STRATEGIES.POSSIBILITIES;
  renderScoreboardChrome(possibilitiesMode);
  scoreboardDetail.textContent = possibilitiesMode
    ? "faltam para um lado e estão repetidas com o outro"
    : "conforme a estratégia selecionada";
  resultTitle.textContent = resultTitleText(strategy);
  resultDescription.textContent = resultDescriptionText(strategy, emptyPools, 0);
  renderTradeHeader(possibilitiesMode);
}

function selectedStrategy() {
  return strategyInputs.find((input) => input.checked)?.value || TRADE_STRATEGIES.BRIGHT;
}

function setSelectedStrategy(strategy = TRADE_STRATEGIES.BRIGHT) {
  const normalizedStrategy = TRADE_STRATEGY_LABELS[strategy] ? strategy : TRADE_STRATEGIES.BRIGHT;
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
  emptyStateMessageElement.textContent = message;
  updateUndoButtons(message === "Nenhuma troca compatível foi encontrada com estes dados."
    || selectedStrategy() === TRADE_STRATEGIES.POSSIBILITIES);
  tableWrap.hidden = true;
}

clearButton.addEventListener("click", clearComparison);
acceptTradeButton.addEventListener("click", acceptTrade);
removePossibilitiesButton.addEventListener("click", removePossibilitiesFromRepeatedAndMissing);
undoTradeButton.addEventListener("click", undoLastTrade);
undoTradeFooterButton.addEventListener("click", undoLastTrade);
tradeRows.addEventListener("click", (event) => {
  const button = event.target.closest("[data-ignore-code][data-ignore-side]");
  if (!button) return;
  ignoreTradeSticker(button.dataset.ignoreCode, button.dataset.ignoreSide);
});
bindStickerTooltip(tradeRows);
ignoredStickers.addEventListener("click", (event) => {
  const button = event.target.closest("[data-restore-code][data-restore-side]");
  if (!button) return;
  restoreTradeSticker(button.dataset.restoreCode, button.dataset.restoreSide);
});
function submitPossibilityNumber() {
  const raw = possibilityNumberInput.value.trim();
  if (raw === "") return;
  ignorePossibilityNumber(Number(raw));
}
ignorePossibilityNumberButton.addEventListener("click", submitPossibilityNumber);
possibilityNumberInput.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  submitPossibilityNumber();
});
ignoredNumbers.addEventListener("click", (event) => {
  const button = event.target.closest("[data-restore-number]");
  if (!button) return;
  restorePossibilityNumber(Number(button.dataset.restoreNumber));
});
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
Object.entries(fields).forEach(([fieldName, field]) => {
  field.addEventListener("paste", (event) => handleFieldPaste(fieldName, event));
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

distributeCombinedPasteButton.addEventListener("click", () => completeCombinedPaste("distribute"));
pasteOnlyHereButton.addEventListener("click", () => completeCombinedPaste("paste"));
closeCombinedPasteButton.addEventListener("click", () => completeCombinedPaste("paste"));

combinedPasteDialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  completeCombinedPaste("paste");
});

combinedPasteDialog.addEventListener("close", () => {
  document.body.classList.remove("dialog-open");
  if (pendingCombinedPaste) completeCombinedPaste("paste");
});

combinedPasteDialog.addEventListener("click", (event) => {
  if (event.target === combinedPasteDialog) completeCombinedPaste("paste");
});

document.addEventListener("click", (event) => {
  if (event.target.closest(".sticker[data-tooltip]")) return;
  hideTradeStickerTooltip();
});

["user", "friend"].forEach((side) => {
  const { input, edit } = badgeEls[side];
  edit.addEventListener("click", () => startEditCollectorName(side));
  input.addEventListener("blur", () => finishEditCollectorName(side, true));
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      finishEditCollectorName(side, true);
    } else if (event.key === "Escape") {
      event.preventDefault();
      finishEditCollectorName(side, false);
    }
  });
});

renderStrategyIntro();
renderEmptyResults(emptyStateMessage());
loadCollectorNames();
loadSharedComparison();
