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

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, set, onValue, get, runTransaction, onDisconnect, remove } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let roomRef = null;
let applyingRemote = false;
let started = false;
let pushTimer = null;
let localClientId = localStorage.getItem("oldschoolClientId");
if (!localClientId) {
  localClientId = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));
  localStorage.setItem("oldschoolClientId", localClientId);
}

let localTabId = sessionStorage.getItem("oldschoolTabId");
if (!localTabId) {
  localTabId = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));
  sessionStorage.setItem("oldschoolTabId", localTabId);
}

let claimedSeatRef = null;
let claimedRoomId = null;
let claimedPlayer = null;
let heartbeatTimer = null;

function schedulePush(){
  if (!started || applyingRemote || !roomRef) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(pushNow, 120);
}

async function pushNow(){
  if (!started || applyingRemote || !roomRef) return;
  if (typeof window.getFirebaseSnapshot !== "function") return;
  const snapshot = window.getFirebaseSnapshot();
  await set(roomRef, {
    ...snapshot,
    clientId: localClientId,
    tabId: localTabId
  });
  console.log("[firebase sync] pushed state");
}

window.__firebaseSchedulePush = schedulePush;
window.pushStateToFirebase = schedulePush;

function seatLabel(player){
  return player === "p2" ? "PLAYER 2" : "PLAYER 1";
}

function roomLabel(room){
  return room === "room2" ? "ROOM 2" : "ROOM 1";
}

async function releaseClaimedSeat(){
  if (!claimedSeatRef) return;
  try { await remove(claimedSeatRef); } catch (err) { console.warn("[firebase sync] seat release failed", err); }
  claimedSeatRef = null;
  claimedRoomId = null;
  claimedPlayer = null;
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  heartbeatTimer = null;
}

async function claimSeat(roomId, localPlayer){
  const seatRef = ref(db, "roomPresence/" + roomId + "/seats/" + localPlayer);
  const now = Date.now();
  const tx = await runTransaction(seatRef, current => {
    // Empty seat: claim it.
    if (!current) {
      return { clientId: localClientId, tabId: localTabId, joinedAt: now, lastSeen: now };
    }

    // Same exact browser tab reconnecting: refresh claim.
    if (current.clientId === localClientId && current.tabId === localTabId) {
      return { ...current, lastSeen: now };
    }

    // Stale seat fallback. Normal exits are handled by onDisconnect/remove,
    // but this prevents a crashed browser from locking the room forever.
    if (current.lastSeen && now - current.lastSeen > 120000) {
      return { clientId: localClientId, tabId: localTabId, joinedAt: now, lastSeen: now, reclaimed: true };
    }

    // Occupied by another tab/client.
    return;
  }, { applyLocally: false });

  const val = tx.snapshot.val();
  const ok = tx.committed && val && val.clientId === localClientId && val.tabId === localTabId;
  if (!ok) return false;

  claimedSeatRef = seatRef;
  claimedRoomId = roomId;
  claimedPlayer = localPlayer;

  try {
    await onDisconnect(seatRef).remove();
  } catch (err) {
    console.warn("[firebase sync] onDisconnect setup failed", err);
  }

  if (heartbeatTimer) clearInterval(heartbeatTimer);
  heartbeatTimer = setInterval(() => {
    set(seatRef, { clientId: localClientId, tabId: localTabId, joinedAt: val.joinedAt || now, lastSeen: Date.now() });
  }, 15000);

  window.addEventListener("beforeunload", () => {
    try { remove(seatRef); } catch (_) {}
  }, { once: true });

  return true;
}

async function startFirebaseSync(room, player){
  const roomId = room === "room2" ? "room2" : "room1";
  const localPlayer = player === "p2" ? "p2" : "p1";

  const ok = await claimSeat(roomId, localPlayer);
  if (!ok) {
    const msg = roomLabel(roomId) + " / " + seatLabel(localPlayer) + " is already occupied.";
    console.warn("[firebase sync]", msg);
    alert(msg + "\n\nChoose the other player seat or wait until that player leaves.");
    return false;
  }

  if (typeof window.setLocalPlayer === "function") window.setLocalPlayer(localPlayer);

  roomRef = ref(db, "rooms/" + roomId);
  started = true;

  onValue(roomRef, snap => {
    const data = snap.val();
    if (!data) return;
    if (data.clientId === localClientId && data.tabId === localTabId) return;
    if (typeof window.applyFirebaseSnapshot !== "function") return;

    applyingRemote = true;
    try {
      window.applyFirebaseSnapshot(data);
      console.log("[firebase sync] applied remote state from", roomId);
    } finally {
      setTimeout(() => { applyingRemote = false; }, 80);
    }
  });

  get(roomRef).then(snap => {
    if (!snap.exists()) schedulePush();
  });

  console.log("[firebase sync] joined", roomId, "as", localPlayer);
  return true;
}
window.startFirebaseSync = startFirebaseSync;

(function bindRoomOverlay(){
  const overlay = document.getElementById("roomSeatOverlay");
  if (!overlay) return;

  let selectedRoom = localStorage.getItem("oldschoolSelectedRoom") || "";
  let selectedPlayer = localStorage.getItem("oldschoolLocalPlayer") || "";

  function refresh(){
    overlay.querySelectorAll(".room-choice").forEach(btn => btn.classList.toggle("selected", btn.dataset.room === selectedRoom));
    overlay.querySelectorAll(".player-choice").forEach(btn => btn.classList.toggle("selected", btn.dataset.player === selectedPlayer));
    const start = document.getElementById("roomSeatStartBtn");
    if (start) start.disabled = !(selectedRoom && selectedPlayer);
  }

  overlay.querySelectorAll(".room-choice").forEach(btn => {
    btn.addEventListener("click", () => {
      selectedRoom = btn.dataset.room;
      localStorage.setItem("oldschoolSelectedRoom", selectedRoom);
      refresh();
    });
  });

  overlay.querySelectorAll(".player-choice").forEach(btn => {
    btn.addEventListener("click", () => {
      selectedPlayer = btn.dataset.player;
      localStorage.setItem("oldschoolLocalPlayer", selectedPlayer);
      if (typeof window.setLocalPlayer === "function") window.setLocalPlayer(selectedPlayer);
      refresh();
    });
  });

  document.getElementById("roomSeatStartBtn")?.addEventListener("click", async () => {
    if (!selectedRoom || !selectedPlayer) return;
    const start = document.getElementById("roomSeatStartBtn");
    if (start) { start.disabled = true; start.textContent = "JOINING..."; }
    const ok = await startFirebaseSync(selectedRoom, selectedPlayer);
    if (ok) {
      overlay.classList.add("hidden");
    } else {
      if (start) start.textContent = "START";
      refresh();
    }
  });

  refresh();
})();
