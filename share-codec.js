window.SHARE_CODEC = (() => {
  // Codec do formato de compartilhamento (parâmetro `c`), usado pelo comparador
  // (app.js) e pela tabela (table.js). Links antigos sem prefixo são v1; novos
  // usam o prefixo "2:". Não altere o significado de formatos publicados.
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
  const UTM_CAMPAIGN = "comparador_figurinhas";
  const DEFAULT_SHARE_STRATEGY = "0";

  // A ordem de TEAMS faz parte do formato: cada prefixo é referenciado pelo
  // índice em base36. Nunca reordene TEAMS.
  const CODE_PREFIXES = window.STICKER_DATA.TEAMS.map(({ code }) => code);
  const CODE_PREFIX_INDEX = Object.fromEntries(CODE_PREFIXES.map((prefix, index) => [prefix, index]));
  const IGNORED_CODES = new Set(["BRON", "OURO", "PRAT", "REGU"]);

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

  function compareSticker(a, b) {
    const aInfo = stickerInfo(a);
    const bInfo = stickerInfo(b);
    const prefixCompare = aInfo.prefix.localeCompare(bInfo.prefix);
    if (prefixCompare !== 0) return prefixCompare;
    return (aInfo.number || 0) - (bInfo.number || 0);
  }

  function addItem(items, code, quantity) {
    if (IGNORED_CODES.has(code) || !Number.isFinite(quantity) || quantity < 1) return;
    items.set(code, (items.get(code) || 0) + quantity);
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

  function codeSet(items) {
    return new Set(items.keys());
  }

  function encodeSharePayload(strategy, { userMissing, userRepeated, friendMissing, friendRepeated }) {
    const sections = [
      strategy,
      encodeShareSection(userMissing),
      encodeShareSection(userRepeated),
      encodeShareSection(friendMissing),
      encodeShareSection(friendRepeated),
    ];

    if (sections[0] === DEFAULT_SHARE_STRATEGY && sections.slice(1).every((section) => section === "")) {
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

  return {
    SHARE_PARAM,
    SHARE_V2_PREFIX,
    UTM_CAMPAIGN,
    DEFAULT_SHARE_STRATEGY,
    encodeSharePayload,
    decodeSharePayload,
    codeSet,
    stickerInfo,
    compareSticker,
    groupItems,
    addItem,
  };
})();
