const OLD_SCHOOL_SETS = ["lea", "leb", "2ed", "arn", "atq", "leg", "drk", "fem"];

function scryfallCacheKey(name, coreSet) {
  return "scryfallCard:" + coreSet + ":" + name.toLowerCase();
}

async function fetchPreferredCard(name, coreSet) {
  const cacheKey = scryfallCacheKey(name, coreSet);
  const cached = localStorage.getItem(cacheKey);
  if (cached) return JSON.parse(cached);

  const exact = name.replace(/"/g, "\\\"");
  const queries = [
    `!"${exact}" set:${coreSet} lang:en`,
    `!"${exact}" (${OLD_SCHOOL_SETS.map(s => "set:" + s).join(" OR ")}) lang:en`,
    `!"${exact}" lang:en`
  ];

  for (const q of queries) {
    const url = "https://api.scryfall.com/cards/search?unique=prints&order=released&q=" + encodeURIComponent(q);
    const res = await fetch(url);
    if (!res.ok) continue;
    const data = await res.json();
    if (!data.data || !data.data.length) continue;
    const normalized = normalizeScryfallCard(data.data[0]);
    localStorage.setItem(cacheKey, JSON.stringify(normalized));
    await delay(80);
    return normalized;
  }

  throw new Error("Card not found: " + name);
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
