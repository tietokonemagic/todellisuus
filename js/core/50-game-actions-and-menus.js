"use strict";

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
    const img = document.createElement("img");
    img.src = card.faceDown ? "lapi2.png" : (card.image || "lapi2.png");
    wrap.appendChild(img);
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
    els.inspectorName.textContent = "INSPECTOR";
    els.inspectorType.textContent = "";
    els.inspectorOracle.textContent = "Hover a visible card.";
    return;
  }

  els.inspectorName.textContent = card.name || "";
  els.inspectorType.textContent = card.typeLine || "";
  els.inspectorOracle.textContent = card.oracle || "";
}


function clearInspectorContent() {
  if (!inspectorEnabled) return;
  els.inspector.classList.remove("hidden");
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
  let targets = [];

  const hoverCard = state.cards.find(c => c.id === hoveredCardId);
  if (hoverCard) {
    targets = [hoverCard];
  } else if (selectedIds.size) {
    targets = state.cards.filter(c => selectedIds.has(c.id));
  }

  if (!targets.length) return false;

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
