var __PLAYMAT_FILES__ = ["allergy1.png", "allergy1b.png", "allergy2.png", "bluemana1.png", "bluemana2.png", "boris.png", "camel.png", "cland.png", "cross.png", "dance.png", "farm.png", "flash.png", "flash2.png", "gate.png", "geddon.png", "golem.png", "grem1.png", "grem2.png", "hell.png", "hordes.png", "kudzu.png", "life.png", "mesa.png", "miracle.png", "mire.png", "mold.png", "pesti.png", "phantom.png", "purge.png", "spawn.png", "terracorn.png", "terrain.png", "unicorn.png", "urzaglas.png", "vault.png", "zombi.png"];
const SLEEVE_COLORS = {
  black: "#050505",
  turquoise: "#00a8a8",
  blue: "#174bd6",
  yellow: "#d7b21d",
  orange: "#d66a16",
  green: "#188338",
  red: "#b42020",
  purple: "#5b218a",
  lilac: "#a88ee8",
  pink: "#e06fa8",
  peach: "#e5a77f"
};

const PIPS = { 1:[5], 2:[1,9], 3:[1,5,9], 4:[1,3,7,9], 5:[1,3,5,7,9], 6:[1,3,4,6,7,9] };

const TOKEN_NAMES = ["wolf","rukh","minor demon","sand warrior","camarid","thrull","saproling","djinn","tetravite","stangg","snake","citizen","goblin","wasp"];
function tokenPath(setName, tokenName){
  return `token/${setName}/${tokenName.replaceAll(" ","-")}.png`;
}

const CARD_W = 118;
const CARD_H = Math.round(CARD_W * 1.397);
const HAND_HEIGHT = 162;

const state = {
  coreSet: "leb",
  sleeve: "black",
  handZoom: 1,
  battlefieldZoom: 1,
  handFan: { p1: 0, p2: 0 },
  handDepth: { p1: 0 },
  showOraclePanel: true,
  handPosition: { p1: null },
  tableZoom: 0.88,
  activePlayer: "p1",
  revealedLibraryTop: { p1: false, p2: false },
  pileRotations: {},
  cards: [],
  dice: [],
  life: { p1: 20, p2: 20 },
  selectedCardIds: [],
  selectedDieIds: [],
  selectedCardId: null,
  selectedDieId: null,
  dragging: null,
  hoveredDieId: null,
  selecting: null,
  expandedPile: null,
  selectedLibraryCardId: null,
  selectedToken: null,
  sideboardCards: [],
  mainboardSessionIds: null,
  librarySearchPlayer: "p1",
  zoom: 1,
  showSelection: false,
  pilePositions: {},
  draggingPile: null,
  shiftDown: false
};

const ids = [
  "table","selectionBox","diceLayer","turnNotice","oraclePanel","centerLine",
  "p1HandZone","p1HandFan","p2HandZone","p2HandFan",
  "p1LibraryZone","p1LibraryVisual","p1LibraryCount","p1GraveyardZone","p1GraveyardCount","p1ExileZone","p1ExileCount",
  "p2LibraryZone","p2LibraryVisual","p2LibraryCount","p2GraveyardZone","p2GraveyardCount","p2ExileZone","p2ExileCount",
  "menuBtn","menuPanel","activePlayerSelect","sleeveSelect","handZoomSlider","battlefieldZoomSlider","p1HandFanSlider","p2HandFanSlider","p1HandDepthSlider","sliderDock","menuAddTokenBtn","menuAddDiceBtn","mainboardCount","sideboardCount","tokenSelect","tokenSetSelect","tokenModal","tokenGrid","closeTokenBtn","tokenToBattlefieldBtn","sideboardBtn","sideboardModal","mainboardGrid","sideboardGrid","sideboardReadyBtn","closeSideboardBtn","hideSelectionCheck",
  "importModal","deckInput","importStatus","modalCoreSetSelect","loadDeckBtn","closeImportBtn",
  "libraryModal","libraryGrid","libraryToHandBtn","libraryToBattlefieldBtn","closeLibraryBtn",
  "cardMenu","diceMenu","dieColorBox","dieHue",
  "p1DrawPopover","p1DrawAmountSlider","p1DrawAmountLabel","p1DrawManyBtn",
  "p2DrawPopover","p2DrawAmountSlider","p2DrawAmountLabel","p2DrawManyBtn","p1AddTokenBtn","p2AddTokenBtn","p1AddDiceBtn","p2AddDiceBtn",
  "p1RevealHandBtn","p2RevealHandBtn","p1TutorBtn","p2TutorBtn","p1ShuffleBtn","p2ShuffleBtn","p1RevealBtn","p2RevealBtn"
];
const els = {};
ids.forEach(id => els[id] = document.getElementById(id));

function uid(){ return crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2); }

function defaultDice(){
  return makeLifeDice("p1", 20).concat(makeLifeDice("p2", 20));
}

function makeLifeDice(player, life){
  const cardW = Math.max(118, Math.min(window.innerWidth * 0.07, 154));
  const gap = Math.max(10, Math.min(window.innerWidth * 0.01, 18));
  const groupW = cardW * 2 + gap;
  const pad = Math.max(16, Math.min(window.innerWidth * 0.016, 30));

  const totalDice = Math.max(1, Math.ceil(life / 5));
  const values = [];
  let rest = life;
  for (let i = 0; i < totalDice; i++) {
    const v = Math.min(5, Math.max(1, rest));
    values.push(v);
    rest -= v;
  }

  const groupLeft = player === "p1" ? window.innerWidth - pad - groupW : pad;
  const libraryLeft = groupLeft + cardW + gap;
  const startX = libraryLeft + 4;
  const startY = player === "p1"
    ? window.innerHeight / 2 + 34
    : window.innerHeight / 2 - 72;

  return values.map((value, i) => ({
    id: uid(),
    kind: "life",
    owner: player,
    value,
    x: startX + i * 44,
    y: startY,
    color: "#eeeeee",
    z: 1000 + i
  }));
}

function syncLifeDice(player){
  state.dice = state.dice.filter(d => !(d.kind === "life" && d.owner === player)).concat(makeLifeDice(player, state.life[player]));
}

function setLife(player, nextLife){
  state.life[player] = Math.max(1, nextLife);
  syncLifeDice(player);
  saveState();
  renderDice();
}

function saveState(){
  localStorage.setItem("oldschoolTabletopV99", JSON.stringify({
    coreSet: state.coreSet,
    sleeve: state.sleeve,
    handZoom: state.handZoom,
    battlefieldZoom: state.battlefieldZoom,
    handFan: state.handFan,
    handDepth: state.handDepth,
    showOraclePanel: state.showOraclePanel,
    handPosition: state.handPosition,
    tableZoom: state.tableZoom,
    activePlayer: state.activePlayer,
    zoom: state.zoom,
    revealedLibraryTop: state.revealedLibraryTop,
    pileRotations: state.pileRotations,
    pilePositions: state.pilePositions,
    layoutVersion: 7,
    showSelection: state.showSelection,
    cards: state.cards,
    sideboardCards: state.sideboardCards,
    mainboardSessionIds: state.mainboardSessionIds,
    dice: state.dice,
    life: state.life
  }));
}

function loadState(){
  const raw = localStorage.getItem("oldschoolTabletopV99");
  if(!raw) return false;
  try{
    const s = JSON.parse(raw);
    state.coreSet = s.coreSet || "leb";
    state.sleeve = s.sleeve || "black";
    state.handZoom = s.handZoom || 1;
    state.battlefieldZoom = s.battlefieldZoom || 1;
    state.handFan = s.handFan || {p1:0,p2:0};
    state.handDepth = s.handDepth || {p1:0};
    state.showOraclePanel = s.showOraclePanel !== false;
    state.handPosition = s.handPosition || {p1:null};
    state.tableZoom = s.tableZoom || 0.88;
    state.activePlayer = s.activePlayer || "p1";
    state.zoom = s.zoom || 1;
    state.revealedLibraryTop = s.revealedLibraryTop || {p1:false,p2:false};
    state.pileRotations = s.pileRotations || {};
    state.pilePositions = {};
    if (!s.layoutVersion || s.layoutVersion < 7) {
      delete state.pilePositions["p2-library"];
      delete state.pilePositions["p2-graveyard"];
      delete state.pilePositions["p2-exile"];
    }
    state.showSelection = !!s.showSelection;
    document.body.classList.toggle("hide-selection", !state.showSelection);
    state.cards = Array.isArray(s.cards) ? s.cards : [];
    state.sideboardCards = Array.isArray(s.sideboardCards) ? s.sideboardCards : [];
    state.mainboardSessionIds = s.mainboardSessionIds || null;
    state.dice = Array.isArray(s.dice) ? s.dice : defaultDice();
    state.life = s.life || { p1: 20, p2: 20 };
    state.dice.forEach((d, i) => { if (!d.kind) d.kind = i < 4 ? "life" : "counter"; });
    syncControls();
    applySleeve();
  applyV23Zoom();
  applyZoom();
  applyV23Zoom();
    return true;
  } catch { return false; }
}

function syncControls(){
  els.modalCoreSetSelect.value = state.coreSet;
  document.body.classList.toggle("core-2ed", state.coreSet === "2ed");
  els.sleeveSelect.value = state.sleeve;
  if(els.handZoomSlider) els.handZoomSlider.value = String(Math.round((state.handZoom || 1) * 100));
  if(els.battlefieldZoomSlider) els.battlefieldZoomSlider.value = String(Math.round((state.battlefieldZoom || 1) * 100));
  if(els.p1HandFanSlider) els.p1HandFanSlider.value = String(state.handFan?.p1 || 0);
  if(els.p2HandFanSlider) els.p2HandFanSlider.value = String(state.handFan?.p2 || 0);
  if(els.tableZoomSlider) els.tableZoomSlider.value = String(Math.round((state.tableZoom || 0.88) * 100));
  els.activePlayerSelect.value = state.activePlayer;
}

function applySleeve(){
  document.documentElement.style.setProperty("--sleeve", state.sleeve === "transparent" ? "transparent" : (SLEEVE_COLORS[state.sleeve] || "#050505"));
}


function applyV23Zoom(){
  document.documentElement.style.setProperty("--hand-zoom", String(state.handZoom || 1));
  document.documentElement.style.setProperty("--battlefield-zoom", String(state.battlefieldZoom || 1));
}

function applyTableZoom(){
  document.documentElement.style.setProperty("--table-zoom", String(state.tableZoom || 0.88));
}


function applyZoom(){ return; }

function parseDeckList(text){
  return text.split(/\r?\n/).map(l=>l.trim()).filter(Boolean).flatMap(line=>{
    if(line.startsWith("//") || line.startsWith("#")) return [];
    const cleaned = line.replace(/^SB:\s*/i,"").replace(/\s+\([^)]+\)$/g,"").trim();
    const match = cleaned.match(/^(\d+)\s+(.+)$/);
    if(!match) return [];
    return [{ count:Number(match[1]), name:match[2].replace(/\s+\*.*$/,"").trim() }];
  });
}

async function loadDeck(){
  const entries = parseDeckList(els.deckInput.value);
  if(!entries.length){ els.importStatus.textContent = "No valid deck lines found."; return; }
  const player = state.activePlayer;
  state.coreSet = els.modalCoreSetSelect.value;
  const uniqueNames = [...new Set(entries.map(e=>e.name))];
  const map = new Map();

  try{
    for(let i=0;i<uniqueNames.length;i++){
      els.importStatus.textContent = `Loading ${i+1}/${uniqueNames.length}: ${uniqueNames[i]}`;
      map.set(uniqueNames[i], await fetchPreferredCard(uniqueNames[i], state.coreSet));
    }
    state.cards = state.cards.filter(c => c.owner !== player);
    const newCards = [];
    for(const entry of entries){
      const data = map.get(entry.name);
      for(let i=0;i<entry.count;i++){
        newCards.push({ id:uid(), owner:player, zone:`${player}-library`, tapped:false, faceDown:false, x:180, y:120, z:i, token:false, ...data });
      }
    }
    state.cards = state.cards.concat(shuffleArray(newCards));
    saveState();
    render();
    document.getElementById("importModal")?.classList.add("hidden");
  } catch(err){ els.importStatus.textContent = err.message; }
}

function shuffleArray(arr){
  const copy = [...arr];
  for(let i=copy.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [copy[i],copy[j]] = [copy[j],copy[i]];
  }
  return copy;
}

function zoneCards(zone){ return state.cards.filter(c => c.zone === zone); }
function playerOfZone(zone){ return zone.startsWith("p2-") ? "p2" : "p1"; }
function kindOfZone(zone){ return zone.split("-")[1]; }

function drawCard(player=state.activePlayer){
  const lib = zoneCards(`${player}-library`);
  if(!lib.length) return;
  const card = lib[lib.length-1];
  card.zone = `${player}-hand`;
  card.tapped = false;
  card.faceDown = false;
  bringCardToFront(card);
  state.revealedLibraryTop[player] = false;
  saveState();
  render();
}

function drawMany(player, n){ for(let i=0;i<n;i++) drawCard(player); }

function shuffleLibrary(player){
  const zone = `${player}-library`;
  const others = state.cards.filter(c => c.zone !== zone);
  const lib = shuffleArray(zoneCards(zone));
  state.cards = others.concat(lib);
  state.revealedLibraryTop[player] = false;
  saveState();
  render();
}

function resetGameStateOnly(){
  state.selectedCardIds = [];
  state.selectedDieIds = [];
  state.revealedLibraryTop = {p1:false,p2:false};
  state.expandedPile = null;
  state.pileRotations = {};
}

function resetGame(){
  if(!confirm("Are you sure?")) return;
  state.cards = state.cards.filter(c=>!c.token).map((c,i)=>({
    ...c,
    zone:`${c.owner || "p1"}-library`,
    tapped:false,
    faceDown:false,
    x:180,
    y:120,
    z:i
  }));

  for(const p of ["p1","p2"]){
    const others = state.cards.filter(c => c.zone !== `${p}-library`);
    const lib = shuffleArray(zoneCards(`${p}-library`));
    state.cards = others.concat(lib);
  }

  state.life = { p1: 20, p2: 20 };
  state.dice = defaultDice();
  resetGameStateOnly();
  saveState();
  render();
}

function newDeck(){
  if(!confirm("Are you sure?")) return;
  state.cards = state.cards.filter(c => c.owner !== state.activePlayer);
  state.life = { p1: 20, p2: 20 };
  state.dice = defaultDice();
  resetGameStateOnly();
  saveState();
  render();
  els.importModal.classList.remove("hidden");
}

function bringCardToFront(card){ card.z = Math.max(0, ...state.cards.map(c=>c.z||0)) + 1; }
function bringDieToFront(die){ die.z = Math.max(1000, ...state.dice.map(d=>d.z||1000)) + 1; }

function render(){
  renderCounts();
  renderLibraryVisuals();
  renderHands();
  renderBattlefield();
  renderSmallStacks();
  renderExpandedPile();
  renderDice();
  renderPileRotations();
  renderPilePositions();
  updateDrawControls();
}

function renderCounts(){
  for(const p of ["p1","p2"]){
    const handLabel = document.querySelector(`#${p}HandZone .hand-label`);
    handLabel.textContent = (p === "p1" ? "Hand" : "Opponent hand") + ` (${zoneCards(`${p}-hand`).length})`;
    const lc = document.getElementById(`${p}LibraryCount`);
    const gc = document.getElementById(`${p}GraveyardCount`);
    const ec = document.getElementById(`${p}ExileCount`);
    if(lc) lc.textContent = zoneCards(`${p}-library`).length;
    if(gc) gc.textContent = zoneCards(`${p}-graveyard`).length;
    if(ec) ec.textContent = zoneCards(`${p}-exile`).length;
  }
}

function renderPileRotations(){
  document.querySelectorAll(".pile-zone").forEach(el=>{
    const zone = el.dataset.zone;
    el.classList.toggle("rotated", !!state.pileRotations[zone]);
  });
}

function renderPilePositions(){ return; }


function renderLibraryVisuals(){
  for(const p of ["p1","p2"]){
    const visual = els[`${p}LibraryVisual`];
    if(!visual) continue;
    visual.innerHTML = "";
    visual.className = "pile-visual sleeve-back" + (state.sleeve === "transparent" ? " transparent-sleeve" : "");
    const top = zoneCards(`${p}-library`).at(-1);
    if(state.revealedLibraryTop[p] && top){
      const img = document.createElement("img");
      img.className = "small-card-preview";
      img.src = top.image;
      img.draggable = false;
      visual.appendChild(img);
    }
  }
}

function renderHands(){
  renderHand("p1", els.p1HandFan);
  renderHand("p2", els.p2HandFan);
}

function renderHand(player, fan){
  fan.innerHTML = "";
  const hand = zoneCards(`${player}-hand`);
  const count = hand.length;
  const spread = Math.min(54, 760 / Math.max(1,count));
  const start = -((count-1)*spread)/2;
  const center = (count-1)/2;
  hand.forEach((card,index)=>{
    const el = createCardElement(card, "hand-card");
    const rel = index-center;
    const x = start + index*spread;
    const angle = rel * 4.6;
    const arc = Math.pow(rel,2) * 2.2;
    const raise = 18 - arc;
    el.style.left = `calc(50% + ${x}px - var(--card-w) / 2)`;
    el.style.bottom = `${Math.max(-12, raise)}px`;
    el.style.transform = `rotate(${angle}deg)`;
    el.style.zIndex = String(100+index);
    fan.appendChild(el);
  });
}

function renderBattlefield(){
  [...els.table.querySelectorAll(".battle-card")].forEach(el=>el.remove());
  zoneCards("battlefield").sort((a,b)=>(a.z||0)-(b.z||0)).forEach(card=>{
    const el = createCardElement(card, "battle-card");
    el.style.left = `${card.x || 200}px`;
    el.style.top = `${card.y || 100}px`;
    el.style.zIndex = String(card.z || 1);
    v23ApplyCardTransform(el, card);
    els.table.appendChild(el);
  });
}

function renderSmallStacks(){
  for(const p of ["p1","p2"]){
    for(const kind of ["graveyard","exile"]){
      const el = els[`${p}${cap(kind)}Zone`];
      [...el.querySelectorAll(".small-card-preview")].forEach(x=>x.remove());
      const top = zoneCards(`${p}-${kind}`).at(-1);
      if(!top) continue;
      const img = document.createElement("img");
      img.className = "small-card-preview";
      img.src = top.image;
      img.draggable = false;
      el.appendChild(img);
    }
  }
}
function cap(s){ return s[0].toUpperCase() + s.slice(1); }

function renderExpandedPile(){
  document.querySelectorAll(".expanded-stack").forEach(el=>el.remove());
  if(!state.expandedPile) return;
  const [player, kind] = state.expandedPile.split("-");
  const pileEl = els[`${player}${cap(kind)}Zone`];
  const cards = zoneCards(state.expandedPile);
  if(!cards.length) return;
  const stack = document.createElement("div");
  stack.className = "expanded-stack";
  stack.style.height = `${CARD_H + Math.max(0,cards.length-1)*28}px`;

  cards.forEach((card,index)=>{
    const c = document.createElement("div");
    c.className = "stack-card";
    c.style.bottom = `${index*28}px`;
    c.style.zIndex = String(100+index);
    c.title = card.name;
    const img = document.createElement("img");
    img.src = card.image;
    img.draggable = false;
    c.appendChild(img);
    c.addEventListener("mouseenter",()=>showOracle(card));
    c.addEventListener("mouseleave",hideOracle);
    c.addEventListener("contextmenu",e=>openCardMenu(e,card));
    c.addEventListener("pointerdown",e=>startCardDrag(e,card));
    stack.appendChild(c);
  });
  pileEl.appendChild(stack);
}


function v23BaseRotation(card){
  return card.owner === "p2" ? 180 : 0;
}

function v23ApplyCardTransform(el, card){
  if(!el || card.zone !== "battlefield") return;
  el.style.transform = `rotate(${v23BaseRotation(card) + (card.tapped ? 90 : 0)}deg)`;
}

function v23ToggleTap(card){
  if(!card || card.zone !== "battlefield") return;

  let targets;
  if(state.selectedCardIds && state.selectedCardIds.includes(card.id) && state.selectedCardIds.length > 1){
    targets = state.cards.filter(c => state.selectedCardIds.includes(c.id) && c.zone === "battlefield");
  } else if(typeof v19TapGroup === "function") {
    targets = v19TapGroup(card);
  } else {
    targets = [card];
  }

  const next = !card.tapped;
  targets.forEach(c => c.tapped = next);
  saveState();
  render();
}

function v23UntapMine(){
  state.cards.forEach(c=>{
    if(c.zone === "battlefield" && (c.owner || "p1") === "p1") c.tapped = false;
  });
  saveState();
  render();
}

function createCardElement(card, className){
  const el = document.createElement("div");
  el.className = `card ${className} owner-${card.owner || "p1"}` + (state.selectedCardIds.includes(card.id) ? " selected" : "") + (card.faceDown ? " face-down" : "");
  el.dataset.cardId = card.id;
  const back = document.createElement("div");
  back.className = "card-back sleeve-back" + (state.sleeve === "transparent" ? " transparent-sleeve" : "");
  if(card.tokenBack){back.style.backgroundImage=`url(${card.tokenBack})`;back.style.backgroundSize="cover";back.style.backgroundPosition="center";}
  el.appendChild(back);
  const img = document.createElement("img");
  img.className = "card-face";
  img.src = card.image;
  img.alt = card.name;
  img.draggable = false;
  el.appendChild(img);
  if(card.token){
    const label = document.createElement("div");
    label.className = "token-label";
    label.textContent = "token";
    el.appendChild(label);
  }
  el.addEventListener("mouseenter",()=>showOracle(card));
  el.addEventListener("mouseleave",hideOracle);
  el.addEventListener("contextmenu",e=>openCardMenu(e,card));
  // dblclick handled globally in v19
  el.addEventListener("pointerdown",e=>startCardDrag(e,card));

  if (card.zone === "battlefield") {
    el.addEventListener("pointerup", (ev) => {
      if (ev.button !== 0) return;
      const now = Date.now();
      const last = Number(el.dataset.lastTapTime || 0);
      const dx = Math.abs(ev.clientX - Number(el.dataset.lastTapX || ev.clientX));
      const dy = Math.abs(ev.clientY - Number(el.dataset.lastTapY || ev.clientY));
      el.dataset.lastTapTime = String(now);
      el.dataset.lastTapX = String(ev.clientX);
      el.dataset.lastTapY = String(ev.clientY);
      if (now - last < 360 && dx < 12 && dy < 12) {
        ev.preventDefault();
        ev.stopPropagation();
        v23ToggleTap(card);
      }
    });
  }

  return el;
}

function showOracle(card){}
function hideOracle(){}
function escapeHtml(str){ return String(str); }
function onCardDragMove(e){
  const drag = state.dragging;
  if(!drag || drag.type !== "card") return;
  const card = state.cards.find(c=>c.id===drag.cardId);
  if(!card) return;
  if(drag.group){
    const dx = e.clientX-drag.startX, dy = e.clientY-drag.startY;
    drag.group.forEach(g=>{
      const c = state.cards.find(x=>x.id===g.id);
      if(!c) return;
      c.x = g.x+dx; c.y = g.y+dy;
      const el = els.table.querySelector(`[data-card-id="${c.id}"]`);
      if(el){ el.style.left = `${c.x}px`; el.style.top = `${c.y}px`; }
    });
  } else {
    card.zone = "battlefield";
    card.x = e.clientX - drag.offsetX;
    card.y = e.clientY - drag.offsetY;
    const el = els.table.querySelector(`[data-card-id="${card.id}"]`);
    if(el){ el.style.left = `${card.x}px`; el.style.top = `${card.y}px`; el.style.zIndex = String(card.z||1); }
  }
  const targetHand = getHandDrop(e.clientY);
  els.p1HandZone.classList.toggle("drop-hover", targetHand === "p1");
  els.p2HandZone.classList.toggle("drop-hover", targetHand === "p2");
  const pile = getOverlappedPileZone(card);
  if(pile && kindOfZone(pile.dataset.zone) === "library") showDropHint("put on bottom", e.clientX + 10, e.clientY + 10);
  else hideDropHint();
}

function getHandDrop(y){
  if(y >= window.innerHeight - HAND_HEIGHT) return "p1";
  if(y <= HAND_HEIGHT) return "p2";
  return null;
}


function rectsOverlap(a,b){
  return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
}

function getCardDragRect(card){
  return { left: card.x, top: card.y, right: card.x + CARD_W, bottom: card.y + CARD_H };
}

function getOverlappedPileZone(card){
  const r = getCardDragRect(card);
  let best = null;
  document.querySelectorAll(".pile-zone").forEach(el=>{
    const b = el.getBoundingClientRect();
    if(rectsOverlap(r,b)) best = el;
  });
  return best;
}

let dropHintEl = null;
function showDropHint(text, x, y){
  if(!dropHintEl){
    dropHintEl = document.createElement("div");
    dropHintEl.className = "drop-hint";
    document.body.appendChild(dropHintEl);
  }
  dropHintEl.textContent = text;
  dropHintEl.style.left = x + "px";
  dropHintEl.style.top = y + "px";
  dropHintEl.style.display = "block";
}
function hideDropHint(){ if(dropHintEl) dropHintEl.style.display = "none"; }
function onCardDragEnd(e){
  document.removeEventListener("pointermove", onCardDragMove);
  els.p1HandZone.classList.remove("drop-hover");
  els.p2HandZone.classList.remove("drop-hover");
  const drag = state.dragging;
  const card = state.cards.find(c=>c.id===drag?.cardId);
  state.dragging = null;
  if(!card) return;
  const hand = getHandDrop(e.clientY);
  hideDropHint();
  if(hand){
    insertCardIntoHand(card, hand, e.clientX);
  } else {
    const overlapPile = getOverlappedPileZone(card);
    const dropZone = overlapPile || document.elementFromPoint(e.clientX,e.clientY)?.closest("[data-zone]");
    if(dropZone){
      const zone = dropZone.dataset.zone;
      const kind = kindOfZone(zone);
      if(kind === "library"){
        card.zone = zone;
        card.faceDown = false;
        state.cards = [card].concat(state.cards.filter(c=>c.id!==card.id));
      }
      if(kind === "graveyard" || kind === "exile") moveCardToPublicPile(card, zone);
      card.tapped = false;
    } else {
      card.zone = "battlefield";
    }
  }
  saveState();
  render();
}

function moveCardToPublicPile(card, zone){
  if(!card) return;
  if(card.token){
    state.cards = state.cards.filter(c=>c.id!==card.id);
    return;
  }

  // Graveyard and exile order matters: newest card must be the top card.
  // zoneCards() preserves state.cards order, and pile previews use .at(-1),
  // so moving to a public pile must remove the card from its old position
  // and append it to the end of state.cards.
  card.zone = zone;
  card.tapped = false;
  card.faceDown = false;
  bringCardToFront(card);
  state.cards = state.cards.filter(c => c.id !== card.id).concat(card);
}

function insertCardIntoHand(card, player, clientX){
  const zone = `${player}-hand`;
  const hand = zoneCards(zone).filter(c=>c.id!==card.id);
  const fan = player === "p1" ? els.p1HandFan : els.p2HandFan;
  const rect = fan.getBoundingClientRect();
  const ratio = Math.max(0, Math.min(1, (clientX-rect.left)/rect.width));
  const index = Math.round(ratio * hand.length);
  card.zone = zone;
  card.tapped = false;
  card.faceDown = false;
  const others = state.cards.filter(c=>c.zone!==zone && c.id!==card.id);
  hand.splice(index,0,card);
  state.cards = others.concat(hand);
}

function renderDice(){
  els.diceLayer.innerHTML = "";
  state.dice.forEach(die=>{
    const el = document.createElement("div");
    el.className = "die " + (die.kind === "life" ? "life-die" : "counter-die") + (state.selectedDieIds.includes(die.id) ? " selected" : "");
    el.dataset.dieId = die.id;
    el.style.left = `${die.x}px`; el.style.top = `${die.y}px`; el.style.background = die.color; el.style.zIndex = String(die.z||1000);
    for(const p of PIPS[die.value] || PIPS[1]){
      const pip = document.createElement("div"); pip.className = `pip p${p}`; el.appendChild(pip);
    }
    el.addEventListener("pointerdown",e=>startDieDrag(e,die));
    // dblclick handled globally in v19
    el.addEventListener("mouseenter",()=>state.hoveredDieId = die.id);
    el.addEventListener("mouseleave",()=>{ if(state.hoveredDieId === die.id) state.hoveredDieId = null; });
    el.addEventListener("contextmenu",e=>openDiceMenu(e,die));
    els.diceLayer.appendChild(el);
  });
}

function startDieDrag(e,die){
  if(e.button !== 0) return;
  closeMenus();
  if(!state.selectedDieIds.includes(die.id)) state.selectedDieIds = [die.id];
  const selected = state.dice.filter(d=>state.selectedDieIds.includes(d.id));
  const rect = e.currentTarget.getBoundingClientRect();
  bringDieToFront(die);
  state.dragging = { type:"die", dieId:die.id, offsetX:e.clientX-rect.left, offsetY:e.clientY-rect.top, startX:e.clientX, startY:e.clientY, group:selected.length>1 ? selected.map(d=>({id:d.id,x:d.x,y:d.y})) : null };
  e.currentTarget.setPointerCapture(e.pointerId);
  document.addEventListener("pointermove", onDieMove);
  document.addEventListener("pointerup", onDieEnd, {once:true});
}

function onDieMove(e){
  const drag = state.dragging;
  if(!drag || drag.type !== "die") return;
  if(drag.group){
    const dx=e.clientX-drag.startX, dy=e.clientY-drag.startY;
    drag.group.forEach(g=>{
      const d = state.dice.find(x=>x.id===g.id);
      if(!d) return;
      d.x = g.x+dx; d.y = g.y+dy;
      const el = els.diceLayer.querySelector(`[data-die-id="${d.id}"]`);
      if(el){ el.style.left=`${d.x}px`; el.style.top=`${d.y}px`; }
    });
  } else {
    const die = state.dice.find(d=>d.id===drag.dieId);
    if(!die) return;
    die.x = e.clientX-drag.offsetX; die.y = e.clientY-drag.offsetY;
    const el = els.diceLayer.querySelector(`[data-die-id="${die.id}"]`);
    if(el){ el.style.left=`${die.x}px`; el.style.top=`${die.y}px`; el.style.zIndex=String(die.z); }
  }
}
function onDieEnd(){ document.removeEventListener("pointermove", onDieMove); state.dragging = null; saveState(); }

function openLibrary(player){
  state.librarySearchPlayer = player;
  state.selectedLibraryCardId = null;
  renderLibraryGrid();
  els.libraryModal.classList.remove("hidden");
}

function closeLibrary(){
  els.libraryModal.classList.add("hidden");
}

function renderLibraryGrid(){
  els.libraryGrid.innerHTML = "";
  const groups = new Map();
  zoneCards(`${state.librarySearchPlayer}-library`).forEach(card=>{
    if(!groups.has(card.name)) groups.set(card.name, []);
    groups.get(card.name).push(card);
  });
  [...groups.entries()].sort((a,b)=>a[0].localeCompare(b[0])).forEach(([name,cards])=>{
    const top = cards[cards.length-1];
    const wrap = document.createElement("div");
    wrap.className = "library-card-wrap" + (state.selectedLibraryCardId === top.id ? " selected" : "");
    wrap.title = name;
    const img = document.createElement("img");
    img.className = "library-card"; img.src = top.image; img.draggable = false;
    wrap.appendChild(img);
    if(cards.length > 1){
      const badge = document.createElement("div"); badge.className = "card-count-badge"; badge.textContent = cards.length; wrap.appendChild(badge);
    }
    wrap.addEventListener("click",()=>{ state.selectedLibraryCardId = top.id; renderLibraryGrid(); });
    els.libraryGrid.appendChild(wrap);
  });
}

function takeSelectedLibraryCard(destination){
  const card = state.cards.find(c=>c.id===state.selectedLibraryCardId);
  if(!card) return;
  if(destination === "battlefield"){
    card.zone = "battlefield";
    card.x = innerWidth/2 - CARD_W/2;
    card.y = state.librarySearchPlayer === "p1" ? (innerHeight*0.68-CARD_H/2) : (innerHeight*0.28-CARD_H/2);
  } else {
    card.zone = `${state.librarySearchPlayer}-hand`;
  }
  card.faceDown = false;
  bringCardToFront(card);
  state.selectedLibraryCardId = null;
  closeLibrary();
}

function addToken(){
  renderTokenGrid();
  els.tokenModal.classList.remove("hidden");
}

function createToken(src, name){
  const p = state.activePlayer;
  state.cards.push({
    id:uid(),
    owner:p,
    zone:"battlefield",
    tapped:false,
    faceDown:false,
    x:innerWidth/2-CARD_W/2,
    y:p==="p1"?innerHeight*.68-CARD_H/2:innerHeight*.28-CARD_H/2,
    z:999,
    token:true,
    name,
    image:src,
    oracle:"",
    typeLine:"Token",
    manaCost:"",
    set:"token"
  });
  els.tokenModal.classList.add("hidden");
  saveState();
  render();
}

function renderTokenGrid(){
  els.tokenGrid.innerHTML = "";
  const setName = els.tokenSetSelect.value === "citadel" ? "citadel" : "aiie";
  TOKEN_NAMES.forEach(name=>{
    const src = tokenPath(setName, name);
    const wrap = document.createElement("div");
    wrap.className = "token-choice";
    const img = document.createElement("img");
    img.src = src;
    img.alt = name;
    img.onerror = () => { img.style.display = "none"; };
    const label = document.createElement("div");
    label.textContent = name;
    wrap.appendChild(img);
    wrap.appendChild(label);
    wrap.addEventListener("click",()=>createToken(src, name));
    els.tokenGrid.appendChild(wrap);
  });
}

function cloneToken(source){
  state.cards.push({ ...source, id:uid(), zone:"battlefield", tapped:false, faceDown:false, x:(source.x||200)+24, y:(source.y||120)+24, z:Math.max(0,...state.cards.map(c=>c.z||0))+1, token:true, name:`${source.name} clone` });
  saveState(); render();
}

function selectedDiceColorForNewDie(sourceDie){
  const selected = state.dice.filter(d=>state.selectedDieIds.includes(d.id));
  if(!selected.length) return sourceDie ? sourceDie.color : "#eeeeee";
  const colors = [...new Set(selected.map(d=>d.color))];
  return colors.length === 1 ? colors[0] : "#eeeeee";
}

function addDie(x, y, color="#79d45a"){
  const size = 38 * (state.zoom || 1);
  const finalX = Number.isFinite(x) ? x : (window.innerWidth / 2 - size / 2);
  const finalY = Number.isFinite(y) ? y : (window.innerHeight / 2 - size / 2);
  const topZ = Math.max(
    30000,
    ...state.dice.map(d => d.z || 1000),
    ...state.cards.map(c => c.z || 1)
  );

  state.dice.push({
    id: uid(),
    kind: "counter",
    owner: state.activePlayer,
    value: 3,
    x: finalX,
    y: finalY,
    color,
    z: topZ + 1
  });

  saveState();
  renderDice();
}

function openCardMenu(e,card){
  e.preventDefault();
  state.selectedCardId = card.id;
  if(!state.selectedCardIds.includes(card.id)) state.selectedCardIds = [card.id];
  els.cardMenu.style.left = `${e.clientX}px`; els.cardMenu.style.top = `${e.clientY}px`; els.cardMenu.style.display = "block";
  render();
}


function openDiceMenu(e,die){
  e.preventDefault();
  state.selectedDieId = die.id;
  if(!state.selectedDieIds.includes(die.id)) state.selectedDieIds = [die.id];
  els.dieColorBox.style.display = "none";
  els.diceMenu.style.left = `${e.clientX}px`; els.diceMenu.style.top = `${e.clientY}px`; els.diceMenu.style.display = "block";
  renderDice();
}

function closeMenus(){
  els.cardMenu.style.display = "none";
  els.diceMenu.style.display = "none";
}

els.cardMenu.addEventListener("click",e=>{
  const action = e.target.closest("button[data-card-action]")?.dataset.cardAction;
  if(!action) return;
  const card = state.cards.find(c=>c.id===state.selectedCardId);
  if(!card) return;
  const owner = card.owner || state.activePlayer;
  if(action === "library-top"){
    card.zone = `${owner}-library`; card.faceDown = false; state.cards = state.cards.filter(c=>c.id!==card.id).concat(card);
  } else if(action === "library-bottom"){
    card.zone = `${owner}-library`; card.faceDown = false; state.cards = [card].concat(state.cards.filter(c=>c.id!==card.id));
  } else if(action === "hand") {
    insertCardIntoHand(card, owner, innerWidth/2);
  } else if(action === "graveyard" || action === "exile") {
    moveCardToPublicPile(card, `${owner}-${action}`);
  } else if(action === "flip") {
    card.faceDown = !card.faceDown;
  } else if(action === "clone") {
    cloneToken(card);
  } else if(action === "front") {
    bringCardToFront(card);
  } else if(action === "back") {
    card.z = 1;
  } else {
    card.zone = "battlefield"; card.tapped = false;
  }
  closeMenus(); saveState(); render();
});


els.diceMenu.addEventListener("click",e=>{
  const die = state.dice.find(d=>d.id===state.selectedDieId);
  if(!die) return;
  const value = e.target.closest("button[data-die-value]")?.dataset.dieValue;
  const action = e.target.closest("button[data-die-action]")?.dataset.dieAction;
  if(value){
    const targets = state.selectedDieIds.length ? state.dice.filter(d=>state.selectedDieIds.includes(d.id)) : [die];
    targets.forEach(d=>d.value=Number(value));
    closeMenus(); saveState(); renderDice();
  }
  if(action === "add"){ addDie(die.x+44, die.y, selectedDiceColorForNewDie(die)); closeMenus(); }
  if(action === "color"){ els.dieColorBox.style.display = els.dieColorBox.style.display === "none" ? "block" : "none"; }
});

els.dieHue.addEventListener("input",()=>{
  const color = `hsl(${els.dieHue.value} 80% 70%)`;
  const targets = state.selectedDieIds.length ? state.dice.filter(d=>state.selectedDieIds.includes(d.id)) : state.dice.filter(d=>d.id===state.selectedDieId);
  targets.forEach(d=>d.color = color);
  saveState(); renderDice();
});

els.table.addEventListener("pointerdown",e=>{
  if(e.button !== 0 || e.target.closest(".card,.die,#menuWrap,.pile-zone")) return;
  state.selecting = { x0:e.clientX, y0:e.clientY };
  els.selectionBox.style.display = "block";
  document.addEventListener("pointermove", onSelectMove);
  document.addEventListener("pointerup", onSelectEnd, {once:true});
});

function onSelectMove(e){
  const s = state.selecting;
  if(!s) return;
  const x = Math.min(s.x0,e.clientX), y = Math.min(s.y0,e.clientY), w = Math.abs(e.clientX-s.x0), h = Math.abs(e.clientY-s.y0);
  Object.assign(els.selectionBox.style, {left:x+"px", top:y+"px", width:w+"px", height:h+"px"});
}

function onSelectEnd(){
  document.removeEventListener("pointermove", onSelectMove);
  const box = els.selectionBox.getBoundingClientRect();
  els.selectionBox.style.display = "none";
  state.selecting = null;
  state.selectedCardIds = zoneCards("battlefield").filter(c=>{
    const r = {left:c.x, top:c.y, right:c.x+CARD_W, bottom:c.y+CARD_H};
    return !(r.right<box.left || r.left>box.right || r.bottom<box.top || r.top>box.bottom);
  }).map(c=>c.id);
  state.selectedDieIds = state.dice.filter(d=>{
    const r = {left:d.x, top:d.y, right:d.x+38, bottom:d.y+38};
    return !(r.right<box.left || r.left>box.right || r.bottom<box.top || r.top>box.bottom);
  }).map(d=>d.id);
  render();
}

function updateDrawControls(){
  for(const p of ["p1","p2"]){
    const count = zoneCards(`${p}-library`).length;
    const max = Math.max(1,count);
    const slider = els[`${p}DrawAmountSlider`], label = els[`${p}DrawAmountLabel`];
    slider.max = String(max);
    if(Number(slider.value) > max) slider.value = String(max);
    label.textContent = slider.value;
  }
}

function showTurnNotice(text){
  els.turnNotice.textContent = text;
  els.turnNotice.style.display = "block";
  setTimeout(()=>els.turnNotice.style.display="none", 2500);
}

document.addEventListener("click",e=>{ if(!e.target.closest(".context-menu")) closeMenus(); });

els.menuBtn.addEventListener("click",e=>{ e.stopPropagation(); els.menuPanel.classList.toggle("open"); });


function startPileDrag(e, el){ return; }


function bindLibraryControls(){
  for(const p of ["p1","p2"]){
    els[`${p}DrawManyBtn`]?.addEventListener("click",()=>drawMany(p, Number(els[`${p}DrawAmountSlider`].value || 1)));
    els[`${p}TutorBtn`]?.addEventListener("click",()=>openLibrary(p));
    els[`${p}ShuffleBtn`]?.addEventListener("click",()=>shuffleLibrary(p));
    els[`${p}RevealBtn`]?.addEventListener("click",()=>{ state.revealedLibraryTop[p] = !state.revealedLibraryTop[p]; saveState(); render(); });
  }
}
bindLibraryControls();

document.getElementById("resetBtn")?.addEventListener("click", resetGame);
document.getElementById("newDeckBtn")?.addEventListener("click", newDeck);
document.getElementById("addTokenBtn")?.addEventListener("click", addToken);
document.getElementById("addDiceBtn")?.addEventListener("click", ()=>addDie(80, innerHeight-HAND_HEIGHT-50, "#79d45a"));
els.closeTokenBtn?.addEventListener("click",()=>els.tokenModal.classList.add("hidden"));
els.tokenSetSelect?.addEventListener("change",()=>{ if(!els.tokenModal.classList.contains("hidden")) renderTokenGrid(); });


els.closeImportBtn?.addEventListener("click",()=>els.importModal.classList.add("hidden"));
els.loadDeckBtn?.addEventListener("click", loadDeck);
els.closeLibraryBtn.addEventListener("click", closeLibrary);
els.libraryToHandBtn.addEventListener("click",()=>takeSelectedLibraryCard("hand"));
els.libraryToBattlefieldBtn.addEventListener("click",()=>takeSelectedLibraryCard("battlefield"));

els.modalCoreSetSelect.addEventListener("change",()=>{ state.coreSet = els.modalCoreSetSelect.value; saveState(); });
els.activePlayerSelect.addEventListener("change",()=>{ state.activePlayer = els.activePlayerSelect.value; saveState(); });
els.sleeveSelect.addEventListener("change",()=>{ state.sleeve = els.sleeveSelect.value; applySleeve(); saveState(); render(); });



function moveSelectedHandCard(dir){
  const id = state.selectedCardIds[0];
  if(!id) return;
  const card = state.cards.find(c=>c.id===id);
  if(!card || !card.zone.endsWith("-hand")) return;
  const zone = card.zone;
  const hand = zoneCards(zone);
  const oldIndex = hand.findIndex(c=>c.id===id);
  if(oldIndex < 0) return;
  const nextIndex = (oldIndex + dir + hand.length) % hand.length;
  hand.splice(oldIndex,1);
  hand.splice(nextIndex,0,card);
  const others = state.cards.filter(c=>c.zone!==zone);
  state.cards = others.concat(hand);
  saveState();
  render();
}

function setHoveredDieValue(n){
  const die = state.dice.find(d => d.id === state.hoveredDieId);
  if(!die) return false;
  die.value = n;
  saveState();
  renderDice();
  return true;
}

window.addEventListener("keydown",e=>{
  if(e.key === "Shift"){ state.shiftDown = true; }
  if(["1","2","3","4","5","6"].includes(e.key)){
    if(setHoveredDieValue(Number(e.key))) return;
  }
  if(e.key === "Escape"){ closeMenus(); document.getElementById("importModal")?.classList.add("hidden"); els.libraryModal.classList.add("hidden"); document.querySelectorAll(".draw-popover").forEach(p=>p.classList.add("hidden")); }
  if(e.key === "ArrowLeft") moveSelectedHandCard(-1);
  if(e.key === "ArrowRight") moveSelectedHandCard(1);
  if(e.key === "ArrowUp") setLife("p1", state.life.p1 + 1);
  if(e.key === "ArrowDown") setLife("p1", state.life.p1 - 1);
  if(e.key.toLowerCase() === "x") untapAllMine();
  if(e.key.toLowerCase() === "d") drawCard(state.activePlayer);
  if(e.key.toLowerCase() === "s") shuffleLibrary(state.activePlayer);
});

window.addEventListener("keyup",e=>{
  if(e.key === "Shift"){
    state.shiftDown = false;
    
    document.querySelectorAll(".draw-popover").forEach(p=>p.classList.add("hidden"));
  }
});


function parseDeckList(text){
  const sections={main:[],side:[]}; let current="main";
  text.split(/\r?\n/).map(l=>l.trim()).forEach(line=>{
    if(!line||line.startsWith("//")||line.startsWith("#"))return;
    if(line==="SIDEBOARD"){current="side";return;}
    const cleaned=line.replace(/^SB:\s*/i,"").replace(/\s+\([^)]+\)$/g,"").trim();
    const m=cleaned.match(/^(\d+)\s+(.+)$/); if(!m)return;
    sections[current].push({count:Number(m[1]),name:m[2].replace(/\s+\*.*$/,"").trim()});
  });
  return sections;
}

async function loadDeck(){
  const status = document.getElementById("importStatus");
  const deckInput = document.getElementById("deckInput");
  const modalCoreSetSelect = document.getElementById("modalCoreSetSelect");
  if(status) status.textContent = "Loading deck...";
  const parsed = parseDeckList(deckInput.value);
  const entries = Array.isArray(parsed) ? parsed : (parsed.main || []);
  const sideEntries = Array.isArray(parsed) ? [] : (parsed.side || []);
  if(!entries.length){if(status) status.textContent="No valid deck lines found."; return;}
  const player=state.activePlayer; state.coreSet=(modalCoreSetSelect ? modalCoreSetSelect.value : state.coreSet);
  document.body.classList.toggle("core-2ed", state.coreSet==="2ed");
  const unique=[...new Set(entries.concat(sideEntries).map(e=>e.name))], map=new Map();
  try{
    for(let i=0;i<unique.length;i++){if(status) status.textContent=`Loading ${i+1}/${unique.length}: ${unique[i]}`;map.set(unique[i],await fetchPreferredCard(unique[i],state.coreSet));}
    state.cards=state.cards.filter(c=>c.owner!==player);
    state.sideboardCards=(state.sideboardCards||[]).filter(c=>c.owner!==player);
    const newCards=[],sideCards=[];
    for(const e of entries){const data=map.get(e.name);for(let i=0;i<e.count;i++)newCards.push({id:uid(),owner:player,zone:`${player}-library`,tapped:false,faceDown:false,x:180,y:120,z:i,token:false,...data});}
    for(const e of sideEntries){const data=map.get(e.name);for(let i=0;i<e.count;i++)sideCards.push({id:uid(),owner:player,zone:"sideboard",tapped:false,faceDown:false,x:0,y:0,z:i,token:false,...data});}
    state.cards=state.cards.concat(shuffleArray(newCards)); state.sideboardCards=state.sideboardCards.concat(sideCards); state.mainboardSessionIds=null;
    saveState(); render(); document.getElementById("importModal")?.classList.add("hidden");
  }catch(err){if(status) status.textContent=err.message;}
}

function addToken(player=state.activePlayer){
  state.selectedToken=null; state.activePlayer=player; if(els.activePlayerSelect)els.activePlayerSelect.value=player;
  renderTokenGrid(); els.tokenModal.classList.remove("hidden");
}
function createToken(src,name,backSrc){
  const p=state.activePlayer;
  state.cards.push({id:uid(),owner:p,zone:"battlefield",tapped:false,faceDown:false,x:innerWidth/2-CARD_W/2,y:p==="p1"?innerHeight*.68-CARD_H/2:innerHeight*.28-CARD_H/2,z:999,token:true,tokenBack:backSrc,name,image:src,oracle:"",typeLine:"Token",manaCost:"",set:"token"});
  els.tokenModal.classList.add("hidden"); saveState(); render();
}
function getSelectedTokenSet(){const checked=document.querySelector('input[name="tokenSetRadio"]:checked');return checked?checked.value:"aiie";}
function renderTokenGrid(){
  els.tokenGrid.innerHTML=""; const setName=getSelectedTokenSet();
  TOKEN_NAMES.forEach(name=>{
    const prefix=setName==="citadel"?"c_":"", file=prefix+name.replaceAll(" ","-")+".png", src=`token/${file}`, backSrc=setName==="aiie"?"aieback.png":"c_back.png";
    const wrap=document.createElement("div"); wrap.className="token-choice"+(state.selectedToken&&state.selectedToken.src===src?" selected":"");
    const img=document.createElement("img"); img.src=src; img.alt=name; img.onerror=()=>{img.style.display="none";};
    const label=document.createElement("div"); label.textContent=name; wrap.appendChild(img); wrap.appendChild(label);
    wrap.addEventListener("click",()=>{state.selectedToken={src,name,backSrc};renderTokenGrid();});
    els.tokenGrid.appendChild(wrap);
  });
}

function cardGroups(cards){
  const groups=new Map();cards.forEach(card=>{if(!groups.has(card.name))groups.set(card.name,[]);groups.get(card.name).push(card);});
  return [...groups.entries()].sort((a,b)=>a[0].localeCompare(b[0]));
}
function openSideboardEditor(){
  if(!confirm("reset game and go to editor ?"))return;
  resetGameForSideboard(); renderSideboardEditor(); els.sideboardModal.classList.remove("hidden");
}
function resetGameForSideboard(){
  const p=state.activePlayer;
  state.cards=state.cards.filter(c=>c.owner!==p||!c.token).map(c=>c.owner===p?{...c,zone:`${p}-library`,tapped:false,faceDown:false}:c);
  saveState(); render();
}
function renderSideboardEditor(){
  const p=state.activePlayer; els.mainboardGrid.innerHTML=""; els.sideboardGrid.innerHTML="";
  const main=state.cards.filter(c=>c.owner===p&&c.zone===`${p}-library`&&!c.token);
  const side=(state.sideboardCards||[]).filter(c=>c.owner===p);
  for(const [name,cards] of cardGroups(main))els.mainboardGrid.appendChild(makeSideboardCard(cards.at(-1),cards.length,"main"));
  for(const [name,cards] of cardGroups(side))els.sideboardGrid.appendChild(makeSideboardCard(cards.at(-1),cards.length,"side"));
}
function makeSideboardCard(card,count,where){
  const wrap=document.createElement("div");wrap.className="sideboard-card";
  const img=document.createElement("img");img.src=card.image;img.alt=card.name;wrap.appendChild(img);
  if(count>1){const badge=document.createElement("div");badge.className="sideboard-count";badge.textContent=count;wrap.appendChild(badge);}
  wrap.addEventListener("click",()=>{where==="main"?moveOneToSide(card.name):moveOneToMain(card.name);renderSideboardEditor();});
  return wrap;
}
function moveOneToSide(name){
  const p=state.activePlayer, card=state.cards.find(c=>c.owner===p&&c.zone===`${p}-library`&&c.name===name); if(!card)return;
  state.cards=state.cards.filter(c=>c.id!==card.id); state.sideboardCards.push({...card,zone:"sideboard"}); saveState();
}
function moveOneToMain(name){
  const p=state.activePlayer, card=state.sideboardCards.find(c=>c.owner===p&&c.name===name); if(!card)return;
  state.sideboardCards=state.sideboardCards.filter(c=>c.id!==card.id); state.cards.push({...card,zone:`${p}-library`,tapped:false,faceDown:false}); saveState();
}
function finishSideboarding(){
  const p=state.activePlayer, others=state.cards.filter(c=>c.zone!==`${p}-library`), lib=shuffleArray(zoneCards(`${p}-library`));
  state.cards=others.concat(lib); els.sideboardModal.classList.add("hidden"); saveState(); render();
}


function bindV14Controls(){
  for(const p of ["p1","p2"]){
    els[`${p}DrawAmountSlider`]?.addEventListener("input",()=>{els[`${p}DrawAmountLabel`].textContent=els[`${p}DrawAmountSlider`].value;});
    els[`${p}AddTokenBtn`]?.addEventListener("click",()=>addToken(p));
    els[`${p}AddDiceBtn`]?.addEventListener("click",()=>addDie(80,innerHeight-HAND_HEIGHT-50,"#79d45a"));
  }
  els.closeTokenBtn?.addEventListener("click",()=>els.tokenModal.classList.add("hidden"));
  els.tokenToBattlefieldBtn?.addEventListener("click",()=>{if(state.selectedToken)createToken(state.selectedToken.src,state.selectedToken.name,state.selectedToken.backSrc);});
  document.querySelectorAll('input[name="tokenSetRadio"]').forEach(r=>r.addEventListener("change",()=>renderTokenGrid()));
  els.sideboardBtn?.addEventListener("click",openSideboardEditor);
  els.closeSideboardBtn?.addEventListener("click",()=>els.sideboardModal.classList.add("hidden"));
  els.sideboardReadyBtn?.addEventListener("click",finishSideboarding);
  els.hideSelectionCheck?.addEventListener("change",()=>{state.showSelection=!els.hideSelectionCheck.checked;document.body.classList.toggle("hide-selection",!state.showSelection);saveState();render();});
}
bindV14Controls();

if(!loadState()){
  state.life = { p1: 20, p2: 20 };
  state.dice = defaultDice();
  syncControls();
  applySleeve();
  applyV23Zoom();
  document.body.classList.toggle("hide-selection", !state.showSelection);
  if(els.hideSelectionCheck) els.hideSelectionCheck.checked = !state.showSelection;
}
render();




// v16 final hard bindings for import modal buttons.
window.addEventListener("DOMContentLoaded", () => {
  const loadBtn = document.getElementById("loadDeckBtn");
  const closeBtn = document.getElementById("closeImportBtn");
  const modal = document.getElementById("importModal");

  if (loadBtn) {
    loadBtn.onclick = async (e) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        await loadDeck();
      } catch (err) {
        const status = document.getElementById("importStatus");
        if (status) status.textContent = err && err.message ? err.message : String(err);
        console.error(err);
      }
    };
  }

  if (closeBtn) {
    closeBtn.onclick = (e) => {
      e.preventDefault();
      if (modal) modal.classList.add("hidden");
    };
  }
});


// v17 import modal hard fix: buttons must never submit/reload.
(() => {
  function bindImportButtons() {
    const loadBtn = document.getElementById("loadDeckBtn");
    const closeBtn = document.getElementById("closeImportBtn");
    const modal = document.getElementById("importModal");

    if (loadBtn) {
      loadBtn.setAttribute("type", "button");
      loadBtn.onclick = null;
      loadBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopImmediatePropagation();
        const status = document.getElementById("importStatus");
        if (status) status.textContent = "Loading deck...";
        try {
          await loadDeck();
        } catch (err) {
          console.error(err);
          if (status) status.textContent = err && err.message ? err.message : String(err);
        }
      }, true);
    }

    if (closeBtn) {
      closeBtn.setAttribute("type", "button");
      closeBtn.onclick = null;
      closeBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (modal) modal.classList.add("hidden");
      }, true);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindImportButtons);
  } else {
    bindImportButtons();
  }
})();


// v18 final import binding. Previous crash was from removed addTokenBtn/addDiceBtn listeners.
function bindImportButtonsV18() {
  const loadBtn = document.getElementById("loadDeckBtn");
  const closeBtn = document.getElementById("closeImportBtn");
  const modal = document.getElementById("importModal");

  if (loadBtn) {
    loadBtn.type = "button";
    loadBtn.onclick = async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const status = document.getElementById("importStatus");
      if (status) status.textContent = "Loading deck...";
      try {
        await loadDeck();
      } catch (err) {
        console.error(err);
        if (status) status.textContent = err?.message || String(err);
      }
    };
  }

  if (closeBtn) {
    closeBtn.type = "button";
    closeBtn.onclick = (e) => {
      e.preventDefault();
      if (modal) modal.classList.add("hidden");
    };
  }
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bindImportButtonsV18);
} else {
  bindImportButtonsV18();
}


// v20 zoom disabled by v21


// v22: double click token to spawn
document.addEventListener("dblclick", (e)=>{
  const el = e.target.closest(".token-choice");
  if(!el) return;
  const img = el.querySelector("img");
  const name = el.textContent.trim();
  if(!img || !img.src) return;
  e.preventDefault();
  e.stopPropagation();
  createToken(img.src, name, name.includes("camarid") ? "camarid.png" : img.src);
});


// v24: dragging from hand no longer mutates/reflows the hand until drop.
function v24HandIndex(zone, id){
  return state.cards.filter(c => c.zone === zone).findIndex(c => c.id === id);
}

function v24CreateGhost(card, x, y, offsetX, offsetY){
  const ghost = document.createElement("div");
  ghost.className = "drag-ghost";
  ghost.dataset.cardId = card.id;

  if(card.faceDown){
    const back = document.createElement("div");
    back.className = "card-back sleeve-back" + (state.sleeve === "transparent" ? " transparent-sleeve" : "");
    if(card.tokenBack){
      back.style.backgroundImage = `url(${card.tokenBack})`;
      back.style.backgroundSize = "cover";
      back.style.backgroundPosition = "center";
    }
    ghost.appendChild(back);
  } else {
    const img = document.createElement("img");
    img.src = card.image;
    img.alt = card.name;
    img.draggable = false;
    ghost.appendChild(img);
  }

  ghost.style.left = `${x - offsetX}px`;
  ghost.style.top = `${y - offsetY}px`;
  els.table.appendChild(ghost);
  return ghost;
}

function v24MoveGhost(drag, x, y){
  if(!drag.ghost) return;
  drag.ghost.style.left = `${x - drag.offsetX}px`;
  drag.ghost.style.top = `${y - drag.offsetY}px`;
}

function startCardDrag(e, card) {
  if (e.button !== 0) return;

  closeMenus();

  if (!state.selectedCardIds.includes(card.id)) {
    state.selectedCardIds = [card.id];
  }

  const selectedBattleCards = state.cards.filter(c => state.selectedCardIds.includes(c.id) && c.zone === "battlefield");
  const rect = e.currentTarget.getBoundingClientRect();
  const fromHand = card.zone && card.zone.endsWith("-hand");

  state.dragging = {
    type: "card",
    cardId: card.id,
    fromZone: card.zone,
    fromHand,
    originalHandIndex: fromHand ? v24HandIndex(card.zone, card.id) : -1,
    offsetX: e.clientX - rect.left,
    offsetY: e.clientY - rect.top,
    startX: e.clientX,
    startY: e.clientY,
    moved: false,
    ghost: fromHand ? v24CreateGhost(card, e.clientX, e.clientY, e.clientX - rect.left, e.clientY - rect.top) : null,
    hiddenFromHand: fromHand,
    group: selectedBattleCards.length > 1 ? selectedBattleCards.map(c => ({ id: c.id, x: c.x, y: c.y })) : null
  };

  bringCardToFront(card);
  e.currentTarget.setPointerCapture(e.pointerId);

  // Important: hand cards are NOT removed from hand here.
  if (!fromHand && card.zone !== "battlefield") {
    card.zone = "battlefield";
    card.x = e.clientX - state.dragging.offsetX;
    card.y = e.clientY - state.dragging.offsetY;
    render();
  }

  document.addEventListener("pointermove", onCardDragMove);
  document.addEventListener("pointerup", onCardDragEnd, { once: true });
}

function onCardDragMove(e) {
  window.__lastPointerX = e.clientX;
  const drag = state.dragging;
  if (!drag || drag.type !== "card") return;

  const card = state.cards.find(c => c.id === drag.cardId);
  if (!card) return;

  drag.moved = true;

  if (drag.fromHand) {
    v24MoveGhost(drag, e.clientX, e.clientY);
  } else if (drag.group) {
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;

    drag.group.forEach(g => {
      const c = state.cards.find(x => x.id === g.id);
      if (!c) return;
      c.x = g.x + dx;
      c.y = g.y + dy;
      const el = els.table.querySelector(`[data-card-id="${c.id}"]`);
      if (el) {
        el.style.left = `${c.x}px`;
        el.style.top = `${c.y}px`;
      }
    });
  } else {
    card.zone = "battlefield";
    card.x = e.clientX - drag.offsetX;
    card.y = e.clientY - drag.offsetY;

    const el = els.table.querySelector(`[data-card-id="${card.id}"]`);
    if (el) {
      el.style.left = `${card.x}px`;
      el.style.top = `${card.y}px`;
      el.style.zIndex = String(card.z || 1);
    }
  }

  const targetHand = getHandDrop(e.clientY, e.clientX);
  els.p1HandZone.classList.toggle("drop-hover", targetHand === "p1");
  els.p2HandZone.classList.toggle("drop-hover", targetHand === "p2");

  const tempRectCard = drag.fromHand
    ? { ...card, x: e.clientX - drag.offsetX, y: e.clientY - drag.offsetY }
    : card;

  const pile = getOverlappedPileZone(tempRectCard);
  if (pile && kindOfZone(pile.dataset.zone) === "library") showDropHint("put on bottom", e.clientX + 10, e.clientY + 10);
  else hideDropHint();
}

function onCardDragEnd(e) {
  document.removeEventListener("pointermove", onCardDragMove);
  els.p1HandZone.classList.remove("drop-hover");
  els.p2HandZone.classList.remove("drop-hover");

  const drag = state.dragging;
  const card = state.cards.find(c => c.id === drag?.cardId);
  state.dragging = null;
  hideDropHint();

  if (!card) {
    if (drag?.ghost) drag.ghost.remove();
    return;
  }

  const movedDistance = Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY);

  if (drag.ghost) drag.ghost.remove();

  // Simple click from hand: do absolutely nothing.
  if (drag.fromHand && movedDistance < 6) {
    card.zone = drag.fromZone;
    saveState();
    render();
    return;
  }

  const hand = getHandDrop(e.clientY, e.clientX);

  if (hand) {
    if (drag.fromHand) {
      // Returning a hand card to hand: exact original position.
      card.zone = drag.fromZone;
      const handCards = state.cards.filter(c => c.zone === drag.fromZone && c.id !== card.id);
      const others = state.cards.filter(c => c.zone !== drag.fromZone && c.id !== card.id);
      const idx = Math.max(0, Math.min(drag.originalHandIndex, handCards.length));
      handCards.splice(idx, 0, card);
      state.cards = others.concat(handCards);
    } else {
      // Battlefield/public-zone card returning to hand: rightmost.
      card.zone = `${hand}-hand`;
      card.tapped = false;
      card.faceDown = false;
      const others = state.cards.filter(c => !(c.zone === `${hand}-hand`) && c.id !== card.id);
      const handCards = state.cards.filter(c => c.zone === `${hand}-hand` && c.id !== card.id);
      handCards.push(card);
      state.cards = others.concat(handCards);
    }
  } else {
    const ghostCard = { ...card, x: e.clientX - drag.offsetX, y: e.clientY - drag.offsetY };
    const overlapPile = getOverlappedPileZone(ghostCard);
    const dropZone = overlapPile || document.elementFromPoint(e.clientX, e.clientY)?.closest("[data-zone]");

    if (dropZone) {
      const zone = dropZone.dataset.zone;
      const kind = kindOfZone(zone);
      if (kind === "library") {
        card.zone = zone;
        card.faceDown = false;
        state.cards = [card].concat(state.cards.filter(c => c.id !== card.id));
      } else if (kind === "graveyard" || kind === "exile") {
        moveCardToPublicPile(card, zone);
      } else {
        card.zone = "battlefield";
        card.x = e.clientX - drag.offsetX;
        card.y = e.clientY - drag.offsetY;
      }
      card.tapped = false;
    } else {
      card.zone = "battlefield";
      card.x = e.clientX - drag.offsetX;
      card.y = e.clientY - drag.offsetY;
    }
  }

  saveState();
  render();
}

// v25 hide original hand card during drag
document.addEventListener("pointerdown",(e)=>{
  const el = e.target.closest(".card");
  if(!el) return;
  const id = el.dataset.cardId;
  const card = state.cards.find(c=>c.id===id);
  if(card && card.zone && card.zone.endsWith("-hand")){
    el.style.visibility = "hidden";
  }
}, true);

document.addEventListener("pointerup",(e)=>{
  document.querySelectorAll('.card').forEach(c=>c.style.visibility="");
}, true);

// v25 token dblclick fix
document.addEventListener("dblclick",(e)=>{
  const t = e.target.closest(".token-choice");
  if(!t) return;
  const img = t.querySelector("img");
  if(!img) return;
  e.preventDefault();
  createToken(img.src, t.textContent.trim(), img.src);
}, true);

// v28: fix tapping, pile drops, grave/exile stacks, shuffle animation, fixed life dice.

function v28DeckMetrics(player){
  const cardW = Math.max(128, Math.min(window.innerWidth * 0.074, 168));
  const gap = Math.max(10, Math.min(window.innerWidth * 0.01, 18));
  const pad = Math.max(16, Math.min(window.innerWidth * 0.016, 30));
  const groupW = cardW * 2 + gap;
  const groupLeft = player === "p1" ? window.innerWidth - pad - groupW : pad;
  const groupTop = player === "p1" ? window.innerHeight - 28 - (cardW * 1.397 * 2 + gap + 32) : 28;
  return {cardW, gap, pad, groupW, groupLeft, groupTop};
}

function makeLifeDice(player, life){
  const m = v28DeckMetrics(player);
  const startX = m.groupLeft; // left edge aligned to graveyard/deck-menu left edge
  const startY = player === "p1"
    ? Math.max(window.innerHeight / 2 + 10, m.groupTop - 48)
    : Math.min(window.innerHeight / 2 - 52, m.groupTop + m.cardW * 1.397 * 2 + m.gap + 40);

  const values = [];
  let rest = Math.max(1, life);
  while(rest > 0){
    values.push(Math.min(5, rest));
    rest -= 5;
  }

  return values.map((value, i)=>({
    id: uid(),
    kind: "life",
    owner: player,
    value,
    x: startX + i * 44, // tight row, room for more dice
    y: startY,
    color: "#eeeeee",
    z: 1000 + i
  }));
}

function syncLifeDice(player){
  state.dice = state.dice.filter(d => !(d.kind === "life" && d.owner === player)).concat(makeLifeDice(player, state.life[player]));
}

function defaultDice(){
  return makeLifeDice("p1", 20).concat(makeLifeDice("p2", 20));
}

// Life dice are not draggable. Counter dice still are.
const v28OldStartDieDrag = startDieDrag;
startDieDrag = function(e, die){
  if(die.kind === "life") {
    if(e.button === 0) return;
  }
  return v28OldStartDieDrag(e, die);
};

// exact card rect, independent of hand-zone detection
function v28CardRectFromPointer(card, drag, e){
  return {
    left: e.clientX - drag.offsetX,
    top: e.clientY - drag.offsetY,
    right: e.clientX - drag.offsetX + CARD_W,
    bottom: e.clientY - drag.offsetY + CARD_H
  };
}

function v28PileUnderDraggedCard(card, drag, e){
  const r = v28CardRectFromPointer(card, drag, e);
  let best = null;
  document.querySelectorAll(".pile-zone").forEach(el=>{
    const b = el.getBoundingClientRect();
    const overlaps = !(r.right < b.left || r.left > b.right || r.bottom < b.top || r.top > b.bottom);
    if(overlaps) best = el;
  });
  return best;
}

// Override drop priority: piles win over hand. This fixes grave/exile going to hand.
const v28OldOnCardDragEnd = onCardDragEnd;
onCardDragEnd = function(e){
  document.removeEventListener("pointermove", onCardDragMove);
  els.p1HandZone.classList.remove("drop-hover");
  els.p2HandZone.classList.remove("drop-hover");

  const drag = state.dragging;
  const card = state.cards.find(c => c.id === drag?.cardId);
  state.dragging = null;
  hideDropHint();

  if(!card){
    if(drag?.ghost) drag.ghost.remove();
    return;
  }

  const movedDistance = Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY);
  if(drag.ghost) drag.ghost.remove();

  if(drag.fromHand && movedDistance < 6){
    card.zone = drag.fromZone;
    saveState();
    render();
    return;
  }

  const pile = v28PileUnderDraggedCard(card, drag, e);
  if(pile){
    const zone = pile.dataset.zone;
    const kind = kindOfZone(zone);
    if(kind === "library"){
      card.zone = zone;
      card.faceDown = false;
      card.tapped = false;
      state.cards = [card].concat(state.cards.filter(c => c.id !== card.id)); // bottom
    } else if(kind === "graveyard" || kind === "exile"){
      moveCardToPublicPile(card, zone);
      card.tapped = false;
    }
    saveState();
    render();
    return;
  }

  const hand = getHandDrop(e.clientY, e.clientX);
  if(hand){
    if(drag.fromHand){
      card.zone = drag.fromZone;
      const handCards = state.cards.filter(c => c.zone === drag.fromZone && c.id !== card.id);
      const others = state.cards.filter(c => c.zone !== drag.fromZone && c.id !== card.id);
      const idx = Math.max(0, Math.min(drag.originalHandIndex, handCards.length));
      handCards.splice(idx, 0, card);
      state.cards = others.concat(handCards);
    } else {
      const zone = `${hand}-hand`;
      card.zone = zone;
      card.tapped = false;
      card.faceDown = false;
      const others = state.cards.filter(c => !(c.zone === zone) && c.id !== card.id);
      const handCards = state.cards.filter(c => c.zone === zone && c.id !== card.id);
      handCards.push(card);
      state.cards = others.concat(handCards);
    }
  } else {
    card.zone = "battlefield";
    card.x = e.clientX - drag.offsetX;
    card.y = e.clientY - drag.offsetY;
  }

  saveState();
  render();
};

// Stack expansion for graveyard/exile. Click pile => stack, cards draggable from stack.
function v28RenderExpandedPile(){
  document.querySelectorAll(".expanded-stack").forEach(el=>el.remove());
  if(!state.expandedPile) return;

  const [player, kind] = state.expandedPile.split("-");
  const pileEl = els[`${player}${cap(kind)}Zone`];
  if(!pileEl) return;

  const cards = zoneCards(state.expandedPile);
  if(!cards.length) return;

  const stack = document.createElement("div");
  stack.className = "expanded-stack";
  stack.style.height = `${CARD_H + Math.max(0,cards.length-1)*28}px`;

  // newest/top card is lowest/front, older cards step upward behind it
  [...cards].reverse().forEach((card, index)=>{
    const c = document.createElement("div");
    c.className = "stack-card";
    c.dataset.cardId = card.id;
    c.style.bottom = `${index*28}px`;
    c.style.zIndex = String(200-index);
    c.title = card.name;

    const img = document.createElement("img");
    img.src = card.image;
    img.draggable = false;
    c.appendChild(img);

    c.addEventListener("mouseenter",()=>showOracle(card));
    c.addEventListener("mouseleave",hideOracle);
    c.addEventListener("contextmenu",e=>openCardMenu(e,card));
    c.addEventListener("pointerdown",e=>startCardDrag(e,card));

    stack.appendChild(c);
  });

  pileEl.appendChild(stack);
}

renderExpandedPile = v28RenderExpandedPile;

// Click handlers for piles can be lost in prior overrides; bind again.
for(const p of ["p1","p2"]){
  for(const kind of ["graveyard","exile"]){
    const el = els[`${p}${cap(kind)}Zone`];
    if(!el) continue;
    el.addEventListener("click", (e)=>{
      if(e.target.closest(".expanded-stack")) return;
      state.expandedPile = state.expandedPile === `${p}-${kind}` ? null : `${p}-${kind}`;
      saveState();
      render();
    }, true);
  }
}

// Shuffle animation
const v28OldShuffleLibrary = shuffleLibrary;
shuffleLibrary = function(player){
  const el = els[`${player}LibraryZone`];
  if(el){
    el.classList.remove("shuffling");
    void el.offsetWidth;
    el.classList.add("shuffling");
    setTimeout(()=>el.classList.remove("shuffling"), 800);
  }
  return v28OldShuffleLibrary(player);
};




// v29 single tap system. No browser dblclick. No drag on the second click.
(function(){
  let last = { id: null, t: 0, x: 0, y: 0 };

  function ownBattleCardFromEvent(e){
    const el = e.target && e.target.closest ? e.target.closest(".battle-card") : null;
    if(!el) return null;
    const card = state.cards.find(c => c.id === el.dataset.cardId);
    if(!card) return null;
    if(card.zone !== "battlefield") return null;
    if((card.owner || "p1") !== "p1") return null;
    return { el, card };
  }

  function setBattleTransform(el, card){
    const base = card.owner === "p2" ? 180 : 0;
    el.style.transformOrigin = "0% 100%";
    if(card.tapped){
      el.style.transform = `translateY(calc(-1 * (var(--card-h) - var(--card-w)))) rotate(${base + 90}deg)`;
    } else {
      el.style.transform = `rotate(${base}deg)`;
    }
  }

  window.v29ApplyBattleTransforms = function(){
    document.querySelectorAll(".battle-card").forEach(el=>{
      const card = state.cards.find(c => c.id === el.dataset.cardId);
      if(card) setBattleTransform(el, card);
    });
  };

  document.addEventListener("pointerdown", (e)=>{
    if(e.button !== 0) return;
    const hit = ownBattleCardFromEvent(e);
    if(!hit) return;

    const now = performance.now();
    const same = last.id === hit.card.id;
    const fast = now - last.t < 420;
    const near = Math.abs(e.clientX - last.x) < 18 && Math.abs(e.clientY - last.y) < 18;

    if(same && fast && near){
      e.preventDefault();
      e.stopImmediatePropagation();   // prevents drag handler from starting
      hit.card.tapped = !hit.card.tapped;
      last = { id: null, t: 0, x: 0, y: 0 };
      saveState();
      render();
      return;
    }

    last = { id: hit.card.id, t: now, x: e.clientX, y: e.clientY };
  }, true);

  document.addEventListener("keydown", (e)=>{
    if(e.key && e.key.toLowerCase() === "x"){
      let changed = false;
      state.cards.forEach(c=>{
        if(c.zone === "battlefield" && (c.owner || "p1") === "p1" && c.tapped){
          c.tapped = false;
          changed = true;
        }
      });
      if(changed){
        e.preventDefault();
        e.stopImmediatePropagation();
        saveState();
        render();
      }
    }
  }, true);

  const oldRender = render;
  render = function(){
    oldRender();
    window.v29ApplyBattleTransforms();
  };
})();


// v31: prevent plain clicks from rewriting x/y.
// This stops tapped cards from jumping downward after single clicks.
(function(){
  const oldOnCardDragEnd = onCardDragEnd;

  onCardDragEnd = function(e){
    const drag = state.dragging;
    const card = state.cards.find(c => c.id === drag?.cardId);

    if(drag && card){
      const movedDistance = Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY);

      if(movedDistance < 6){
        document.removeEventListener("pointermove", onCardDragMove);
        els.p1HandZone.classList.remove("drop-hover");
        els.p2HandZone.classList.remove("drop-hover");
        hideDropHint();

        if(drag.ghost) drag.ghost.remove();

        // restore exact original zone and position; do not recalculate from mouse
        card.zone = drag.fromZone;
        if(typeof drag.originalX === "number") card.x = drag.originalX;
        if(typeof drag.originalY === "number") card.y = drag.originalY;

        state.dragging = null;
        saveState();
        render();
        return;
      }
    }

    return oldOnCardDragEnd(e);
  };

  const oldStartCardDrag = startCardDrag;
  startCardDrag = function(e, card){
    oldStartCardDrag(e, card);
    if(state.dragging && state.dragging.cardId === card.id){
      state.dragging.originalX = card.x;
      state.dragging.originalY = card.y;
    }
  };
})();


// v33 exact tap geometry.
// Desired: when tapped, the old bottom-right corner lands exactly where old bottom-left was.
// For p1 cards: using top-left origin, rotate 90deg clockwise, then translate by (H, H - W).
(function(){
  function applyV33TapTransforms(){
    document.querySelectorAll(".battle-card").forEach(el=>{
      const card = state.cards.find(c => c.id === el.dataset.cardId);
      if(!card) return;

      const w = el.offsetWidth;
      const h = el.offsetHeight;
      const base = card.owner === "p2" ? 180 : 0;

      el.style.transformOrigin = "0 0";

      if(card.tapped && (card.owner || "p1") === "p1"){
        el.style.transform = `translate(${h}px, ${h - w}px) rotate(90deg)`;
      } else {
        el.style.transform = `rotate(${base}deg)`;
      }
    });
  }

  const previousRender = render;
  render = function(){
    previousRender();
    requestAnimationFrame(applyV33TapTransforms);
  };

  document.addEventListener("keydown", (e)=>{
    if(e.key && e.key.toLowerCase() === "x"){
      let changed = false;
      state.cards.forEach(c=>{
        if(c.zone === "battlefield" && (c.owner || "p1") === "p1" && c.tapped){
          c.tapped = false;
          changed = true;
        }
      });
      if(changed){
        e.preventDefault();
        e.stopImmediatePropagation();
        saveState();
        render();
      }
    }
  }, true);
})();


// v34: keep v33 tap geometry untouched; add group tap, tapped-card drag fix, dice spacing, send-to-back safety.
(function(){
  // 1) Group tap: same v33 geometry, but selected cards tap together.
  function selectedOwnBattlefieldCards(){
    if(!state.selectedCardIds || state.selectedCardIds.length < 2) return [];
    return state.cards.filter(c =>
      state.selectedCardIds.includes(c.id) &&
      c.zone === "battlefield" &&
      (c.owner || "p1") === "p1"
    );
  }

  document.addEventListener("pointerdown", (e)=>{
    if(e.button !== 0) return;
    const el = e.target && e.target.closest ? e.target.closest(".battle-card") : null;
    if(!el) return;
    const card = state.cards.find(c => c.id === el.dataset.cardId);
    if(!card || card.zone !== "battlefield" || (card.owner || "p1") !== "p1") return;

    const now = performance.now();
    const key = "__v34Tap";
    const last = window[key] || { id:null, t:0, x:0, y:0 };
    const same = last.id === card.id;
    const fast = now - last.t < 420;
    const near = Math.abs(e.clientX - last.x) < 18 && Math.abs(e.clientY - last.y) < 18;

    if(same && fast && near){
      e.preventDefault();
      e.stopImmediatePropagation();

      const group = selectedOwnBattlefieldCards();
      if(group.length > 1 && group.some(c => c.id === card.id)){
        const next = !card.tapped;
        group.forEach(c => c.tapped = next);
      } else {
        card.tapped = !card.tapped;
      }

      window[key] = { id:null, t:0, x:0, y:0 };
      saveState();
      render();
      return;
    }

    window[key] = { id:card.id, t:now, x:e.clientX, y:e.clientY };
  }, true);

  // 2) Tapped-card drag fix:
  // The old code measured offset from getBoundingClientRect(), which is wrong after transform.
  // For battlefield cards use stored card.x/y so a tapped card does not jump when picked up.
  const oldStartCardDrag = startCardDrag;
  startCardDrag = function(e, card){
    oldStartCardDrag(e, card);
    if(state.dragging && state.dragging.cardId === card.id && card.zone === "battlefield"){
      state.dragging.offsetX = e.clientX - (card.x || 0);
      state.dragging.offsetY = e.clientY - (card.y || 0);
      state.dragging.originalX = card.x || 0;
      state.dragging.originalY = card.y || 0;
    }
  };

  // 3) Send-to-back safety:
  // Never allow negative z-index; playmat/background must stay behind cards.
  const oldRender = render;
  render = function(){
    oldRender();
    document.querySelectorAll(".card").forEach(el=>{
      const card = state.cards.find(c => c.id === el.dataset.cardId);
      if(!card) return;
      el.style.zIndex = String(Math.max(card.z || 0, 1));
    });
  };

  // 4) If any old menu action has set card.z negative, normalize it.
  window.v34NormalizeZ = function(){
    state.cards.forEach(c => {
      if((c.z || 0) < 1) c.z = 1;
    });
  };
})();


// v35 feature patch: opponent dice mirror, hand fan slider, token fan, zoom fix, sideboard stacks, shuffle visual.
(function(){
  // Zoom actually applies through CSS variables.
  function applyV35Zoom(){
    document.documentElement.style.setProperty("--hand-zoom", String(state.handZoom || 1));
    document.documentElement.style.setProperty("--battlefield-zoom", String(state.battlefieldZoom || 1));
  }
  window.applyV35Zoom = applyV35Zoom;

  els.handZoomSlider?.addEventListener("input",()=>{
    state.handZoom = Number(els.handZoomSlider.value) / 100;
    applyV35Zoom();
    saveState();
    render();
  });

  els.battlefieldZoomSlider?.addEventListener("input",()=>{
    state.battlefieldZoom = Number(els.battlefieldZoomSlider.value) / 100;
    applyV35Zoom();
    saveState();
    render();
  });

  // Hand fan slider: changes curve, width, and which side is visually on top.
  function renderHand(player, fan){
    fan.innerHTML = "";
    const hand = zoneCards(`${player}-hand`);
    const count = hand.length;
    const slider = Number(state.handFan?.[player] || 0);
    const amount = slider / 100;
    const spreadBase = Math.min(54, 760 / Math.max(1,count));
    const spread = spreadBase * (1 + Math.abs(amount) * 0.55);
    const start = -((count-1)*spread)/2;
    const center = (count-1)/2;
    const zLeftOnTop = amount < 0;

    hand.forEach((card,index)=>{
      const el = createCardElement(card, "hand-card");
      const rel = index-center;
      const x = start + index*spread;
      const fanTilt = amount * 9;
      const angle = rel * (4.6 + Math.abs(amount)*3.5) + fanTilt;
      const arc = Math.pow(rel,2) * (2.2 + Math.abs(amount)*1.8);
      const raise = 18 - arc + Math.abs(amount)*8;
      el.style.left = `calc(50% + ${x}px - var(--card-w) / 2)`;
      el.style.bottom = `${Math.max(-12, raise)}px`;
      el.style.transform = `rotate(${angle}deg)`;
      el.style.zIndex = String(100 + (zLeftOnTop ? count-index : index));
      fan.appendChild(el);
    });
  }
  window.renderHand = renderHand;

  for(const p of ["p1","p2"]){
    els[`${p}HandFanSlider`]?.addEventListener("input",()=>{
      if(!state.handFan) state.handFan = {p1:0,p2:0};
      state.handFan[p] = Number(els[`${p}HandFanSlider`].value);
      saveState();
      render();
    });
  }

  // Life dice: opponent uses same relation to own deck area, mirrored by opponent-piles rotation.
  function makeLifeDice(player, life){
    const cardW = Math.max(128, Math.min(window.innerWidth * 0.074, 168));
    const gap = Math.max(10, Math.min(window.innerWidth * 0.01, 18));
    const pad = Math.max(16, Math.min(window.innerWidth * 0.016, 30));
    const groupW = cardW * 2 + gap;
    const groupLeft = player === "p1" ? window.innerWidth - pad - groupW : pad;
    const groupTop = player === "p1" ? window.innerHeight - 28 - (cardW * 1.397 * 2 + gap + 32) : 28;

    const startX = groupLeft;
    const startY = player === "p1"
      ? Math.max(window.innerHeight / 2 + 10, groupTop - 48)
      : groupTop + cardW * 1.397 * 2 + gap + 40;

    const values = [];
    let rest = Math.max(1, life);
    while(rest > 0){
      values.push(Math.min(5, rest));
      rest -= 5;
    }
    return values.map((value, i)=>({
      id: uid(),
      kind: "life",
      owner: player,
      value,
      x: startX + i * 44,
      y: startY,
      color: "#eeeeee",
      z: 1000 + i
    }));
  }
  window.makeLifeDice = makeLifeDice;
  syncLifeDice = function(player){
    state.dice = state.dice.filter(d => !(d.kind === "life" && d.owner === player)).concat(makeLifeDice(player, state.life[player]));
  };
  defaultDice = function(){
    return makeLifeDice("p1", 20).concat(makeLifeDice("p2", 20));
  };

  // Token fan opened from green menu. Drag or double-click tokens.
  els.menuAddTokenBtn?.addEventListener("click",()=>{
    addToken(state.activePlayer);
    els.tokenModal.classList.add("token-fan-mode");
  });

  const oldAddToken = addToken;
  addToken = function(player = state.activePlayer){
    state.selectedToken = null;
    state.activePlayer = player;
    if(els.activePlayerSelect) els.activePlayerSelect.value = player;
    renderTokenGrid();
    els.tokenModal.classList.remove("hidden");
  };

  document.addEventListener("pointerdown",(e)=>{
    const choice = e.target.closest(".token-choice");
    if(!choice) return;
    const img = choice.querySelector("img");
    if(!img || !img.src) return;
    const name = choice.textContent.trim();
    const backSrc = getSelectedTokenSet && getSelectedTokenSet() === "aiie" ? "aieback.png" : "c_back.png";
    const ghost = document.createElement("img");
    ghost.src = img.src;
    ghost.className = "drag-ghost";
    ghost.style.left = `${e.clientX - 40}px`;
    ghost.style.top = `${e.clientY - 55}px`;
    els.table.appendChild(ghost);

    function move(ev){
      ghost.style.left = `${ev.clientX - 40}px`;
      ghost.style.top = `${ev.clientY - 55}px`;
    }
    function up(ev){
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", up);
      ghost.remove();
      const p = state.activePlayer;
      state.cards.push({
        id:uid(), owner:p, zone:"battlefield", tapped:false, faceDown:false,
        x:ev.clientX - CARD_W/2, y:ev.clientY - CARD_H/2, z:999,
        token:true, tokenBack:backSrc, name, image:img.src, oracle:"", typeLine:"Token", manaCost:"", set:"token"
      });
      els.tokenModal.classList.add("hidden");
      saveState(); render();
    }
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", up);
  }, true);

  // Shuffle only library visual
  const oldShuffle = shuffleLibrary;
  shuffleLibrary = function(player){
    const visual = els[`${player}LibraryVisual`];
    if(visual){
      visual.classList.remove("shuffling");
      void visual.offsetWidth;
      visual.classList.add("shuffling");
      setTimeout(()=>visual.classList.remove("shuffling"), 1050);
    }
    return oldShuffle(player);
  };

  // Sideboard stacked visible cards, counts, ready top.
  function total(cards){ return cards.length; }

  renderSideboardEditor = function(){
    const p = state.activePlayer;
    els.mainboardGrid.innerHTML = "";
    els.sideboardGrid.innerHTML = "";

    const main = state.cards.filter(c=>c.owner===p && c.zone===`${p}-library` && !c.token);
    const side = (state.sideboardCards || []).filter(c=>c.owner===p);

    if(els.mainboardCount) els.mainboardCount.textContent = main.length;
    if(els.sideboardCount) els.sideboardCount.textContent = side.length;

    renderSideStack(els.mainboardGrid, main, "main");
    renderSideStack(els.sideboardGrid, side, "side");
  };

  function renderSideStack(container, cards, where){
    const columns = Math.max(1, Math.floor(container.clientWidth / 138));
    const stepY = 24;
    cards.forEach((card, i)=>{
      const el = document.createElement("div");
      el.className = "sideboard-stack-card";
      el.dataset.cardId = card.id;
      const col = i % columns;
      const row = Math.floor(i / columns);
      el.style.left = `${col * 138}px`;
      el.style.top = `${row * (168 + 20) + (i % columns)*0}px`;
      el.style.zIndex = String(100+i);
      const img = document.createElement("img");
      img.src = card.image;
      img.draggable = false;
      el.appendChild(img);
      el.addEventListener("dblclick",()=>{
        where === "main" ? moveOneToSide(card.name) : moveOneToMain(card.name);
        renderSideboardEditor();
      });
      container.appendChild(el);
    });
    container.style.minHeight = `${Math.ceil(cards.length / Math.max(1, columns)) * 210 + 80}px`;
  }

  // Make old single-card move-by-name still work with stacks.
  const oldRender = render;
  render = function(){
    oldRender();
    applyV35Zoom();
  };
  applyV35Zoom();
})();


// v36: movable hand + four vertical sliders beside menu.
(function(){
  function applyV36Zoom(){
    document.documentElement.style.setProperty("--hand-zoom", String(state.handZoom || 1));
    document.documentElement.style.setProperty("--battlefield-zoom", String(state.battlefieldZoom || 1));
  }

  function applyHandPosition(){
    const pos = state.handPosition?.p1;
    if(pos){
      document.documentElement.style.setProperty("--p1-hand-left", `${pos.x}px`);
      document.documentElement.style.setProperty("--p1-hand-top", `${pos.y}px`);
      document.documentElement.style.setProperty("--p1-hand-bottom", "auto");
    } else {
      document.documentElement.style.setProperty("--p1-hand-left", "50%");
      document.documentElement.style.setProperty("--p1-hand-top", "auto");
      document.documentElement.style.setProperty("--p1-hand-bottom", "0px");
    }
  }

  // New renderHand: fan controls spread from almost-stacked to very spread.
  renderHand = function(player, fan){
    fan.innerHTML = "";
    const hand = zoneCards(`${player}-hand`);
    const count = hand.length;
    const fanValue = player === "p1" ? Number(state.handFan?.p1 || 0) : 0;
    const depthValue = player === "p1" ? Number(state.handDepth?.p1 || 0) : 0;

    // -100 = almost pile, +100 = open fan
    const t = (fanValue + 100) / 200;
    const spread = (10 + t * 62) * Math.min(1, 10 / Math.max(1, count));
    const curve = 0.8 + t * 5.0;
    const angleScale = 1.2 + t * 6.2;

    const start = -((count - 1) * spread) / 2;
    const center = (count - 1) / 2;
    const depthBias = depthValue / 100;

    hand.forEach((card, index)=>{
      const el = createCardElement(card, "hand-card");
      const rel = index - center;
      const x = start + index * spread;
      const angle = rel * angleScale;
      const arc = Math.pow(rel, 2) * curve;
      const raise = 18 - arc;

      // !!!!! slider only changes visual depth order, not real hand order.
      let z;
      if(depthBias >= 0){
        z = 100 + index;
      } else {
        z = 100 + (count - index);
      }
      // smooth bias: at middle, normal; at ends, strongly one side over the other.
      if(Math.abs(depthBias) < 0.2) z = 100 + index;

      el.style.left = `calc(50% + ${x}px - var(--card-w) / 2)`;
      el.style.bottom = `${Math.max(-12, raise)}px`;
      el.style.transform = `rotate(${angle}deg)`;
      el.style.zIndex = String(z);
      fan.appendChild(el);
    });
  };

  // Hide opponent controls/texts
  const p2Slider = document.getElementById("p2HandFanSlider");
  if(p2Slider) p2Slider.style.display = "none";
  document.querySelectorAll(".hand-label").forEach(el=>el.style.display="none");

  // Slider bindings
  els.handZoomSlider?.addEventListener("input",()=>{
    state.handZoom = Number(els.handZoomSlider.value) / 100;
    applyV36Zoom(); saveState(); render();
  });

  els.battlefieldZoomSlider?.addEventListener("input",()=>{
    state.battlefieldZoom = Number(els.battlefieldZoomSlider.value) / 100;
    applyV36Zoom(); saveState(); render();
  });

  els.p1HandFanSlider?.addEventListener("input",()=>{
    if(!state.handFan) state.handFan = {p1:0,p2:0};
    state.handFan.p1 = Number(els.p1HandFanSlider.value);
    saveState(); render();
  });

  els.p1HandDepthSlider?.addEventListener("input",()=>{
    if(!state.handDepth) state.handDepth = {p1:0};
    state.handDepth.p1 = Number(els.p1HandDepthSlider.value);
    saveState(); render();
  });

  // Sync initial slider values
  if(els.handZoomSlider) els.handZoomSlider.value = String(Math.round((state.handZoom || 1) * 100));
  if(els.battlefieldZoomSlider) els.battlefieldZoomSlider.value = String(Math.round((state.battlefieldZoom || 1) * 100));
  if(els.p1HandFanSlider) els.p1HandFanSlider.value = String(state.handFan?.p1 || 0);
  if(els.p1HandDepthSlider) els.p1HandDepthSlider.value = String(state.handDepth?.p1 || 0);

  // Movable hand: drag empty hand-zone/fan background, not a card.
  let handDrag = null;
  els.p1HandZone?.addEventListener("pointerdown", (e)=>{
    if(e.target.closest(".card") || e.target.closest("input")) return;
    const r = els.p1HandZone.getBoundingClientRect();
    handDrag = { dx:e.clientX-r.left, dy:e.clientY-r.top };
    e.preventDefault();
  });

  document.addEventListener("pointermove", (e)=>{
    if(!handDrag) return;
    if(!state.handPosition) state.handPosition = {p1:null};
    state.handPosition.p1 = {
      x: e.clientX - handDrag.dx + els.p1HandZone.offsetWidth/2,
      y: e.clientY - handDrag.dy
    };
    applyHandPosition();
  });

  document.addEventListener("pointerup", ()=>{
    if(handDrag){
      handDrag = null;
      saveState();
    }
  });

  const oldRender = render;
  render = function(){
    oldRender();
    applyV36Zoom();
    applyHandPosition();
  };

  applyV36Zoom();
  applyHandPosition();
})();


// v37: fix sideboard editor empty + token fan placement/spawn owner.
(function(){
  // Token fan always belongs to bottom player in local test.
  function v37SpawnToken(src, name, backSrc, x, y){
    const p = "p1";
    state.cards.push({
      id: uid(),
      owner: p,
      zone: "battlefield",
      tapped: false,
      faceDown: false,
      x: typeof x === "number" ? x : (innerWidth / 2 - CARD_W / 2),
      y: typeof y === "number" ? y : (innerHeight * 0.68 - CARD_H / 2),
      z: Math.max(1, ...state.cards.map(c=>c.z || 1)) + 1,
      token: true,
      tokenBack: backSrc || "aieback.png",
      name,
      image: src,
      oracle: "",
      typeLine: "Token",
      manaCost: "",
      set: "token"
    });
    saveState();
    render();
  }

  // Override token modal open: no panel, click token = appears middle of my battlefield.
  addToken = function(player = "p1"){
    state.selectedToken = null;
    state.activePlayer = "p1";
    if(els.activePlayerSelect) els.activePlayerSelect.value = "p1";
    renderTokenGrid();
    els.tokenModal.classList.remove("hidden");
    els.tokenModal.classList.add("token-fan-mode");
  };

  // Rebuild token grid with direct click behavior, no forced opponent side.
  renderTokenGrid = function(){
    els.tokenGrid.innerHTML = "";
    const checked = document.querySelector('input[name="tokenSetRadio"]:checked');
    const setName = checked ? checked.value : "aiie";

    TOKEN_NAMES.forEach(name=>{
      const prefix = setName === "citadel" ? "c_" : "";
      const file = prefix + name.replaceAll(" ","-") + ".png";
      const src = `token/${file}`;
      const backSrc = setName === "aiie" ? "aieback.png" : "c_back.png";

      const wrap = document.createElement("div");
      wrap.className = "token-choice";

      const img = document.createElement("img");
      img.src = src;
      img.alt = name;
      img.draggable = false;
      img.onerror = () => { img.style.display = "none"; };

      const label = document.createElement("div");
      label.textContent = name;

      wrap.appendChild(img);
      wrap.appendChild(label);

      wrap.addEventListener("click",(e)=>{
        e.preventDefault();
        e.stopPropagation();
        v37SpawnToken(src, name, backSrc);
        els.tokenModal.classList.add("hidden");
        els.tokenModal.classList.remove("token-fan-mode");
      });

      wrap.addEventListener("dblclick",(e)=>{
        e.preventDefault();
        e.stopPropagation();
        v37SpawnToken(src, name, backSrc);
        els.tokenModal.classList.add("hidden");
        els.tokenModal.classList.remove("token-fan-mode");
      });

      els.tokenGrid.appendChild(wrap);
    });
  };

  // Sideboard editor fix:
  // previous editor only showed cards in library. If game has started / cards are hand/grave/etc it became empty.
  function v37PlayerCardsForSideboard(player){
    return state.cards.filter(c =>
      (c.owner || "p1") === player &&
      !c.token &&
      c.zone !== "sideboard"
    );
  }

  function v37SideCards(player){
    return (state.sideboardCards || []).filter(c => (c.owner || "p1") === player);
  }

  function v37CardGroups(cards){
    const groups = new Map();
    cards.forEach(card=>{
      if(!groups.has(card.name)) groups.set(card.name, []);
      groups.get(card.name).push(card);
    });
    return [...groups.entries()].sort((a,b)=>a[0].localeCompare(b[0]));
  }

  function v37MakeSideboardCard(card, count, where){
    const wrap = document.createElement("div");
    wrap.className = "sideboard-card";
    wrap.dataset.cardId = card.id;

    const img = document.createElement("img");
    img.src = card.image;
    img.alt = card.name;
    img.draggable = false;
    wrap.appendChild(img);

    if(count > 1){
      const badge = document.createElement("div");
      badge.className = "sideboard-count";
      badge.textContent = count;
      wrap.appendChild(badge);
    }

    wrap.addEventListener("dblclick",()=>{
      if(where === "main") moveOneToSide(card.name);
      else moveOneToMain(card.name);
      renderSideboardEditor();
    });

    wrap.addEventListener("click",()=>{
      if(where === "main") moveOneToSide(card.name);
      else moveOneToMain(card.name);
      renderSideboardEditor();
    });

    return wrap;
  }

  renderSideboardEditor = function(){
    const p = "p1";
    state.activePlayer = "p1";
    if(els.activePlayerSelect) els.activePlayerSelect.value = "p1";

    els.mainboardGrid.innerHTML = "";
    els.sideboardGrid.innerHTML = "";

    const main = v37PlayerCardsForSideboard(p);
    const side = v37SideCards(p);

    if(els.mainboardCount) els.mainboardCount.textContent = main.length;
    if(els.sideboardCount) els.sideboardCount.textContent = side.length;

    for(const [name, cards] of v37CardGroups(main)){
      els.mainboardGrid.appendChild(v37MakeSideboardCard(cards[cards.length-1], cards.length, "main"));
    }
    for(const [name, cards] of v37CardGroups(side)){
      els.sideboardGrid.appendChild(v37MakeSideboardCard(cards[cards.length-1], cards.length, "side"));
    }
  };

  // Move one card by name from any main zone to sideboard.
  moveOneToSide = function(name){
    const p = "p1";
    const card = state.cards.find(c => (c.owner || "p1") === p && !c.token && c.name === name && c.zone !== "sideboard");
    if(!card) return;
    state.cards = state.cards.filter(c => c.id !== card.id);
    if(!state.sideboardCards) state.sideboardCards = [];
    state.sideboardCards.push({...card, zone:"sideboard", tapped:false, faceDown:false});
    saveState();
  };

  moveOneToMain = function(name){
    const p = "p1";
    const card = (state.sideboardCards || []).find(c => (c.owner || "p1") === p && c.name === name);
    if(!card) return;
    state.sideboardCards = state.sideboardCards.filter(c => c.id !== card.id);
    state.cards.push({...card, zone:`${p}-library`, tapped:false, faceDown:false});
    saveState();
  };

  openSideboardEditor = function(){
    if(!confirm("reset game and go to editor ?")) return;
    // collect all main cards back to library so editor has the full current mainboard
    state.cards = state.cards.map(c=>{
      if((c.owner || "p1") === "p1" && !c.token) return {...c, zone:"p1-library", tapped:false, faceDown:false};
      return c;
    });
    saveState();
    renderSideboardEditor();
    els.sideboardModal.classList.remove("hidden");
  };

  // Rebind menu buttons after overriding functions.
  els.menuAddTokenBtn?.addEventListener("click",(e)=>{
    e.preventDefault();
    addToken("p1");
  });

  els.sideboardBtn?.addEventListener("click",(e)=>{
    e.preventDefault();
    openSideboardEditor();
  });
})();


// v38: zoom sliders back in green menu; hand fan/depth controlled by Cmd + wheel/trackpad.
// vertical wheel = ????? fan/curve/spread
// horizontal wheel = !!!!! front/back visual depth
(function(){
  function applyV38Zoom(){
    document.documentElement.style.setProperty("--hand-zoom", String(state.handZoom || 1));
    document.documentElement.style.setProperty("--battlefield-zoom", String(state.battlefieldZoom || 1));
  }

  els.handZoomSlider?.addEventListener("input",()=>{
    state.handZoom = Number(els.handZoomSlider.value) / 100;
    applyV38Zoom();
    saveState();
    render();
  });

  els.battlefieldZoomSlider?.addEventListener("input",()=>{
    state.battlefieldZoom = Number(els.battlefieldZoomSlider.value) / 100;
    applyV38Zoom();
    saveState();
    render();
  });

  if(els.handZoomSlider) els.handZoomSlider.value = String(Math.round((state.handZoom || 1) * 100));
  if(els.battlefieldZoomSlider) els.battlefieldZoomSlider.value = String(Math.round((state.battlefieldZoom || 1) * 100));

  // Override renderHand: !!!!! slider/depth now actually changes visual stacking continuously.
  renderHand = function(player, fan){
    fan.innerHTML = "";
    const hand = zoneCards(`${player}-hand`);
    const count = hand.length;

    const fanValue = player === "p1" ? Number(state.handFan?.p1 || 0) : 0;
    const depthValue = player === "p1" ? Number(state.handDepth?.p1 || 0) : 0;

    // -100 = almost stacked, +100 = wide fan.
    const t = (fanValue + 100) / 200;
    const spread = 8 + t * 70;
    const curve = 0.4 + t * 5.8;
    const angleScale = 0.8 + t * 7.0;

    const start = -((count - 1) * spread) / 2;
    const center = (count - 1) / 2;

    // depthValue -100 => left/top side above, +100 => right/top side above.
    const depth = depthValue / 100;

    hand.forEach((card, index)=>{
      const el = createCardElement(card, "hand-card");
      const rel = index - center;
      const x = start + index * spread;
      const angle = rel * angleScale;
      const arc = Math.pow(rel, 2) * curve;
      const raise = 18 - arc;

      const normalZ = index;
      const reverseZ = count - index;
      const mix = (depth + 1) / 2;
      const visualZ = (reverseZ * (1 - mix)) + (normalZ * mix);

      el.style.left = `calc(50% + ${x}px - var(--card-w) / 2)`;
      el.style.bottom = `${Math.max(-12, raise)}px`;
      el.style.transform = `rotate(${angle}deg)`;
      el.style.zIndex = String(100 + Math.round(visualZ * 10));
      fan.appendChild(el);
    });
  };

  function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }

  document.addEventListener("wheel", (e)=>{
    // Mac Command = metaKey, PC Ctrl = ctrlKey. This works with trackpad and mouse wheel.
    if(!(e.metaKey || e.ctrlKey)) return;

    e.preventDefault();

    if(!state.handFan) state.handFan = {p1:0,p2:0};
    if(!state.handDepth) state.handDepth = {p1:0};

    // vertical scroll changes fan/curve
    if(Math.abs(e.deltaY) >= Math.abs(e.deltaX)){
      state.handFan.p1 = clamp((state.handFan.p1 || 0) - e.deltaY * 0.45, -100, 100);
    } else {
      // horizontal scroll changes front/back depth
      state.handDepth.p1 = clamp((state.handDepth.p1 || 0) + e.deltaX * 0.55, -100, 100);
    }

    saveState();
    render();
  }, {passive:false});

  const oldRender = render;
  render = function(){
    oldRender();
    applyV38Zoom();
  };

  applyV38Zoom();
})();


// v39: Cmd interactions only over own hand area.
// Cmd + wheel over hand = fan/depth.
// Cmd + drag empty hand area = move whole hand fan. This state is syncable later.
(function(){
  function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }

  function isOverOwnHand(x, y){
    const r = els.p1HandZone.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  }

  function applyHandPositionV39(){
    const pos = state.handPosition?.p1;
    if(pos){
      document.documentElement.style.setProperty("--p1-hand-left", `${pos.x}px`);
      document.documentElement.style.setProperty("--p1-hand-top", `${pos.y}px`);
      document.documentElement.style.setProperty("--p1-hand-bottom", "auto");
    }
  }

  // Restrict Cmd/Ctrl+wheel to hand zone only.
  document.addEventListener("wheel", (e)=>{
    if(!(e.metaKey || e.ctrlKey)) return;
    if(!isOverOwnHand(e.clientX, e.clientY)) return;

    e.preventDefault();
    e.stopImmediatePropagation();

    if(!state.handFan) state.handFan = {p1:0,p2:0};
    if(!state.handDepth) state.handDepth = {p1:0};

    if(Math.abs(e.deltaY) >= Math.abs(e.deltaX)){
      state.handFan.p1 = clamp((state.handFan.p1 || 0) - e.deltaY * 0.45, -100, 100);
    } else {
      state.handDepth.p1 = clamp((state.handDepth.p1 || 0) + e.deltaX * 0.55, -100, 100);
    }

    saveState();
    render();
  }, {passive:false, capture:true});

  // Cmd/Ctrl+drag hand area moves whole hand. Do not start if dragging a card.
  let cmdHandDrag = null;

  els.p1HandZone?.addEventListener("pointerdown", (e)=>{
    if(!(e.metaKey || e.ctrlKey)) return;
    if(e.target.closest(".card")) return;

    const r = els.p1HandZone.getBoundingClientRect();
    const currentX = state.handPosition?.p1?.x ?? (r.left + r.width/2);
    const currentY = state.handPosition?.p1?.y ?? r.top;

    cmdHandDrag = {
      dx: e.clientX - currentX,
      dy: e.clientY - currentY
    };

    els.p1HandZone.classList.add("cmd-hand-drag");
    e.preventDefault();
    e.stopImmediatePropagation();
  }, true);

  document.addEventListener("pointermove", (e)=>{
    if(!cmdHandDrag) return;
    if(!state.handPosition) state.handPosition = {p1:null};

    state.handPosition.p1 = {
      x: e.clientX - cmdHandDrag.dx,
      y: e.clientY - cmdHandDrag.dy
    };

    applyHandPositionV39();
  }, true);

  document.addEventListener("pointerup", ()=>{
    if(!cmdHandDrag) return;
    cmdHandDrag = null;
    els.p1HandZone.classList.remove("cmd-hand-drag");
    saveState();
  }, true);

  const oldRender = render;
  render = function(){
    oldRender();
    applyHandPositionV39();
  };

  applyHandPositionV39();
})();


// v40: hand trackpad controls, Cmd-drag hand, green menu add dice, remove field button behavior, dice menu simplification.
(function(){
  function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }

  function overOwnHand(x,y){
    const r = els.p1HandZone.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  }

  function applyHandPositionV40(){
    const pos = state.handPosition?.p1;
    if(pos){
      document.documentElement.style.setProperty("--p1-hand-left", `${pos.x}px`);
      document.documentElement.style.setProperty("--p1-hand-top", `${pos.y}px`);
      document.documentElement.style.setProperty("--p1-hand-bottom", "auto");
    }
  }

  // Trackpad/mouse wheel over hand WITHOUT Cmd:
  // vertical = fan/curve, horizontal = front/back.
  document.addEventListener("wheel", (e)=>{
    if(e.metaKey || e.ctrlKey) return;              // Cmd/Ctrl is reserved for moving the whole hand
    if(!overOwnHand(e.clientX, e.clientY)) return;

    e.preventDefault();
    e.stopImmediatePropagation();

    if(!state.handFan) state.handFan = {p1:0,p2:0};
    if(!state.handDepth) state.handDepth = {p1:0};

    if(Math.abs(e.deltaY) >= Math.abs(e.deltaX)){
      state.handFan.p1 = clamp((state.handFan.p1 || 0) - e.deltaY * 0.45, -100, 100);
    } else {
      state.handDepth.p1 = clamp((state.handDepth.p1 || 0) + e.deltaX * 0.65, -100, 100);
    }

    els.p1HandZone.classList.add("trackpad-hand-active");
    clearTimeout(window.__v40HandActiveTimer);
    window.__v40HandActiveTimer = setTimeout(()=>els.p1HandZone.classList.remove("trackpad-hand-active"), 220);

    saveState();
    render();
  }, {passive:false, capture:true});

  // Override renderHand so front/back actually works.
  renderHand = function(player, fan){
    fan.innerHTML = "";
    const hand = zoneCards(`${player}-hand`);
    const count = hand.length;
    const fanValue = player === "p1" ? Number(state.handFan?.p1 || 0) : 0;
    const depthValue = player === "p1" ? Number(state.handDepth?.p1 || 0) : 0;

    const t = (fanValue + 100) / 200;      // 0 pile, 1 spread
    const spread = 7 + t * 74;
    const curve = 0.3 + t * 6.2;
    const angleScale = 0.5 + t * 7.2;
    const start = -((count - 1) * spread) / 2;
    const center = (count - 1) / 2;

    const direction = depthValue >= 0 ? 1 : -1;
    const strength = Math.abs(depthValue) / 100;

    hand.forEach((card,index)=>{
      const el = createCardElement(card, "hand-card");
      const rel = index - center;
      const x = start + index * spread;
      const angle = rel * angleScale;
      const arc = Math.pow(rel,2) * curve;
      const raise = 18 - arc;

      // front/back visual ordering only. At center use normal order;
      // toward extremes it flips which end of the fan is on top.
      const normal = index;
      const flipped = count - index;
      const wanted = direction > 0 ? normal : flipped;
      const z = 1000 + Math.round((normal * (1-strength) + wanted * strength) * 20);

      el.style.left = `calc(50% + ${x}px - var(--card-w) / 2)`;
      el.style.bottom = `${Math.max(-12, raise)}px`;
      el.style.transform = `rotate(${angle}deg)`;
      el.style.zIndex = String(z);
      fan.appendChild(el);
    });
  };

  // Cmd/Ctrl + drag from the middle/empty part of own hand zone moves the whole hand.
  // If Cmd/Ctrl is down, no individual hand card starts dragging.
  const oldStartCardDrag = startCardDrag;
  startCardDrag = function(e, card){
    if((e.metaKey || e.ctrlKey) && card.zone && card.zone.endsWith("-hand")){
      e.preventDefault();
      e.stopImmediatePropagation();
      return;
    }
    return oldStartCardDrag(e, card);
  };

  let handMove = null;

  els.p1HandZone?.addEventListener("pointerdown", (e)=>{
    if(!(e.metaKey || e.ctrlKey)) return;

    const r = els.p1HandZone.getBoundingClientRect();
    const currentX = state.handPosition?.p1?.x ?? (r.left + r.width/2);
    const currentY = state.handPosition?.p1?.y ?? r.top;

    handMove = {
      dx: e.clientX - currentX,
      dy: e.clientY - currentY
    };

    els.p1HandZone.classList.add("cmd-hand-drag");
    e.preventDefault();
    e.stopImmediatePropagation();
  }, true);

  document.addEventListener("pointermove", (e)=>{
    if(!handMove) return;
    if(!state.handPosition) state.handPosition = {p1:null};

    state.handPosition.p1 = {
      x: e.clientX - handMove.dx,
      y: e.clientY - handMove.dy
    };

    applyHandPositionV40();
  }, true);

  document.addEventListener("pointerup", ()=>{
    if(!handMove) return;
    handMove = null;
    els.p1HandZone.classList.remove("cmd-hand-drag");
    saveState();
  }, true);

  // Green menu add dice.
  els.menuAddDiceBtn?.addEventListener("click", (e)=>{
    e.preventDefault();
    addDie(80, innerHeight - HAND_HEIGHT - 50, "#79d45a");
  });


  // Dice menu cleanup: remove add dice from the die context menu if present.
  document.addEventListener("contextmenu", ()=>{
    setTimeout(()=>{
      document.querySelectorAll("#diceMenu button").forEach(btn=>{
        if(btn.textContent.trim().toLowerCase().includes("add dice")){
          btn.remove();
        }
      });
    },0);
  }, true);

  // Ensure render re-applies hand position.
  const oldRender = render;
  render = function(){
    oldRender();
    applyHandPositionV40();
  };

  applyHandPositionV40();
})();


// v41 sideboard: same-name cards grouped together, each group is a vertical stack.
// Cards overlap downward so top edges remain visible; newest/front card is lowest.
(function(){
  function v41Grouped(cards){
    const groups = new Map();
    cards.forEach(card=>{
      if(!groups.has(card.name)) groups.set(card.name, []);
      groups.get(card.name).push(card);
    });
    return [...groups.entries()].sort((a,b)=>a[0].localeCompare(b[0]));
  }

  function v41MainCards(player){
    return state.cards.filter(c =>
      (c.owner || "p1") === player &&
      !c.token &&
      c.zone !== "sideboard"
    );
  }

  function v41SideCards(player){
    return (state.sideboardCards || []).filter(c => (c.owner || "p1") === player);
  }

  function v41MakeStack(name, cards, where){
    const stack = document.createElement("div");
    stack.className = "sideboard-name-stack";
    stack.dataset.name = name;

    const step = 24;
    stack.style.height = `${168 + Math.max(0, cards.length - 1) * step}px`;

    // first copies are behind; last/lower copy is visually on top, like grave stack
    cards.forEach((card, i)=>{
      const el = document.createElement("div");
      el.className = "sideboard-stack-card";
      el.dataset.cardId = card.id;
      el.style.top = `${i * step}px`;
      el.style.zIndex = String(100 + i);

      const img = document.createElement("img");
      img.src = card.image;
      img.alt = card.name;
      img.draggable = false;
      el.appendChild(img);

      const move = ()=>{
        if(where === "main") moveOneToSide(card.name);
        else moveOneToMain(card.name);
        renderSideboardEditor();
      };

      el.addEventListener("dblclick", (e)=>{
        e.preventDefault();
        e.stopPropagation();
        move();
      });

      // Single click also moves, to keep it fast and simple.
      el.addEventListener("click", (e)=>{
        e.preventDefault();
        e.stopPropagation();
        move();
      });

      stack.appendChild(el);
    });

    return stack;
  }

  renderSideboardEditor = function(){
    const p = "p1";
    state.activePlayer = "p1";
    if(els.activePlayerSelect) els.activePlayerSelect.value = "p1";

    els.mainboardGrid.innerHTML = "";
    els.sideboardGrid.innerHTML = "";

    const main = v41MainCards(p);
    const side = v41SideCards(p);

    if(els.mainboardCount) els.mainboardCount.textContent = main.length;
    if(els.sideboardCount) els.sideboardCount.textContent = side.length;

    for(const [name, cards] of v41Grouped(main)){
      els.mainboardGrid.appendChild(v41MakeStack(name, cards, "main"));
    }

    for(const [name, cards] of v41Grouped(side)){
      els.sideboardGrid.appendChild(v41MakeStack(name, cards, "side"));
    }
  };

  moveOneToSide = function(name){
    const p = "p1";
    const main = v41MainCards(p).filter(c => c.name === name);
    const card = main[main.length - 1];
    if(!card) return;

    state.cards = state.cards.filter(c => c.id !== card.id);
    if(!state.sideboardCards) state.sideboardCards = [];
    state.sideboardCards.push({...card, zone:"sideboard", tapped:false, faceDown:false});
    saveState();
  };

  moveOneToMain = function(name){
    const p = "p1";
    const cards = v41SideCards(p).filter(c => c.name === name);
    const card = cards[cards.length - 1];
    if(!card) return;

    state.sideboardCards = state.sideboardCards.filter(c => c.id !== card.id);
    state.cards.push({...card, zone:`${p}-library`, tapped:false, faceDown:false});
    saveState();
  };
})();


// v42: compact current-oracle panel above menu + hand front/back "pläräys".
(function(){
  function cleanOracleText(card){
    const oracle = card.oracle || card.printed_text || "";
    const type = card.typeLine || card.type_line || "";
    const name = card.name || "";
    return `${name}\n${type}\n\n${oracle}`.trim();
  }

  function setOraclePanel(card){
    if(!state.showOraclePanel || !card){
      els.oraclePanel?.classList.add("hidden");
      return;
    }
    els.oraclePanelImage.src = card.image || "";
    els.oraclePanelText.textContent = cleanOracleText(card);
    els.oraclePanel.classList.remove("hidden");
  }

  function clearOraclePanel(){
    // leave last card visible while enabled; do not flicker blank
    if(!state.showOraclePanel) els.oraclePanel?.classList.add("hidden");
  }

  // override old oracle popup behavior: no floating black box at mouse
  showOracle = function(card){ setOraclePanel(card); };
  hideOracle = function(){ clearOraclePanel(); };

  els.showOracleCheck?.addEventListener("change", ()=>{
    state.showOraclePanel = !!els.showOracleCheck.checked;
    if(!state.showOraclePanel) els.oraclePanel?.classList.add("hidden");
    saveState();
  });
  if(els.showOracleCheck) els.showOracleCheck.checked = state.showOraclePanel !== false;

  // Render hand so horizontal two-finger scroll "plärää" top card across the fan:
  // depthValue -100 => left end on top, 0 => middle on top, +100 => right end on top.
  renderHand = function(player, fan){
    fan.innerHTML = "";
    const hand = zoneCards(`${player}-hand`);
    const count = hand.length;

    const fanValue = player === "p1" ? Number(state.handFan?.p1 || 0) : 0;
    const depthValue = player === "p1" ? Number(state.handDepth?.p1 || 0) : 0;

    const t = (fanValue + 100) / 200;
    const spread = 7 + t * 74;
    const curve = 0.3 + t * 6.2;
    const angleScale = 0.5 + t * 7.2;
    const start = -((count - 1) * spread) / 2;
    const center = (count - 1) / 2;

    // This is the "focus" card: it moves left->right as you horizontal-scroll.
    const focus = count <= 1 ? 0 : ((depthValue + 100) / 200) * (count - 1);

    hand.forEach((card,index)=>{
      const el = createCardElement(card, "hand-card");
      const rel = index - center;
      const x = start + index * spread;
      const angle = rel * angleScale;
      const arc = Math.pow(rel,2) * curve;
      const raise = 18 - arc;

      // Cards closer to focus appear above; tie-breaker preserves natural order.
      const distance = Math.abs(index - focus);
      const z = 10000 - Math.round(distance * 100) + index;

      const transform = `rotate(${angle}deg)`;
      el.style.left = `calc(50% + ${x}px - var(--card-w) / 2)`;
      el.style.bottom = `${Math.max(-12, raise)}px`;
      el.style.transform = transform;
      el.style.setProperty("--hand-transform", transform);
      el.style.zIndex = String(z);

      // Make sure hover only updates oracle panel, never raises/reorders.
      el.addEventListener("mouseenter",()=>setOraclePanel(card));
      el.addEventListener("mouseleave",()=>clearOraclePanel());

      fan.appendChild(el);
    });
  };

  // Wheel over hand: vertical fan/curve, horizontal front/back focus.
  document.addEventListener("wheel", (e)=>{
    if(e.metaKey || e.ctrlKey) return;
    const r = els.p1HandZone.getBoundingClientRect();
    const over = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    if(!over) return;

    e.preventDefault();
    e.stopImmediatePropagation();

    if(!state.handFan) state.handFan = {p1:0,p2:0};
    if(!state.handDepth) state.handDepth = {p1:0};

    if(Math.abs(e.deltaY) >= Math.abs(e.deltaX)){
      state.handFan.p1 = Math.max(-100, Math.min(100, (state.handFan.p1 || 0) - e.deltaY * 0.45));
    } else {
      state.handDepth.p1 = Math.max(-100, Math.min(100, (state.handDepth.p1 || 0) + e.deltaX * 0.65));
    }
    saveState();
    render();
  }, {passive:false, capture:true});
})();


// v43 sideboard editor: continuous 10-card stacks, main 6+ stacks, side 3 stacks, drag or double-click.
(function(){
  function v43SideMainCards(player){
    return state.cards
      .filter(c => (c.owner || "p1") === player && !c.token && c.zone !== "sideboard")
      .sort((a,b)=>a.name.localeCompare(b.name));
  }

  function v43SideCards(player){
    return (state.sideboardCards || [])
      .filter(c => (c.owner || "p1") === player)
      .sort((a,b)=>a.name.localeCompare(b.name));
  }

  function v43MoveCardObjectToSide(cardId){
    const card = state.cards.find(c => c.id === cardId);
    if(!card) return;
    state.cards = state.cards.filter(c => c.id !== cardId);
    if(!state.sideboardCards) state.sideboardCards = [];
    state.sideboardCards.push({...card, zone:"sideboard", tapped:false, faceDown:false});
    saveState();
  }

  function v43MoveCardObjectToMain(cardId){
    const card = (state.sideboardCards || []).find(c => c.id === cardId);
    if(!card) return;
    state.sideboardCards = state.sideboardCards.filter(c => c.id !== cardId);
    state.cards.push({...card, zone:"p1-library", tapped:false, faceDown:false});
    saveState();
  }

  function v43MakeColumn(cards, where, colIndex){
    const col = document.createElement("div");
    col.className = "sideboard-column-stack";
    col.dataset.where = where;
    col.dataset.col = String(colIndex);

    const step = 28;
    col.style.height = `${168 + Math.max(0, cards.length - 1) * step}px`;

    cards.forEach((card, i)=>{
      const el = document.createElement("div");
      el.className = "sideboard-stack-card";
      el.draggable = true;
      el.dataset.cardId = card.id;
      el.dataset.where = where;
      el.style.top = `${i * step}px`;
      el.style.zIndex = String(100 + i);

      const img = document.createElement("img");
      img.src = card.image;
      img.alt = card.name;
      img.draggable = false;
      el.appendChild(img);

      el.addEventListener("mouseenter",()=>showOracle(card));
      el.addEventListener("mouseleave",()=>hideOracle());

      el.addEventListener("dblclick",(e)=>{
        e.preventDefault();
        e.stopPropagation();
        if(where === "main") v43MoveCardObjectToSide(card.id);
        else v43MoveCardObjectToMain(card.id);
        renderSideboardEditor();
      });

      el.addEventListener("dragstart",(e)=>{
        e.dataTransfer.setData("text/plain", JSON.stringify({id:card.id, from:where}));
        e.dataTransfer.effectAllowed = "move";
        el.classList.add("dragging");
      });

      el.addEventListener("dragend",()=>el.classList.remove("dragging"));

      col.appendChild(el);
    });

    return col;
  }

  function v43RenderContinuousStacks(container, cards, where, cardsPerStack){
    container.innerHTML = "";
    for(let i=0; i<cards.length; i += cardsPerStack){
      container.appendChild(v43MakeColumn(cards.slice(i, i + cardsPerStack), where, i / cardsPerStack));
    }

    container.addEventListener("dragover",(e)=>{
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    });

    container.addEventListener("drop",(e)=>{
      e.preventDefault();
      let data;
      try { data = JSON.parse(e.dataTransfer.getData("text/plain")); } catch { return; }
      if(!data || !data.id) return;

      if(where === "main" && data.from === "side") v43MoveCardObjectToMain(data.id);
      if(where === "side" && data.from === "main") v43MoveCardObjectToSide(data.id);

      renderSideboardEditor();
    });
  }

  renderSideboardEditor = function(){
    const p = "p1";
    state.activePlayer = "p1";
    if(els.activePlayerSelect) els.activePlayerSelect.value = "p1";

    const main = v43SideMainCards(p);
    const side = v43SideCards(p);

    if(els.mainboardCount) els.mainboardCount.textContent = main.length;
    if(els.sideboardCount) els.sideboardCount.textContent = side.length;

    v43RenderContinuousStacks(els.mainboardGrid, main, "main", 10);
    v43RenderContinuousStacks(els.sideboardGrid, side, "side", 10);
  };

  moveOneToSide = function(name){
    const card = v43SideMainCards("p1").find(c => c.name === name);
    if(card) v43MoveCardObjectToSide(card.id);
  };

  moveOneToMain = function(name){
    const card = v43SideCards("p1").find(c => c.name === name);
    if(card) v43MoveCardObjectToMain(card.id);
  };

  openSideboardEditor = function(){
    if(!confirm("reset game and go to editor ?")) return;
    state.cards = state.cards.map(c=>{
      if((c.owner || "p1") === "p1" && !c.token) return {...c, zone:"p1-library", tapped:false, faceDown:false};
      return c;
    });
    saveState();
    renderSideboardEditor();
    els.sideboardModal.classList.remove("hidden");

    // keep oracle panel visible while sideboard is open
    if(state.showOraclePanel !== false && els.oraclePanel) els.oraclePanel.classList.remove("hidden");
  };

  // Rebind sideboard button to latest override.
  els.sideboardBtn?.addEventListener("click",(e)=>{
    e.preventDefault();
    openSideboardEditor();
  });
})();


// v44 oracle display: public cards only, per-player compatible, menu covers it.
(function(){
  function isPublicCard(card){
    if(!card) return false;
    if(card.zone === "battlefield") return true;
    if(card.zone && (card.zone.endsWith("-graveyard") || card.zone.endsWith("-exile"))) return true;
    return false;
  }

  function compactOracle(card){
    const lines = [];
    if(card.name) lines.push(card.name);
    if(card.typeLine || card.type_line) lines.push(card.typeLine || card.type_line);
    const oracle = card.oracle || card.printed_text || "";
    if(oracle) lines.push("", oracle);
    return lines.join("\n").trim();
  }

  function showPublicOracle(card){
    if(state.showOraclePanel === false || !isPublicCard(card)){
      els.oraclePanel?.classList.add("hidden");
      return;
    }
    els.oraclePanelImage.src = card.image || "";
    els.oraclePanelImage.alt = card.name || "";
    els.oraclePanelText.textContent = compactOracle(card);
    els.oraclePanel.classList.remove("hidden");
  }

  // Override old oracle behavior.
  showOracle = function(card){ showPublicOracle(card); };
  hideOracle = function(){ /* keep last public hovered card visible */ };

  // Public hover binding: battlefield, grave/exile stack, sideboard editor.
  document.addEventListener("mouseover", (e)=>{
    const el = e.target.closest("[data-card-id]");
    if(!el) return;
    const card = state.cards.find(c => c.id === el.dataset.cardId)
      || (state.sideboardCards || []).find(c => c.id === el.dataset.cardId);
    if(!card) return;
    showPublicOracle(card);
  }, true);

  // Do not show oracle from private hand/library.
  document.addEventListener("mouseover", (e)=>{
    const hand = e.target.closest(".hand-card");
    const library = e.target.closest('[data-kind="library"]');
    if(hand || library){
      return;
    }
  }, true);

  els.showOracleCheck?.addEventListener("change", ()=>{
    state.showOraclePanel = !!els.showOracleCheck.checked;
    if(!state.showOraclePanel) els.oraclePanel?.classList.add("hidden");
    saveState();
  });

  if(els.showOracleCheck) els.showOracleCheck.checked = state.showOraclePanel !== false;
})();


// v45: oracle panel shows card image + black oracle box; hand hover never changes z;
// horizontal two-finger drag over hand reliably plärää front/back.
(function(){
  function oracleText(card){
    const type = card.typeLine || card.type_line || "";
    const oracle = card.oracle || card.printed_text || "";
    return [card.name || "", type, "", oracle].join("\n").trim();
  }

  function showPanel(card){
    if(!card || state.showOraclePanel === false){
      els.oraclePanel?.classList.add("hidden");
      return;
    }

    // Show any visible card under mouse, including own hand. Opponent hand/library stay hidden by rendering/back.
    els.oraclePanelImage.src = card.image || "";
    els.oraclePanelImage.alt = card.name || "";
    els.oraclePanelText.textContent = oracleText(card);
    els.oraclePanel.classList.remove("hidden");
  }

  showOracle = function(card){ showPanel(card); };
  hideOracle = function(){};

  document.addEventListener("mouseover", (e)=>{
    const el = e.target.closest && e.target.closest("[data-card-id]");
    if(!el) return;

    // Do not show hidden library pile/back. Battlefield, hand, grave/exile stack and sideboard are ok.
    if(el.closest('[data-kind="library"]')) return;

    const card = state.cards.find(c=>c.id===el.dataset.cardId)
      || (state.sideboardCards || []).find(c=>c.id===el.dataset.cardId);
    if(card) showPanel(card);
  }, true);

  els.showOracleCheck?.addEventListener("change", ()=>{
    state.showOraclePanel = !!els.showOracleCheck.checked;
    if(!state.showOraclePanel) els.oraclePanel?.classList.add("hidden");
    saveState();
  });
  if(els.showOracleCheck) els.showOracleCheck.checked = state.showOraclePanel !== false;

  function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }
  function overHand(e){
    const r = els.p1HandZone.getBoundingClientRect();
    return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
  }

  // Override hand render: stable z-index from state.handDepth only, never hover.
  renderHand = function(player, fan){
    fan.innerHTML = "";
    const hand = zoneCards(`${player}-hand`);
    const count = hand.length;

    const fanValue = player === "p1" ? Number(state.handFan?.p1 || 0) : 0;
    const depthValue = player === "p1" ? Number(state.handDepth?.p1 || 0) : 0;

    const t = (fanValue + 100) / 200;
    const spread = 7 + t * 74;
    const curve = 0.3 + t * 6.2;
    const angleScale = 0.5 + t * 7.2;
    const start = -((count - 1) * spread) / 2;
    const center = (count - 1) / 2;

    // focus moves continuously from left end to right end with horizontal scroll
    const focus = count <= 1 ? 0 : ((depthValue + 100) / 200) * (count - 1);

    hand.forEach((card,index)=>{
      const el = createCardElement(card, "hand-card");
      const rel = index - center;
      const x = start + index * spread;
      const angle = rel * angleScale;
      const arc = Math.pow(rel,2) * curve;
      const raise = 18 - arc;

      // closest card to focus is topmost; stable unless wheel changes state
      const dist = Math.abs(index - focus);
      const z = 10000 - Math.round(dist * 100) + index;

      const transform = `rotate(${angle}deg)`;
      el.style.left = `calc(50% + ${x}px - var(--card-w) / 2)`;
      el.style.bottom = `${Math.max(-12, raise)}px`;
      el.style.transform = transform;
      el.style.setProperty("--hand-transform", transform);
      el.style.zIndex = String(z);
      el.style.setProperty("--hand-z", String(z));

      el.addEventListener("mouseenter",()=>showPanel(card));
      fan.appendChild(el);
    });
  };

  // Reliable trackpad/wheel over hand:
  // vertical => fan/curve, horizontal => front/back. Use whichever absolute delta is stronger.
  document.addEventListener("wheel", (e)=>{
    if(e.metaKey || e.ctrlKey) return;
    if(!overHand(e)) return;

    e.preventDefault();
    e.stopImmediatePropagation();

    if(!state.handFan) state.handFan = {p1:0,p2:0};
    if(!state.handDepth) state.handDepth = {p1:0};

    const dx = e.deltaX || 0;
    const dy = e.deltaY || 0;

    if(Math.abs(dx) > Math.abs(dy) * 0.55){
      state.handDepth.p1 = clamp((state.handDepth.p1 || 0) + dx * 0.85, -100, 100);
    } else {
      state.handFan.p1 = clamp((state.handFan.p1 || 0) - dy * 0.45, -100, 100);
    }

    saveState();
    render();
  }, {passive:false, capture:true});
})();


// v46: definitive oracle panel position + hand hover is visually static.
(function(){
  function oracleText(card){
    const type = card.typeLine || card.type_line || "";
    const oracle = card.oracle || card.printed_text || "";
    return [card.name || "", type, "", oracle].join("\n").trim();
  }

  function showOraclePanelFor(card){
    if(!card || state.showOraclePanel === false) return;
    if(!els.oraclePanel || !els.oraclePanelImage || !els.oraclePanelText) return;

    els.oraclePanelImage.src = card.image || "";
    els.oraclePanelImage.alt = card.name || "";
    els.oraclePanelText.textContent = oracleText(card);
    els.oraclePanel.classList.remove("hidden");
  }

  showOracle = function(card){ showOraclePanelFor(card); };
  hideOracle = function(){};

  // Do not let hover change visual order. It only updates oracle panel.
  document.addEventListener("mouseover", (e)=>{
    const el = e.target.closest && e.target.closest("[data-card-id]");
    if(!el) return;

    // never show hidden library top/back
    if(el.closest('[data-kind="library"]')) return;

    const card = state.cards.find(c=>c.id===el.dataset.cardId)
      || (state.sideboardCards || []).find(c=>c.id===el.dataset.cardId);

    if(card) showOraclePanelFor(card);
  }, true);

  // Final hand renderer: sets CSS variables, no hover z changes possible.
  const oldRenderHand = renderHand;
  renderHand = function(player, fan){
    fan.innerHTML = "";
    const hand = zoneCards(`${player}-hand`);
    const count = hand.length;

    const fanValue = player === "p1" ? Number(state.handFan?.p1 || 0) : 0;
    const depthValue = player === "p1" ? Number(state.handDepth?.p1 || 0) : 0;

    const t = (fanValue + 100) / 200;
    const spread = 7 + t * 74;
    const curve = 0.3 + t * 6.2;
    const angleScale = 0.5 + t * 7.2;
    const start = -((count - 1) * spread) / 2;
    const center = (count - 1) / 2;

    const focus = count <= 1 ? 0 : ((depthValue + 100) / 200) * (count - 1);

    hand.forEach((card,index)=>{
      const el = createCardElement(card, "hand-card");
      const rel = index - center;
      const x = start + index * spread;
      const angle = rel * angleScale;
      const arc = Math.pow(rel,2) * curve;
      const raise = 18 - arc;

      const dist = Math.abs(index - focus);
      const z = 10000 - Math.round(dist * 100) + index;
      const transform = `rotate(${angle}deg)`;

      el.style.left = `calc(50% + ${x}px - var(--card-w) / 2)`;
      el.style.bottom = `${Math.max(-12, raise)}px`;
      el.style.transform = transform;
      el.style.zIndex = String(z);
      el.style.setProperty("--hand-transform", transform);
      el.style.setProperty("--hand-z", String(z));

      // important: only oracle update, no visual modifications
      el.addEventListener("mouseenter",()=>showOraclePanelFor(card), {passive:true});

      fan.appendChild(el);
    });
  };

  // keep panel in player's bottom-left zone, above menu button area
  function placeOraclePanel(){
    if(!els.oraclePanel) return;
    els.oraclePanel.style.left = "14px";
    els.oraclePanel.style.bottom = "64px";
  }

  const oldRender = render;
  render = function(){
    oldRender();
    placeOraclePanel();
  };
  placeOraclePanel();

  els.showOracleCheck?.addEventListener("change", ()=>{
    state.showOraclePanel = !!els.showOracleCheck.checked;
    if(!state.showOraclePanel) els.oraclePanel?.classList.add("hidden");
    saveState();
  });
  if(els.showOracleCheck) els.showOracleCheck.checked = state.showOraclePanel !== false;
})();


// v47 sideboard editor:
// - one shared-looking background
// - cards are laid out in initial 10-card stacks only when editor opens
// - after that cards keep free positions; removing from middle does not reflow the rest
// - double-click moves to the rightmost/bottom stack, not into old gaps
(function(){
  function cardKey(card){ return card.id; }

  function ensureSideboardLayout(){
    if(!state.sideboardLayout) state.sideboardLayout = {};
  }

  function sortedMain(player){
    return state.cards
      .filter(c => (c.owner || "p1") === player && !c.token && c.zone !== "sideboard")
      .sort((a,b)=>a.name.localeCompare(b.name));
  }

  function sortedSide(player){
    return (state.sideboardCards || [])
      .filter(c => (c.owner || "p1") === player)
      .sort((a,b)=>a.name.localeCompare(b.name));
  }

  function initialLayout(cards, area){
    const layout = {};
    const perStack = 10;
    const stepY = 28;
    const colX = 132;

    cards.forEach((card, i)=>{
      const col = Math.floor(i / perStack);
      const row = i % perStack;
      layout[cardKey(card)] = {
        area,
        x: col * colX,
        y: row * stepY,
        z: 100 + i
      };
    });

    return layout;
  }

  function resetSideboardEditorLayout(){
    ensureSideboardLayout();
    state.sideboardLayout = {
      ...initialLayout(sortedMain("p1"), "main"),
      ...initialLayout(sortedSide("p1"), "side")
    };
  }

  function rightmostBottomPosition(cards, area){
    ensureSideboardLayout();

    const existing = cards
      .map(c => state.sideboardLayout[cardKey(c)])
      .filter(p => p && p.area === area);

    if(!existing.length) return { area, x: 0, y: 0, z: 100 };

    // find rightmost stack by x, then put card under the lowest card in that stack
    const maxX = Math.max(...existing.map(p => p.x));
    const stack = existing.filter(p => Math.abs(p.x - maxX) < 4);
    const maxY = Math.max(...stack.map(p => p.y));
    const maxZ = Math.max(...existing.map(p => p.z || 100));

    return { area, x: maxX, y: maxY + 28, z: maxZ + 1 };
  }

  function makeFreeCard(card, area){
    ensureSideboardLayout();
    if(!state.sideboardLayout[cardKey(card)]){
      const cards = area === "main" ? sortedMain("p1") : sortedSide("p1");
      state.sideboardLayout[cardKey(card)] = rightmostBottomPosition(cards, area);
    }

    const pos = state.sideboardLayout[cardKey(card)];
    pos.area = area;

    const el = document.createElement("div");
    el.className = "sideboard-free-card";
    el.dataset.cardId = card.id;
    el.dataset.area = area;
    el.style.left = `${pos.x}px`;
    el.style.top = `${pos.y}px`;
    el.style.zIndex = String(pos.z || 100);

    const img = document.createElement("img");
    img.src = card.image;
    img.alt = card.name;
    img.draggable = false;
    el.appendChild(img);

    el.addEventListener("mouseenter",()=>showOracle(card));
    el.addEventListener("mouseleave",()=>hideOracle());

    el.addEventListener("dblclick",(e)=>{
      e.preventDefault();
      e.stopPropagation();
      if(area === "main") v47MoveCardToSide(card.id);
      else v47MoveCardToMain(card.id);
      renderSideboardEditor(false);
    });

    el.addEventListener("pointerdown",(e)=>{
      if(e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();

      const start = { x:e.clientX, y:e.clientY, left:pos.x, top:pos.y };
      el.classList.add("dragging");
      el.setPointerCapture(e.pointerId);
      pos.z = Math.max(200, ...Object.values(state.sideboardLayout).map(p => p.z || 100)) + 1;
      el.style.zIndex = String(pos.z);

      function move(ev){
        pos.x = start.left + (ev.clientX - start.x);
        pos.y = start.top + (ev.clientY - start.y);
        el.style.left = `${pos.x}px`;
        el.style.top = `${pos.y}px`;
      }

      function up(ev){
        document.removeEventListener("pointermove", move);
        document.removeEventListener("pointerup", up);
        el.classList.remove("dragging");

        const target = ev.target.closest && ev.target.closest(".sideboard-grid");
        const targetArea = target === els.sideboardGrid ? "side" : target === els.mainboardGrid ? "main" : area;

        if(targetArea !== area){
          if(area === "main" && targetArea === "side") v47MoveCardToSide(card.id, {x:pos.x, y:pos.y, z:pos.z});
          if(area === "side" && targetArea === "main") v47MoveCardToMain(card.id, {x:pos.x, y:pos.y, z:pos.z});
          renderSideboardEditor(false);
        } else {
          saveState();
        }
      }

      document.addEventListener("pointermove", move);
      document.addEventListener("pointerup", up, {once:true});
    });

    return el;
  }

  function v47MoveCardToSide(cardId, keepPos=null){
    const card = state.cards.find(c => c.id === cardId);
    if(!card) return;

    const sideCardsBefore = sortedSide("p1");
    state.cards = state.cards.filter(c => c.id !== cardId);
    if(!state.sideboardCards) state.sideboardCards = [];
    state.sideboardCards.push({...card, zone:"sideboard", tapped:false, faceDown:false});

    ensureSideboardLayout();
    state.sideboardLayout[cardId] = keepPos
      ? {...keepPos, area:"side"}
      : rightmostBottomPosition(sideCardsBefore, "side");

    saveState();
  }

  function v47MoveCardToMain(cardId, keepPos=null){
    const card = (state.sideboardCards || []).find(c => c.id === cardId);
    if(!card) return;

    const mainCardsBefore = sortedMain("p1");
    state.sideboardCards = state.sideboardCards.filter(c => c.id !== cardId);
    state.cards.push({...card, zone:"p1-library", tapped:false, faceDown:false});

    ensureSideboardLayout();
    state.sideboardLayout[cardId] = keepPos
      ? {...keepPos, area:"main"}
      : rightmostBottomPosition(mainCardsBefore, "main");

    saveState();
  }

  renderSideboardEditor = function(resetLayout=false){
    const p = "p1";
    state.activePlayer = "p1";
    if(els.activePlayerSelect) els.activePlayerSelect.value = "p1";

    ensureSideboardLayout();
    if(resetLayout || !Object.keys(state.sideboardLayout).length) resetSideboardEditorLayout();

    els.mainboardGrid.innerHTML = "";
    els.sideboardGrid.innerHTML = "";

    const main = sortedMain(p);
    const side = sortedSide(p);

    if(els.mainboardCount) els.mainboardCount.textContent = main.length;
    if(els.sideboardCount) els.sideboardCount.textContent = side.length;

    main.forEach(card => els.mainboardGrid.appendChild(makeFreeCard(card, "main")));
    side.forEach(card => els.sideboardGrid.appendChild(makeFreeCard(card, "side")));
  };

  openSideboardEditor = function(){
    if(!confirm("reset game and go to editor ?")) return;
    state.cards = state.cards.map(c=>{
      if((c.owner || "p1") === "p1" && !c.token) return {...c, zone:"p1-library", tapped:false, faceDown:false};
      return c;
    });
    resetSideboardEditorLayout();
    saveState();
    renderSideboardEditor(false);
    els.sideboardModal.classList.remove("hidden");
    if(state.showOraclePanel !== false && els.oraclePanel) els.oraclePanel.classList.remove("hidden");
  };

  moveOneToSide = function(name){
    const card = sortedMain("p1").find(c => c.name === name);
    if(card) v47MoveCardToSide(card.id);
  };

  moveOneToMain = function(name){
    const card = sortedSide("p1").find(c => c.name === name);
    if(card) v47MoveCardToMain(card.id);
  };

  els.sideboardBtn?.addEventListener("click",(e)=>{
    e.preventDefault();
    openSideboardEditor();
  });
})();


// v48: final oracle root layer + sideboard single-confirm binding.
(function(){
  function ensureOracleRoot(){
    let panel = document.getElementById("oraclePanel");

    if(!panel){
      panel = document.createElement("div");
      panel.id = "oraclePanel";
      panel.className = "oracle-panel hidden";
      const img = document.createElement("img");
      img.id = "oraclePanelImage";
      img.alt = "";
      const txt = document.createElement("div");
      txt.id = "oraclePanelText";
      panel.appendChild(img);
      panel.appendChild(txt);
    }

    // Move it to body root so no transformed parent/stacking context can hide it.
    if(panel.parentElement !== document.body){
      document.body.appendChild(panel);
    }

    els.oraclePanel = panel;
    els.oraclePanelImage = document.getElementById("oraclePanelImage");
    els.oraclePanelText = document.getElementById("oraclePanelText");
  }

  function isForbiddenOracleCard(card){
    if(!card) return true;

    // Never show opponent hand or any library.
    if(card.zone && card.zone.endsWith("-library")) return true;
    if(card.zone === "p2-hand") return true;

    // Own hand is allowed. Battlefield/grave/exile/sideboard/editor are allowed.
    return false;
  }

  function oracleText(card){
    const type = card.typeLine || card.type_line || "";
    const oracle = card.oracle || card.printed_text || "";
    return [card.name || "", type, "", oracle].join("\n").trim();
  }

  function showOracleRoot(card){
    ensureOracleRoot();
    if(state.showOraclePanel === false || isForbiddenOracleCard(card)){
      els.oraclePanel?.classList.add("hidden");
      return;
    }

    els.oraclePanelImage.src = card.image || "";
    els.oraclePanelImage.alt = card.name || "";
    els.oraclePanelText.textContent = oracleText(card);
    els.oraclePanel.classList.remove("hidden");
  }

  showOracle = function(card){ showOracleRoot(card); };
  hideOracle = function(){ /* keep last hovered card visible */ };

  // One authoritative hover listener.
  document.addEventListener("pointerover", (e)=>{
    const node = e.target.closest && e.target.closest("[data-card-id]");
    if(!node) return;

    const id = node.dataset.cardId;
    const card = state.cards.find(c=>c.id===id)
      || (state.sideboardCards || []).find(c=>c.id===id);

    if(card) showOracleRoot(card);
  }, true);

  // Toggle in menu.
  els.showOracleCheck?.addEventListener("change", ()=>{
    state.showOraclePanel = !!els.showOracleCheck.checked;
    if(!state.showOraclePanel) els.oraclePanel?.classList.add("hidden");
    saveState();
  });
  if(els.showOracleCheck) els.showOracleCheck.checked = state.showOraclePanel !== false;

  // Make sideboard modal transparent to oracle layer.
  const sideModal = document.getElementById("sideboardModal");
  if(sideModal) sideModal.style.background = "transparent";

  // Sideboard button: replace node to remove all earlier duplicate listeners/confirms.
  function bindSideboardButtonOnce(){
    const oldBtn = document.getElementById("sideboardBtn");
    if(!oldBtn) return;

    const newBtn = oldBtn.cloneNode(true);
    oldBtn.replaceWith(newBtn);

    newBtn.addEventListener("click", (e)=>{
      e.preventDefault();
      e.stopImmediatePropagation();

      if(!confirm("reset game and go to editor ?")) return;

      // Same behavior as latest editor, but without calling old confirm wrappers.
      state.cards = state.cards.map(c=>{
        if((c.owner || "p1") === "p1" && !c.token) {
          return {...c, zone:"p1-library", tapped:false, faceDown:false};
        }
        return c;
      });

      if(typeof resetSideboardEditorLayout === "function") resetSideboardEditorLayout();
      saveState();
      renderSideboardEditor(false);
      els.sideboardModal.classList.remove("hidden");
      if(state.showOraclePanel !== false) els.oraclePanel?.classList.remove("hidden");
    }, true);
  }

  // expose layout reset if v47 kept it private; fallback is to clear layout.
  if(typeof resetSideboardEditorLayout !== "function"){
    window.resetSideboardEditorLayout = function(){
      state.sideboardLayout = {};
    };
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", ()=>{
      ensureOracleRoot();
      bindSideboardButtonOnce();
    });
  } else {
    ensureOracleRoot();
    bindSideboardButtonOnce();
  }
})();


// v49: shuffle only library visual; sideboard cards stay topmost while dragging; fix headings.
(function(){
  // Fix headings at runtime too, because older code/HTML may have stale text.
  function fixSideboardHeadings(){
    const mainTitle = document.querySelector("#mainboardGrid")?.closest("section")?.querySelector("h2");
    const sideTitle = document.querySelector("#sideboardGrid")?.closest("section")?.querySelector("h2");
    if(mainTitle) mainTitle.innerHTML = `MAIN (<span id="mainboardCount">${els.mainboardCount?.textContent || "0"}</span>)`;
    if(sideTitle) sideTitle.innerHTML = `SIDE (<span id="sideboardCount">${els.sideboardCount?.textContent || "0"}</span>)`;
    // refresh els refs after replacing spans
    els.mainboardCount = document.getElementById("mainboardCount");
    els.sideboardCount = document.getElementById("sideboardCount");
  }

  // Shuffle: animate pXLibraryVisual only. Never animate pXLibraryZone or pile-column.
  const previousShuffle = shuffleLibrary;
  shuffleLibrary = function(player){
    const zone = els[`${player}LibraryZone`];
    const visual = els[`${player}LibraryVisual`];

    if(zone) zone.classList.remove("shuffling");
    if(visual){
      visual.classList.remove("shuffling", "library-shuffle-visual");
      void visual.offsetWidth;
      visual.classList.add("library-shuffle-visual");
      setTimeout(()=>visual.classList.remove("library-shuffle-visual"), 1100);
    }

    // Do the actual shuffle without letting older wrapper shake the whole zone if possible.
    const lib = zoneCards(`${player}-library`);
    const others = state.cards.filter(c => c.zone !== `${player}-library`);
    state.cards = others.concat(shuffleArray(lib));
    saveState();
    render();
  };

  // Keep sideboard cards above everything during editor drags, and allow drop across the entire visible areas.
  function bindSideboardLayerGuards(){
    for(const grid of [els.mainboardGrid, els.sideboardGrid]){
      if(!grid || grid.__v49Bound) continue;
      grid.__v49Bound = true;
      grid.addEventListener("dragenter",()=>grid.dataset.dropActive = "true");
      grid.addEventListener("dragleave",()=>grid.dataset.dropActive = "false");
      grid.addEventListener("drop",()=>grid.dataset.dropActive = "false");
    }

    document.querySelectorAll(".sideboard-free-card,.sideboard-stack-card").forEach(el=>{
      el.style.zIndex = el.classList.contains("dragging") ? "99999" : (el.style.zIndex || "5000");
      if(el.__v49Bound) return;
      el.__v49Bound = true;
      el.addEventListener("pointerdown",()=>{ el.style.zIndex = "99999"; }, true);
      el.addEventListener("dragstart",()=>{ el.style.zIndex = "99999"; }, true);
      el.addEventListener("dragend",()=>{ el.style.zIndex = "5000"; }, true);
    });
  }

  const previousRenderSideboardEditor = renderSideboardEditor;
  renderSideboardEditor = function(...args){
    previousRenderSideboardEditor(...args);
    fixSideboardHeadings();
    bindSideboardLayerGuards();
  };

  const previousRender = render;
  render = function(){
    previousRender();
    // remove old whole-zone shuffle class if any previous wrapper added it
    for(const p of ["p1","p2"]){
      els[`${p}LibraryZone`]?.classList.remove("shuffling");
    }
  };

  fixSideboardHeadings();
})();


// v61: simple one-token add system. No Citadel/AIIIEEE switch, no token fan.
// Select token name from green menu list, click ADD TOKEN, token appears center of p1 battlefield.
(function(){
  const TOKEN_FILE_NAMES_V61 = {
    "minor demon": "minor-demon",
    "sand warrior": "sand-warrior",
    "camarid": "camarid",
    "rukh": "rukh",
    "tetravite": "tetravite",
    "snake": "snake",
    "wasp": "wasp",
    "wolf": "wolf",
    "thrull": "thrull",
    "saproling": "saproling",
    "djinn": "djinn",
    "stangg": "stangg",
    "citizen": "citizen",
    "goblin": "goblin"
  };

  function tokenImagePath(name){
    const file = TOKEN_FILE_NAMES_V61[name] || name.replaceAll(" ", "-");
    return `token/${file}.png`;
  }

  function simpleAddToken(){
    const select = document.getElementById("menuTokenNameSelect");
    const name = select ? select.value : "rukh";
    const image = tokenImagePath(name);

    state.cards.push({
      id: uid(),
      owner: "p1",
      zone: "battlefield",
      tapped: false,
      faceDown: false,
      x: innerWidth / 2 - CARD_W / 2,
      y: innerHeight * 0.70 - CARD_H / 2,
      z: Math.max(1, ...state.cards.map(c => c.z || 1)) + 1,
      token: true,
      tokenBack: "aieback.png",
      name,
      image,
      oracle: "",
      typeLine: "Token",
      manaCost: "",
      set: "token"
    });

    saveState();
    render();
  }

  // Remove/disable token modal fan behavior.
  const modal = document.getElementById("tokenModal");
  if(modal){
    modal.classList.add("hidden");
    modal.classList.remove("token-fan-mode");
  }

  // Hard rebind Add Token button; old listeners are bypassed by clone.
  const old = document.getElementById("menuAddTokenBtn");
  if(old){
    const btn = old.cloneNode(true);
    old.replaceWith(btn);
    els.menuAddTokenBtn = btn;
    btn.addEventListener("click", (e)=>{
      e.preventDefault();
      e.stopImmediatePropagation();
      simpleAddToken();
    }, true);
  }

  // Make sure Rukh is default.
  const select = document.getElementById("menuTokenNameSelect");
  if(select) select.value = "rukh";
})();






// v71 menu part preserved
(function(){
  function getMenu(){ return document.getElementById("cardMenu") || els.cardMenu || document.querySelector(".context-menu:not(#diceMenu)"); }
  function addButton(menu,label,fn){
    const b=document.createElement("button");
    b.type="button"; b.dataset.cardMenuKeep="1"; b.textContent=label;
    b.addEventListener("click",(e)=>{e.preventDefault(); e.stopPropagation(); fn(); closeMenus?.();});
    menu.appendChild(b);
  }
  function flipFace(card){ card.faceDown=!card.faceDown; saveState(); render(); }
  function cloneToken(card){ state.cards.push({...card,id:uid(),token:true,x:(card.x||0)+28,y:(card.y||0)+28,z:Math.max(1,...state.cards.map(c=>c.z||1))+1}); saveState(); render(); }
  function sendBack(card){ card.z=1; saveState(); render(); }
  function bringFront(card){ card.z=Math.max(1,...state.cards.map(c=>c.z||1))+1; saveState(); render(); }

  const originalOpenCardMenu = openCardMenu;
  openCardMenu = function(e, card){
    e.preventDefault();
    const menu=getMenu();
    if(!menu){ originalOpenCardMenu(e,card); return; }
    menu.innerHTML="";
    menu.style.display="block";
    menu.style.left=e.clientX+"px";
    menu.style.top=e.clientY+"px";
    addButton(menu,"FLIP CARD",()=>flipFace(card));
    addButton(menu,"CLONE TOKEN",()=>cloneToken(card));
    addButton(menu,"SEND TO BACK",()=>sendBack(card));
    addButton(menu,"BRING TO FRONT",()=>bringFront(card));
    addButton(menu,"ORBFLIP",()=>openOrbflip(card));
  };
})();
















// v79: new inspector with movable inline styles that are not overridden by CSS !important.
// Also connects green menu show-inspector checkbox.
// Hover-to-front fix: renderBattlefield is patched so z-index is always card.z only.
(function(){
  function ready(fn){
    if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn, {once:true});
    else fn();
  }

  ready(function(){
    document.querySelectorAll("#cardInspectorV62,#inspectorWindowV73,#cardInspectorV79").forEach(el => el.remove());

    const box = document.createElement("div");
    box.id = "cardInspectorV79";
    box.innerHTML = `
      <div id="inspectorDragBarV79">INSPECTOR</div>
      <div id="inspectorContentV79">hover a visible card</div>
      <div id="inspectorResizeV79"></div>
    `;
    document.body.appendChild(box);

    const bar = document.getElementById("inspectorDragBarV79");
    const content = document.getElementById("inspectorContentV79");
    const resize = document.getElementById("inspectorResizeV79");
    const showCheck = document.getElementById("showOracleCheck");

    const pos = {
      x: 18,
      y: Math.round(innerHeight * .5 + 24),
      w: 260,
      h: 170
    };

    function draw(){
      // setProperty with priority keeps this working even if old CSS uses !important elsewhere
      box.style.setProperty("left", pos.x + "px", "important");
      box.style.setProperty("top", pos.y + "px", "important");
      box.style.setProperty("width", pos.w + "px", "important");
      box.style.setProperty("height", pos.h + "px", "important");
      box.style.setProperty("bottom", "auto", "important");
      box.style.setProperty("right", "auto", "important");
    }

    function applyVisibility(){
      const visible = !showCheck || showCheck.checked;
      box.style.setProperty("display", visible ? "block" : "none", "important");
    }

    if(showCheck){
      showCheck.checked = true;
      showCheck.addEventListener("change", applyVisibility);
    }

    function esc(str){
      return String(str ?? "").replace(/[&<>"]/g, ch => ({
        "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"
      }[ch]));
    }

    function allCards(){
      return state.cards.concat(state.sideboardCards || []);
    }

    function allowed(card){
      if(!card) return false;
      if(card.zone && card.zone.endsWith("-library")) return false;
      if(card.zone === "p2-hand") return false;
      return true;
    }

    function cardFromTarget(target){
      const node = target && target.closest ? target.closest("[data-card-id]") : null;
      if(!node) return null;
      return allCards().find(c => c.id === node.dataset.cardId) || null;
    }

    function renderInspector(card){
      if(!allowed(card)) return;
      const type = card.typeLine || card.type_line || "";
      const oracle = card.oracle || card.printed_text || card.text || "No Oracle text.";
      content.innerHTML = `<div class="ci-name">${esc(card.name || "")} ${esc(card.manaCost || "")}</div>
<div class="ci-type">${esc(type)}</div>
<div>${esc(oracle)}</div>`;
    }

    showOracle = function(card){ renderInspector(card); };
    hideOracle = function(){};

    document.addEventListener("mouseover", e => {
      if(mode) return;
      const card = cardFromTarget(e.target);
      if(card) renderInspector(card);
    }, true);

    document.addEventListener("mousemove", e => {
      if(mode) return;
      const card = cardFromTarget(e.target);
      if(card) renderInspector(card);
    }, true);

    let mode = null;

    function stop(e){
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    }

    bar.addEventListener("pointerdown", e => {
      mode = { type:"move", dx:e.clientX - pos.x, dy:e.clientY - pos.y };
      bar.classList.add("dragging");
      stop(e);
    }, true);

    resize.addEventListener("pointerdown", e => {
      mode = { type:"resize", startX:e.clientX, startY:e.clientY, startW:pos.w, startH:pos.h };
      stop(e);
    }, true);

    document.addEventListener("pointermove", e => {
      if(!mode) return;

      if(mode.type === "move"){
        pos.x = Math.max(0, Math.min(innerWidth - 40, e.clientX - mode.dx));
        pos.y = Math.max(0, Math.min(innerHeight - 40, e.clientY - mode.dy));
      }

      if(mode.type === "resize"){
        pos.w = Math.max(140, Math.min(560, mode.startW + e.clientX - mode.startX));
        pos.h = Math.max(80, Math.min(innerHeight * .7, mode.startH + e.clientY - mode.startY));
      }

      draw();
      stop(e);
    }, true);

    document.addEventListener("pointerup", e => {
      if(!mode) return;
      mode = null;
      bar.classList.remove("dragging");
      stop(e);
    }, true);

    draw();
    applyVisibility();

    // render patch: keep battlefield z-order exactly card.z, never hover order.
    const previousRenderBattlefield = renderBattlefield;
    renderBattlefield = function(){
      previousRenderBattlefield();
      document.querySelectorAll(".battle-card[data-card-id]").forEach(el => {
        const c = state.cards.find(card => card.id === el.dataset.cardId);
        if(c) el.style.setProperty("z-index", String(c.z || 1), "important");
        el.classList.remove("hover","hovered","front-hover");
      });
    };

    // after any hover/move, reassert z-indexes on battlefield
    document.addEventListener("mouseover", () => {
      document.querySelectorAll(".battle-card[data-card-id]").forEach(el => {
        const c = state.cards.find(card => card.id === el.dataset.cardId);
        if(c) el.style.setProperty("z-index", String(c.z || 1), "important");
      });
    }, true);
  });
})();


// v81: restrict play-from-hand to battlefield bounds; pile drops are exact; library asks top/bottom/cancel.
(function(){
  function ready(fn){
    if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn, {once:true});
    else fn();
  }

  ready(function(){
    if(!document.getElementById("battlefieldBoundsV81")){
      const r = document.createElement("div");
      r.id = "battlefieldBoundsV81";
      document.body.appendChild(r);
    }

    if(!document.getElementById("libraryDropChoiceV81")){
      const m = document.createElement("div");
      m.id = "libraryDropChoiceV81";
      m.className = "hidden";
      m.innerHTML = `
        <button type="button" data-choice="top">TOP</button>
        <button type="button" data-choice="bottom">BOTTOM</button>
        <button type="button" data-choice="cancel">CANCEL</button>
      `;
      document.body.appendChild(m);
    }

    const choice = document.getElementById("libraryDropChoiceV81");

    function ownBattleRect(){
      const inset = 6;
      return { left: inset, top: inset, right: innerWidth - inset, bottom: innerHeight - inset, width: innerWidth - inset * 2, height: innerHeight - inset * 2 };
    }

    function pointInRect(x,y,r){
      return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    }

    function updateBoundsVisual(){
      const el = document.getElementById("battlefieldBoundsV81");
      const r = ownBattleRect();
      el.style.left = r.left + "px";
      el.style.top = r.top + "px";
      el.style.width = (r.right - r.left) + "px";
      el.style.height = (r.bottom - r.top) + "px";
    }

    const oldRender = render;
    render = function(){
      oldRender();
      updateBoundsVisual();
    };
    updateBoundsVisual();
    addEventListener("resize", updateBoundsVisual);

    function exactPileAt(x,y){
      const piles = [
        els.p1LibraryZone,
        els.p1GraveyardZone,
        els.p1ExileZone,
        els.p2LibraryZone,
        els.p2GraveyardZone,
        els.p2ExileZone
      ].filter(Boolean);

      for(const el of piles){
        const r = el.getBoundingClientRect();
        if(pointInRect(x,y,r)) return el;
      }
      return null;
    }

    function hideChoice(){
      choice.classList.add("hidden");
      choice.__pending = null;
    }

    function askLibraryDrop(card, libraryEl, x, y){
      choice.style.left = Math.min(innerWidth - 190, x + 10) + "px";
      choice.style.top = Math.min(innerHeight - 48, y + 10) + "px";
      choice.classList.remove("hidden");
      choice.__pending = { cardId: card.id, zone: libraryEl.dataset.zone };
    }

    choice.addEventListener("click", e => {
      const btn = e.target.closest("button[data-choice]");
      if(!btn) return;
      e.preventDefault();
      e.stopPropagation();

      const pending = choice.__pending;
      const selected = btn.dataset.choice;
      hideChoice();

      if(!pending || selected === "cancel") {
        render();
        return;
      }

      const card = state.cards.find(c => c.id === pending.cardId);
      if(!card) return;

      // remove card from current zone by just changing the zone.
      card.zone = pending.zone;
      card.owner = pending.zone.startsWith("p2") ? "p2" : "p1";
      card.tapped = false;
      card.faceDown = true;

      // Reorder by rebuilding state.cards so library order means actual array order.
      state.cards = state.cards.filter(c => c.id !== card.id);

      if(selected === "top"){
        state.cards.push(card);
      } else {
        // bottom = before all current cards in that library
        const firstLibIndex = state.cards.findIndex(c => c.zone === pending.zone);
        if(firstLibIndex === -1) state.cards.unshift(card);
        else state.cards.splice(firstLibIndex, 0, card);
      }

      saveState();
      render();
    }, true);

    // Keep pile dropping exact during drag, so cards do not get stuck under/around deck area.
    const previousOnCardDragEnd = onCardDragEnd;
    onCardDragEnd = function(e){
      const drag = state.dragging;
      const card = state.cards.find(c => c.id === drag?.cardId);

      if(!card){
        previousOnCardDragEnd(e);
        return;
      }

      const exactPile = exactPileAt(e.clientX, e.clientY);
      if(exactPile){
        document.removeEventListener("pointermove", onCardDragMove);
        els.p1HandZone?.classList.remove("drop-hover");
        els.p2HandZone?.classList.remove("drop-hover");
        state.dragging = null;
        hideDropHint?.();

        const zone = exactPile.dataset.zone;
        const kind = kindOfZone(zone);

        if(kind === "library"){
          askLibraryDrop(card, exactPile, e.clientX, e.clientY);
          render();
          return;
        }

        if(kind === "graveyard" || kind === "exile"){
          card.zone = zone;
          card.owner = zone.startsWith("p2") ? "p2" : "p1";
          card.tapped = false;
          card.faceDown = false;
          card.z = Math.max(1, ...state.cards.map(c => c.z || 1)) + 1;
          saveState();
          render();
          return;
        }
      }
      // Shared-table mode: hand cards may be played anywhere on the table.

      previousOnCardDragEnd(e);
    };

    // Shared-table mode: do not clamp battlefield cards to either half.
    const previousOnCardDragMove = onCardDragMove;
    onCardDragMove = function(e){
      previousOnCardDragMove(e);
    };

    // Press B to show/hide battlefield debug border while tuning.
    document.addEventListener("keydown", e => {
      if(e.key.toLowerCase() === "b" && e.altKey){
        document.getElementById("battlefieldBoundsV81")?.classList.toggle("debug");
      }
    });
  });
})();




// v83 sideboard editor drag z-index hard fix.
// If an editor card is being dragged, put it in a top fixed drag layer while dragging.
(function(){
  function ensureLayer(){
    let layer = document.getElementById("sideboardDragLayer");
    if(!layer){
      layer = document.createElement("div");
      layer.id = "sideboardDragLayer";
      document.body.appendChild(layer);
    }
    return layer;
  }

  document.addEventListener("pointerdown", e => {
    const card = e.target.closest?.(".sideboard-free-card,.sideboard-stack-card,.sideboard-card,.sb-card");
    if(!card) return;
    card.dataset.dragging = "1";
    card.classList.add("dragging");
    card.style.setProperty("z-index", "2147483200", "important");
  }, true);

  document.addEventListener("pointermove", e => {
    document.querySelectorAll(".sideboard-free-card.dragging,.sideboard-stack-card.dragging,.sideboard-card.dragging,.sb-card.dragging").forEach(card => {
      card.style.setProperty("z-index", "2147483200", "important");
    });
  }, true);

  document.addEventListener("pointerup", () => {
    document.querySelectorAll(".sideboard-free-card.dragging,.sideboard-stack-card.dragging,.sideboard-card.dragging,.sb-card.dragging").forEach(card => {
      card.classList.remove("dragging");
      delete card.dataset.dragging;
      card.style.removeProperty("z-index");
    });
  }, true);
})();


// v84: clean single flip system and OG BACK 2 support.
// Uses uploaded v5 behavior: drag card normally to position, SHIFT+hold charges, arrow up/down changes height.
// Front images: chaosfront.png / fallingstar.png. Back image: lapi2.png.
(function(){
  function ready(fn){
    if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn, {once:true});
    else fn();
  }

  ready(function(){
    const overlay = document.getElementById("flipOverlayV80");
    const orb = document.getElementById("flipCardV80");
    const orbImg = document.getElementById("flipImgV80");
    const shadow = document.getElementById("flipShadowV80");
    const forcePoint = document.getElementById("flipForceV80");
    const powerInner = document.getElementById("flipPowerInnerV80");
    const sideOrb = document.getElementById("flipSideCardV80");
    const heightLabel = document.getElementById("flipHeightV80");
    const resetBtn = document.getElementById("flipAgainV80");
    const closeBtn = document.getElementById("flipCloseV80");
    const orbBtn = document.getElementById("menuFlipOrbBtn");
    const starBtn = document.getElementById("menuFlipStarBtn");

    if(!overlay || !orb || !orbImg || !shadow || !forcePoint || !powerInner || !sideOrb || !heightLabel){
      console.warn("v84 flip overlay missing DOM");
      return;
    }

    // Remove ORBFLIP/FLIP from card menus. Green menu only.
    function cleanCardMenu(){
      document.querySelectorAll("#cardMenu button,.context-menu button").forEach(btn => {
        const t = (btn.textContent || "").trim().toUpperCase();
        if(t === "ORBFLIP" || t === "FLIP") btn.remove();
      });
    }
    document.addEventListener("contextmenu", () => {
      setTimeout(cleanCardMenu, 0);
      setTimeout(cleanCardMenu, 80);
    }, true);

    // Make OG BACK 2 actually render as lapi2.png after every render.
    const oldRenderV84 = render;
    render = function(){
      oldRenderV84();
      const sleeveSelect = document.getElementById("sleeveSelect");
      if(sleeveSelect && sleeveSelect.value === "ogback2"){
        document.querySelectorAll('.card-back img, img.card-back, .card.face-down img, .battle-card.face-down img, .hand-card.face-down img').forEach(img => {
          img.src = "lapi2.png";
        });
        document.querySelectorAll('[data-facedown="true"] img, [data-face-down="true"] img').forEach(img => {
          img.src = "lapi2.png";
        });
      }
    };

    const CARD_W = 170;
    const CARD_H = Math.round(CARD_W * 1.397);

    let frontImage = "chaosfront.png";
    const backImage = "lapi2.png";

    const st = {
      x: 0,
      y: 0,
      angle: -8,
      flip: 0,
      heightCm: 30,
      vx: 0,
      vy: 0,
      spin: 0,
      vh: 0,
      phase: "idle",
      charging: false,
      chargeStart: 0,
      chargeLocalX: 0,
      chargeLocalY: 0,
      anim: null
    };

    function heightScale(){
      return 1 + st.heightCm / 70;
    }

    function applyOrb(){
      orb.style.left = st.x + "px";
      orb.style.top = st.y + "px";

      const rad = st.flip * Math.PI / 180;
      const edgeScale = Math.max(.08, Math.abs(Math.cos(rad)));
      const backVisible = Math.cos(rad) < 0;

      orbImg.src = backVisible ? backImage : frontImage;
      orb.style.transform = `rotate(${st.angle}deg) scale(${heightScale()}) scaleX(${edgeScale})`;

      shadow.style.left = (st.x + CARD_W * .06) + "px";
      shadow.style.top = (st.y + CARD_H * .06) + "px";
      shadow.style.transform = `rotate(${st.angle}deg) scale(${1 + (st.heightCm / 100)})`;
      shadow.style.opacity = String(Math.max(.08, .30 - st.heightCm / 150));

      sideOrb.style.bottom = (st.heightCm * 1.55) + "px";
      sideOrb.style.transform = `rotate(${st.flip % 180}deg)`;
      heightLabel.textContent = "HEIGHT " + Math.round(st.heightCm) + " CM";
    }

    function reset(){
      cancelAnimationFrame(st.anim);
      Object.assign(st, {
        x: innerWidth / 2 - CARD_W / 2 - 160,
        y: innerHeight / 2 - CARD_H / 2 - 20,
        angle: -8,
        flip: 0,
        heightCm: 30,
        vx: 0,
        vy: 0,
        spin: 0,
        vh: 0,
        phase: "idle",
        charging: false
      });
      orb.classList.remove("aiming", "flipping", "dragging");
      forcePoint.style.display = "none";
      powerInner.style.width = "0%";
      applyOrb();
    }

    function openFlip(front){
      frontImage = front;
      overlay.classList.remove("hidden");
      overlay.style.display = "block";
      reset();
    }

    function animateFlip(){
      st.phase = "flipping";
      orb.classList.add("flipping");

      function step(){
        st.x += st.vx;
        st.y += st.vy;
        st.flip += st.spin;
        st.angle += st.spin * .012 + st.vx * .008;
        st.heightCm += st.vh;
        st.vh -= 1.1;

        if(st.heightCm <= 0){
          st.heightCm = 0;
          st.vh = 0;
        }

        st.vx *= .982;
        st.vy *= .982;
        st.spin *= .975;
        st.vy += .018;

        applyOrb();

        const speed = Math.hypot(st.vx, st.vy);
        if(st.heightCm <= 0 && Math.abs(st.spin) < 1.6 && speed < .9){
          st.phase = "landed";
          orb.classList.remove("flipping");
          st.flip = Math.round(st.flip / 180) * 180;
          st.angle += (Math.random() - .5) * 10;
          applyOrb();
          return;
        }

        st.anim = requestAnimationFrame(step);
      }
      step();
    }

    function powerNow(){
      if(!st.charging) return 0;
      return Math.min(1, (performance.now() - st.chargeStart) / 900);
    }

    let dragOrb = null;

    orb.addEventListener("pointerdown", e => {
      if(overlay.classList.contains("hidden")) return;
      if(st.phase === "flipping") return;

      const r = orb.getBoundingClientRect();

      // Plain drag moves it. Shift+hold charges/flips.
      if(!e.shiftKey){
        dragOrb = { dx: e.clientX - r.left, dy: e.clientY - r.top };
        orb.classList.add("dragging");
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      st.charging = true;
      st.chargeStart = performance.now();
      st.chargeLocalX = (e.clientX - r.left) / r.width - .5;
      st.chargeLocalY = (e.clientY - r.top) / r.height - .5;

      orb.classList.add("aiming");
      forcePoint.style.display = "block";
      forcePoint.style.left = e.clientX + "px";
      forcePoint.style.top = e.clientY + "px";

      e.preventDefault();
      e.stopPropagation();
    }, true);

    document.addEventListener("pointermove", e => {
      if(overlay.classList.contains("hidden")) return;

      if(dragOrb){
        st.x = e.clientX - dragOrb.dx;
        st.y = e.clientY - dragOrb.dy;
        applyOrb();
      }

      if(st.charging){
        forcePoint.style.left = e.clientX + "px";
        forcePoint.style.top = e.clientY + "px";
      }
    }, true);

    document.addEventListener("pointerup", e => {
      if(overlay.classList.contains("hidden")) return;

      if(dragOrb){
        dragOrb = null;
        orb.classList.remove("dragging");
        return;
      }

      if(!st.charging) return;

      const p = powerNow();
      st.charging = false;
      orb.classList.remove("aiming");
      forcePoint.style.display = "none";
      powerInner.style.width = "0%";

      const lx = st.chargeLocalX;
      const ly = st.chargeLocalY;

      st.vx = lx * 7.5;
      st.vy = ly * 5.0 - p * 2.2;
      st.vh = 4 + p * 6;
      st.spin = (lx * 22 + ly * 12) * p;
      if(Math.abs(st.spin) < 8) st.spin = (lx >= 0 ? 1 : -1) * (8 + p * 10);
      st.spin *= .55;

      animateFlip();
    }, true);

    function chargeLoop(){
      if(st.charging){
        powerInner.style.width = (powerNow() * 100) + "%";
      }
      requestAnimationFrame(chargeLoop);
    }
    chargeLoop();

    resetBtn?.addEventListener("click", e => {
      e.preventDefault();
      reset();
    });

    closeBtn?.addEventListener("click", e => {
      e.preventDefault();
      cancelAnimationFrame(st.anim);
      overlay.classList.add("hidden");
    });

    document.addEventListener("keydown", e => {
      if(overlay.classList.contains("hidden")) return;

      if(e.key === "ArrowUp"){
        e.preventDefault();
        e.stopImmediatePropagation();
        st.heightCm = Math.min(60, st.heightCm + 2);
        applyOrb();
      }

      if(e.key === "ArrowDown"){
        e.preventDefault();
        e.stopImmediatePropagation();
        st.heightCm = Math.max(0, st.heightCm - 2);
        applyOrb();
      }

      if(e.key === "Escape"){
        e.preventDefault();
        e.stopImmediatePropagation();
        cancelAnimationFrame(st.anim);
        overlay.classList.add("hidden");
      }
    }, true);

    if(orbBtn){
      orbBtn.onclick = e => {
        e.preventDefault();
        e.stopPropagation();
        openFlip("chaosfront.png");
      };
    }

    if(starBtn){
      starBtn.onclick = e => {
        e.preventDefault();
        e.stopPropagation();
        openFlip("fallingstar.png");
      };
    }
  });
})();










// v89: sideboard drag proxy + slower, cleaner, movable flip physics.
// Sideboard fix: dragged card is copied to a body-level proxy above both MAIN and SIDE panels.
// Flip fix: side panel is draggable again; side scale: 80 px ≈ 30 cm; motion is slower;
// click position maps to physical axes: short-side flick -> pitch, long-side flick -> roll,
// diagonal/corner flick -> mixed axis.
(function(){
  function ready(fn){
    if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn, {once:true});
    else fn();
  }

  ready(function(){
    // ---------- Playmat dropdown retained ----------
    const playmatFiles = __PLAYMAT_FILES__;
    let mat = document.getElementById("playmatV87");
    if(!mat){
      mat = document.createElement("div");
      mat.id = "playmatV87";
      mat.className = "playmat-v87";
      document.body.prepend(mat);
    }
    const select = document.getElementById("menuPlaymatSelect");
    if(select){
      if(select.options.length <= 1){
        playmatFiles.forEach(fn => {
          const opt = document.createElement("option");
          opt.value = fn;
          opt.textContent = fn;
          select.appendChild(opt);
        });
      }
      select.addEventListener("change", () => {
        mat.style.backgroundImage = select.value ? `url("playmat/${select.value}")` : "";
      });
    }

    // ---------- Sideboard drag proxy ----------
    let sbProxy = null;
    let sbSource = null;
    let sbOff = {x:0,y:0};

    function sideboardOpen(){
      const m = document.getElementById("sideboardModal");
      return m && !m.classList.contains("hidden") && getComputedStyle(m).display !== "none";
    }

    function sideCardEl(target){
      if(!sideboardOpen()) return null;
      return target.closest?.(
        ".sideboard-free-card,.sideboard-stack-card,.sideboard-card,.sb-card," +
        "[data-sideboard-card-id],#sideboardModal [data-card-id]"
      );
    }

    function makeProxy(el,e){
      const r = el.getBoundingClientRect();
      sbOff = { x:e.clientX-r.left, y:e.clientY-r.top };
      sbSource = el;
      sbSource.classList.add("sb-source-hidden-v89");

      sbProxy = document.createElement("div");
      sbProxy.className = "sbProxyV89";
      sbProxy.style.left = r.left + "px";
      sbProxy.style.top = r.top + "px";
      sbProxy.style.width = r.width + "px";
      sbProxy.style.height = r.height + "px";

      const img = el.querySelector("img");
      if(img){
        const clone = document.createElement("img");
        clone.src = img.src;
        sbProxy.appendChild(clone);
      } else {
        sbProxy.textContent = el.textContent || "";
        sbProxy.style.color = "#fff";
        sbProxy.style.background = "#111";
        sbProxy.style.padding = "6px";
        sbProxy.style.boxSizing = "border-box";
      }

      document.body.appendChild(sbProxy);
    }

    document.addEventListener("pointerdown", e => {
      const el = sideCardEl(e.target);
      if(!el) return;
      makeProxy(el,e);
    }, true);

    document.addEventListener("pointermove", e => {
      if(!sbProxy) return;
      sbProxy.style.left = (e.clientX - sbOff.x) + "px";
      sbProxy.style.top = (e.clientY - sbOff.y) + "px";
    }, true);

    document.addEventListener("pointerup", () => {
      if(sbProxy){
        sbProxy.remove();
        sbProxy = null;
      }
      if(sbSource){
        sbSource.classList.remove("sb-source-hidden-v89");
        sbSource = null;
      }
    }, true);

    // ---------- Flip overlay ----------
    const overlay = document.getElementById("flipOverlayV80");
    const cardEl = document.getElementById("flipCardV80");
    const imgEl = document.getElementById("flipImgV80");
    const shadowEl = document.getElementById("flipShadowV80");
    const forceEl = document.getElementById("flipForceV80");
    const heightEl = document.getElementById("flipHeightV80");
    const sideCardElV = document.getElementById("flipSideCardV80");
    const panelEl = document.getElementById("flipPanelV80");
    const powerInner = document.getElementById("flipPowerInnerV80");
    const resetBtn = document.getElementById("flipAgainV80");
    const closeBtn = document.getElementById("flipCloseV80");
    const orbBtn = document.getElementById("menuFlipOrbBtn");
    const starBtn = document.getElementById("menuFlipStarBtn");

    const CW = 170, CH = Math.round(CW * 1.397);
    let front = "chaosfront.png";
    const back = "lapi2.png";
    let anim = null;
    let dragCard = null;

    const st = {
      x: innerWidth/2 - CW/2,
      y: innerHeight/2 - CH/2,
      z: 30,
      vx: 0, vy: 0, vz: 0,
      yaw: -8,
      roll: 0, pitch: 0,
      wRoll: 0, wPitch: 0, wYaw: 0,
      charging: false,
      chargeStart: 0,
      lx: 0, ly: 0,
      phase: "idle",
      bounces: 0,
      slideFrames: 0
    };

    // Movable side diagram, drag from HEIGHT label.
    if(panelEl && heightEl && !panelEl.__v89Movable){
      panelEl.__v89Movable = true;
      let pd = null;
      const pp = { x:18, y:Math.round(innerHeight*.5 + 18) };

      function drawPanel(){
        panelEl.style.setProperty("left", pp.x + "px", "important");
        panelEl.style.setProperty("top", pp.y + "px", "important");
        panelEl.style.setProperty("right", "auto", "important");
        panelEl.style.setProperty("bottom", "auto", "important");
      }

      heightEl.addEventListener("pointerdown", e => {
        const r = panelEl.getBoundingClientRect();
        pd = { dx:e.clientX-r.left, dy:e.clientY-r.top };
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      }, true);

      document.addEventListener("pointermove", e => {
        if(!pd) return;
        pp.x = Math.max(0, Math.min(innerWidth-80, e.clientX-pd.dx));
        pp.y = Math.max(0, Math.min(innerHeight-80, e.clientY-pd.dy));
        drawPanel();
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      }, true);

      document.addEventListener("pointerup", e => {
        if(!pd) return;
        pd = null;
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      }, true);

      drawPanel();
    }

    function apply(){
      if(!cardEl || !imgEl) return;

      st.x = Math.max(-CW*.4, Math.min(innerWidth-CW*.6, st.x));
      st.y = Math.max(-CH*.4, Math.min(innerHeight-CH*.6, st.y));

      cardEl.style.left = st.x + "px";
      cardEl.style.top = st.y + "px";

      const rr = st.roll * Math.PI/180;
      const pr = st.pitch * Math.PI/180;

      // roll controls visible width, pitch controls visible height.
      const sx = Math.max(.055, Math.abs(Math.cos(rr)));
      const sy = Math.max(.16, Math.abs(Math.cos(pr)));
      const scale = 1 + st.z/70;

      imgEl.src = Math.cos(rr) < 0 ? back : front;
      cardEl.style.transform = `rotate(${st.yaw}deg) scale(${scale}) scaleX(${sx}) scaleY(${sy})`;

      if(shadowEl){
        shadowEl.style.left = (st.x + CW*.06) + "px";
        shadowEl.style.top = (st.y + CH*.06) + "px";
        shadowEl.style.transform = `rotate(${st.yaw}deg) scale(${1 + st.z/100})`;
        shadowEl.style.opacity = String(Math.max(.08,.30-st.z/150));
      }

      if(heightEl) heightEl.textContent = "HEIGHT " + Math.round(st.z) + " CM";
      if(sideCardElV){
        // 80 px ≈ 30 cm.
        sideCardElV.style.bottom = (st.z * (80/30)) + "px";
        sideCardElV.style.transform = `rotate(${(st.roll * .72 + st.pitch * .28) % 180}deg)`;
      }
    }

    function reset(){
      cancelAnimationFrame(anim);
      Object.assign(st, {
        x: innerWidth/2 - CW/2 - 160,
        y: innerHeight/2 - CH/2 - 20,
        z: 30,
        vx: 0, vy: 0, vz: 0,
        yaw: -8,
        roll: 0, pitch: 0,
        wRoll: 0, wPitch: 0, wYaw: 0,
        charging: false,
        chargeStart: 0,
        lx: 0, ly: 0,
        phase: "idle",
        bounces: 0,
        slideFrames: 0
      });
      cardEl?.classList.remove("aiming","flipping","dragging");
      if(forceEl) forceEl.style.display = "none";
      if(powerInner) powerInner.style.width = "0%";
      apply();
    }

    function open(frontFile){
      front = frontFile;
      overlay?.classList.remove("hidden");
      if(overlay) overlay.style.display = "block";
      reset();
    }

    function power(){
      // slower charge = more controllable
      return st.charging ? Math.min(1, (performance.now() - st.chargeStart) / 1500) : 0;
    }

    function launch(){
      const p = power();
      const lx = st.lx;
      const ly = st.ly;

      st.charging = false;
      cardEl.classList.remove("aiming");
      if(forceEl) forceEl.style.display = "none";
      if(powerInner) powerInner.style.width = "0%";

      // Physics model:
      // near short sides (left/right, high |x|) => pitch axis dominates
      // near long sides (top/bottom, high |y|) => roll axis dominates
      // corners => both axes + yaw twist.
      const shortSide = Math.abs(lx);
      const longSide = Math.abs(ly);
      const corner = Math.min(1, Math.hypot(lx, ly) / .70);

      st.vx = lx * (1.6 + p*1.9);
      st.vy = ly * (1.2 + p*1.6) - p * .45;
      st.vz = 1.65 + p * 2.85;

      st.wPitch = Math.sign(lx || .1) * (3.0 + p*7.0) * (0.25 + shortSide*1.9);
      st.wRoll  = Math.sign(-ly || .1) * (3.0 + p*7.0) * (0.25 + longSide*1.9);

      // If clicking corners, both axes participate and the yaw twists.
      st.wPitch *= 0.7 + corner*.55;
      st.wRoll  *= 0.7 + corner*.55;
      st.wYaw = (lx * ly) * (4.0 + p*7.0);

      // Center click: weak, unpredictable small flip.
      if(shortSide < .08 && longSide < .08){
        st.wRoll = (Math.random() > .5 ? 1 : -1) * (2.2 + p*3.0);
        st.wPitch = (Math.random() > .5 ? 1 : -1) * (1.4 + p*2.0);
      }

      st.bounces = 0;
      st.slideFrames = 0;
      animate();
    }

    function edgeLanding(){
      const flatRoll = Math.abs(Math.cos(st.roll*Math.PI/180));
      const flatPitch = Math.abs(Math.cos(st.pitch*Math.PI/180));
      return flatRoll < .50 || flatPitch < .62;
    }

    function animate(){
      st.phase = "flipping";
      cardEl.classList.add("flipping");

      function step(){
        // clear slow motion
        const dt = .30;

        st.x += st.vx * dt;
        st.y += st.vy * dt;
        st.z += st.vz * dt;

        st.roll += st.wRoll * dt;
        st.pitch += st.wPitch * dt;
        st.yaw += st.wYaw * dt;

        st.vz -= .22; // slow gravity

        if(st.z <= 0){
          st.z = 0;

          if(edgeLanding() && st.bounces < 2 && Math.abs(st.vz) > .45){
            // edge/corner bounce: visible but not endless
            st.vz = Math.abs(st.vz) * .24;
            st.vx *= .52;
            st.vy *= .52;
            st.wRoll *= .45;
            st.wPitch *= .45;
            st.wYaw *= .40;
            st.bounces += 1;
          } else {
            st.vz = 0;
            st.vx *= .72;
            st.vy *= .72;
            st.wRoll *= .62;
            st.wPitch *= .62;
            st.wYaw *= .58;
            st.slideFrames += 1;
          }
        } else {
          // air drag
          st.vx *= .992;
          st.vy *= .992;
          st.wRoll *= .992;
          st.wPitch *= .992;
          st.wYaw *= .988;
          st.vy += .0015;
        }

        // Hard slide stop: no infinite skating.
        if(st.slideFrames > 35){
          st.vx *= .55;
          st.vy *= .55;
          st.wRoll *= .50;
          st.wPitch *= .50;
          st.wYaw *= .50;
        }
        if(st.slideFrames > 70){
          st.vx = st.vy = st.vz = 0;
          st.wRoll = st.wPitch = st.wYaw = 0;
        }

        apply();

        const motion = Math.hypot(st.vx, st.vy) + Math.abs(st.wRoll)/7 + Math.abs(st.wPitch)/7 + Math.abs(st.wYaw)/7;
        if(st.z <= 0 && motion < .36){
          st.phase = "landed";
          cardEl.classList.remove("flipping");
          st.roll = Math.round(st.roll / 180) * 180;
          st.pitch = 0;
          st.vx = st.vy = st.vz = 0;
          st.wRoll = st.wPitch = st.wYaw = 0;
          apply();
          return;
        }

        anim = requestAnimationFrame(step);
      }
      step();
    }

    if(cardEl && !cardEl.__v89FlipBound){
      cardEl.__v89FlipBound = true;

      cardEl.addEventListener("pointerdown", e => {
        if(overlay.classList.contains("hidden") || st.phase === "flipping") return;
        const r = cardEl.getBoundingClientRect();

        if(!e.shiftKey){
          dragCard = { dx:e.clientX-r.left, dy:e.clientY-r.top };
          cardEl.classList.add("dragging");
          e.preventDefault();
          e.stopPropagation();
          return;
        }

        st.charging = true;
        st.chargeStart = performance.now();
        st.lx = (e.clientX-r.left)/r.width - .5;
        st.ly = (e.clientY-r.top)/r.height - .5;
        cardEl.classList.add("aiming");
        if(forceEl){
          forceEl.style.display = "block";
          forceEl.style.left = e.clientX + "px";
          forceEl.style.top = e.clientY + "px";
        }
        e.preventDefault();
        e.stopPropagation();
      }, true);

      document.addEventListener("pointermove", e => {
        if(overlay.classList.contains("hidden")) return;
        if(dragCard){
          st.x = e.clientX - dragCard.dx;
          st.y = e.clientY - dragCard.dy;
          apply();
        }
        if(st.charging && forceEl){
          forceEl.style.left = e.clientX + "px";
          forceEl.style.top = e.clientY + "px";
        }
      }, true);

      document.addEventListener("pointerup", () => {
        if(overlay.classList.contains("hidden")) return;
        if(dragCard){
          dragCard = null;
          cardEl.classList.remove("dragging");
          return;
        }
        if(st.charging) launch();
      }, true);

      (function chargeLoop(){
        if(st.charging && powerInner) powerInner.style.width = (power()*100) + "%";
        requestAnimationFrame(chargeLoop);
      })();

      resetBtn?.addEventListener("click", e => { e.preventDefault(); reset(); });
      closeBtn?.addEventListener("click", e => {
        e.preventDefault();
        cancelAnimationFrame(anim);
        overlay.classList.add("hidden");
      });

      document.addEventListener("keydown", e => {
        if(overlay.classList.contains("hidden")) return;
        if(e.key === "ArrowUp" || e.key === "ArrowDown"){
          e.preventDefault();
          e.stopImmediatePropagation();
          st.z = e.key === "ArrowUp" ? Math.min(60, st.z+2) : Math.max(0, st.z-2);
          apply();
        }
        if(e.key === "Escape"){
          e.preventDefault();
          e.stopImmediatePropagation();
          cancelAnimationFrame(anim);
          overlay.classList.add("hidden");
        }
      }, true);
    }

    orbBtn?.addEventListener("click", e => { e.preventDefault(); open("chaosfront.png"); }, true);
    starBtn?.addEventListener("click", e => { e.preventDefault(); open("fallingstar.png"); }, true);

    // ---------- Free movement across both sides retained ----------
    const previousMove = onCardDragMove;
    onCardDragMove = function(e){
      const dragState = state.dragging;
      const card = state.cards.find(c => c.id === dragState?.cardId);
      if(!card){
        previousMove(e);
        return;
      }

      previousMove(e);

      if(card.zone === "battlefield" && state.dragging){
        card.x = e.clientX - dragState.offsetX;
        card.y = e.clientY - dragState.offsetY;
        const el = els.table.querySelector(`[data-card-id="${card.id}"]`);
        if(el){
          el.style.left = card.x + "px";
          el.style.top = card.y + "px";
        }
      }
    };

    function pointInRect(x,y,r){ return x>=r.left && x<=r.right && y>=r.top && y<=r.bottom; }

    function anyPileAt(x,y){
      const piles = [
        els.p1LibraryZone, els.p1GraveyardZone, els.p1ExileZone,
        els.p2LibraryZone, els.p2GraveyardZone, els.p2ExileZone
      ].filter(Boolean);
      for(const el of piles){
        const r = el.getBoundingClientRect();
        if(pointInRect(x,y,r)) return el;
      }
      return null;
    }

    const oldEnd = onCardDragEnd;
    onCardDragEnd = function(e){
      const dragState = state.dragging;
      const card = state.cards.find(c => c.id === dragState?.cardId);
      const pile = anyPileAt(e.clientX, e.clientY);

      if(card && pile){
        document.removeEventListener("pointermove", onCardDragMove);
        els.p1HandZone?.classList.remove("drop-hover");
        els.p2HandZone?.classList.remove("drop-hover");
        state.dragging = null;
        hideDropHint?.();

        const zone = pile.dataset.zone;
        const kind = kindOfZone(zone);

        if(kind === "library"){
          const ans = window.prompt("TOP / BOTTOM / CANCEL?", "TOP");
          const v = String(ans || "CANCEL").trim().toLowerCase();
          if(v === "top" || v === "bottom"){
            card.zone = zone;
            card.owner = zone.startsWith("p2") ? "p2" : "p1";
            card.faceDown = true;
            card.tapped = false;
            state.cards = state.cards.filter(c => c.id !== card.id);
            if(v === "top") state.cards.push(card);
            else state.cards.unshift(card);
            saveState();
          }
          render();
          return;
        }

        if(kind === "graveyard" || kind === "exile"){
          card.zone = zone;
          card.owner = zone.startsWith("p2") ? "p2" : "p1";
          card.faceDown = false;
          card.tapped = false;
          saveState();
          render();
          return;
        }
      }

      oldEnd(e);
    };
  });
})();










// v95: sideboard editor refinements.
// - dblclick fixed using click timing fallback
// - empty-area click clears selection
// - selected outline is dimmer/thinner
// - multi-drag proxy shows actual selected cards, not "N CARDS"
// - stacks are looser: larger vertical offset so more of each card is visible
(function(){
  function ready(fn){
    if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn, {once:true});
    else fn();
  }

  ready(function(){
    const modal = document.getElementById("sideboardModal");
    if(!modal) return;

    function getSideButton(){
      return document.getElementById("sideboardBtn")
        || document.getElementById("menuSideboardBtn")
        || Array.from(document.querySelectorAll("button")).find(b => (b.textContent || "").trim().toUpperCase() === "SIDEBOARD");
    }

    function normalizeZones(){
      state.cards.forEach(c => {
        if(c.zone === "library") c.zone = "p1-library";
        if(c.zone === "sideboard") c.zone = "p1-sideboard";
      });
    }

    function stableNameSort(cards){
      return [...cards].sort((a,b) => {
        const an = (a.name || "").toLowerCase();
        const bn = (b.name || "").toLowerCase();
        if(an < bn) return -1;
        if(an > bn) return 1;
        return 0;
      });
    }

    function cardsIn(zone){ return state.cards.filter(c => c.zone === zone); }
    function mainCards(){ return cardsIn("p1-library"); }
    function sideCards(){ return cardsIn("p1-sideboard"); }

    function sortInitialZones(){
      const others = state.cards.filter(c => c.zone !== "p1-library" && c.zone !== "p1-sideboard");
      state.cards = others.concat(stableNameSort(mainCards()), stableNameSort(sideCards()));
    }

    function cardImg(card){ return card.image || card.img || card.frontImage || ""; }

    let mainEl = null;
    let sideEl = null;
    let drag = null;
    let selected = new Set();
    let paintSelecting = false;
    let lastTarget = { main: null, side: null };
    let lastClick = { id: null, time: 0 };

    function zoneNameToState(dest){ return dest === "side" ? "p1-sideboard" : "p1-library"; }

    function orderedCardsForRender(zone){ return zone === "main" ? mainCards() : sideCards(); }

    function moveCards(cardIds, dest, insertAfterId=null, targetStack=null){
      const ids = [...new Set(cardIds)].filter(Boolean);
      if(!ids.length) return;

      const destZone = zoneNameToState(dest);
      const moving = ids.map(id => state.cards.find(c => c.id === id)).filter(Boolean);
      if(!moving.length) return;

      state.cards = state.cards.filter(c => !ids.includes(c.id));

      moving.forEach(c => {
        c.zone = destZone;
        c.owner = "p1";
        c.faceDown = dest === "main";
        c.tapped = false;

        if(dest === "main"){
          state.cards.push(c);
          assignCardToMainSlot(c, Number.isInteger(targetStack) ? targetStack : null);
        } else {
          removeFromMainSlots(c.id);
          state.cards.push(c);
        }
      });

      lastTarget[dest] = moving[moving.length - 1]?.id || lastTarget[dest];
      selected = new Set(moving.map(c => c.id));
      saveState?.();
      renderV99();
    }

    function renderZone(container, cards, zoneName){
      container.innerHTML = "";
      layout(cards).forEach(item => {
        const card = item.card;
        const el = document.createElement("div");
        el.className = "v93-card";
        if(selected.has(card.id)) el.classList.add("v95-selected");
        el.dataset.cardId = card.id;
        el.dataset.zoneName = zoneName;
        el.dataset.stack = String(item.stack);
        el.style.left = item.x + "px";
        el.style.top = item.y + "px";
        el.style.zIndex = item.z;

        const img = document.createElement("img");
        img.src = cardImg(card);
        img.alt = card.name || "";
        el.appendChild(img);
        container.appendChild(el);
      });
    }

    function openV95(){
      normalizeZones();
      sortInitialZones();

      modal.className = "modal v93-sideboard";
      modal.classList.remove("hidden");
      modal.style.display = "block";
      modal.style.background = "transparent";
      modal.innerHTML = `
        <div class="v93-board">
          <div class="v93-sb-top">
            <button type="button" class="v93-ready">READY</button>
            <div class="v93-title">MAIN (<span id="v93MainCount">0</span>)</div>
            <div class="v93-title">SIDE (<span id="v93SideCount">0</span>)</div>
          </div>
          <div class="v93-zones">
            <div class="v93-zone" id="v93MainZone" data-zone-name="main"></div>
            <div class="v93-zone" id="v93SideZone" data-zone-name="side"></div>
          </div>
        </div>
      `;

      mainEl = modal.querySelector("#v93MainZone");
      sideEl = modal.querySelector("#v93SideZone");

      modal.querySelector(".v93-ready").onclick = e => {
        e.preventDefault();
        closeV95();
      };

      selected.clear();
      renderV95();
    }

    function closeV95(){
      if(drag) clearDrag();
      saveState?.();
      modal.classList.add("hidden");
      modal.style.display = "none";
      modal.innerHTML = "";
      render?.();
    }

    function renderV95(){
      if(!mainEl || !sideEl) return;
      const main = orderedCardsForRender("main");
      const side = orderedCardsForRender("side");
      const mc = document.getElementById("v93MainCount");
      const sc = document.getElementById("v93SideCount");
      if(mc) mc.textContent = String(main.length);
      if(sc) sc.textContent = String(side.length);
      renderZone(mainEl, main, "main");
      renderZone(sideEl, side, "side");
    }

    function zoneAt(x,y){
      for(const z of [mainEl, sideEl]){
        if(!z) continue;
        const r = z.getBoundingClientRect();
        if(x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return z.dataset.zoneName;
      }
      return null;
    }

    function cardNode(target){
      const node = target.closest?.(".v93-card");
      if(!node || !modal.contains(node)) return null;
      return node;
    }

    function cardAtPoint(x,y){
      const el = document.elementFromPoint(x,y);
      return cardNode(el);
    }

    function stackAtPoint(x,y,zone){
      const node = cardAtPoint(x,y);
      if(node && node.dataset.zoneName === zone) return Number(node.dataset.stack || 0);
      const zoneEl = zone === "main" ? mainEl : sideEl;
      const r = zoneEl.getBoundingClientRect();
      return Math.max(0, Math.floor((x - r.left - 18 + 66) / 132));
    }

    function lastCardIdInStack(zone, stack){
      const list = orderedCardsForRender(zone);
      const items = layout(list).filter(item => item.stack === stack);
      return items.length ? items[items.length - 1].card.id : null;
    }

    function toggleSelected(id){
      if(selected.has(id)) selected.delete(id);
      else selected.add(id);
      renderV95();
    }

    function selectPaintAtPoint(x,y){
      const node = cardAtPoint(x,y);
      if(!node) return;
      selected.add(node.dataset.cardId);
      renderV95();
    }

    function maybeDoubleClick(id, zone){
      const now = Date.now();
      if(lastClick.id === id && now - lastClick.time < 420){
        const dest = zone === "main" ? "side" : "main";
        const ids = selected.has(id) ? [...selected] : [id];
        moveCards(ids, dest, lastTarget[dest]);
        lastClick = { id:null, time:0 };
        return true;
      }
      lastClick = { id, time: now };
      return false;
    }

    function startDrag(node,e){
      const id = node.dataset.cardId;
      const card = state.cards.find(c => c.id === id);
      if(!card) return;

      if(e.metaKey || e.ctrlKey){
        toggleSelected(id);
        return;
      }

      if(e.shiftKey){
        selected.add(id);
        paintSelecting = true;
        renderV95();
        return;
      }

      if(maybeDoubleClick(id, node.dataset.zoneName)) return;

      if(!selected.has(id)){
        selected = new Set([id]);
      }

      const ids = [...selected];
      const r = node.getBoundingClientRect();
      const proxy = document.createElement("div");
      proxy.id = "v93SideboardProxy";
      proxy.style.transform = "translateZ(0)";
      if(ids.length > 1) proxy.classList.add("v95-multi");
      proxy.style.left = r.left + "px";
      proxy.style.top = r.top + "px";
      proxy.style.width = r.width + "px";
      proxy.style.height = r.height + "px";

      const previewCards = ids.map(cid => state.cards.find(c => c.id === cid)).filter(Boolean).slice(0,4);
      previewCards.forEach(c => {
        const img = document.createElement("img");
        img.src = cardImg(c);
        proxy.appendChild(img);
      });
      document.body.appendChild(proxy);

      requestAnimationFrame(() => {
        document.querySelectorAll(".v93-card").forEach(el => {
          if(selected.has(el.dataset.cardId)) {
            el.classList.add("v97-drag-source");
            el.style.opacity = "0.35";
          }
        });
      });

      drag = {
        ids,
        sourceZone: node.dataset.zoneName,
        proxy,
        dx: e.clientX - r.left,
        dy: e.clientY - r.top,
        moved: false,
        startX: e.clientX,
        startY: e.clientY
      };
    }

    function clearDrag(){
      if(drag?.proxy) drag.proxy.remove();
      document.querySelectorAll(".v93-card").forEach(el => {
        el.classList.remove("v93-hidden-source", "v97-drag-source");
        el.style.opacity = "";
        el.style.filter = "";
      });
      mainEl?.classList.remove("drag-over");
      sideEl?.classList.remove("drag-over");
      drag = null;
    }

    document.addEventListener("mousedown", e => {
      if(!modal.classList.contains("v93-sideboard")) return;

      const node = cardNode(e.target);
      if(!node){
        // empty area clears selection
        if(e.target.closest?.(".v93-zone,.v93-board")){
          selected.clear();
          renderV95();
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
        }
        return;
      }

      startDrag(node,e);
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    }, true);

    document.addEventListener("mousemove", e => {
      if(paintSelecting){
        selectPaintAtPoint(e.clientX,e.clientY);
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return;
      }

      if(!drag) return;
      drag.proxy.style.left = (e.clientX - drag.dx) + "px";
      drag.proxy.style.top = (e.clientY - drag.dy) + "px";
      if(Math.hypot(e.clientX-drag.startX, e.clientY-drag.startY) > 4) drag.moved = true;
      const z = zoneAt(e.clientX,e.clientY);
      mainEl?.classList.toggle("drag-over", z === "main");
      sideEl?.classList.toggle("drag-over", z === "side");
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    }, true);

    document.addEventListener("mouseup", e => {
      if(paintSelecting){
        paintSelecting = false;
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return;
      }

      if(!drag) return;
      const dest = zoneAt(e.clientX,e.clientY);
      const ids = drag.ids;
      const source = drag.sourceZone;
      const moved = drag.moved;
      let insertAfter = null;

      if(dest){
        const stack = stackAtPoint(e.clientX,e.clientY,dest);
        insertAfter = lastCardIdInStack(dest,stack);
      }

      clearDrag();

      if(moved && dest){
        if(dest === source && insertAfter && ids.includes(insertAfter)) renderV95();
        else moveCards(ids,dest,insertAfter);
      } else {
        renderV95();
      }

      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    }, true);

    document.addEventListener("dblclick", e => {
      const node = cardNode(e.target);
      if(!node) return;
      const id = node.dataset.cardId;
      const source = node.dataset.zoneName;
      const dest = source === "main" ? "side" : "main";
      const ids = selected.has(id) ? [...selected] : [id];
      moveCards(ids,dest,lastTarget[dest],null);
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    }, true);

    function bindButton(){
      const btn = getSideButton();
      if(!btn || btn.__v95Bound) return;
      btn.__v95Bound = true;
      btn.onclick = e => {
        e.preventDefault();
        e.stopPropagation();
        openV95();
      };
    }

    bindButton();
    setTimeout(bindButton,500);

    document.addEventListener("click", e => {
      const btn = e.target.closest?.("button");
      if(!btn) return;
      if((btn.textContent || "").trim().toUpperCase() === "SIDEBOARD"){
        e.preventDefault();
        e.stopPropagation();
        openV95();
      }
    }, true);
  });
})();


// v96: strict SIDEBOARD: import fix.
// Only the exact line "SIDEBOARD:" changes following imported cards to p1-sideboard.
// Blank lines do nothing. Other sideboard spellings are ignored.
(function(){
  function ready(fn){
    if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn, {once:true});
    else fn();
  }

  ready(function(){
    function getImportTextArea(){
      return document.getElementById("deckText")
        || document.getElementById("deckInput")
        || document.querySelector("textarea");
    }

    function parseStrictSideboardNames(text){
      const main = [];
      const side = [];
      let zone = "main";

      String(text || "").split(/\r?\n/).forEach(raw => {
        const line = raw.trim();
        if(!line) return;

        if(line === "SIDEBOARD:"){
          zone = "side";
          return;
        }

        const m = line.match(/^(\d+)\s+(.+)$/);
        if(!m) return;

        const count = Number(m[1]);
        const name = m[2].trim();

        for(let i=0; i<count; i++){
          if(zone === "side") side.push(name);
          else main.push(name);
        }
      });

      return { main, side };
    }

    function applyStrictSideboardZones(){
      const importText = getImportTextArea();
      if(!importText) return;

      const parsed = parseStrictSideboardNames(importText.value);
      if(!parsed.side.length) return;

      const mainNeed = new Map();
      const sideNeed = new Map();

      parsed.main.forEach(n => {
        const k = n.toLowerCase();
        mainNeed.set(k, (mainNeed.get(k) || 0) + 1);
      });

      parsed.side.forEach(n => {
        const k = n.toLowerCase();
        sideNeed.set(k, (sideNeed.get(k) || 0) + 1);
      });

      const imported = state.cards.filter(c =>
        c.zone === "p1-library" ||
        c.zone === "library" ||
        c.zone === "p1-sideboard" ||
        c.zone === "sideboard"
      );

      imported.forEach(c => {
        const key = String(c.name || "").toLowerCase();

        const sideCount = sideNeed.get(key) || 0;
        if(sideCount > 0){
          c.zone = "p1-sideboard";
          c.owner = "p1";
          c.faceDown = false;
          c.tapped = false;
          sideNeed.set(key, sideCount - 1);
          return;
        }

        const mainCount = mainNeed.get(key) || 0;
        if(mainCount > 0){
          c.zone = "p1-library";
          c.owner = "p1";
          c.faceDown = true;
          c.tapped = false;
          mainNeed.set(key, mainCount - 1);
        }
      });

      saveState?.();
      render?.();
    }

    document.addEventListener("click", e => {
      const btn = e.target.closest?.("button");
      if(!btn) return;
      const t = (btn.textContent || "").trim().toUpperCase();

      if(t.includes("IMPORT") || t.includes("LOAD")){
        setTimeout(applyStrictSideboardZones, 800);
        setTimeout(applyStrictSideboardZones, 1800);
        setTimeout(applyStrictSideboardZones, 3200);
      }

      if(t === "SIDEBOARD"){
        applyStrictSideboardZones();
      }
    }, true);

    window.applyStrictSideboardZonesV96 = applyStrictSideboardZones;
  });
})();


// v97: sideboard drag visual no-flicker safety.
// Keeps original cards dimmed instead of disappearing and forces proxy top layer.
(function(){
  document.addEventListener("mousemove", () => {
    const p = document.getElementById("v93SideboardProxy");
    if(p){
      p.style.setProperty("z-index", "2147483647", "important");
      p.style.setProperty("transform", "translateZ(0)");
      p.style.setProperty("opacity", "1", "important");
      p.style.setProperty("visibility", "visible", "important");
    }
  }, true);

  document.addEventListener("mouseup", () => {
    document.querySelectorAll(".v93-card.v97-drag-source,.v93-card.v93-hidden-source").forEach(el => {
      el.classList.remove("v97-drag-source","v93-hidden-source");
      el.style.opacity = "";
      el.style.filter = "";
    });
  }, true);
})();


// v98: sideboard first-click drag + compact movable inspector controls.
// - Side editor now starts drag on the first click even if the card was not already selected.
// - Inspector header gets +/- font size buttons.
// - Inspector default position moves to opponent deck-button area.
// - Opponent deck controls are hidden when identifiable.
// - Inspector text is compact: name, italic type, oracle; no flavor text/extra blank lines.
(function(){
  function ready(fn){
    if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn, {once:true});
    else fn();
  }

  ready(function(){
    // ---------- Inspector ----------
    function normalizeType(card){
      return card.typeLine || card.type_line || card.type || "";
    }

    function normalizeOracle(card){
      // prefer oracle, avoid flavor fields
      return card.oracle || card.oracle_text || card.text || card.printed_text || "No Oracle text.";
    }

    function esc(str){
      return String(str ?? "").replace(/[&<>"]/g, ch => ({
        "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"
      }[ch]));
    }

    function setupInspector(){
      const win = document.getElementById("cardInspectorV79") || document.getElementById("cardInspectorV62");
      if(!win) return false;

      const header = document.getElementById("inspectorDragBarV79")
        || document.getElementById("inspectorDragBarV78")
        || win.querySelector("[id*='DragBar']")
        || win;

      const content = document.getElementById("inspectorContentV79")
        || document.getElementById("inspectorContentV78")
        || win.querySelector("[id*='inspectorContent']")
        || win;

      if(header && !header.__v98Controls){
        header.__v98Controls = true;
        header.innerHTML = `<span class="inspectorTitleV98">INSPECTOR</span>
<button type="button" class="inspectorFontBtnV98" id="inspectorFontMinusV98">−</button>
<button type="button" class="inspectorFontBtnV98" id="inspectorFontPlusV98">+</button>`;

        let fontSize = 13;
        const apply = () => {
          content.style.setProperty("font-size", fontSize + "px", "important");
        };
        header.querySelector("#inspectorFontMinusV98").addEventListener("click", e => {
          e.preventDefault(); e.stopPropagation();
          fontSize = Math.max(9, fontSize - 1);
          apply();
        }, true);
        header.querySelector("#inspectorFontPlusV98").addEventListener("click", e => {
          e.preventDefault(); e.stopPropagation();
          fontSize = Math.min(22, fontSize + 1);
          apply();
        }, true);
        apply();
      }

      // default place: top/right area where opponent draw/tutor/shuffle controls were
      if(!win.__v98Positioned){
        win.__v98Positioned = true;
        win.style.setProperty("left", (innerWidth - 300) + "px", "important");
        win.style.setProperty("top", "70px", "important");
        win.style.setProperty("right", "auto", "important");
        win.style.setProperty("bottom", "auto", "important");
      }

      // Override oracle renderer to compact format.
      window.showOracle = function(card){
        if(!card || !content) return;
        const name = card.name || "";
        const type = normalizeType(card);
        const oracle = normalizeOracle(card);
        content.innerHTML = `<div class="ci-name">${esc(name)}</div><div class="ci-type">${esc(type)}</div><div class="ci-oracle">${esc(oracle)}</div>`;
      };
      window.hideOracle = function(){};

      return true;
    }

    setupInspector();
    setTimeout(setupInspector, 300);
    setTimeout(setupInspector, 1000);

    // Re-render compact inspector text after existing mouseover handlers also run.
    function allCards(){
      return state.cards.concat(state.sideboardCards || []);
    }
    function allowed(card){
      if(!card) return false;
      if(card.zone && card.zone.endsWith("-library")) return false;
      if(card.zone === "p2-hand") return false;
      return true;
    }
    function cardFromTarget(target){
      const node = target && target.closest ? target.closest("[data-card-id]") : null;
      if(!node) return null;
      return allCards().find(c => c.id === node.dataset.cardId) || null;
    }

    document.addEventListener("mouseover", e => {
      const card = cardFromTarget(e.target);
      if(!allowed(card)) return;
      const content = document.getElementById("inspectorContentV79")
        || document.getElementById("inspectorContentV78")
        || document.querySelector("#cardInspectorV79 [id*='Content'], #cardInspectorV62 [id*='Content']");
      if(content){
        const name = card.name || "";
        const type = normalizeType(card);
        const oracle = normalizeOracle(card);
        content.innerHTML = `<div class="ci-name">${esc(name)}</div><div class="ci-type">${esc(type)}</div><div class="ci-oracle">${esc(oracle)}</div>`;
      }
    }, true);

    // Hide likely opponent deck controls; if exact IDs differ, this also catches by proximity/text.
    function hideOpponentControls(){
      document.querySelectorAll("button").forEach(btn => {
        const txt = (btn.textContent || "").trim().toUpperCase();
        if(!/DRAW|TUTOR|SHUFFLE|REVEAL/.test(txt)) return;
        const r = btn.getBoundingClientRect();
        if(r.top < innerHeight * 0.45 && r.left > innerWidth * 0.62){
          const parent = btn.closest("div");
          if(parent) parent.style.display = "none";
          else btn.style.display = "none";
        }
      });
    }
    hideOpponentControls();
    setTimeout(hideOpponentControls, 500);
    setTimeout(hideOpponentControls, 1500);
  });
})();


// v99: supplied side-gauge diagram + slower 2g-card-feeling flip tuning.
// Scale: 0-45 cm, 10 px per cm; 45 cm reaches the top tick.
// Red finger is drawn in the panel but has no function yet.
(function(){
  function ready(fn){
    if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn, {once:true});
    else fn();
  }

  ready(function(){
    const overlay = document.getElementById("flipOverlayV80");
    const panel = document.getElementById("flipPanelV80");
    const scene = document.getElementById("flipSideSceneV80");
    const heightEl = document.getElementById("flipHeightV80");
    const sideCard = document.getElementById("flipSideCardV80");
    const orb = document.getElementById("flipCardV80");
    const img = document.getElementById("flipImgV80");
    const shadow = document.getElementById("flipShadowV80");
    const force = document.getElementById("flipForceV80");
    const powerInner = document.getElementById("flipPowerInnerV80");
    const again = document.getElementById("flipAgainV80");
    const close = document.getElementById("flipCloseV80");
    const orbBtn = document.getElementById("menuFlipOrbBtn");
    const starBtn = document.getElementById("menuFlipStarBtn");

    if(!panel || !scene || !sideCard || !orb || !img) return;

    // Build the supplied-looking 0-45 cm gauge once.
    if(!scene.__v99Gauge){
      scene.__v99Gauge = true;
      for(let cm=0; cm<=45; cm+=5){
        const y = 472 - cm * 10;
        const tick = document.createElement("div");
        tick.className = "flipTickV99";
        tick.style.top = y + "px";
        scene.appendChild(tick);

        const lab = document.createElement("div");
        lab.className = "flipTickLabelV99";
        lab.textContent = String(cm);
        lab.style.top = y + "px";
        scene.appendChild(lab);
      }

      const finger = document.createElement("div");
      finger.id = "flipSideFingerV99";
      finger.innerHTML = `
        <svg viewBox="0 0 120 80" aria-hidden="true">
          <path d="M7 39 C19 32, 47 38, 65 30 C74 15, 96 16, 115 34" fill="none" stroke="#ef4038" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M64 30 C54 45, 47 51, 37 48 C28 45, 31 33, 43 30" fill="none" stroke="#ef4038" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M48 49 C37 58, 29 61, 25 55 C21 49, 27 45, 39 39" fill="none" stroke="#ef4038" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M60 52 C47 65, 36 70, 31 64 C27 58, 35 54, 49 45" fill="none" stroke="#ef4038" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M74 53 C61 72, 44 76, 39 68 C35 61, 48 56, 61 46" fill="none" stroke="#ef4038" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M77 30 C91 30, 96 31, 106 31 C115 31, 115 68, 105 70 C94 72, 88 68, 78 66" fill="none" stroke="#ef4038" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`;
      scene.appendChild(finger);
    }

    // Movable panel, rebuilt cleanly from mousedown so it does not fight pointer handlers.
    if(!panel.__v99Drag){
      panel.__v99Drag = true;
      let drag = null;
      const pos = { x: Math.max(20, innerWidth - 370), y: Math.max(20, innerHeight * .22) };

      function drawPanel(){
        panel.style.setProperty("left", pos.x + "px", "important");
        panel.style.setProperty("top", pos.y + "px", "important");
        panel.style.setProperty("right", "auto", "important");
        panel.style.setProperty("bottom", "auto", "important");
      }

      heightEl?.addEventListener("mousedown", e => {
        const r = panel.getBoundingClientRect();
        drag = { dx: e.clientX - r.left, dy: e.clientY - r.top };
        e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
      }, true);

      window.addEventListener("mousemove", e => {
        if(!drag) return;
        pos.x = Math.max(0, Math.min(innerWidth - 80, e.clientX - drag.dx));
        pos.y = Math.max(0, Math.min(innerHeight - 80, e.clientY - drag.dy));
        drawPanel();
        e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
      }, true);

      window.addEventListener("mouseup", e => {
        if(!drag) return;
        drag = null;
        e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
      }, true);

      drawPanel();
    }

    // Replace/override the v98/v89 visual side-card update every frame.
    const W = 170, H = Math.round(W * 1.397);
    const state99 = {
      x: innerWidth/2 - W/2 - 160,
      y: innerHeight/2 - H/2 - 20,
      z: 30,
      vx: 0, vy: 0, vz: 0,
      yaw: -8, roll: 0, pitch: 0,
      wRoll: 0, wPitch: 0, wYaw: 0,
      charging: false, chargeStart: 0, lx: 0, ly: 0,
      phase: "idle", bounces: 0, slideFrames: 0, anim: null,
      front: "chaosfront.png"
    };

    function sideY(cm){
      return 472 - Math.max(0, Math.min(45, cm)) * 10;
    }

    function apply99(){
      state99.x = Math.max(-W*.4, Math.min(innerWidth-W*.6, state99.x));
      state99.y = Math.max(-H*.4, Math.min(innerHeight-H*.6, state99.y));
      state99.z = Math.max(0, Math.min(45, state99.z));

      orb.style.left = state99.x + "px";
      orb.style.top = state99.y + "px";

      const rr = state99.roll * Math.PI/180;
      const pr = state99.pitch * Math.PI/180;
      const sx = Math.max(.055, Math.abs(Math.cos(rr)));
      const sy = Math.max(.16, Math.abs(Math.cos(pr)));
      const scale = 1 + state99.z/70;

      img.src = Math.cos(rr) < 0 ? "lapi2.png" : state99.front;
      orb.style.transform = `rotate(${state99.yaw}deg) scale(${scale}) scaleX(${sx}) scaleY(${sy})`;

      if(shadow){
        shadow.style.left = (state99.x + W*.06) + "px";
        shadow.style.top = (state99.y + H*.06) + "px";
        shadow.style.transform = `rotate(${state99.yaw}deg) scale(${1 + state99.z/100})`;
        shadow.style.opacity = String(Math.max(.06,.27-state99.z/155));
      }

      if(heightEl) heightEl.textContent = "HEIGHT " + Math.round(state99.z) + " CM";
      sideCard.style.top = sideY(state99.z) + "px";
      sideCard.style.bottom = "auto";
      sideCard.style.transform = `rotate(${(state99.roll*.72 + state99.pitch*.28) % 180}deg)`;
    }

    function reset99(frontFile){
      cancelAnimationFrame(state99.anim);
      Object.assign(state99, {
        x: innerWidth/2 - W/2 - 160,
        y: innerHeight/2 - H/2 - 20,
        z: 30,
        vx: 0, vy: 0, vz: 0,
        yaw: -8, roll: 0, pitch: 0,
        wRoll: 0, wPitch: 0, wYaw: 0,
        charging: false, chargeStart: 0, lx: 0, ly: 0,
        phase: "idle", bounces: 0, slideFrames: 0,
        front: frontFile || state99.front
      });
      orb.classList.remove("aiming","flipping","dragging");
      if(force) force.style.display = "none";
      if(powerInner) powerInner.style.width = "0%";
      apply99();
    }

    function open99(frontFile){
      overlay?.classList.remove("hidden");
      if(overlay) overlay.style.display = "block";
      reset99(frontFile);
    }

    function power99(){
      return state99.charging ? Math.min(1, (performance.now() - state99.chargeStart) / 1850) : 0;
    }

    function launch99(){
      const p = power99();
      const lx = state99.lx, ly = state99.ly;
      state99.charging = false;
      orb.classList.remove("aiming");
      if(force) force.style.display = "none";
      if(powerInner) powerInner.style.width = "0%";

      // 2g card, exaggerated slow motion. Height/power/click position decide whether it completes a rotation.
      const shortSide = Math.abs(lx);
      const longSide = Math.abs(ly);
      const corner = Math.min(1, Math.hypot(lx, ly) / .70);

      state99.vx = lx * (1.05 + p*1.35);
      state99.vy = ly * (0.85 + p*1.10) - p * .25;
      state99.vz = 1.20 + p * 2.35;

      // short-side click -> pitch; long-side click -> roll; between -> both.
      state99.wPitch = Math.sign(lx || .1) * (1.9 + p*5.4) * (0.22 + shortSide*2.0);
      state99.wRoll  = Math.sign(-ly || .1) * (1.9 + p*5.4) * (0.22 + longSide*2.0);
      state99.wPitch *= 0.72 + corner*.45;
      state99.wRoll  *= 0.72 + corner*.45;
      state99.wYaw = (lx * ly) * (2.1 + p*4.2);

      if(shortSide < .08 && longSide < .08){
        state99.wRoll = (Math.random() > .5 ? 1 : -1) * (1.2 + p*2.2);
        state99.wPitch = (Math.random() > .5 ? 1 : -1) * (.8 + p*1.4);
      }

      state99.bounces = 0;
      state99.slideFrames = 0;
      animate99();
    }

    function edgeLanding99(){
      const flatRoll = Math.abs(Math.cos(state99.roll*Math.PI/180));
      const flatPitch = Math.abs(Math.cos(state99.pitch*Math.PI/180));
      return flatRoll < .50 || flatPitch < .62;
    }

    function animate99(){
      state99.phase = "flipping";
      orb.classList.add("flipping");

      function step(){
        const dt = .20; // very slow

        state99.x += state99.vx * dt;
        state99.y += state99.vy * dt;
        state99.z += state99.vz * dt;

        state99.roll += state99.wRoll * dt;
        state99.pitch += state99.wPitch * dt;
        state99.yaw += state99.wYaw * dt;

        state99.vz -= .145;

        if(state99.z <= 0){
          state99.z = 0;
          if(edgeLanding99() && state99.bounces < 2 && Math.abs(state99.vz) > .36){
            state99.vz = Math.abs(state99.vz) * .18;
            state99.vx *= .42;
            state99.vy *= .42;
            state99.wRoll *= .36;
            state99.wPitch *= .36;
            state99.wYaw *= .32;
            state99.bounces += 1;
          } else {
            state99.vz = 0;
            state99.vx *= .60;
            state99.vy *= .60;
            state99.wRoll *= .48;
            state99.wPitch *= .48;
            state99.wYaw *= .45;
            state99.slideFrames += 1;
          }
        } else {
          state99.vx *= .993;
          state99.vy *= .993;
          state99.wRoll *= .993;
          state99.wPitch *= .993;
          state99.wYaw *= .990;
          state99.vy += .0008;
        }

        if(state99.slideFrames > 28){
          state99.vx *= .40; state99.vy *= .40;
          state99.wRoll *= .40; state99.wPitch *= .40; state99.wYaw *= .40;
        }
        if(state99.slideFrames > 55){
          state99.vx = state99.vy = state99.vz = 0;
          state99.wRoll = state99.wPitch = state99.wYaw = 0;
        }

        apply99();

        const motion = Math.hypot(state99.vx, state99.vy) + Math.abs(state99.wRoll)/7 + Math.abs(state99.wPitch)/7 + Math.abs(state99.wYaw)/7;
        if(state99.z <= 0 && motion < .28){
          state99.phase = "landed";
          orb.classList.remove("flipping");
          state99.roll = Math.round(state99.roll / 180) * 180;
          state99.pitch = 0;
          state99.vx = state99.vy = state99.vz = 0;
          state99.wRoll = state99.wPitch = state99.wYaw = 0;
          apply99();
          return;
        }
        state99.anim = requestAnimationFrame(step);
      }
      step();
    }

    // Bind with capture and stop old duplicate handlers from winning.
    if(!orb.__v99Bound){
      orb.__v99Bound = true;
      let dragCard = null;

      orb.addEventListener("pointerdown", e => {
        if(overlay.classList.contains("hidden") || state99.phase === "flipping") return;
        const r = orb.getBoundingClientRect();

        if(!e.shiftKey){
          dragCard = { dx:e.clientX-r.left, dy:e.clientY-r.top };
          orb.classList.add("dragging");
          e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
          return;
        }

        state99.charging = true;
        state99.chargeStart = performance.now();
        state99.lx = (e.clientX-r.left)/r.width - .5;
        state99.ly = (e.clientY-r.top)/r.height - .5;
        orb.classList.add("aiming");
        if(force){
          force.style.display = "block";
          force.style.left = e.clientX + "px";
          force.style.top = e.clientY + "px";
        }
        e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
      }, true);

      document.addEventListener("pointermove", e => {
        if(overlay.classList.contains("hidden")) return;
        if(dragCard){
          state99.x = e.clientX - dragCard.dx;
          state99.y = e.clientY - dragCard.dy;
          apply99();
          e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
        }
        if(state99.charging && force){
          force.style.left = e.clientX + "px";
          force.style.top = e.clientY + "px";
          e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
        }
      }, true);

      document.addEventListener("pointerup", e => {
        if(overlay.classList.contains("hidden")) return;
        if(dragCard){
          dragCard = null;
          orb.classList.remove("dragging");
          e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
          return;
        }
        if(state99.charging){
          launch99();
          e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
        }
      }, true);

      (function chargeLoop(){
        if(state99.charging && powerInner) powerInner.style.width = (power99()*100) + "%";
        requestAnimationFrame(chargeLoop);
      })();

      again?.addEventListener("click", e => { e.preventDefault(); reset99(state99.front); }, true);
      close?.addEventListener("click", e => {
        e.preventDefault();
        cancelAnimationFrame(state99.anim);
        overlay.classList.add("hidden");
      }, true);

      document.addEventListener("keydown", e => {
        if(overlay.classList.contains("hidden")) return;
        if(e.key === "ArrowUp" || e.key === "ArrowDown"){
          e.preventDefault(); e.stopImmediatePropagation();
          state99.z = e.key === "ArrowUp" ? Math.min(45, state99.z+1) : Math.max(0, state99.z-1);
          apply99();
        }
        if(e.key === "Escape"){
          e.preventDefault(); e.stopImmediatePropagation();
          cancelAnimationFrame(state99.anim);
          overlay.classList.add("hidden");
        }
      }, true);
    }

    orbBtn?.addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); open99("chaosfront.png"); }, true);
    starBtn?.addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); open99("fallingstar.png"); }, true);
  });
})();

	// ===== PLAYMAT SYSTEM =====

const PLAYMATS = [
  "playmats/mat1.jpg",
  "playmats/mat2.jpg",
  "playmats/mat3.png",
  "COLOR"
];

let currentPlaymatTarget = "p1";

function ensurePlaymatUI(){
  if(document.getElementById("playmatPicker")) return;

  const el = document.createElement("div");
  el.id = "playmatPicker";
  el.style.display = "none";
  el.innerHTML = `
    <div id="playmatGrid"></div>
    <div id="playmatColorControls" style="display:none;">
      <input type="color" id="pmColor">
      <input type="range" id="pmDark" min="0" max="1" step="0.01">
    </div>
  `;
  document.body.appendChild(el);
}

function openPlaymatPicker(target){
  ensurePlaymatUI();
  currentPlaymatTarget = target;

  const picker = document.getElementById("playmatPicker");
  const grid = document.getElementById("playmatGrid");

  grid.innerHTML = "";

  PLAYMATS.forEach(src=>{
    const d = document.createElement("div");
    d.className = "pm-thumb";

    if(src === "COLOR"){
      d.textContent = "COLOR";
    } else {
      d.style.backgroundImage = `url(${src})`;
    }

    d.onclick = ()=>{
      document.querySelectorAll(".pm-thumb").forEach(e=>e.classList.remove("selected"));
      d.classList.add("selected");

      if(src === "COLOR"){
        document.getElementById("playmatColorControls").style.display = "block";
        return;
      }

      applyPlaymat(src);
    };

    grid.appendChild(d);
  });

  picker.style.display = "block";
}

function applyPlaymat(src){
  const el = currentPlaymatTarget === "p1"
    ? document.getElementById("playmat1")
    : document.getElementById("playmat2");

  if(!el) return;

  el.style.backgroundImage = `url(${src})`;
  el.style.backgroundColor = "";
  el.style.filter = "";
}

// COLOR controls
document.addEventListener("DOMContentLoaded", ()=>{
  const color = document.getElementById("pmColor");
  const dark = document.getElementById("pmDark");

  if(color && dark){
    const fn = ()=>{
      const el = currentPlaymatTarget === "p1"
        ? document.getElementById("playmat1")
        : document.getElementById("playmat2");

      if(!el) return;

      el.style.backgroundImage = "none";
      el.style.backgroundColor = color.value;
      el.style.filter = `brightness(${1 - dark.value})`;
    };

    color.oninput = fn;
    dark.oninput = fn;
  }

  const b1 = document.getElementById("menuPlaymat1");
  const b2 = document.getElementById("menuPlaymat2");

  if(b1) b1.onclick = ()=>openPlaymatPicker("p1");
  if(b2) b2.onclick = ()=>openPlaymatPicker("p2");
});


// ===== PLAYMAT PICKER + DICE CENTER + SIDEBOARD STABILITY PATCH =====
(() => {
  "use strict";

  // ---------- Playmat picker ----------
  const PLAYMAT_DIR = "playmat";
  const PLAYMAT_FILES = ["allergy1.png", "allergy1b.png", "allergy2.png", "bluemana1.png", "bluemana2.png", "boris.png", "camel.png", "cland.png", "cross.png", "dance.png", "farm.png", "flash.png", "flash2.png", "gate.png", "geddon.png", "golem.png", "grem1.png", "grem2.png", "hell.png", "hordes.png", "kudzu.png", "life.png", "mesa.png", "miracle.png", "mire.png", "mold.png", "pesti.png", "phantom.png", "purge.png", "spawn.png", "terracorn.png", "terrain.png", "unicorn.png", "urzaglas.png", "vault.png", "zombi.png"];
  const PLAYMAT_STORAGE = "oldschoolPlaymatsV100";

  const playmatDefaults = {
    p1: { type: "image", value: `${PLAYMAT_DIR}/gate.png` },
    p2: { type: "image", value: `${PLAYMAT_DIR}/camel.png` }
  };

  let playmatTarget = "p1";
  let playmatState = makeRandomPlaymatState();
  savePlaymatState();

  function cloneObj(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function makeRandomPlaymatState() {
    const pick = () => PLAYMAT_DIR + "/" + PLAYMAT_FILES[Math.floor(Math.random() * PLAYMAT_FILES.length)];
    return {
      p1: { type: "image", value: pick() },
      p2: { type: "image", value: pick() }
    };
  }

  function loadPlaymatState() {
    try {
      return Object.assign(cloneObj(playmatDefaults), JSON.parse(localStorage.getItem(PLAYMAT_STORAGE) || "{}"));
    } catch {
      return cloneObj(playmatDefaults);
    }
  }

  function savePlaymatState() {
    localStorage.setItem(PLAYMAT_STORAGE, JSON.stringify(playmatState));
  }

  function pmEl(player) {
    return document.getElementById(player === "p1" ? "p1Playmat" : "p2Playmat");
  }

  function applyPlaymat(player) {
    const el = pmEl(player);
    if (!el) return;

    const cfg = playmatState[player] || playmatDefaults[player];

    if (cfg.type === "color") {
      const dark = Number(cfg.dark || 0);
      el.style.backgroundColor = cfg.color || "#242424";
      el.style.backgroundImage = `linear-gradient(rgba(0,0,0,${dark}), rgba(0,0,0,${dark}))`;
    } else {
      el.style.backgroundColor = "";
      el.style.backgroundImage = `url("${cfg.value}")`;
    }
  }

  function applyPlaymats() {
    applyPlaymat("p1");
    applyPlaymat("p2");
  }

  function ensurePlaymatPicker() {
    let picker = document.getElementById("playmatPicker");
    if (picker) return picker;

    picker = document.createElement("div");
    picker.id = "playmatPicker";
    picker.style.display = "none";
    picker.innerHTML = `
      <div id="playmatPickerInner">
        <div id="playmatPickerTop">
          <div id="playmatPickerTitle">PLAYMATS</div>
          <button type="button" id="playmatPickerClose">CLOSE</button>
        </div>
        <div class="playmat-row-label">OPPONENT / TOP PLAYMAT</div>
        <div id="playmatGridP2" class="playmat-grid" data-player="p2"></div>
        <div class="playmat-row-label">YOU / BOTTOM PLAYMAT</div>
        <div id="playmatGridP1" class="playmat-grid" data-player="p1"></div>
        <div id="playmatColorControls">
          <span id="pmColorTarget">COLOR</span>
          <label>COLOR <input type="color" id="pmColor" value="#242424"></label>
          <label>DARK <input type="range" id="pmDark" min="0" max="0.9" step="0.01" value="0"></label>
        </div>
      </div>
    `;
    document.body.appendChild(picker);

    picker.querySelector("#playmatPickerClose").addEventListener("click", closePlaymatPicker);

    const color = picker.querySelector("#pmColor");
    const dark = picker.querySelector("#pmDark");
    const setColor = () => {
      const player = picker.dataset.colorTarget || "p1";
      playmatState[player] = {
        type: "color",
        color: color.value,
        dark: Number(dark.value || 0)
      };
      savePlaymatState();
      applyPlaymat(player);
      markPlaymatSelection();
    };
    color.addEventListener("input", setColor);
    dark.addEventListener("input", setColor);

    picker.querySelectorAll(".playmat-grid").forEach(strip => {
      let down = false;
      let startX = 0;
      let scrollLeft = 0;

      strip.addEventListener("mousedown", (e) => {
        down = true;
        startX = e.pageX;
        scrollLeft = strip.scrollLeft;
        strip.classList.add("dragging");
      });

      document.addEventListener("mouseup", () => {
        down = false;
        strip.classList.remove("dragging");
      });

      document.addEventListener("mousemove", (e) => {
        if (!down) return;
        strip.scrollLeft = scrollLeft - (e.pageX - startX) * 1.5;
      });
    });

    return picker;
  }

  function markPlaymatSelection() {
    document.querySelectorAll(".pm-thumb").forEach(thumb => {
      const player = thumb.dataset.player;
      const cfg = playmatState[player];
      if (!cfg) {
        thumb.classList.remove("selected");
        return;
      }
      if (cfg.type === "color") {
        thumb.classList.toggle("selected", thumb.dataset.kind === "color");
      } else {
        thumb.classList.toggle("selected", thumb.dataset.value === cfg.value);
      }
    });
  }

  function buildPlaymatRow(grid, player) {
    grid.innerHTML = "";

    const colorThumb = document.createElement("button");
    colorThumb.type = "button";
    colorThumb.className = "pm-thumb pm-color-thumb";
    colorThumb.dataset.kind = "color";
    colorThumb.dataset.player = player;
    colorThumb.textContent = "COLOR";
    colorThumb.addEventListener("click", () => {
      const picker = ensurePlaymatPicker();
      const controls = picker.querySelector("#playmatColorControls");
      const label = picker.querySelector("#pmColorTarget");
      const color = picker.querySelector("#pmColor");
      const dark = picker.querySelector("#pmDark");
      const cfg = playmatState[player];
      picker.dataset.colorTarget = player;
      if (label) label.textContent = player === "p1" ? "BOTTOM COLOR" : "TOP COLOR";
      if (cfg?.type === "color") {
        color.value = cfg.color || "#242424";
        dark.value = String(cfg.dark || 0);
      }
      controls.classList.add("open");
      playmatState[player] = {
        type: "color",
        color: color.value,
        dark: Number(dark.value || 0)
      };
      savePlaymatState();
      applyPlaymat(player);
      markPlaymatSelection();
    });
    grid.appendChild(colorThumb);

    PLAYMAT_FILES.forEach(file => {
      const src = `${PLAYMAT_DIR}/${file}`;
      const thumb = document.createElement("button");
      thumb.type = "button";
      thumb.className = "pm-thumb";
      thumb.dataset.kind = "image";
      thumb.dataset.player = player;
      thumb.dataset.value = src;
      thumb.title = file;
      thumb.style.backgroundImage = `url("${src}")`;

      thumb.addEventListener("click", () => {
        playmatState[player] = { type: "image", value: src };
        savePlaymatState();
        applyPlaymat(player);
        markPlaymatSelection();
      });

      grid.appendChild(thumb);
    });
  }

  function renderPlaymatPicker() {
    const picker = ensurePlaymatPicker();
    const controls = picker.querySelector("#playmatColorControls");
    buildPlaymatRow(picker.querySelector("#playmatGridP2"), "p2");
    buildPlaymatRow(picker.querySelector("#playmatGridP1"), "p1");
    controls.classList.remove("open");
    markPlaymatSelection();
  }

  function openPlaymatPicker() {
    renderPlaymatPicker();
    ensurePlaymatPicker().style.display = "block";
  }

  function closePlaymatPicker() {
    const picker = document.getElementById("playmatPicker");
    if (picker) picker.style.display = "none";
  }

  function bindPlaymatButtons() {
    const oldP1 = document.getElementById("menuPlaymat1");
    const oldP2 = document.getElementById("menuPlaymat2");
    const btn = document.getElementById("menuPlaymatBtn") || oldP1 || oldP2;

    if (oldP1 && oldP1 !== btn) oldP1.style.display = "none";
    if (oldP2 && oldP2 !== btn) oldP2.style.display = "none";

    if (btn) btn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      openPlaymatPicker();
    };
  }

  // ---------- Add dice from green menu: center + topmost ----------
  function bindCenterDiceButton() {
    const btn = document.getElementById("menuAddDiceBtn");
    if (!btn) return;

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      addDie(undefined, undefined, "#79d45a");
    }, true);
  }

  // ---------- Sideboard: stable free slots + type-sorted main ----------
  function sideTypeRank(card) {
    const t = String(card.typeLine || card.type_line || "").toLowerCase();
    if (t.includes("land")) return 0;
    if (t.includes("creature")) return 1;
    if (t.includes("artifact")) return 2;
    if (t.includes("enchantment")) return 3;
    if (t.includes("sorcery")) return 4;
    if (t.includes("instant")) return 5;
    return 99;
  }

  function sideSortMain(player) {
    return state.cards
      .filter(c => (c.owner || "p1") === player && !c.token && c.zone !== "sideboard")
      .sort((a, b) => {
        const ta = sideTypeRank(a);
        const tb = sideTypeRank(b);
        if (ta !== tb) return ta - tb;
        const na = String(a.name || "");
        const nb = String(b.name || "");
        if (na !== nb) return na.localeCompare(nb);
        return String(a.id || "").localeCompare(String(b.id || ""));
      });
  }

  function sideSortSide(player) {
    return (state.sideboardCards || [])
      .filter(c => (c.owner || "p1") === player)
      .sort((a, b) => {
        const na = String(a.name || "");
        const nb = String(b.name || "");
        if (na !== nb) return na.localeCompare(nb);
        return String(a.id || "").localeCompare(String(b.id || ""));
      });
  }

  function ensureSideLayout() {
    if (!state.sideboardLayout) state.sideboardLayout = {};
  }

  function sideInitialLayout(cards, area) {
    const out = {};
    const perStack = 10;
    const stepY = 28;
    const colX = 132;

    cards.forEach((card, i) => {
      const col = Math.floor(i / perStack);
      const row = i % perStack;
      out[card.id] = {
        area,
        x: col * colX,
        y: row * stepY,
        z: 100 + i
      };
    });

    return out;
  }

  function resetSideboardEditorLayoutStable() {
    ensureSideLayout();
    state.sideboardLayout = {
      ...sideInitialLayout(sideSortMain("p1"), "main"),
      ...sideInitialLayout(sideSortSide("p1"), "side")
    };
  }

  window.resetSideboardEditorLayout = resetSideboardEditorLayoutStable;

  function rightmostBottomStable(cards, area) {
    ensureSideLayout();
    const existing = cards
      .map(c => state.sideboardLayout[c.id])
      .filter(p => p && p.area === area);

    if (!existing.length) return { area, x: 0, y: 0, z: 100 };

    const maxX = Math.max(...existing.map(p => p.x));
    const stack = existing.filter(p => Math.abs(p.x - maxX) < 4);
    const maxY = Math.max(...stack.map(p => p.y));
    const maxZ = Math.max(...existing.map(p => p.z || 100));

    return { area, x: maxX, y: maxY + 28, z: maxZ + 1 };
  }

  function makeStableSideCard(card, area) {
    ensureSideLayout();

    if (!state.sideboardLayout[card.id]) {
      const cards = area === "main" ? sideSortMain("p1") : sideSortSide("p1");
      state.sideboardLayout[card.id] = rightmostBottomStable(cards, area);
    }

    const pos = state.sideboardLayout[card.id];
    pos.area = area;

    const el = document.createElement("div");
    el.className = "sideboard-free-card";
    el.dataset.cardId = card.id;
    el.dataset.area = area;
    el.style.left = `${pos.x}px`;
    el.style.top = `${pos.y}px`;
    el.style.zIndex = String(pos.z || 100);

    const img = document.createElement("img");
    img.src = card.image;
    img.alt = card.name;
    img.draggable = false;
    el.appendChild(img);

    el.addEventListener("mouseenter", () => showOracle(card));
    el.addEventListener("mouseleave", () => hideOracle());

    el.addEventListener("dblclick", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (area === "main") moveCardToSideStable(card.id);
      else moveCardToMainStable(card.id);
      renderSideboardEditor(false);
    });

    el.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();

      const start = { x: e.clientX, y: e.clientY, left: pos.x, top: pos.y };
      el.classList.add("dragging");
      el.setPointerCapture(e.pointerId);

      pos.z = Math.max(200, ...Object.values(state.sideboardLayout).map(p => p.z || 100)) + 1;
      el.style.zIndex = String(pos.z);

      function move(ev) {
        pos.x = start.left + (ev.clientX - start.x);
        pos.y = start.top + (ev.clientY - start.y);
        el.style.left = `${pos.x}px`;
        el.style.top = `${pos.y}px`;
      }

      function up(ev) {
        document.removeEventListener("pointermove", move);
        document.removeEventListener("pointerup", up);
        el.classList.remove("dragging");

        const target = ev.target.closest && ev.target.closest(".sideboard-grid");
        const targetArea = target === els.sideboardGrid ? "side" : target === els.mainboardGrid ? "main" : area;

        if (targetArea !== area) {
          if (area === "main" && targetArea === "side") moveCardToSideStable(card.id, { x: pos.x, y: pos.y, z: pos.z });
          if (area === "side" && targetArea === "main") moveCardToMainStable(card.id, { x: pos.x, y: pos.y, z: pos.z });
          renderSideboardEditor(false);
        } else {
          saveState();
        }
      }

      document.addEventListener("pointermove", move);
      document.addEventListener("pointerup", up, { once: true });
    });

    return el;
  }

  function moveCardToSideStable(cardId, keepPos = null) {
    const card = state.cards.find(c => c.id === cardId);
    if (!card) return;

    state.cards = state.cards.filter(c => c.id !== cardId);
    if (!state.sideboardCards) state.sideboardCards = [];
    state.sideboardCards.push({ ...card, zone: "sideboard", tapped: false, faceDown: false });

    ensureSideLayout();
    state.sideboardLayout[cardId] = keepPos
      ? { ...keepPos, area: "side" }
      : rightmostBottomStable(sideSortSide("p1"), "side");

    saveState();
  }

  function moveCardToMainStable(cardId, keepPos = null) {
    const card = (state.sideboardCards || []).find(c => c.id === cardId);
    if (!card) return;

    state.sideboardCards = state.sideboardCards.filter(c => c.id !== cardId);
    state.cards.push({ ...card, zone: "p1-library", tapped: false, faceDown: false });

    ensureSideLayout();
    state.sideboardLayout[cardId] = keepPos
      ? { ...keepPos, area: "main" }
      : rightmostBottomStable(sideSortMain("p1"), "main");

    saveState();
  }

  window.renderSideboardEditor = function(resetLayout = false) {
    const p = "p1";
    state.activePlayer = "p1";
    if (els.activePlayerSelect) els.activePlayerSelect.value = "p1";

    ensureSideLayout();
    if (resetLayout || !Object.keys(state.sideboardLayout).length) resetSideboardEditorLayoutStable();

    els.mainboardGrid.innerHTML = "";
    els.sideboardGrid.innerHTML = "";

    const main = sideSortMain(p);
    const side = sideSortSide(p);

    if (els.mainboardCount) els.mainboardCount.textContent = main.length;
    if (els.sideboardCount) els.sideboardCount.textContent = side.length;

    main.forEach(card => els.mainboardGrid.appendChild(makeStableSideCard(card, "main")));
    side.forEach(card => els.sideboardGrid.appendChild(makeStableSideCard(card, "side")));

    if (typeof window.v29ApplyBattleTransforms === "function") window.v29ApplyBattleTransforms();
  };

  window.openSideboardEditor = function() {
    if (!confirm("reset game and go to editor ?")) return;

    state.cards = state.cards.map(c => {
      if ((c.owner || "p1") === "p1" && !c.token) {
        return { ...c, zone: "p1-library", tapped: false, faceDown: false };
      }
      return c;
    });

    resetSideboardEditorLayoutStable();
    saveState();
    renderSideboardEditor(false);
    els.sideboardModal.classList.remove("hidden");
    if (state.showOraclePanel !== false) els.oraclePanel?.classList.remove("hidden");
  };

  window.moveOneToSide = function(name) {
    const card = sideSortMain("p1").find(c => c.name === name);
    if (card) moveCardToSideStable(card.id);
  };

  window.moveOneToMain = function(name) {
    const card = sideSortSide("p1").find(c => c.name === name);
    if (card) moveCardToMainStable(card.id);
  };

  window.finishSideboarding = function() {
    const p = "p1";
    const others = state.cards.filter(c => c.zone !== `${p}-library`);
    const lib = shuffleArray(zoneCards(`${p}-library`));
    state.cards = others.concat(lib);
    els.sideboardModal.classList.add("hidden");
    saveState();
    render();
  };

  function bindSideboardButtonFinal() {
    const btn = document.getElementById("sideboardBtn");
    if (!btn) return;

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      openSideboardEditor();
    }, true);
  }

  function initPatch() {
    applyPlaymats();
    bindPlaymatButtons();
    bindCenterDiceButton();
    bindSideboardButtonFinal();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initPatch);
  } else {
    initPatch();
  }
})();



// layer6: hand drag ghost lives in the hand fan stack, not under #table.
// This keeps the dragged card in the same front/back slot while leaving a real gap in hand.
(function(){
  v24CreateGhost = function(card, x, y, offsetX, offsetY){
    const ghost = document.createElement("div");
    ghost.className = "drag-ghost hand-drag-ghost";
    ghost.dataset.cardId = card.id;

    if(card.faceDown){
      const back = document.createElement("div");
      back.className = "card-back sleeve-back" + (state.sleeve === "transparent" ? " transparent-sleeve" : "");
      if(card.tokenBack){
        back.style.backgroundImage = `url(${card.tokenBack})`;
        back.style.backgroundSize = "cover";
        back.style.backgroundPosition = "center";
      }
      ghost.appendChild(back);
    } else {
      const img = document.createElement("img");
      img.src = card.image;
      img.alt = card.name;
      img.draggable = false;
      ghost.appendChild(img);
    }

    const player = card.zone && card.zone.startsWith("p2-") ? "p2" : "p1";
    const fan = player === "p2" ? els.p2HandFan : els.p1HandFan;
    const sourceEl = document.querySelector(`.hand-card[data-card-id="${card.id}"]`);
    const sourceZ = sourceEl ? getComputedStyle(sourceEl).zIndex : "10000";

    ghost.style.position = "absolute";
    ghost.style.zIndex = sourceZ;
    ghost.style.setProperty("--hand-z", sourceZ);
    ghost.style.transform = "none";

    fan.appendChild(ghost);

    const r = fan.getBoundingClientRect();
    ghost.style.left = `${x - r.left - offsetX}px`;
    ghost.style.top = `${y - r.top - offsetY}px`;
    return ghost;
  };

  v24MoveGhost = function(drag, x, y){
    if(!drag.ghost) return;
    const parent = drag.ghost.parentElement;
    const r = parent.getBoundingClientRect();
    drag.ghost.style.left = `${x - r.left - drag.offsetX}px`;
    drag.ghost.style.top = `${y - r.top - drag.offsetY}px`;
  };
})();


// layer13: final hand rendering lock.
// Each hand card stores its own transform/z-index; hover CSS must never alter those values.
(function(){
  function renderLockedHand(player, fan){
    if(!fan) return;
    fan.innerHTML = "";
    const hand = zoneCards(`${player}-hand`);
    const count = hand.length;

    const fanValue = player === "p1" ? Number(state.handFan?.p1 || 0) : 0;
    const depthValue = player === "p1" ? Number(state.handDepth?.p1 || 0) : 0;

    const t = (fanValue + 100) / 200;
    const spread = 7 + t * 74;
    const curve = 0.3 + t * 6.2;
    const angleScale = 0.5 + t * 7.2;
    const start = -((count - 1) * spread) / 2;
    const center = (count - 1) / 2;
    const focus = count <= 1 ? 0 : ((depthValue + 100) / 200) * (count - 1);

    hand.forEach((card, index)=>{
      const el = createCardElement(card, "hand-card");
      const rel = index - center;
      const x = start + index * spread;
      const angle = rel * angleScale;
      const arc = Math.pow(rel, 2) * curve;
      const raise = 18 - arc;
      const dist = Math.abs(index - focus);
      const z = 10000 - Math.round(dist * 100) + index;
      const transform = `rotate(${angle}deg)`;

      el.style.left = `calc(50% + ${x}px - var(--card-w) / 2)`;
      el.style.bottom = `${Math.max(-12, raise)}px`;
      el.style.setProperty("transform", transform, "important");
      el.style.setProperty("transform-origin", "0 100%", "important");
      el.style.setProperty("z-index", String(z), "important");
      el.style.setProperty("--hand-transform", transform);
      el.style.setProperty("--hand-z", String(z));

      el.addEventListener("mouseenter",()=>showOracle(card), {passive:true});
      fan.appendChild(el);
    });
  }

  renderHand = renderLockedHand;
})();


// layer14: tutor + sideboard visual stacks and inspector support.
// Tutor: one slot per card name; duplicates are visible as a small stack instead of a number badge.
// Sideboard editor: main uses the same named stacks; side area is one stack of up to 30 cards.
(function(){
  function showInspectorForAnyCard(card){
    if(!card || state.showOraclePanel === false) return;

    let panel = document.getElementById("oraclePanel");
    if(!panel){
      panel = document.createElement("div");
      panel.id = "oraclePanel";
      panel.className = "oracle-panel hidden";
      const img = document.createElement("img");
      img.id = "oraclePanelImage";
      img.alt = "";
      const txt = document.createElement("div");
      txt.id = "oraclePanelText";
      panel.appendChild(img);
      panel.appendChild(txt);
      document.body.appendChild(panel);
    }
    if(panel.parentElement !== document.body) document.body.appendChild(panel);

    const img = document.getElementById("oraclePanelImage");
    const txt = document.getElementById("oraclePanelText");
    if(!img || !txt) return;

    img.src = card.image || "";
    img.alt = card.name || "";
    txt.textContent = [card.name || "", card.typeLine || "", "", card.oracle || ""].join("\n").trim();
    panel.classList.remove("hidden");
  }

  function groupedByName(cards){
    const groups = new Map();
    cards.forEach(card=>{
      if(!groups.has(card.name)) groups.set(card.name, []);
      groups.get(card.name).push(card);
    });
    return [...groups.entries()].sort((a,b)=>a[0].localeCompare(b[0]));
  }

  function makeNamedStackSlot(cards, options={}){
    const top = cards[cards.length - 1];
    const maxVisible = options.maxVisible || 4;
    const selected = options.selectedId && cards.some(c=>c.id === options.selectedId);
    const slot = document.createElement("div");
    slot.className = (options.className || "named-card-stack") + (selected ? " selected" : "");
    slot.dataset.cardId = top.id;
    slot.title = top.name;

    const visible = cards.slice(-maxVisible);
    const stackSlots = maxVisible;
    const visibleCount = visible.length;
    visible.forEach((card, i)=>{
      const img = document.createElement("img");
      img.className = "stacked-card-img";
      img.src = card.image;
      img.alt = card.name;
      img.draggable = false;
      img.dataset.cardId = card.id;

      // Four fixed vertical positions per stack.
      // If fewer than four copies exist, they occupy the lower/front positions
      // so every stack front card has the same bottom edge.
      const slotIndex = stackSlots - visibleCount + i;
      img.style.left = "0px";
      img.style.top = `calc(var(--named-stack-step) * ${slotIndex})`;
      img.style.zIndex = String(10 + slotIndex);
      img.addEventListener("mouseenter",()=>showInspectorForAnyCard(card), {passive:true});
      slot.appendChild(img);
    });

    slot.addEventListener("mouseenter",()=>showInspectorForAnyCard(top), {passive:true});
    return slot;
  }

  function splitIntoFourStacks(cards){
    const chunks = [];
    for(let i = 0; i < cards.length; i += 4){
      chunks.push(cards.slice(i, i + 4));
    }
    return chunks;
  }

  renderLibraryGrid = function(){
    els.libraryGrid.innerHTML = "";
    const cards = zoneCards(`${state.librarySearchPlayer}-library`);
    groupedByName(cards).forEach(([name, group])=>{
      splitIntoFourStacks(group).forEach(chunk=>{
        const top = chunk[chunk.length - 1];
        const slot = makeNamedStackSlot(chunk, {
          className: "library-card-wrap library-stack-slot",
          selectedId: state.selectedLibraryCardId,
          maxVisible: 4
        });
        slot.addEventListener("click",()=>{
          state.selectedLibraryCardId = top.id;
          renderLibraryGrid();
          showInspectorForAnyCard(top);
        });
        els.libraryGrid.appendChild(slot);
      });
    });
  };

  function sideMainCards(){
    return state.cards
      .filter(c => (c.owner || "p1") === "p1" && !c.token && c.zone === "p1-library")
      .sort((a,b)=>a.name.localeCompare(b.name));
  }

  function sideCards(){
    return (state.sideboardCards || [])
      .filter(c => (c.owner || "p1") === "p1")
      .sort((a,b)=>a.name.localeCompare(b.name));
  }

  function moveCardIdToSide(cardId){
    const card = state.cards.find(c=>c.id === cardId);
    if(!card) return;
    state.cards = state.cards.filter(c=>c.id !== cardId);
    if(!state.sideboardCards) state.sideboardCards = [];
    state.sideboardCards.push({...card, zone:"sideboard", tapped:false, faceDown:false});
    saveState();
  }

  function moveCardIdToMain(cardId){
    const card = (state.sideboardCards || []).find(c=>c.id === cardId);
    if(!card) return;
    state.sideboardCards = state.sideboardCards.filter(c=>c.id !== cardId);
    state.cards.push({...card, zone:"p1-library", tapped:false, faceDown:false});
    saveState();
  }

  function renderSideOneStack(cards){
    const stack = document.createElement("div");
    stack.className = "side-one-stack";
    const visible = cards.slice(0, 30);
    visible.forEach((card, i)=>{
      const img = document.createElement("img");
      img.className = "side-one-stack-card";
      img.src = card.image;
      img.alt = card.name;
      img.draggable = false;
      img.dataset.cardId = card.id;
      img.style.left = `${(i % 5) * 11}px`;
      img.style.top = `${i * 18}px`;
      img.style.zIndex = String(100 + i);
      img.addEventListener("mouseenter",()=>showInspectorForAnyCard(card), {passive:true});
      img.addEventListener("dblclick",(e)=>{
        e.preventDefault();
        e.stopPropagation();
        moveCardIdToMain(card.id);
        renderSideboardEditor(false);
        showInspectorForAnyCard(card);
      });
      stack.appendChild(img);
    });
    return stack;
  }

  renderSideboardEditor = function(resetLayout=false){
    state.activePlayer = "p1";
    if(els.activePlayerSelect) els.activePlayerSelect.value = "p1";

    els.mainboardGrid.innerHTML = "";
    els.sideboardGrid.innerHTML = "";

    const main = sideMainCards();
    const side = sideCards();

    if(els.mainboardCount) els.mainboardCount.textContent = main.length;
    if(els.sideboardCount) els.sideboardCount.textContent = side.length;

    groupedByName(main).forEach(([name, group])=>{
      splitIntoFourStacks(group).forEach(chunk=>{
        const slot = makeNamedStackSlot(chunk, {
          className: "side-main-stack-slot",
          maxVisible: 4
        });
        slot.querySelectorAll(".stacked-card-img").forEach(img=>{
          img.addEventListener("dblclick",(e)=>{
            e.preventDefault();
            e.stopPropagation();
            moveCardIdToSide(img.dataset.cardId);
            renderSideboardEditor(false);
          });
        });
        slot.addEventListener("dblclick",(e)=>{
          if(e.target.closest(".stacked-card-img")) return;
          e.preventDefault();
          moveCardIdToSide(chunk[chunk.length - 1].id);
          renderSideboardEditor(false);
        });
        els.mainboardGrid.appendChild(slot);
      });
    });


    els.sideboardGrid.appendChild(renderSideOneStack(side));

    const mainTitle = document.querySelector("#mainboardGrid")?.closest("section")?.querySelector("h2");
    const sideTitle = document.querySelector("#sideboardGrid")?.closest("section")?.querySelector("h2");
    if(mainTitle) mainTitle.innerHTML = `MAIN (<span id="mainboardCount">${main.length}</span>)`;
    if(sideTitle) sideTitle.innerHTML = `SIDE (<span id="sideboardCount">${side.length}</span>)`;
    els.mainboardCount = document.getElementById("mainboardCount");
    els.sideboardCount = document.getElementById("sideboardCount");
  };

  const oldOpenSideboardEditor = openSideboardEditor;
  openSideboardEditor = function(){
    if(!confirm("reset game and go to editor ?")) return;
    state.cards = state.cards.map(c=>{
      if((c.owner || "p1") === "p1" && !c.token) return {...c, zone:"p1-library", tapped:false, faceDown:false};
      return c;
    });
    saveState();
    renderSideboardEditor(false);
    els.sideboardModal.classList.remove("hidden");
  };

  moveOneToSide = function(name){
    const card = sideMainCards().find(c=>c.name === name);
    if(card) moveCardIdToSide(card.id);
  };

  moveOneToMain = function(name){
    const card = sideCards().find(c=>c.name === name);
    if(card) moveCardIdToMain(card.id);
  };
})();

// layer17: force sideboard button to open the stacked sideboard renderer.
// Earlier versions bound the button to an older openSideboardEditor function before
// the stacked renderer existed. This capture-phase handler stops those old handlers
// and opens the current stacked MAIN/SIDE editor.
(function(){
  function openStackedSideboardEditorFromButton(e){
    e.preventDefault();
    e.stopImmediatePropagation();

    if(!confirm("reset game and go to editor ?")) return;

    state.activePlayer = "p1";
    if(els.activePlayerSelect) els.activePlayerSelect.value = "p1";

    state.cards = state.cards.map(c=>{
      if((c.owner || "p1") === "p1" && !c.token) {
        return {...c, owner:"p1", zone:"p1-library", tapped:false, faceDown:false};
      }
      return c;
    });

    saveState();
    renderSideboardEditor(false);
    els.sideboardModal.classList.remove("hidden");
  }

  const btn = document.getElementById("sideboardBtn");
  if(btn){
    btn.addEventListener("click", openStackedSideboardEditorFromButton, true);
  }
})();


// layer18: final sideboard MAIN layout uses tutor-style named 4-card stacks.
// Keeps the existing sideboard editor drag / paint selection / double-click flow.
(function(){
  function ready(fn){
    if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn, {once:true});
    else fn();
  }

  ready(function(){
    const modal = document.getElementById("sideboardModal");
    if(!modal) return;

    let mainEl = null;
    let sideEl = null;
    let drag = null;
    let selected = new Set();
    let paintSelecting = false;
    let lastTarget = { main: null, side: null };
    let lastClick = { id: null, time: 0 };

    const CARD_W = 110;
    const CARD_H = 154;
    const STACK_STEP = 28;
    const STACK_GAP_X = 132;
    const GROUP_GAP_X = 144;
    const START_X = 18;
    const START_Y = 14;
    const MAIN_STACKS_PER_ROW = 6;
    const MAIN_ROW_GAP = 272;
    const SIDE_CARDS_PER_STACK = 15;

    function cardImg(card){
      return card.image || card.img || card.frontImage || "";
    }

    function normalizeZones(){
      if(!Array.isArray(state.cards)) state.cards = [];
      state.cards.forEach(c => {
        if(c.zone === "library") c.zone = "p1-library";
        if(c.zone === "sideboard") c.zone = "p1-sideboard";
      });

      if(Array.isArray(state.sideboardCards) && state.sideboardCards.length){
        const known = new Set(state.cards.map(c => c.id));
        state.sideboardCards.forEach(c => {
          if(!known.has(c.id)){
            state.cards.push({ ...c, owner:"p1", zone:"p1-sideboard", tapped:false, faceDown:false });
            known.add(c.id);
          }
        });
        state.sideboardCards = [];
      }
    }

    function stableNameSort(cards){
      return [...cards].sort((a,b)=>{
        const an = String(a.name || "").toLowerCase();
        const bn = String(b.name || "").toLowerCase();
        if(an < bn) return -1;
        if(an > bn) return 1;
        return String(a.id || "").localeCompare(String(b.id || ""));
      });
    }

    function cardsIn(zone){
      return state.cards.filter(c => c.zone === zone && (c.owner || "p1") === "p1" && !c.token);
    }

    function mainCards(){ return stableNameSort(cardsIn("p1-library")); }
    function sideCards(){ return stableNameSort(cardsIn("p1-sideboard")); }

    function groupedByName(cards){
      const groups = new Map();
      cards.forEach(card => {
        const key = card.name || "";
        if(!groups.has(key)) groups.set(key, []);
        groups.get(key).push(card);
      });
      return [...groups.entries()].sort((a,b)=>a[0].localeCompare(b[0]));
    }

    function chunk(cards, size){
      const out = [];
      for(let i=0; i<cards.length; i+=size) out.push(cards.slice(i, i+size));
      return out;
    }

    // layer21: static main slots. The MAIN editor no longer reflows every time a card moves.
    // Slots stay in fixed 6-column rows; empty slots remain available for returning/new sideboard cards.
    function mainSlotState(reset=false){
      if(reset || !Array.isArray(state.v21MainSlots)){
        const slots = [];
        groupedByName(mainCards()).forEach(([name, group]) => {
          chunk(group, 4).forEach(part => {
            slots.push({ name, ids: part.map(c => c.id) });
          });
        });
        state.v21MainSlots = slots;
      }
      return state.v21MainSlots;
    }

    function mainCardByIdMap(cards=mainCards()){
      return new Map(cards.map(c => [c.id, c]));
    }

    function slotActiveCards(slot, cardsById){
      return (slot.ids || []).map(id => cardsById.get(id)).filter(Boolean);
    }

    function removeFromMainSlots(cardId){
      const slots = mainSlotState(false);
      slots.forEach(slot => {
        slot.ids = (slot.ids || []).filter(id => id !== cardId);
      });
    }

    function firstEmptyMainSlot(){
      const slots = mainSlotState(false);
      const cardsById = mainCardByIdMap();
      for(let i=0; i<slots.length; i++){
        if(slotActiveCards(slots[i], cardsById).length === 0) return i;
      }
      slots.push({ name:"", ids:[] });
      return slots.length - 1;
    }

    function assignCardToMainSlot(card, preferredStack=null){
      const slots = mainSlotState(false);
      removeFromMainSlots(card.id);
      const cardsById = mainCardByIdMap();
      let target = Number.isInteger(preferredStack) && preferredStack >= 0 ? preferredStack : -1;

      if(target >= 0){
        while(slots.length <= target) slots.push({ name:"", ids:[] });
        const slot = slots[target];
        const active = slotActiveCards(slot, cardsById);
        if(active.length >= 4 || (active.length && slot.name && slot.name !== card.name)) target = -1;
      }

      if(target < 0){
        target = slots.findIndex(slot => {
          const active = slotActiveCards(slot, cardsById);
          return slot.name === card.name && active.length < 4;
        });
      }

      if(target < 0) target = firstEmptyMainSlot();
      while(slots.length <= target) slots.push({ name:"", ids:[] });
      slots[target].name = card.name || slots[target].name || "";
      if(!Array.isArray(slots[target].ids)) slots[target].ids = [];
      slots[target].ids.push(card.id);
      return target;
    }

    function ensureAllMainCardsHaveSlots(){
      const cards = mainCards();
      const slots = mainSlotState(false);
      const activeIds = new Set(cards.map(c => c.id));
      const placed = new Set();

      slots.forEach(slot => {
        slot.ids = (slot.ids || []).filter(id => activeIds.has(id));
        slot.ids.forEach(id => placed.add(id));
      });

      cards.forEach(card => {
        if(!placed.has(card.id)) assignCardToMainSlot(card, null);
      });
    }

    function layoutMain(cards){
      ensureAllMainCardsHaveSlots();
      const items = [];
      const cardsById = mainCardByIdMap(cards);
      const slots = mainSlotState(false);

      slots.forEach((slot, stackIndex) => {
        const part = slotActiveCards(slot, cardsById).slice(0,4);
        const col = stackIndex % MAIN_STACKS_PER_ROW;
        const row = Math.floor(stackIndex / MAIN_STACKS_PER_ROW);
        const visibleCount = part.length;
        part.forEach((card, i) => {
          const slotIndex = 4 - visibleCount + i;
          items.push({
            card,
            x: START_X + col * GROUP_GAP_X,
            y: START_Y + row * MAIN_ROW_GAP + slotIndex * STACK_STEP,
            z: 100 + slotIndex,
            stack: stackIndex
          });
        });
      });
      return items;
    }

    function layoutSide(cards){
      const items = [];
      cards.forEach((card, i) => {
        const col = Math.floor(i / SIDE_CARDS_PER_STACK);
        const row = i % SIDE_CARDS_PER_STACK;
        items.push({
          card,
          x: START_X + col * STACK_GAP_X,
          y: START_Y + row * STACK_STEP,
          z: 100 + row,
          stack: col
        });
      });
      return items;
    }

    function layoutFor(zone){
      return zone === "main" ? layoutMain(mainCards()) : layoutSide(sideCards());
    }

    function zoneNameToState(dest){
      return dest === "side" ? "p1-sideboard" : "p1-library";
    }

    function orderedCardsForRender(zone){
      return zone === "main" ? mainCards() : sideCards();
    }

    function moveCards(cardIds, dest, insertAfterId=null){
      const ids = [...new Set(cardIds)].filter(Boolean);
      if(!ids.length) return;

      const destZone = zoneNameToState(dest);
      const moving = ids.map(id => state.cards.find(c => c.id === id)).filter(Boolean);
      if(!moving.length) return;

      state.cards = state.cards.filter(c => !ids.includes(c.id));

      moving.forEach(c => {
        c.zone = destZone;
        c.owner = "p1";
        c.faceDown = dest === "main";
        c.tapped = false;
      });

      let insertIndex = -1;
      if(insertAfterId && !ids.includes(insertAfterId)){
        insertIndex = state.cards.findIndex(c => c.id === insertAfterId);
      }

      if(insertIndex >= 0){
        state.cards.splice(insertIndex + 1, 0, ...moving);
      } else {
        let last = -1;
        state.cards.forEach((c,i)=>{ if(c.zone === destZone) last = i; });
        if(last >= 0) state.cards.splice(last + 1, 0, ...moving);
        else state.cards.push(...moving);
      }

      lastTarget[dest] = moving[moving.length - 1]?.id || lastTarget[dest];
      selected = new Set(moving.map(c => c.id));
      saveState?.();
      renderV99();
    }

    function renderZone(container, items, zoneName){
      container.innerHTML = "";
      items.forEach(item => {
        const card = item.card;
        const el = document.createElement("div");
        el.className = "v93-card v99-card";
        if(selected.has(card.id)) el.classList.add("v95-selected");
        el.dataset.cardId = card.id;
        el.dataset.zoneName = zoneName;
        el.dataset.stack = String(item.stack);
        el.style.left = item.x + "px";
        el.style.top = item.y + "px";
        el.style.zIndex = String(item.z);

        const img = document.createElement("img");
        img.src = cardImg(card);
        img.alt = card.name || "";
        el.appendChild(img);

        el.addEventListener("mouseenter",()=>showOracle(card), {passive:true});
        container.appendChild(el);
      });
    }

    function openV99(){
      normalizeZones();
      mainSlotState(false);
      ensureAllMainCardsHaveSlots();

      modal.className = "modal v93-sideboard v99-sideboard";
      modal.classList.remove("hidden");
      modal.style.display = "block";
      modal.style.background = "transparent";
      modal.innerHTML = `
        <div class="v93-board">
          <div class="v93-sb-top">
            <button type="button" class="v93-ready">READY</button>
            <div class="v93-title">MAIN (<span id="v93MainCount">0</span>)</div>
            <div class="v93-title">SIDE (<span id="v93SideCount">0</span>)</div>
          </div>
          <div class="v93-zones">
            <div class="v93-zone" id="v93MainZone" data-zone-name="main"></div>
            <div class="v93-zone" id="v93SideZone" data-zone-name="side"></div>
          </div>
        </div>
      `;

      mainEl = modal.querySelector("#v93MainZone");
      sideEl = modal.querySelector("#v93SideZone");

      modal.querySelector(".v93-ready").onclick = e => {
        e.preventDefault();
        closeV99();
      };

      selected.clear();
      saveState?.();
      renderV99();
    }

    function closeV99(){
      if(drag) clearDrag();
      saveState?.();
      modal.classList.add("hidden");
      modal.style.display = "none";
      modal.innerHTML = "";
      render?.();
    }

    function renderV99(){
      if(!mainEl || !sideEl) return;
      const main = mainCards();
      const side = sideCards();
      const mc = document.getElementById("v93MainCount");
      const sc = document.getElementById("v93SideCount");
      if(mc) mc.textContent = String(main.length);
      if(sc) sc.textContent = String(side.length);
      const mainItems = layoutMain(main);
      renderZone(mainEl, mainItems, "main");
      renderZone(sideEl, layoutSide(side), "side");
      const slotCount = mainSlotState(false).length;
      const rows = Math.max(1, Math.ceil(slotCount / MAIN_STACKS_PER_ROW));
      mainEl.style.minHeight = "";
      let spacer = mainEl.querySelector(".v99-scroll-spacer");
      if(!spacer){
        spacer = document.createElement("div");
        spacer.className = "v99-scroll-spacer";
        mainEl.appendChild(spacer);
      }
      spacer.style.position = "absolute";
      spacer.style.left = "0";
      spacer.style.top = (START_Y + rows * MAIN_ROW_GAP + CARD_H + 40) + "px";
      spacer.style.width = "1px";
      spacer.style.height = "1px";
      spacer.style.pointerEvents = "none";
    }

    function zoneAt(x,y){
      for(const z of [mainEl, sideEl]){
        if(!z) continue;
        const r = z.getBoundingClientRect();
        if(x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return z.dataset.zoneName;
      }
      return null;
    }

    function cardNode(target){
      const node = target.closest?.(".v93-card");
      if(!node || !modal.contains(node)) return null;
      return node;
    }

    function cardAtPoint(x,y){
      const el = document.elementFromPoint(x,y);
      return cardNode(el);
    }

    function stackAtPoint(x,y,zone){
      const node = cardAtPoint(x,y);
      if(node && node.dataset.zoneName === zone) return Number(node.dataset.stack || 0);
      const zoneEl = zone === "main" ? mainEl : sideEl;
      const r = zoneEl.getBoundingClientRect();
      if(zone === "main"){
        const col = Math.max(0, Math.min(MAIN_STACKS_PER_ROW - 1, Math.floor((x - r.left - START_X + GROUP_GAP_X / 2) / GROUP_GAP_X)));
        const row = Math.max(0, Math.floor((y - r.top - START_Y + MAIN_ROW_GAP / 2) / MAIN_ROW_GAP));
        return row * MAIN_STACKS_PER_ROW + col;
      }
      return Math.max(0, Math.min(1, Math.floor((x - r.left - START_X + STACK_GAP_X / 2) / STACK_GAP_X)));
    }

    function lastCardIdInStack(zone, stack){
      const items = layoutFor(zone).filter(item => item.stack === stack);
      return items.length ? items[items.length - 1].card.id : null;
    }

    function toggleSelected(id){
      if(selected.has(id)) selected.delete(id);
      else selected.add(id);
      renderV99();
    }

    function selectPaintAtPoint(x,y){
      const node = cardAtPoint(x,y);
      if(!node) return;
      selected.add(node.dataset.cardId);
      renderV99();
    }

    function maybeDoubleClick(id, zone){
      const now = Date.now();
      if(lastClick.id === id && now - lastClick.time < 420){
        const dest = zone === "main" ? "side" : "main";
        const ids = selected.has(id) ? [...selected] : [id];
        moveCards(ids, dest, lastTarget[dest]);
        lastClick = { id:null, time:0 };
        return true;
      }
      lastClick = { id, time: now };
      return false;
    }

    function startDrag(node,e){
      const id = node.dataset.cardId;
      const card = state.cards.find(c => c.id === id);
      if(!card) return;

      if(e.metaKey || e.ctrlKey){
        toggleSelected(id);
        return;
      }

      if(e.shiftKey){
        selected.add(id);
        paintSelecting = true;
        renderV99();
        return;
      }

      if(maybeDoubleClick(id, node.dataset.zoneName)) return;

      if(!selected.has(id)) selected = new Set([id]);

      const ids = [...selected];
      const r = node.getBoundingClientRect();
      const proxy = document.createElement("div");
      proxy.id = "v93SideboardProxy";
      proxy.style.transform = "translateZ(0)";
      if(ids.length > 1) proxy.classList.add("v95-multi");
      proxy.style.left = r.left + "px";
      proxy.style.top = r.top + "px";
      proxy.style.width = r.width + "px";
      proxy.style.height = r.height + "px";

      const previewCards = ids.map(cid => state.cards.find(c => c.id === cid)).filter(Boolean).slice(0,4);
      previewCards.forEach(c => {
        const img = document.createElement("img");
        img.src = cardImg(c);
        proxy.appendChild(img);
      });
      document.body.appendChild(proxy);

      requestAnimationFrame(()=>{
        document.querySelectorAll(".v93-card").forEach(el=>{
          if(selected.has(el.dataset.cardId)){
            el.classList.add("v97-drag-source");
            el.style.opacity = "0.35";
          }
        });
      });

      drag = {
        ids,
        sourceZone: node.dataset.zoneName,
        proxy,
        dx: e.clientX - r.left,
        dy: e.clientY - r.top,
        moved: false,
        startX: e.clientX,
        startY: e.clientY
      };
    }

    function clearDrag(){
      if(drag?.proxy) drag.proxy.remove();
      document.querySelectorAll(".v93-card").forEach(el=>{
        el.classList.remove("v93-hidden-source", "v97-drag-source");
        el.style.opacity = "";
        el.style.filter = "";
      });
      mainEl?.classList.remove("drag-over");
      sideEl?.classList.remove("drag-over");
      drag = null;
    }

    document.addEventListener("mousedown", e => {
      if(!modal.classList.contains("v99-sideboard")) return;

      const node = cardNode(e.target);
      if(!node){
        if(e.target.closest?.(".v93-zone,.v93-board")){
          selected.clear();
          renderV99();
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
        }
        return;
      }

      startDrag(node,e);
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    }, true);

    document.addEventListener("mousemove", e => {
      if(!modal.classList.contains("v99-sideboard")) return;

      if(paintSelecting){
        selectPaintAtPoint(e.clientX,e.clientY);
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return;
      }

      if(!drag) return;
      drag.proxy.style.left = (e.clientX - drag.dx) + "px";
      drag.proxy.style.top = (e.clientY - drag.dy) + "px";
      if(Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) > 4) drag.moved = true;
      const z = zoneAt(e.clientX,e.clientY);
      mainEl?.classList.toggle("drag-over", z === "main");
      sideEl?.classList.toggle("drag-over", z === "side");
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    }, true);

    document.addEventListener("mouseup", e => {
      if(!modal.classList.contains("v99-sideboard")) return;

      if(paintSelecting){
        paintSelecting = false;
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return;
      }

      if(!drag) return;
      const dest = zoneAt(e.clientX,e.clientY);
      const ids = drag.ids;
      const source = drag.sourceZone;
      const moved = drag.moved;
      let insertAfter = null;

      let targetStack = null;
      if(dest){
        targetStack = stackAtPoint(e.clientX,e.clientY,dest);
        insertAfter = lastCardIdInStack(dest,targetStack);
      }

      clearDrag();

      if(moved && dest){
        if(dest === source && insertAfter && ids.includes(insertAfter)) renderV99();
        else moveCards(ids,dest,insertAfter,targetStack);
      } else {
        renderV99();
      }

      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    }, true);

    document.addEventListener("dblclick", e => {
      if(!modal.classList.contains("v99-sideboard")) return;
      const node = cardNode(e.target);
      if(!node) return;
      const id = node.dataset.cardId;
      const source = node.dataset.zoneName;
      const dest = source === "main" ? "side" : "main";
      const ids = selected.has(id) ? [...selected] : [id];
      moveCards(ids,dest,lastTarget[dest],null);
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    }, true);

    window.openSideboardEditor = openV99;
    window.renderSideboardEditor = renderV99;

    document.addEventListener("click", e => {
      const btn = e.target.closest?.("button");
      if(!btn) return;
      if((btn.textContent || "").trim().toUpperCase() === "SIDEBOARD"){
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        openV99();
      }
    }, true);
  });
})();

// layer20: sideboard editor interaction fix on top of v99 layout.
// Window-capture handlers run before older document sideboard handlers.
(function(){
  const selectedIds = new Set();
  let drag = null;
  let painting = false;
  let lastClick = { id:null, t:0 };

  function modal(){ return document.getElementById("sideboardModal"); }
  function isOpen(){ const m = modal(); return !!m && m.classList.contains("v99-sideboard") && !m.classList.contains("hidden"); }
  function mainZone(){ return document.getElementById("v93MainZone"); }
  function sideZone(){ return document.getElementById("v93SideZone"); }
  function cardNode(t){ const n = t?.closest?.(".v93-card"); return n && modal()?.contains(n) ? n : null; }
  function cardById(id){ return state.cards.find(c => c.id === id); }
  function cardImg(card){ return card?.image || card?.img || card?.frontImage || ""; }

  function zoneAt(x,y){
    for(const z of [mainZone(), sideZone()]){
      if(!z) continue;
      const r = z.getBoundingClientRect();
      if(x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return z.dataset.zoneName;
    }
    return null;
  }

  function zoneToState(z){ return z === "side" ? "p1-sideboard" : "p1-library"; }

  function applySelection(){
    document.querySelectorAll("#sideboardModal.v99-sideboard .v93-card").forEach(el=>{
      el.classList.toggle("v20-selected", selectedIds.has(el.dataset.cardId));
    });
  }

  function rerender(){
    if(typeof window.renderSideboardEditor === "function") window.renderSideboardEditor(false);
    requestAnimationFrame(applySelection);
  }

  function moveCards(ids, dest){
    const arr = [...new Set(ids)].filter(Boolean);
    if(!arr.length) return;
    const destZone = zoneToState(dest);
    arr.forEach(id=>{
      const c = cardById(id);
      if(!c) return;
      c.owner = "p1";
      c.zone = destZone;
      c.tapped = false;
      c.faceDown = dest === "main";
    });
    selectedIds.clear();
    arr.forEach(id=>selectedIds.add(id));
    if(typeof saveState === "function") saveState();
    rerender();
  }

  function makeProxy(node, ids){
    const r = node.getBoundingClientRect();
    const proxy = document.createElement("div");
    proxy.id = "v20SideboardProxy";
    proxy.style.left = r.left + "px";
    proxy.style.top = r.top + "px";
    proxy.style.width = r.width + "px";
    proxy.style.height = r.height + "px";
    ids.slice(0,4).forEach((id,i)=>{
      const c = cardById(id);
      if(!c) return;
      const img = document.createElement("img");
      img.src = cardImg(c);
      img.style.left = (i * 16) + "px";
      img.style.top = (i * 12) + "px";
      proxy.appendChild(img);
    });
    document.body.appendChild(proxy);
    return proxy;
  }

  function clearProxy(){
    drag?.proxy?.remove();
    document.querySelectorAll("#sideboardModal.v99-sideboard .v93-card.v20-drag-source").forEach(el=>el.classList.remove("v20-drag-source"));
    mainZone()?.classList.remove("drag-over");
    sideZone()?.classList.remove("drag-over");
    drag = null;
  }

  function selectOnly(id){ selectedIds.clear(); selectedIds.add(id); applySelection(); }
  function toggle(id){ selectedIds.has(id) ? selectedIds.delete(id) : selectedIds.add(id); applySelection(); }
  function addPaintAt(x,y){ const n = cardNode(document.elementFromPoint(x,y)); if(n){ selectedIds.add(n.dataset.cardId); applySelection(); } }

  function suppress(e){ e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); }

  window.addEventListener("mousedown", e=>{
    if(!isOpen()) return;
    const node = cardNode(e.target);

    if(!node){
      if(e.target.closest?.("#v93MainZone,#v93SideZone")){
        selectedIds.clear();
        applySelection();
        suppress(e);
      }
      return;
    }

    const id = node.dataset.cardId;
    const sourceZone = node.dataset.zoneName;

    if(e.metaKey || e.ctrlKey){ toggle(id); suppress(e); return; }
    if(e.shiftKey){ selectedIds.add(id); painting = true; applySelection(); suppress(e); return; }

    const now = Date.now();
    if(lastClick.id === id && now - lastClick.t < 420){
      const ids = selectedIds.has(id) ? [...selectedIds] : [id];
      moveCards(ids, sourceZone === "main" ? "side" : "main");
      lastClick = {id:null,t:0};
      suppress(e);
      return;
    }
    lastClick = {id,t:now};

    if(!selectedIds.has(id)) selectOnly(id);
    const ids = selectedIds.has(id) ? [...selectedIds] : [id];
    const r = node.getBoundingClientRect();
    const proxy = makeProxy(node, ids);
    drag = { ids, sourceZone, proxy, dx:e.clientX-r.left, dy:e.clientY-r.top, startX:e.clientX, startY:e.clientY, moved:false };
    document.querySelectorAll("#sideboardModal.v99-sideboard .v93-card").forEach(el=>{
      if(selectedIds.has(el.dataset.cardId)) el.classList.add("v20-drag-source");
    });
    suppress(e);
  }, true);

  window.addEventListener("mousemove", e=>{
    if(!isOpen()) return;

    if(painting){ addPaintAt(e.clientX,e.clientY); suppress(e); return; }
    if(!drag) return;

    drag.proxy.style.left = (e.clientX - drag.dx) + "px";
    drag.proxy.style.top = (e.clientY - drag.dy) + "px";
    if(Math.hypot(e.clientX-drag.startX, e.clientY-drag.startY) > 4) drag.moved = true;
    const z = zoneAt(e.clientX,e.clientY);
    mainZone()?.classList.toggle("drag-over", z === "main");
    sideZone()?.classList.toggle("drag-over", z === "side");
    suppress(e);
  }, true);

  window.addEventListener("mouseup", e=>{
    if(!isOpen()) return;

    if(painting){ painting = false; suppress(e); return; }
    if(!drag) return;

    const dest = zoneAt(e.clientX,e.clientY);
    const moved = drag.moved;
    const ids = drag.ids;
    clearProxy();

    if(moved && dest) moveCards(ids, dest);
    else applySelection();
    suppress(e);
  }, true);

  window.addEventListener("dblclick", e=>{
    if(!isOpen()) return;
    const node = cardNode(e.target);
    if(!node) return;
    const id = node.dataset.cardId;
    const source = node.dataset.zoneName;
    const ids = selectedIds.has(id) ? [...selectedIds] : [id];
    moveCards(ids, source === "main" ? "side" : "main");
    suppress(e);
  }, true);

  const previousRender = window.renderSideboardEditor;
  if(typeof previousRender === "function"){
    window.renderSideboardEditor = function(...args){
      const out = previousRender.apply(this,args);
      requestAnimationFrame(applySelection);
      return out;
    };
  }
})();

// layer24: place life dice over the library card area, not over the draw controls.
(function(){
  function layer24DeckMetrics(player){
    const cardW = Math.max(128, Math.min(window.innerWidth * 0.074, 168));
    const gap = Math.max(10, Math.min(window.innerWidth * 0.01, 18));
    const pad = Math.max(16, Math.min(window.innerWidth * 0.016, 30));
    const groupW = cardW * 2 + gap;
    const groupLeft = player === "p1" ? window.innerWidth - pad - groupW : pad;
    const groupTop = player === "p1" ? window.innerHeight - 28 - (cardW * 1.397 * 2 + gap + 32) : 28;
    return { cardW, gap, groupLeft, groupTop };
  }

  function layer24MakeLifeDice(player, life){
    const m = layer24DeckMetrics(player);
    const values = [];
    let rest = Math.max(1, life);
    while(rest > 0){
      values.push(Math.min(5, rest));
      rest -= 5;
    }

    const libraryLeft = m.groupLeft + m.cardW + m.gap;
    const startX = libraryLeft + 4;
    const startY = player === "p1"
      ? Math.max(window.innerHeight / 2 + 10, m.groupTop - 48)
      : m.groupTop + m.cardW * 1.397 * 2 + m.gap + 40;

    return values.map((value, i)=>({
      id: uid(),
      kind: "life",
      owner: player,
      value,
      x: startX + i * 44,
      y: startY,
      color: "#eeeeee",
      z: 1000 + i
    }));
  }

  makeLifeDice = layer24MakeLifeDice;
  window.makeLifeDice = layer24MakeLifeDice;
  syncLifeDice = function(player){
    state.dice = state.dice.filter(d => !(d.kind === "life" && d.owner === player)).concat(layer24MakeLifeDice(player, state.life[player]));
  };
  defaultDice = function(){
    return layer24MakeLifeDice("p1", 20).concat(layer24MakeLifeDice("p2", 20));
  };

  if(state && state.life){
    syncLifeDice("p1");
    syncLifeDice("p2");
    saveState?.();
    renderDice?.();
  }
})();


// layer25: MAIN sideboard zone gets real scroll height; life dice sit above draw controls without overlap.
(function(){
  function layer25Values(life){
    const values = [];
    let rest = Math.max(1, life);
    while(rest > 0){ values.push(Math.min(5, rest)); rest -= 5; }
    return values;
  }
  function layer25FallbackMetrics(player){
    const cardW = Math.max(128, Math.min(window.innerWidth * 0.074, 168));
    const gap = Math.max(10, Math.min(window.innerWidth * 0.01, 18));
    const pad = Math.max(16, Math.min(window.innerWidth * 0.016, 30));
    const groupW = cardW * 2 + gap;
    const groupLeft = player === "p1" ? window.innerWidth - pad - groupW : pad;
    const groupTop = player === "p1" ? window.innerHeight - 28 - (cardW * 1.397 * 2 + gap + 32) : 28;
    return { cardW, gap, groupLeft, groupTop };
  }
  function layer25MakeLifeDice(player, life){
    const values = layer25Values(life);
    const popover = document.getElementById(player === "p1" ? "p1DrawPopover" : "p2DrawPopover");
    let startX, startY;
    if(popover){
      const r = popover.getBoundingClientRect();
      if(r.width > 10 && r.height > 10){
        startX = r.left + 4;
        startY = player === "p1" ? r.top - 52 : r.bottom + 10;
      }
    }
    if(!Number.isFinite(startX) || !Number.isFinite(startY)){
      const m = layer25FallbackMetrics(player);
      startX = m.groupLeft + 4;
      startY = player === "p1" ? m.groupTop - 52 : m.groupTop + m.cardW * 1.397 * 2 + m.gap + 40;
    }
    return values.map((value, i)=>({ id: uid(), kind: "life", owner: player, value, x: startX + i * 44, y: startY, color: "#eeeeee", z: 1000 + i }));
  }
  makeLifeDice = layer25MakeLifeDice;
  window.makeLifeDice = layer25MakeLifeDice;
  syncLifeDice = function(player){ state.dice = state.dice.filter(d => !(d.kind === "life" && d.owner === player)).concat(layer25MakeLifeDice(player, state.life[player])); };
  defaultDice = function(){ return layer25MakeLifeDice("p1", 20).concat(layer25MakeLifeDice("p2", 20)); };
  function refreshLifeDice(){ if(!state || !state.life) return; syncLifeDice("p1"); syncLifeDice("p2"); saveState?.(); renderDice?.(); }
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", refreshLifeDice, {once:true}); else setTimeout(refreshLifeDice, 0);
  window.addEventListener("resize", () => setTimeout(refreshLifeDice, 80));
})();


// layer27: mulligan button + G/H/E hover shortcuts.
(function(){
  function ownerOf(card){
    return (card && card.owner) || state.activePlayer || "p1";
  }

  function cardById(id){
    if(!id) return null;
    return state.cards.find(c => c.id === id) || null;
  }

  function setHoveredCardFromEvent(e){
    const node = e.target && e.target.closest ? e.target.closest("[data-card-id]") : null;
    if(!node){
      window.__hoveredGameCardId = null;
      return;
    }
    const id = node.dataset.cardId;
    if(cardById(id)) window.__hoveredGameCardId = id;
  }

  document.addEventListener("mouseover", setHoveredCardFromEvent, true);
  document.addEventListener("mouseout", e=>{
    const node = e.target && e.target.closest ? e.target.closest("[data-card-id]") : null;
    if(node && node.dataset.cardId === window.__hoveredGameCardId){
      const next = e.relatedTarget && e.relatedTarget.closest ? e.relatedTarget.closest("[data-card-id]") : null;
      if(!next || next.dataset.cardId !== node.dataset.cardId) window.__hoveredGameCardId = null;
    }
  }, true);

  function selectedOrHoveredCards(){
    const selectedIds = Array.isArray(state.selectedCardIds) ? state.selectedCardIds.filter(id => cardById(id)) : [];
    if(selectedIds.length > 1) return selectedIds.map(cardById).filter(Boolean);
    const hovered = cardById(window.__hoveredGameCardId);
    if(hovered) return [hovered];
    if(selectedIds.length === 1) return [cardById(selectedIds[0])].filter(Boolean);
    return [];
  }

  function putCardsTo(zoneKind){
    const cards = selectedOrHoveredCards();
    if(!cards.length) return false;
    const ids = new Set(cards.map(c=>c.id));
    cards.forEach(card=>{
      const owner = ownerOf(card);
      if(zoneKind === "hand"){
        card.zone = `${owner}-hand`;
        card.tapped = false;
        card.faceDown = false;
        bringCardToFront(card);
      } else if(zoneKind === "graveyard" || zoneKind === "exile"){
        moveCardToPublicPile(card, `${owner}-${zoneKind}`);
      }
    });
    state.selectedCardIds = (state.selectedCardIds || []).filter(id => !ids.has(id));
    state.revealedLibraryTop.p1 = false;
    state.revealedLibraryTop.p2 = false;
    saveState();
    render();
    if(els.libraryModal && !els.libraryModal.classList.contains("hidden")) renderLibraryGrid();
    return true;
  }

  function mulliganPlayer(player){
    if(!confirm("are you really sure about mulligan?")) return;

    const playerCards = state.cards
      .filter(c => ownerOf(c) === player && !c.token)
      .map((c, i) => ({
        ...c,
        zone: `${player}-library`,
        tapped: false,
        faceDown: false,
        x: 180,
        y: 120,
        z: i
      }));

    const otherCards = state.cards.filter(c => ownerOf(c) !== player);
    if(window.animateLibraryShuffleLayer49) window.animateLibraryShuffleLayer49(player);
    const shuffled = shuffleArray(playerCards);
    state.cards = otherCards.concat(shuffled);

    for(let i=0; i<7; i++){
      const lib = state.cards.filter(c => c.zone === `${player}-library`);
      if(!lib.length) break;
      const card = lib[lib.length - 1];
      card.zone = `${player}-hand`;
      card.tapped = false;
      card.faceDown = false;
      bringCardToFront(card);
    }

    state.selectedCardIds = [];
    state.selectedDieIds = [];
    state.revealedLibraryTop[player] = false;
    state.expandedPile = null;
    saveState();
    render();
  }

  function bindMulligans(){
    // layer56: old mulligan binding disabled. Animated mulligan is bound later.
  }

  bindMulligans();

  document.addEventListener("keydown", e=>{
    const tag = (document.activeElement && document.activeElement.tagName || "").toLowerCase();
    if(tag === "input" || tag === "textarea" || tag === "select") return;
    if(e.metaKey || e.ctrlKey || e.altKey) return;

    const k = e.key.toLowerCase();
    if(k === "g"){
      if(putCardsTo("graveyard")){ e.preventDefault(); e.stopImmediatePropagation(); }
    } else if(k === "h"){
      if(putCardsTo("hand")){ e.preventDefault(); e.stopImmediatePropagation(); }
    } else if(k === "e"){
      if(putCardsTo("exile")){ e.preventDefault(); e.stopImmediatePropagation(); }
    }
  }, true);
})();

// layer29: tap shortcut, direct dice number shortcut, visible dice color slider, token public-zone cleanup.
(function(){
  function cardById29(id){
    if(!id) return null;
    return state.cards.find(c => c.id === id) || null;
  }

  function hoveredCard29(){
    return cardById29(window.__hoveredGameCardId);
  }

  function selectedOrHoveredCards29(){
    const selectedIds = Array.isArray(state.selectedCardIds) ? state.selectedCardIds.filter(id => cardById29(id)) : [];
    if(selectedIds.length > 1) return selectedIds.map(cardById29).filter(Boolean);
    const hovered = hoveredCard29();
    if(hovered) return [hovered];
    if(selectedIds.length === 1) return [cardById29(selectedIds[0])].filter(Boolean);
    return [];
  }

  function removePublicTokens29(){
    const before = state.cards.length;
    state.cards = state.cards.filter(c => !(c && c.token && typeof c.zone === "string" && (c.zone.endsWith("-graveyard") || c.zone.endsWith("-exile"))));
    return state.cards.length !== before;
  }

  const previousMoveCardToPublicPile = moveCardToPublicPile;
  moveCardToPublicPile = function(card, zone){
    if(!card) return;
    if(card.token){
      state.cards = state.cards.filter(c => c.id !== card.id);
      return;
    }
    previousMoveCardToPublicPile(card, zone);
    removePublicTokens29();
  };

  const previousRender29 = render;
  render = function(){
    removePublicTokens29();
    previousRender29();
  };

  function tapCards29(){
    const cards = selectedOrHoveredCards29().filter(c => c.zone === "battlefield");
    if(!cards.length) return false;
    const next = !cards[0].tapped;
    cards.forEach(c => c.tapped = next);
    saveState();
    render();
    return true;
  }

  function setHoveredOrSelectedDieValue29(n){
    let targets = [];
    if(Array.isArray(state.selectedDieIds) && state.selectedDieIds.length){
      targets = state.dice.filter(d => state.selectedDieIds.includes(d.id));
    }
    if(!targets.length && state.hoveredDieId){
      const die = state.dice.find(d => d.id === state.hoveredDieId);
      if(die) targets = [die];
    }
    if(!targets.length) return false;
    targets.forEach(d => d.value = n);
    saveState();
    renderDice();
    return true;
  }

  const oldOpenDiceMenu29 = openDiceMenu;
  openDiceMenu = function(e, die){
    oldOpenDiceMenu29(e, die);
    if(els.dieColorBox) els.dieColorBox.style.display = "block";
  };

  function cleanupDiceMenu29(){
    document.querySelectorAll('#diceMenu button[data-die-action="color"]').forEach(btn => btn.remove());
    const box = document.getElementById('dieColorBox');
    if(box) box.style.display = 'block';
  }
  cleanupDiceMenu29();
  document.addEventListener('contextmenu', () => setTimeout(cleanupDiceMenu29, 0), true);

  document.addEventListener("keydown", e=>{
    const tag = (document.activeElement && document.activeElement.tagName || "").toLowerCase();
    if(tag === "input" || tag === "textarea" || tag === "select") return;
    if(e.metaKey || e.ctrlKey || e.altKey) return;

    const k = e.key.toLowerCase();
    if(k === "t"){
      if(tapCards29()){
        e.preventDefault();
        e.stopImmediatePropagation();
      }
      return;
    }

    if(["1","2","3","4","5","6"].includes(k)){
      if(setHoveredOrSelectedDieValue29(Number(k))){
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    }
  }, true);
})();

// layer31: opponent hand always shows card backs + OG BACK 2 sleeve image support.
(function(){
  function currentSleeve31(){
    const sel = document.getElementById("sleeveSelect");
    return (sel && sel.value) || state.sleeve || "black";
  }

  const previousApplySleeve31 = applySleeve;
  applySleeve = function(){
    if(typeof previousApplySleeve31 === "function") previousApplySleeve31();

    const sleeve = currentSleeve31();
    document.body.classList.toggle("sleeve-ogback2", sleeve === "ogback2");
    document.body.classList.toggle("sleeve-transparent", sleeve === "transparent");

    if(sleeve === "ogback2"){
      document.documentElement.style.setProperty("--sleeve", "#000000");
    }
  };

  const previousCreateCardElement31 = createCardElement;
  createCardElement = function(card, className){
    const el = previousCreateCardElement31(card, className);

    // Opponent hand is private information: always render it as a sleeved back locally,
    // without changing the actual card data. Drag/drop logic still sees the real card.
    if(card && card.zone === "p2-hand"){
      el.classList.add("face-down", "opponent-hand-back");
    }

    return el;
  };

  const previousRender31 = render;
  render = function(){
    applySleeve();
    previousRender31();
  };

  applySleeve();
  render();
})();

// layer33: private opponent hand hard lock + reveal hand toggle + draw shortcuts.
(function(){
  if(!state.revealedHand) state.revealedHand = { p1:false, p2:false };

  const previousSaveState33 = saveState;
  saveState = function(){
    previousSaveState33();
    try{
      const raw = localStorage.getItem("oldschoolTabletopV99");
      if(raw){
        const data = JSON.parse(raw);
        data.revealedHand = state.revealedHand || {p1:false,p2:false};
        localStorage.setItem("oldschoolTabletopV99", JSON.stringify(data));
      }
    }catch(_){ }
  };

  const previousLoadState33 = loadState;
  loadState = function(){
    const ok = previousLoadState33();
    try{
      const raw = localStorage.getItem("oldschoolTabletopV99");
      if(raw){
        const data = JSON.parse(raw);
        state.revealedHand = data.revealedHand || state.revealedHand || {p1:false,p2:false};
      }
    }catch(_){ }
    if(!state.revealedHand) state.revealedHand = {p1:false,p2:false};
    return ok;
  };

  function handIsRevealed(player){
    return !!(state.revealedHand && state.revealedHand[player]);
  }

  const previousCreateCardElement33 = createCardElement;
  createCardElement = function(card, className){
    const el = previousCreateCardElement33(card, className);
    if(card && card.zone === "p2-hand"){
      el.classList.add("opponent-hand-private");
      if(!handIsRevealed("p2")){
        el.classList.add("face-down", "opponent-hand-back");
        el.setAttribute("title", "opponent hand");
      } else {
        el.classList.remove("face-down", "opponent-hand-back");
        el.setAttribute("title", card.name || "revealed card");
      }
    }
    return el;
  };

  function blockOpponentHandEvent(e){
    const cardEl = e.target && e.target.closest ? e.target.closest('.card[data-card-id]') : null;
    if(!cardEl) return;
    const card = state.cards.find(c => c.id === cardEl.dataset.cardId);
    if(card && card.zone === 'p2-hand'){
      e.preventDefault();
      e.stopImmediatePropagation();

      // Opponent hand is private. Actual discard-mark toggling is handled
      // by layer59 on pointerdown so older click handlers cannot double-toggle it.
    }
  }
  ['pointerdown','pointerup','click','dblclick','contextmenu','mousedown','mouseup'].forEach(type=>{
    document.addEventListener(type, blockOpponentHandEvent, true);
  });

  function toggleRevealHand(player){
    if(!state.revealedHand) state.revealedHand = {p1:false,p2:false};
    state.revealedHand[player] = !state.revealedHand[player];
    saveState();
    render();
  }

  function syncRevealHandButtonLabels(){
    for(const p of ['p1','p2']){
      const btn = document.getElementById(`${p}RevealHandBtn`);
      if(btn) btn.textContent = handIsRevealed(p) ? 'hide hand' : 'reveal hand';
    }
  }

  document.getElementById('p1RevealHandBtn')?.addEventListener('click', e=>{
    e.preventDefault();
    toggleRevealHand('p1');
  });
  document.getElementById('p2RevealHandBtn')?.addEventListener('click', e=>{
    e.preventDefault();
    toggleRevealHand('p2');
  });

  for(const p of ['p1','p2']){
    const zone = document.getElementById(`${p}LibraryZone`);
    if(zone){
      zone.addEventListener('dblclick', e=>{
        e.preventDefault();
        e.stopPropagation();
        if(window.animatedDrawManyLayer49) window.animatedDrawManyLayer49(p, 1); else drawCard(p);
      }, true);
    }
  }

  document.addEventListener('keydown', e=>{
    const tag = (document.activeElement && document.activeElement.tagName || '').toLowerCase();
    if(tag === 'input' || tag === 'textarea' || tag === 'select') return;
    if(e.metaKey || e.ctrlKey || e.altKey) return;
    if(e.key === 'Tab'){
      e.preventDefault();
      e.stopImmediatePropagation();
      if(window.animatedDrawManyLayer49) window.animatedDrawManyLayer49(state.activePlayer || 'p1', 1); else drawCard(state.activePlayer || 'p1');
    }
  }, true);

  const previousRender33 = render;
  render = function(){
    previousRender33();
    syncRevealHandButtonLabels();
  };

  syncRevealHandButtonLabels();
  render();
})();

// layer34: keep opponent private hand out of inspector + restrict double-click draw to the actual library stack.
(function(){
  function isOpponentPrivateHandCard34(card){
    if(!card || card.zone !== 'p2-hand') return false;
    return !(state.revealedHand && state.revealedHand.p2);
  }

  const previousShowOracle34 = showOracle;
  showOracle = function(card){
    if(isOpponentPrivateHandCard34(card)){
      if(els.oraclePanel) els.oraclePanel.classList.add('hidden');
      return;
    }
    return previousShowOracle34(card);
  };

  function isInsideLibraryZone34(target){
    return target && target.closest && target.closest('#p1LibraryZone, #p2LibraryZone');
  }

  function isActualLibraryStack34(target){
    return target && target.closest && target.closest('#p1LibraryVisual, #p2LibraryVisual');
  }

  // Earlier layers attached double-click draw to the whole library zone. Prevent
  // controls such as reveal hand / mulligan / reveal top from bubbling into that handler.
  document.addEventListener('dblclick', function(e){
    if(!isInsideLibraryZone34(e.target)) return;
    if(isActualLibraryStack34(e.target)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
  }, true);
})();

// layer35: hard-block inspector from unrevealed opponent hand cards.
(function(){
  function isUnrevealedOpponentHandCard(card){
    return !!(card && card.zone === 'p2-hand' && !(state.revealedHand && state.revealedHand.p2));
  }

  function cardFromTarget35(target){
    const node = target && target.closest ? target.closest('[data-card-id]') : null;
    if(!node) return null;
    const all = state.cards.concat(state.sideboardCards || []);
    return all.find(c => c.id === node.dataset.cardId) || null;
  }

  function clearInspector35(){
    const panels = [
      document.getElementById('oraclePanel'),
      document.getElementById('cardInspectorV79'),
      document.getElementById('cardInspectorV62')
    ].filter(Boolean);

    panels.forEach(panel => {
      panel.classList.add('hidden');
      panel.classList.remove('visible');
    });

    const contents = [
      document.getElementById('inspectorContentV79'),
      document.getElementById('inspectorContentV78'),
      document.getElementById('oraclePanelText'),
      document.querySelector('#cardInspectorV79 [id*="Content"]'),
      document.querySelector('#cardInspectorV62 [id*="Content"]')
    ].filter(Boolean);

    contents.forEach(el => { el.innerHTML = ''; });
  }

  const previousShowOracle35 = showOracle;
  showOracle = function(card){
    if(isUnrevealedOpponentHandCard(card)){
      clearInspector35();
      return;
    }
    return previousShowOracle35(card);
  };
  window.showOracle = showOracle;

  function blockPrivateHandInspector35(e){
    const card = cardFromTarget35(e.target);
    if(!isUnrevealedOpponentHandCard(card)) return;
    clearInspector35();
    // This event is only inspector/privacy related; block later hover handlers too.
    e.stopImmediatePropagation();
  }

  document.addEventListener('mouseover', blockPrivateHandInspector35, true);
  document.addEventListener('mousemove', blockPrivateHandInspector35, true);
  document.addEventListener('mouseenter', blockPrivateHandInspector35, true);
})();

// layer38: actual visible library-area redesign.
(function(){
  const EXILE_MODAL_ID = 'l38ExileModal';
  let exilePlayer = 'p1';
  let selectedExileId = null;
  let drawHoverPlayer = null;

  function isTyping(){
    const tag = (document.activeElement && document.activeElement.tagName || '').toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select';
  }
  function topZ(){ return Math.max(100, ...state.cards.map(c => c.z || 1)) + 1; }

  function ensureExileModal(){
    if(document.getElementById(EXILE_MODAL_ID)) return;
    const modal = document.createElement('div');
    modal.id = EXILE_MODAL_ID;
    modal.className = 'modal hidden';
    modal.innerHTML = '<div class="modal-box"><h1 id="l38ExileTitle">EXILE</h1><div id="l38ExileGrid"></div><div class="modal-row"><button type="button" id="l38ExilePutBackBtn">put back</button><button type="button" id="l38ExileCloseBtn">close</button></div></div>';
    document.body.appendChild(modal);
    document.getElementById('l38ExileCloseBtn').addEventListener('click', () => modal.classList.add('hidden'));
    document.getElementById('l38ExilePutBackBtn').addEventListener('click', () => {
      const card = state.cards.find(c => c.id === selectedExileId);
      if(!card) return;
      card.zone = 'battlefield';
      card.faceDown = false;
      card.tapped = false;
      card.x = innerWidth / 2 - CARD_W / 2;
      card.y = innerHeight / 2 - CARD_H / 2;
      card.z = topZ();
      selectedExileId = null;
      saveState();
      render();
      modal.classList.add('hidden');
    });
  }

  function openExileModal(player){
    ensureExileModal();
    exilePlayer = player;
    selectedExileId = null;
    renderExileModal();
    document.getElementById(EXILE_MODAL_ID).classList.remove('hidden');
  }

  function renderExileModal(){
    ensureExileModal();
    const grid = document.getElementById('l38ExileGrid');
    const title = document.getElementById('l38ExileTitle');
    const cards = zoneCards(`${exilePlayer}-exile`).slice().reverse();
    title.textContent = `EXILE (${cards.length})`;
    grid.innerHTML = '';
    cards.forEach(card => {
      const wrap = document.createElement('div');
      wrap.className = 'l38-exile-card' + (selectedExileId === card.id ? ' selected' : '');
      wrap.dataset.cardId = card.id;
      const img = document.createElement('img');
      img.src = card.image;
      img.alt = card.name || '';
      img.draggable = false;
      wrap.appendChild(img);
      wrap.addEventListener('mouseenter', () => showOracle(card));
      wrap.addEventListener('mouseleave', hideOracle);
      wrap.addEventListener('click', () => { selectedExileId = card.id; renderExileModal(); });
      grid.appendChild(wrap);
    });
  }

  function renderGraveyard(player, el){
    if(!el) return;
    [...el.querySelectorAll('.small-card-preview,.expanded-stack,.l38-grave-scroll,.l38-exile-box')].forEach(x => x.remove());
    const cards = zoneCards(`${player}-graveyard`);
    const scroll = document.createElement('div');
    scroll.className = 'l38-grave-scroll';
    const inner = document.createElement('div');
    inner.className = 'l38-grave-inner';
    const cardW = Math.max(118, el.getBoundingClientRect().width || CARD_W);
    const cardH = Math.round(cardW * 1.397);
    const step = Math.max(26, Math.round(cardH * 0.18));
    inner.style.height = `${Math.max(cardH, cardH + Math.max(0, cards.length - 1) * step)}px`;
    cards.forEach((card, index) => {
      const node = document.createElement('div');
      node.className = 'l38-grave-card';
      node.dataset.cardId = card.id;
      node.style.top = `${index * step}px`;
      node.style.zIndex = String(100 + index);
      const img = document.createElement('img');
      img.src = card.image;
      img.alt = card.name || '';
      img.draggable = false;
      node.appendChild(img);
      node.addEventListener('mouseenter', () => showOracle(card));
      node.addEventListener('mouseleave', hideOracle);
      node.addEventListener('contextmenu', e => openCardMenu(e, card));
      node.addEventListener('pointerdown', e => startCardDrag(e, card));
      inner.appendChild(node);
    });
    scroll.appendChild(inner);
    el.appendChild(scroll);
    if(cards.length) scroll.scrollTop = scroll.scrollHeight;
  }

  function renderExileBox(player, el){
    if(!el) return;
    [...el.querySelectorAll('.small-card-preview,.expanded-stack,.l38-grave-scroll,.l38-exile-box')].forEach(x => x.remove());
    const count = zoneCards(`${player}-exile`).length;
    const box = document.createElement('div');
    box.className = 'l38-exile-box';
    box.textContent = `EXILE (${count})`;
    box.title = `EXILE (${count})`;
    box.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); openExileModal(player); });
    el.appendChild(box);
  }

  renderSmallStacks = function(){
    for(const p of ['p1','p2']){
      renderGraveyard(p, els[`${p}GraveyardZone`]);
      renderExileBox(p, els[`${p}ExileZone`]);
    }
  };
  renderExpandedPile = function(){ return; };

  function setDrawAmount(player, value){
    const slider = els[`${player}DrawAmountSlider`];
    const label = els[`${player}DrawAmountLabel`];
    const max = Math.min(30, Math.max(1, zoneCards(`${player}-library`).length || 1));
    const n = Math.max(1, Math.min(max, Number(value) || 1));
    if(slider){ slider.max = String(max); slider.value = String(n); }
    if(label) label.textContent = String(n);
    const btn = document.getElementById(`${player}L38DrawButton`);
    if(btn) btn.textContent = `DRAW ${n}`;
  }
  function adjustDrawAmount(player, delta){ setDrawAmount(player, Number(els[`${player}DrawAmountSlider`]?.value || 1) + delta); }

  function buildControls(player){
    const controls = document.getElementById(`${player}DrawPopover`);
    if(!controls || controls.dataset.l38Built === '1') return;
    controls.dataset.l38Built = '1';
    const drawBtn = document.getElementById(`${player}DrawManyBtn`);
    const shuffleBtn = document.getElementById(`${player}ShuffleBtn`);
    const mulliganBtn = document.getElementById(`${player}MulliganBtn`);
    const tutorBtn = document.getElementById(`${player}TutorBtn`);
    const revealTopBtn = document.getElementById(`${player}RevealBtn`);
    const revealHandBtn = document.getElementById(`${player}RevealHandBtn`);
    const slider = document.getElementById(`${player}DrawAmountSlider`);
    const oldLabel = controls.querySelector('label');
    if(oldLabel) oldLabel.style.display = 'none';
    if(slider) slider.style.display = 'none';
    if(drawBtn) drawBtn.style.display = 'none';
    const drawRow = document.createElement('div');
    drawRow.className = 'l38-draw-row';
    drawRow.id = `${player}L38DrawRow`;
    drawRow.innerHTML = `<button type="button" id="${player}L38DrawButton" class="l38-draw-button">DRAW 1</button><div class="l38-draw-arrows"><button type="button" data-l38-delta="1">△</button><button type="button" data-l38-delta="-1">▽</button></div>`;
    const grid = document.createElement('div');
    grid.className = 'l38-button-grid';
    function put(btn){ if(btn){ btn.style.display = ''; grid.appendChild(btn); } }
    put(shuffleBtn); put(mulliganBtn); put(tutorBtn); put(revealTopBtn); put(revealHandBtn);
    for(let i=0;i<3;i++){ const b=document.createElement('button'); b.type='button'; b.className='l38-future-button'; b.textContent='x'; b.disabled=true; grid.appendChild(b); }
    controls.appendChild(drawRow); controls.appendChild(grid);
    controls.addEventListener('pointerdown', e => {
      const b = e.target.closest('button');
      if(!b || b.disabled) return;
      b.classList.add('l41-pressed');
      setTimeout(() => b.classList.remove('l41-pressed'), 220);
    });
    drawRow.addEventListener('mouseenter', () => { drawHoverPlayer = player; });
    drawRow.addEventListener('mouseleave', () => { if(drawHoverPlayer === player) drawHoverPlayer = null; });
    drawRow.querySelector(`#${player}L38DrawButton`).addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); drawMany(player, Number(els[`${player}DrawAmountSlider`]?.value || 1)); });
    drawRow.addEventListener('click', e => { const b=e.target.closest('button[data-l38-delta]'); if(!b) return; e.preventDefault(); e.stopPropagation(); adjustDrawAmount(player, Number(b.dataset.l38Delta)); });
    let dragStart = null;
    drawRow.addEventListener('pointerdown', e => { if(e.target.closest('button[data-l38-delta]')) return; dragStart = { y:e.clientY, base:Number(slider?.value || 1) }; drawRow.setPointerCapture?.(e.pointerId); e.preventDefault(); });
    drawRow.addEventListener('pointermove', e => { if(!dragStart) return; const dy = dragStart.y - e.clientY; setDrawAmount(player, dragStart.base + Math.round(dy / 8)); });
    drawRow.addEventListener('pointerup', () => { dragStart = null; });
    setDrawAmount(player, Number(slider?.value || 1));
  }
  function enhanceControls(){ for(const p of ['p1','p2']) buildControls(p); }

  const oldUpdateDrawControls38 = updateDrawControls;
  updateDrawControls = function(){
    if(typeof oldUpdateDrawControls38 === 'function') oldUpdateDrawControls38();
    enhanceControls();
    for(const p of ['p1','p2']) setDrawAmount(p, Number(els[`${p}DrawAmountSlider`]?.value || 1));
  };
  const oldShuffle38 = shuffleLibrary;
  shuffleLibrary = function(player){
    const visual = els[`${player}LibraryVisual`];
    if(visual){ visual.classList.remove('l38-shuffling'); void visual.offsetWidth; visual.classList.add('l38-shuffling'); setTimeout(() => visual.classList.remove('l38-shuffling'), 2050); }
    return oldShuffle38(player);
  };
  document.addEventListener('pointerup', e => {
    const drag = state.dragging;
    if(!drag || drag.type !== 'die') return;
    const target = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-kind="exile"]');
    if(!target) return;
    const dieId = drag.dieId;
    setTimeout(() => { const before = state.dice.length; state.dice = state.dice.filter(d => d.id !== dieId); if(state.dice.length !== before){ saveState(); renderDice(); } }, 0);
  }, true);
  document.addEventListener('keydown', e => {
    if(isTyping()) return;
    if(drawHoverPlayer && (e.metaKey || e.ctrlKey) && (e.key === 'ArrowUp' || e.key === 'ArrowDown')){ e.preventDefault(); e.stopImmediatePropagation(); adjustDrawAmount(drawHoverPlayer, e.key === 'ArrowUp' ? 1 : -1); return; }
    if(drawHoverPlayer && /^[1-9]$/.test(e.key)){ e.preventDefault(); e.stopImmediatePropagation(); setDrawAmount(drawHoverPlayer, Number(e.key)); }
  }, true);
  ensureExileModal();
  const oldRender38 = render;
  render = function(){ oldRender38(); enhanceControls(); };
  enhanceControls();
  render();
})();

// layer40: life dice row belongs above the library card, and the library sits below it.
(function(){
  function valuesForLife(life){
    const values = [];
    let rest = Math.max(1, life);
    while(rest > 0){
      values.push(Math.min(5, rest));
      rest -= 5;
    }
    return values;
  }

  function zoneRect(player){
    const zone = document.getElementById(`${player}LibraryZone`);
    if(zone){
      const r = zone.getBoundingClientRect();
      if(r.width > 20 && r.height > 20) return r;
    }
    return null;
  }

  function fallback(player){
    const cardW = Math.max(128, Math.min(window.innerWidth * 0.074, 168));
    const gap = Math.max(10, Math.min(window.innerWidth * 0.01, 18));
    const pad = Math.max(16, Math.min(window.innerWidth * 0.016, 30));
    const groupW = cardW * 2 + gap;
    const left = player === 'p1' ? window.innerWidth - pad - groupW : pad;
    const top = player === 'p1' ? window.innerHeight - 28 - (cardW * 1.397 * 2 + gap + 32) : 28;
    return { left, top, width: cardW, height: cardW * 1.397 };
  }

  function layer40MakeLifeDice(player, life){
    const values = valuesForLife(life);
    const r = zoneRect(player) || fallback(player);
    const dieSize = 42;
    const step = 44;
    const x = r.left + 8;
    const y = player === 'p1'
      ? Math.max(4, r.top - dieSize - 8)
      : Math.min(window.innerHeight - dieSize - 4, r.bottom + 8);

    return values.map((value, i)=>({
      id: uid(),
      kind: 'life',
      owner: player,
      value,
      x: x + i * step,
      y,
      color: '#eeeeee',
      z: 1000 + i
    }));
  }

  makeLifeDice = layer40MakeLifeDice;
  window.makeLifeDice = layer40MakeLifeDice;
  syncLifeDice = function(player){
    state.dice = state.dice.filter(d => !(d.kind === 'life' && d.owner === player)).concat(layer40MakeLifeDice(player, state.life[player]));
  };
  defaultDice = function(){ return layer40MakeLifeDice('p1', 20).concat(layer40MakeLifeDice('p2', 20)); };

  function refresh(){
    if(!state || !state.life) return;
    syncLifeDice('p1');
    syncLifeDice('p2');
    saveState?.();
    renderDice?.();
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(refresh, 0), {once:true});
  else setTimeout(refresh, 0);
  window.addEventListener('resize', () => setTimeout(refresh, 80));
})();


// layer42: final library-area fixes — robust shuffle shake and no wheel draw-change.
(function(){
  const previousShuffle42 = shuffleLibrary;
  shuffleLibrary = function(player){
    const zone = document.getElementById(`${player}LibraryZone`);
    const visual = document.getElementById(`${player}LibraryVisual`);
    [zone, visual].forEach(el => {
      if(!el) return;
      el.classList.remove('l42-shuffling');
      void el.offsetWidth;
      el.classList.add('l42-shuffling');
      setTimeout(() => el.classList.remove('l42-shuffling'), 2050);
    });
    return previousShuffle42(player);
  };

  function syncL42DrawButtons(){
    for(const p of ['p1','p2']){
      const slider = document.getElementById(`${p}DrawAmountSlider`);
      const btn = document.getElementById(`${p}L38DrawButton`);
      if(btn){
        const n = Math.max(1, Math.min(30, Number(slider?.value || 1)));
        btn.textContent = `DRAW ${n}`;
        btn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          drawMany(p, n);
        };
      }
    }
  }
  const oldRender42 = render;
  render = function(){ oldRender42(); syncL42DrawButtons(); };
  syncL42DrawButtons();
})();

// layer43: clamp life dice to the correct side of the center line.
(function(){
  function valuesForLife43(life){
    const values = [];
    let rest = Math.max(1, life);
    while(rest > 0){ values.push(Math.min(5, rest)); rest -= 5; }
    return values;
  }

  function zoneRect43(player){
    const zone = document.getElementById(`${player}LibraryZone`);
    if(zone){
      const r = zone.getBoundingClientRect();
      if(r.width > 20 && r.height > 20) return r;
    }
    const cardW = Math.max(128, Math.min(window.innerWidth * 0.074, 168));
    const gap = Math.max(10, Math.min(window.innerWidth * 0.01, 18));
    const pad = Math.max(16, Math.min(window.innerWidth * 0.016, 30));
    const groupW = cardW * 2 + gap;
    const left = player === 'p1' ? window.innerWidth - pad - groupW : pad;
    const top = player === 'p1'
      ? window.innerHeight / 2 + 74
      : window.innerHeight / 2 - 74 - cardW * 1.397;
    return { left, top, width: cardW, height: cardW * 1.397, bottom: top + cardW * 1.397 };
  }

  function layer43MakeLifeDice(player, life){
    const values = valuesForLife43(life);
    const r = zoneRect43(player);
    const dieSize = 42;
    const step = 44;
    const center = window.innerHeight / 2;
    const x = r.left + 8;
    let y = player === 'p1' ? r.top - dieSize - 8 : r.bottom + 8;

    if(player === 'p1') y = Math.max(center + 8, y);
    else y = Math.min(center - dieSize - 8, y);

    return values.map((value, i)=>({
      id: uid(),
      kind: 'life',
      owner: player,
      value,
      x: x + i * step,
      y,
      color: '#eeeeee',
      z: 1000 + i
    }));
  }

  makeLifeDice = layer43MakeLifeDice;
  window.makeLifeDice = layer43MakeLifeDice;
  syncLifeDice = function(player){
    state.dice = state.dice.filter(d => !(d.kind === 'life' && d.owner === player)).concat(layer43MakeLifeDice(player, state.life[player]));
  };
  defaultDice = function(){ return layer43MakeLifeDice('p1', 20).concat(layer43MakeLifeDice('p2', 20)); };

  function refresh43(){
    if(!state || !state.life) return;
    syncLifeDice('p1');
    syncLifeDice('p2');
    saveState?.();
    renderDice?.();
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(refresh43, 0), {once:true});
  else setTimeout(refresh43, 0);
  window.addEventListener('resize', () => setTimeout(refresh43, 80));
})();

// layer44: locked deck-widget behavior. DRAW X works; only library visual shakes.
(function(){
  function libraryCards(player){ return state.cards.filter(c => c.zone === `${player}-library`); }
  function drawAmount44(player){
    const slider = document.getElementById(`${player}DrawAmountSlider`);
    const n = Math.max(1, Math.min(30, Number(slider && slider.value ? slider.value : 1)));
    return n;
  }
  function syncDrawLabel44(player){
    const slider = document.getElementById(`${player}DrawAmountSlider`);
    const btn = document.getElementById(`${player}L38DrawButton`);
    const max = Math.min(30, Math.max(1, libraryCards(player).length || 1));
    let n = Math.max(1, Math.min(max, Number(slider && slider.value ? slider.value : 1)));
    if(slider){ slider.max = String(max); slider.value = String(n); }
    if(btn) btn.textContent = `DRAW ${n}`;
  }

  function drawExact44(player){
    const n = drawAmount44(player);
    for(let i = 0; i < n; i++) drawCard(player);
  }

  function shuffleExact44(player){
    const zone = `${player}-library`;
    const others = state.cards.filter(c => c.zone !== zone);
    const lib = shuffleArray(zoneCards(zone));
    state.cards = others.concat(lib);
    state.revealedLibraryTop[player] = false;
    saveState();
    render();
    requestAnimationFrame(() => {
      const visual = document.getElementById(`${player}LibraryVisual`);
      if(!visual) return;
      visual.classList.remove('l38-shuffling','l42-shuffling','l44-shuffling');
      void visual.offsetWidth;
      visual.classList.add('l44-shuffling');
      setTimeout(() => visual.classList.remove('l44-shuffling'), 2050);
    });
  }

  shuffleLibrary = shuffleExact44;
  window.shuffleLibrary = shuffleExact44;

  document.addEventListener('click', (e) => {
    const drawBtn = e.target.closest('button[id$="L38DrawButton"]');
    if(drawBtn){
      e.preventDefault();
      e.stopImmediatePropagation();
      const player = drawBtn.id.startsWith('p2') ? 'p2' : 'p1';
      drawExact44(player);
      return;
    }
    const deltaBtn = e.target.closest('button[data-l38-delta]');
    if(deltaBtn){
      const row = deltaBtn.closest('.l38-draw-row');
      const player = row && row.id && row.id.startsWith('p2') ? 'p2' : 'p1';
      const slider = document.getElementById(`${player}DrawAmountSlider`);
      const max = Math.min(30, Math.max(1, libraryCards(player).length || 1));
      const n = Math.max(1, Math.min(max, Number(slider && slider.value ? slider.value : 1) + Number(deltaBtn.dataset.l38Delta || 0)));
      if(slider) slider.value = String(n);
      syncDrawLabel44(player);
    }
  }, true);

  // Kill the old vertical drag behavior for DRAW X. Click and arrow buttons remain.
  document.addEventListener('pointerdown', (e) => {
    if(e.target.closest('.l38-draw-row')){
      const isArrow = !!e.target.closest('button[data-l38-delta]');
      const isDraw = !!e.target.closest('button[id$="L38DrawButton"]');
      if(isArrow || isDraw){
        // allow normal click handlers
        return;
      }
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  }, true);

  const oldRender44 = render;
  render = function(){
    oldRender44();
    syncDrawLabel44('p1');
    syncDrawLabel44('p2');
  };

  syncDrawLabel44('p1');
  syncDrawLabel44('p2');
})();

// layer45: private non-dimming overlays, fixed DRAW X, tutor/orb/star toggles, opponent grave viewer.
(function(){
  function playerFromId(id){ return id && id.startsWith('p2') ? 'p2' : 'p1'; }
  function otherPlayer(p){ return p === 'p1' ? 'p2' : 'p1'; }
  function isVisible(el){ return !!el && !el.classList.contains('hidden') && el.style.display !== 'none'; }

  function drawExactLayer45(player){
    const slider = document.getElementById(`${player}DrawAmountSlider`);
    const amount = Math.max(1, Math.min(30, Number(slider && slider.value ? slider.value : 1)));
    const libZone = `${player}-library`;
    const handZone = `${player}-hand`;
    let changed = false;
    for(let i=0; i<amount; i++){
      const lib = state.cards.filter(c => c.zone === libZone);
      if(!lib.length) break;
      const card = lib[lib.length - 1];
      card.zone = handZone;
      card.tapped = false;
      card.faceDown = false;
      bringCardToFront(card);
      changed = true;
    }
    if(changed){
      state.revealedLibraryTop[player] = false;
      saveState();
      render();
    }
  }

  function setDrawAmount45(player, next){
    const slider = document.getElementById(`${player}DrawAmountSlider`);
    const max = Math.min(30, Math.max(1, state.cards.filter(c => c.zone === `${player}-library`).length || 1));
    const n = Math.max(1, Math.min(max, Number(next) || 1));
    if(slider){ slider.max = String(max); slider.value = String(n); }
    const label = document.getElementById(`${player}DrawAmountLabel`);
    if(label) label.textContent = String(n);
    const btn = document.getElementById(`${player}L38DrawButton`);
    if(btn) btn.textContent = `DRAW ${n}`;
  }

  // Use pointerdown instead of click so old click/drag handlers cannot swallow DRAW X.
  document.addEventListener('pointerdown', e => {
    const drawBtn = e.target.closest('button[id$="L38DrawButton"]');
    if(drawBtn){
      e.preventDefault();
      e.stopImmediatePropagation();
      drawExactLayer45(playerFromId(drawBtn.id));
      return;
    }
    const deltaBtn = e.target.closest('button[data-l38-delta]');
    if(deltaBtn){
      e.preventDefault();
      e.stopImmediatePropagation();
      const row = deltaBtn.closest('.l38-draw-row');
      const player = playerFromId(row ? row.id : 'p1');
      const slider = document.getElementById(`${player}DrawAmountSlider`);
      setDrawAmount45(player, Number(slider && slider.value ? slider.value : 1) + Number(deltaBtn.dataset.l38Delta || 0));
    }
  }, true);

  const oldRender45 = render;
  render = function(){
    oldRender45();
    setDrawAmount45('p1', Number(document.getElementById('p1DrawAmountSlider')?.value || 1));
    setDrawAmount45('p2', Number(document.getElementById('p2DrawAmountSlider')?.value || 1));
    syncToggleButtonStates45();
  };

  // Tutor is local/private: transparent modal background and button toggles it closed if already open for that player.
  document.addEventListener('click', e => {
    const tutorBtn = e.target.closest('#p1TutorBtn,#p2TutorBtn');
    if(!tutorBtn) return;
    const player = playerFromId(tutorBtn.id);
    const modal = document.getElementById('libraryModal');
    if(isVisible(modal) && state.librarySearchPlayer === player){
      e.preventDefault();
      e.stopImmediatePropagation();
      closeLibrary();
      return;
    }
  }, true);

  function ensureOpponentGraveModal45(){
    if(document.getElementById('opponentGraveModal45')) return;
    const modal = document.createElement('div');
    modal.id = 'opponentGraveModal45';
    modal.className = 'modal hidden local-private-modal';
    modal.innerHTML = `
      <div class="modal-box opponent-grave-box45">
        <h1 id="opponentGraveTitle45">OPPONENT GRAVE</h1>
        <div id="opponentGraveGrid45"></div>
        <div class="modal-row"><button type="button" id="opponentGraveClose45">CLOSE</button></div>
      </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if(e.target === modal) modal.classList.add('hidden'); });
    document.getElementById('opponentGraveClose45')?.addEventListener('click', () => modal.classList.add('hidden'));
  }

  function openOpponentGrave45(viewerPlayer){
    ensureOpponentGraveModal45();
    const opponent = otherPlayer(viewerPlayer);
    const modal = document.getElementById('opponentGraveModal45');
    const title = document.getElementById('opponentGraveTitle45');
    const grid = document.getElementById('opponentGraveGrid45');
    if(title) title.textContent = `OPPONENT GRAVE (${state.cards.filter(c => c.zone === `${opponent}-graveyard`).length})`;
    if(grid){
      grid.innerHTML = '';
      state.cards.filter(c => c.zone === `${opponent}-graveyard`).slice().reverse().forEach(card => {
        const wrap = document.createElement('div');
        wrap.className = 'opponent-grave-card45';
        const img = document.createElement('img');
        img.src = card.image;
        img.alt = card.name || '';
        img.draggable = false;
        wrap.appendChild(img);
        wrap.addEventListener('mouseenter', () => showOracle(card));
        wrap.addEventListener('mouseleave', hideOracle);
        grid.appendChild(wrap);
      });
    }
    modal?.classList.remove('hidden');
  }

  function addOpponentGraveButtons45(){
    for(const p of ['p1','p2']){
      const grid = document.querySelector(`#${p}DrawPopover .l38-button-grid`);
      if(!grid || document.getElementById(`${p}OpponentGraveBtn`)) continue;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.id = `${p}OpponentGraveBtn`;
      btn.textContent = 'OPPONENT GRAVE';
      btn.className = 'l45-opponent-grave-btn';
      btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); openOpponentGrave45(p); });
      grid.appendChild(btn);
    }
  }

  const oldUpdateDrawControls45 = updateDrawControls;
  updateDrawControls = function(){
    if(typeof oldUpdateDrawControls45 === 'function') oldUpdateDrawControls45();
    addOpponentGraveButtons45();
  };
  setTimeout(addOpponentGraveButtons45, 0);

  // Orb/Falling Star buttons are toggles. Record state before old handlers open the overlay.
  const preOpen = { orb:false, star:false };
  function flipOverlay45(){ return document.getElementById('flipOverlayV80') || document.getElementById('orbflipExternal'); }
  function anyFlipOpen45(){
    const a = document.getElementById('flipOverlayV80');
    const b = document.getElementById('orbflipExternal');
    return isVisible(a) || isVisible(b);
  }
  function closeFlip45(){
    ['flipOverlayV80','orbflipExternal'].forEach(id => {
      const el = document.getElementById(id);
      if(el){ el.classList.add('hidden'); el.style.display = 'none'; }
    });
    syncToggleButtonStates45();
  }
  function syncToggleButtonStates45(){
    const on = anyFlipOpen45();
    document.getElementById('menuFlipOrbBtn')?.classList.toggle('l45-toggle-on', on);
    document.getElementById('menuFlipStarBtn')?.classList.toggle('l45-toggle-on', on);
  }
  document.addEventListener('pointerdown', e => {
    if(e.target.closest('#menuFlipOrbBtn')) preOpen.orb = anyFlipOpen45();
    if(e.target.closest('#menuFlipStarBtn')) preOpen.star = anyFlipOpen45();
  }, true);
  document.addEventListener('click', e => {
    const orb = e.target.closest('#menuFlipOrbBtn');
    const star = e.target.closest('#menuFlipStarBtn');
    if(!orb && !star) return;
    const wasOpen = orb ? preOpen.orb : preOpen.star;
    setTimeout(() => {
      if(wasOpen) closeFlip45();
      else syncToggleButtonStates45();
    }, 0);
  }, true);

  // Keep private overlays transparent/non-dimming. This is local-only UI; later Firebase sync will not send it.
  ['libraryModal','sideboardModal','opponentGraveModal45'].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.classList.add('local-private-modal');
  });
  setInterval(syncToggleButtonStates45, 500);
})();

// layer47: clean DRAW X bindings + toggle opponent grave/exile viewers.
(function(){
  const DRAW_MIN = 1;
  const DRAW_MAX = 30;
  let l47SelectedExileId = null;
  let l47ExilePlayer = 'p1';

  function clampDraw(n, player){
    const libCount = state.cards.filter(c => c.zone === `${player}-library`).length;
    const max = Math.min(DRAW_MAX, Math.max(1, libCount || 1));
    return Math.max(DRAW_MIN, Math.min(max, Number(n) || 1));
  }

  function setDraw47(player, next){
    const slider = document.getElementById(`${player}DrawAmountSlider`);
    const n = clampDraw(next, player);
    if(slider){
      slider.max = String(Math.min(DRAW_MAX, Math.max(1, state.cards.filter(c => c.zone === `${player}-library`).length || 1)));
      slider.value = String(n);
    }
    const label = document.getElementById(`${player}DrawAmountLabel`);
    if(label) label.textContent = String(n);
    const btn = document.getElementById(`${player}L47DrawButton`);
    if(btn) btn.textContent = `DRAW ${n}`;
  }

  function drawExact47(player){
    const slider = document.getElementById(`${player}DrawAmountSlider`);
    const amount = clampDraw(slider ? slider.value : 1, player);
    for(let i = 0; i < amount; i++) drawCard(player);
  }

  function installCleanDraw47(){
    for(const player of ['p1','p2']){
      const controls = document.getElementById(`${player}DrawPopover`);
      if(!controls) continue;
      const oldRow = controls.querySelector('.l38-draw-row, .l47-draw-row');
      const row = document.createElement('div');
      row.className = 'l47-draw-row';
      row.id = `${player}L47DrawRow`;
      row.innerHTML = `<button type="button" id="${player}L47DrawButton" class="l47-draw-button">DRAW 1</button><div class="l47-draw-arrows"><button type="button" data-l47-delta="1">△</button><button type="button" data-l47-delta="-1">▽</button></div>`;
      if(oldRow) oldRow.replaceWith(row);
      else controls.prepend(row);

      row.querySelector(`#${player}L47DrawButton`).addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        drawExact47(player);
      });
      row.querySelectorAll('button[data-l47-delta]').forEach(btn => {
        btn.addEventListener('click', e => {
          e.preventDefault();
          e.stopPropagation();
          const slider = document.getElementById(`${player}DrawAmountSlider`);
          setDraw47(player, Number(slider && slider.value ? slider.value : 1) + Number(btn.dataset.l47Delta || 0));
        });
      });
      setDraw47(player, document.getElementById(`${player}DrawAmountSlider`)?.value || 1);
    }
  }

  // Old layers listen for L38 IDs/data attributes. The new L47 row avoids those completely.
  // Block non-click pointer dragging on the draw row so the removed vertical-drag behavior cannot return.
  document.addEventListener('pointerdown', e => {
    if(e.target.closest('.l47-draw-row')){
      e.stopPropagation();
    }
  }, true);

  function ensureOpponentGraveModal47(){
    let modal = document.getElementById('opponentGraveModal45');
    if(modal) return modal;
    modal = document.createElement('div');
    modal.id = 'opponentGraveModal45';
    modal.className = 'modal hidden local-private-modal';
    modal.innerHTML = `<div class="modal-box opponent-grave-box45"><h1 id="opponentGraveTitle45">OPPONENT GRAVE</h1><div id="opponentGraveGrid45"></div><div class="modal-row"><button type="button" id="opponentGraveClose45">CLOSE</button></div></div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if(e.target === modal) modal.classList.add('hidden'); });
    modal.querySelector('#opponentGraveClose45')?.addEventListener('click', () => modal.classList.add('hidden'));
    return modal;
  }

  function renderOpponentGrave47(viewerPlayer){
    const opponent = viewerPlayer === 'p1' ? 'p2' : 'p1';
    const modal = ensureOpponentGraveModal47();
    const title = modal.querySelector('#opponentGraveTitle45');
    const grid = modal.querySelector('#opponentGraveGrid45');
    const cards = state.cards.filter(c => c.zone === `${opponent}-graveyard`).slice().reverse();
    if(title) title.textContent = `OPPONENT GRAVE (${cards.length})`;
    if(grid){
      grid.innerHTML = '';
      cards.forEach(card => {
        const wrap = document.createElement('div');
        wrap.className = 'opponent-grave-card45';
        const img = document.createElement('img');
        img.src = card.image;
        img.alt = card.name || '';
        img.draggable = false;
        wrap.appendChild(img);
        wrap.addEventListener('mouseenter', () => showOracle(card));
        wrap.addEventListener('mouseleave', hideOracle);
        grid.appendChild(wrap);
      });
    }
    return modal;
  }

  function installOpponentGraveToggle47(){
    for(const player of ['p1','p2']){
      const oldBtn = document.getElementById(`${player}OpponentGraveBtn`);
      if(!oldBtn || oldBtn.dataset.l47Toggle === '1') continue;
      const btn = oldBtn.cloneNode(true);
      btn.dataset.l47Toggle = '1';
      oldBtn.replaceWith(btn);
      btn.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        const modal = ensureOpponentGraveModal47();
        if(!modal.classList.contains('hidden') && modal.dataset.viewer === player){
          modal.classList.add('hidden');
          return;
        }
        const rendered = renderOpponentGrave47(player);
        rendered.dataset.viewer = player;
        rendered.classList.remove('hidden');
      });
    }
  }

  function ensureExileModal47(){
    let modal = document.getElementById('l38ExileModal');
    if(modal) return modal;
    modal = document.createElement('div');
    modal.id = 'l38ExileModal';
    modal.className = 'modal hidden local-private-modal';
    modal.innerHTML = '<div class="modal-box"><h1 id="l38ExileTitle">EXILE</h1><div id="l38ExileGrid"></div><div class="modal-row"><button type="button" id="l38ExilePutBackBtn">put back</button><button type="button" id="l38ExileCloseBtn">close</button></div></div>';
    document.body.appendChild(modal);
    modal.querySelector('#l38ExileCloseBtn')?.addEventListener('click', () => modal.classList.add('hidden'));
    modal.querySelector('#l38ExilePutBackBtn')?.addEventListener('click', () => {
      const card = state.cards.find(c => c.id === l47SelectedExileId);
      if(!card) return;
      card.zone = 'battlefield';
      card.faceDown = false;
      card.tapped = false;
      card.x = innerWidth / 2 - CARD_W / 2;
      card.y = innerHeight / 2 - CARD_H / 2;
      card.z = Math.max(100, ...state.cards.map(c => c.z || 1)) + 1;
      l47SelectedExileId = null;
      saveState();
      render();
      modal.classList.add('hidden');
    });
    return modal;
  }

  function renderExile47(player){
    l47ExilePlayer = player;
    l47SelectedExileId = null;
    const modal = ensureExileModal47();
    const title = modal.querySelector('#l38ExileTitle');
    const grid = modal.querySelector('#l38ExileGrid');
    const cards = state.cards.filter(c => c.zone === `${player}-exile`).slice().reverse();
    if(title) title.textContent = `EXILE (${cards.length})`;
    if(grid){
      grid.innerHTML = '';
      cards.forEach(card => {
        const wrap = document.createElement('div');
        wrap.className = 'l38-exile-card';
        wrap.dataset.cardId = card.id;
        const img = document.createElement('img');
        img.src = card.image;
        img.alt = card.name || '';
        img.draggable = false;
        wrap.appendChild(img);
        wrap.addEventListener('mouseenter', () => showOracle(card));
        wrap.addEventListener('mouseleave', hideOracle);
        wrap.addEventListener('click', () => {
          l47SelectedExileId = card.id;
          grid.querySelectorAll('.l38-exile-card').forEach(x => x.classList.toggle('selected', x.dataset.cardId === card.id));
        });
        grid.appendChild(wrap);
      });
    }
    return modal;
  }

  // Toggle exile from the same exile box. Capture prevents the older open-only click handler.
  document.addEventListener('click', e => {
    const box = e.target.closest('.l38-exile-box');
    if(!box) return;
    const zone = box.closest('[data-zone]')?.dataset.zone || '';
    const player = zone.startsWith('p2-') ? 'p2' : 'p1';
    const modal = ensureExileModal47();
    e.preventDefault();
    e.stopImmediatePropagation();
    if(!modal.classList.contains('hidden') && l47ExilePlayer === player){
      modal.classList.add('hidden');
      return;
    }
    renderExile47(player).classList.remove('hidden');
  }, true);

  const oldUpdate47 = updateDrawControls;
  updateDrawControls = function(){
    if(typeof oldUpdate47 === 'function') oldUpdate47();
    installCleanDraw47();
    installOpponentGraveToggle47();
  };

  const oldRender47 = render;
  render = function(){
    oldRender47();
    installCleanDraw47();
    installOpponentGraveToggle47();
    setDraw47('p1', document.getElementById('p1DrawAmountSlider')?.value || 1);
    setDraw47('p2', document.getElementById('p2DrawAmountSlider')?.value || 1);
  };

  setTimeout(() => { installCleanDraw47(); installOpponentGraveToggle47(); }, 0);
})();

// layer49: faster per-card draw flight + draw-many as a small bundle.
(function(){
  const CARD_BACK_SRC_L49 = 'lapi2.png';
  const DRAW_DURATION = 230;
  const DRAW_STAGGER = 32;

  function randomPx(max){ return `${(Math.random() * max * 2 - max).toFixed(1)}px`; }
  function randomDeg(max){ return `${(Math.random() * max * 2 - max).toFixed(1)}deg`; }

  function setShuffleVars(img, layer){
    const spread = 10 + layer * 4;
    const rot = 8 + layer * 3;
    for(let i = 1; i <= 6; i++){
      img.style.setProperty(`--x${i}`, randomPx(spread));
      img.style.setProperty(`--y${i}`, randomPx(spread));
      img.style.setProperty(`--r${i}`, randomDeg(rot));
    }
  }

  function animateLibraryShuffle49(player){
    const visual = document.getElementById(`${player}LibraryVisual`);
    if(!visual) return;
    const r = visual.getBoundingClientRect();
    if(!r.width || !r.height) return;

    const wrap = document.createElement('div');
    wrap.className = 'l48-shuffle-stack';
    wrap.style.left = `${r.left}px`;
    wrap.style.top = `${r.top}px`;
    wrap.style.width = `${r.width}px`;
    wrap.style.height = `${r.height}px`;

    for(let i = 0; i < 3; i++){
      const img = document.createElement('img');
      img.className = 'l48-shuffle-card';
      img.src = CARD_BACK_SRC_L49;
      img.alt = '';
      img.draggable = false;
      img.style.animationDelay = `${i * 0.035}s`;
      setShuffleVars(img, i);
      wrap.appendChild(img);
    }
    document.body.appendChild(wrap);
    setTimeout(()=>wrap.remove(), 2100);
  }

  window.animateLibraryShuffleLayer49 = animateLibraryShuffle49;

  function shuffleLibrary49(player){
    animateLibraryShuffle49(player);
    const zone = `${player}-library`;
    const others = state.cards.filter(c => c.zone !== zone);
    const lib = shuffleArray(zoneCards(zone));
    state.cards = others.concat(lib);
    state.revealedLibraryTop[player] = false;
    saveState();
    render();
  }
  shuffleLibrary = shuffleLibrary49;
  window.shuffleLibrary = shuffleLibrary49;

  function getDrawAmount49(player){
    const slider = document.getElementById(`${player}DrawAmountSlider`);
    const raw = Number(slider && slider.value ? slider.value : 1);
    const count = zoneCards(`${player}-library`).length;
    return Math.max(1, Math.min(30, count || 1, Number.isFinite(raw) ? raw : 1));
  }

  function currentHandCardWidth(player){
    const existing = document.querySelector(`#${player}HandFan .hand-card`);
    if(existing){
      const r = existing.getBoundingClientRect();
      if(r.width > 20) return r.width;
    }
    const probe = document.createElement('div');
    probe.className = 'card hand-card';
    probe.style.position = 'fixed';
    probe.style.left = '-9999px';
    probe.style.top = '-9999px';
    probe.style.visibility = 'hidden';
    document.body.appendChild(probe);
    const w = probe.getBoundingClientRect().width || 118;
    probe.remove();
    return w;
  }

  function makeDrawFlight49(player, index, total){
    const visual = document.getElementById(`${player}LibraryVisual`);
    const fan = document.getElementById(`${player}HandFan`);
    if(!visual || !fan) return null;

    const a = visual.getBoundingClientRect();
    const b = fan.getBoundingClientRect();
    if(!a.width || !a.height || !b.width || !b.height) return null;

    const img = document.createElement('img');
    img.className = 'l49-draw-flight l50-draw-flight';
    img.src = CARD_BACK_SRC_L49;
    img.alt = '';
    img.draggable = false;
    img.style.left = `${a.left}px`;
    img.style.top = `${a.top}px`;
    img.style.width = `${a.width}px`;
    img.style.height = `${a.height}px`;
    img.style.transform = player === 'p2' ? 'rotate(180deg) scale(1)' : 'rotate(0deg) scale(1)';
    img.style.transitionDuration = `${DRAW_DURATION}ms`;
    img.style.zIndex = String(2147482100 + index);
    document.body.appendChild(img);

    const endW = currentHandCardWidth(player);
    const endH = endW * 1.397;
    const scale = Math.max(0.25, Math.min(2, endW / a.width));
    const centerOffset = index - (total - 1) / 2;
    const spreadOffset = centerOffset * Math.min(18, endW * 0.18);
    const endCenterX = b.left + b.width / 2 + spreadOffset;
    const endCenterY = player === 'p1'
      ? b.bottom - endH / 2 - 10 - Math.abs(centerOffset) * 1.5
      : b.top + endH / 2 + 10 + Math.abs(centerOffset) * 1.5;
    const endX = endCenterX - a.width / 2;
    const endY = endCenterY - a.height / 2;
    const rot = (player === 'p2' ? 180 : 0) + centerOffset * 3.2;
    return { img, endX, endY, scale, rot };
  }

  function startDrawFlight49(flight, delay){
    if(!flight) return Promise.resolve();
    const { img, endX, endY, scale, rot } = flight;
    return new Promise(resolve => {
      setTimeout(()=>{
        requestAnimationFrame(()=>{
          img.style.left = `${endX}px`;
          img.style.top = `${endY}px`;
          img.style.transform = `rotate(${rot}deg) scale(${scale})`;
        });
        setTimeout(()=>{ img.remove(); resolve(); }, DRAW_DURATION + 20);
      }, delay);
    });
  }

  let drawLock49 = false;
  async function animatedDrawMany49(player, amount){
    if(drawLock49) return;
    drawLock49 = true;
    const count = zoneCards(`${player}-library`).length;
    const n = Math.max(1, Math.min(Number(amount) || 1, count));
    const flights = [];
    for(let i = 0; i < n; i++) flights.push(makeDrawFlight49(player, i, n));
    const promises = flights.map((flight, i) => startDrawFlight49(flight, i * DRAW_STAGGER));
    for(let i = 0; i < n; i++) setTimeout(()=>drawCard(player), i * DRAW_STAGGER + DRAW_DURATION - 35);
    await Promise.all(promises);
    drawLock49 = false;
  }
  window.animatedDrawManyLayer49 = animatedDrawMany49;

  document.addEventListener('click', e => {
    const btn = e.target.closest && e.target.closest('button[id$="L47DrawButton"], button[id$="L38DrawButton"]');
    if(!btn) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const player = btn.id.startsWith('p2') ? 'p2' : 'p1';
    animatedDrawMany49(player, getDrawAmount49(player));
  }, true);

  document.addEventListener('keydown', e => {
    const tag = (document.activeElement && document.activeElement.tagName || '').toLowerCase();
    if(tag === 'input' || tag === 'textarea' || tag === 'select') return;
    if(e.metaKey || e.ctrlKey || e.altKey) return;
    const key = e.key && e.key.toLowerCase();
    if(e.key === 'Tab' || key === 'd'){
      const p = state.activePlayer || 'p1';
      e.preventDefault();
      e.stopImmediatePropagation();
      animatedDrawMany49(p, 1);
    }
  }, true);
})();


// layer51: public red discard marks for opponent hand cards.
(function(){
  function cleanupDiscardMarks(){
    state.cards.forEach(card => {
      if(card.discardMarked && !(card.zone && card.zone.endsWith('-hand'))){
        delete card.discardMarked;
      }
    });
  }

  const previousCreateCardElement51 = createCardElement;
  createCardElement = function(card, className){
    const el = previousCreateCardElement51(card, className);
    if(card && card.discardMarked && card.zone && card.zone.endsWith('-hand')){
      el.classList.add('discard-marked-hand');
    }
    return el;
  };

  const previousRender51 = render;
  render = function(){
    cleanupDiscardMarks();
    previousRender51();
  };
})();

// layer52: visible discard marks, draggable top library card, animated mulligan.
(function(){
  const BACK_SRC = 'lapi2.png';

  function cardById52(id){
    return id ? state.cards.find(c => c.id === id) || null : null;
  }

  function isOpponentHand52(card){
    return !!(card && card.zone === 'p2-hand');
  }

  function cleanupDiscardMarks52(){
    state.cards.forEach(card => {
      if(card.discardMarked && !(card.zone && card.zone.endsWith('-hand'))){
        delete card.discardMarked;
      }
    });
  }

  // Toggle red mark before the older document-level private-hand blocker can stop the event.
  function toggleOpponentHandMark52(e){
    const el = e.target && e.target.closest ? e.target.closest('.card[data-card-id]') : null;
    if(!el) return false;
    const card = cardById52(el.dataset.cardId);
    if(!isOpponentHand52(card)) return false;
    card.discardMarked = !card.discardMarked;
    saveState();
    render();
    e.preventDefault();
    e.stopPropagation();
    if(e.stopImmediatePropagation) e.stopImmediatePropagation();
    return true;
  }

  window.addEventListener('pointerdown', e => {
    if(e.button !== 0) return;
    const el = e.target && e.target.closest ? e.target.closest('.card[data-card-id]') : null;
    if(!el) return;
    const card = cardById52(el.dataset.cardId);
    if(!isOpponentHand52(card)) return;
    // pointerdown only stores intent; click toggles if browser still emits click.
    window.__l52OpponentHandClickCandidate = { id: card.id, x: e.clientX, y: e.clientY, t: performance.now() };
  }, true);

  window.addEventListener('click', e => {
    const el = e.target && e.target.closest ? e.target.closest('.card[data-card-id]') : null;
    const card = el ? cardById52(el.dataset.cardId) : null;
    if(!isOpponentHand52(card)) return;
    e.preventDefault();
    e.stopPropagation();
    if(e.stopImmediatePropagation) e.stopImmediatePropagation();
  }, true);

  const prevCreateCardElement52 = createCardElement;
  createCardElement = function(card, className){
    const el = prevCreateCardElement52(card, className);
    if(card && card.discardMarked && card.zone && card.zone.endsWith('-hand')){
      el.classList.add('discard-marked-hand');
    } else {
      el.classList.remove('discard-marked-hand');
    }
    return el;
  };

  const prevRender52 = render;
  render = function(){
    cleanupDiscardMarks52();
    prevRender52();
  };

  function topLibraryCard52(player){
    const lib = zoneCards(`${player}-library`);
    return lib.length ? lib[lib.length - 1] : null;
  }

  function playerFromLibraryVisual52(el){
    if(!el || !el.id) return null;
    if(el.id.startsWith('p1')) return 'p1';
    if(el.id.startsWith('p2')) return 'p2';
    const zone = el.closest && el.closest('[data-player]');
    return zone ? zone.dataset.player : null;
  }

  function makeBackGhost52(rect){
    const img = document.createElement('img');
    img.src = BACK_SRC;
    img.alt = '';
    img.draggable = false;
    img.className = 'l52-library-drag-card';
    img.style.left = `${rect.left}px`;
    img.style.top = `${rect.top}px`;
    img.style.width = `${rect.width}px`;
    img.style.height = `${rect.height}px`;
    document.body.appendChild(img);
    return img;
  }

  function handHit52(player, x, y){
    const hand = document.getElementById(`${player}HandZone`);
    if(!hand) return false;
    const r = hand.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  }

  function drawTopCardToHand52(player){
    const card = topLibraryCard52(player);
    if(!card) return false;
    card.zone = `${player}-hand`;
    card.tapped = false;
    card.faceDown = false;
    delete card.discardMarked;
    bringCardToFront(card);
    state.revealedLibraryTop[player] = false;
    saveState();
    render();
    return true;
  }

  function bindLibraryTopDrag52(){
    ['p1','p2'].forEach(player => {
      const visual = document.getElementById(`${player}LibraryVisual`);
      if(!visual || visual.dataset.l52TopDragBound === '1') return;
      visual.dataset.l52TopDragBound = '1';
      visual.addEventListener('pointerdown', e => {
        if(e.button !== 0) return;
        const card = topLibraryCard52(player);
        if(!card) return;
        const startX = e.clientX;
        const startY = e.clientY;
        const rect = visual.getBoundingClientRect();
        let ghost = null;
        let dragging = false;

        function move(ev){
          const dx = ev.clientX - startX;
          const dy = ev.clientY - startY;
          if(!dragging && Math.hypot(dx, dy) > 6){
            dragging = true;
            ghost = makeBackGhost52(rect);
          }
          if(ghost){
            ghost.style.left = `${ev.clientX - rect.width / 2}px`;
            ghost.style.top = `${ev.clientY - rect.height / 2}px`;
          }
        }

        function up(ev){
          document.removeEventListener('pointermove', move, true);
          document.removeEventListener('pointerup', up, true);
          if(ghost) ghost.remove();
          if(dragging && handHit52(player, ev.clientX, ev.clientY)){
            ev.preventDefault();
            ev.stopImmediatePropagation();
            drawTopCardToHand52(player);
          }
        }

        document.addEventListener('pointermove', move, true);
        document.addEventListener('pointerup', up, true);
      }, true);
    });
  }

  function libraryRect52(player){
    const visual = document.getElementById(`${player}LibraryVisual`);
    return visual ? visual.getBoundingClientRect() : null;
  }

  function animateHandCardsToLibrary52(player){
    const libraryRect = libraryRect52(player);
    if(!libraryRect) return Promise.resolve();
    const handEls = [...document.querySelectorAll(`#${player}HandFan .card.hand-card[data-card-id]`)];
    const handCards = state.cards.filter(c => c.zone === `${player}-hand` && !c.token);
    const ids = new Set(handCards.map(c => c.id));
    const flights = handEls.filter(el => ids.has(el.dataset.cardId)).slice(0, 24).map((el, i) => {
      const r = el.getBoundingClientRect();
      const img = document.createElement('img');
      img.src = BACK_SRC;
      img.alt = '';
      img.draggable = false;
      img.className = 'l52-mulligan-flight';
      img.style.left = `${r.left}px`;
      img.style.top = `${r.top}px`;
      img.style.width = `${r.width}px`;
      img.style.height = `${r.height}px`;
      img.style.transform = getComputedStyle(el).transform === 'none' ? 'rotate(0deg)' : getComputedStyle(el).transform;
      img.style.zIndex = String(2147482600 + i);
      document.body.appendChild(img);
      return img;
    });

    if(!flights.length) return Promise.resolve();
    return new Promise(resolve => {
      requestAnimationFrame(() => {
        flights.forEach((img, i) => {
          setTimeout(() => {
            img.style.left = `${libraryRect.left + (Math.random() * 10 - 5)}px`;
            img.style.top = `${libraryRect.top + (Math.random() * 10 - 5)}px`;
            img.style.width = `${libraryRect.width}px`;
            img.style.height = `${libraryRect.height}px`;
            img.style.transform = `rotate(${(Math.random() * 18 - 9).toFixed(1)}deg)`;
            img.style.opacity = '0.95';
          }, i * 18);
        });
      });
      setTimeout(() => { flights.forEach(img => img.remove()); resolve(); }, 360 + flights.length * 18);
    });
  }

  async function mulliganAnimated52(player){
    if(!confirm('are you really sure about mulligan?')) return;

    await animateHandCardsToLibrary52(player);

    const playerCards = state.cards
      .filter(c => (c.owner || player) === player && !c.token)
      .map((c, i) => ({
        ...c,
        zone: `${player}-library`,
        tapped: false,
        faceDown: false,
        x: 180,
        y: 120,
        z: i,
        discardMarked: undefined
      }));

    const otherCards = state.cards.filter(c => (c.owner || player) !== player || c.token);
    state.cards = otherCards.concat(shuffleArray(playerCards));
    state.selectedCardIds = [];
    state.selectedDieIds = [];
    state.revealedLibraryTop[player] = false;
    state.expandedPile = null;
    saveState();
    render();

    // layer57: mulligan order must be: shuffle animation first, wait until it ends, then draw 7.
    // Do not run any additional shuffle after the new hand is dealt.
    if(window.animateLibraryShuffleLayer49) window.animateLibraryShuffleLayer49(player);
    await new Promise(resolve => setTimeout(resolve, 2150));

    if(window.animatedDrawManyLayer54){
      await window.animatedDrawManyLayer54(player, 7);
    } else if(window.animatedDrawManyLayer49){
      await window.animatedDrawManyLayer49(player, 7);
    } else {
      for(let i = 0; i < 7; i++) drawCard(player);
    }
  }

  window.mulliganPlayer = mulliganAnimated52;

  window.addEventListener('click', e => {
    const btn = e.target && e.target.closest ? e.target.closest('#p1MulliganBtn,#p2MulliganBtn') : null;
    if(!btn) return;
    e.preventDefault();
    e.stopPropagation();
    if(e.stopImmediatePropagation) e.stopImmediatePropagation();
    const player = btn.id.startsWith('p2') ? 'p2' : 'p1';
    mulliganAnimated52(player);
  }, true);

  const prevUpdateDrawControls52 = updateDrawControls;
  updateDrawControls = function(){
    if(typeof prevUpdateDrawControls52 === 'function') prevUpdateDrawControls52();
    bindLibraryTopDrag52();
  };

  const prevRender52b = render;
  render = function(){
    prevRender52b();
    bindLibraryTopDrag52();
  };

  bindLibraryTopDrag52();
})();

// layer53: restore DRAW X hover numeric hotkeys for the clean L47 draw row.
(function(){
  let hoverDrawPlayer53 = null;

  function playerFromDrawRow53(row){
    if(!row || !row.id) return null;
    if(row.id.startsWith('p1')) return 'p1';
    if(row.id.startsWith('p2')) return 'p2';
    return null;
  }

  function clampDraw53(player, value){
    const n = Number(value) || 1;
    const libCount = state.cards.filter(c => c.zone === `${player}-library`).length;
    const max = Math.min(30, Math.max(1, libCount || 1));
    return Math.max(1, Math.min(max, n));
  }

  function setDrawAmount53(player, value){
    const n = clampDraw53(player, value);
    const slider = document.getElementById(`${player}DrawAmountSlider`);
    const label = document.getElementById(`${player}DrawAmountLabel`);
    const btn = document.getElementById(`${player}L47DrawButton`) || document.getElementById(`${player}L38DrawButton`);

    if(slider){
      const libCount = state.cards.filter(c => c.zone === `${player}-library`).length;
      slider.max = String(Math.min(30, Math.max(1, libCount || 1)));
      slider.value = String(n);
    }
    if(label) label.textContent = String(n);
    if(btn) btn.textContent = `DRAW ${n}`;
  }

  document.addEventListener('mouseover', e => {
    const row = e.target && e.target.closest ? e.target.closest('.l47-draw-row') : null;
    const player = playerFromDrawRow53(row);
    if(player) hoverDrawPlayer53 = player;
  }, true);

  document.addEventListener('mouseout', e => {
    const row = e.target && e.target.closest ? e.target.closest('.l47-draw-row') : null;
    if(!row) return;
    if(e.relatedTarget && row.contains(e.relatedTarget)) return;
    if(hoverDrawPlayer53 === playerFromDrawRow53(row)) hoverDrawPlayer53 = null;
  }, true);

  document.addEventListener('keydown', e => {
    if(!hoverDrawPlayer53) return;
    const active = document.activeElement;
    if(active && ['INPUT','TEXTAREA','SELECT'].includes(active.tagName)) return;
    if(!/^[1-9]$/.test(e.key)) return;

    e.preventDefault();
    e.stopImmediatePropagation();
    setDrawAmount53(hoverDrawPlayer53, Number(e.key));
  }, true);

  const oldUpdateDrawControls53 = updateDrawControls;
  updateDrawControls = function(){
    oldUpdateDrawControls53();
    ['p1','p2'].forEach(player => {
      const btn = document.getElementById(`${player}L47DrawButton`);
      if(!btn) return;
      const slider = document.getElementById(`${player}DrawAmountSlider`);
      setDrawAmount53(player, slider ? slider.value : 1);
    });
  };
})();

// layer54: exact draw-flight sizing from current hand-card size.
(function(){
  const BACK_SRC = 'lapi2.png';
  const DURATION = 210;
  const STAGGER = 26;
  let locked = false;

  function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

  function playerFromDrawButton(btn){
    if(!btn || !btn.id) return state.activePlayer || 'p1';
    return btn.id.startsWith('p2') ? 'p2' : 'p1';
  }

  function drawAmount(player){
    const slider = document.getElementById(`${player}DrawAmountSlider`);
    const n = Number(slider && slider.value ? slider.value : 1);
    const libCount = state.cards.filter(c => c.zone === `${player}-library`).length;
    return clamp(Number.isFinite(n) ? n : 1, 1, Math.min(30, Math.max(1, libCount)));
  }

  function handCardSize(player){
    // IMPORTANT: do not use getBoundingClientRect() from an existing hand card.
    // Hand cards are rotated in the fan, so their bounding box becomes larger than
    // the actual card size. That made the flying draw card grow too large.
    const real = document.querySelector(`#${player}HandFan .hand-card`);
    if(real){
      const cs = getComputedStyle(real);
      const w = parseFloat(cs.width) || real.offsetWidth || 0;
      const h = parseFloat(cs.height) || real.offsetHeight || 0;
      if(w > 20 && h > 20) return { w, h };
    }

    const probe = document.createElement('div');
    probe.className = 'card hand-card';
    probe.style.position = 'fixed';
    probe.style.left = '-9999px';
    probe.style.top = '-9999px';
    probe.style.visibility = 'hidden';
    probe.style.pointerEvents = 'none';
    probe.style.transform = 'none';
    document.body.appendChild(probe);
    const cs = getComputedStyle(probe);
    const w = parseFloat(cs.width) || probe.offsetWidth || 118;
    const h = parseFloat(cs.height) || probe.offsetHeight || Math.round(w * 1.397);
    probe.remove();
    return { w, h };
  }

  function targetForHand(player, index, total, size){
    const fan = document.getElementById(`${player}HandFan`);
    const r = fan ? fan.getBoundingClientRect() : null;
    const centerOffset = index - (total - 1) / 2;
    const spread = centerOffset * Math.min(16, size.w * 0.16);
    const cx = r ? r.left + r.width / 2 + spread : innerWidth / 2 + spread;
    const cy = player === 'p2'
      ? (r ? r.top + size.h / 2 + 10 + Math.abs(centerOffset) * 1.2 : 90)
      : (r ? r.bottom - size.h / 2 - 10 - Math.abs(centerOffset) * 1.2 : innerHeight - 90);
    return { left: cx - size.w / 2, top: cy - size.h / 2 };
  }

  function makeFlight(player, index, total){
    const visual = document.getElementById(`${player}LibraryVisual`);
    if(!visual) return null;
    const start = visual.getBoundingClientRect();
    if(!start.width || !start.height) return null;

    const size = handCardSize(player);
    const target = targetForHand(player, index, total, size);
    const centerOffset = index - (total - 1) / 2;

    const img = document.createElement('img');
    img.className = 'l54-draw-flight';
    img.src = BACK_SRC;
    img.alt = '';
    img.draggable = false;
    img.style.left = `${start.left}px`;
    img.style.top = `${start.top}px`;
    img.style.width = `${start.width}px`;
    img.style.height = `${start.height}px`;
    img.style.transform = `rotate(${player === 'p2' ? 180 : 0}deg)`;
    img.style.zIndex = String(2147483100 + index);
    document.body.appendChild(img);

    return { img, target, size, rot: (player === 'p2' ? 180 : 0) + centerOffset * 3.2 };
  }

  function startFlight(flight, delay){
    if(!flight) return Promise.resolve();
    return new Promise(resolve => {
      setTimeout(() => {
        requestAnimationFrame(() => {
          flight.img.style.left = `${flight.target.left}px`;
          flight.img.style.top = `${flight.target.top}px`;
          flight.img.style.width = `${flight.size.w}px`;
          flight.img.style.height = `${flight.size.h}px`;
          flight.img.style.transform = `rotate(${flight.rot}deg)`;
        });
        setTimeout(() => { flight.img.remove(); resolve(); }, DURATION + 25);
      }, delay);
    });
  }

  async function animatedDrawExact(player, amount){
    if(locked) return;
    const count = state.cards.filter(c => c.zone === `${player}-library`).length;
    if(!count) return;
    locked = true;
    const n = clamp(Number(amount) || 1, 1, Math.min(30, count));
    const flights = [];
    for(let i = 0; i < n; i++) flights.push(makeFlight(player, i, n));
    flights.forEach((f, i) => startFlight(f, i * STAGGER));
    for(let i = 0; i < n; i++) setTimeout(() => drawCard(player), i * STAGGER + DURATION - 20);
    setTimeout(() => { locked = false; }, DURATION + n * STAGGER + 80);
  }

  window.animatedDrawManyLayer54 = animatedDrawExact;

  window.addEventListener('click', e => {
    const btn = e.target && e.target.closest ? e.target.closest('button[id$="L47DrawButton"], button[id$="L38DrawButton"]') : null;
    if(!btn) return;
    e.preventDefault();
    e.stopPropagation();
    if(e.stopImmediatePropagation) e.stopImmediatePropagation();
    const player = playerFromDrawButton(btn);
    animatedDrawExact(player, drawAmount(player));
  }, true);

  window.addEventListener('keydown', e => {
    const tag = (document.activeElement && document.activeElement.tagName || '').toLowerCase();
    if(tag === 'input' || tag === 'textarea' || tag === 'select') return;
    if(e.metaKey || e.ctrlKey || e.altKey) return;
    const key = e.key && e.key.toLowerCase();
    if(e.key === 'Tab' || key === 'd'){
      e.preventDefault();
      e.stopPropagation();
      if(e.stopImmediatePropagation) e.stopImmediatePropagation();
      animatedDrawExact(state.activePlayer || 'p1', 1);
    }
  }, true);
})();


// layer55: draw-flight hand size fix uses computed CSS width/height instead of rotated bounding box.


// layer59: reliable discard selection border on opponent hand backs.
(function(){
  function cardById59(id){
    return id ? state.cards.find(c => c.id === id) || null : null;
  }
  function isOpponentHand59(card){
    return !!(card && card.zone === 'p2-hand');
  }
  function markClass59(card, el){
    const marked = !!(card && card.discardMarked && card.zone && card.zone.endsWith('-hand'));
    if(el) el.classList.toggle('discard-marked-hand', marked);
  }

  window.addEventListener('pointerdown', e => {
    if(e.button !== 0) return;
    const el = e.target && e.target.closest ? e.target.closest('.card[data-card-id]') : null;
    if(!el) return;
    const card = cardById59(el.dataset.cardId);
    if(!isOpponentHand59(card)) return;

    card.discardMarked = !card.discardMarked;
    markClass59(card, el);
    saveState();
    render();

    e.preventDefault();
    e.stopPropagation();
    if(e.stopImmediatePropagation) e.stopImmediatePropagation();
  }, true);

  const previousCreateCardElement59 = createCardElement;
  createCardElement = function(card, className){
    const el = previousCreateCardElement59(card, className);
    markClass59(card, el);
    return el;
  };

  const previousRender59 = render;
  render = function(){
    state.cards.forEach(card => {
      if(card.discardMarked && !(card.zone && card.zone.endsWith('-hand'))){
        delete card.discardMarked;
      }
    });
    previousRender59();
  };
})();

// layer62: local HELP overlay, opened from each library control panel.
(function(){
  const HELP_TEXT = `d = draw a card
tab = draw a card
double click on library = draw a card

draw x button = draw x cards
mouse hover over draw button + number keys change value
arrow buttons while mouse over draw button = +1 / -1

command/ctrl + drag hand from middle to move it

x = untap all

mouse hover over card +  g = put to grave
                         e = put to exile
                         h = put to hand
                         t = tap
all these work with multiple selected cards

mouse hover over dice + number keys 1–9 change value

mouse two-finger drag up/down over hand = open/close the fan of cards
mouse two-finger drag left/right over hand = flicker cards front/back in hand
select a card in hand and arrow keys left/right move the card inside the hand

click a card in opponent’s hand to mark it (for Mind Twist or Hippie)

drag token to exile or grave = removes permanently

orbflip / falling star flip emulator (very experimental still)
move orb (and hand if you want the finger tech) with mouse
move orb up/down with arrow keys up/down and hand up/down with shift + arrows
press orb with the mouse from the spot you want to target the flipping force from down to up. powerbar will come and release when you think it’s good.`;

  function ensureHelpOverlay(){
    let overlay = document.getElementById('helpOverlayLocal');
    if(overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'helpOverlayLocal';
    overlay.className = 'help-overlay-local hidden';
    overlay.innerHTML = `<h1>HELP</h1><pre></pre><div class="help-close-row"><button type="button" id="helpOverlayCloseBtn">CLOSE</button></div>`;
    overlay.querySelector('pre').textContent = HELP_TEXT;
    document.body.appendChild(overlay);
    overlay.querySelector('#helpOverlayCloseBtn')?.addEventListener('click', e => {
      e.preventDefault();
      setHelpOpen(false);
    });
    return overlay;
  }

  function setHelpOpen(open){
    const overlay = ensureHelpOverlay();
    overlay.classList.toggle('hidden', !open);
    document.querySelectorAll('.l62-help-button').forEach(btn => btn.classList.toggle('is-active', open));
  }

  function toggleHelp(){
    const overlay = ensureHelpOverlay();
    setHelpOpen(overlay.classList.contains('hidden'));
  }

  function makeButton(player){
    let btn = document.getElementById(`${player}HelpBtn`);
    if(btn) return btn;
    btn = document.createElement('button');
    btn.type = 'button';
    btn.id = `${player}HelpBtn`;
    btn.className = 'l62-help-button';
    btn.textContent = 'HELP';
    btn.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      if(e.stopImmediatePropagation) e.stopImmediatePropagation();
      toggleHelp();
    }, true);
    return btn;
  }

  function insertHelpButtons(){
    for(const player of ['p1','p2']){
      const controls = document.getElementById(`${player}DrawPopover`);
      const reveal = document.getElementById(`${player}RevealBtn`);
      if(!controls || !reveal) continue;
      const btn = makeButton(player);
      if(btn.parentElement && btn.parentElement !== reveal.parentElement) btn.remove();
      if(reveal.nextElementSibling !== btn){
        reveal.insertAdjacentElement('afterend', btn);
      }
      btn.style.display = reveal.style.display;
    }
  }

  const previousRender = typeof render === 'function' ? render : null;
  if(previousRender){
    render = function(){
      previousRender();
      insertHelpButtons();
    };
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', () => {
      ensureHelpOverlay();
      insertHelpButtons();
    });
  } else {
    ensureHelpOverlay();
    insertHelpButtons();
  }

  setTimeout(insertHelpButtons, 0);
  setTimeout(insertHelpButtons, 250);
})();
