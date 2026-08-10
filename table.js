const { SHARE_PARAM, UTM_CAMPAIGN, decodeSharePayload, codeSet } = window.SHARE_CODEC;
const STICKERS_PER_TEAM = 20;
const CC_STICKERS = 14;
const { TEAMS: ALL_TEAMS, STICKER_NAMES, displayStickerCode } = window.STICKER_DATA;
const TEAMS = ALL_TEAMS.filter(({ code }) => code !== "FWC" && code !== "CC");
const FWC_TEAM = ALL_TEAMS.find(({ code }) => code === "FWC");
const CC_TEAM = ALL_TEAMS.find(({ code }) => code === "CC");
const SPECIAL_ROWS = [FWC_TEAM, CC_TEAM].filter(Boolean);
const ALBUM_ROWS = [...TEAMS, ...SPECIAL_ROWS];
const ALBUM_ROW_BY_CODE = Object.fromEntries(ALBUM_ROWS.map((row) => [row.code, row]));

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
    userMissing: codeSet(userMissing),
    userRepeated: codeSet(userRepeated),
    hasData: userMissing.size > 0 || userRepeated.size > 0,
  };
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
  url.searchParams.set("utm_source", "tabela");
  url.searchParams.set("utm_medium", "back_link");
  url.searchParams.set("utm_campaign", UTM_CAMPAIGN);
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
  return ALBUM_ROWS.reduce((total, team) => {
    return total + teamProgress(team, userMissing, userRepeated, hasData).owned;
  }, 0);
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
  const match = code.match(/^([A-Z]{2,4})(\d{1,2})$/);
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
  const teams = [...TEAMS].sort(sortByGroup ? compareByGroup : compareByCode).concat(SPECIAL_ROWS);
  const rows = teams.map((team, rowIndex) => {
    const row = document.createElement("tr");
    addTextCell(row, team.group || "-", "group-cell");
    addTextCell(row, team.code, "code-cell");
    addCountryCell(row, team, teamProgress(team, userMissing, userRepeated, hasData));

    for (let column = 1; column <= STICKERS_PER_TEAM; column += 1) {
      const number = stickerNumberForColumn(team, column);
      const cell = document.createElement("td");
      if (number === null) {
        cell.className = "album-empty";
        row.append(cell);
        continue;
      }

      const code = `${team.code}${number}`;
      const tooltip = formatStickerTooltip(code, team);
      cell.textContent = number;
      cell.setAttribute("aria-label", tooltip);
      cell.tabIndex = 0;
      cell.dataset.tooltip = tooltip;

      const hasSticker = ownsSticker(code, userMissing, userRepeated, hasData);
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

function ownsSticker(code, userMissing, userRepeated, hasData) {
  return hasData && (!userMissing.has(code) || userRepeated.has(code));
}

function teamProgress(team, userMissing, userRepeated, hasData) {
  const numbers = stickerNumbersForTeam(team);
  const owned = numbers.reduce((total, number) => {
    const code = `${team.code}${number}`;
    return total + (ownsSticker(code, userMissing, userRepeated, hasData) ? 1 : 0);
  }, 0);
  const total = numbers.length;
  const missing = total - owned;
  const percentage = Math.round((owned / total) * 100);
  const status = percentage === 100 ? "complete" : percentage <= 20 ? "low" : "partial";
  return { owned, missing, total, percentage, status };
}

function compareByGroup(a, b) {
  const groupCompare = a.group.localeCompare(b.group);
  return groupCompare || a.code.localeCompare(b.code);
}

function compareByCode(a, b) {
  return a.code.localeCompare(b.code);
}

function stickerNumbersForTeam(team) {
  const length = team.code === "CC" ? CC_STICKERS : STICKERS_PER_TEAM;
  return Array.from({ length }, (_, index) => {
    return team.code === "FWC" ? index : index + 1;
  });
}

function stickerNumberForColumn(team, column) {
  if (team.code === "CC" && column > CC_STICKERS) return null;
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

function addCountryCell(row, team, progress) {
  const cell = document.createElement("td");
  const tooltip = formatProgressTooltip(progress);
  cell.className = "country-cell";
  cell.tabIndex = 0;
  cell.dataset.tooltip = tooltip;
  cell.setAttribute("aria-label", `${team.country}: ${progress.percentage}% completo. ${tooltip}`);

  const content = document.createElement("span");
  content.className = "country-progress-content";

  const name = document.createElement("span");
  name.className = "country-name";
  name.textContent = team.country;

  const bar = document.createElement("span");
  bar.className = `team-progress team-progress-${progress.status}`;
  bar.setAttribute("role", "progressbar");
  bar.setAttribute("aria-label", `${team.country}: ${progress.percentage}% completo`);
  bar.setAttribute("aria-valuemin", "0");
  bar.setAttribute("aria-valuemax", "100");
  bar.setAttribute("aria-valuenow", String(progress.percentage));

  const fill = document.createElement("span");
  fill.className = "team-progress-fill";
  fill.style.width = `${progress.percentage}%`;
  bar.append(fill);
  content.append(name, bar);
  cell.append(content);
  row.append(cell);
}

function formatProgressTooltip(progress) {
  const verb = progress.missing === 1 ? "Falta" : "Faltam";
  const noun = progress.missing === 1 ? "figurinha" : "figurinhas";
  return `${verb} ${progress.missing} ${noun} de ${progress.total}.`;
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
  // Sem espaço abaixo (fim da viewport/rodapé), o tooltip abre acima.
  const below = rect.bottom + 8;
  const top = below + stickerTooltip.offsetHeight > window.innerHeight - 8
    ? Math.max(8, rect.top - 8 - stickerTooltip.offsetHeight)
    : below;
  stickerTooltip.style.top = `${top}px`;
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
