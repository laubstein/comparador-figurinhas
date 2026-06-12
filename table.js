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
const STICKERS_PER_TEAM = 20;
const { TEAMS: ALL_TEAMS, STICKER_NAMES, displayStickerCode } = window.STICKER_DATA;
const TEAMS = ALL_TEAMS.filter(({ code }) => code !== "FWC" && code !== "CC");
const FWC_TEAM = ALL_TEAMS.find(({ code }) => code === "FWC");
const ALBUM_ROWS = [...TEAMS, FWC_TEAM];
const ALBUM_ROW_BY_CODE = Object.fromEntries(ALBUM_ROWS.map((row) => [row.code, row]));

const CODE_PREFIXES = ALL_TEAMS.map(({ code }) => code);

const tableHead = document.querySelector("#albumTableHead");
const tableBody = document.querySelector("#albumTableBody");
const tableColumns = document.querySelector("#albumTableColumns");
const tableSummary = document.querySelector("#tableSummary");
const printButton = document.querySelector("#printButton");
const backToComparator = document.querySelector("#backToComparator");
const stickerTooltip = document.querySelector("#stickerTooltip");
let sortByGroup = false;

function decodeSharedData() {
  const encoded = new URLSearchParams(window.location.search).get(SHARE_PARAM);
  if (!encoded) {
    return { userMissing: new Set(), userRepeated: new Set(), hasData: false };
  }

  const { userMissing, userRepeated } = decodeSharePayload(encoded);
  return {
    userMissing,
    userRepeated,
    hasData: userMissing.size > 0 || userRepeated.size > 0,
  };
}

function decodeSharePayload(encoded) {
  if (encoded.startsWith(SHARE_V2_PREFIX)) {
    const [, userMissing = "", userRepeated = ""] = encoded
      .slice(SHARE_V2_PREFIX.length)
      .split(SHARE_SECTION_SEPARATOR);

    return {
      userMissing: decodeShareSection(userMissing),
      userRepeated: decodeShareSection(userRepeated),
    };
  }

  const [, userMissing = "", userRepeated = ""] = encoded.split(SHARE_SECTION_SEPARATOR);
  return {
    userMissing: decodeCompactSection(userMissing),
    userRepeated: decodeCompactSection(userRepeated),
  };
}

function decodeShareSection(section = "") {
  if (!section) return new Set();
  const items = new Set();

  section.split(SHARE_GROUP_SEPARATOR).forEach((group) => {
    if (decodeLooseShareGroup(group, items)) return;

    const isBitmapGroup = group.includes(SHARE_BITMAP_GROUP_SEPARATOR)
      && (!group.includes(SHARE_GROUP_VALUE_SEPARATOR) || group.indexOf(SHARE_BITMAP_GROUP_SEPARATOR) < group.indexOf(SHARE_GROUP_VALUE_SEPARATOR));
    const separator = isBitmapGroup ? SHARE_BITMAP_GROUP_SEPARATOR : SHARE_GROUP_VALUE_SEPARATOR;
    const parts = group.split(separator);
    const prefixToken = parts.shift();
    const value = parts.join(separator);
    if (prefixToken === SHARE_LOOSE_GROUP && !isBitmapGroup && !isCanonicalSparseShareValue(value)) {
      parts.filter(Boolean).forEach((code) => items.add(code));
      return;
    }

    const prefixIndex = Number.parseInt(prefixToken, 36);
    const prefix = CODE_PREFIXES[prefixIndex];
    if (!prefix || !value) return;

    decodeShareGroup(value, prefix, isBitmapGroup).forEach((number) => {
      items.add(`${prefix}${number}`);
    });
  });

  return items;
}

function decodeShareGroup(value, prefix, isBitmapGroup) {
  if (isBitmapGroup) {
    return decodeBitmapGroup(value, prefix);
  }
  return shareNumbers(value);
}

function decodeBitmapGroup(value, prefix) {
  const [encodedBytes = ""] = value.split(SHARE_BITMAP_GROUP_SEPARATOR);
  const numbers = [];
  const mask = base62Decode(encodedBytes);

  for (let bit = 0; bit < 20; bit += 1) {
    if (!(mask & (1 << bit))) continue;

    const number = bitmapBitToNumber(bit, prefix);
    if (number !== null) numbers.push(number);
  }

  return numbers;
}

function decodeCompactSection(section = "") {
  const items = new Set();
  if (!section) return items;

  section.split(SHARE_GROUP_SEPARATOR).forEach((group) => {
    if (decodeLooseShareGroup(group, items)) return;

    const parts = group.split(SHARE_GROUP_VALUE_SEPARATOR);
    const prefixToken = parts.shift();
    const value = parts.join(SHARE_GROUP_VALUE_SEPARATOR);
    if (prefixToken === SHARE_LOOSE_GROUP && !isCanonicalSparseShareValue(value)) {
      parts.filter(Boolean).forEach((code) => items.add(code));
      return;
    }

    const prefixIndex = Number.parseInt(prefixToken, 36);
    const prefix = CODE_PREFIXES[prefixIndex];
    if (!prefix || !value) return;

    shareNumbers(value).forEach((number) => {
      items.add(`${prefix}${number}`);
    });
  });

  return items;
}

function shareNumbers(value) {
  const numbers = [];

  for (let index = 0; index < value.length; index += 1) {
    if (isShareQuantityChar(value[index]) && index + 1 < value.length) {
      index += 1;
    }

    const number = shareCharToNumber(value[index]);
    if (number !== null) {
      numbers.push(number);
    }
  }

  return numbers;
}

function shareCharToNumber(char) {
  if (char === "0") return 0;
  const index = STICKER_NUMBER_CHARS.indexOf(char);
  return index === -1 ? null : index + 1;
}

function isShareQuantityChar(char) {
  return SHARE_QUANTITY_CHARS.includes(char);
}

function isCanonicalSparseShareValue(value) {
  if (!value || value.includes(SHARE_GROUP_VALUE_SEPARATOR)) return false;

  for (let index = 0; index < value.length; index += 1) {
    if (isShareQuantityChar(value[index])) {
      index += 1;
      if (index >= value.length) return false;
    }
    if (shareCharToNumber(value[index]) === null) return false;
  }

  return true;
}

function decodeLooseShareGroup(group, items) {
  if (!group.startsWith(SHARE_LOOSE_GROUP_PREFIX)) return false;
  group
    .slice(SHARE_LOOSE_GROUP_PREFIX.length)
    .split(SHARE_GROUP_VALUE_SEPARATOR)
    .filter(Boolean)
    .forEach((code) => items.add(code));
  return true;
}

function bitmapBitToNumber(bitIndex, prefix) {
  if (bitIndex < 0 || bitIndex > 19) return null;
  if (prefix === "FWC") return bitIndex;
  return bitIndex + 1;
}

function base62Decode(value) {
  return [...value].reduce((total, char) => {
    const charValue = BASE62_CHARS.indexOf(char);
    return charValue === -1 ? total : (total * 62) + charValue;
  }, 0);
}

function renderTable() {
  const { userMissing, userRepeated, hasData } = decodeSharedData();
  const totalStickers = countAlbumStickers();
  const ownedTotal = countOwnedStickers(userMissing, userRepeated, hasData);
  const repeatedTotal = countTeamCodes(userRepeated);

  tableSummary.textContent = hasData
    ? `Você tem ${ownedTotal} de ${totalStickers} figurinhas da tabela. Repetidas informadas: ${repeatedTotal}.`
    : "Nenhum dado foi recebido. Volte ao comparador, preencha suas figurinhas e gere a tabela novamente.";

  renderHeader();
  renderColumns();
  renderBody(userMissing, userRepeated, hasData);
}

function syncBackLink() {
  const encoded = new URLSearchParams(window.location.search).get(SHARE_PARAM);
  if (!encoded) return;

  const url = new URL("./", window.location.href);
  url.searchParams.set(SHARE_PARAM, encoded);
  backToComparator.href = url.toString();
}

function renderColumns() {
  const columns = ["group", "code", "country", ...Array.from({ length: STICKERS_PER_TEAM }, () => "number")]
    .map((className) => {
      const column = document.createElement("col");
      column.className = `album-col-${className}`;
      return column;
    });
  tableColumns.replaceChildren(...columns);
}

function countOwnedStickers(userMissing, userRepeated, hasData) {
  if (!hasData) return 0;
  let total = 0;
  ALBUM_ROWS.forEach((team) => {
    for (const number of stickerNumbersForTeam(team)) {
      const code = `${team.code}${number}`;
      if (!userMissing.has(code) || userRepeated.has(code)) total += 1;
    }
  });
  return total;
}

function countAlbumStickers() {
  return ALBUM_ROWS.reduce((total, team) => total + stickerNumbersForTeam(team).length, 0);
}

function countTeamCodes(items) {
  let total = 0;
  items.forEach((code) => {
    if (isTeamSticker(code)) total += 1;
  });
  return total;
}

function isTeamSticker(code) {
  const match = code.match(/^([A-Z]{3})(\d{1,2})$/);
  if (!match) return false;
  const number = Number(match[2]);
  const team = ALBUM_ROW_BY_CODE[match[1]];
  return Boolean(team) && stickerNumbersForTeam(team).includes(number);
}

function renderHeader() {
  const row = document.createElement("tr");
  ["Grupo", "Sigla", "País", ...Array.from({ length: STICKERS_PER_TEAM }, (_, index) => index + 1)]
    .forEach((label, index) => {
      const cell = document.createElement("th");
      if (index === 0 || index === 1) {
        const button = document.createElement("button");
        button.className = "table-sort-button";
        button.type = "button";
        button.textContent = index === 0
          ? `Grupo${sortByGroup ? " ↑" : ""}`
          : `Sigla${sortByGroup ? "" : " ↑"}`;
        button.title = index === 0 ? "Ordenar por grupo" : "Ordenar por sigla";
        button.addEventListener("click", () => setGroupSort(index === 0));
        cell.append(button);
      } else {
        cell.textContent = label;
      }
      row.append(cell);
    });
  tableHead.replaceChildren(row);
}

function renderBody(userMissing, userRepeated, hasData) {
  const teams = [...TEAMS].sort(sortByGroup ? compareByGroup : compareByCode).concat(FWC_TEAM);
  const rows = teams.map((team, rowIndex) => {
    const row = document.createElement("tr");
    addTextCell(row, team.group || "-", "group-cell");
    addTextCell(row, team.code, "code-cell");
    addTextCell(row, team.country, "country-cell");

    for (let column = 1; column <= STICKERS_PER_TEAM; column += 1) {
      const number = stickerNumberForColumn(team, column);
      const code = `${team.code}${number}`;
      const cell = document.createElement("td");
      const tooltip = formatStickerTooltip(code, team);
      cell.textContent = number;
      cell.setAttribute("aria-label", tooltip);
      cell.tabIndex = 0;
      cell.dataset.tooltip = tooltip;

      const hasSticker = hasData && (!userMissing.has(code) || userRepeated.has(code));
      if (!hasSticker) {
        cell.className = "album-missing";
      } else {
        cell.className = rowIndex % 2 === 0 ? "album-have-a" : "album-have-b";
      }

      row.append(cell);
    }

    return row;
  });

  tableBody.replaceChildren(...rows);
}

function compareByGroup(a, b) {
  const groupCompare = a.group.localeCompare(b.group);
  return groupCompare || a.code.localeCompare(b.code);
}

function compareByCode(a, b) {
  return a.code.localeCompare(b.code);
}

function stickerNumbersForTeam(team) {
  return Array.from({ length: STICKERS_PER_TEAM }, (_, index) => {
    return team.code === "FWC" ? index : index + 1;
  });
}

function stickerNumberForColumn(team, column) {
  return team.code === "FWC" ? column - 1 : column;
}

function setGroupSort(enabled) {
  sortByGroup = enabled;
  renderTable();
}

function addTextCell(row, text, className) {
  const cell = document.createElement("td");
  cell.className = className;
  cell.textContent = text;
  row.append(cell);
}

function formatStickerTooltip(code, team) {
  const flag = team.flag ? `${team.flag} ` : "";
  const name = STICKER_NAMES[code] || "Nome do cromo não encontrado";
  return `${flag}${displayStickerCode(code)} - ${name}`;
}

function showStickerTooltip(cell) {
  const text = cell.dataset.tooltip;
  if (!text) return;

  const rect = cell.getBoundingClientRect();
  stickerTooltip.textContent = text;
  stickerTooltip.hidden = false;
  const left = rect.left + (rect.width / 2) - (stickerTooltip.offsetWidth / 2);
  stickerTooltip.style.left = `${Math.max(8, Math.min(left, window.innerWidth - stickerTooltip.offsetWidth - 8))}px`;
  stickerTooltip.style.top = `${rect.bottom + 8}px`;
}

function hideStickerTooltip() {
  stickerTooltip.hidden = true;
}

tableBody.addEventListener("click", (event) => {
  const cell = event.target.closest("td[data-tooltip]");
  if (!cell) return;
  showStickerTooltip(cell);
});

tableBody.addEventListener("mouseover", (event) => {
  const cell = event.target.closest("td[data-tooltip]");
  if (!cell) return;
  showStickerTooltip(cell);
});

tableBody.addEventListener("mouseout", (event) => {
  if (!event.target.closest("td[data-tooltip]")) return;
  hideStickerTooltip();
});

tableBody.addEventListener("focusin", (event) => {
  const cell = event.target.closest("td[data-tooltip]");
  if (!cell) return;
  showStickerTooltip(cell);
});

tableBody.addEventListener("focusout", hideStickerTooltip);

document.addEventListener("click", (event) => {
  if (event.target.closest("td[data-tooltip]")) return;
  hideStickerTooltip();
});

printButton.addEventListener("click", () => window.print());
syncBackLink();
renderTable();
