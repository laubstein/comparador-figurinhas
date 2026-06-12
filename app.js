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

const selectionLineSimple = /(?:^|\s)([A-Z]{2,4})\s*-\s*((?:\d|00).*)$/;
const selectionLineDecorated = /(?:^|\s)([A-Z]{2,4})\b[^:,-]*:\s*((?:\d|00).*)$/;
const selectionLineSpaced = /(?:^|\s)([A-Z]{2,4})\s+((?:\d|00).*)$/;
const codedSticker = /\b([A-Z]{2,4})([0-9]{1,2})\b(?:\s*\(x\s*([0-9]+)\))?/gi;
const selectionSticker = /(\d+)(?:\s*\((?:[xX]\s*([0-9]+)|([0-9]+)\s*[xX])\))?/g;
const zeroStickerAny = /\b00\b(?:\s*\(x\s*([0-9]+)\))?/gi;
const { TEAMS, STICKER_NAMES, displayStickerCode } = window.STICKER_DATA;
const TEAM_BY_CODE = Object.fromEntries(TEAMS.map((team) => [team.code, team]));
const CODE_PREFIXES = TEAMS.map(({ code }) => code);
const CODE_PREFIX_INDEX = Object.fromEntries(CODE_PREFIXES.map((prefix, index) => [prefix, index]));
const IGNORED_CODES = new Set(["BRON", "OURO", "PRAT", "REGU"]);
let currentTrades = [];
const ignoredTradeStickers = new Map();
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
const SHARE_PARAM = "c";
const SHARE_SECTION_SEPARATOR = "~";
const SHARE_GROUP_SEPARATOR = "-";
const SHARE_GROUP_VALUE_SEPARATOR = "_";
const SHARE_BITMAP_GROUP_SEPARATOR = ".";
const SHARE_LOOSE_GROUP = "x";
const SHARE_LOOSE_GROUP_PREFIX = `${SHARE_LOOSE_GROUP}${SHARE_GROUP_VALUE_SEPARATOR}${SHARE_GROUP_VALUE_SEPARATOR}`;
const SHARE_V2_PREFIX = "2:";
const BASE62_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const STICKER_NUMBER_CHARS = "abcdefghijklmnopqrst";
const SHARE_QUANTITY_CHARS = "23456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const COPY_WHATSAPP_LABEL = "Copiar para WhatsApp";
const SHARE_COMPARISON_LABEL = "Compartilhar Comparação";
const FEEDBACK_TIMEOUT_MS = 1800;
let urlSyncTimer = null;

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
      if (!TEAM_BY_CODE[prefix]) continue;
      const code = stickerCode(prefix, Number(match[2]));
      const quantity = mode === "repeated" ? Number(match[3] || 1) : 1;
      addItem(items, code, quantity);
    }

    for (const match of line.matchAll(zeroStickerAny)) {
      const quantity = mode === "repeated" ? Number(match[1] || 1) : 1;
      addItem(items, "FWC0", quantity);
    }

  });

  return items;
}

function parseSelectionLine(line) {
  const match = line.match(selectionLineSimple) || line.match(selectionLineDecorated) || line.match(selectionLineSpaced);
  if (!match) return null;
  const prefix = normalizePrefix(match[1]);
  if (!TEAM_BY_CODE[prefix]) return null;

  const stickers = [...match[2].matchAll(selectionSticker)].map((stickerMatch) => ({
    number: Number(stickerMatch[1]),
    quantity: Number(stickerMatch[2] || stickerMatch[3] || 1),
  }));

  if (stickers.length === 0) return null;
  return {
    prefix,
    stickers,
  };
}

function addItem(items, code, quantity) {
  if (IGNORED_CODES.has(code) || !Number.isFinite(quantity) || quantity < 1) return;
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

function expandedMatches(repeated, missing, strategy) {
  const matches = [];

  repeated.forEach((quantity, code) => {
    if (!missing.has(code) || quantity < 1) return;
    matches.push({ code, kind: stickerKind(code, strategy), quantity });
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
  const possibilities = [];

  repeated.forEach((quantity, code) => {
    if (!missing.has(code) || quantity < 1) return;
    possibilities.push({ receive: code, quantity, possibility: true, seeker, side });
  });

  return possibilities.sort((a, b) => compareSticker(a.receive, b.receive));
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
  const matches = [];

  sourceRepeated.forEach((quantity, code) => {
    if (targetRepeated.has(code) || quantity < 1) return;
    matches.push({ code, kind: stickerKind(code, strategy), quantity });
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

function renderSummary(parsed) {
  const strategy = selectedStrategy();
  const possibilitiesMode = strategy === TRADE_STRATEGIES.POSSIBILITIES;
  userGivesCount.textContent = parsed.trades.length;
  scoreboardLabel.textContent = possibilitiesMode ? "possibilidades encontradas" : "trocas possíveis";
  scoreboardDetail.textContent = possibilitiesMode
    ? "faltam para um lado e estão repetidas com o outro"
    : strategy === TRADE_STRATEGIES.DIRECT
      ? "priorizando brilhantes"
      : "conforme a estratégia selecionada";
  tradeLegend.hidden = possibilitiesMode;
  copyWhatsAppButton.title = possibilitiesMode
    ? "Copiar lista abaixo para ser enviada por WhatsApp"
    : "Copiar proposta abaixo para ser enviada por WhatsApp";
  parseSummary.textContent = [
    `Você: ${parsed.userMissing.size} faltando, ${totalQuantity(parsed.userRepeated)} repetidas`,
    `Pessoa: ${parsed.friendMissing.size} faltando, ${totalQuantity(parsed.friendRepeated)} repetidas`,
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
  return {
    [TRADE_STRATEGIES.BRIGHT]: "Proposta de brilhantes",
    [TRADE_STRATEGIES.BRIGHT_SELECTIONS]: "Proposta de brilhantes e seleções",
    [TRADE_STRATEGIES.SAME_NUMBER]: "Proposta por mesmo número",
    [TRADE_STRATEGIES.REPEATED]: "Proposta por repetidas",
    [TRADE_STRATEGIES.BALANCED_REPEATED]: "Proposta por repetidas balanceadas",
    [TRADE_STRATEGIES.POSSIBILITIES]: "Possibilidades encontradas",
    [TRADE_STRATEGIES.DIRECT]: "Proposta direta",
  }[strategy];
}

function resultDescriptionText(strategy, pools, tradeCount) {
  const userCandidates = pools.userCanGive.length;
  const friendCandidates = pools.friendCanGive.length;
  const strategyReason = {
    [TRADE_STRATEGIES.BRIGHT]: "Entram figurinhas repetidas que faltam para o outro lado, mantendo FWC, CC, número 1 e demais figurinhas em seus grupos. O número 13 é tratado como comum.",
    [TRADE_STRATEGIES.BRIGHT_SELECTIONS]: "FWC e figurinhas número 1 podem ser pareadas entre si; figurinhas número 13 só pareiam com outras número 13.",
    [TRADE_STRATEGIES.SAME_NUMBER]: "Entram apenas pares da troca direta com a mesma numeração, mantendo FWC e CC dentro da própria família.",
    [TRADE_STRATEGIES.REPEATED]: "Você entrega repetidas que faltam para a pessoa e recebe repetidas dela que não aparecem na sua lista de repetidas. A seleção distribui as figurinhas entre países e dá mais espaço aos países com maiores quantidades repetidas.",
    [TRADE_STRATEGIES.BALANCED_REPEATED]: "Entram apenas sobras com quantidade 2 ou maior, trocadas por sobras que o outro lado não tem como repetida.",
    [TRADE_STRATEGIES.POSSIBILITIES]: "Entram todas as figurinhas que faltam para um lado e estão na lista de repetidas do outro, sem exigir uma contrapartida.",
    [TRADE_STRATEGIES.DIRECT]: "Primeiro são priorizadas trocas entre FWC, CC, número 1 e demais figurinhas; depois as candidatas restantes são pareadas livremente. Em ambas as etapas, a seleção é distribuída entre países.",
  }[strategy];

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
    `Status após a troca: Você: ${userMissingAfter} faltando, ${userRepeatedAfter} repetidas`,
    `Pessoa: ${friendMissingAfter} faltando, ${friendRepeatedAfter} repetidas`,
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

function renderTrades(trades) {
  tradeRows.innerHTML = "";
  const possibilitiesMode = selectedStrategy() === TRADE_STRATEGIES.POSSIBILITIES;
  const hasIgnored = ignoredTradeStickers.size > 0;
  tradeFooter.hidden = trades.length === 0 && !hasIgnored;
  acceptTradeButton.hidden = trades.length === 0;
  removePossibilitiesButton.hidden = !possibilitiesMode || trades.length === 0;
  acceptTradeButton.textContent = possibilitiesMode ? "Remover das repetidas" : "Troca aceita";
  acceptTradeButton.title = possibilitiesMode
    ? "Remover das listas de repetidas todas as possibilidades exibidas"
    : "Confirmar que a troca foi realizada e atualizar as listas de faltantes e repetidas das duas pessoas";
  renderIgnoredStickers();
  updateUndoButtons();
  renderTradeHeader(possibilitiesMode);

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

  let currentSeeker = "";
  let possibilityIndex = 0;
  trades.forEach((trade, index) => {
    const row = document.createElement("tr");
    if (possibilitiesMode) {
      if (trade.seeker !== currentSeeker) {
        currentSeeker = trade.seeker;
        possibilityIndex = 0;
        const sectionRow = document.createElement("tr");
        sectionRow.className = "possibility-section";
        sectionRow.innerHTML = `<th colspan="3">${trade.seeker === "user" ? "Figurinhas que você procura" : "Figurinhas que a pessoa procura"}</th>`;
        tradeRows.append(sectionRow);
      }
      possibilityIndex += 1;
      row.innerHTML = `
        <td>${possibilityIndex}</td>
        <td>${renderTradeSticker(trade.receive, trade.side)}</td>
        <td>${trade.quantity}</td>
      `;
      tradeRows.append(row);
      return;
    }

    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${renderTradeSticker(trade.give, "give")}</td>
      <td>${renderTradeSticker(trade.receive, "receive")}</td>
      <td><span class="trade-kind ${trade.kind}">${kindLabel(trade.kind)}</span></td>
    `;
    tradeRows.append(row);
  });
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
      button.title = `${side === "give" ? "Você possui repetida" : "Pessoa possui repetida"}: voltar esta figurinha para o resultado`;
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

function renderTradeHeader(possibilitiesMode) {
  tradeHeadRow.innerHTML = possibilitiesMode
    ? "<th>#</th><th>Figurinha disponível</th><th>Quantidade disponível</th>"
    : "<th>#</th><th>Você entrega</th><th>Pessoa entrega</th><th>Tipo</th>";
  tradeFooter.querySelector("td").colSpan = possibilitiesMode ? 3 : 4;
}

function acceptTrade() {
  if (currentTrades.length === 0) return;

  acceptedTradeHistory.push({
    strategy: selectedStrategy(),
    values: Object.fromEntries(Object.entries(fields).map(([name, field]) => [name, field.value])),
  });
  if (acceptedTradeHistory.length > MAX_UNDO_TRADES) {
    acceptedTradeHistory.shift();
  }

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

  acceptedTradeHistory.push({
    strategy: selectedStrategy(),
    values: Object.fromEntries(Object.entries(fields).map(([name, field]) => [name, field.value])),
  });
  if (acceptedTradeHistory.length > MAX_UNDO_TRADES) {
    acceptedTradeHistory.shift();
  }

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
  tradeStickerTooltip.style.top = `${rect.bottom + 8}px`;
}

function hideTradeStickerTooltip() {
  tradeStickerTooltip.hidden = true;
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
      "Figurinhas que estou procurando",
      (count) => `Segue lista das ${count} figurinhas que estou procurando e você tem disponível para troca.`,
      currentTrades.filter(({ seeker }) => seeker === "user"),
    );
    appendPossibilityMessageSection(
      lines,
      "Figurinhas que você está procurando",
      (count) => `Segue lista das ${count} figurinhas que você está procurando e eu tenho disponível para troca.`,
      currentTrades.filter(({ seeker }) => seeker === "friend"),
    );
    return lines.join("\n");
  }

  const lines = [
    "*Proposta de troca de figurinhas*",
    "",
    whatsappStrategyText(),
    "",
    "Eu entrego -> Você entrega",
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
  return buildSharePayloadFromSections(
    selectedStrategy(),
    parsed.userMissing,
    parsed.userRepeated,
    parsed.friendMissing,
    parsed.friendRepeated,
  );
}

function buildSharePayloadFromSections(strategy, userMissing, userRepeated, friendMissing, friendRepeated) {
  const sections = [
    strategy,
    encodeShareSection(userMissing),
    encodeShareSection(userRepeated),
    encodeShareSection(friendMissing),
    encodeShareSection(friendRepeated),
  ];

  if (sections[0] === TRADE_STRATEGIES.BRIGHT && sections.slice(1).every((section) => section === "")) {
    return "";
  }

  return `${SHARE_V2_PREFIX}${sections.join(SHARE_SECTION_SEPARATOR)}`;
}

function encodeShareSection(items) {
  if (items.size === 0) return "";

  const { numericGroups, looseItems } = groupItems(items);
  const groups = [];
  const loose = [];

  numericGroups.forEach((stickers, prefix) => {
    const prefixIndex = CODE_PREFIX_INDEX[prefix];
    if (prefixIndex === undefined) {
      stickers.forEach(({ code }) => loose.push(code));
      return;
    }

    const value = encodeShareGroup(stickers, prefix);
    if (value) {
      groups.push(formatShareGroup(prefixIndex, value));
    }
  });

  looseItems.forEach(({ code }) => loose.push(code));

  if (loose.length > 0) {
    groups.push(`${SHARE_LOOSE_GROUP_PREFIX}${loose.join(SHARE_GROUP_VALUE_SEPARATOR)}`);
  }

  return groups.join(SHARE_GROUP_SEPARATOR);
}

function formatShareGroup(prefixIndex, value) {
  const prefixToken = prefixIndex.toString(36);
  return value.startsWith(SHARE_BITMAP_GROUP_SEPARATOR)
    ? `${prefixToken}${value}`
    : `${prefixToken}${SHARE_GROUP_VALUE_SEPARATOR}${value}`;
}

function encodeShareGroup(stickers, prefix) {
  const sparse = stickers
    .map(({ number, quantity }) => stickerToShareToken(number, quantity))
    .join("");
  const bitmap = encodeBitmapGroup(stickers, prefix);

  return bitmap && bitmap.length < sparse.length ? bitmap : sparse;
}

function encodeBitmapGroup(stickers, prefix) {
  let mask = 0;
  const quantities = [];
  let invalidNumber = false;

  stickers.forEach(({ number, quantity }) => {
    const bitIndex = numberToBitmapBit(number, prefix);
    if (bitIndex === null) {
      invalidNumber = true;
      return;
    }

    mask |= 1 << bitIndex;
    if (quantity > 1) {
      quantities.push(`${numberToShareChar(number)}${quantityToShareChar(quantity)}`);
    }
  });

  if (invalidNumber) return "";

  const encodedBytes = base62EncodeFixed(mask, 4);
  const encodedQuantities = quantities.join("");
  return `${SHARE_BITMAP_GROUP_SEPARATOR}${encodedBytes}${encodedQuantities ? `${SHARE_BITMAP_GROUP_SEPARATOR}${encodedQuantities}` : ""}`;
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
    groups.push(`${SHARE_LOOSE_GROUP_PREFIX}${loose.join(SHARE_GROUP_VALUE_SEPARATOR)}`);
  }

  return groups.join(SHARE_GROUP_SEPARATOR);
}

function decodeCompactSection(section = "") {
  const items = new Map();
  if (!section) return items;

  section.split(SHARE_GROUP_SEPARATOR).forEach((group) => {
    if (decodeLooseShareGroup(group, items)) return;

    const parts = group.split(SHARE_GROUP_VALUE_SEPARATOR);
    const prefixToken = parts.shift();
    const value = parts.join(SHARE_GROUP_VALUE_SEPARATOR);
    if (prefixToken === SHARE_LOOSE_GROUP && !isCanonicalSparseShareValue(value)) {
      parts
        .filter(Boolean)
        .forEach((code) => addItem(items, code, 1));
      return;
    }

    const prefixIndex = Number.parseInt(prefixToken, 36);
    const prefix = CODE_PREFIXES[prefixIndex];
    if (!prefix || !value) return;
    shareTokens(value).forEach(({ number, quantity }) => {
      addItem(items, `${prefix}${number}`, quantity);
    });
  });

  return items;
}

function decodeSharePayload(encoded) {
  if (encoded.startsWith(SHARE_V2_PREFIX)) {
    const [strategy, userMissing = "", userRepeated = "", friendMissing = "", friendRepeated = ""] = encoded
      .slice(SHARE_V2_PREFIX.length)
      .split(SHARE_SECTION_SEPARATOR);

    return {
      strategy,
      userMissing: decodeShareSection(userMissing),
      userRepeated: decodeShareSection(userRepeated),
      friendMissing: decodeShareSection(friendMissing),
      friendRepeated: decodeShareSection(friendRepeated),
    };
  }

  const [strategy, userMissing = "", userRepeated = "", friendMissing = "", friendRepeated = ""] = encoded.split(SHARE_SECTION_SEPARATOR);
  return {
    strategy,
    userMissing: decodeCompactSection(userMissing),
    userRepeated: decodeCompactSection(userRepeated),
    friendMissing: decodeCompactSection(friendMissing),
    friendRepeated: decodeCompactSection(friendRepeated),
  };
}

function decodeShareSection(section = "") {
  if (!section) return new Map();
  const items = new Map();

  section.split(SHARE_GROUP_SEPARATOR).forEach((group) => {
    if (decodeLooseShareGroup(group, items)) return;

    const isBitmapGroup = group.includes(SHARE_BITMAP_GROUP_SEPARATOR)
      && (!group.includes(SHARE_GROUP_VALUE_SEPARATOR) || group.indexOf(SHARE_BITMAP_GROUP_SEPARATOR) < group.indexOf(SHARE_GROUP_VALUE_SEPARATOR));
    const separator = isBitmapGroup ? SHARE_BITMAP_GROUP_SEPARATOR : SHARE_GROUP_VALUE_SEPARATOR;
    const parts = group.split(separator);
    const prefixToken = parts.shift();
    const value = parts.join(separator);
    if (prefixToken === SHARE_LOOSE_GROUP && !isBitmapGroup && !isCanonicalSparseShareValue(value)) {
      parts
        .filter(Boolean)
        .forEach((code) => addItem(items, code, 1));
      return;
    }

    const prefixIndex = Number.parseInt(prefixToken, 36);
    const prefix = CODE_PREFIXES[prefixIndex];
    if (!prefix || !value) return;

    decodeShareGroup(value, prefix, isBitmapGroup).forEach(({ number, quantity }) => {
      addItem(items, `${prefix}${number}`, quantity);
    });
  });

  return items;
}

function decodeShareGroup(value, prefix, isBitmapGroup) {
  if (isBitmapGroup) {
    return decodeBitmapGroup(value, prefix);
  }
  return shareTokens(value);
}

function decodeBitmapGroup(value, prefix) {
  const [encodedBytes = "", encodedQuantities = ""] = value.split(SHARE_BITMAP_GROUP_SEPARATOR);
  const quantities = decodeBitmapGroupQuantities(encodedQuantities);
  const tokens = [];

  const mask = base62Decode(encodedBytes);

  for (let bit = 0; bit < 20; bit += 1) {
    if (!(mask & (1 << bit))) continue;

    const number = bitmapBitToNumber(bit, prefix);
    if (number !== null) {
      tokens.push({ number, quantity: quantities.get(number) || 1 });
    }
  }

  return tokens;
}

function decodeBitmapGroupQuantities(encodedQuantities) {
  const quantities = new Map();

  for (let index = 0; index + 1 < encodedQuantities.length; index += 2) {
    const number = shareCharToNumber(encodedQuantities[index]);
    const quantity = shareCharToQuantity(encodedQuantities[index + 1]);
    if (number !== null && quantity > 1) {
      quantities.set(number, quantity);
    }
  }

  return quantities;
}

function numberToBitmapBit(number, prefix) {
  if (prefix === "FWC") return number >= 0 && number <= 19 ? number : null;
  if (number >= 1 && number <= 20) return number - 1;
  return null;
}

function bitmapBitToNumber(bitIndex, prefix) {
  if (bitIndex < 0 || bitIndex > 19) return null;
  if (prefix === "FWC") return bitIndex;
  return bitIndex + 1;
}

function base62EncodeFixed(value, length) {
  let output = "";
  let remaining = value;

  for (let index = 0; index < length; index += 1) {
    output = BASE62_CHARS[remaining % 62] + output;
    remaining = Math.floor(remaining / 62);
  }

  return output;
}

function base62Decode(value) {
  return [...value].reduce((total, char) => {
    const charValue = BASE62_CHARS.indexOf(char);
    return charValue === -1 ? total : (total * 62) + charValue;
  }, 0);
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

function isCanonicalSparseShareValue(value) {
  if (!value || value.includes(SHARE_GROUP_VALUE_SEPARATOR)) return false;
  const tokens = shareTokens(value);
  return tokens.length > 0
    && tokens.map(({ number, quantity }) => stickerToShareToken(number, quantity)).join("") === value;
}

function decodeLooseShareGroup(group, items) {
  if (!group.startsWith(SHARE_LOOSE_GROUP_PREFIX)) return false;
  group
    .slice(SHARE_LOOSE_GROUP_PREFIX.length)
    .split(SHARE_GROUP_VALUE_SEPARATOR)
    .filter(Boolean)
    .forEach((code) => addItem(items, code, 1));
  return true;
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
  return {
    [TRADE_STRATEGIES.BRIGHT]: "Nesta proposta estou considerando FWC com FWC, CC com CC e número 1 com número 1; o número 13 participa como figurinha comum.",
    [TRADE_STRATEGIES.BRIGHT_SELECTIONS]: "Nesta proposta FWC e número 1 podem ser trocados entre si, enquanto número 13 troca somente com número 13.",
    [TRADE_STRATEGIES.SAME_NUMBER]: "Nesta proposta combinei somente figurinhas com mesmo número.",
    [TRADE_STRATEGIES.REPEATED]: "Nesta proposta estou considerando troca de repetidas, distribuindo a seleção entre países e priorizando os que possuem maiores quantidades repetidas.",
    [TRADE_STRATEGIES.BALANCED_REPEATED]: "Nesta proposta estou considerando troca de repetidas balanceadas: cada pessoa entrega uma sobra que a outra não tem como repetida.",
    [TRADE_STRATEGIES.POSSIBILITIES]: "Nesta lista estou considerando as figurinhas que faltam para um lado e aparecem nas repetidas do outro.",
    [TRADE_STRATEGIES.DIRECT]: "Nesta proposta priorizei FWC, CC e número 1 entre seus grupos, distribuí a seleção entre países e completei as trocas restantes livremente.",
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
  const payload = buildSharePayloadFromSections(
    TRADE_STRATEGIES.BRIGHT,
    parsed.userMissing,
    parsed.userRepeated,
    new Map(),
    new Map(),
  );
  const url = new URL("tabela.html", window.location.href);

  if (payload) {
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
  scoreboardLabel.textContent = possibilitiesMode ? "possibilidades encontradas" : "trocas possíveis";
  scoreboardDetail.textContent = possibilitiesMode
    ? "faltam para um lado e estão repetidas com o outro"
    : "conforme a estratégia selecionada";
  tradeLegend.hidden = possibilitiesMode;
  copyWhatsAppButton.title = possibilitiesMode
    ? "Copiar lista abaixo para ser enviada por WhatsApp"
    : "Copiar proposta abaixo para ser enviada por WhatsApp";
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
tradeRows.addEventListener("mouseup", (event) => {
  if (event.target.closest(".remove-trade-sticker")) return;
  const sticker = event.target.closest(".sticker[data-tooltip]");
  if (!sticker) return;
  showTradeStickerTooltip(sticker);
});
tradeRows.addEventListener("mouseover", (event) => {
  const sticker = event.target.closest(".sticker[data-tooltip]");
  if (!sticker) return;
  showTradeStickerTooltip(sticker);
});
tradeRows.addEventListener("mouseout", (event) => {
  if (!event.target.closest(".sticker[data-tooltip]")) return;
  hideTradeStickerTooltip();
});
tradeRows.addEventListener("focusin", (event) => {
  const sticker = event.target.closest(".sticker[data-tooltip]");
  if (!sticker) return;
  showTradeStickerTooltip(sticker);
});
tradeRows.addEventListener("focusout", hideTradeStickerTooltip);
ignoredStickers.addEventListener("click", (event) => {
  const button = event.target.closest("[data-restore-code][data-restore-side]");
  if (!button) return;
  restoreTradeSticker(button.dataset.restoreCode, button.dataset.restoreSide);
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

document.addEventListener("click", (event) => {
  if (event.target.closest(".sticker[data-tooltip]")) return;
  hideTradeStickerTooltip();
});

renderStrategyIntro();
renderEmptyResults(emptyStateMessage());
loadSharedComparison();
