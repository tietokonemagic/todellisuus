(() => {
  "use strict";

  const TABLE_W = 1920;
  const TABLE_H = 1080;
  const CARD_W = 118;
  const CARD_H = 165;
  const GRID = 4;

  const PIPS = { 1:[5], 2:[1,9], 3:[1,5,9], 4:[1,3,7,9], 5:[1,3,5,7,9], 6:[1,3,4,6,7,9] };

  const els = {};
  [
    "seatScreen","seatStatus","joinR1P1","joinR1P2","joinR2P1","joinR2P2","kickRoom1","kickRoom2",
    "game","viewport","world","pileLayer","cardLayer","diceLayer","myHand","opponentHand",
    "mainMenuBtn","mainMenu","loadDeckBtn","helpBtn","devTuningBtn","resetVoteBtn","leaveBtn","roomInfo",
    "deckModal","deckText","doLoadDeck","closeDeckModal","deckStatus",
    "tutorModal","tutorGrid","tutorToHand","tutorToTable","closeTutor",
    "graveModal","graveGrid","closeGrave","helpModal","closeHelp",
    "libraryMenu","cardMenu","handCardMenu","resetPrompt","acceptReset","rejectReset",
    "inspector","inspectorMinus","inspectorPlus","inspectorName","inspectorType","inspectorOracle",
    "devPanel","devDragHandle","devReset","devCopy","devClose","devOutput"
  ].forEach(id => els[id] = document.getElementById(id));

  let localRoom = null;
  let localPlayer = null;
  let selectedIds = new Set();
  let hoveredCardId = null;
  let hoveredDieId = null;
  let selectedTutorId = null;
  let contextLibraryPlayer = null;
  let contextCardId = null;
  let contextHandCardId = null;
  let drag = null;
  let handFan = { p1: 0, p2: 0 };
  let handDepth = { p1: 1, p2: 1 };
  let inspectorEnabled = true;
  let currentInspectorCardId = null;
  let inspectorFont = 15;

  const devDefaults = {
    "p1LibraryX": 81,
    "p1LibraryY": -106,
    "p1GraveX": 77,
    "p1GraveY": -11,
    "p1ExileX": 77,
    "p1ExileY": -47,
    "p1DiceX": 98,
    "p1DiceY": -2,
    "p2LibraryX": -90,
    "p2LibraryY": 109,
    "p2GraveX": -81,
    "p2GraveY": -142,
    "p2ExileX": -81,
    "p2ExileY": 34,
    "p2DiceX": -249,
    "p2DiceY": 13,
    "graveHeight": 355,
    "exileHeight": 64,
    "dieSize": 33,
    "dieGap": 3,
    "dieRadius": 4,
    "selWidth": 1,
    "selColor": "#755929",
    "shuffleSpeed": 64,
    "shuffleLength": 650,
    "shuffleSpread": 8
};
  let dev = loadDev();

  let state = initialState();

  function uid() { return crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function otherPlayer() { return localPlayer === "p1" ? "p2" : "p1"; }
  function snap(v) { return Math.round(v / GRID) * GRID; }

  function initialState() {
    return {
      version: 13,
      cards: [],
      dice: makeAllLifeDice({ p1: 20, p2: 20 }),
      life: { p1: 20, p2: 20 },
      revealTop: { p1: false, p2: false },
      revealHand: { p1: false, p2: false },
      playmats: { p1: "default-green", p2: "default-blue" },
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
  }

  function loadDev() {
    try { return { ...devDefaults, ...JSON.parse(localStorage.getItem("oldschoolCleanDevV14") || "{}") }; }
    catch { return { ...devDefaults }; }
  }

  function saveDev() {
    localStorage.setItem("oldschoolCleanDevV14", JSON.stringify(dev));
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
      map.set(unique[i], await fetchPreferredCard(unique[i], "leb"));
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
    return diceValues(life).map((value, i) => ({ id: uid(), kind: "life", owner: player, value, z: 1000 + i }));
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

  function render() {
    if (!localPlayer) return;
    ensureState();
    document.documentElement.style.setProperty("--grave-height", `${dev.graveHeight}px`);
    document.documentElement.style.setProperty("--exile-height", `${dev.exileHeight}px`);
    document.documentElement.style.setProperty("--die-size", `${dev.dieSize}px`);
    document.documentElement.style.setProperty("--die-radius", `${dev.dieRadius}px`);
    document.documentElement.style.setProperty("--sel-width", `${dev.selWidth}px`);
    document.documentElement.style.setProperty("--sel-color", dev.selColor);
    renderPiles();
    renderCards();
    renderHands();
    renderDice();
  }

  function renderPiles() {
    els.pileLayer.innerHTML = "";
    for (const player of ["p1", "p2"]) {
      for (const kind of ["library", "grave", "exile"]) {
        const p = pileBase(player, kind);
        const pile = document.createElement("div");
        pile.className = `pile ${kind}`;
        pile.dataset.player = player;
        pile.dataset.kind = kind;
        pile.style.left = p.x + "px";
        pile.style.top = p.y + "px";
        pile.style.height = kind === "grave" ? dev.graveHeight + "px" : kind === "exile" ? dev.exileHeight + "px" : "198px";
        pile.style.transform = player === "p2" ? "rotate(180deg)" : "none";

        if (kind === "library") {
          const visual = document.createElement("div");
          visual.className = "pile-card";
          const top = ownerCards(player, "library").at(-1);
          if (top && (state.revealTop[player])) {
            visual.style.backgroundImage = top.image ? `url("${top.image}")` : 'url("lapi2.png")';
            visual.style.backgroundSize = "cover";
            visual.style.backgroundPosition = "center";
          }
          pile.appendChild(visual);
          pile.addEventListener("dblclick", () => { if (player === localPlayer) drawOne(player); });
          pile.addEventListener("contextmenu", e => { if (player !== localPlayer) return; e.preventDefault(); openLibraryMenu(e, player); });
        } else if (kind === "grave") {
          const box = document.createElement("div");
          box.className = "grave-drop";
          box.textContent = "GRAVE";
          pile.appendChild(box);
        } else {
          const box = document.createElement("div");
          box.className = "exile-box";
          box.textContent = `EXILE ${ownerCards(player, "exile").length}`;
          pile.appendChild(box);
        }

        const count = kind === "library" ? ownerCards(player, "library").length : kind === "grave" ? ownerCards(player, "grave").length : ownerCards(player, "exile").length;
        const label = document.createElement("div");
        label.className = "pile-label";
        label.textContent = `${kind.toUpperCase()} ${count}`;
        pile.appendChild(label);
        els.pileLayer.appendChild(pile);
      }
    }
  }

  function cardRotation(card) {
    const worldRot = localPlayer === "p2" ? 180 : 0;
    const desired = card.owner === localPlayer ? 0 : 180;
    return (desired - worldRot + 360) % 360 + (card.tapped ? 90 : 0);
  }

  function cardVisibleToMe(card) {
    if (!card) return false;
    if (card.zone === otherPlayer() + "-hand" && !state.revealHand[otherPlayer()]) return false;
    if (card.faceDown) return false;
    return true;
  }

  function renderCards() {
    els.cardLayer.innerHTML = "";
    battlefieldCards().sort((a,b) => (a.z || 1) - (b.z || 1)).forEach(card => {
      const el = createCardEl(card, "table-card", card.faceDown);
      el.style.left = (card.x - CARD_W / 2) + "px";
      el.style.top = (card.y - CARD_H / 2) + "px";
      el.style.transform = `rotate(${cardRotation(card)}deg)`;
      el.style.zIndex = String(card.z || 1);
      els.cardLayer.appendChild(el);
    });
    renderGraveStack("p1");
    renderGraveStack("p2");
  }

  function renderGraveStack(player) {
    const cards = ownerCards(player, "grave");
    const base = pileBase(player, "grave");
    cards.slice().reverse().forEach((card, i) => {
      const el = createCardEl(card, "grave-stack-card", card.faceDown);
      el.style.left = (base.x + 71 - CARD_W / 2) + "px";
      el.style.top = (base.y + dev.graveHeight - CARD_H - Math.min(i, 20) * 18) + "px";
      el.style.transform = player === "p2" ? "rotate(180deg)" : "none";
      el.style.zIndex = String(500 - i);
      els.cardLayer.appendChild(el);
    });
  }

  function renderHands() {
    renderHand(localPlayer, els.myHand, true);
    renderHand(otherPlayer(), els.opponentHand, false);
  }

  function renderHand(player, container, own) {
    container.innerHTML = "";
    const hand = ownerCards(player, "hand");
    const count = hand.length;
    const fanValue = handFan[player] || 0;
    const t = Math.max(0, Math.min(1, (fanValue + 100) / 200));
    const spread = (16 + t * 70) * Math.min(1, 11 / Math.max(1, count));
    const start = -((count - 1) * spread) / 2;
    const center = (count - 1) / 2;
    const depth = handDepth[player] || 1;

    hand.forEach((card, index) => {
      const hidden = !own && !state.revealHand[player];
      const el = createCardEl(card, "hand-card", hidden || card.faceDown);
      const rel = index - center;
      const transform = `rotate(${rel * (1.5 + t * 5.5)}deg)`;
      const z = 100 + (depth > 0 ? index : count - index);

      el.style.left = (630 + start + index * spread - CARD_W / 2) + "px";
      el.style.bottom = Math.max(-12, 18 - Math.pow(rel, 2) * (0.8 + t * 2.1)) + "px";
      el.style.transform = transform;
      el.style.zIndex = String(z);
      el.style.setProperty("--hand-z", String(z));
      el.style.setProperty("--hand-transform", transform);

      container.appendChild(el);
    });
  }

  function createCardEl(card, cls, forceBack = false) {
    const el = document.createElement("div");
    el.className = `card ${cls}` + (selectedIds.has(card.id) ? " selected" : "") + (card.marked ? " discard-marked" : "");
    el.dataset.cardId = card.id;

    if (forceBack) {
      const back = document.createElement("div");
      back.className = "back";
      el.appendChild(back);
    } else if (card.image) {
      const img = document.createElement("img");
      img.src = card.image;
      img.alt = card.name;
      img.draggable = false;
      el.appendChild(img);
    } else {
      const back = document.createElement("div");
      back.className = "back";
      back.textContent = card.name || "";
      el.appendChild(back);
    }

    el.addEventListener("mouseenter", () => { hoveredCardId = card.id; showInspector(card); });
    el.addEventListener("mouseleave", () => { if (hoveredCardId === card.id) hoveredCardId = null; hideInspector(); });
    el.addEventListener("pointerdown", e => onCardPointerDown(e, card));
    el.addEventListener("dblclick", e => {
      if (card.zone === "battlefield") {
        e.preventDefault();
        e.stopPropagation();
        toggleTap(card);
      }
    });
    el.addEventListener("click", () => {
      if (card.zone === otherPlayer() + "-hand") {
        card.marked = !card.marked;
        push();
      } else if (card.zone.endsWith("-hand") || card.zone === "battlefield") {
        selectedIds = new Set([card.id]);
        render();
      }
    });
    el.addEventListener("contextmenu", e => {
      e.preventDefault();
      if (card.zone === localPlayer + "-hand") openHandCardMenu(e, card);
      else openCardMenu(e, card);
    });

    return el;
  }

  function toggleTap(card) {
    const targets = selectedIds.has(card.id) && selectedIds.size > 1
      ? state.cards.filter(c => selectedIds.has(c.id) && c.zone === "battlefield")
      : [card];
    const next = !card.tapped;
    targets.forEach(c => c.tapped = next);
    push();
  }

  function renderDice() {
    els.diceLayer.innerHTML = "";
    ensureState();
    for (const player of ["p1","p2"]) {
      const lifeDice = state.dice.filter(d => d.kind === "life" && d.owner === player);
      const expected = diceValues(state.life[player] || 20);
      if (lifeDice.length !== expected.length || lifeDice.reduce((a,d)=>a+Number(d.value||0),0) !== (state.life[player] || 20)) {
        state.dice = state.dice.filter(d => !(d.kind === "life" && d.owner === player)).concat(makeLifeDice(player, state.life[player] || 20));
      }
    }
    for (const player of ["p1","p2"]) {
      const base = pileBase(player, "dice");
      const list = state.dice.filter(d => d.kind === "life" && d.owner === player);
      list.forEach((d, i) => {
        const el = document.createElement("div");
        el.className = "die";
        el.dataset.dieId = d.id;
        el.style.left = (base.x + i * (Number(dev.dieSize) + Number(dev.dieGap))) + "px";
        el.style.top = base.y + "px";
        el.style.transform = d.owner === localPlayer ? "rotate(0deg)" : "rotate(180deg)";
        for (const p of PIPS[Math.max(1, Math.min(6, Number(d.value) || 1))]) {
          const pip = document.createElement("div");
          pip.className = "pip p" + p;
          el.appendChild(pip);
        }
        el.addEventListener("mouseenter", () => hoveredDieId = d.id);
        el.addEventListener("mouseleave", () => { if (hoveredDieId === d.id) hoveredDieId = null; });
        els.diceLayer.appendChild(el);
      });
    }
  }

  function onCardPointerDown(e, card) {
    if (e.button !== 0) return;
    if (card.zone === otherPlayer() + "-hand") return;
    closeMenus();

    const fromZone = card.zone;
    const pointer = tablePoint(e.clientX, e.clientY, false);
    const rect = e.currentTarget.getBoundingClientRect();
    const visualCenter = fromZone !== "battlefield"
      ? tablePoint(rect.left + rect.width / 2, rect.top + rect.height / 2, false)
      : { x: card.x, y: card.y };

    if (!selectedIds.has(card.id)) selectedIds = new Set([card.id]);
    drag = {
      id: card.id,
      fromZone,
      startClientX: e.clientX,
      startClientY: e.clientY,
      offsetX: pointer.x - visualCenter.x,
      offsetY: pointer.y - visualCenter.y,
      originalX: card.x,
      originalY: card.y
    };
    card.x = visualCenter.x;
    card.y = visualCenter.y;
    bringToFront(card);
    document.addEventListener("pointermove", onCardDragMove);
    document.addEventListener("pointerup", onCardDragEnd, { once: true });
  }

  function onCardDragMove(e) {
    if (!drag) return;
    const card = state.cards.find(c => c.id === drag.id);
    if (!card) return;
    const p = tablePoint(e.clientX, e.clientY);
    card.zone = "battlefield";
    card.x = snap(p.x - drag.offsetX);
    card.y = snap(p.y - drag.offsetY);
    render();
  }

  function onCardDragEnd(e) {
    document.removeEventListener("pointermove", onCardDragMove);
    if (!drag) return;
    const card = state.cards.find(c => c.id === drag.id);
    const moved = Math.hypot(e.clientX - drag.startClientX, e.clientY - drag.startClientY);
    if (!card) { drag = null; return; }

    if (moved < 5 && drag.fromZone.endsWith("-hand")) {
      card.zone = drag.fromZone;
      drag = null;
      push();
      return;
    }

    const pile = pileAt(e.clientX, e.clientY);
    if (pile) {
      moveCardToZone(card, pile.player + "-" + pile.kind);
    } else {
      card.zone = "battlefield";
      card.marked = false;
    }

    drag = null;
    push();
  }

  function pileAt(clientX, clientY) {
    const el = document.elementFromPoint(clientX, clientY);
    const pile = el && el.closest ? el.closest(".pile") : null;
    if (!pile) return null;
    return { player: pile.dataset.player, kind: pile.dataset.kind };
  }

  function openLibraryMenu(e, player) {
    contextLibraryPlayer = player;
    els.libraryMenu.style.left = e.clientX + "px";
    els.libraryMenu.style.top = e.clientY + "px";
    els.libraryMenu.classList.remove("hidden");
  }

  function openCardMenu(e, card) {
    contextCardId = card.id;
    els.cardMenu.style.left = e.clientX + "px";
    els.cardMenu.style.top = e.clientY + "px";
    els.cardMenu.classList.remove("hidden");
  }

  function openHandCardMenu(e, card) {
    contextHandCardId = card.id;
    els.handCardMenu.style.left = e.clientX + "px";
    els.handCardMenu.style.top = e.clientY + "px";
    els.handCardMenu.classList.remove("hidden");
  }

  function closeMenus() {
    els.libraryMenu.classList.add("hidden");
    els.cardMenu.classList.add("hidden");
    els.handCardMenu.classList.add("hidden");
  }

  function openTutor() {
    selectedTutorId = null;
    els.tutorGrid.innerHTML = "";
    ownerCards(localPlayer, "library").slice().reverse().forEach(card => {
      const wrap = document.createElement("div");
      wrap.className = "grid-card";
      wrap.dataset.cardId = card.id;
      const img = document.createElement("img");
      img.src = card.image || "lapi2.png";
      wrap.appendChild(img);
      wrap.addEventListener("click", () => {
        selectedTutorId = card.id;
        [...els.tutorGrid.querySelectorAll(".grid-card")].forEach(x => x.classList.toggle("selected", x.dataset.cardId === card.id));
      });
      els.tutorGrid.appendChild(wrap);
    });
    els.tutorModal.classList.remove("hidden");
  }

  function takeTutor(dest) {
    const card = state.cards.find(c => c.id === selectedTutorId);
    if (!card) return;
    if (dest === "hand") card.zone = localPlayer + "-hand";
    else {
      card.zone = "battlefield";
      card.x = 960;
      card.y = localPlayer === "p1" ? 720 : 360;
      bringToFront(card);
    }
    selectedTutorId = null;
    els.tutorModal.classList.add("hidden");
    push();
  }

  function openOpponentGrave() {
    els.graveGrid.innerHTML = "";
    ownerCards(otherPlayer(), "grave").slice().reverse().forEach(card => {
      const wrap = document.createElement("div");
      wrap.className = "grid-card";
      const img = document.createElement("img");
      img.src = card.image || "lapi2.png";
      wrap.appendChild(img);
      els.graveGrid.appendChild(wrap);
    });
    els.graveModal.classList.remove("hidden");
  }

  function showInspector(card) {
    currentInspectorCardId = card ? card.id : null;
    if (!inspectorEnabled) return;
    if (!card || !cardVisibleToMe(card)) {
      clearInspectorContent();
      return;
    }
    els.inspector.classList.remove("hidden");
    els.inspector.classList.add("visible-empty");
    els.inspector.style.fontSize = inspectorFont + "px";
    els.inspectorName.textContent = card.name || "";
    els.inspectorType.textContent = card.typeLine || "";
    els.inspectorOracle.textContent = card.oracle || "";
  }

  function clearInspectorContent() {
    if (!inspectorEnabled) return;
    els.inspector.classList.remove("hidden");
    els.inspector.classList.add("visible-empty");
    els.inspectorName.textContent = "INSPECTOR";
    els.inspectorType.textContent = "";
    els.inspectorOracle.textContent = "Hover a visible card.";
  }

  function hideInspector() {
    currentInspectorCardId = null;
    clearInspectorContent();
  }

  function rectCenter(el) {
    const r = el?.getBoundingClientRect();
    if (!r) return { x: innerWidth / 2, y: innerHeight / 2 };
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  function pileScreenEl(player, kind) {
    return [...document.querySelectorAll(".pile")].find(p => p.dataset.player === player && p.dataset.kind === kind);
  }

  function handScreenEl(player) {
    return player === localPlayer ? els.myHand : els.opponentHand;
  }

  function playShuffleAnimation(player) {
    const libEl = pileScreenEl(player, "library");
    const center = rectCenter(libEl);
    const rect = libEl?.getBoundingClientRect();
    const animW = rect?.width || 142;
    const animH = rect?.height || 198;
    const spread = Number(dev.shuffleSpread) || 30;
    const duration = Number(dev.shuffleLength) || 2000;
    const speed = Number(dev.shuffleSpeed) || 120;
    const cards = [];
    for (let i = 0; i < 5; i++) {
      const el = document.createElement("div");
      el.className = "shuffle-card";
      el.style.setProperty("--anim-card-w", animW + "px");
      el.style.setProperty("--anim-card-h", animH + "px");
      el.style.left = (center.x - animW / 2) + "px";
      el.style.top = (center.y - animH / 2) + "px";
      document.body.appendChild(el);
      cards.push(el);
      let alive = true;
      const tick = () => {
        if (!alive) return;
        const dx = (Math.random() * 2 - 1) * spread;
        const dy = (Math.random() * 2 - 1) * spread;
        const rot = (Math.random() * 2 - 1) * 22;
        el.style.transition = `transform ${speed}ms linear`;
        el.style.transform = `translate(${dx}px,${dy}px) rotate(${rot}deg)`;
        setTimeout(tick, speed);
      };
      tick();
      setTimeout(() => { alive = false; el.remove(); }, duration);
    }
  }

  function fly(from, to, n = 1) {
    for (let i = 0; i < n; i++) {
      const el = document.createElement("div");
      el.className = "fly-card";
      const j = (i - (n - 1) / 2) * 8;
      el.style.left = (from.x - CARD_W / 2 + j) + "px";
      el.style.top = (from.y - CARD_H / 2) + "px";
      document.body.appendChild(el);
      requestAnimationFrame(() => {
        el.style.transition = "transform 260ms ease-in, opacity 260ms ease-in";
        el.style.transform = `translate(${to.x - from.x - j}px, ${to.y - from.y}px) scale(.72) rotate(10deg)`;
        el.style.opacity = ".15";
      });
      setTimeout(() => el.remove(), 330);
    }
  }

  function flyFromLibraryToHand(player, n) {
    fly(rectCenter(pileScreenEl(player, "library")), rectCenter(handScreenEl(player)), n);
  }

  function flyHandToLibrary(player, n) {
    fly(rectCenter(handScreenEl(player)), rectCenter(pileScreenEl(player, "library")), n);
  }

  function moveSelectedHandCard(dir) {
    const id = [...selectedIds][0];
    if (!id) return false;
    const card = state.cards.find(c => c.id === id);
    if (!card || card.zone !== localPlayer + "-hand") return false;
    const hand = ownerCards(localPlayer, "hand");
    const oldIndex = hand.findIndex(c => c.id === id);
    const nextIndex = (oldIndex + dir + hand.length) % hand.length;
    hand.splice(oldIndex, 1);
    hand.splice(nextIndex, 0, card);
    const others = state.cards.filter(c => c.zone !== localPlayer + "-hand");
    state.cards = others.concat(hand);
    push();
    return true;
  }

  function keyMoveHovered(action) {
    const targets = selectedIds.size ? state.cards.filter(c => selectedIds.has(c.id)) : state.cards.filter(c => c.id === hoveredCardId);
    if (!targets.length) return false;
    targets.forEach(card => {
      if (action === "grave") moveCardToZone(card, card.owner + "-grave");
      if (action === "exile") moveCardToZone(card, card.owner + "-exile");
      if (action === "hand") card.zone = card.owner + "-hand";
      if (action === "tap" && card.zone === "battlefield") card.tapped = !card.tapped;
    });
    push();
    return true;
  }

  function onResetVoteChanged(vote) {
    if (!localPlayer) return;
    const other = otherPlayer();
    if (vote[other] && !vote[localPlayer]) els.resetPrompt.classList.remove("hidden");
    else els.resetPrompt.classList.add("hidden");
    if (vote.p1 && vote.p2) {
      state.cards.forEach(c => {
        c.zone = c.owner + "-library";
        c.tapped = false;
        c.faceDown = false;
        c.marked = false;
      });
      shuffleInPlace(ownerCards("p1", "library"));
      shuffleInPlace(ownerCards("p2", "library"));
      state.life = { p1:20, p2:20 };
      state.dice = makeAllLifeDice(state.life);
      if (window.FirebaseCleanSync) window.FirebaseCleanSync.clearResetVote();
      push();
    }
  }

  async function join(room, player) {
    els.seatStatus.textContent = "Joining...";
    try {
      if (!window.FirebaseCleanSync) throw new Error("Firebase sync module not loaded.");
      await window.FirebaseCleanSync.joinRoom(room, player);
    } catch (err) {
      els.seatStatus.textContent = err?.message || String(err);
      console.error(err);
    }
  }

  function bindDev() {
    const names = Object.keys(devDefaults);
    names.forEach(name => {
      const id = "dev" + name[0].toUpperCase() + name.slice(1);
      const input = document.getElementById(id);
      const val = document.getElementById(id + "Val");
      if (!input) return;
      input.value = dev[name];
      if (val) val.textContent = String(dev[name]);
      input.addEventListener("input", () => {
        dev[name] = input.type === "color" ? input.value : Number(input.value);
        if (val) val.textContent = String(dev[name]);
        saveDev();
        render();
      });
    });
    let dragDev = null;
    els.devDragHandle.addEventListener("pointerdown", e => {
      const r = els.devPanel.getBoundingClientRect();
      dragDev = { dx: e.clientX - r.left, dy: e.clientY - r.top };
      els.devPanel.classList.add("dragged");
      e.preventDefault();
    });
    document.addEventListener("pointermove", e => {
      if (!dragDev) return;
      els.devPanel.style.left = Math.max(0, Math.min(innerWidth - 80, e.clientX - dragDev.dx)) + "px";
      els.devPanel.style.top = Math.max(0, Math.min(innerHeight - 40, e.clientY - dragDev.dy)) + "px";
    });
    document.addEventListener("pointerup", () => dragDev = null);
  }

  // UI bindings
  els.joinR1P1.onclick = () => join("room1", "p1");
  els.joinR1P2.onclick = () => join("room1", "p2");
  els.joinR2P1.onclick = () => join("room2", "p1");
  els.joinR2P2.onclick = () => join("room2", "p2");
  els.kickRoom1.onclick = () => window.FirebaseCleanSync?.kickRoom("room1");
  els.kickRoom2.onclick = () => window.FirebaseCleanSync?.kickRoom("room2");

  els.mainMenuBtn.onclick = () => els.mainMenu.classList.toggle("hidden");
  els.loadDeckBtn.onclick = () => els.deckModal.classList.remove("hidden");
  els.closeDeckModal.onclick = () => els.deckModal.classList.add("hidden");
  els.doLoadDeck.onclick = loadDeck;
  els.helpBtn.onclick = () => els.helpModal.classList.remove("hidden");
  els.closeHelp.onclick = () => els.helpModal.classList.add("hidden");
  els.devTuningBtn.onclick = () => els.devPanel.classList.toggle("hidden");
  els.devClose.onclick = () => els.devPanel.classList.add("hidden");
  els.devReset.onclick = () => { dev = { ...devDefaults }; saveDev(); bindDev(); render(); };
  els.devCopy.onclick = async () => { const text = JSON.stringify(dev, null, 2); els.devOutput.value = text; try { await navigator.clipboard.writeText(text); } catch {} };
  els.leaveBtn.onclick = () => window.FirebaseCleanSync?.leaveRoom();
  els.resetVoteBtn.onclick = () => { if (confirm("Are you sure? Other player must also confirm.")) window.FirebaseCleanSync?.voteReset(true); };
  els.acceptReset.onclick = () => window.FirebaseCleanSync?.voteReset(true);
  els.rejectReset.onclick = () => { window.FirebaseCleanSync?.voteReset(false); els.resetPrompt.classList.add("hidden"); };

  els.closeTutor.onclick = () => els.tutorModal.classList.add("hidden");
  els.tutorToHand.onclick = () => takeTutor("hand");
  els.tutorToTable.onclick = () => takeTutor("table");
  els.closeGrave.onclick = () => els.graveModal.classList.add("hidden");

  els.inspectorMinus.onclick = () => { inspectorFont = Math.max(9, inspectorFont - 1); els.inspector.style.fontSize = inspectorFont + "px"; };
  els.inspectorPlus.onclick = () => { inspectorFont = Math.min(28, inspectorFont + 1); els.inspector.style.fontSize = inspectorFont + "px"; };


  document.addEventListener("dblclick", e => {
    const el = e.target.closest?.(".card");
    if (!el) return;
    const card = state.cards.find(c => c.id === el.dataset.cardId);
    if (!card || card.zone !== "battlefield") return;
    e.preventDefault(); e.stopPropagation(); toggleTap(card);
  }, true);

  function moveHandToGraveAndDraw7(player) {
    ownerCards(player, "hand").forEach(c => moveCardToZone(c, player + "-grave"));
    drawMany(player, 7);
  }
  function timetwister(player) {
    state.cards.forEach(c => {
      if (c.owner === player && (c.zone === player + "-hand" || c.zone === player + "-grave")) {
        c.zone = player + "-library"; c.tapped = false; c.faceDown = false; c.marked = false;
      }
    });
    shuffleLibrary(player);
    setTimeout(() => drawMany(player, 7), Number(dev.shuffleLength) || 650);
  }
  function windsOfChange(player) {
    const n = ownerCards(player, "hand").length;
    ownerCards(player, "hand").forEach(c => { c.zone = player + "-library"; c.tapped = false; c.faceDown = false; c.marked = false; });
    shuffleLibrary(player);
    setTimeout(() => drawMany(player, n), Number(dev.shuffleLength) || 650);
  }
  function teferisPuzzleBox(player) {
    const hand = ownerCards(player, "hand");
    const n = hand.length;
    const ids = new Set(hand.map(c => c.id));
    hand.forEach(c => { c.zone = player + "-library"; c.tapped = false; c.faceDown = false; c.marked = false; });
    const bottom = state.cards.filter(c => ids.has(c.id));
    const rest = state.cards.filter(c => !ids.has(c.id));
    state.cards = bottom.concat(rest);
    drawMany(player, n + 1);
  }

  els.libraryMenu.addEventListener("click", e => {
    const a = e.target.closest("button[data-action]")?.dataset.action;
    if (!a) return;
    closeMenus();
    const p = contextLibraryPlayer || localPlayer;
    if (a === "draw") drawOne(p);
    if (a === "shuffle") shuffleLibrary(p);
    if (a === "tutor") openTutor();
    if (a === "mulligan") mulligan(p);
    if (a === "revealTop") { state.revealTop[p] = !state.revealTop[p]; push(); }
    if (a === "revealHand") { state.revealHand[p] = !state.revealHand[p]; push(); }
    if (a === "opponentGrave") openOpponentGrave();
    if (a === "wheelOfFortune") moveHandToGraveAndDraw7(p);
    if (a === "timetwister") timetwister(p);
    if (a === "windOfChange") windsOfChange(p);
    if (a === "puzzleBox") teferisPuzzleBox(p);
  });

  els.cardMenu.addEventListener("click", e => {
    const a = e.target.closest("button[data-card-action]")?.dataset.cardAction;
    const card = state.cards.find(c => c.id === contextCardId);
    if (!a || !card) return;
    if (a === "flip") card.faceDown = !card.faceDown;
    if (a === "hand") card.zone = card.owner + "-hand";
    if (a === "grave") moveCardToZone(card, card.owner + "-grave");
    if (a === "exile") moveCardToZone(card, card.owner + "-exile");
    if (a === "front") bringToFront(card);
    if (a === "back") sendToBack(card);
    closeMenus();
    push();
  });

  els.handCardMenu.addEventListener("click", e => {
    const a = e.target.closest("button[data-hand-action]")?.dataset.handAction;
    const card = state.cards.find(c => c.id === contextHandCardId);
    if (!a || !card) return;
    if (a === "playFaceDown") {
      card.zone = "battlefield";
      card.faceDown = true;
      card.tapped = false;
      card.x = 960;
      card.y = localPlayer === "p1" ? 720 : 360;
      bringToFront(card);
    }
    closeMenus();
    push();
  });

  document.addEventListener("click", e => {
    if (!e.target.closest(".context-menu")) closeMenus();
  });

  window.addEventListener("keydown", e => {
    if (!localPlayer) return;
    if (e.key === "Tab") { e.preventDefault(); drawOne(localPlayer); return; }
    if (e.key === "1") { e.preventDefault(); drawOne(localPlayer); return; }
    if (e.key === "7") { e.preventDefault(); drawMany(localPlayer, 7); return; }
    if (e.key === "ArrowLeft") { if (moveSelectedHandCard(-1)) e.preventDefault(); return; }
    if (e.key === "ArrowRight") { if (moveSelectedHandCard(1)) e.preventDefault(); return; }
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      setLife(localPlayer, (state.life[localPlayer] || 20) + (e.key === "ArrowUp" ? 1 : -1));
      e.preventDefault();
      return;
    }
    const k = e.key.toLowerCase();
    if (k === "d") drawOne(localPlayer);
    if (k === "g") keyMoveHovered("grave");
    if (k === "e") keyMoveHovered("exile");
    if (k === "h") keyMoveHovered("hand");
    if (k === "t") keyMoveHovered("tap");
    if (k === "x") { state.cards.forEach(c => { if (c.owner === localPlayer) c.tapped = false; }); push(); }
  });

  let lastSideWheel = 0;
  els.myHand.addEventListener("wheel", e => {
    e.preventDefault();
    if (!localPlayer) return;

    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      const now = performance.now();
      if (Math.abs(e.deltaX) > 8 && now - lastSideWheel > 120) {
        lastSideWheel = now;
        handDepth[localPlayer] = (handDepth[localPlayer] || 1) * -1;
        renderHands();
      }
    } else {
      handFan[localPlayer] = (handFan[localPlayer] || 0) + (e.deltaY < 0 ? 12 : -12);
      handFan[localPlayer] = Math.max(-100, Math.min(100, handFan[localPlayer]));
      renderHands();
    }
  }, { passive: false });

  function bindInspectorPanel() {
    const saved = (() => {
      try { return JSON.parse(localStorage.getItem("oldschoolInspectorPanelV15") || "{}"); }
      catch { return {}; }
    })();

    if (saved.left != null) els.inspector.style.left = saved.left + "px";
    if (saved.top != null) els.inspector.style.top = saved.top + "px";
    if (saved.width != null) els.inspector.style.width = saved.width + "px";
    if (saved.height != null) els.inspector.style.height = saved.height + "px";

    let dragInspector = null;
    els.inspectorName.addEventListener("pointerdown", e => {
      if (!inspectorEnabled) return;
      const r = els.inspector.getBoundingClientRect();
      dragInspector = { dx: e.clientX - r.left, dy: e.clientY - r.top };
      els.inspector.classList.add("dragging-inspector");
      e.preventDefault();
    });

    document.addEventListener("pointermove", e => {
      if (!dragInspector) return;
      const left = Math.max(0, Math.min(window.innerWidth - 80, e.clientX - dragInspector.dx));
      const top = Math.max(0, Math.min(window.innerHeight - 40, e.clientY - dragInspector.dy));
      els.inspector.style.left = left + "px";
      els.inspector.style.top = top + "px";
      els.inspector.style.right = "auto";
      els.inspector.style.bottom = "auto";
    });

    document.addEventListener("pointerup", () => {
      if (!dragInspector) return;
      dragInspector = null;
      els.inspector.classList.remove("dragging-inspector");
      saveInspectorPanel();
    });

    new ResizeObserver(() => {
      if (inspectorEnabled) saveInspectorPanel();
    }).observe(els.inspector);

    clearInspectorContent();
  }

  function saveInspectorPanel() {
    const r = els.inspector.getBoundingClientRect();
    localStorage.setItem("oldschoolInspectorPanelV15", JSON.stringify({
      left: Math.round(r.left),
      top: Math.round(r.top),
      width: Math.round(r.width),
      height: Math.round(r.height)
    }));
  }

  if (document.getElementById("inspectorToggleBtn")) {
    document.getElementById("inspectorToggleBtn").onclick = () => {
      inspectorEnabled = !inspectorEnabled;
      if (inspectorEnabled) {
        const card = state.cards.find(c => c.id === currentInspectorCardId);
        if (card) showInspector(card);
        else clearInspectorContent();
      } else {
        els.inspector.classList.add("hidden");
      }
    };
  }

  bindInspectorPanel();

  bindDev();

  bindDev();


  // v16: robust battlefield double-click tap/untap.
  // Uses both dblclick and a pointerup double-tap fallback.
  function cardFromElement(el) {
    if (!el) return null;
    const id = el.dataset.cardId;
    if (!id) return null;
    return state.cards.find(c => c.id === id) || null;
  }

  function toggleBattlefieldTapFromElement(el, ev) {
    const card = cardFromElement(el);
    if (!card || card.zone !== "battlefield") return false;
    if (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      if (typeof ev.stopImmediatePropagation === "function") ev.stopImmediatePropagation();
    }
    toggleTap(card);
    return true;
  }

  document.addEventListener("dblclick", e => {
    const el = e.target.closest?.(".card");
    if (!el) return;
    toggleBattlefieldTapFromElement(el, e);
  }, true);

  let lastTapClick = { id: null, t: 0, x: 0, y: 0 };

  document.addEventListener("pointerup", e => {
    if (e.button !== 0) return;
    const el = e.target.closest?.(".card");
    if (!el) return;
    const card = cardFromElement(el);
    if (!card || card.zone !== "battlefield") return;

    const now = performance.now();
    const same = lastTapClick.id === card.id;
    const fast = now - lastTapClick.t < 380;
    const near = Math.abs(e.clientX - lastTapClick.x) < 16 && Math.abs(e.clientY - lastTapClick.y) < 16;

    if (same && fast && near) {
      lastTapClick = { id: null, t: 0, x: 0, y: 0 };
      toggleBattlefieldTapFromElement(el, e);
      return;
    }

    lastTapClick = { id: card.id, t: now, x: e.clientX, y: e.clientY };
  }, true);

  window.CleanTable = {
    initialState,
    applyRemoteState,
    setLocalSeat,
    onResetVoteChanged
  };
})();
