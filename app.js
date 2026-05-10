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
  let hoveredDieId = null;
  let selectedTutorId = null;
  let contextPlayer = null;
  let drag = null;
  let localHandFan = 0;
  let localHandDepth = 0;
  const graveScroll = { p1: 0, p2: 0 };
  let inspectorFontSize = 14;
  let inspectorCardId = null;

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

  function unsnappedTablePoint(clientX, clientY) {
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
      x: Math.max(0, Math.min(TABLE_W, x)),
      y: Math.max(0, Math.min(TABLE_H, y))
    };
  }

  function cardCenterFromElement(el) {
    const r = el.getBoundingClientRect();
    return unsnappedTablePoint(r.left + r.width / 2, r.top + r.height / 2);
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

  function shuffleLibrary(player = localPlayer, options = {}) {
    const lib = ownerCards(player, "library");
    const rest = state.cards.filter(c => !(c.owner === player && c.zone === player + "-library"));
    shuffle(lib);
    state.cards = rest.concat(lib);
    state.revealTop[player] = false;
    if (!options.silentAnimation) playShuffleAnimation(player);
    push();
  }

  function playShuffleAnimation(player = localPlayer) {
    const pile = els[player + "Library"];
    const visual = pile ? pile.querySelector(".pile-card") : null;
    if (!visual) return;
    visual.classList.add("shuffle-host");
    visual.querySelectorAll(".shuffle-layer").forEach(n => n.remove());
    for (let i = 0; i < 3; i++) {
      const img = document.createElement("img");
      img.className = "shuffle-layer";
      img.src = "lapi2.png";
      img.draggable = false;
      const r = () => (Math.round((Math.random() * 24 - 12) * 10) / 10) + "px";
      const deg = () => (Math.round((Math.random() * 28 - 14) * 10) / 10) + "deg";
      for (let n = 1; n <= 6; n++) {
        img.style.setProperty(`--x${n}`, r());
        img.style.setProperty(`--y${n}`, r());
        img.style.setProperty(`--r${n}`, deg());
      }
      img.style.animationDelay = `${i * 70}ms`;
      visual.appendChild(img);
      setTimeout(() => img.remove(), 2300);
    }
  }

  function bringToFront(card) {
    card.z = Math.max(1, ...state.cards.map(c => c.z || 1)) + 1;
  }

  function cardRotation(card) {
    // Desired SCREEN orientation:
    // own cards readable, opponent cards upside down.
    // Since player 2 rotates the whole world 180 degrees, compensate here.
    const worldRot = localPlayer === "p2" ? 180 : 0;
    const desiredScreenBase = card.owner === localPlayer ? 0 : 180;
    const compensatedBase = (desiredScreenBase - worldRot + 360) % 360;
    return compensatedBase + (card.tapped ? 90 : 0);
  }

  function render() {
    if (!localPlayer) return;
    renderCounts();
    renderLibraryVisuals();
    renderCards();
    renderHands();
    renderDice();
    renderPlaymats();
    refreshInspector();
  }

  function renderLibraryVisuals() {
    for (const p of ["p1","p2"]) {
      const pile = els[p + "Library"];
      const visual = pile ? pile.querySelector(".pile-card") : null;
      if (!visual) continue;
      visual.innerHTML = "";
      visual.classList.add("sleeve");
      visual.style.backgroundImage = 'url("lapi2.png")';
      visual.style.backgroundSize = "cover";
      visual.style.backgroundPosition = "center";
      const top = ownerCards(p, "library").at(-1);
      if (top && state.revealTop && state.revealTop[p]) {
        const img = document.createElement("img");
        img.className = "library-top-img";
        img.src = top.image;
        img.draggable = false;
        img.alt = top.name || "top card";
        visual.style.backgroundImage = "none";
        visual.appendChild(img);
      }
    }
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

    renderGraveStack("p1");
    renderGraveStack("p2");
  }

  function renderGraveStack(player) {
    const cards = ownerCards(player, "grave");
    const newestFirst = cards.slice().reverse();
    const layout = player === "p1"
      ? { left: 1692, top: 712, height: 330 }
      : { left: 110, top: 198, height: 330 };
    const scroll = graveScroll[player] || 0;

    newestFirst.forEach((card, index) => {
      const el = createCardEl(card, "grave-stack-card");
      const step = 28;
      const top = layout.top + layout.height - CARD_H - index * step + scroll;
      el.style.left = layout.left + "px";
      el.style.top = top + "px";
      const ownerReadable = card.owner === localPlayer ? 0 : 180;
      const worldComp = localPlayer === "p2" ? 180 : 0;
      const rot = (ownerReadable - worldComp + 360) % 360;
      el.style.transform = `rotate(${rot}deg)`;
      el.style.zIndex = String(700 - index);
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
    const t = Math.max(0, Math.min(1, (localHandFan + 100) / 200));
    const spread = (7 + t * 74) * Math.min(1, 11 / Math.max(1, count));
    const start = -((count - 1) * spread) / 2;
    const center = (count - 1) / 2;
    const curve = 0.3 + t * 6.2;
    const angleScale = 0.5 + t * 7.2;
    const focus = count <= 1 ? 0 : ((localHandDepth + 100) / 200) * (count - 1);

    hand.forEach((card, index) => {
      const el = createCardEl(card, "hand-card", !own && !state.revealHand[player]);
      const rel = index - center;
      const x = 630 + start + index * spread - CARD_W / 2;
      const angle = rel * angleScale;
      const raise = 18 - Math.pow(rel, 2) * curve;
      const distance = Math.abs(index - focus);
      const z = 10000 - Math.round(distance * 100) + index;
      const transform = `rotate(${angle}deg)`;
      el.style.left = x + "px";
      el.style.bottom = Math.max(-12, raise) + "px";
      el.style.transform = transform;
      el.style.setProperty("--hand-transform", transform);
      el.style.zIndex = String(z);
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

    el.addEventListener("mouseenter", () => {
      hoveredCardId = card.id;
      showInspector(card, forceBack);
    });
    el.addEventListener("mouseleave", () => {
      if (hoveredCardId === card.id) hoveredCardId = null;
      hideInspector(card.id);
    });
    el.addEventListener("pointerdown", e => onCardPointerDown(e, card));
    el.addEventListener("click", e => {
      if (card.zone === otherPlayer() + "-hand") {
        card.marked = !card.marked;
        push();
      } else if (card.zone && card.zone.endsWith("-hand")) {
        selectedIds = new Set([card.id]);
        render();
      }
    });

    el.addEventListener("dblclick", e => {
      if (card.zone === "battlefield") {
        e.preventDefault();
        e.stopPropagation();
        card.tapped = !card.tapped;
        push();
      }
    });

    return el;
  }

  function onCardPointerDown(e, card) {
    if (e.button !== 0) return;
    if (card.zone === otherPlayer() + "-hand") return;

    e.preventDefault();

    const pointerWorld = unsnappedTablePoint(e.clientX, e.clientY);
    const fromZone = card.zone;
    const handIndex = state.cards.filter(c => c.zone === fromZone).findIndex(c => c.id === card.id);

    // Hand cards do not have meaningful stored x/y. Their real visual location is
    // the DOM card position after fan layout. Use that exact center to prevent
    // the card jumping to library/grave coordinates when drag starts.
    const visualCenter = (fromZone && fromZone !== "battlefield")
      ? cardCenterFromElement(e.currentTarget)
      : { x: card.x || pointerWorld.x, y: card.y || pointerWorld.y };

    if (!selectedIds.has(card.id)) selectedIds = new Set([card.id]);

    drag = {
      id: card.id,
      fromZone,
      handIndex,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startX: visualCenter.x,
      startY: visualCenter.y,
      offsetX: pointerWorld.x - visualCenter.x,
      offsetY: pointerWorld.y - visualCenter.y
    };

    card.x = visualCenter.x;
    card.y = visualCenter.y;

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
    // Dice sit just against the center line on each player's own side.
    const pos = {
      "p1-life-1": [1518, 548], "p1-life-2": [1558, 548], "p1-life-3": [1598, 548], "p1-life-4": [1638, 548],
      "p2-life-1": [402, 494], "p2-life-2": [362, 494], "p2-life-3": [322, 494], "p2-life-4": [282, 494]
    };

    const pipMap = {
      1: [5],
      2: [1,9],
      3: [1,5,9],
      4: [1,3,7,9],
      5: [1,3,5,7,9],
      6: [1,3,4,6,7,9]
    };

    state.dice.forEach(d => {
      const [x,y] = pos[d.id] || [960,540];
      const el = document.createElement("div");
      el.className = "die";
      el.dataset.dieId = d.id;
      el.style.left = x + "px";
      el.style.top = y + "px";
      el.style.transform = d.owner === localPlayer ? "rotate(0deg)" : "rotate(180deg)";

      const value = Math.max(1, Math.min(6, Number(d.value) || 1));
      for (const p of pipMap[value]) {
        const pip = document.createElement("div");
        pip.className = "pip p" + p;
        el.appendChild(pip);
      }

      el.addEventListener("mouseenter", () => hoveredDieId = d.id);
      el.addEventListener("mouseleave", () => { if (hoveredDieId === d.id) hoveredDieId = null; });
      el.addEventListener("click", () => { hoveredDieId = d.id; });

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
    const player = localPlayer;
    state.cards.forEach(c => {
      if (c.owner === player) {
        c.zone = player + "-library";
        c.tapped = false;
        c.marked = false;
      }
    });
    const lib = ownerCards(player, "library");
    const rest = state.cards.filter(c => !(c.owner === player && c.zone === player + "-library"));
    shuffle(lib);
    state.cards = rest.concat(lib);
    state.revealTop[player] = false;
    playShuffleAnimation(player);
    push();
    setTimeout(() => {
      const cards = ownerCards(player, "library");
      for (let i = 0; i < 7 && cards.length; i++) {
        const card = cards.pop();
        if (!card) break;
        card.zone = player + "-hand";
        card.tapped = false;
        card.marked = false;
        bringToFront(card);
      }
      const others = state.cards.filter(c => !(c.owner === player && c.zone === player + "-library"));
      state.cards = others.concat(cards);
      push();
    }, 2050);
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

  function adjustHoveredDie(delta) {
    const die = state.dice.find(d => d.id === hoveredDieId);
    if (!die || die.owner !== localPlayer) return false;
    die.value = Math.max(1, Math.min(6, Number(die.value || 1) + delta));
    push();
    return true;
  }

  function moveSelectedHandCard(dir) {
    const id = [...selectedIds][0];
    if (!id) return false;
    const card = state.cards.find(c => c.id === id);
    if (!card || card.zone !== localPlayer + "-hand") return false;
    const zone = card.zone;
    const hand = ownerCards(localPlayer, "hand");
    const oldIndex = hand.findIndex(c => c.id === id);
    if (oldIndex < 0) return false;
    if (hand.length < 2) return true;
    const nextIndex = (oldIndex + dir + hand.length) % hand.length;
    hand.splice(oldIndex, 1);
    hand.splice(nextIndex, 0, card);
    const others = state.cards.filter(c => c.zone !== zone);
    state.cards = others.concat(hand);
    push();
    return true;
  }

  function isVisibleToLocal(card, forceBack = false) {
    if (!card) return false;
    if (forceBack) return false;
    if (card.zone === otherPlayer() + "-hand" && !state.revealHand[otherPlayer()]) return false;
    return true;
  }

  function ensureInspector() {
    let panel = document.getElementById("floatingInspector");
    if (panel) return panel;
    panel = document.createElement("div");
    panel.id = "floatingInspector";
    panel.className = "floating-inspector hidden";
    panel.innerHTML = `<div class="inspector-head"><span>INSPECTOR</span><button type="button" id="inspectorMinus">−</button><button type="button" id="inspectorPlus">+</button></div><div id="inspectorBody" class="inspector-body"></div>`;
    document.body.appendChild(panel);
    panel.querySelector("#inspectorMinus").addEventListener("click", e => {
      e.preventDefault();
      inspectorFontSize = Math.max(9, inspectorFontSize - 1);
      refreshInspector();
    });
    panel.querySelector("#inspectorPlus").addEventListener("click", e => {
      e.preventDefault();
      inspectorFontSize = Math.min(28, inspectorFontSize + 1);
      refreshInspector();
    });
    return panel;
  }

  function showInspector(card, forceBack = false) {
    const panel = ensureInspector();
    if (!isVisibleToLocal(card, forceBack)) {
      inspectorCardId = null;
      panel.classList.add("hidden");
      return;
    }
    inspectorCardId = card.id;
    refreshInspector();
  }

  function hideInspector(cardId) {
    if (inspectorCardId === cardId) {
      inspectorCardId = null;
      ensureInspector().classList.add("hidden");
    }
  }

  function refreshInspector() {
    const panel = ensureInspector();
    const body = panel.querySelector("#inspectorBody");
    const card = inspectorCardId ? state.cards.find(c => c.id === inspectorCardId) : null;
    if (!card || !isVisibleToLocal(card, false)) {
      panel.classList.add("hidden");
      return;
    }
    panel.classList.remove("hidden");
    body.style.fontSize = inspectorFontSize + "px";
    body.innerHTML = `
      <div class="insp-name">${escapeHtml(card.name || "")}</div>
      <div class="insp-type">${escapeHtml(card.typeLine || "")}</div>
      <div class="insp-oracle">${escapeHtml(card.oracle || "")}</div>
      ${card.power || card.toughness ? `<div class="insp-pt">${escapeHtml(card.power || "")}/${escapeHtml(card.toughness || "")}</div>` : ""}
    `;
  }

  function escapeHtml(s) {
    return String(s || "").replace(/[&<>\"]/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[ch]));
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
    if (e.key === "ArrowUp") { if (adjustHoveredDie(1)) { e.preventDefault(); return; } }
    if (e.key === "ArrowDown") { if (adjustHoveredDie(-1)) { e.preventDefault(); return; } }
    if (e.key === "ArrowLeft") { if (moveSelectedHandCard(-1)) { e.preventDefault(); return; } }
    if (e.key === "ArrowRight") { if (moveSelectedHandCard(1)) { e.preventDefault(); return; } }
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

  els.myHand.addEventListener("wheel", e => {
    if (!localPlayer) return;
    e.preventDefault();
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      localHandDepth += e.deltaX * 0.65;
      localHandDepth = Math.max(-100, Math.min(100, localHandDepth));
    } else {
      localHandFan -= e.deltaY * 0.45;
      localHandFan = Math.max(-100, Math.min(100, localHandFan));
    }
    renderHands();
  }, { passive: false });

  for (const p of ["p1","p2"]) {
    const grave = els[p + "Grave"];
    if (grave) {
      grave.addEventListener("wheel", e => {
        e.preventDefault();
        graveScroll[p] += e.deltaY > 0 ? -24 : 24;
        const max = 0;
        const min = -Math.max(0, ownerCards(p, "grave").length - 5) * 28;
        graveScroll[p] = Math.max(min, Math.min(max, graveScroll[p]));
        renderCards();
      }, { passive: false });
    }
  }

  window.CleanTable = {
    getInitialSharedState,
    applyRemoteState,
    setLocalSeat,
    onResetVoteChanged
  };
})();



// v9 dev tuning panel + stable hand hover/depth controls.
(() => {
  const defaults = {
    libraryX: 0,
    libraryY: 0,
    graveX: 0,
    graveY: 0,
    exileX: 0,
    exileY: 0,
    diceX: 0,
    diceY: 0,
    graveHeight: 260,
    exileHeight: 64,
    dieSize: 34,
    dieGap: 8,
    dieRadius: 8,
    selWidth: 2,
    selColor: "#ffffff"
  };

  let dev = {};
  try {
    dev = Object.assign({}, defaults, JSON.parse(localStorage.getItem("oldschoolCleanDevTuningV1") || "{}"));
  } catch {
    dev = Object.assign({}, defaults);
  }

  const cssMap = {
    libraryX: ["--dev-library-x", "px"],
    libraryY: ["--dev-library-y", "px"],
    graveX: ["--dev-grave-x", "px"],
    graveY: ["--dev-grave-y", "px"],
    exileX: ["--dev-exile-x", "px"],
    exileY: ["--dev-exile-y", "px"],
    diceX: ["--dev-dice-x", "px"],
    diceY: ["--dev-dice-y", "px"],
    graveHeight: ["--dev-grave-height", "px"],
    exileHeight: ["--dev-exile-height", "px"],
    dieSize: ["--dev-die-size", "px"],
    dieGap: ["--dev-die-gap", "px"],
    dieRadius: ["--dev-die-radius", "px"],
    selWidth: ["--dev-selection-width", "px"],
    selColor: ["--dev-selection-color", ""]
  };

  const inputIds = {
    libraryX: "devLibraryX",
    libraryY: "devLibraryY",
    graveX: "devGraveX",
    graveY: "devGraveY",
    exileX: "devExileX",
    exileY: "devExileY",
    diceX: "devDiceX",
    diceY: "devDiceY",
    graveHeight: "devGraveHeight",
    exileHeight: "devExileHeight",
    dieSize: "devDieSize",
    dieGap: "devDieGap",
    dieRadius: "devDieRadius",
    selWidth: "devSelWidth",
    selColor: "devSelColor"
  };

  function rootSet(key, value) {
    const spec = cssMap[key];
    if (!spec) return;
    document.documentElement.style.setProperty(spec[0], String(value) + spec[1]);
  }

  function applyDev() {
    Object.entries(dev).forEach(([k, v]) => rootSet(k, v));
    localStorage.setItem("oldschoolCleanDevTuningV1", JSON.stringify(dev));
    syncDevInputs();
    if (typeof renderDice === "function") {
      try { renderDice(); } catch {}
    }
  }

  function syncDevInputs() {
    for (const [key, id] of Object.entries(inputIds)) {
      const el = document.getElementById(id);
      const val = document.getElementById(id + "Val");
      if (!el) continue;
      el.value = dev[key];
      if (val) val.textContent = String(dev[key]);
    }
  }

  function valuesText() {
    return JSON.stringify(dev, null, 2);
  }

  function bindDev() {
    for (const [key, id] of Object.entries(inputIds)) {
      const el = document.getElementById(id);
      if (!el) continue;
      el.addEventListener("input", () => {
        dev[key] = el.type === "color" ? el.value : Number(el.value);
        rootSet(key, dev[key]);
        localStorage.setItem("oldschoolCleanDevTuningV1", JSON.stringify(dev));
        syncDevInputs();
        if (typeof renderDice === "function" && (key.startsWith("dice") || key.startsWith("die"))) {
          try { renderDice(); } catch {}
        }
      });
    }

    const panel = document.getElementById("devPanel");
    const out = document.getElementById("devOutput");

    document.getElementById("devTuningBtn")?.addEventListener("click", () => {
      panel?.classList.toggle("hidden");
      if (out) out.value = valuesText();
    });

    document.getElementById("devClose")?.addEventListener("click", () => panel?.classList.add("hidden"));

    document.getElementById("devReset")?.addEventListener("click", () => {
      dev = Object.assign({}, defaults);
      applyDev();
      if (out) out.value = valuesText();
    });

    document.getElementById("devCopy")?.addEventListener("click", async () => {
      const txt = valuesText();
      if (out) out.value = txt;
      try { await navigator.clipboard.writeText(txt); } catch {}
    });
  }

  // Override dice render so positions also use dev offset and gap.
  if (typeof renderDice === "function") {
    const oldRenderDice = renderDice;
    renderDice = function() {
      oldRenderDice();
      const diceByOwner = { p1: [], p2: [] };
      document.querySelectorAll(".die").forEach(el => {
        const id = el.dataset.dieId;
        let die = null;
        try { die = state.dice.find(d => d.id === id); } catch {}
        if (die && diceByOwner[die.owner]) diceByOwner[die.owner].push({ el, die });
      });

      for (const owner of ["p1", "p2"]) {
        diceByOwner[owner]
          .sort((a, b) => String(a.die.id).localeCompare(String(b.die.id)))
          .forEach((item, index) => {
            const baseLeft = parseFloat(item.el.style.left) || 0;
            const baseTop = parseFloat(item.el.style.top) || 0;
            item.el.style.left = (baseLeft + dev.diceX + index * dev.diceGap) + "px";
            item.el.style.top = (baseTop + dev.diceY) + "px";
          });
      }
    };
  }

  // Stable hand lateral trackpad: shift a focus index, do not continuously flip z-order.
  let lastDepthStep = 0;
  if (typeof renderHand === "function") {
    const oldRenderHand = renderHand;
    renderHand = function(player, container, own) {
      oldRenderHand(player, container, own);
      container.querySelectorAll(".hand-card").forEach((el, idx) => {
        el.style.setProperty("--hand-card-z", el.style.zIndex || String(100 + idx));
      });
    };
  }

  document.addEventListener("wheel", e => {
    const hand = e.target.closest && e.target.closest("#myHand,.my-hand,.hand-zone.self,#p1HandZone");
    if (!hand) return;

    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      e.preventDefault();
      const now = performance.now();
      if (now - lastDepthStep < 140) return;
      lastDepthStep = now;

      // Rotate selected card through hand if one exists, otherwise just change visual z direction once.
      try {
        if (typeof moveSelectedHandCard === "function" && Math.abs(e.deltaX) > 8) {
          moveSelectedHandCard(e.deltaX > 0 ? 1 : -1);
        } else {
          localHandDepth = (typeof localHandDepth === "number" ? localHandDepth : 1) * -1;
          if (typeof renderHands === "function") renderHands();
        }
      } catch {}
    }
  }, { passive: false });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => { bindDev(); applyDev(); });
  } else {
    bindDev();
    applyDev();
  }
})();



// v10 robust DEV button, shuffle overlay, fly animations, and tap fix.
(() => {
  const defaults = {
    libraryX: 0, libraryY: 0,
    graveX: 0, graveY: 0,
    exileX: 0, exileY: 0,
    diceX: 0, diceY: 0,
    graveHeight: 260, exileHeight: 64,
    dieSize: 34, dieGap: 8, dieRadius: 8,
    selWidth: 2, selColor: "#ffffff",
    shuffleSpeed: 120, shuffleLength: 2000, shuffleSpread: 26
  };

  let dev;
  try {
    dev = Object.assign({}, defaults, JSON.parse(localStorage.getItem("oldschoolCleanDevTuningV2") || localStorage.getItem("oldschoolCleanDevTuningV1") || "{}"));
  } catch {
    dev = Object.assign({}, defaults);
  }

  const inputIds = {
    libraryX: "devLibraryX", libraryY: "devLibraryY",
    graveX: "devGraveX", graveY: "devGraveY",
    exileX: "devExileX", exileY: "devExileY",
    diceX: "devDiceX", diceY: "devDiceY",
    graveHeight: "devGraveHeight", exileHeight: "devExileHeight",
    dieSize: "devDieSize", dieGap: "devDieGap", dieRadius: "devDieRadius",
    selWidth: "devSelWidth", selColor: "devSelColor",
    shuffleSpeed: "devShuffleSpeed", shuffleLength: "devShuffleLength", shuffleSpread: "devShuffleSpread"
  };

  const cssVars = {
    libraryX: ["--dev-library-x","px"], libraryY: ["--dev-library-y","px"],
    graveX: ["--dev-grave-x","px"], graveY: ["--dev-grave-y","px"],
    exileX: ["--dev-exile-x","px"], exileY: ["--dev-exile-y","px"],
    diceX: ["--dev-dice-x","px"], diceY: ["--dev-dice-y","px"],
    graveHeight: ["--dev-grave-height","px"], exileHeight: ["--dev-exile-height","px"],
    dieSize: ["--dev-die-size","px"], dieGap: ["--dev-die-gap","px"], dieRadius: ["--dev-die-radius","px"],
    selWidth: ["--dev-selection-width","px"], selColor: ["--dev-selection-color",""],
    shuffleSpeed: ["--dev-shuffle-speed","ms"], shuffleLength: ["--dev-shuffle-length","ms"], shuffleSpread: ["--dev-shuffle-spread","px"]
  };

  function setCss(k, v) {
    const spec = cssVars[k];
    if (spec) document.documentElement.style.setProperty(spec[0], String(v) + spec[1]);
  }

  function saveDev() {
    localStorage.setItem("oldschoolCleanDevTuningV2", JSON.stringify(dev));
  }

  function syncInputs() {
    for (const [k, id] of Object.entries(inputIds)) {
      const el = document.getElementById(id);
      const val = document.getElementById(id + "Val");
      if (!el) continue;
      el.value = dev[k];
      if (val) val.textContent = String(dev[k]);
    }
  }

  function applyDev() {
    Object.entries(dev).forEach(([k,v]) => setCss(k,v));
    syncInputs();
    saveDev();
    try { if (typeof renderDice === "function") renderDice(); } catch {}
  }

  function valuesText() {
    return JSON.stringify(dev, null, 2);
  }

  function bindDevPanel() {
    const panel = document.getElementById("devPanel");
    const out = document.getElementById("devOutput");

    document.getElementById("devTuningBtn")?.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      panel?.classList.toggle("hidden");
      if (out) out.value = valuesText();
    }, true);

    document.getElementById("devClose")?.addEventListener("click", () => panel?.classList.add("hidden"));
    document.getElementById("devReset")?.addEventListener("click", () => {
      dev = Object.assign({}, defaults);
      applyDev();
      if (out) out.value = valuesText();
    });
    document.getElementById("devCopy")?.addEventListener("click", async () => {
      const txt = valuesText();
      if (out) out.value = txt;
      try { await navigator.clipboard.writeText(txt); } catch {}
    });

    for (const [k, id] of Object.entries(inputIds)) {
      const el = document.getElementById(id);
      if (!el) continue;
      el.addEventListener("input", () => {
        dev[k] = el.type === "color" ? el.value : Number(el.value);
        setCss(k, dev[k]);
        syncInputs();
        saveDev();
        if (k.startsWith("dice") || k.startsWith("die")) {
          try { if (typeof renderDice === "function") renderDice(); } catch {}
        }
      });
    }
  }

  // Re-render dice with gap/offset after original dice renderer.
  if (typeof renderDice === "function" && !window.__v10DiceWrapped) {
    window.__v10DiceWrapped = true;
    const oldRenderDice = renderDice;
    renderDice = function() {
      oldRenderDice();
      const grouped = { p1: [], p2: [] };
      document.querySelectorAll(".die").forEach(el => {
        const id = el.dataset.dieId;
        let d = null;
        try { d = state.dice.find(x => x.id === id); } catch {}
        if (d && grouped[d.owner]) grouped[d.owner].push({ el, d });
      });
      for (const p of ["p1","p2"]) {
        grouped[p].sort((a,b) => String(a.d.id).localeCompare(String(b.d.id))).forEach((it, i) => {
          const left = parseFloat(it.el.style.left) || 0;
          const top = parseFloat(it.el.style.top) || 0;
          it.el.style.left = (left + dev.diceX + i * dev.dieGap) + "px";
          it.el.style.top = (top + dev.diceY) + "px";
        });
      }
    };
  }

  function worldElementForLibrary(player) {
    return document.getElementById(player + "Library") || document.getElementById(player + "LibraryZone") || document.querySelector(`.library[data-player="${player}"]`);
  }

  function handContainerFor(player) {
    if (player === (window.FirebaseCleanSync?.playerId || window.CleanTableLocalPlayer || "p1")) {
      return document.getElementById("myHand") || document.getElementById(player + "HandFan") || document.querySelector(".my-hand");
    }
    return document.getElementById("opponentHand") || document.getElementById(player + "HandFan") || document.querySelector(".opponent-hand");
  }

  function rectCenter(el) {
    const r = el?.getBoundingClientRect();
    if (!r) return { x: innerWidth/2, y: innerHeight/2 };
    return { x: r.left + r.width/2, y: r.top + r.height/2, w: r.width, h: r.height };
  }

  function playShuffleAnimation(player) {
    const lib = worldElementForLibrary(player);
    const c = rectCenter(lib);
    const spread = Number(dev.shuffleSpread || 26);
    const duration = Number(dev.shuffleLength || 2000);
    const speed = Number(dev.shuffleSpeed || 120);

    const cards = [];
    for (let i = 0; i < 4; i++) {
      const el = document.createElement("div");
      el.className = "shuffle-overlay-card";
      el.style.left = (c.x - 59) + "px";
      el.style.top = (c.y - 82.5) + "px";
      el.style.animationDuration = Math.max(40, speed + i * 17) + "ms";
      el.style.setProperty("--sx", ((Math.random() * 2 - 1) * spread) + "px");
      el.style.setProperty("--sy", ((Math.random() * 2 - 1) * spread) + "px");
      el.style.setProperty("--sr", ((Math.random() * 2 - 1) * 18) + "deg");
      document.body.appendChild(el);
      cards.push(el);
    }
    setTimeout(() => cards.forEach(el => el.remove()), duration);
  }

  function flyCard(from, to, n = 1, reverse = false) {
    for (let i = 0; i < n; i++) {
      const el = document.createElement("div");
      el.className = "fly-card";
      const jitter = (i - (n-1)/2) * 10;
      el.style.left = (from.x - 59 + jitter) + "px";
      el.style.top = (from.y - 82.5) + "px";
      el.style.opacity = "1";
      document.body.appendChild(el);
      requestAnimationFrame(() => {
        el.style.transform = `translate(${to.x - from.x - jitter}px, ${to.y - from.y}px) scale(.72) rotate(${reverse ? -12 : 12}deg)`;
        el.style.opacity = ".15";
      });
      setTimeout(() => el.remove(), 310 + i * 18);
    }
  }

  // Wrap drawOne/drawCard if present.
  if (typeof drawOne === "function" && !window.__v10DrawOneWrapped) {
    window.__v10DrawOneWrapped = true;
    const oldDrawOne = drawOne;
    drawOne = function(player) {
      player = player || (window.FirebaseCleanSync?.playerId || "p1");
      const from = rectCenter(worldElementForLibrary(player));
      const to = rectCenter(handContainerFor(player));
      flyCard(from, to, 1, false);
      return oldDrawOne(player);
    };
  }

  if (typeof drawCard === "function" && !window.__v10DrawCardWrapped) {
    window.__v10DrawCardWrapped = true;
    const oldDrawCard = drawCard;
    drawCard = function(player) {
      player = player || (window.FirebaseCleanSync?.playerId || "p1");
      const from = rectCenter(worldElementForLibrary(player));
      const to = rectCenter(handContainerFor(player));
      flyCard(from, to, 1, false);
      return oldDrawCard(player);
    };
  }

  // Wrap shuffle.
  if (typeof shuffleLibrary === "function" && !window.__v10ShuffleWrapped) {
    window.__v10ShuffleWrapped = true;
    const oldShuffle = shuffleLibrary;
    shuffleLibrary = function(player) {
      player = player || (window.FirebaseCleanSync?.playerId || "p1");
      playShuffleAnimation(player);
      return oldShuffle(player);
    };
  }

  // Mulligan: make it visibly return hand to deck, shuffle, then draw 7.
  if (typeof mulligan === "function" && !window.__v10MulliganWrapped) {
    window.__v10MulliganWrapped = true;
    const oldMulligan = mulligan;
    mulligan = function() {
      const player = window.FirebaseCleanSync?.playerId || window.CleanTableLocalPlayer || "p1";
      const hand = handContainerFor(player);
      const lib = worldElementForLibrary(player);
      const a = rectCenter(hand);
      const b = rectCenter(lib);
      try {
        const count = (typeof ownerCards === "function") ? ownerCards(player, "hand").length : 7;
        flyCard(a, b, Math.max(1, Math.min(count, 7)), true);
      } catch { flyCard(a, b, 5, true); }
      setTimeout(() => playShuffleAnimation(player), 220);
      setTimeout(() => oldMulligan(), 520);
    };
  }

  // Robust tap: double-click or T toggles battlefield card. This does not depend on old handlers.
  function findCardByEl(el) {
    const id = el?.dataset?.cardId;
    if (!id) return null;
    try { return state.cards.find(c => c.id === id); } catch { return null; }
  }

  document.addEventListener("dblclick", e => {
    const el = e.target.closest?.(".card");
    const card = findCardByEl(el);
    if (!card || card.zone !== "battlefield") return;
    e.preventDefault();
    e.stopImmediatePropagation();
    card.tapped = !card.tapped;
    try { if (typeof push === "function") push(); else { render(); } } catch { try { render(); } catch {} }
  }, true);

  document.addEventListener("keydown", e => {
    if (!e.key || e.key.toLowerCase() !== "t") return;
    let card = null;
    try {
      const id = window.hoveredCardId || hoveredCardId || (selectedIds && [...selectedIds][0]);
      card = state.cards.find(c => c.id === id);
    } catch {}
    if (!card || card.zone !== "battlefield") return;
    e.preventDefault();
    card.tapped = !card.tapped;
    try { if (typeof push === "function") push(); else { render(); } } catch { try { render(); } catch {} }
  }, true);

  // Ensure tapped visuals after every render if class transform logic misses it.
  function applyTapVisuals() {
    try {
      document.querySelectorAll(".card[data-card-id]").forEach(el => {
        const card = findCardByEl(el);
        if (!card || card.zone !== "battlefield") return;
        const current = el.style.transform || "";
        const base = current.replace(/\s?rotate\([^)]*\)/g, "");
        const ownerReadable = (typeof localPlayer !== "undefined" && card.owner === localPlayer) ? 0 : 180;
        const tap = card.tapped ? 90 : 0;
        if (!current.includes(`rotate(${ownerReadable + tap}deg)`)) {
          el.style.transform = `${base} rotate(${ownerReadable + tap}deg)`;
        }
      });
    } catch {}
  }
  const oldRAF = window.requestAnimationFrame;
  if (!window.__v10TapVisualLoop) {
    window.__v10TapVisualLoop = true;
    setInterval(applyTapVisuals, 250);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => { bindDevPanel(); applyDev(); });
  } else {
    bindDevPanel();
    applyDev();
  }
})();


// v11: per-player dev tuning + draggable panel + real life dice behavior.
(() => {
  const defaults = {
    p1LibraryX:0,p1LibraryY:0,p1GraveX:0,p1GraveY:0,p1ExileX:0,p1ExileY:0,p1DiceX:0,p1DiceY:0,
    p2LibraryX:0,p2LibraryY:0,p2GraveX:0,p2GraveY:0,p2ExileX:0,p2ExileY:0,p2DiceX:0,p2DiceY:0,
    graveHeight:260,exileHeight:64,dieSize:30,dieGap:8,dieRadius:8,selWidth:2,selColor:"#ffffff",
    shuffleSpeed:120,shuffleLength:2000,shuffleSpread:26,panelLeft:null,panelTop:18
  };
  let dev;
  try { dev = Object.assign({}, defaults, JSON.parse(localStorage.getItem("oldschoolCleanDevTuningV2") || "{}")); }
  catch { dev = Object.assign({}, defaults); }

  const ids = {
    p1LibraryX:"devP1LibraryX",p1LibraryY:"devP1LibraryY",p1GraveX:"devP1GraveX",p1GraveY:"devP1GraveY",p1ExileX:"devP1ExileX",p1ExileY:"devP1ExileY",p1DiceX:"devP1DiceX",p1DiceY:"devP1DiceY",
    p2LibraryX:"devP2LibraryX",p2LibraryY:"devP2LibraryY",p2GraveX:"devP2GraveX",p2GraveY:"devP2GraveY",p2ExileX:"devP2ExileX",p2ExileY:"devP2ExileY",p2DiceX:"devP2DiceX",p2DiceY:"devP2DiceY",
    graveHeight:"devGraveHeight",exileHeight:"devExileHeight",dieSize:"devDieSize",dieGap:"devDieGap",dieRadius:"devDieRadius",selWidth:"devSelWidth",selColor:"devSelColor",shuffleSpeed:"devShuffleSpeed",shuffleLength:"devShuffleLength",shuffleSpread:"devShuffleSpread"
  };
  const css = {
    p1LibraryX:["--dev-p1-library-x","px"],p1LibraryY:["--dev-p1-library-y","px"],p1GraveX:["--dev-p1-grave-x","px"],p1GraveY:["--dev-p1-grave-y","px"],p1ExileX:["--dev-p1-exile-x","px"],p1ExileY:["--dev-p1-exile-y","px"],
    p2LibraryX:["--dev-p2-library-x","px"],p2LibraryY:["--dev-p2-library-y","px"],p2GraveX:["--dev-p2-grave-x","px"],p2GraveY:["--dev-p2-grave-y","px"],p2ExileX:["--dev-p2-exile-x","px"],p2ExileY:["--dev-p2-exile-y","px"],
    graveHeight:["--dev-grave-height","px"],exileHeight:["--dev-exile-height","px"],dieSize:["--dev-die-size","px"],dieGap:["--dev-die-gap","px"],dieRadius:["--dev-die-radius","px"],selWidth:["--dev-selection-width","px"],selColor:["--dev-selection-color",""],shuffleSpeed:["--dev-shuffle-speed","ms"],shuffleLength:["--dev-shuffle-length","ms"],shuffleSpread:["--dev-shuffle-spread","px"]
  };
  function save(){ localStorage.setItem("oldschoolCleanDevTuningV2", JSON.stringify(dev)); }
  function setVar(k){ const s=css[k]; if(s) document.documentElement.style.setProperty(s[0], String(dev[k])+s[1]); }
  function sync(){ for(const [k,id] of Object.entries(ids)){ const el=document.getElementById(id), val=document.getElementById(id+"Val"); if(el) el.value=dev[k]; if(val) val.textContent=String(dev[k]); } }
  function panelPos(){ document.documentElement.style.setProperty("--dev-panel-top",(dev.panelTop??18)+"px"); if(dev.panelLeft==null){document.documentElement.style.setProperty("--dev-panel-left","auto");document.documentElement.style.setProperty("--dev-panel-right","18px");}else{document.documentElement.style.setProperty("--dev-panel-left",dev.panelLeft+"px");document.documentElement.style.setProperty("--dev-panel-right","auto");}}
  function apply(){ Object.keys(css).forEach(setVar); panelPos(); sync(); save(); try{renderDice()}catch{} }
  function values(){ return JSON.stringify(dev,null,2); }

  function bind(){
    const panel=document.getElementById("devPanel"), out=document.getElementById("devOutput"), btn=document.getElementById("devTuningBtn");
    if(btn) btn.onclick=e=>{e.preventDefault(); panel?.classList.toggle("hidden"); if(out) out.value=values();};
    document.getElementById("devClose")?.addEventListener("click",()=>panel?.classList.add("hidden"));
    document.getElementById("devCopy")?.addEventListener("click",async()=>{if(out) out.value=values(); try{await navigator.clipboard.writeText(values())}catch{}});
    document.getElementById("devReset")?.addEventListener("click",()=>{dev=Object.assign({},defaults); apply(); if(out) out.value=values();});
    for(const [k,id] of Object.entries(ids)){ const el=document.getElementById(id); if(!el) continue; el.oninput=()=>{dev[k]=el.type==="color"?el.value:Number(el.value); setVar(k); sync(); save(); if(k.includes("Dice")||k.startsWith("die"))try{renderDice()}catch{}}; }
    const handle=document.getElementById("devDragHandle"); let drag=null;
    handle?.addEventListener("pointerdown",e=>{const r=panel.getBoundingClientRect(); drag={dx:e.clientX-r.left,dy:e.clientY-r.top}; e.preventDefault();});
    document.addEventListener("pointermove",e=>{if(!drag)return; dev.panelLeft=Math.max(0,Math.min(innerWidth-80,e.clientX-drag.dx)); dev.panelTop=Math.max(0,Math.min(innerHeight-40,e.clientY-drag.dy)); panelPos();});
    document.addEventListener("pointerup",()=>{if(drag){drag=null;save();}});
  }

  function diceValues(life){ life=Math.max(1,Number(life)||1); const a=[]; while(life>5){a.push(5); life-=5;} a.push(life); return a; }
  function setLifeLocal(player, next){ next=Math.max(1,Number(next)||1); if(!state.life) state.life={p1:20,p2:20}; state.life[player]=next; const keep=(state.dice||[]).filter(d=>!(d.kind==="life"&&d.owner===player)); const made=diceValues(next).map((value,i)=>({id:(crypto.randomUUID?crypto.randomUUID():String(Date.now())+Math.random()),kind:"life",owner:player,value,x:0,y:0,color:"#eee",z:1000+i})); state.dice=keep.concat(made); try{push()}catch{try{saveState()}catch{} try{render()}catch{}} }
  try{ setLife=function(player,next){setLifeLocal(player,next)}; }catch{}

  function hoveredOwner(){ try{const id=(typeof hoveredDieId!=="undefined"&&hoveredDieId)||state.hoveredDieId; const d=state.dice.find(x=>x.id===id); if(d&&d.kind==="life")return d.owner;}catch{} return window.FirebaseCleanSync?.playerId||"p1"; }
  document.addEventListener("keydown",e=>{ if(e.key!=="ArrowUp"&&e.key!=="ArrowDown")return; const p=hoveredOwner(); const cur=Number(state.life?.[p]||20); setLifeLocal(p,cur+(e.key==="ArrowUp"?1:-1)); e.preventDefault(); e.stopImmediatePropagation();},true);

  renderDice=function(){
    const layer=document.getElementById("diceLayer"); if(!layer)return; layer.innerHTML="";
    if(!state.life)state.life={p1:20,p2:20}; if(!Array.isArray(state.dice))state.dice=[];
    const pips={1:[5],2:[1,9],3:[1,5,9],4:[1,3,7,9],5:[1,3,5,7,9],6:[1,3,4,6,7,9]};
    for(const player of ["p1","p2"]){
      const vals=diceValues(state.life[player]||20);
      let lifeDice=state.dice.filter(d=>d.kind==="life"&&d.owner===player);
      if(lifeDice.length!==vals.length || lifeDice.reduce((a,d)=>a+Number(d.value||0),0)!==(state.life[player]||20)){
        state.dice=state.dice.filter(d=>!(d.kind==="life"&&d.owner===player)).concat(vals.map((value,i)=>({id:(crypto.randomUUID?crypto.randomUUID():String(Date.now())+Math.random()),kind:"life",owner:player,value,x:0,y:0,color:"#eee",z:1000+i})));
        lifeDice=state.dice.filter(d=>d.kind==="life"&&d.owner===player);
      }
      const base={p1:{x:1500+dev.p1DiceX,y:552+dev.p1DiceY},p2:{x:420+dev.p2DiceX,y:486+dev.p2DiceY}}[player];
      lifeDice.forEach((d,i)=>{
        const el=document.createElement("div"); el.className="die life-die"; el.dataset.dieId=d.id; el.style.left=(base.x+i*(Number(dev.dieSize)+Number(dev.dieGap)))+"px"; el.style.top=base.y+"px"; el.style.zIndex=String(1000+i);
        const value=Math.max(1,Math.min(6,Number(d.value)||1)); for(const p of pips[value]||pips[1]){const pip=document.createElement("div"); pip.className="pip p"+p; el.appendChild(pip);}
        el.addEventListener("mouseenter",()=>{try{hoveredDieId=d.id}catch{} state.hoveredDieId=d.id;}); el.addEventListener("mouseleave",()=>{try{if(hoveredDieId===d.id)hoveredDieId=null}catch{} if(state.hoveredDieId===d.id)state.hoveredDieId=null;});
        layer.appendChild(el);
      });
    }
  };

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>{bind();apply();}); else {bind();apply();}
  window.__oldschoolDevValues=()=>JSON.parse(JSON.stringify(dev));
})();
