"use strict";

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
  el.className = "die" + (d.kind === "counter" ? " counter-die" : "");
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
  closeMenus();
  const p = tablePoint(e.clientX, e.clientY, false);
  const startX = die.kind === "life" ? p.x : (die.x || p.x);
  const startY = die.kind === "life" ? p.y : (die.y || p.y);
  dieDrag = {
    id: die.id,
    kind: die.kind,
    startClientX: e.clientX,
    startClientY: e.clientY,
    offsetX: p.x - startX,
    offsetY: p.y - startY
  };
  e.preventDefault();
  e.stopPropagation();
  document.addEventListener("pointermove", onDieDragMove);
  document.addEventListener("pointerup", onDieDragEnd, { once: true });
}

function onDieDragMove(e) {
  if (!dieDrag) return;
  const die = state.dice.find(d => d.id === dieDrag.id);
  if (!die) return;
  const p = tablePoint(e.clientX, e.clientY);
  die.x = snap(p.x - dieDrag.offsetX);
  die.y = snap(p.y - dieDrag.offsetY);
  die.kind = "counter";
  die.z = 3000;
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

  if (!selectedIds.has(card.id)) selectedIds = new Set([card.id]);

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
