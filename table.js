const SHARE_PARAM = "c";
const SHARE_SECTION_SEPARATOR = "~";
const SHARE_GROUP_SEPARATOR = "-";
const SHARE_GROUP_VALUE_SEPARATOR = "_";
const SHARE_LOOSE_GROUP = "x";
const STICKER_NUMBER_CHARS = "abcdefghijklmnopqrst";
const STICKERS_PER_TEAM = 20;
const { TEAM_FLAGS, STICKER_NAMES, displayStickerCode } = window.STICKER_DATA;

const TEAMS = [
  { group: "A", code: "CZE", country: "Tchéquia" },
  { group: "A", code: "KOR", country: "Coreia do Sul" },
  { group: "A", code: "MEX", country: "México" },
  { group: "A", code: "RSA", country: "África do Sul" },
  { group: "B", code: "BIH", country: "Bósnia e Herzegovina" },
  { group: "B", code: "CAN", country: "Canadá" },
  { group: "B", code: "QAT", country: "Catar" },
  { group: "B", code: "SUI", country: "Suíça" },
  { group: "C", code: "BRA", country: "Brasil" },
  { group: "C", code: "HAI", country: "Haiti" },
  { group: "C", code: "MAR", country: "Marrocos" },
  { group: "C", code: "SCO", country: "Escócia" },
  { group: "D", code: "AUS", country: "Austrália" },
  { group: "D", code: "PAR", country: "Paraguai" },
  { group: "D", code: "TUR", country: "Turquia" },
  { group: "D", code: "USA", country: "Estados Unidos" },
  { group: "E", code: "CIV", country: "Costa do Marfim" },
  { group: "E", code: "CUW", country: "Curaçao" },
  { group: "E", code: "ECU", country: "Equador" },
  { group: "E", code: "GER", country: "Alemanha" },
  { group: "F", code: "JPN", country: "Japão" },
  { group: "F", code: "NED", country: "Países Baixos" },
  { group: "F", code: "SWE", country: "Suécia" },
  { group: "F", code: "TUN", country: "Tunísia" },
  { group: "G", code: "BEL", country: "Bélgica" },
  { group: "G", code: "EGY", country: "Egito" },
  { group: "G", code: "IRN", country: "Irã" },
  { group: "G", code: "NZL", country: "Nova Zelândia" },
  { group: "H", code: "CPV", country: "Cabo Verde" },
  { group: "H", code: "ESP", country: "Espanha" },
  { group: "H", code: "KSA", country: "Arábia Saudita" },
  { group: "H", code: "URU", country: "Uruguai" },
  { group: "I", code: "FRA", country: "França" },
  { group: "I", code: "IRQ", country: "Iraque" },
  { group: "I", code: "NOR", country: "Noruega" },
  { group: "I", code: "SEN", country: "Senegal" },
  { group: "J", code: "ALG", country: "Argélia" },
  { group: "J", code: "ARG", country: "Argentina" },
  { group: "J", code: "AUT", country: "Áustria" },
  { group: "J", code: "JOR", country: "Jordânia" },
  { group: "K", code: "COD", country: "Rep. Democrática do Congo" },
  { group: "K", code: "COL", country: "Colômbia" },
  { group: "K", code: "POR", country: "Portugal" },
  { group: "K", code: "UZB", country: "Uzbequistão" },
  { group: "L", code: "CRO", country: "Croácia" },
  { group: "L", code: "ENG", country: "Inglaterra" },
  { group: "L", code: "GHA", country: "Gana" },
  { group: "L", code: "PAN", country: "Panamá" },
];
const FWC_TEAM = { group: "-", code: "FWC", country: "FWC" };
const ALBUM_ROWS = [...TEAMS, FWC_TEAM];
const ALBUM_ROW_BY_CODE = Object.fromEntries(ALBUM_ROWS.map((row) => [row.code, row]));

const CODE_PREFIXES = Object.keys(TEAM_FLAGS);

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

  const [, userMissing = "", userRepeated = ""] = encoded.split(SHARE_SECTION_SEPARATOR);
  return {
    userMissing: decodeCompactSection(userMissing),
    userRepeated: decodeCompactSection(userRepeated),
    hasData: Boolean(userMissing || userRepeated),
  };
}

function decodeCompactSection(section = "") {
  const items = new Set();
  if (!section) return items;

  section.split(SHARE_GROUP_SEPARATOR).forEach((group) => {
    const parts = group.split(SHARE_GROUP_VALUE_SEPARATOR);
    const prefixToken = parts.shift();
    if (prefixToken === SHARE_LOOSE_GROUP) {
      parts.filter(Boolean).forEach((code) => items.add(code));
      return;
    }

    const value = parts.join(SHARE_GROUP_VALUE_SEPARATOR);
    const prefixIndex = Number.parseInt(prefixToken, 36);
    const prefix = CODE_PREFIXES[prefixIndex];
    if (!prefix || !value) return;

    [...value]
      .map(shareCharToNumber)
      .filter((number) => number !== null)
      .forEach((number) => items.add(`${prefix}${number}`));
  });

  return items;
}

function shareCharToNumber(char) {
  if (char === "0") return 0;
  const index = STICKER_NUMBER_CHARS.indexOf(char);
  return index === -1 ? null : index + 1;
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
  const flag = TEAM_FLAGS[team.code] ? `${TEAM_FLAGS[team.code]} ` : "";
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
