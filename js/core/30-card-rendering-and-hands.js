"use strict";

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
    el.style.transform = `rotate(${cardRotation(card)}deg)`;
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

  const thumb = document.createElement("img");
  thumb.className = "hand-art hand-art-thumb";
  thumb.src = "thumb.png";
  thumb.alt = "";
  thumb.draggable = false;
  thumb.style.width = (dev.handArtSize || 190) + "px";
  thumb.style.left = `calc(50% + ${(dev.handArtX || 0) + thumbX}px)`;
  thumb.style.bottom = ((dev.handArtY || 0) + thumbY) + "px";
  container.appendChild(thumb);

  if (oldDragVisual && drag && drag.fromZone === player + "-hand") {
    container.appendChild(oldDragVisual);
  }
}


function sleeveBackElement(owner, card = null) {
  const back = document.createElement("div");
  back.className = "back";
  if (card && card.isToken) {
    back.style.backgroundImage = 'url("token/aieback.png")';
    back.style.backgroundColor = "#050505";
    back.style.backgroundSize = "cover";
    back.style.backgroundPosition = "center";
    return back;
  }
  const sleeve = state.sleeves?.[owner] || { type: "og", color: "#6a3b20" };
  if (sleeve.type === "color") {
    back.style.backgroundImage = "none";
    back.style.backgroundColor = sleeve.color || "#6a3b20";
    back.style.backgroundSize = "cover";
    back.style.backgroundPosition = "center";
  } else {
    back.style.backgroundImage = 'url("lapi2.png")';
    back.style.backgroundColor = "#050505";
    back.style.backgroundSize = "cover";
    back.style.backgroundPosition = "center";
  }
  return back;
}


function createCardEl(card, cls, forceBack = false) {
  const el = document.createElement("div");
  el.className = `card ${cls}` + (selectedIds.has(card.id) ? " selected" : "") + (card.marked ? " discard-marked" : "");
  if (card.sylvanChoice) el.classList.add(card.sylvanChoice === "keep" ? "sylvan-keep" : "sylvan-mark");
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
