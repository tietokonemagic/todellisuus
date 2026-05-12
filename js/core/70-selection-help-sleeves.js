"use strict";

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
  if (e.target.closest(".card,.die,.pile,.hand,.main-menu,.main-menu-btn,.modal,.context-menu,.inspector,.dev-panel")) return;
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


function setHelpOpenV33(open){if(!els.helpOverlayV33)return;els.helpOverlayV33.classList.toggle("hidden",!open);updateMenuActiveStates();}
function toggleHelpV33(e=null){if(e){e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation();}if(!els.helpOverlayV33)return;setHelpOpenV33(els.helpOverlayV33.classList.contains("hidden"));}
function updateSleeveButtonsV33(){
  if(!localPlayer||!state.sleeves)return;
  const s=state.sleeves[localPlayer]||{type:"og",color:"#6a3b20"};
  if(els.ogBackSleeveBtn)els.ogBackSleeveBtn.classList.toggle("active",s.type==="og");
  if(els.colorSleeveBtn)els.colorSleeveBtn.classList.toggle("active",s.type==="color");
  if(els.sleeveColorInput&&s.color)els.sleeveColorInput.value=s.color;
}
function setSleeveV33(type){
  if(!state.sleeves)state.sleeves={p1:{type:"og",color:"#6a3b20"},p2:{type:"og",color:"#6a3b20"}};
  state.sleeves[localPlayer]=type==="color"?{type:"color",color:els.sleeveColorInput.value}:{type:"og",color:"#6a3b20"};
  updateSleeveButtonsV33();push();
}
let boxSelectV33=null;
function beginBoxSelectV33(e){
  if(e.button!==0||!localPlayer)return;
  if(e.target.closest(".card,.die,.pile,.hand,.main-menu,.main-menu-btn,.modal,.context-menu,.inspector,.dev-panel,.sylvan-panel,.help-overlay-v33"))return;
  boxSelectV33={x0:e.clientX,y0:e.clientY,x1:e.clientX,y1:e.clientY};
  els.selectBox.classList.remove("hidden");updateBoxSelectV33(e);
  document.addEventListener("pointermove",updateBoxSelectV33);
  document.addEventListener("pointerup",finishBoxSelectV33,{once:true});
}
function updateBoxSelectV33(e){
  if(!boxSelectV33)return;
  boxSelectV33.x1=e.clientX;boxSelectV33.y1=e.clientY;
  const l=Math.min(boxSelectV33.x0,boxSelectV33.x1),t=Math.min(boxSelectV33.y0,boxSelectV33.y1),r=Math.max(boxSelectV33.x0,boxSelectV33.x1),b=Math.max(boxSelectV33.y0,boxSelectV33.y1);
  els.selectBox.style.left=l+"px";els.selectBox.style.top=t+"px";els.selectBox.style.width=(r-l)+"px";els.selectBox.style.height=(b-t)+"px";
}
function finishBoxSelectV33(){
  document.removeEventListener("pointermove",updateBoxSelectV33);
  if(!boxSelectV33)return;
  const sel={left:Math.min(boxSelectV33.x0,boxSelectV33.x1),top:Math.min(boxSelectV33.y0,boxSelectV33.y1),right:Math.max(boxSelectV33.x0,boxSelectV33.x1),bottom:Math.max(boxSelectV33.y0,boxSelectV33.y1)};
  els.selectBox.classList.add("hidden");
  if((sel.right-sel.left)>5||(sel.bottom-sel.top)>5){
    const ids=[];
    document.querySelectorAll("#cardLayer .card").forEach(el=>{const id=el.dataset.cardId;if(!id)return;const r=el.getBoundingClientRect();if(!(r.right<sel.left||r.left>sel.right||r.bottom<sel.top||r.top>sel.bottom))ids.push(id);});
    selectedIds=new Set(ids);render();
  }
  boxSelectV33=null;
}

// UI bindings
if(els.helpBtn){els.helpBtn.onclick=toggleHelpV33;els.helpBtn.addEventListener("click",toggleHelpV33,true);}
if(els.helpOverlayV33)els.helpOverlayV33.addEventListener("click",e=>{if(e.target===els.helpOverlayV33)setHelpOpenV33(false);});
if(els.ogBackSleeveBtn)els.ogBackSleeveBtn.onclick=e=>{e.preventDefault();e.stopPropagation();setSleeveV33("og");};
if(els.colorSleeveBtn)els.colorSleeveBtn.onclick=e=>{e.preventDefault();e.stopPropagation();setSleeveV33("color");};
if(els.sleeveColorInput)els.sleeveColorInput.oninput=()=>{if(state.sleeves?.[localPlayer]?.type==="color")setSleeveV33("color");};
updateSleeveButtonsV33();
els.world.addEventListener("pointerdown",beginBoxSelectV33);


els.joinR1P1.onclick = () => join("room1", "p1");
els.joinR1P2.onclick = () => join("room1", "p2");
els.joinR2P1.onclick = () => join("room2", "p1");
els.joinR2P2.onclick = () => join("room2", "p2");
els.kickRoom1.onclick = () => window.FirebaseCleanSync?.kickRoom("room1");
els.kickRoom2.onclick = () => window.FirebaseCleanSync?.kickRoom("room2");

els.mainMenuBtn.onclick = () => els.mainMenu.classList.toggle("hidden");
populateGreenMenuLists();
if (els.playmatMenuBtn) els.playmatMenuBtn.onclick = () => toggleSection(els.playmatMenu, els.playmatMenuBtn);
if (els.sleevesMenuBtn) els.sleevesMenuBtn.onclick = () => toggleSection(els.sleevesMenu, els.sleevesMenuBtn);
if (els.addTokenMenuBtn) els.addTokenMenuBtn.onclick = () => toggleSection(els.tokenMenu, els.addTokenMenuBtn);
if (els.addDiceBtn) els.addDiceBtn.onclick = () => addCounterDie();
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

els.loadDeckBtn.onclick = () => els.deckModal.classList.remove("hidden");
els.closeDeckModal.onclick = () => els.deckModal.classList.add("hidden");
els.doLoadDeck.onclick = loadDeck;
els.devTuningBtn.onclick = () => { els.devPanel.classList.toggle("hidden"); renderHandDropZoneDebug(); renderHandSafeZoneDebug(); updateMenuActiveStates(); };
els.devClose.onclick = () => { els.devPanel.classList.add("hidden"); updateMenuActiveStates(); };
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
