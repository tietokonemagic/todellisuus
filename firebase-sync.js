// Firebase realtime sync layer for Old School Manual Tabletop.
// Uses two fixed rooms: room1 and room2. No gameplay logic is changed here.
(function(){
  "use strict";

  const firebaseConfig = {
    apiKey: "AIzaSyAP08tHu3kVqmI44kvbNzqvjGr2ZSegdD8",
    authDomain: "osmagic-b0fea.firebaseapp.com",
    databaseURL: "https://osmagic-b0fea-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "osmagic-b0fea",
    storageBucket: "osmagic-b0fea.firebasestorage.app",
    messagingSenderId: "992969408539",
    appId: "1:992969408539:web:22924aa6d36675580f38be",
    measurementId: "G-HJ4PQDJ1ZM"
  };

  const TABLE_STATE_KEY = "oldschoolTabletopV99";
  const PLAYMAT_STATE_KEY = "oldschoolPlaymatsV100";
  const ROOM_STORAGE_KEY = "oldschoolFirebaseRoomV1";
  const DB_ROOT = "manualTabletopRoomsV1";
  const CLIENT_ID = (() => {
    let id = sessionStorage.getItem("oldschoolFirebaseClientId");
    if(!id){
      id = (crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2);
      sessionStorage.setItem("oldschoolFirebaseClientId", id);
    }
    return id;
  })();

  let db = null;
  let roomId = null;
  let roomRef = null;
  let applyingRemoteState = false;
  let pushTimer = null;
  let lastPayloadString = "";
  let unsubscribe = null;

  function log(){
    try { console.log.apply(console, ["[firebase sync]"].concat([].slice.call(arguments))); } catch(_) {}
  }

  function readJSON(key, fallback){
    try{
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    }catch(_){
      return fallback;
    }
  }

  function writeJSON(key, value){
    localStorage.setItem(key, JSON.stringify(value));
  }

  function sanitizeTableStateForPush(data){
    if(!data || typeof data !== "object") return data;
    const out = JSON.parse(JSON.stringify(data));
    // Keep these local. Otherwise one player's menu choice overwrites the other player's local controls.
    delete out.activePlayer;
    delete out.selectedCardIds;
    delete out.selectedDieIds;
    delete out.selectedCardId;
    delete out.selectedDieId;
    delete out.dragging;
    delete out.draggingPile;
    delete out.hoveredDieId;
    delete out.selecting;
    delete out.selectedLibraryCardId;
    delete out.selectedToken;
    delete out.expandedPile;
    return out;
  }

  function mergeRemoteTableState(remote){
    if(!remote || typeof remote !== "object") return remote;
    const local = readJSON(TABLE_STATE_KEY, {}) || {};
    const merged = Object.assign({}, remote);
    // Keep local-only UI/player controls from this browser.
    merged.activePlayer = local.activePlayer || "p1";
    merged.showOraclePanel = local.showOraclePanel !== undefined ? local.showOraclePanel : merged.showOraclePanel;
    merged.showSelection = local.showSelection !== undefined ? local.showSelection : merged.showSelection;
    merged.handPosition = local.handPosition || merged.handPosition;
    merged.handFan = local.handFan || merged.handFan;
    merged.handDepth = local.handDepth || merged.handDepth;
    return merged;
  }

  function currentPayload(){
    const table = sanitizeTableStateForPush(readJSON(TABLE_STATE_KEY, null));
    const playmats = readJSON(PLAYMAT_STATE_KEY, null);
    return {
      version: 1,
      clientId: CLIENT_ID,
      updated: Date.now(),
      table,
      playmats
    };
  }

  function applyPlaymatStorageToDOM(playmats){
    if(!playmats || typeof playmats !== "object") return;
    ["p1", "p2"].forEach(player => {
      const el = document.getElementById(player === "p1" ? "p1Playmat" : "p2Playmat");
      const cfg = playmats[player];
      if(!el || !cfg) return;
      if(cfg.type === "color"){
        const dark = Number(cfg.dark || 0);
        el.style.backgroundColor = cfg.color || "#242424";
        el.style.backgroundImage = `linear-gradient(rgba(0,0,0,${dark}), rgba(0,0,0,${dark}))`;
      } else if(cfg.value){
        el.style.backgroundColor = "";
        el.style.backgroundImage = `url("${cfg.value}")`;
      }
    });
  }

  function applyRemotePayload(payload){
    if(!payload || payload.clientId === CLIENT_ID) return;
    applyingRemoteState = true;
    try{
      if(payload.table){
        const merged = mergeRemoteTableState(payload.table);
        writeJSON(TABLE_STATE_KEY, merged);
        if(typeof loadState === "function") loadState();
        if(typeof render === "function") render();
      }
      if(payload.playmats){
        writeJSON(PLAYMAT_STATE_KEY, payload.playmats);
        applyPlaymatStorageToDOM(payload.playmats);
      }
      log("applied remote state from", roomId);
    }catch(err){
      console.error("[firebase sync] remote apply failed", err);
    }finally{
      setTimeout(() => { applyingRemoteState = false; }, 80);
    }
  }

  function pushStateToFirebaseNow(){
    if(applyingRemoteState || !roomRef) return;
    const payload = currentPayload();
    const text = JSON.stringify({table: payload.table, playmats: payload.playmats});
    if(text === lastPayloadString) return;
    lastPayloadString = text;
    roomRef.set(payload).catch(err => console.error("[firebase sync] write failed", err));
  }

  function schedulePushToFirebase(){
    if(applyingRemoteState || !roomRef) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(pushStateToFirebaseNow, 120);
  }

  window.pushStateToFirebase = schedulePushToFirebase;

  function wrapSaveState(){
    if(typeof saveState !== "function" || saveState.__firebaseWrapped) return;
    const original = saveState;
    saveState = function(){
      const result = original.apply(this, arguments);
      schedulePushToFirebase();
      return result;
    };
    saveState.__firebaseWrapped = true;
    window.saveState = saveState;
  }

  function patchLocalStorageForPlaymats(){
    if(Storage.prototype.__oldschoolFirebasePatched) return;
    const nativeSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value){
      const result = nativeSetItem.apply(this, arguments);
      if(key === PLAYMAT_STATE_KEY || key === TABLE_STATE_KEY){
        schedulePushToFirebase();
      }
      return result;
    };
    Storage.prototype.__oldschoolFirebasePatched = true;
  }

  function ensureRoomGate(){
    let gate = document.getElementById("firebaseRoomGate");
    if(gate) return gate;
    gate = document.createElement("div");
    gate.id = "firebaseRoomGate";
    gate.innerHTML = `
      <div class="room-box">
        <h1>SELECT ROOM</h1>
        <div class="room-buttons">
          <button type="button" data-room="room1">ROOM 1</button>
          <button type="button" data-room="room2">ROOM 2</button>
        </div>
        <div class="room-status">Choose the same room on both computers.</div>
      </div>
    `;
    document.body.appendChild(gate);
    gate.querySelectorAll("button[data-room]").forEach(btn => {
      btn.addEventListener("click", () => selectRoom(btn.dataset.room));
    });
    return gate;
  }

  function setStatus(text){
    const el = document.querySelector("#firebaseRoomGate .room-status");
    if(el) el.textContent = text;
  }

  function initFirebase(){
    if(!window.firebase || !firebase.initializeApp || !firebase.database){
      setStatus("Firebase did not load. Check network and refresh.");
      console.error("[firebase sync] Firebase compat SDK missing");
      return false;
    }
    if(!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    db = firebase.database();
    return true;
  }

  function selectRoom(nextRoom){
    roomId = nextRoom === "room2" ? "room2" : "room1";
    localStorage.setItem(ROOM_STORAGE_KEY, roomId);
    const gate = ensureRoomGate();
    setStatus("Connecting to " + roomId + "...");

    if(!initFirebase()) return;
    wrapSaveState();
    patchLocalStorageForPlaymats();

    if(unsubscribe) unsubscribe();
    roomRef = db.ref(DB_ROOT + "/" + roomId);

    let first = true;
    unsubscribe = roomRef.on("value", snap => {
      const payload = snap.val();
      if(!payload){
        if(first){
          first = false;
          gate.classList.add("hidden");
          log("empty room", roomId, "waiting for first local change");
          schedulePushToFirebase();
        }
        return;
      }
      first = false;
      gate.classList.add("hidden");
      applyRemotePayload(payload);
    }, err => {
      console.error("[firebase sync] listen failed", err);
      setStatus("Firebase listen failed: " + (err && err.message ? err.message : err));
    });
  }

  function boot(){
    ensureRoomGate();
    wrapSaveState();
    patchLocalStorageForPlaymats();
    const params = new URLSearchParams(location.search);
    const roomFromUrl = params.get("room");
    if(roomFromUrl === "room1" || roomFromUrl === "room2"){
      selectRoom(roomFromUrl);
    }
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, {once:true});
  else boot();
})();
