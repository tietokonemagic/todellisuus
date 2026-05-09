const OLD_SCHOOL_SETS = ["lea", "leb", "2ed", "arn", "atq", "leg", "drk", "fem"];

function scryfallCacheKey(name, coreSet) {
  return "scryfallCard:" + coreSet + ":" + name.toLowerCase();
}

async function fetchJsonWithRetry(url, attempts = 5) {
  let lastError = null;

  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, {
        method: "GET",
        mode: "cors",
        cache: "default"
      });

      if (res.status === 429 || res.status >= 500) {
        lastError = new Error("Scryfall temporarily unavailable: HTTP " + res.status);
        await delay(350 + i * 450);
        continue;
      }

      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      lastError = err;
      await delay(350 + i * 450);
    }
  }

  throw lastError || new Error("Scryfall fetch failed");
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

  let lastFetchError = null;

  for (const q of queries) {
    const url = "https://api.scryfall.com/cards/search?unique=prints&order=released&q=" + encodeURIComponent(q);
    try {
      const data = await fetchJsonWithRetry(url, 5);
      if (!data || !data.data || !data.data.length) continue;
      const normalized = normalizeScryfallCard(data.data[0]);
      localStorage.setItem(cacheKey, JSON.stringify(normalized));
      await delay(120);
      return normalized;
    } catch (err) {
      lastFetchError = err;
      await delay(500);
    }
  }

  // Last fallback: Scryfall named endpoint. This ignores old-print preference,
  // but prevents deck loading from failing completely if /cards/search is flaky.
  try {
    const namedUrl = "https://api.scryfall.com/cards/named?exact=" + encodeURIComponent(name);
    const named = await fetchJsonWithRetry(namedUrl, 5);
    if (named && named.name) {
      const normalized = normalizeScryfallCard(named);
      localStorage.setItem(cacheKey, JSON.stringify(normalized));
      await delay(120);
      return normalized;
    }
  } catch (err) {
    lastFetchError = err;
  }

  if (lastFetchError && /Failed to fetch/i.test(String(lastFetchError.message || lastFetchError))) {
    throw new Error("Scryfall connection failed. Try again in a moment. Card: " + name);
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
