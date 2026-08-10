(function initInputParser(global) {
  const selectionLineSimple = /(?:^|\s)([A-Z]{2,4})\s*-\s*((?:\d|00).*)$/;
  const selectionLineDecorated = /(?:^|\s)([A-Z]{2,4})\b[^:,-]*:\s*((?:\d|00).*)$/;
  const selectionLineSpaced = /(?:^|\s)([A-Z]{2,4})\s+((?:\d|00).*)$/;
  const selectionLineNamed = /^(.+?):\s*((?:\d|00).*)$/;
  const codedSticker = /\b([A-Z]{2,4})\s*([0-9]{1,2})\b(?:\s*\([xX×]\s*([0-9]+)\))?/gi;
  const inlineCodedSticker = /\b([A-Z]{2,4})\s+([0-9]{1,2})\b/g;
  const selectionSticker = /(\d+)(?:\s*\((?:[xX×]\s*([0-9]+)|([0-9]+)\s*[xX×])\))?/g;
  const zeroStickerAny = /\b00\b(?:\s*\([xX×]\s*([0-9]+)\))?/gi;
  const MAX_REPEATED_QUANTITY = 35;
  const { TEAMS, STICKER_NAMES } = global.STICKER_DATA;
  const { addItem } = global.SHARE_CODEC;
  const teamByCode = Object.fromEntries(TEAMS.map((team) => [team.code, team]));
  const teamPrefixAliases = buildTeamPrefixAliases();

  function parseList(rawText, mode) {
    const items = new Map();
    const text = String(rawText || "")
      .normalize("NFKC")
      .replace(/\bFCW\b/g, "FWC")
      .toUpperCase()
      // Cromos Coca-Cola regionais não fazem parte da coleção modelada.
      .replace(/\bCC-?[A-Z]{2,3}[0-9]{1,2}\b/g, " ");

    text.split(/\r?\n/).forEach((line) => {
      if (!isInlineCodedList(line)) {
        const selectionLine = parseSelectionLine(line);
        if (selectionLine) {
          selectionLine.stickers.forEach(({ number, quantity }) => {
            addParsedItem(items, stickerCode(selectionLine.prefix, number), quantity, mode);
          });
          return;
        }
      }

      for (const match of line.matchAll(codedSticker)) {
        const prefix = normalizePrefix(match[1]);
        if (!teamByCode[prefix]) continue;
        addParsedItem(items, stickerCode(prefix, Number(match[2])), Number(match[3] || 1), mode);
      }

      for (const match of line.matchAll(zeroStickerAny)) {
        addParsedItem(items, "FWC0", Number(match[1] || 1), mode);
      }
    });

    return items;
  }

  function parseCombinedLists(rawText) {
    const sections = { missing: [], repeated: [] };
    let currentSection = null;

    String(rawText || "").split(/\r?\n/).forEach((line) => {
      const sectionLine = parseSectionLine(line);
      if (sectionLine) {
        currentSection = sectionLine.section;
        if (sectionLine.content) sections[currentSection].push(sectionLine.content);
        return;
      }
      if (currentSection) sections[currentSection].push(line);
    });

    const missing = parseList(sections.missing.join("\n"), "missing");
    const repeated = parseList(sections.repeated.join("\n"), "repeated");
    if (missing.size === 0 || repeated.size === 0) return null;
    return { missing, repeated };
  }

  function mergeStickerLists(current, incoming, mode) {
    const merged = new Map();
    [current, incoming].forEach((items) => {
      items.forEach((quantity, code) => {
        if (mode === "missing") {
          merged.set(code, 1);
          return;
        }
        merged.set(code, Math.min((merged.get(code) || 0) + quantity, MAX_REPEATED_QUANTITY));
      });
    });
    return merged;
  }

  function parseSectionLine(line) {
    const rawLine = String(line);
    const match = rawLine.match(
      /^\s*[*_#`]*\s*(FALTANTES|FALTANDO|REPETIDAS|DUPLICADAS|DUPLICADOS)\s*[*_#`]*\s*:?\s*(.*)$/iu,
    );
    if (match) return sectionLine(match[1], match[2]);

    const descriptiveMatch = rawLine.match(
      /\bFIGURINHAS?\s+(FALTANDO|FALTANTES|REPETIDAS|DUPLICADAS|DUPLICADOS)\b/iu,
    );
    if (!descriptiveMatch) return null;
    const colonIndex = rawLine.lastIndexOf(":");
    const content = colonIndex > descriptiveMatch.index ? rawLine.slice(colonIndex + 1) : "";
    return sectionLine(descriptiveMatch[1], content);
  }

  function sectionLine(headingValue, content) {
    const heading = normalizeTeamAlias(headingValue);
    const section = heading === "FALTANTES" || heading === "FALTANDO" ? "missing" : "repeated";
    return { section, content: content.trim() };
  }

  function addParsedItem(items, code, quantity, mode) {
    if (!isValidStickerCode(code)) return;
    if (mode === "missing") {
      items.set(code, 1);
      return;
    }
    addItem(items, code, quantity);
    if (items.has(code)) items.set(code, Math.min(items.get(code), MAX_REPEATED_QUANTITY));
  }

  function isValidStickerCode(code) {
    const match = code.match(/^([A-Z]{2,4})(\d{1,2})$/);
    if (!match || !teamByCode[match[1]]) return false;
    const number = Number(match[2]);
    if (match[1] === "FWC") return number >= 0 && number <= 19;
    if (match[1] === "CC") return number >= 1 && number <= 14;
    return number >= 1 && number <= 20;
  }

  function isInlineCodedList(line) {
    const seen = new Set();
    for (const match of line.matchAll(inlineCodedSticker)) {
      const prefix = normalizePrefix(match[1]);
      if (!teamByCode[prefix]) continue;
      seen.add(prefix);
      if (seen.size >= 2) return true;
    }
    return false;
  }

  function parseSelectionLine(line) {
    const match = [selectionLineSimple, selectionLineDecorated, selectionLineSpaced, selectionLineNamed]
      .map((pattern) => line.match(pattern))
      .find((candidate) => candidate && resolveTeamPrefix(candidate[1]));
    if (!match) return null;

    const stickers = [...match[2].matchAll(selectionSticker)].map((stickerMatch) => ({
      number: Number(stickerMatch[1]),
      quantity: Number(stickerMatch[2] || stickerMatch[3] || 1),
    }));
    if (stickers.length === 0) return null;
    return { prefix: resolveTeamPrefix(match[1]), stickers };
  }

  function normalizePrefix(prefix) {
    return prefix === "FCW" ? "FWC" : prefix;
  }

  function resolveTeamPrefix(value) {
    const prefix = normalizePrefix(String(value).trim());
    if (teamByCode[prefix]) return prefix;
    return teamPrefixAliases.get(normalizeTeamAlias(value)) || null;
  }

  function buildTeamPrefixAliases() {
    const aliases = new Map();
    TEAMS.forEach((team) => {
      addTeamPrefixAlias(aliases, team.code, team.code);
      addTeamPrefixAlias(aliases, team.country, team.code);
      const englishName = englishTeamName(team.code);
      if (englishName) addTeamPrefixAlias(aliases, englishName, team.code);
    });

    [
      ["Holanda", "NED"], ["Holland", "NED"], ["Congo DR", "COD"], ["Curacau", "CUW"],
      ["DR Congo", "COD"], ["Democratic Republic of the Congo", "COD"],
      ["Republica Democratica do Congo", "COD"], ["Rep Democratica do Congo", "COD"],
      ["Czech Republic", "CZE"], ["Turkey", "TUR"], ["Turkiye", "TUR"],
      ["United States", "USA"], ["United States of America", "USA"], ["USA", "USA"],
      ["Coca Cola", "CC"], ["Coca-Cola", "CC"],
    ].forEach(([alias, prefix]) => addTeamPrefixAlias(aliases, alias, prefix));
    return aliases;
  }

  function englishTeamName(prefix) {
    return STICKER_NAMES[`${prefix}1`]?.match(/^Team Logo - (.+)$/)?.[1]
      || STICKER_NAMES[`${prefix}13`]?.match(/^Team Photo - (.+)$/)?.[1]
      || "";
  }

  function addTeamPrefixAlias(aliases, alias, prefix) {
    const normalized = normalizeTeamAlias(alias);
    if (normalized) aliases.set(normalized, prefix);
  }

  function normalizeTeamAlias(value) {
    return String(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim()
      .toUpperCase();
  }

  function stickerCode(prefix, number) {
    return `${prefix}${prefix === "FWC" && number === 0 ? 0 : number}`;
  }

  global.INPUT_PARSER = { parseList, parseCombinedLists, mergeStickerLists };
}(window));
