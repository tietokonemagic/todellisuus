"use strict";

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

function bindInspectorPanel() {
  const saved = (() => {
    try { return JSON.parse(localStorage.getItem("oldschoolInspectorPanelV26") || "{}"); }
    catch { return {}; }
  })();

  if (saved.left != null) els.inspector.style.left = saved.left + "px";
  if (saved.top != null) els.inspector.style.top = saved.top + "px";
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
