const OLD_SCHOOL_SETS = ["lea", "leb", "2ed", "3ed", "4ed", "arn", "atq", "leg", "drk", "fem"];
const CORE_FALLBACK_ORDER = ["4ed", "3ed", "2ed", "leb", "lea"];

function scryfallCacheKey(name, coreSet = "leb") {
  return "scryfallCard:v36:" + coreSet + ":" + name.toLowerCase();
}

function fallbackCoreSets(coreSet) {
  const idx = CORE_FALLBACK_ORDER.indexOf(coreSet);
  if (idx === -1) return [coreSet];
  return CORE_FALLBACK_ORDER.slice(idx);
}

async function fetchPreferredCard(name, coreSet = "leb") {
  const cacheKey = scryfallCacheKey(name, coreSet);
  const cached = localStorage.getItem(cacheKey);
  if (cached) return JSON.parse(cached);

  const exact = name.replace(/"/g, "\\\"");
  const coreFallbacks = fallbackCoreSets(coreSet);
  const queries = [
    ...coreFallbacks.map(set => `!"${exact}" set:${set} lang:en`),
    `!"${exact}" (${OLD_SCHOOL_SETS.map(s => "set:" + s).join(" OR ")}) lang:en`,
    `!"${exact}" lang:en`
  ];

  for (const q of queries) {
    try {
      const url = "https://api.scryfall.com/cards/search?unique=prints&order=released&q=" + encodeURIComponent(q);
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      if (!data.data || !data.data.length) continue;
      const normalized = normalizeScryfallCard(data.data[0]);
      localStorage.setItem(cacheKey, JSON.stringify(normalized));
      await delay(80);
      return normalized;
    } catch {}
  }

  return {
    scryfallId: "placeholder-" + name,
    name,
    image: "",
    oracle: "",
    typeLine: "Card",
    manaCost: "",
    power: "",
    toughness: "",
    set: "unknown"
  };
}

function normalizeScryfallCard(card) {
  const face = card.card_faces && card.card_faces[0] ? card.card_faces[0] : card;
  return {
    scryfallId: card.id,
    name: card.name,
    image:
      (card.image_uris && (card.image_uris.normal || card.image_uris.large)) ||
      (face.image_uris && (face.image_uris.normal || face.image_uris.large)) || "",
    oracle: face.oracle_text || card.oracle_text || "",
    typeLine: face.type_line || card.type_line || "",
    manaCost: face.mana_cost || "",
    power: face.power || "",
    toughness: face.toughness || "",
    set: card.set
  };
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
