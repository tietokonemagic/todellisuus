(() => {
  "use strict";

  const TABLE_W = 1920;
  const TABLE_H = 1080;
  const CARD_W = 118;
  const CARD_H = 165;
  const GRID = 4;

  function ensureSharedStateShape() {
    if (!state || typeof state !== "object") state = getInitialSharedState();
    if (!Array.isArray(state.cards)) state.cards = [];
    if (!Array.isArray(state.dice)) state.dice = getInitialSharedState().dice;
    if (!state.revealTop || typeof state.revealTop !== "object") state.revealTop = { p1: false, p2: false };
    if (!state.revealHand || typeof state.revealHand !== "object") state.revealHand = { p1: false, p2: false };
    if (!state.playmats || typeof state.playmats !== "object") state.playmats = { p1: "default-green", p2: "default-blue" };
  }


  let localRoom = null;
  let localPlayer = null;
  let selectedIds = new Set();
  let hoveredCardId = null;
  let selectedTutorId = null;
  let contextPlayer = null;
  let drag = null;

  const els = {};
  [
    "seatScreen","seatStatus","joinR1P1","joinR1P2","joinR2P1","joinR2P2","kickRoom1","kickRoom2",
    "game","viewport","world","cardLayer","diceLayer","myHand","opponentHand",
    "p1LibCount","p2LibCount","p1GraveCount","p2GraveCount","p1ExileCount","p2ExileCount",
    "mainMenuBtn","mainMenu","loadDeckBtn","playmatBtn","helpBtn","resetVoteBtn","leaveBtn","roomInfo",
    "deckModal","deckText","doLoadDeck","closeDeckModal","deckStatus",
    "tutorModal","tutorGrid","tutorToHand","tutorToTable","closeTutor",
    "graveModal","graveGrid","closeGrave","helpModal","closeHelp",
    "libraryMenu","resetPrompt","acceptReset","rejectReset",
    "p1Library","p2Library","p1Mat","p2Mat"
  ].forEach(id => els[id] = document.getElementById(id));

  let state = getInitialSharedState();

  function uid() {
    return crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2);
  }

  function getInitialSharedState() {
    return {
      version: 1,
      cards: [],
      dice: [
        { id: "p1-life-1", owner: "p1", kind: "life", value: 5 },
        { id: "p1-life-2", owner: "p1", kind: "life", value: 5 },
        { id: "p1-life-3", owner: "p1", kind: "life", value: 5 },
        { id: "p1-life-4", owner: "p1", kind: "life", value: 5 },
        { id: "p2-life-1", owner: "p2", kind: "life", value: 5 },
        { id: "p2-life-2", owner: "p2", kind: "life", value: 5 },
        { id: "p2-life-3", owner: "p2", kind: "life", value: 5 },
        { id: "p2-life-4", owner: "p2", kind: "life", value: 5 }
      ],
      revealTop: { p1: false, p2: false },
      revealHand: { p1: false, p2: false },
      playmats: { p1: "default-green", p2: "default-blue" },
      resetSeed: 0,
      updated: Date.now()
    };
  }

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function push() {
    ensureSharedStateShape();
    state.updated = Date.now();
    if (window.FirebaseCleanSync) window.FirebaseCleanSync.pushState(clone(state));
    render();
  }

  function applyRemoteState(remote) {
    state = remote || getInitialSharedState();
    ensureSharedStateShape();
    render();
  }

  function setLocalSeat(room, player) {
    localRoom = room;
    localPlayer = player;
    els.seatScreen.classList.add("hidden");
    els.game.classList.remove("hidden");
    els.roomInfo.textContent = room.toUpperCase() + " / " + player.toUpperCase();
    document.body.dataset.player = player;
    updateScale();
    render();
  }

  function otherPlayer() {
    return localPlayer === "p1" ? "p2" : "p1";
  }

  function worldToScreen(x, y) {
    return { x, y };
  }

  function snap(v) {
    return Math.round(v / GRID) * GRID;
  }

  function tableRectToWorld(clientX, clientY) {
    const rect = els.world.getBoundingClientRect();
    const scaleX = rect.width / TABLE_W;
    const scaleY = rect.height / TABLE_H;
    let x = (clientX - rect.left) / scaleX;
    let y = (clientY - rect.top) / scaleY;

    if (localPlayer === "p2") {
      x = TABLE_W - x;
      y = TABLE_H - y;
    }

    return {
      x: snap(Math.max(0, Math.min(TABLE_W, x))),
      y: snap(Math.max(0, Math.min(TABLE_H, y)))
    };
  }

  function updateScale() {
    const s = Math.min(window.innerWidth / TABLE_W, window.innerHeight / TABLE_H);
    const left = (window.innerWidth - TABLE_W * s) / 2;
    const top = (window.innerHeight - TABLE_H * s) / 2;
    const rot = localPlayer === "p2" ? " rotate(180deg)" : "";
    const translate = localPlayer === "p2" ? ` translate(-${TABLE_W}px, -${TABLE_H}px)` : "";
    els.world.style.transform = `translate(${left}px, ${top}px) scale(${s})${rot}${translate}`;
  }

  window.addEventListener("resize", () => {
    updateScale();
    render();
  });

  function zoneCards(zone) {
    ensureSharedStateShape();
    return state.cards.filter(c => c && c.zone === zone);
  }

  function ownerCards(owner, zoneSuffix) {
    ensureSharedStateShape();
    return state.cards.filter(c => c && c.owner === owner && c.zone === owner + "-" + zoneSuffix);
  }

  function parseDeckList(text) {
    return String(text || "").split(/\r?\n/).map(l => l.trim()).filter(Boolean).flatMap(line => {
      if (line.startsWith("//") || line.startsWith("#")) return [];
      const cleaned = line.replace(/^SB:\s*/i,"").replace(/\s+\([^)]+\)$/g,"").trim();
      const m = cleaned.match(/^(\d+)\s+(.+)$/);
      if (!m) return [];
      return [{ count: Number(m[1]), name: m[2].replace(/\s+\*.*$/,"").trim() }];
    });
  }

  async function loadDeck() {
    ensureSharedStateShape();
    const entries = parseDeckList(els.deckText.value);
    if (!localPlayer) {
      els.deckStatus.textContent = "Choose room/player first.";
      return;
    }
    if (!entries.length) {
      els.deckStatus.textContent = "No valid deck lines.";
      return;
    }

    els.deckStatus.textContent = "Loading...";
    const unique = [...new Set(entries.map(e => e.name))];
    const map = new Map();

    try {
      for (let i = 0; i < unique.length; i++) {
        els.deckStatus.textContent = `Loading ${i + 1}/${unique.length}: ${unique[i]}`;
        map.set(unique[i], await fetchPreferredCard(unique[i], "leb"));
      }

      state.cards = state.cards.filter(c => c.owner !== localPlayer);
      const deck = [];
      for (const e of entries) {
        const data = map.get(e.name);
        for (let i = 0; i < e.count; i++) {
          deck.push({
            id: uid(),
            owner: localPlayer,
            zone: localPlayer + "-library",
            x: localPlayer === "p1" ? 1580 : 340,
            y: localPlayer === "p1" ? 770 : 310,
            rot: 0,
            tapped: false,
            marked: false,
            z: i + 1,
            ...data
          });
        }
      }

      shuffle(deck);
      state.cards = state.cards.concat(deck);
      els.deckStatus.textContent = `Loaded ${deck.length} cards.`;
      els.deckModal.classList.add("hidden");
      push();
    } catch (err) {
      console.error(err);
      els.deckStatus.textContent = err && err.message ? err.message : String(err);
    }
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  function drawOne(player = localPlayer) {
    const lib = ownerCards(player, "library");
    if (!lib.length) return;
    const card = lib[lib.length - 1];
    card.zone = player + "-hand";
    card.tapped = false;
    card.marked = false;
    state.revealTop[player] = false;
    bringToFront(card);
    push();
  }

  function drawMany(player, n) {
    for (let i = 0; i < n; i++) drawOne(player);
  }

  function shuffleLibrary(player = localPlayer) {
    const lib = ownerCards(player, "library");
    const rest = state.cards.filter(c => !(c.owner === player && c.zone === player + "-library"));
    shuffle(lib);
    state.cards = rest.concat(lib);
    push();
  }

  function bringToFront(card) {
    card.z = Math.max(1, ...state.cards.map(c => c.z || 1)) + 1;
  }

  function cardRotation(card) {
    const base = card.owner === localPlayer ? 0 : 180;
    return base + (card.tapped ? 90 : 0);
  }

  function render() {
    if (!localPlayer) return;
    renderCounts();
    renderCards();
    renderHands();
    renderDice();
    renderPlaymats();
  }

  function renderCounts() {
    for (const p of ["p1","p2"]) {
      els[p + "LibCount"].textContent = ownerCards(p, "library").length;
      els[p + "GraveCount"].textContent = ownerCards(p, "grave").length;
      els[p + "ExileCount"].textContent = ownerCards(p, "exile").length;
    }
  }

  function renderPlaymats() {
    // Stable placeholders. Later can map real playmat/ files here.
    els.p1Mat.style.background = state.playmats.p1 === "camel"
      ? "linear-gradient(130deg,#8f7144,#3c2a1c)"
      : "linear-gradient(130deg,#273d2c,#3e2b1f)";
    els.p2Mat.style.background = state.playmats.p2 === "farm"
      ? "linear-gradient(130deg,#506a31,#1d392e)"
      : "linear-gradient(130deg,#403b2b,#1f323b)";
  }

  function renderCards() {
    els.cardLayer.innerHTML = "";
    state.cards
      .filter(c => c.zone === "battlefield")
      .sort((a,b) => (a.z || 1) - (b.z || 1))
      .forEach(card => {
        const el = createCardEl(card, "table-card");
        el.style.left = (card.x - CARD_W / 2) + "px";
        el.style.top = (card.y - CARD_H / 2) + "px";
        el.style.transform = `rotate(${cardRotation(card)}deg)`;
        el.style.zIndex = String(card.z || 1);
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
    const spread = Math.min(68, 820 / Math.max(1, count));
    const start = -((count - 1) * spread) / 2;
    const center = (count - 1) / 2;

    hand.forEach((card, index) => {
      const el = createCardEl(card, "hand-card", !own && !state.revealHand[player]);
      const rel = index - center;
      const x = 630 + start + index * spread - CARD_W / 2;
      const angle = rel * 4.5;
      const raise = 18 - Math.pow(rel, 2) * 2.1;
      el.style.left = x + "px";
      el.style.bottom = Math.max(-12, raise) + "px";
      el.style.transform = `rotate(${angle}deg)`;
      el.style.zIndex = String(100 + index);
      container.appendChild(el);
    });
  }

  function createCardEl(card, cls, forceBack = false) {
    const el = document.createElement("div");
    el.className = "card " + cls + (selectedIds.has(card.id) ? " selected" : "") + (card.marked ? " discard-marked" : "");
    el.dataset.cardId = card.id;

    if (forceBack) {
      const back = document.createElement("div");
      back.className = "back";
      el.appendChild(back);
    } else {
      const img = document.createElement("img");
      img.src = card.image;
      img.alt = card.name;
      img.draggable = false;
      el.appendChild(img);
    }

    el.addEventListener("mouseenter", () => hoveredCardId = card.id);
    el.addEventListener("mouseleave", () => { if (hoveredCardId === card.id) hoveredCardId = null; });
    el.addEventListener("pointerdown", e => onCardPointerDown(e, card));
    el.addEventListener("click", e => {
      if (card.zone === otherPlayer() + "-hand") {
        card.marked = !card.marked;
        push();
      }
    });

    return el;
  }

  function onCardPointerDown(e, card) {
    if (e.button !== 0) return;
    if (card.zone === otherPlayer() + "-hand") return;

    e.preventDefault();
    const worldPoint = tableRectToWorld(e.clientX, e.clientY);
    const fromZone = card.zone;
    const handIndex = state.cards.filter(c => c.zone === fromZone).findIndex(c => c.id === card.id);

    if (!selectedIds.has(card.id)) selectedIds = new Set([card.id]);

    drag = {
      id: card.id,
      fromZone,
      handIndex,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startX: card.x || worldPoint.x,
      startY: card.y || worldPoint.y,
      offsetX: worldPoint.x - (card.x || worldPoint.x),
      offsetY: worldPoint.y - (card.y || worldPoint.y)
    };

    bringToFront(card);
    document.addEventListener("pointermove", onDragMove);
    document.addEventListener("pointerup", onDragEnd, { once: true });
  }

  function onDragMove(e) {
    if (!drag) return;
    const card = state.cards.find(c => c.id === drag.id);
    if (!card) return;
    const p = tableRectToWorld(e.clientX, e.clientY);
    card.zone = "battlefield";
    card.x = snap(p.x - drag.offsetX);
    card.y = snap(p.y - drag.offsetY);
    render();
  }

  function onDragEnd(e) {
    document.removeEventListener("pointermove", onDragMove);
    if (!drag) return;
    const card = state.cards.find(c => c.id === drag.id);
    if (!card) return;

    const moved = Math.hypot(e.clientX - drag.startClientX, e.clientY - drag.startClientY);
    if (moved < 5 && drag.fromZone.endsWith("-hand")) {
      card.zone = drag.fromZone;
    } else {
      const target = dropTarget(e);
      if (target) {
        moveToZone(card, target);
      } else {
        card.zone = "battlefield";
        card.marked = false;
      }
    }

    drag = null;
    push();
  }

  function dropTarget(e) {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const pile = el && el.closest ? el.closest(".pile") : null;
    if (!pile) return null;
    const player = pile.dataset.player;
    if (pile.classList.contains("library")) return player + "-library";
    if (pile.classList.contains("grave")) return player + "-grave";
    if (pile.classList.contains("exile")) return player + "-exile";
    return null;
  }

  function moveToZone(card, zone) {
    card.zone = zone;
    card.tapped = false;
    card.marked = false;
    if (zone.endsWith("-grave") || zone.endsWith("-exile") || zone.endsWith("-library")) {
      state.cards = state.cards.filter(c => c.id !== card.id).concat(card);
    }
  }

  function renderDice() {
    els.diceLayer.innerHTML = "";
    const pos = {
      "p1-life-1": [1530, 700], "p1-life-2": [1578, 700], "p1-life-3": [1626, 700], "p1-life-4": [1674, 700],
      "p2-life-1": [390, 380], "p2-life-2": [342, 380], "p2-life-3": [294, 380], "p2-life-4": [246, 380]
    };

    state.dice.forEach(d => {
      const [x,y] = pos[d.id] || [960,540];
      const el = document.createElement("div");
      el.className = "die";
      el.textContent = d.value;
      el.style.left = x + "px";
      el.style.top = y + "px";
      el.style.transform = d.owner === localPlayer ? "rotate(0deg)" : "rotate(180deg)";
      els.diceLayer.appendChild(el);
    });
  }

  function openLibraryMenu(e, player) {
    contextPlayer = player;
    els.libraryMenu.style.left = e.clientX + "px";
    els.libraryMenu.style.top = e.clientY + "px";
    els.libraryMenu.classList.remove("hidden");
  }

  function closeMenus() {
    els.libraryMenu.classList.add("hidden");
  }

  function openTutor() {
    selectedTutorId = null;
    const lib = ownerCards(localPlayer, "library");
    els.tutorGrid.innerHTML = "";
    lib.slice().reverse().forEach(card => {
      const wrap = document.createElement("div");
      wrap.className = "grid-card";
      wrap.dataset.cardId = card.id;
      const img = document.createElement("img");
      img.src = card.image;
      img.draggable = false;
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
    if (dest === "hand") {
      card.zone = localPlayer + "-hand";
    } else {
      card.zone = "battlefield";
      card.x = localPlayer === "p1" ? 960 : 960;
      card.y = localPlayer === "p1" ? 720 : 360;
      bringToFront(card);
    }
    selectedTutorId = null;
    els.tutorModal.classList.add("hidden");
    push();
  }

  function openOpponentGrave() {
    const cards = ownerCards(otherPlayer(), "grave");
    els.graveGrid.innerHTML = "";
    cards.slice().reverse().forEach(card => {
      const wrap = document.createElement("div");
      wrap.className = "grid-card";
      const img = document.createElement("img");
      img.src = card.image;
      wrap.appendChild(img);
      els.graveGrid.appendChild(wrap);
    });
    els.graveModal.classList.remove("hidden");
  }

  function mulligan() {
    if (!confirm("Are you really sure about mulligan?")) return;
    state.cards.forEach(c => {
      if (c.owner === localPlayer) {
        c.zone = localPlayer + "-library";
        c.tapped = false;
        c.marked = false;
      }
    });
    shuffleLibrary(localPlayer);
    drawMany(localPlayer, 7);
  }

  function onResetVoteChanged(vote) {
    if (!localPlayer) return;
    const other = otherPlayer();
    if (vote[other] && !vote[localPlayer]) {
      els.resetPrompt.classList.remove("hidden");
    } else {
      els.resetPrompt.classList.add("hidden");
    }

    if (vote.p1 && vote.p2) {
      doResetGame();
      if (window.FirebaseCleanSync) window.FirebaseCleanSync.clearResetVote();
    }
  }

  function doResetGame() {
    state.cards.forEach(c => {
      c.zone = c.owner + "-library";
      c.tapped = false;
      c.marked = false;
    });
    shuffle(ownerCards("p1","library"));
    shuffle(ownerCards("p2","library"));
    state.revealTop = { p1:false, p2:false };
    state.revealHand = { p1:false, p2:false };
    push();
  }

  function keyMoveHovered(action) {
    const targets = selectedIds.size ? state.cards.filter(c => selectedIds.has(c.id)) : state.cards.filter(c => c.id === hoveredCardId);
    if (!targets.length) return false;

    targets.forEach(card => {
      if (action === "grave") moveToZone(card, card.owner + "-grave");
      if (action === "exile") moveToZone(card, card.owner + "-exile");
      if (action === "hand") card.zone = card.owner + "-hand";
      if (action === "tap" && card.zone === "battlefield") card.tapped = !card.tapped;
    });
    push();
    return true;
  }

  async function join(room, player) {
    els.seatStatus.textContent = "Joining...";
    try {
      if (!window.FirebaseCleanSync) throw new Error("Firebase sync module not loaded yet. Wait a second and try again.");
      await window.FirebaseCleanSync.joinRoom(room, player);
    } catch (err) {
      els.seatStatus.textContent = err && err.message ? err.message : String(err);
      console.error(err);
    }
  }

  // bindings
  els.joinR1P1.onclick = () => join("room1", "p1");
  els.joinR1P2.onclick = () => join("room1", "p2");
  els.joinR2P1.onclick = () => join("room2", "p1");
  els.joinR2P2.onclick = () => join("room2", "p2");
  els.kickRoom1.onclick = () => window.FirebaseCleanSync.kickRoom("room1");
  els.kickRoom2.onclick = () => window.FirebaseCleanSync.kickRoom("room2");

  els.mainMenuBtn.onclick = () => els.mainMenu.classList.toggle("hidden");
  els.loadDeckBtn.onclick = () => els.deckModal.classList.remove("hidden");
  els.closeDeckModal.onclick = () => els.deckModal.classList.add("hidden");
  els.doLoadDeck.onclick = loadDeck;
  els.helpBtn.onclick = () => els.helpModal.classList.remove("hidden");
  els.closeHelp.onclick = () => els.helpModal.classList.add("hidden");
  els.leaveBtn.onclick = () => window.FirebaseCleanSync.leaveRoom();
  els.resetVoteBtn.onclick = () => {
    if (confirm("Are you sure? Other player must also confirm.")) window.FirebaseCleanSync.voteReset(true);
  };
  els.acceptReset.onclick = () => window.FirebaseCleanSync.voteReset(true);
  els.rejectReset.onclick = () => {
    window.FirebaseCleanSync.voteReset(false);
    els.resetPrompt.classList.add("hidden");
  };

  els.closeTutor.onclick = () => els.tutorModal.classList.add("hidden");
  els.tutorToHand.onclick = () => takeTutor("hand");
  els.tutorToTable.onclick = () => takeTutor("table");
  els.closeGrave.onclick = () => els.graveModal.classList.add("hidden");

  els.p1Library.addEventListener("contextmenu", e => { e.preventDefault(); if (localPlayer === "p1") openLibraryMenu(e, "p1"); });
  els.p2Library.addEventListener("contextmenu", e => { e.preventDefault(); if (localPlayer === "p2") openLibraryMenu(e, "p2"); });
  els.p1Library.addEventListener("dblclick", () => { if (localPlayer === "p1") drawOne("p1"); });
  els.p2Library.addEventListener("dblclick", () => { if (localPlayer === "p2") drawOne("p2"); });

  els.libraryMenu.addEventListener("click", e => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    closeMenus();
    const a = btn.dataset.action;
    if (a === "draw") drawOne(localPlayer);
    if (a === "shuffle") shuffleLibrary(localPlayer);
    if (a === "tutor") openTutor();
    if (a === "mulligan") mulligan();
    if (a === "revealTop") { state.revealTop[localPlayer] = !state.revealTop[localPlayer]; push(); }
    if (a === "revealHand") { state.revealHand[localPlayer] = !state.revealHand[localPlayer]; push(); }
    if (a === "opponentGrave") openOpponentGrave();
  });

  document.addEventListener("click", e => {
    if (!e.target.closest(".context-menu")) closeMenus();
  });

  window.addEventListener("keydown", e => {
    if (!localPlayer) return;
    if (e.key === "Tab") { e.preventDefault(); drawOne(localPlayer); return; }
    const k = e.key.toLowerCase();
    if (k === "d") drawOne(localPlayer);
    if (k === "g") keyMoveHovered("grave");
    if (k === "e") keyMoveHovered("exile");
    if (k === "h") keyMoveHovered("hand");
    if (k === "t") keyMoveHovered("tap");
    if (k === "x") {
      state.cards.forEach(c => { if (c.owner === localPlayer) c.tapped = false; });
      push();
    }
  });

  window.CleanTable = {
    getInitialSharedState,
    applyRemoteState,
    setLocalSeat,
    onResetVoteChanged
  };
})();
