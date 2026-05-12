"use strict";

function initialState() {
  return {
    version: 13,
    cards: [],
    dice: makeAllLifeDice({ p1: 20, p2: 20 }),
    life: { p1: 20, p2: 20 },
    revealTop: { p1: false, p2: false },
    revealHand: { p1: false, p2: false },
    playmats: { p1: "default-green", p2: "default-blue" },
    flipOverlay: { active: false, front: "", nonce: 0 },
    sleeves: { p1: { type: "og", color: "#6a3b20" }, p2: { type: "og", color: "#6a3b20" } },
    updated: Date.now()
  };
}

function ensureState() {
  if (!state || typeof state !== "object") state = initialState();
  if (!Array.isArray(state.cards)) state.cards = [];
  if (!state.life) state.life = { p1:20, p2:20 };
  if (!Array.isArray(state.dice)) state.dice = makeAllLifeDice(state.life);
  if (!state.revealTop) state.revealTop = { p1:false, p2:false };
  if (!state.revealHand) state.revealHand = { p1:false, p2:false };
  if (!state.sleeves) state.sleeves = { p1: { type: "og", color: "#6a3b20" }, p2: { type: "og", color: "#6a3b20" } };
  for (const player of ["p1", "p2"]) {
    if (!state.sleeves[player]) state.sleeves[player] = { type: "og", color: "#6a3b20" };
    if (!["og", "color"].includes(state.sleeves[player].type)) state.sleeves[player].type = "og";
    if (!state.sleeves[player].color) state.sleeves[player].color = "#6a3b20";
  }
}

function loadDev() {
  try { return { ...devDefaults, ...JSON.parse(localStorage.getItem("oldschoolCleanDevV21") || "{}") }; }
  catch { return { ...devDefaults }; }
}

function saveDev() {
  localStorage.setItem("oldschoolCleanDevV21", JSON.stringify(dev));
}

function push() {
  ensureState();
  state.updated = Date.now();
  render();
  if (window.FirebaseCleanSync) window.FirebaseCleanSync.pushState(clone(state));
}

function applyRemoteState(remote) {
  state = remote || initialState();
  ensureState();
  render();
}

function setLocalSeat(room, player) {
  localRoom = room;
  localPlayer = player;
  document.body.dataset.player = player;
  els.seatScreen.classList.add("hidden");
  els.game.classList.remove("hidden");
  els.roomInfo.textContent = room.toUpperCase() + " / " + player.toUpperCase();
  updateScale();
  render();
}

function tablePoint(clientX, clientY, snapped = true) {
  const rect = els.world.getBoundingClientRect();
  const sx = rect.width / TABLE_W;
  const sy = rect.height / TABLE_H;
  let x = (clientX - rect.left) / sx;
  let y = (clientY - rect.top) / sy;
  if (localPlayer === "p2") {
    x = TABLE_W - x;
    y = TABLE_H - y;
  }
  x = Math.max(0, Math.min(TABLE_W, x));
  y = Math.max(0, Math.min(TABLE_H, y));
  return { x: snapped ? snap(x) : x, y: snapped ? snap(y) : y };
}

function updateScale() {
  const s = Math.min(window.innerWidth / TABLE_W, window.innerHeight / TABLE_H);
  const left = (window.innerWidth - TABLE_W * s) / 2;
  const top = (window.innerHeight - TABLE_H * s) / 2;
  if (localPlayer === "p2") {
    els.world.style.transform = `translate(${left + TABLE_W * s}px, ${top + TABLE_H * s}px) scale(${s}) rotate(180deg)`;
  } else {
    els.world.style.transform = `translate(${left}px, ${top}px) scale(${s})`;
  }
}

window.addEventListener("resize", () => { updateScale(); render(); });

function playerZone(player, suffix) { return `${player}-${suffix}`; }
function ownerCards(player, suffix) {
  ensureState();
  return state.cards.filter(c => c && c.owner === player && c.zone === playerZone(player, suffix));
}
function battlefieldCards() { return state.cards.filter(c => c.zone === "battlefield"); }

function parseDeckList(text) {
  return String(text || "").split(/\r?\n/).map(l => l.trim()).filter(Boolean).flatMap(line => {
    if (line.startsWith("//") || line.startsWith("#")) return [];
    const cleaned = line.replace(/^SB:\s*/i, "").replace(/\s+\([^)]+\)$/g, "").trim();
    const m = cleaned.match(/^(\d+)\s+(.+)$/);
    if (!m) return [];
    return [{ count: Number(m[1]), name: m[2].replace(/\s+\*.*$/, "").trim() }];
  });
}

async function loadDeck() {
  ensureState();
  const entries = parseDeckList(els.deckText.value);
  if (!entries.length) {
    els.deckStatus.textContent = "No valid deck lines.";
    return;
  }
  const player = localPlayer || "p1";
  const unique = [...new Set(entries.map(e => e.name))];
  const map = new Map();
  for (let i = 0; i < unique.length; i++) {
    els.deckStatus.textContent = `Loading ${i + 1}/${unique.length}: ${unique[i]}`;
    const chosenCore = els.coreSetSelect ? els.coreSetSelect.value : "leb";
    const fixedCore = chosenCore === "lea" && /^(volcanic island|circle of protection:\s*black)$/i.test(unique[i]) ? "leb" : chosenCore;
    map.set(unique[i], await fetchPreferredCard(unique[i], fixedCore));
  }
  state.cards = state.cards.filter(c => c.owner !== player);
  const deck = [];
  for (const entry of entries) {
    const data = map.get(entry.name);
    for (let i = 0; i < entry.count; i++) {
      deck.push({
        id: uid(),
        owner: player,
        zone: playerZone(player, "library"),
        x: 960,
        y: player === "p1" ? 760 : 320,
        z: i + 1,
        tapped: false,
        faceDown: false,
        marked: false,
        ...data
      });
    }
  }
  shuffleInPlace(deck);
  state.cards = state.cards.concat(deck);
  els.deckModal.classList.add("hidden");
  els.deckStatus.textContent = "";
  push();
}

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function drawOne(player = localPlayer) {
  const lib = ownerCards(player, "library");
  if (!lib.length) return;
  const card = lib[lib.length - 1];
  flyFromLibraryToHand(player, 1);
  card.zone = playerZone(player, "hand");
  card.tapped = false;
  card.faceDown = false;
  card.marked = false;
  bringToFront(card);
  state.revealTop[player] = false;
  push();
}

function drawMany(player, n) {
  for (let i = 0; i < n; i++) drawOne(player);
}

function shuffleLibrary(player = localPlayer) {
  playShuffleAnimation(player);
  const zone = playerZone(player, "library");
  const lib = state.cards.filter(c => c.zone === zone);
  const rest = state.cards.filter(c => c.zone !== zone);
  shuffleInPlace(lib);
  state.cards = rest.concat(lib);
  state.revealTop[player] = false;
  push();
}

function mulligan(player = localPlayer) {
  if (!confirm("Are you really sure?")) return;
  const handCount = ownerCards(player, "hand").length || 7;
  flyHandToLibrary(player, Math.min(handCount, 7));
  state.cards.forEach(c => {
    if (c.owner === player) {
      c.zone = playerZone(player, "library");
      c.tapped = false;
      c.faceDown = false;
      c.marked = false;
    }
  });
  shuffleInPlace(ownerCards(player, "library"));
  playShuffleAnimation(player);
  setTimeout(() => {
    for (let i = 0; i < 7; i++) {
      const lib = ownerCards(player, "library");
      if (!lib.length) break;
      const card = lib[lib.length - 1];
      card.zone = playerZone(player, "hand");
      card.tapped = false;
      card.faceDown = false;
      bringToFront(card);
    }
    flyFromLibraryToHand(player, 7);
    push();
  }, Math.max(300, Number(dev.shuffleLength) || 1000));
  push();
}

function bringToFront(card) {
  card.z = Math.max(1, ...state.cards.map(c => c.z || 1)) + 1;
}

function sendToBack(card) {
  card.z = 1;
}

function moveCardToZone(card, zone) {
  if (!card) return;

  // Tokens never enter hidden/real card zones. Grave/exile/library delete them.
  if (card.isToken && (zone.endsWith("-grave") || zone.endsWith("-exile") || zone.endsWith("-library"))) {
    state.cards = state.cards.filter(c => c.id !== card.id);
    selectedIds.delete(card.id);
    return;
  }

  // Tokens also cannot be hand cards. Send them to the center of their owner's table side.
  if (card.isToken && zone.endsWith("-hand")) {
    card.zone = "battlefield";
    card.faceDown = false;
    card.x = 960;
    card.y = card.owner === "p1" ? 720 : 360;
    bringToFront(card);
    return;
  }

  card.zone = zone;
  card.tapped = false;
  card.marked = false;
  if (zone.endsWith("-grave") || zone.endsWith("-exile") || zone.endsWith("-library")) {
    state.cards = state.cards.filter(c => c.id !== card.id).concat(card);
  }
}


function setLife(player, nextLife) {
  state.life[player] = Math.max(1, Number(nextLife) || 1);
  state.dice = state.dice.filter(d => !(d.kind === "life" && d.owner === player)).concat(makeLifeDice(player, state.life[player]));
  push();
}

function diceValues(life) {
  life = Math.max(1, Number(life) || 1);
  const vals = [];
  while (life > 5) { vals.push(5); life -= 5; }
  vals.push(life);
  return vals;
}

function makeLifeDice(player, life) {
  return diceValues(life).map((value, i) => ({ id: uid(), kind: "life", owner: player, value, color: "#eeeeee", pipColor: "#111111", z: 1000 + i }));
}

function makeAllLifeDice(life) {
  return makeLifeDice("p1", life.p1 || 20).concat(makeLifeDice("p2", life.p2 || 20));
}

function pileBase(player, kind) {
  const base = {
    p1: {
      library: { x: 1518, y: 698 },
      grave: { x: 1680, y: 698 },
      exile: { x: 1680, y: 638 },
      dice: { x: 1500, y: 552 }
    },
    p2: {
      library: { x: 260, y: 184 },
      grave: { x: 98, y: 184 },
      exile: { x: 98, y: 394 },
      dice: { x: 420, y: 486 }
    }
  };
  const key = player + kind[0].toUpperCase() + kind.slice(1);
  const b = base[player][kind];
  return { x: b.x + (dev[key + "X"] || 0), y: b.y + (dev[key + "Y"] || 0) };
}
