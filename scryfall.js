const OLD_SCHOOL_SETS = ["lea", "leb", "2ed", "arn", "atq", "leg", "drk", "fem"];

function scryfallCacheKey(name, coreSet) {
  return "scryfallCard:" + coreSet + ":" + name.toLowerCase();
}

function fallbackCard(name) {
  const clean = String(name || "Unknown Card").trim() || "Unknown Card";
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="488" height="680" viewBox="0 0 488 680">
      <rect width="488" height="680" rx="28" fill="#111"/>
      <rect x="24" y="24" width="440" height="632" rx="20" fill="#d8c28a"/>
      <rect x="44" y="44" width="400" height="68" rx="8" fill="#f3e7bd"/>
      <text x="64" y="88" font-size="28" font-family="Arial" fill="#111">${clean.replace(/[<>&]/g, "")}</text>
      <rect x="44" y="132" width="400" height="300" rx="8" fill="#333"/>
      <text x="244" y="290" font-size="28" text-anchor="middle" font-family="Arial" fill="#eee">IMAGE MISSING</text>
      <rect x="44" y="456" width="400" height="158" rx="8" fill="#f3e7bd"/>
      <text x="64" y="504" font-size="22" font-family="Arial" fill="#111">${clean.replace(/[<>&]/g, "")}</text>
    </svg>`;
  return {
    scryfallId: "fallback-" + clean.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    name: clean,
    image: "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg),
    oracle: "",
    typeLine: "",
    manaCost: "",
    power: "",
    toughness: "",
    set: "fallback"
  };
}

async function fetchJsonWithTimeout(url, timeoutMs = 10000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return await res.json();
  } finally {
    clearTimeout(id);
  }
}

async function fetchPreferredCard(name, coreSet = "leb") {
  const cacheKey = scryfallCacheKey(name, coreSet);
  const cached = localStorage.getItem(cacheKey);
  if (cached) return JSON.parse(cached);

  const exact = name.replace(/"/g, "\\\"");
  const queries = [
    `!"${exact}" set:${coreSet} lang:en`,
    `!"${exact}" lang:en`,
    `${exact} lang:en`
  ];

  for (const q of queries) {
    const url = "https://api.scryfall.com/cards/search?unique=prints&order=released&q=" + encodeURIComponent(q);
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const data = await fetchJsonWithTimeout(url, 10000);
        if (!data.data || !data.data.length) break;
        const normalized = normalizeScryfallCard(data.data[0]);
        localStorage.setItem(cacheKey, JSON.stringify(normalized));
        await delay(90);
        return normalized;
      } catch (err) {
        await delay(350 + attempt * 550);
      }
    }
  }

  // Never block deck loading completely. The game must still produce a library.
  return fallbackCard(name);
}

function normalizeScryfallCard(card) {
  const face = card.card_faces && card.card_faces[0] ? card.card_faces[0] : card;
  return {
    scryfallId: card.id,
    name: card.name,
    image:
      (card.image_uris && (card.image_uris.normal || card.image_uris.large)) ||
      (face.image_uris && (face.image_uris.normal || face.image_uris.large)),
    oracle: face.oracle_text || card.oracle_text || "",
    typeLine: face.type_line || card.type_line || "",
    manaCost: face.mana_cost || card.mana_cost || "",
    power: face.power || "",
    toughness: face.toughness || "",
    set: card.set
  };
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
