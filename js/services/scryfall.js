const OLD_SCHOOL_SETS = ["lea", "leb", "2ed", "3ed", "4ed", "arn", "atq", "leg", "drk", "fem"];

// Preferred print order. Important: Alpha is not a complete set,
// so Alpha selection must still fall through to Beta / Unlimited / Revised / 4th.
const CORE_SET_ORDERS = {
  lea: ["lea", "leb", "2ed", "3ed", "4ed"],
  leb: ["leb", "lea", "2ed", "3ed", "4ed"],
  "2ed": ["2ed", "leb", "lea", "3ed", "4ed"],
  "3ed": ["3ed", "2ed", "leb", "lea", "4ed"],
  "4ed": ["4ed", "3ed", "2ed", "leb", "lea"]
};

function normalizeCardName(name) {
  return String(name || "")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function scryfallCacheKey(name, coreSet = "leb") {
  // bump cache whenever the search pipeline changes so old placeholders do not stick
  return "scryfallCard:v45:" + coreSet + ":" + normalizeCardName(name).toLowerCase();
}

function preferredSets(coreSet) {
  const core = CORE_SET_ORDERS[coreSet] || CORE_SET_ORDERS.leb;
  const seen = new Set();
  return core
    .concat(OLD_SCHOOL_SETS)
    .filter(set => {
      if (seen.has(set)) return false;
      seen.add(set);
      return true;
    });
}

async function fetchJsonWithRetry(url, tries = 3) {
  let lastError = null;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return await res.json();
      lastError = new Error("HTTP " + res.status);
      // 404 means this exact query failed; no point retrying that exact URL.
      if (res.status === 404) break;
    } catch (err) {
      lastError = err;
    }
    await delay(120 + i * 160);
  }
  throw lastError || new Error("Fetch failed");
}

async function searchExactInSet(exactName, set) {
  const q = `!"${exactName}" set:${set} lang:en`;
  const url = "https://api.scryfall.com/cards/search?unique=prints&order=released&q=" + encodeURIComponent(q);
  const data = await fetchJsonWithRetry(url, 2);
  return data && data.data && data.data.length ? data.data[0] : null;
}

async function searchExactAnyOldSchool(exactName) {
  const q = `!"${exactName}" (${OLD_SCHOOL_SETS.map(s => "set:" + s).join(" OR ")}) lang:en`;
  const url = "https://api.scryfall.com/cards/search?unique=prints&order=released&q=" + encodeURIComponent(q);
  const data = await fetchJsonWithRetry(url, 2);
  return data && data.data && data.data.length ? data.data[0] : null;
}

async function searchNamedFallback(exactName) {
  // Last resort: exact named endpoint can still find cards if search syntax or set filter fails.
  const url = "https://api.scryfall.com/cards/named?exact=" + encodeURIComponent(exactName);
  return await fetchJsonWithRetry(url, 2);
}

async function fetchPreferredCard(name, coreSet = "leb") {
  const cleanName = normalizeCardName(name);
  const cacheKey = scryfallCacheKey(cleanName, coreSet);
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      // Never reuse old placeholder failures.
      if (parsed && parsed.image) return parsed;
    } catch {}
  }

  let found = null;
  const sets = preferredSets(coreSet);

  // 1) Try exact card name in preferred print order.
  for (const set of sets) {
    try {
      found = await searchExactInSet(cleanName.replace(/"/g, "\\\""), set);
      if (found) break;
    } catch {}
    await delay(45);
  }

  // 2) Try any old school print.
  if (!found) {
    try {
      found = await searchExactAnyOldSchool(cleanName.replace(/"/g, "\\\""));
    } catch {}
  }

  // 3) Try exact named endpoint, then normalize from whatever current Scryfall thinks is best.
  if (!found) {
    try {
      found = await searchNamedFallback(cleanName);
    } catch {}
  }

  if (found) {
    const normalized = normalizeScryfallCard(found, cleanName);
    localStorage.setItem(cacheKey, JSON.stringify(normalized));
    await delay(80);
    return normalized;
  }

  const placeholder = {
    scryfallId: "placeholder-" + cleanName,
    name: cleanName,
    image: "",
    oracle: "Image not found. Check spelling or retry deck load.",
    typeLine: "Missing Card",
    manaCost: "",
    power: "",
    toughness: "",
    set: "unknown",
    missingImage: true
  };
  // Do not cache placeholders; a temporary Scryfall/network error should be recoverable.
  return placeholder;
}

function normalizeScryfallCard(card, requestedName = "") {
  const face = card.card_faces && card.card_faces[0] ? card.card_faces[0] : card;
  return {
    scryfallId: card.id,
    name: card.name || requestedName,
    image:
      (card.image_uris && (card.image_uris.normal || card.image_uris.large)) ||
      (face.image_uris && (face.image_uris.normal || face.image_uris.large)) || "",
    oracle: face.oracle_text || card.oracle_text || "",
    typeLine: face.type_line || card.type_line || "",
    manaCost: face.mana_cost || card.mana_cost || "",
    power: face.power || "",
    toughness: face.toughness || "",
    set: card.set || "unknown",
    missingImage: !(
      (card.image_uris && (card.image_uris.normal || card.image_uris.large)) ||
      (face.image_uris && (face.image_uris.normal || face.image_uris.large))
    )
  };
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
