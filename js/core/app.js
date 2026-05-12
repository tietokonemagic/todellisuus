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
    "seatScreen","seatStatus","appVersionLabel","nicknameInput","joinR1P1","joinR1P2","joinR2P1","joinR2P2","kickRoom1","kickRoom2",
    "game","viewport","world","pileLayer","cardLayer","dragLayer","diceLayer","myHand","opponentHand",
    "mainMenuBtn","mainMenu","playmatMenuBtn","playmatMenu","sleevesMenuBtn","sleevesMenu","ogBackSleeveBtn","colorSleeveBtn","sleeveColorInput","addTokenMenuBtn","tokenMenu","menuFlipOrbBtn","menuFlipStarBtn","addDiceBtn","throwDiceCount","throwDiceBtn","sylvanPanel","sylvanMinus","sylvanPlus","sylvanCount","sylvanOk","dieMenu","dieColorInput","diePipColorInput","loadDeckBtn","sideboardBtn","sideboardModal","sideboardWindow","closeSideboardEditor","resetOriginalSideboard","mainboardScroll","mainboardBoard","sideboardScroll","sideboardBoard","mainboardCount","sideboardCount","chatBtn","chatPanel","chatHeader","chatMinus","chatPlus","chatMessages","chatText","chatSend","helpBtn","helpPanel","helpHeader","helpMinus","helpPlus","helpBody","devTuningBtn","inspectorToggleBtn","resetVoteBtn","leaveBtn","roomInfo",
    "deckModal","deckText","coreSetSelect","doLoadDeck","closeDeckModal","deckStatus",
    "tutorModal","tutorGrid","tutorToHand","tutorToTable","closeTutor",
    "graveModal","graveGrid","closeGrave","exileModal","exileGrid","closeExile",
    "libraryMenu","cardMenu","handCardMenu","resetPrompt","acceptReset","rejectReset",
    "inspector","inspectorHeader","inspectorMinus","inspectorPlus","inspectorName","inspectorType","inspectorOracle",
    "selectBox","devPanel","devDragHandle","devReset","devCopy","devClose","devOutput"
  ].forEach(id => els[id] = document.getElementById(id));

  if (!els.selectBox) {
    els.selectBox = document.createElement("div");
    els.selectBox.id = "selectBox";
    els.selectBox.className = "select-box hidden";
    document.body.appendChild(els.selectBox);
  }

  if (els.appVersionLabel) els.appVersionLabel.textContent = "v2026.05.12-022";
  let localRoom = null;
  let localPlayer = null;
  let localNickname = localStorage.getItem("oldschoolNicknameV1") || "Player";
  if (els.nicknameInput) els.nicknameInput.value = localNickname;
  let selectedIds = new Set();
  let selectedDieIds = new Set();
  let hoveredCardId = null;
  let hoveredDieId = null;
  let selectedTutorId = null;
  let contextLibraryPlayer = null;
  let contextCardId = null;
  let contextHandCardId = null;
  let drag = null;
  let handDropPreview = null;
  let handFan = { p1: 0, p2: 0 };
  let handDepth = { p1: 1, p2: 1 };
  let inspectorEnabled = true;
  let currentInspectorCardId = null;
  let inspectorFont = 15;
  let sylvanCount = 3;
  let localFlipOverlaySignature = null;
  let boxSelect = null;

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
    "shuffleSpread": 8,
    "handArtX": -76,
    "handArtY": -133,
    "handArtSize": 164,
    "thumbMinX": 0,
    "thumbMaxX": 45,
    "thumbMinY": 0,
    "thumbMaxY": 0,
    "thumbMinRot": 0,
    "thumbMaxRot": 25,
    "cardRadius": 7,
    "alphaCardRadius": 10,
    "helpPanelX": 669,
    "helpPanelY": 409,
    "inspectorPanelX": -1,
    "inspectorPanelY": -1,
    "chatPanelX": 1280,
    "chatPanelY": 42,
    "chatFontSize": 14,
    "handDropZoneX": 0,
    "handDropZoneY": 82,
    "handDropZoneWidth": 690,
    "handDropZoneHeight": 77,
    "handSafeZoneX": 0,
    "handSafeZoneY": 58,
    "handSafeZoneWidth": 510,
    "handSafeZoneHeight": 260,
    "handScrollSensitivity": 1,
    "handScrollSpeed": 1,
    "handFanMaxSpread": 70,
    "menuFontSize": 12,
    "menuButtonPaddingY": 2,
    "menuButtonPaddingX": 15,
    "menuGap": 5,
    "menuWidth": 160,
    "sleeveNoiseStrength": 16,
    "dieSelectWidth": 1,
    "dieSelectColor": "#ffffff",
    "stone1Size": 1.15,
    "stone2Size": 1.15,
    "stone3Size": 1.15,
    "stone4Size": 1.15,
    "stone5Size": 1.15
};
  let dev = loadDev();

  let state = initialState();

  function uid() { return crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function otherPlayer() { return localPlayer === "p1" ? "p2" : "p1"; }
  function snap(v) { return Math.round(v / GRID) * GRID; }

  function makeDefaultStones() {
    const list = [];
    for (const player of ["p1", "p2"]) {
      const lib = pileBaseStatic(player, "library");
      for (let i = 1; i <= 5; i++) {
        list.push({
          id: `${player}-stone-${i}`,
          owner: player,
          image: `kivi${i}.png`,
          x: lib.x + 18 + (i - 1) * 42,
          y: lib.y + 214,
          z: 2400 + i,
          rot: 0
        });
      }
    }
    return list;
  }

  function pileBaseStatic(player, kind) {
    const base = {
      p1: { library: { x: 1518, y: 698 } },
      p2: { library: { x: 260, y: 184 } }
    };
    return base[player]?.[kind] || { x: 960, y: 540 };
  }

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
      deckOrigins: { p1: {}, p2: {} },
      chat: [],
      stones: makeDefaultStones(),
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
    if (!state.deckOrigins) state.deckOrigins = { p1: {}, p2: {} };
    if (!Array.isArray(state.chat)) state.chat = [];
    if (!Array.isArray(state.stones) || state.stones.length < 10) {
      const existing = new Map((state.stones || []).map(s => [s.id, s]));
      state.stones = makeDefaultStones().map(s => ({ ...s, ...(existing.get(s.id) || {}) }));
    }
    for (const player of ["p1", "p2"]) {
      if (!state.sleeves[player]) state.sleeves[player] = { type: "og", color: "#6a3b20" };
      if (!state.deckOrigins[player]) state.deckOrigins[player] = {};
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
    applyMenuDevStylesV36();
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
    const result = { main: [], side: [] };
    let target = "main";

    String(text || "").split(/\r?\n/).forEach(rawLine => {
      const line = rawLine.trim();
      if (!line) return;
      if (line.startsWith("//") || line.startsWith("#")) return;

      if (/^sideboard\s*:?\s*$/i.test(line)) {
        target = "side";
        return;
      }

      let cleaned = line.replace(/\s+\([^)]+\)$/g, "").trim();
      if (/^SB:\s*/i.test(cleaned)) {
        target = "side";
        cleaned = cleaned.replace(/^SB:\s*/i, "").trim();
      }

      const m = cleaned.match(/^(\d+)\s+(.+)$/);
      if (!m) return;

      result[target].push({
        count: Number(m[1]),
        name: m[2].replace(/\s+\*.*$/, "").trim()
      });
    });

    return result;
  }

  async function loadDeck() {
    ensureState();
    const parsed = parseDeckList(els.deckText.value);
    const mainEntries = parsed.main || [];
    const sideEntries = parsed.side || [];
    const entries = mainEntries.concat(sideEntries);

    if (!mainEntries.length) {
      els.deckStatus.textContent = "No valid mainboard lines.";
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
    let z = 1;

    function addEntries(list, zone, originalPane) {
      for (const entry of list) {
        const data = map.get(entry.name);
        for (let i = 0; i < entry.count; i++) {
          deck.push({
            id: uid(),
            owner: player,
            zone,
            x: 960,
            y: player === "p1" ? 760 : 320,
            z: z++,
            tapped: false,
            faceDown: false,
            marked: false,
            sideEditPane: originalPane,
            originalPane,
            originalOrder: z,
            ...data
          });
        }
      }
    }

    addEntries(mainEntries, playerZone(player, "library"), "main");
    addEntries(sideEntries, playerZone(player, "sideboard"), "side");
    state.deckOrigins[player] = {
      main: mainEntries.map(e => ({ count: e.count, name: e.name })),
      side: sideEntries.map(e => ({ count: e.count, name: e.name }))
    };

    const mainDeck = deck.filter(c => c.zone === playerZone(player, "library"));
    const sideDeck = deck.filter(c => c.zone === playerZone(player, "sideboard"));
    shuffleInPlace(mainDeck);
    state.cards = state.cards.concat(mainDeck, sideDeck);

    els.deckModal.classList.add("hidden");
    updateMenuActiveStates();
    els.deckStatus.textContent = sideEntries.length ? `Loaded ${mainDeck.length} main / ${sideDeck.length} side.` : "";
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


  function applyMenuDevStylesV36() {
    const root = document.documentElement;
    root.style.setProperty("--menu-font-size", `${Number(dev.menuFontSize) || 12}px`);
    root.style.setProperty("--menu-button-padding-y", `${Number(dev.menuButtonPaddingY) || 2}px`);
    root.style.setProperty("--menu-button-padding-x", `${Number(dev.menuButtonPaddingX) || 15}px`);
    root.style.setProperty("--menu-gap", `${Number(dev.menuGap) || 5}px`);
    root.style.setProperty("--menu-width", `${Number(dev.menuWidth) || 160}px`);
    root.style.setProperty("--sleeve-noise-strength", `${Math.max(0, Math.min(100, Number(dev.sleeveNoiseStrength) || 0)) / 100}`);
    root.style.setProperty("--sleeve-noise-opacity", `${Math.max(0, Math.min(100, Number(dev.sleeveNoiseStrength) || 0)) / 100}`);
  }

  function clampPanelPosition(panel, x, y) {
    if (!panel) return { x: 0, y: 0 };
    const r = panel.getBoundingClientRect();
    const w = r.width || Number(panel.offsetWidth) || 320;
    const h = r.height || Number(panel.offsetHeight) || 220;
    return {
      x: Math.max(0, Math.min(Math.max(0, window.innerWidth - Math.min(80, w)), Math.round(x))),
      y: Math.max(0, Math.min(Math.max(0, window.innerHeight - Math.min(40, h)), Math.round(y)))
    };
  }

  function panelCenterPosition(panel) {
    if (!panel) return { x: 0, y: 0 };
    const r = panel.getBoundingClientRect();
    const w = r.width || Number(panel.offsetWidth) || 320;
    const h = r.height || Number(panel.offsetHeight) || 220;
    return clampPanelPosition(panel, (window.innerWidth - w) / 2, (window.innerHeight - h) / 2);
  }

  function applyPanelDefaultPositionsV37(force = false) {
    const place = (panel, x, y, centerWhenNegative = false) => {
      if (!panel) return;
      if (!force && !panel.classList.contains("hidden")) return;
      const nx = Number(x);
      const ny = Number(y);
      const pos = centerWhenNegative && (nx < 0 || ny < 0)
        ? panelCenterPosition(panel)
        : clampPanelPosition(panel, Number.isFinite(nx) ? nx : 0, Number.isFinite(ny) ? ny : 0);
      panel.style.left = `${pos.x}px`;
      panel.style.top = `${pos.y}px`;
      panel.style.right = "auto";
      panel.style.bottom = "auto";
    };
    place(els.helpPanel, dev.helpPanelX, dev.helpPanelY);
    place(els.inspector, dev.inspectorPanelX, dev.inspectorPanelY, true);
  }

  function render() {
    applyMenuDevStylesV36();
    if (!localPlayer) return;
    ensureState();
    renderPlaymats();
    document.documentElement.style.setProperty("--grave-height", `${dev.graveHeight}px`);
    document.documentElement.style.setProperty("--exile-height", `${dev.exileHeight}px`);
    document.documentElement.style.setProperty("--die-size", `${dev.dieSize}px`);
    document.documentElement.style.setProperty("--die-radius", `${dev.dieRadius}px`);
    document.documentElement.style.setProperty("--sel-width", `${dev.selWidth}px`);
    document.documentElement.style.setProperty("--sel-color", dev.selColor);
    document.documentElement.style.setProperty("--card-radius", `${Number(dev.cardRadius) || 7}px`);
    document.documentElement.style.setProperty("--alpha-card-radius", `${Number(dev.alphaCardRadius) || 11}px`);
    document.documentElement.style.setProperty("--sleeve-noise-opacity", String(Math.max(0, Math.min(1, (Number(dev.sleeveNoiseStrength) || 0) / 100))));
    document.documentElement.style.setProperty("--die-select-width", `${Number(dev.dieSelectWidth) || 1}px`);
    document.documentElement.style.setProperty("--die-select-color", dev.dieSelectColor || "#ffffff");
    renderPiles();
    renderCards();
    renderHands();
    renderDice();
    renderStones();
    renderDragCard();
    renderHandDropZoneDebug();
    renderHandSafeZoneDebug();
    syncSharedFlipOverlay();
    renderChatMessages();
    updateMenuActiveStates();
  }

  function renderPlaymats() {
    const p1Mat = document.getElementById("p1Mat");
    const p2Mat = document.getElementById("p2Mat");
    if (state.playmats?.p1 && state.playmats.p1 !== "default-green") p1Mat.style.backgroundImage = `url("playmat/${state.playmats.p1}")`;
    if (state.playmats?.p2 && state.playmats.p2 !== "default-blue") p2Mat.style.backgroundImage = `url("playmat/${state.playmats.p2}")`;
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
          if (top && state.revealTop[player]) {
            if (top.image) {
              visual.style.background = `#050505 url("${top.image}") center / cover no-repeat`;
            } else {
              applySleeveBackV35(visual, player, top);
            }
          } else {
            applySleeveBackV35(visual, player);
          }
          pile.appendChild(visual);
          pile.addEventListener("dblclick", () => { if (player === localPlayer) drawOne(player); });
          pile.addEventListener("contextmenu", e => { if (player !== localPlayer) return; e.preventDefault(); openLibraryMenu(e, player); });
        } else if (kind === "grave") {
          const box = document.createElement("div");
          box.className = "grave-drop";
          box.textContent = "GRAVE";
          pile.appendChild(box);

          const scroller = document.createElement("div");
          scroller.className = "grave-scroll";
          ownerCards(player, "grave").slice().reverse().forEach((card, i) => {
            const el = createCardEl(card, "grave-stack-card grave-scroll-card", card.faceDown);
            el.style.zIndex = String(1000 + i);
            scroller.appendChild(el);
          });
          pile.appendChild(scroller);
        } else {
          const box = document.createElement("div");
          box.className = "exile-box";
          box.textContent = `EXILE ${ownerCards(player, "exile").length}`;
          pile.appendChild(box);
          pile.addEventListener("dblclick", () => openExile(player));
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

  function cardRenderPosition(card) {
    if (drag && drag.id === card.id) return { x: card.x, y: card.y };
    if (!card.tapped) return { x: card.x, y: card.y };

    const baseDeg = cardRotation(card) - 90;
    const tappedDeg = cardRotation(card);

    function rot(pt, deg) {
      const a = deg * Math.PI / 180;
      return {
        x: pt.x * Math.cos(a) - pt.y * Math.sin(a),
        y: pt.x * Math.sin(a) + pt.y * Math.cos(a)
      };
    }

    const untappedC = rot({ x: -CARD_W / 2, y: CARD_H / 2 }, baseDeg);
    const tappedD = rot({ x: CARD_W / 2, y: CARD_H / 2 }, tappedDeg);

    return {
      x: card.x + untappedC.x - tappedD.x,
      y: card.y + untappedC.y - tappedD.y
    };
  }


  function cardVisibleToMe(card) {
    if (!card) return false;
    if (card.zone === otherPlayer() + "-hand" && !state.revealHand[otherPlayer()]) return false;
    if (card.faceDown) return false;
    return true;
  }

  function renderCards() {
    els.cardLayer.innerHTML = "";
    battlefieldCards()
      .filter(card => !(drag && drag.id === card.id))
      .sort((a,b) => (a.z || 1) - (b.z || 1))
      .forEach(card => {
        const el = createCardEl(card, "table-card", card.faceDown);
        const pos = cardRenderPosition(card);
        el.style.left = (pos.x - CARD_W / 2) + "px";
        el.style.top = (pos.y - CARD_H / 2) + "px";
        el.style.transform = `rotate(${cardRotation(card)}deg)`;
        el.style.zIndex = String(card.z || 1);
        els.cardLayer.appendChild(el);
      });

    renderGraveStack("p1");
    renderGraveStack("p2");
  }


  function renderGraveStack(player) {
    // Grave cards are rendered inside the clipped grave-scroll area.
  }


  function renderDragCard() {
    if (els.dragLayer) els.dragLayer.innerHTML = "";
    const old = els.myHand.querySelector(".drag-hand-visual");
    if (old) old.remove();

    if (!drag || !drag.id) return;
    const card = state.cards.find(c => c.id === drag.id);
    if (!card || card.zone !== "battlefield") return;

    const fromHand = drag.fromZone && drag.fromZone.endsWith("-hand");

    if (fromHand) {
      const rect = els.myHand.getBoundingClientRect();
      const el = createCardEl(card, "hand-card drag-hand-visual", card.faceDown);
      const cx = drag.clientX ?? 0;
      const cy = drag.clientY ?? 0;

      el.style.left = (cx - rect.left - CARD_W / 2) + "px";
      el.style.top = (cy - rect.top - CARD_H / 2) + "px";
      el.style.bottom = "auto";
      el.style.transform = `rotate(0deg)`;
      el.style.zIndex = String(drag.handZ || drag.originalHandZ || 100);
      el.style.setProperty("--hand-z", String(drag.handZ || drag.originalHandZ || 100));
      el.style.setProperty("--hand-transform", el.style.transform);
      els.myHand.appendChild(el);
      return;
    }

    if (!els.dragLayer) return;
    const el = createCardEl(card, "table-card above-hand-drag", card.faceDown);
    el.style.left = (card.x - CARD_W / 2) + "px";
    el.style.top = (card.y - CARD_H / 2) + "px";
    el.style.transform = `rotate(${cardRotation(card)}deg)`;
    el.style.zIndex = "9999";
    els.dragLayer.appendChild(el);
  }


  function renderHands() {
    renderHand(localPlayer, els.myHand, true);
    renderHand(otherPlayer(), els.opponentHand, false);
  }

  function renderHand(player, container, own) {
    const oldDragVisual = container.querySelector(".drag-hand-visual");
    container.innerHTML = "";

    const fanValue = handFan[player] || 0;
    const fanT = Math.max(0, Math.min(1, (fanValue + 100) / 200));

    const baseHand = document.createElement("img");
    baseHand.className = "hand-art hand-art-base";
    baseHand.src = "hand.png";
    baseHand.alt = "";
    baseHand.draggable = false;
    baseHand.style.width = (dev.handArtSize || 190) + "px";
    baseHand.style.left = `calc(50% + ${dev.handArtX || 0}px)`;
    baseHand.style.bottom = (dev.handArtY || 0) + "px";
    container.appendChild(baseHand);

    const realHand = ownerCards(player, "hand");
    const items = realHand.map(card => ({ type: "card", card }));

    const draggingFromThisHand =
      drag &&
      drag.fromZone === player + "-hand" &&
      drag.handIndex >= 0 &&
      !realHand.some(c => c.id === drag.id);

    if (draggingFromThisHand) {
      const gapIndex = Math.max(0, Math.min(drag.handIndex, items.length));
      items.splice(gapIndex, 0, { type: "gap", cls: "hand-gap" });
    }

    const previewingIntoThisHand =
      handDropPreview &&
      handDropPreview.player === player &&
      drag &&
      !(drag.fromZone === player + "-hand");

    if (previewingIntoThisHand) {
      const previewIndex = Math.max(0, Math.min(handDropPreview.index, items.length));
      items.splice(previewIndex, 0, { type: "gap", cls: "hand-preview-gap" });
    }

    const count = items.length;
    const t = fanT;
    const spread = (16 + t * 70) * Math.min(1, 11 / Math.max(1, count));
    const start = -((count - 1) * spread) / 2;
    const center = (count - 1) / 2;
    const depth = handDepth[player] || 1;

    items.forEach((item, index) => {
      const rel = index - center;
      const transform = `rotate(${rel * (1.5 + t * 5.5)}deg)`;
      const z = 100 + (depth > 0 ? index : count - index);
      const left = 630 + start + index * spread - CARD_W / 2;
      const bottom = Math.max(-12, 18 - Math.pow(rel, 2) * (0.8 + t * 2.1));

      if (item.type === "gap") {
        const gap = document.createElement("div");
        gap.className = item.cls || "hand-gap";
        gap.style.left = left + "px";
        gap.style.bottom = bottom + "px";
        gap.style.transform = transform;
        gap.style.zIndex = String(z);
        container.appendChild(gap);
        return;
      }

      const card = item.card;
      const hidden = !own && !state.revealHand[player];
      const el = createCardEl(card, "hand-card", hidden || card.faceDown);

      el.style.left = left + "px";
      el.style.bottom = bottom + "px";
      el.style.transform = transform;
      el.style.zIndex = String(z);
      el.style.setProperty("--hand-z", String(z));
      el.style.setProperty("--hand-transform", transform);

      container.appendChild(el);
    });

    const thumbX = (dev.thumbMinX || 0) + ((dev.thumbMaxX || 0) - (dev.thumbMinX || 0)) * fanT;
    const thumbY = (dev.thumbMinY || 0) + ((dev.thumbMaxY || 0) - (dev.thumbMinY || 0)) * fanT;
    const thumbRot = (dev.thumbMinRot || 0) + ((dev.thumbMaxRot || 0) - (dev.thumbMinRot || 0)) * fanT;

    const thumb = document.createElement("img");
    thumb.className = "hand-art hand-art-thumb";
    thumb.src = "thumb.png";
    thumb.alt = "";
    thumb.draggable = false;
    thumb.style.width = (dev.handArtSize || 190) + "px";
    thumb.style.left = `calc(50% + ${(dev.handArtX || 0) + thumbX}px)`;
    thumb.style.bottom = ((dev.handArtY || 0) + thumbY) + "px";
    thumb.style.transform = `rotate(${thumbRot}deg)`;
    container.appendChild(thumb);

    if (oldDragVisual && drag && drag.fromZone === player + "-hand") {
      container.appendChild(oldDragVisual);
    }
  }


  function defaultSleeveV35() {
    return { type: "og", color: "#6a3b20" };
  }

  function normalizeSleeveV35(sleeve) {
    const s = sleeve && typeof sleeve === "object" ? sleeve : defaultSleeveV35();
    const type = s.type === "color" ? "color" : "og";
    const color = /^#[0-9a-f]{6}$/i.test(String(s.color || "")) ? s.color : "#6a3b20";
    return { type, color };
  }

  function sleeveForPlayerV35(player) {
    ensureState();
    const owner = player === "p2" ? "p2" : "p1";
    state.sleeves[owner] = normalizeSleeveV35(state.sleeves[owner]);
    return state.sleeves[owner];
  }

  function applySleeveBackV35(el, owner, card = null) {
    if (!el) return el;

    el.classList.add("back");
    el.classList.remove("textured-sleeve-back", "noise-sleeve-back");
    el.textContent = "";
    el.style.removeProperty("--sleeve-color");
    el.style.backgroundImage = "";
    el.style.backgroundBlendMode = "";
    el.style.backgroundSize = "";
    el.style.backgroundPosition = "";
    el.style.border = "";
    el.style.boxShadow = "";

    if (card && card.isToken) {
      el.style.background = '#050505 url("token/aieback.png") center / cover no-repeat';
      return el;
    }

    const sleeve = sleeveForPlayerV35(owner);
    if (sleeve.type === "color") {
      el.classList.add("noise-sleeve-back");
      el.style.setProperty("--sleeve-color", sleeve.color || "#6a3b20");
      el.style.background = sleeve.color || "#6a3b20";
      const noise = document.createElement("div");
      noise.className = "sleeve-noise-overlay";
      el.appendChild(noise);
    } else {
      el.style.background = '#050505 url("lapi2.png") center / cover no-repeat';
    }

    return el;
  }

  function sleeveBackElement(owner, card = null) {
    return applySleeveBackV35(document.createElement("div"), owner, card);
  }


  function createCardEl(card, cls, forceBack = false) {
    const el = document.createElement("div");
    el.className = `card ${cls}` + (selectedIds.has(card.id) ? " selected" : "") + (card.marked ? " discard-marked" : "");
    if (card.sylvanChoice) el.classList.add(card.sylvanChoice === "keep" ? "sylvan-keep" : "sylvan-mark");
    if (String(card.set || "").toLowerCase() === "lea") el.classList.add("alpha-card");
    if (card.isToken) el.classList.add("token-card");
    el.dataset.cardId = card.id;

    if (forceBack) {
      const back = sleeveBackElement(card.owner, card);
      el.appendChild(back);
    } else if (card.image) {
      const img = document.createElement("img");
      img.src = card.image;
      img.alt = card.name;
      img.draggable = false;
      el.appendChild(img);
    } else {
      const back = sleeveBackElement(card.owner, card);
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
    el.addEventListener("click", e => {
      if (card.zone === otherPlayer() + "-hand") {
        card.marked = !card.marked;
        push();
      } else if (card.zone.endsWith("-hand") || card.zone === "battlefield") {
        if (e.shiftKey) {
          if (selectedIds.has(card.id)) selectedIds.delete(card.id);
          else selectedIds.add(card.id);
        } else {
          selectedIds = new Set([card.id]);
          selectedDieIds.clear();
        }
        render();
      }
    });
    el.addEventListener("contextmenu", e => {
      e.preventDefault();
      if (card.zone === localPlayer + "-hand") openHandCardMenu(e, card);
      else openCardMenu(e, card);
    });

    addSylvanButtons(el, card);
    addSylvanCardPanel(el, card);
    addTokenLabel(el, card);
    return el;
  }

  function addTokenLabel(el, card) {
    if (!card.isToken) return;
    const label = document.createElement("div");
    label.className = "token-label";
    label.textContent = "token";
    el.appendChild(label);
  }

  function addSylvanCardPanel(el, card) {
    if (!isOwnBattlefieldSylvan(card)) return;

    const panel = document.createElement("div");
    panel.className = "sylvan-card-panel";

    const draw = document.createElement("button");
    draw.type = "button";
    draw.textContent = "draw " + sylvanCount;
    draw.addEventListener("pointerdown", e => { e.preventDefault(); e.stopPropagation(); });
    draw.addEventListener("click", e => {
      e.preventDefault(); e.stopPropagation();
      startSylvanLibrary(localPlayer);
    });
    draw.addEventListener("contextmenu", e => {
      e.preventDefault();
      e.stopPropagation();
      const n = prompt("Sylvan draw amount 3-7", String(sylvanCount));
      const parsed = Number(n);
      if (Number.isFinite(parsed)) {
        sylvanCount = Math.max(3, Math.min(7, Math.round(parsed)));
        render();
      }
    });

    panel.appendChild(draw);
    el.appendChild(panel);
  }


  function isOwnBattlefieldSylvan(card) {
    return card &&
      card.zone === "battlefield" &&
      card.owner === localPlayer &&
      String(card.name || "").toLowerCase() === "sylvan library";
  }

  function addSylvanButtons(el, card) {
    if (!card.sylvanChoice || card.zone !== localPlayer + "-hand") return;

    const box = document.createElement("div");
    box.className = "sylvan-actions";

    [
      ["keep", "keep"],
      ["top", "top"],
      ["second", "2nd"]
    ].forEach(([value, label]) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = label;
      if (card.sylvanChoice === value) b.classList.add("pressed");
      b.addEventListener("pointerdown", e => {
        e.preventDefault();
        e.stopPropagation();
      });
      b.addEventListener("click", e => {
        e.preventDefault();
        e.stopPropagation();
        card.sylvanChoice = value;
        push();
      });
      box.appendChild(b);
    });

    el.appendChild(box);
  }

  function toggleTap(card) {
    const targets = selectedIds.has(card.id) && selectedIds.size > 1
      ? state.cards.filter(c => selectedIds.has(c.id) && c.zone === "battlefield")
      : [card];
    const next = !card.tapped;
    targets.forEach(c => c.tapped = next);
    push();
  }


  function renderStones() {
    if (!els.diceLayer) return;
    ensureState();
    state.stones.forEach(stone => {
      const el = document.createElement("img");
      el.className = "table-stone";
      el.dataset.stoneId = stone.id;
      el.src = stone.image || "kivi1.png";
      el.alt = "";
      el.draggable = false;
      const n = Number(String(stone.id || "").match(/stone-(\d+)/)?.[1] || 1);
      const scale = Number(dev["stone" + n + "Size"]) || 1.15;
      el.style.setProperty("--stone-scale", String(scale));
      el.style.left = (Number(stone.x) || 960) + "px";
      el.style.top = (Number(stone.y) || 540) + "px";
      el.style.zIndex = String(stone.z || 2400);
      const baseRot = stone.owner === localPlayer ? 0 : 180;
      el.style.transform = `translate(-50%, -50%) rotate(${baseRot + (Number(stone.rot) || 0)}deg)`;
      el.addEventListener("pointerdown", e => onStonePointerDown(e, stone));
      els.diceLayer.appendChild(el);
    });
  }

  let stoneDrag = null;

  function onStonePointerDown(e, stone) {
    if (e.button !== 0 || !stone) return;
    closeMenus();
    const p = tablePoint(e.clientX, e.clientY, false);
    stoneDrag = {
      id: stone.id,
      lastClientX: e.clientX,
      offsetX: p.x - (Number(stone.x) || p.x),
      offsetY: p.y - (Number(stone.y) || p.y)
    };
    stone.z = Math.max(2400, ...state.stones.map(s => Number(s.z) || 2400)) + 1;
    e.preventDefault();
    e.stopPropagation();
    document.addEventListener("pointermove", onStoneDragMove);
    document.addEventListener("pointerup", onStoneDragEnd, { once: true });
  }

  function onStoneDragMove(e) {
    if (!stoneDrag) return;
    const stone = state.stones.find(s => s.id === stoneDrag.id);
    if (!stone) return;
    const p = tablePoint(e.clientX, e.clientY);
    stone.x = snap(p.x - stoneDrag.offsetX);
    stone.y = snap(p.y - stoneDrag.offsetY);
    const dx = e.clientX - (stoneDrag.lastClientX || e.clientX);
    stone.rot = (Number(stone.rot) || 0) + Math.max(0.2, Math.min(2.4, Math.abs(dx) * 0.08));
    stoneDrag.lastClientX = e.clientX;
    render();
  }

  function onStoneDragEnd() {
    document.removeEventListener("pointermove", onStoneDragMove);
    if (!stoneDrag) return;
    stoneDrag = null;
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
      list.forEach((d, i) => createDieEl(d, base.x + i * (Number(dev.dieSize) + Number(dev.dieGap)), base.y, d.owner === localPlayer ? 0 : 180));
    }

    state.dice.filter(d => d.kind === "counter").forEach(d => createDieEl(d, d.x || 960, d.y || 540, d.owner === localPlayer ? 0 : 180));
  }

  function createDieEl(d, x, y, rot) {
    const el = document.createElement("div");
    el.className = "die" + (d.kind === "counter" ? " counter-die" : "") + (selectedDieIds.has(d.id) ? " selected" : "");
    el.dataset.dieId = d.id;
    el.style.left = x + "px";
    el.style.top = y + "px";
    el.style.transform = `rotate(${rot}deg)`;
    el.style.setProperty("--die-color", d.color || (d.kind === "counter" ? "#25aa3d" : "#eeeeee"));
    el.style.setProperty("--pip-color", d.pipColor || "#111111");
    el.style.background = d.color || (d.kind === "counter" ? "#25aa3d" : "#eeeeee");
    el.style.zIndex = String(d.z || 1000);

    for (const p of PIPS[Math.max(1, Math.min(6, Number(d.value) || 1))]) {
      const pip = document.createElement("div");
      pip.className = "pip p" + p;
      pip.style.setProperty("--pip-color", d.pipColor || "#111111");
      el.appendChild(pip);
    }

    el.addEventListener("mouseenter", () => hoveredDieId = d.id);
    el.addEventListener("mouseleave", () => { if (hoveredDieId === d.id) hoveredDieId = null; });
    el.addEventListener("contextmenu", e => { e.preventDefault(); openDieMenu(e, d); });
    el.addEventListener("pointerdown", e => onDiePointerDown(e, d));
    els.diceLayer.appendChild(el);
  }

  let dieDrag = null;

  function onDiePointerDown(e, die) {
    if (e.button !== 0) return;
    if (!die || die.owner !== localPlayer) return;
    if (e.shiftKey) {
      if (selectedDieIds.has(die.id)) selectedDieIds.delete(die.id);
      else selectedDieIds.add(die.id);
      renderDice();
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    closeMenus();
    if (!selectedDieIds.has(die.id)) {
      selectedDieIds = new Set([die.id]);
      selectedIds.clear();
    }
    const p = tablePoint(e.clientX, e.clientY, false);
    const startX = die.kind === "life" ? p.x : (die.x || p.x);
    const startY = die.kind === "life" ? p.y : (die.y || p.y);
    dieDrag = {
      id: die.id,
      kind: die.kind,
      startClientX: e.clientX,
      startClientY: e.clientY,
      offsetX: p.x - startX,
      offsetY: p.y - startY,
      group: selectedDieIds.has(die.id) ? state.dice.filter(d => selectedDieIds.has(d.id)).map(d => ({
        id: d.id,
        x: d.kind === "life" ? startX : (d.x || startX),
        y: d.kind === "life" ? startY : (d.y || startY),
        kind: d.kind
      })) : null
    };
    e.preventDefault();
    e.stopPropagation();
    document.addEventListener("pointermove", onDieDragMove);
    document.addEventListener("pointerup", onDieDragEnd, { once: true });
  }

  function onDieDragMove(e) {
    if (!dieDrag) return;
    const p = tablePoint(e.clientX, e.clientY);
    const mainDie = state.dice.find(d => d.id === dieDrag.id);
    if (!mainDie) return;

    const nextX = snap(p.x - dieDrag.offsetX);
    const nextY = snap(p.y - dieDrag.offsetY);
    const origin = dieDrag.group?.find(g => g.id === dieDrag.id) || { x: nextX, y: nextY };
    const dx = nextX - origin.x;
    const dy = nextY - origin.y;

    const targets = dieDrag.group && dieDrag.group.length > 1 ? dieDrag.group : [{ id: dieDrag.id, x: origin.x, y: origin.y }];
    targets.forEach(g => {
      const d = state.dice.find(x => x.id === g.id);
      if (!d) return;
      d.x = snap((g.x || nextX) + dx);
      d.y = snap((g.y || nextY) + dy);
      d.kind = "counter";
      d.z = 3000;
    });
    renderDice();
  }

  function onDieDragEnd(e) {
    document.removeEventListener("pointermove", onDieDragMove);
    if (!dieDrag) return;
    const die = state.dice.find(d => d.id === dieDrag.id);
    if (!die) { dieDrag = null; return; }
    const pile = pileAt(e.clientX, e.clientY);
    if (pile && pile.kind === "exile") {
      state.dice = state.dice.filter(d => d.id !== die.id);
    }
    dieDrag = null;
    push();
  }

  function onCardPointerDown(e, card) {
    if (e.button !== 0) return;
    if (e.shiftKey && (card.zone === "battlefield" || card.zone.endsWith("-hand"))) {
      if (selectedIds.has(card.id)) selectedIds.delete(card.id);
      else selectedIds.add(card.id);
      render();
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (card.zone === otherPlayer() + "-hand") return;
    closeMenus();

    const fromZone = card.zone;
    const fromHand = fromZone && fromZone.endsWith("-hand");
    const pointer = tablePoint(e.clientX, e.clientY, false);
    const rect = e.currentTarget.getBoundingClientRect();
    const visualCenter = tablePoint(rect.left + rect.width / 2, rect.top + rect.height / 2, false);

    const handIndex = fromHand ? ownerCards(card.owner, "hand").findIndex(c => c.id === card.id) : -1;
    const handCount = fromHand ? ownerCards(card.owner, "hand").length : 0;
    const depth = fromHand ? (handDepth[card.owner] || 1) : 1;
    const handZ = fromHand ? (100 + (depth > 0 ? handIndex : handCount - handIndex)) : null;

    if (!selectedIds.has(card.id)) {
      selectedIds = new Set([card.id]);
      selectedDieIds.clear();
    }

    drag = {
      id: card.id,
      group: selectedIds.has(card.id) ? state.cards.filter(c => selectedIds.has(c.id) && c.zone === "battlefield").map(c => ({ id: c.id, x: c.x, y: c.y })) : null,
      fromZone,
      fromHand,
      handIndex,
      handZ,
      originalHandZ: handZ,
      clientX: e.clientX,
      clientY: e.clientY,
      startClientX: e.clientX,
      startClientY: e.clientY,
      offsetX: pointer.x - visualCenter.x,
      offsetY: pointer.y - visualCenter.y,
      originalX: card.x,
      originalY: card.y
    };

    card.x = visualCenter.x;
    card.y = visualCenter.y;
    card.zone = "battlefield";

    if (fromHand) {
      card.z = handZ;
    } else {
      bringToFront(card);
      card.z = 10000;
    }

    render();

    document.addEventListener("pointermove", onCardDragMove);
    document.addEventListener("pointerup", onCardDragEnd, { once: true });
  }


  function onCardDragMove(e) {
    if (!drag) return;
    const card = state.cards.find(c => c.id === drag.id);
    if (!card) return;

    const p = tablePoint(e.clientX, e.clientY);
    drag.clientX = e.clientX;
    drag.clientY = e.clientY;

    card.zone = "battlefield";

    // During drag, state x/y means the visual center directly.
    // This prevents tapped cards from jumping sideways when picked up.
    card.x = snap(p.x - drag.offsetX);
    card.y = snap(p.y - drag.offsetY);

    if (drag.group && drag.group.length > 1) {
      const origin = drag.group.find(g => g.id === card.id);
      if (origin) {
        const dx = card.x - origin.x;
        const dy = card.y - origin.y;
        drag.group.forEach(g => {
          if (g.id === card.id) return;
          const c = state.cards.find(x => x.id === g.id);
          if (c && c.zone === "battlefield") {
            c.x = snap(g.x + dx);
            c.y = snap(g.y + dy);
          }
        });
      }
    }

    if (drag.fromHand) card.z = drag.handZ || card.z || 100;
    else card.z = 10000;

    updateHandDropPreview(e.clientX, e.clientY);
    renderDragCard();
  }


  function handDropZoneRect() {
    const rect = els.myHand.getBoundingClientRect();
    const w = Number(dev.handDropZoneWidth || 236);
    const h = Number(dev.handDropZoneHeight || 190);
    const x = rect.left + rect.width / 2 - w / 2 + Number(dev.handDropZoneX || 0);
    const y = rect.top + rect.height / 2 - h / 2 + Number(dev.handDropZoneY || 0);
    return { left: x, top: y, right: x + w, bottom: y + h, width: w, height: h };
  }

  function renderHandDropZoneDebug() {
    const el = document.getElementById("handDropZoneDebug");
    if (!el) return;

    const devOpen = els.devPanel && !els.devPanel.classList.contains("hidden");
    if (!devOpen || !localPlayer) {
      el.classList.add("hidden");
      return;
    }

    const r = handDropZoneRect();
    el.style.left = r.left + "px";
    el.style.top = r.top + "px";
    el.style.width = r.width + "px";
    el.style.height = r.height + "px";
    el.classList.remove("hidden");
  }

  function handSafeZoneRect() {
    const rect = els.myHand.getBoundingClientRect();
    const w = Number(dev.handSafeZoneWidth || 520);
    const h = Number(dev.handSafeZoneHeight || 260);
    const x = rect.left + rect.width / 2 - w / 2 + Number(dev.handSafeZoneX || 0);
    const y = rect.top + rect.height / 2 - h / 2 + Number(dev.handSafeZoneY || 0);
    return { left: x, top: y, right: x + w, bottom: y + h, width: w, height: h };
  }

  function renderHandSafeZoneDebug() {
    const el = document.getElementById("handSafeZoneDebug");
    if (!el) return;

    const devOpen = els.devPanel && !els.devPanel.classList.contains("hidden");
    if (!devOpen || !localPlayer) {
      el.classList.add("hidden");
      return;
    }

    const r = handSafeZoneRect();
    el.style.left = r.left + "px";
    el.style.top = r.top + "px";
    el.style.width = r.width + "px";
    el.style.height = r.height + "px";
    el.classList.remove("hidden");
  }

  function handSafeAt(clientX, clientY) {
    if (!localPlayer) return false;
    const r = handSafeZoneRect();
    return clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom;
  }

  function handDropAt(clientX, clientY) {
    if (!localPlayer) return null;
    const r = handDropZoneRect();
    const inside = clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom;
    return inside ? localPlayer : null;
  }

  function handInsertIndexAtClientX(player, clientX) {
    const rect = els.myHand.getBoundingClientRect();
    const hand = ownerCards(player, "hand").filter(c => !(drag && c.id === drag.id));
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / Math.max(1, rect.width)));
    return Math.max(0, Math.min(hand.length, Math.round(ratio * hand.length)));
  }

  function updateHandDropPreview(clientX, clientY) {
    const player = handDropAt(clientX, clientY);

    if (!player || !drag || drag.fromZone === player + "-hand") {
      if (handDropPreview) {
        handDropPreview = null;
        renderHands();
        renderDragCard();
      }
      return;
    }

    const index = handInsertIndexAtClientX(player, clientX);
    if (!handDropPreview || handDropPreview.player !== player || handDropPreview.index !== index) {
      handDropPreview = { player, index };
      renderHands();
      renderDragCard();
    }
  }

  function insertIntoHandAtWorldX(card, player, worldX, indexOverride = null) {
    if (card.isToken) {
      card.zone = "battlefield";
      card.faceDown = false;
      card.x = 960;
      card.y = card.owner === "p1" ? 720 : 360;
      bringToFront(card);
      return;
    }

    const zone = player + "-hand";
    const hand = ownerCards(player, "hand").filter(c => c.id !== card.id);
    const others = state.cards.filter(c => c.zone !== zone && c.id !== card.id);

    let index = indexOverride;
    if (index === null || index === undefined) {
      const ratio = Math.max(0, Math.min(1, (worldX - 330) / 1260));
      index = Math.round(ratio * hand.length);
    }

    index = Math.max(0, Math.min(hand.length, index));
    card.zone = zone;
    card.tapped = false;
    card.faceDown = false;
    card.marked = false;
    hand.splice(index, 0, card);
    state.cards = others.concat(hand);
  }


  function onCardDragEnd(e) {
    document.removeEventListener("pointermove", onCardDragMove);
    if (!drag) return;

    const currentDrag = drag;
    const currentPreview = handDropPreview;
    const card = state.cards.find(c => c.id === currentDrag.id);
    const moved = Math.hypot(e.clientX - currentDrag.startClientX, e.clientY - currentDrag.startClientY);

    if (!card) {
      drag = null;
      handDropPreview = null;
      if (els.dragLayer) els.dragLayer.innerHTML = "";
      renderHands();
      return;
    }

    if (moved < 5) {
      card.zone = currentDrag.fromZone;
      card.x = currentDrag.originalX;
      card.y = currentDrag.originalY;
      card.z = currentDrag.fromHand ? (currentDrag.handZ || card.z) : card.z;
      drag = null;
      handDropPreview = null;
      if (els.dragLayer) els.dragLayer.innerHTML = "";
      push();
      return;
    }

    const handPlayer = handDropAt(e.clientX, e.clientY);
    if (currentDrag.fromHand && handSafeAt(e.clientX, e.clientY)) {
      insertIntoHandAtWorldX(card, localPlayer, card.x, currentDrag.handIndex);
    } else if (handPlayer === localPlayer) {
      insertIntoHandAtWorldX(
        card,
        handPlayer,
        card.x,
        currentPreview && currentPreview.player === handPlayer ? currentPreview.index : null
      );
    } else {
      const pile = pileAt(e.clientX, e.clientY);
      if (pile) {
        moveCardToZone(card, pile.player + "-" + pile.kind);
      } else {
        card.zone = "battlefield";
        card.marked = false;
        if (currentDrag.fromHand) bringToFront(card);
      }
    }

    drag = null;
    handDropPreview = null;
    if (els.dragLayer) els.dragLayer.innerHTML = "";
    push();
  }


  function pileAt(clientX, clientY) {
    const p = tablePoint(clientX, clientY, false);
    const candidates = [];
    for (const player of ["p1", "p2"]) {
      for (const kind of ["grave", "exile", "library"]) {
        const b = pileBase(player, kind);
        const w = 142;
        const h = kind === "grave" ? Number(dev.graveHeight || 260) : kind === "exile" ? Number(dev.exileHeight || 64) : 198;
        const pad = kind === "grave" || kind === "exile" ? 22 : 0;
        if (p.x >= b.x - pad && p.x <= b.x + w + pad && p.y >= b.y - pad && p.y <= b.y + h + pad) {
          candidates.push({ player, kind });
        }
      }
    }
    return candidates[0] || null;
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
    if (els.dieMenu) els.dieMenu.classList.add("hidden");
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

  function openExile(player) {
    els.exileGrid.innerHTML = "";
    ownerCards(player, "exile").slice().reverse().forEach(card => {
      const wrap = document.createElement("div");
      wrap.className = "grid-card exile-grid-card";
      wrap.dataset.cardId = card.id;
      if (card.faceDown) {
        const back = applySleeveBackV35(document.createElement("div"), card.owner, card);
        back.classList.add("grid-sleeve-back");
        wrap.appendChild(back);
      } else {
        const img = document.createElement("img");
        img.src = card.image || "lapi2.png";
        wrap.appendChild(img);
      }
      wrap.addEventListener("pointerdown", e => {
        if (card.owner !== localPlayer) return;
        els.exileModal.classList.add("hidden");
        card.zone = "battlefield";
        const p = tablePoint(e.clientX, e.clientY);
        card.x = p.x;
        card.y = p.y;
        bringToFront(card);
        push();
      });
      els.exileGrid.appendChild(wrap);
    });
    els.exileModal.classList.remove("hidden");
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

    els.inspector.classList.remove("hidden");
    els.inspector.style.fontSize = inspectorFont + "px";

    if (!card || !cardVisibleToMe(card)) {
      els.inspectorName.textContent = "";
      els.inspectorType.textContent = "";
      els.inspectorOracle.textContent = "";
      return;
    }

    els.inspectorName.textContent = card.name || "";
    els.inspectorType.textContent = card.typeLine || "";
    els.inspectorOracle.textContent = card.oracle || "";
  }


  function clearInspectorContent() {
    if (!inspectorEnabled) return;
    els.inspector.classList.remove("hidden");
    els.inspectorName.textContent = "";
    els.inspectorType.textContent = "";
    els.inspectorOracle.textContent = "";
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
    let targets = [];

    const hoverCard = state.cards.find(c => c.id === hoveredCardId);
    if (hoverCard) {
      targets = [hoverCard];
    } else if (selectedIds.size) {
      targets = state.cards.filter(c => selectedIds.has(c.id));
    }

    if (!targets.length) {
      let dieTargets = [];
      const die = state.dice.find(d => d.id === hoveredDieId);
      if (die) dieTargets = [die];
      else if (selectedDieIds.size) dieTargets = state.dice.filter(d => selectedDieIds.has(d.id));

      if (dieTargets.length && (action === "grave" || action === "exile")) {
        const removeIds = new Set(dieTargets.filter(d => d.kind !== "life").map(d => d.id));
        if (removeIds.size) {
          state.dice = state.dice.filter(d => !removeIds.has(d.id));
          hoveredDieId = null;
          selectedDieIds.clear();
          push();
          return true;
        }
      }
      return false;
    }

    targets.forEach(card => {
      if (action === "grave") moveCardToZone(card, card.owner + "-grave");
      if (action === "exile") moveCardToZone(card, card.owner + "-exile");
      if (action === "hand") moveCardToZone(card, card.owner + "-hand");
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

  function installEmergencyOfflineSync() {
    if (window.FirebaseCleanSync) return;
    window.FirebaseCleanSync = {
      offline: true,
      joinRoom: async (r, p) => {
        setLocalSeat((r || "room1") + " / OFFLINE", p || "p1");
        applyRemoteState(initialState());
      },
      pushState: async () => {},
      voteReset: async () => {},
      clearResetVote: async () => {},
      leaveRoom: async () => location.reload(),
      kickRoom: async () => {}
    };
  }

  function waitForSyncModule(timeoutMs = 6000) {
    if (window.FirebaseCleanSync) return Promise.resolve(window.FirebaseCleanSync);
    if (location.protocol === "file:") {
      installEmergencyOfflineSync();
      return Promise.resolve(window.FirebaseCleanSync);
    }

    return new Promise(resolve => {
      const started = Date.now();
      const tick = () => {
        if (window.FirebaseCleanSync) return resolve(window.FirebaseCleanSync);
        if (Date.now() - started >= timeoutMs) return resolve(null);
        setTimeout(tick, 80);
      };
      tick();
    });
  }

  async function join(room, player) {
    localNickname = (els.nicknameInput?.value || "").trim().slice(0, 24) || player.toUpperCase();
    localStorage.setItem("oldschoolNicknameV1", localNickname);
    els.seatStatus.textContent = "Joining...";
    try {
      const sync = await waitForSyncModule();
      if (!sync) throw new Error("Firebase sync module not loaded. Refresh once or check that js/services/firebase-sync.js is uploaded.");
      await sync.joinRoom(room, player);
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
        applyMenuDevStylesV36();
        if (["helpPanelX","helpPanelY","inspectorPanelX","inspectorPanelY"].includes(name)) applyPanelDefaultPositionsV37(true);
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
    document.addEventListener("pointerup", () => { dragDev = null; renderHandDropZoneDebug(); renderHandSafeZoneDebug(); });
  }

  const PLAYMAT_FILES = ["zombi.png","vault.png","urzaglas.png","unicorn.png","terrain.png","terracorn.png","spawn.png","purge.png","phantom.png","pesti.png","mold.png","mire.png","miracle.png","mesa.png","life.png","kudzu.png","hordes.png","hell.png","grem2.png","grem1.png","golem.png","geddon.png","gate.png","flash2.png","flash.png","farm.png","dance.png","cross.png","cland.png","camel.png","boris.png","bluemana2.png","bluemana1.png","allergy2.png","allergy1.png"];
  const TOKEN_FILES = ["wolf.png","wasp.png","thrull.png","tetravite.png","stangg.png","snake.png","saproling.png","sandwarrior.png","rukh.png","minordemon.png","goblin.png","djinn.png","copy.png","citizen.png","aieback.png","camarid.png"];

  function populateGreenMenuLists() {
    if (els.playmatMenu && !els.playmatMenu.dataset.ready) {
      PLAYMAT_FILES.forEach(file => {
        const b = document.createElement("button");
        b.textContent = file.replace(".png","");
        b.onclick = () => { state.playmats[localPlayer] = file; push(); };
        els.playmatMenu.appendChild(b);
      });
      els.playmatMenu.dataset.ready = "1";
    }
    if (els.tokenMenu && !els.tokenMenu.dataset.ready) {
      TOKEN_FILES.forEach(file => {
        if (file === "aieback.png") return;
        const b = document.createElement("button");
        b.textContent = file.replace(".png","");
        b.onclick = () => addToken(file);
        els.tokenMenu.appendChild(b);
      });
      els.tokenMenu.dataset.ready = "1";
    }
  }

  function toggleSection(el, btn) {
    if (!el) return;
    el.classList.toggle("hidden");
    if (btn) btn.classList.toggle("menu-toggle-active", !el.classList.contains("hidden"));
  }

  function addToken(file) {
    const card = { id: uid(), owner: localPlayer, zone: "battlefield", x: 960, y: localPlayer === "p1" ? 720 : 360, z: 1000 + state.cards.length, tapped: false, faceDown: false, marked: false, name: file.replace(".png",""), typeLine: "Token", oracle: "", image: "token/" + file, isToken: true };
    state.cards.push(card); bringToFront(card); push();
  }

  function addCounterDie() {
    state.dice.push({ id: uid(), kind: "counter", owner: localPlayer, value: 3, color: "#25aa3d", pipColor: "#111111", x: 960, y: localPlayer === "p1" ? 720 : 360, z: 2000 });
    push();
  }

  let dieMenuTargetId = null;
  function openDieMenu(e, die) {
    dieMenuTargetId = die.id;
    if (els.dieColorInput) els.dieColorInput.value = die.color || (die.kind === "counter" ? "#25aa3d" : "#eeeeee");
    if (els.diePipColorInput) els.diePipColorInput.value = die.pipColor || "#111111";
    els.dieMenu.style.left = e.clientX + "px";
    els.dieMenu.style.top = e.clientY + "px";
    els.dieMenu.classList.remove("hidden");
  }

  function syncSharedFlipOverlay() {
    if (!state.flipOverlay) state.flipOverlay = { active: false, front: "", nonce: 0 };
    const sig = state.flipOverlay.active ? `${state.flipOverlay.front}:${state.flipOverlay.nonce}` : "off";

    if (sig === localFlipOverlaySignature) return;
    localFlipOverlaySignature = sig;

    if (state.flipOverlay.active) {
      const btn = state.flipOverlay.front === "fallingstar.png" ? els.menuFlipStarBtn : els.menuFlipOrbBtn;
      if (btn) {
        btn.dataset.internalOrbflipOpen = "1";
        btn.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
        delete btn.dataset.internalOrbflipOpen;
      }
    } else {
      const close = document.querySelector("#orbflipExternal .orbflip-close");
      if (close) close.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    }

    updateMenuActiveStates();
  }

  function toggleSharedFlip(front) {
    if (!state.flipOverlay) state.flipOverlay = { active: false, front: "", nonce: 0 };
    if (state.flipOverlay.active && state.flipOverlay.front === front) {
      state.flipOverlay = { active: false, front: "", nonce: Date.now() };
    } else {
      state.flipOverlay = { active: true, front, nonce: Date.now() };
    }
    push();
  }


  function cardsForSideboardPane(player, pane) {
    ensureState();
    return state.cards.filter(c => {
      if (!c || c.owner !== player) return false;
      const inSide = c.zone === playerZone(player, "sideboard");
      return pane === "side" ? inSide : !inSide;
    });
  }

  function sideboardGridColumns(count, pane) {
    if (pane === "side") return 3;
    if (count > 70) return 6;
    if (count > 60) return 7;
    return 6;
  }

  function ensureSideboardPositions(cards, pane) {
    const cols = sideboardGridColumns(cards.length, pane);
    const gapX = 132;
    const gapY = 184;
    const margin = 18;

    cards.forEach((card, i) => {
      if (card.sideEditPane !== pane || typeof card.sideEditX !== "number" || typeof card.sideEditY !== "number") {
        card.sideEditPane = pane;
        card.sideEditX = margin + (i % cols) * gapX;
        card.sideEditY = margin + Math.floor(i / cols) * gapY;
      }
    });
  }


  function resetTableForSideboarding() {
    ensureState();
    selectedIds.clear();
    drag = null;
    handDropPreview = null;
    state.life = { p1: 20, p2: 20 };
    state.dice = makeAllLifeDice(state.life);
    state.revealTop = { p1: false, p2: false };
    state.revealHand = { p1: false, p2: false };

    state.cards = state.cards.filter(card => {
      if (!card || card.isToken) return false;
      const owner = card.owner === "p2" ? "p2" : "p1";
      const isSide = card.zone === playerZone(owner, "sideboard") || card.sideEditPane === "side";
      card.zone = isSide ? playerZone(owner, "sideboard") : playerZone(owner, "library");
      card.sideEditPane = isSide ? "side" : "main";
      card.tapped = false;
      card.faceDown = false;
      card.marked = false;
      card.sylvanChoice = "";
      card.x = 960;
      card.y = owner === "p1" ? 760 : 320;
      return true;
    });
  }

  function finalizeSideboardEditor() {
    if (!localPlayer) return;
    ensureState();

    const side = cardsForSideboardPane(localPlayer, "side");
    if (side.length > 30) {
      alert("Sideboard max is 30 cards.");
      return;
    }

    for (const card of state.cards) {
      if (!card || card.owner !== localPlayer || card.isToken) continue;
      const pane = card.sideEditPane === "side" || card.zone === playerZone(localPlayer, "sideboard") ? "side" : "main";
      card.zone = pane === "side" ? playerZone(localPlayer, "sideboard") : playerZone(localPlayer, "library");
      card.sideEditPane = pane;
      card.tapped = false;
      card.faceDown = false;
      card.marked = false;
      card.sylvanChoice = "";
      card.x = 960;
      card.y = localPlayer === "p1" ? 760 : 320;
      bringToFront(card);
    }

    shuffleInPlace(ownerCards(localPlayer, "library"));
    state.revealTop[localPlayer] = false;
    state.revealHand[localPlayer] = false;
    els.sideboardModal.classList.add("hidden");
    updateMenuActiveStates();
    push();
  }

  function resetSideboardToOriginal() {
    if (!localPlayer) return;
    ensureState();

    for (const card of state.cards) {
      if (!card || card.owner !== localPlayer || card.isToken) continue;
      const pane = card.originalPane === "side" ? "side" : "main";
      card.sideEditPane = pane;
      card.zone = pane === "side" ? playerZone(localPlayer, "sideboard") : playerZone(localPlayer, "library");
      card.tapped = false;
      card.faceDown = false;
      card.marked = false;
      card.sylvanChoice = "";
      card.sideEditX = undefined;
      card.sideEditY = undefined;
    }

    renderSideboardEditor();
  }

  function openSideboardEditor() {
    if (!els.sideboardModal) return;
    resetTableForSideboarding();
    renderSideboardEditor();
    els.sideboardModal.classList.remove("hidden");
    updateMenuActiveStates();
    push();
  }

  function closeSideboardEditor() {
    finalizeSideboardEditor();
  }

  function renderSideboardEditor() {
    if (!localPlayer || !els.mainboardBoard || !els.sideboardBoard) return;

    const main = cardsForSideboardPane(localPlayer, "main");
    const side = cardsForSideboardPane(localPlayer, "side");

    ensureSideboardPositions(main, "main");
    ensureSideboardPositions(side, "side");

    els.mainboardBoard.innerHTML = "";
    els.sideboardBoard.innerHTML = "";

    if (els.mainboardCount) els.mainboardCount.textContent = String(main.length);
    if (els.sideboardCount) {
      els.sideboardCount.textContent = `${side.length} / 30`;
      els.sideboardCount.classList.toggle("sideboard-over-limit", side.length > 30);
    }

    drawSideboardPane(main, "main", els.mainboardBoard);
    drawSideboardPane(side, "side", els.sideboardBoard);

    resizeSideboardBoard(els.mainboardBoard, main);
    resizeSideboardBoard(els.sideboardBoard, side);
  }

  function resizeSideboardBoard(board, cards) {
    const maxX = Math.max(0, ...cards.map(c => Number(c.sideEditX || 0) + 156));
    const maxY = Math.max(0, ...cards.map(c => Number(c.sideEditY || 0) + 205));
    board.style.width = Math.max(board.parentElement?.clientWidth || 0, maxX) + "px";
    board.style.height = Math.max(board.parentElement?.clientHeight || 0, maxY) + "px";
  }

  function drawSideboardPane(cards, pane, board) {
    cards
      .slice()
      .sort((a,b) => (a.sideEditY || 0) - (b.sideEditY || 0) || (a.sideEditX || 0) - (b.sideEditX || 0))
      .forEach(card => {
        const el = document.createElement("div");
        el.className = "sideboard-editor-card" + (String(card.set || "").toLowerCase() === "lea" ? " alpha-card" : "");
        el.dataset.cardId = card.id;
        el.style.left = (Number(card.sideEditX) || 0) + "px";
        el.style.top = (Number(card.sideEditY) || 0) + "px";
        el.style.zIndex = String(card.z || 1);

        if (card.image) {
          const img = document.createElement("img");
          img.src = card.image;
          img.alt = card.name || "";
          img.draggable = false;
          el.appendChild(img);
        } else {
          const back = sleeveBackElement(card.owner, card);
          back.textContent = card.name || "";
          el.appendChild(back);
        }

        el.addEventListener("mouseenter", () => showInspector(card));
        el.addEventListener("mouseleave", () => hideInspector());
        el.addEventListener("pointerdown", e => startSideboardDrag(e, card, pane, el));
        board.appendChild(el);
      });
  }

  function sideboardDropPane(clientX, clientY) {
    const sideRect = els.sideboardScroll?.getBoundingClientRect();
    const mainRect = els.mainboardScroll?.getBoundingClientRect();

    if (sideRect && clientX >= sideRect.left && clientX <= sideRect.right && clientY >= sideRect.top && clientY <= sideRect.bottom) return "side";
    if (mainRect && clientX >= mainRect.left && clientX <= mainRect.right && clientY >= mainRect.top && clientY <= mainRect.bottom) return "main";
    return null;
  }

  function sideboardPanePosition(pane, clientX, clientY, dx, dy) {
    const scroll = pane === "side" ? els.sideboardScroll : els.mainboardScroll;
    const rect = scroll.getBoundingClientRect();
    return {
      x: Math.max(0, clientX - rect.left + scroll.scrollLeft - dx),
      y: Math.max(0, clientY - rect.top + scroll.scrollTop - dy)
    };
  }

  function startSideboardDrag(e, card, pane, el) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    const r = el.getBoundingClientRect();
    const dx = e.clientX - r.left;
    const dy = e.clientY - r.top;
    el.classList.add("dragging");
    el.setPointerCapture?.(e.pointerId);

    const onMove = ev => {
      const currentPane = sideboardDropPane(ev.clientX, ev.clientY) || pane;
      const pos = sideboardPanePosition(currentPane, ev.clientX, ev.clientY, dx, dy);

      if (currentPane !== card.sideEditPane) {
        card.sideEditPane = currentPane;
        if (currentPane === "side") {
          const sideCount = cardsForSideboardPane(localPlayer, "side").filter(c => c.id !== card.id).length;
          if (sideCount >= 30) {
            card.sideEditPane = "main";
          } else {
            card.zone = playerZone(localPlayer, "sideboard");
          }
        } else {
          card.zone = playerZone(localPlayer, "library");
          card.tapped = false;
          card.faceDown = false;
          card.marked = false;
        }
        renderSideboardEditor();
        const next = document.querySelector(`.sideboard-editor-card[data-card-id="${card.id}"]`);
        if (next) {
          el = next;
          el.classList.add("dragging");
          el.setPointerCapture?.(e.pointerId);
        }
      }

      card.sideEditX = pos.x;
      card.sideEditY = pos.y;
      if (el) {
        el.style.left = card.sideEditX + "px";
        el.style.top = card.sideEditY + "px";
      }
    };

    const onUp = ev => {
      document.removeEventListener("pointermove", onMove, true);
      document.removeEventListener("pointerup", onUp, true);
      if (el) el.classList.remove("dragging");
      bringToFront(card);
      renderSideboardEditor();
    };

    document.addEventListener("pointermove", onMove, true);
    document.addEventListener("pointerup", onUp, true);
  }

  function updateMenuActiveStates() {
    const flip = state.flipOverlay || {};
    if (els.inspectorToggleBtn) els.inspectorToggleBtn.classList.toggle("active", inspectorEnabled);
    if (els.chatBtn && els.chatPanel) els.chatBtn.classList.toggle("active", !els.chatPanel.classList.contains("hidden"));
    if (els.helpBtn && els.helpPanel) els.helpBtn.classList.toggle("active", !els.helpPanel.classList.contains("hidden"));
    if (els.menuFlipOrbBtn) els.menuFlipOrbBtn.classList.toggle("active", !!flip.active && flip.front === "chaosfront.png");
    if (els.menuFlipStarBtn) els.menuFlipStarBtn.classList.toggle("active", !!flip.active && flip.front === "fallingstar.png");
if (els.devTuningBtn && els.devPanel) els.devTuningBtn.classList.toggle("active", !els.devPanel.classList.contains("hidden"));
    if (els.loadDeckBtn && els.deckModal) els.loadDeckBtn.classList.toggle("active", !els.deckModal.classList.contains("hidden"));
    if (els.sideboardBtn && els.sideboardModal) els.sideboardBtn.classList.toggle("active", !els.sideboardModal.classList.contains("hidden"));
    if (els.playmatMenuBtn && els.playmatMenu) els.playmatMenuBtn.classList.toggle("active", !els.playmatMenu.classList.contains("hidden"));
    if (els.sleevesMenuBtn && els.sleevesMenu) els.sleevesMenuBtn.classList.toggle("active", !els.sleevesMenu.classList.contains("hidden"));
    if (els.addTokenMenuBtn && els.tokenMenu) els.addTokenMenuBtn.classList.toggle("active", !els.tokenMenu.classList.contains("hidden"));
    updateSleeveButtonsV33();
  }

  function screenRectForCard(card) {
    const pos = card.zone === "battlefield" ? cardRenderPosition(card) : { x: card.x, y: card.y };
    const p1 = screenPoint(pos.x - CARD_W / 2, pos.y - CARD_H / 2);
    const p2 = screenPoint(pos.x + CARD_W / 2, pos.y + CARD_H / 2);
    return {
      left: Math.min(p1.x, p2.x),
      top: Math.min(p1.y, p2.y),
      right: Math.max(p1.x, p2.x),
      bottom: Math.max(p1.y, p2.y)
    };
  }

  function screenPoint(x, y) {
    const rect = els.world.getBoundingClientRect();
    const sx = rect.width / TABLE_W;
    const sy = rect.height / TABLE_H;
    let px = x;
    let py = y;
    if (localPlayer === "p2") {
      px = TABLE_W - x;
      py = TABLE_H - y;
    }
    return { x: rect.left + px * sx, y: rect.top + py * sy };
  }

  function rectsOverlap(a, b) {
    return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
  }

  function beginBoxSelect(e) {
    if (e.button !== 0) return;
    if (e.target.closest(".card,.die,.pile,.hand,.main-menu,.main-menu-btn,.modal,.context-menu,.inspector,.help-panel,.chat-panel,.dev-panel")) return;
    boxSelect = { x0: e.clientX, y0: e.clientY, x1: e.clientX, y1: e.clientY };
    els.selectBox.classList.remove("hidden");
    updateBoxSelect(e);
    document.addEventListener("pointermove", updateBoxSelect);
    document.addEventListener("pointerup", finishBoxSelect, { once: true });
  }

  function updateBoxSelect(e) {
    if (!boxSelect) return;
    boxSelect.x1 = e.clientX;
    boxSelect.y1 = e.clientY;
    const r = {
      left: Math.min(boxSelect.x0, boxSelect.x1),
      top: Math.min(boxSelect.y0, boxSelect.y1),
      right: Math.max(boxSelect.x0, boxSelect.x1),
      bottom: Math.max(boxSelect.y0, boxSelect.y1)
    };
    els.selectBox.style.left = r.left + "px";
    els.selectBox.style.top = r.top + "px";
    els.selectBox.style.width = (r.right - r.left) + "px";
    els.selectBox.style.height = (r.bottom - r.top) + "px";
  }

  function finishBoxSelect(e) {
    document.removeEventListener("pointermove", updateBoxSelect);
    if (!boxSelect) return;
    const r = {
      left: Math.min(boxSelect.x0, boxSelect.x1),
      top: Math.min(boxSelect.y0, boxSelect.y1),
      right: Math.max(boxSelect.x0, boxSelect.x1),
      bottom: Math.max(boxSelect.y0, boxSelect.y1)
    };
    els.selectBox.classList.add("hidden");

    if (Math.abs(r.right - r.left) > 6 || Math.abs(r.bottom - r.top) > 6) {
      const hits = battlefieldCards().filter(card => rectsOverlap(screenRectForCard(card), r)).map(c => c.id);
      selectedIds = new Set(hits);
      render();
    }

    boxSelect = null;
  }
  function rectsOverlapV31(a,b){ return !(a.right<b.left || a.left>b.right || a.bottom<b.top || a.top>b.bottom); }


  function setHelpOpenV33(open) {
    if (!els.helpOverlayV33) return;
    els.helpOverlayV33.classList.toggle("hidden", !open);
    if (open) {
      els.helpOverlayV33.style.pointerEvents = "auto";
      restoreHelpPanelV34();
    }
    updateMenuActiveStates();
  }

  function toggleHelpV33(e = null) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
      if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    }
    if (!els.helpOverlayV33) return;
    setHelpOpenV33(els.helpOverlayV33.classList.contains("hidden"));
  }

  function applyHelpFontV34() {
    if (!els.helpOverlayV33) return;
    els.helpOverlayV33.style.fontSize = helpFont + "px";
  }

  function saveHelpPanelV34() {
    if (!els.helpOverlayV33 || els.helpOverlayV33.classList.contains("hidden")) return;
    const r = els.helpOverlayV33.getBoundingClientRect();
    localStorage.setItem("oldschoolHelpPanelV34", JSON.stringify({
      left: Math.round(r.left),
      top: Math.round(r.top),
      width: Math.round(r.width),
      height: Math.round(r.height),
      font: helpFont
    }));
  }

  function restoreHelpPanelV34() {
    if (!els.helpOverlayV33) return;
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem("oldschoolHelpPanelV34") || "{}"); }
    catch { saved = {}; }

    if (saved.font != null) helpFont = Math.max(10, Math.min(28, Number(saved.font) || 15));
    applyHelpFontV34();

    if (saved.left != null) els.helpOverlayV33.style.left = saved.left + "px";
    if (saved.top != null) els.helpOverlayV33.style.top = saved.top + "px";
    if (saved.width != null) els.helpOverlayV33.style.width = saved.width + "px";
    if (saved.height != null) els.helpOverlayV33.style.height = saved.height + "px";
  }

  function bindHelpPanelV34() {
    if (!els.helpOverlayV33) return;

    restoreHelpPanelV34();

    let dragHelp = null;

    if (els.helpHeader) {
      els.helpHeader.addEventListener("pointerdown", e => {
        if (e.target.closest?.("button")) return;
        const r = els.helpOverlayV33.getBoundingClientRect();
        dragHelp = { dx: e.clientX - r.left, dy: e.clientY - r.top };
        e.preventDefault();
        e.stopPropagation();
      });
    }

    document.addEventListener("pointermove", e => {
      if (!dragHelp) return;
      const panel = els.helpOverlayV33;
      const width = panel.offsetWidth || 360;
      const height = panel.offsetHeight || 260;
      const left = Math.max(0, Math.min(window.innerWidth - Math.min(80, width), e.clientX - dragHelp.dx));
      const top = Math.max(0, Math.min(window.innerHeight - Math.min(40, height), e.clientY - dragHelp.dy));
      panel.style.left = left + "px";
      panel.style.top = top + "px";
      e.preventDefault();
    });

    document.addEventListener("pointerup", () => {
      if (!dragHelp) return;
      dragHelp = null;
      saveHelpPanelV34();
    });

    if (els.helpMinus) {
      els.helpMinus.onclick = e => {
        e.preventDefault();
        e.stopPropagation();
        helpFont = Math.max(10, helpFont - 1);
        applyHelpFontV34();
        saveHelpPanelV34();
      };
    }

    if (els.helpPlus) {
      els.helpPlus.onclick = e => {
        e.preventDefault();
        e.stopPropagation();
        helpFont = Math.min(28, helpFont + 1);
        applyHelpFontV34();
        saveHelpPanelV34();
      };
    }

    if (window.ResizeObserver) {
      new ResizeObserver(() => saveHelpPanelV34()).observe(els.helpOverlayV33);
    }
  }

  function updateSleeveButtonsV33(){
    if(!localPlayer)return;
    const s=sleeveForPlayerV35(localPlayer);
    if(els.ogBackSleeveBtn){
      els.ogBackSleeveBtn.classList.toggle("active",s.type==="og");
      els.ogBackSleeveBtn.setAttribute("aria-pressed", String(s.type==="og"));
    }
    if(els.colorSleeveBtn){
      els.colorSleeveBtn.classList.toggle("active",s.type==="color");
      els.colorSleeveBtn.setAttribute("aria-pressed", String(s.type==="color"));
    }
    if(els.sleeveColorInput)els.sleeveColorInput.value=s.color;
  }
  function setSleeveV33(type){
    if(!localPlayer)return;
    const current=sleeveForPlayerV35(localPlayer);
    const pickedColor=els.sleeveColorInput?.value || current.color || "#6a3b20";
    state.sleeves[localPlayer]=type==="color"
      ? {type:"color",color:pickedColor}
      : {type:"og",color:current.color || "#6a3b20"};
    updateSleeveButtonsV33();
    push();
  }
  let boxSelectV33=null;
  function beginBoxSelectV33(e){
    if(e.button!==0||!localPlayer||!e.shiftKey)return;
    if(e.target.closest(".card,.die,.pile,.hand,.main-menu,.main-menu-btn,.modal,.context-menu,.inspector,.help-panel,.chat-panel,.dev-panel,.sylvan-panel"))return;
    boxSelectV33={x0:e.clientX,y0:e.clientY,x1:e.clientX,y1:e.clientY};
    if (!els.selectBox) {
      els.selectBox = document.createElement("div");
      els.selectBox.id = "selectBox";
      els.selectBox.className = "select-box hidden";
      document.body.appendChild(els.selectBox);
    }
    els.selectBox.classList.remove("hidden");
    updateBoxSelectV33(e);
    e.preventDefault();
    document.addEventListener("pointermove",updateBoxSelectV33);
    document.addEventListener("pointerup",finishBoxSelectV33,{once:true});
  }
  function updateBoxSelectV33(e){
    if(!boxSelectV33)return;
    boxSelectV33.x1=e.clientX;boxSelectV33.y1=e.clientY;
    const l=Math.min(boxSelectV33.x0,boxSelectV33.x1),t=Math.min(boxSelectV33.y0,boxSelectV33.y1),r=Math.max(boxSelectV33.x0,boxSelectV33.x1),b=Math.max(boxSelectV33.y0,boxSelectV33.y1);
    els.selectBox.style.left=l+"px";els.selectBox.style.top=t+"px";els.selectBox.style.width=(r-l)+"px";els.selectBox.style.height=(b-t)+"px";
  }
  function finishBoxSelectV33(e){
    document.removeEventListener("pointermove",updateBoxSelectV33);
    if(!boxSelectV33)return;
    const sel={
      left:Math.min(boxSelectV33.x0,boxSelectV33.x1),
      top:Math.min(boxSelectV33.y0,boxSelectV33.y1),
      right:Math.max(boxSelectV33.x0,boxSelectV33.x1),
      bottom:Math.max(boxSelectV33.y0,boxSelectV33.y1)
    };
    if (els.selectBox) els.selectBox.classList.add("hidden");

    if((sel.right-sel.left)>5||(sel.bottom-sel.top)>5){
      const cardIds=[];
      document.querySelectorAll("#cardLayer .card").forEach(el=>{
        const id=el.dataset.cardId;
        if(!id)return;
        const r=el.getBoundingClientRect();
        if(!(r.right<sel.left||r.left>sel.right||r.bottom<sel.top||r.top>sel.bottom)) cardIds.push(id);
      });

      const dieIds=[];
      document.querySelectorAll("#diceLayer .die").forEach(el=>{
        const id=el.dataset.dieId;
        if(!id)return;
        const r=el.getBoundingClientRect();
        if(!(r.right<sel.left||r.left>sel.right||r.bottom<sel.top||r.top>sel.bottom)) dieIds.push(id);
      });

      selectedIds=new Set(cardIds);
      selectedDieIds=new Set(dieIds);
      render();
    }
    boxSelectV33=null;
  }
  // UI bindings
  if(els.ogBackSleeveBtn)els.ogBackSleeveBtn.onclick=e=>{e.preventDefault();e.stopPropagation();setSleeveV33("og");};
  if(els.colorSleeveBtn)els.colorSleeveBtn.onclick=e=>{e.preventDefault();e.stopPropagation();setSleeveV33("color");};
  if(els.sleeveColorInput)els.sleeveColorInput.oninput=()=>{if(state.sleeves?.[localPlayer]?.type==="color")setSleeveV33("color");};
  updateSleeveButtonsV33();
  els.world.addEventListener("pointerdown",beginBoxSelectV33);
  document.addEventListener("pointerdown", e => {
    if (!localPlayer || boxSelectV33) return;
    if (!e.shiftKey) {
      const clickedSelectable = e.target.closest?.(".card,.die,.table-stone");
      const clickedUi = e.target.closest?.(".main-menu,.main-menu-btn,.modal,.context-menu,.inspector,.help-panel,.chat-panel,.dev-panel,.sylvan-panel,button,input,textarea,select");
      if (!clickedSelectable && !clickedUi && (selectedIds.size || selectedDieIds.size)) {
        selectedIds.clear();
        selectedDieIds.clear();
        render();
      }
      return;
    }
    if (!e.target.closest?.("#world,#viewport")) return;
    beginBoxSelectV33(e);
  }, true);


  els.joinR1P1.onclick = () => join("room1", "p1");
  els.joinR1P2.onclick = () => join("room1", "p2");
  els.joinR2P1.onclick = () => join("room2", "p1");
  els.joinR2P2.onclick = () => join("room2", "p2");
  els.kickRoom1.onclick = async () => {
    const sync = await waitForSyncModule(2500);
    if (sync?.kickRoom) sync.kickRoom("room1");
  };
  els.kickRoom2.onclick = async () => {
    const sync = await waitForSyncModule(2500);
    if (sync?.kickRoom) sync.kickRoom("room2");
  };

  els.mainMenuBtn.onclick = () => els.mainMenu.classList.toggle("hidden");
  populateGreenMenuLists();
  if (els.playmatMenuBtn) els.playmatMenuBtn.onclick = () => toggleSection(els.playmatMenu, els.playmatMenuBtn);
  if (els.sleevesMenuBtn) els.sleevesMenuBtn.onclick = () => toggleSection(els.sleevesMenu, els.sleevesMenuBtn);
  if (els.addTokenMenuBtn) els.addTokenMenuBtn.onclick = () => toggleSection(els.tokenMenu, els.addTokenMenuBtn);
  if (els.addDiceBtn) els.addDiceBtn.onclick = () => addCounterDie();
  if (els.throwDiceBtn) els.throwDiceBtn.onclick = e => { e.preventDefault(); e.stopPropagation(); throwDiceAnimated(); };
  if (els.menuFlipOrbBtn) els.menuFlipOrbBtn.onclick = e => { e.preventDefault(); e.stopPropagation(); toggleSharedFlip("chaosfront.png"); };
  if (els.menuFlipStarBtn) els.menuFlipStarBtn.onclick = e => { e.preventDefault(); e.stopPropagation(); toggleSharedFlip("fallingstar.png"); };
  if (els.dieMenu) els.dieMenu.addEventListener("click", e => {
    const btn = e.target.closest("button[data-die-value]");
    if (!btn) return;
    const die = state.dice.find(d => d.id === dieMenuTargetId);
    if (!die) return;
    die.value = Number(btn.dataset.dieValue);
    if (die.kind === "life") state.life[die.owner] = state.dice.filter(d => d.kind === "life" && d.owner === die.owner).reduce((a,d)=>a+Number(d.value||0),0);
    closeMenus();
    push();
  });
  if (els.dieColorInput) els.dieColorInput.oninput = () => {
    const die = state.dice.find(d => d.id === dieMenuTargetId);
    if (!die) return;
    die.color = els.dieColorInput.value;
    push();
  };
  if (els.diePipColorInput) els.diePipColorInput.oninput = () => {
    const die = state.dice.find(d => d.id === dieMenuTargetId);
    if (!die) return;
    die.pipColor = els.diePipColorInput.value;
    push();
  };

  els.sylvanOk.onclick = () => finishSylvanLibrary();

  els.loadDeckBtn.onclick = () => { els.deckModal.classList.toggle("hidden"); updateMenuActiveStates(); };
  if (els.sideboardBtn) els.sideboardBtn.onclick = () => { if (els.sideboardModal.classList.contains("hidden")) openSideboardEditor(); else closeSideboardEditor(); };
  if (els.closeSideboardEditor) els.closeSideboardEditor.onclick = finalizeSideboardEditor;
  if (els.resetOriginalSideboard) els.resetOriginalSideboard.onclick = resetSideboardToOriginal;
  if (els.closeDeckModal) els.closeDeckModal.onclick = () => { els.deckModal.classList.add("hidden"); updateMenuActiveStates(); };
  els.doLoadDeck.onclick = loadDeck;
  els.devTuningBtn.onclick = () => {
    if (els.devPanel.classList.contains("hidden")) {
      const pass = prompt("DEV TUNING PASSWORD");
      if (pass !== "perseensuti") {
        updateMenuActiveStates();
        return;
      }
      els.devPanel.classList.remove("hidden");
    } else {
      els.devPanel.classList.add("hidden");
    }
    renderHandDropZoneDebug();
    renderHandSafeZoneDebug();
    updateMenuActiveStates();
  };
  els.devClose.onclick = () => { els.devPanel.classList.add("hidden"); updateMenuActiveStates(); };
  els.devReset.onclick = () => { dev = { ...devDefaults }; saveDev(); applyMenuDevStylesV36(); bindDev(); render(); };
  els.devCopy.onclick = async () => { const text = JSON.stringify(dev, null, 2); els.devOutput.value = text; try { await navigator.clipboard.writeText(text); } catch {} };
  els.leaveBtn.onclick = () => window.FirebaseCleanSync?.leaveRoom();
  els.resetVoteBtn.onclick = () => { if (confirm("Are you sure? Other player must also confirm.")) window.FirebaseCleanSync?.voteReset(true); };
  els.acceptReset.onclick = () => window.FirebaseCleanSync?.voteReset(true);
  els.rejectReset.onclick = () => { window.FirebaseCleanSync?.voteReset(false); els.resetPrompt.classList.add("hidden"); };

  els.closeTutor.onclick = () => els.tutorModal.classList.add("hidden");
  els.tutorToHand.onclick = () => takeTutor("hand");
  els.tutorToTable.onclick = () => takeTutor("table");
  els.closeGrave.onclick = () => els.graveModal.classList.add("hidden");
  if (els.closeExile) els.closeExile.onclick = () => els.exileModal.classList.add("hidden");

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

  function startSylvanLibrary(player = localPlayer) {
    const n = Math.max(3, Math.min(7, Number(sylvanCount) || 3));
    const drawn = [];
    for (let i = 0; i < n; i++) {
      const lib = ownerCards(player, "library");
      if (!lib.length) break;
      const card = lib[lib.length - 1];
      card.zone = player + "-hand";
      card.tapped = false;
      card.faceDown = false;
      card.marked = false;
      card.sylvanChoice = "keep";
      drawn.push(card);
      state.cards=state.cards.filter(c=>c.id!==card.id).concat(card);
      bringToFront(card);
    }
    positionSylvanPanel(player);
    push();
  }

  function finishSylvanLibrary() {
    const player = localPlayer;
    const cards = ownerCards(player, "hand").filter(c => c.sylvanChoice);
    const toTop = cards.filter(c => c.sylvanChoice === "top");
    const toSecond = cards.filter(c => c.sylvanChoice === "second");
    const keep = cards.filter(c => c.sylvanChoice === "keep");

    keep.forEach(c => delete c.sylvanChoice);

    const zone = player + "-library";
    // top card must be last card in state.cards among the library zone.
    toSecond.forEach(c => { delete c.sylvanChoice; c.zone = zone; c.tapped = false; c.faceDown = false; c.marked = false; });
    toTop.forEach(c => { delete c.sylvanChoice; c.zone = zone; c.tapped = false; c.faceDown = false; c.marked = false; });

    const moving = new Set([...toSecond, ...toTop].map(c => c.id));
    const movedSecond = toSecond;
    const movedTop = toTop;
    state.cards = state.cards.filter(c => !moving.has(c.id)).concat(movedSecond).concat(movedTop);

    els.sylvanPanel.classList.add("hidden");
    push();
  }

  function positionSylvanPanel(player = localPlayer) {
    const pile = pileScreenEl(player, "library");
    if (!pile || !els.sylvanPanel) return;
    const r = pile.getBoundingClientRect();
    els.sylvanPanel.style.left = (r.left + r.width / 2) + "px";
    els.sylvanPanel.style.top = (r.top + r.height / 2) + "px";
    els.sylvanPanel.classList.remove("hidden");
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
    if (a === "clone") {
      const copy = clone(card);
      copy.id = uid();
      copy.isToken = true;
      copy.name = card.name || "copy";
      copy.typeLine = (card.typeLine || "Token") + " Token";
      copy.zone = "battlefield";
      copy.x = (card.x || 960) + 28;
      copy.y = (card.y || 540) + 28;
      copy.faceDown = false;
      copy.marked = false;
      copy.tapped = false;
      bringToFront(copy);
      state.cards.push(copy);
    }
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
    if (/^[1-6]$/.test(e.key)) {
      const die = state.dice.find(d => d.id === hoveredDieId);
      if (die) {
        die.value = Number(e.key);
        if (die.kind === "life") state.life[die.owner] = state.dice.filter(d => d.kind === "life" && d.owner === die.owner).reduce((a,d)=>a+Number(d.value||0),0);
        push();
        e.preventDefault();
        return;
      }
    }
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
    const sens=Number(dev.handScrollSensitivity||1);
    const speed=Number(dev.handScrollSpeed||1);
    const maxSpread=Number(dev.handFanMaxSpread||70);
    if(Math.abs(e.deltaX)>Math.abs(e.deltaY)){
      if(Math.abs(e.deltaX)>2) handDepth[localPlayer]=e.deltaX>0?1:-1;
    }else{
      handFan[localPlayer]=Math.max(-100,Math.min(maxSpread,(handFan[localPlayer]||0)-e.deltaY*0.16*sens*speed));
    }
    renderHands();
  }, { passive: false });


  function renderChatMessages() {
    if (!els.chatMessages) return;
    ensureState();
    const messages = Array.isArray(state.chat) ? state.chat.slice(-120) : [];
    const atBottom = els.chatMessages.scrollTop + els.chatMessages.clientHeight >= els.chatMessages.scrollHeight - 24;
    els.chatMessages.innerHTML = "";
    messages.forEach(msg => {
      const row = document.createElement("div");
      row.className = "chat-message " + (msg.player === "p2" ? "chat-p2" : "chat-p1");

      const name = document.createElement("span");
      name.className = "chat-name";
      name.textContent = (msg.name || "Player") + ": ";

      const text = document.createElement("span");
      text.className = "chat-text";
      text.textContent = msg.text || "";

      row.appendChild(name);
      row.appendChild(text);
      els.chatMessages.appendChild(row);
    });
    if (atBottom) els.chatMessages.scrollTop = els.chatMessages.scrollHeight;
  }

  function sendChatMessage() {
    if (!els.chatText) return;
    const text = String(els.chatText.value || "").trim();
    if (!text) return;
    ensureState();
    state.chat = (Array.isArray(state.chat) ? state.chat : []).concat({
      id: uid(),
      player: localPlayer || "",
      name: localNickname || localPlayer || "Player",
      text: text.slice(0, 240),
      time: Date.now()
    }).slice(-200);
    els.chatText.value = "";
    push();
    renderChatMessages();
  }


  function makeThrowDieFace(value) {
    const el = document.createElement("div");
    el.className = "throw-die-visual throw-die-cube";
    const faces = ["front","right","top"];
    faces.forEach((faceName, idx) => {
      const face = document.createElement("div");
      face.className = "throw-die-face throw-die-" + faceName;
      const faceValue = idx === 0 ? value : (1 + Math.floor(Math.random() * 6));
      for (const p of PIPS[Math.max(1, Math.min(6, Number(faceValue) || 1))]) {
        const pip = document.createElement("div");
        pip.className = "throw-pip p" + p;
        face.appendChild(pip);
      }
      el.appendChild(face);
    });
    return el;
  }

  function updateThrowDieFace(el, value) {
    const front = el.querySelector(".throw-die-front") || el;
    front.innerHTML = "";
    for (const p of PIPS[Math.max(1, Math.min(6, Number(value) || 1))]) {
      const pip = document.createElement("div");
      pip.className = "throw-pip p" + p;
      front.appendChild(pip);
    }
  }

  function throwDiceAnimated() {
    if (!localPlayer || !els.world) return;
    const count = Math.max(1, Math.min(2, Number(els.throwDiceCount?.value || 1)));
    const root = document.createElement("div");
    root.className = "throw-dice-overlay";
    document.body.appendChild(root);

    const worldRect = els.world.getBoundingClientRect();
    const tableCenterX = worldRect.left + worldRect.width * (localPlayer === "p2" ? 0.56 : 0.50);
    const tableCenterY = worldRect.top + worldRect.height * (localPlayer === "p2" ? 0.42 : 0.58);
    const side = Math.floor(Math.random() * 4);

    const dice = Array.from({ length: count }, (_, i) => {
      const value = 1 + Math.floor(Math.random() * 6);
      const el = makeThrowDieFace(value);
      root.appendChild(el);

      let startX, startY;
      if (side === 0) { startX = -80 - i * 40; startY = Math.random() * innerHeight; }
      else if (side === 1) { startX = innerWidth + 80 + i * 40; startY = Math.random() * innerHeight; }
      else if (side === 2) { startX = Math.random() * innerWidth; startY = -80 - i * 40; }
      else { startX = Math.random() * innerWidth; startY = innerHeight + 80 + i * 40; }

      const targetX = tableCenterX + (Math.random() - 0.5) * Math.min(360, worldRect.width * 0.35) + i * 42;
      const targetY = tableCenterY + (Math.random() - 0.5) * Math.min(220, worldRect.height * 0.25) + i * 28;

      return {
        el,
        value,
        x: startX,
        y: startY,
        tx: targetX,
        ty: targetY,
        vx: (targetX - startX) / 64,
        vy: (targetY - startY) / 64,
        rotX: Math.random() * 360,
        rotY: Math.random() * 360,
        rotZ: Math.random() * 360,
        spinX: 18 + Math.random() * 18,
        spinY: 18 + Math.random() * 18,
        spinZ: 12 + Math.random() * 20
      };
    });

    const frames = 76;
    let frame = 0;

    function step() {
      frame++;
      const t = Math.min(1, frame / frames);
      const ease = 1 - Math.pow(1 - t, 3);
      const bounce = Math.sin(t * Math.PI) * 90;

      if (dice.length === 2) {
        const a = dice[0], b = dice[1];
        const dx = a.x - b.x, dy = a.y - b.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 0 && dist < 58 && frame < 58) {
          const nx = dx / dist, ny = dy / dist;
          a.tx += nx * 24; a.ty += ny * 24;
          b.tx -= nx * 24; b.ty -= ny * 24;
          a.spinZ *= -0.92; b.spinZ *= -0.92;
        }
      }

      dice.forEach((d, i) => {
        d.x += (d.tx - d.x) * (0.055 + t * 0.035);
        d.y += (d.ty - d.y) * (0.055 + t * 0.035);
        d.rotX += d.spinX * (1 - t * 0.72);
        d.rotY += d.spinY * (1 - t * 0.72);
        d.rotZ += d.spinZ * (1 - t * 0.72);

        if (frame % 6 === 0 && t < 0.82) updateThrowDieFace(d.el, 1 + Math.floor(Math.random() * 6));

        const scale = 1.9 - ease * 0.9;
        const lift = -bounce;
        d.el.style.left = d.x + "px";
        d.el.style.top = (d.y + lift) + "px";
        d.el.style.transform =
          `translate(-50%, -50%) perspective(520px) rotateX(${d.rotX}deg) rotateY(${d.rotY}deg) rotateZ(${d.rotZ}deg) scale(${scale})`;
      });

      if (frame < frames) {
        requestAnimationFrame(step);
        return;
      }

      dice.forEach(d => {
        updateThrowDieFace(d.el, d.value);
        const p = tablePoint(d.tx, d.ty, true);
        state.dice.push({
          id: uid(),
          kind: "counter",
          owner: localPlayer,
          value: d.value,
          color: "#eeeeee",
          pipColor: "#111111",
          x: p.x,
          y: p.y,
          z: 3000 + Math.floor(Math.random() * 1000)
        });
      });

      root.remove();
      push();
    }

    requestAnimationFrame(step);
  }


  function bindChatPanel() {
    if (!els.chatBtn || !els.chatPanel || !els.chatHeader) return;

    let chatFont = Number(localStorage.getItem("oldschoolChatFontV1") || dev.chatFontSize || 14);
    const saved = (() => {
      try { return JSON.parse(localStorage.getItem("oldschoolChatPanelV1") || "{}"); }
      catch { return {}; }
    })();

    els.chatPanel.style.fontSize = chatFont + "px";
    if (saved.left != null) els.chatPanel.style.left = saved.left + "px";
    else els.chatPanel.style.left = (Number(dev.chatPanelX) || 1280) + "px";
    if (saved.top != null) els.chatPanel.style.top = saved.top + "px";
    else els.chatPanel.style.top = (Number(dev.chatPanelY) || 42) + "px";
    if (saved.width != null) els.chatPanel.style.width = saved.width + "px";
    if (saved.height != null) els.chatPanel.style.height = saved.height + "px";

    function saveChatPanel() {
      const r = els.chatPanel.getBoundingClientRect();
      localStorage.setItem("oldschoolChatPanelV1", JSON.stringify({
        left: Math.round(r.left),
        top: Math.round(r.top),
        width: Math.round(r.width),
        height: Math.round(r.height)
      }));
    }

    els.chatBtn.onclick = e => {
      e.preventDefault();
      e.stopPropagation();
      els.chatPanel.classList.toggle("hidden");
      renderChatMessages();
      updateMenuActiveStates();
    };

    if (els.chatSend) els.chatSend.onclick = e => {
      e.preventDefault();
      e.stopPropagation();
      sendChatMessage();
    };

    if (els.chatText) els.chatText.addEventListener("keydown", e => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendChatMessage();
      }
    });

    if (els.chatMinus) els.chatMinus.onclick = e => {
      e.preventDefault();
      e.stopPropagation();
      chatFont = Math.max(9, chatFont - 1);
      els.chatPanel.style.fontSize = chatFont + "px";
      localStorage.setItem("oldschoolChatFontV1", String(chatFont));
    };

    if (els.chatPlus) els.chatPlus.onclick = e => {
      e.preventDefault();
      e.stopPropagation();
      chatFont = Math.min(28, chatFont + 1);
      els.chatPanel.style.fontSize = chatFont + "px";
      localStorage.setItem("oldschoolChatFontV1", String(chatFont));
    };

    let dragChat = null;
    els.chatHeader.addEventListener("pointerdown", e => {
      const r = els.chatPanel.getBoundingClientRect();
      dragChat = { dx: e.clientX - r.left, dy: e.clientY - r.top };
      e.preventDefault();
      e.stopPropagation();
    });

    document.addEventListener("pointermove", e => {
      if (!dragChat) return;
      const left = Math.max(0, Math.min(window.innerWidth - 80, e.clientX - dragChat.dx));
      const top = Math.max(0, Math.min(window.innerHeight - 40, e.clientY - dragChat.dy));
      els.chatPanel.style.left = left + "px";
      els.chatPanel.style.top = top + "px";
      els.chatPanel.style.right = "auto";
      els.chatPanel.style.bottom = "auto";
      e.preventDefault();
    });

    document.addEventListener("pointerup", () => {
      if (!dragChat) return;
      dragChat = null;
      saveChatPanel();
    });

    if (window.ResizeObserver) new ResizeObserver(() => saveChatPanel()).observe(els.chatPanel);
  }

  function bindHelpPanel() {
    if (!els.helpBtn || !els.helpPanel || !els.helpHeader) return;

    let helpFont = Number(localStorage.getItem("oldschoolHelpFontV1") || 15);
    const saved = (() => {
      try { return JSON.parse(localStorage.getItem("oldschoolHelpPanelV1") || "{}"); }
      catch { return {}; }
    })();

    els.helpPanel.style.fontSize = helpFont + "px";
    if (saved.left != null) els.helpPanel.style.left = saved.left + "px";
    else els.helpPanel.style.left = (Number(dev.helpPanelX) || 40) + "px";
    if (saved.top != null) els.helpPanel.style.top = saved.top + "px";
    else els.helpPanel.style.top = (Number(dev.helpPanelY) || 120) + "px";
    if (saved.width != null) els.helpPanel.style.width = saved.width + "px";
    if (saved.height != null) els.helpPanel.style.height = saved.height + "px";

    function saveHelpPanel() {
      const r = els.helpPanel.getBoundingClientRect();
      localStorage.setItem("oldschoolHelpPanelV1", JSON.stringify({
        left: Math.round(r.left),
        top: Math.round(r.top),
        width: Math.round(r.width),
        height: Math.round(r.height)
      }));
    }

    els.helpBtn.onclick = e => {
      e.preventDefault();
      e.stopPropagation();
      els.helpPanel.classList.toggle("hidden");
      updateMenuActiveStates();
    };

    if (els.helpMinus) els.helpMinus.onclick = e => {
      e.preventDefault();
      e.stopPropagation();
      helpFont = Math.max(9, helpFont - 1);
      els.helpPanel.style.fontSize = helpFont + "px";
      localStorage.setItem("oldschoolHelpFontV1", String(helpFont));
    };

    if (els.helpPlus) els.helpPlus.onclick = e => {
      e.preventDefault();
      e.stopPropagation();
      helpFont = Math.min(28, helpFont + 1);
      els.helpPanel.style.fontSize = helpFont + "px";
      localStorage.setItem("oldschoolHelpFontV1", String(helpFont));
    };

    let dragHelp = null;
    els.helpHeader.addEventListener("pointerdown", e => {
      const r = els.helpPanel.getBoundingClientRect();
      dragHelp = { dx: e.clientX - r.left, dy: e.clientY - r.top };
      e.preventDefault();
      e.stopPropagation();
    });

    document.addEventListener("pointermove", e => {
      if (!dragHelp) return;
      const left = Math.max(0, Math.min(window.innerWidth - 80, e.clientX - dragHelp.dx));
      const top = Math.max(0, Math.min(window.innerHeight - 40, e.clientY - dragHelp.dy));
      els.helpPanel.style.left = left + "px";
      els.helpPanel.style.top = top + "px";
      els.helpPanel.style.right = "auto";
      els.helpPanel.style.bottom = "auto";
      e.preventDefault();
    });

    document.addEventListener("pointerup", () => {
      if (!dragHelp) return;
      dragHelp = null;
      saveHelpPanel();
    });

    new ResizeObserver(() => saveHelpPanel()).observe(els.helpPanel);
  }


  function bindInspectorPanel() {
    const saved = (() => {
      try { return JSON.parse(localStorage.getItem("oldschoolInspectorPanelV26") || "{}"); }
      catch { return {}; }
    })();

    const savedLeft = Number(saved.left);
    const savedTop = Number(saved.top);
    const hasSavedPos = Number.isFinite(savedLeft) && Number.isFinite(savedTop);
    const defaultX = Number(dev.inspectorPanelX);
    const defaultY = Number(dev.inspectorPanelY);
    const pos = hasSavedPos
      ? clampPanelPosition(els.inspector, savedLeft, savedTop)
      : ((defaultX < 0 || defaultY < 0)
          ? panelCenterPosition(els.inspector)
          : clampPanelPosition(els.inspector, defaultX, defaultY));
    els.inspector.style.left = pos.x + "px";
    els.inspector.style.top = pos.y + "px";
    if (saved.width != null) els.inspector.style.width = saved.width + "px";
    if (saved.height != null) els.inspector.style.height = saved.height + "px";

    let dragInspector = null;

    els.inspectorHeader.addEventListener("pointerdown", e => {
      if (!inspectorEnabled) return;
      const r = els.inspector.getBoundingClientRect();
      dragInspector = { dx: e.clientX - r.left, dy: e.clientY - r.top };
      e.preventDefault();
      e.stopPropagation();
    });

    document.addEventListener("pointermove", e => {
      if (!dragInspector) return;
      const left = Math.max(0, Math.min(window.innerWidth - 80, e.clientX - dragInspector.dx));
      const top = Math.max(0, Math.min(window.innerHeight - 40, e.clientY - dragInspector.dy));
      els.inspector.style.left = left + "px";
      els.inspector.style.top = top + "px";
      els.inspector.style.right = "auto";
      els.inspector.style.bottom = "auto";
      e.preventDefault();
    });

    document.addEventListener("pointerup", () => {
      if (!dragInspector) return;
      dragInspector = null;
      saveInspectorPanel();
    });

    new ResizeObserver(() => {
      if (inspectorEnabled) saveInspectorPanel();
    }).observe(els.inspector);

    clearInspectorContent();
  }

  function saveInspectorPanel() {
    const r = els.inspector.getBoundingClientRect();
    localStorage.setItem("oldschoolInspectorPanelV26", JSON.stringify({
      left: Math.round(r.left),
      top: Math.round(r.top),
      width: Math.round(r.width),
      height: Math.round(r.height)
    }));
  }

  if (els.inspectorToggleBtn) {
    els.inspectorToggleBtn.onclick = e => {
      e.preventDefault();
      e.stopPropagation();
      inspectorEnabled = !inspectorEnabled;

      if (inspectorEnabled) {
        const card = state.cards.find(c => c.id === currentInspectorCardId);
        if (card) showInspector(card);
        else clearInspectorContent();
      } else {
        els.inspector.classList.add("hidden");
      }

      updateMenuActiveStates();
    };
    els.inspectorToggleBtn.classList.toggle("active", inspectorEnabled);
  }

  document.addEventListener("click", e => {
    const orbBtn = els.menuFlipOrbBtn;
    const starBtn = els.menuFlipStarBtn;
    if (e.target === orbBtn && !orbBtn.dataset.internalOrbflipOpen) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      toggleSharedFlip("chaosfront.png");
    }
    if (e.target === starBtn && !starBtn.dataset.internalOrbflipOpen) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      toggleSharedFlip("fallingstar.png");
    }
  }, true); // v27FlipCapture

  bindInspectorPanel();
  bindChatPanel();
  bindHelpPanel();

  document.addEventListener("click", e => {
    if (e.target && e.target.closest && e.target.closest("#orbflipExternal .orbflip-close")) {
      if (state.flipOverlay && state.flipOverlay.active) {
        state.flipOverlay = { active: false, front: "", nonce: Date.now() };
        push();
      }
    }
  }, true); // v27OrbCloseSync

  bindDev();

  document.addEventListener("click", e => {
    if (e.target && e.target.closest && e.target.closest("#orbflipExternal .orbflip-close")) {
      if (state.flipOverlay && state.flipOverlay.active) {
        state.flipOverlay = { active: false, front: "", nonce: Date.now() };
        push();
      }
    }
  }, true); // v27OrbCloseSync

  bindDev();


  // v17: robust battlefield double-click tap/untap.
  // Detects second click on pointerdown capture, before the drag handler starts.
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

  let lastTapClick = { id: null, t: 0, x: 0, y: 0 };

  document.addEventListener("pointerdown", e => {
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

  document.addEventListener("dblclick", e => {
    const el = e.target.closest?.(".card");
    if (!el) return;
    toggleBattlefieldTapFromElement(el, e);
  }, true);


  window.CleanTable = {
    initialState,
    applyRemoteState,
    setLocalSeat,
    onResetVoteChanged
  };
})();
