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
import { getDatabase, ref, set, onValue, get } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

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
    clientId: localClientId
  });
  console.log("[firebase sync] pushed state");
}

window.__firebaseSchedulePush = schedulePush;
window.pushStateToFirebase = schedulePush;

function startFirebaseSync(room, player){
  const roomId = room === "room2" ? "room2" : "room1";
  const localPlayer = player === "p2" ? "p2" : "p1";

  if (typeof window.setLocalPlayer === "function") window.setLocalPlayer(localPlayer);

  roomRef = ref(db, "rooms/" + roomId);
  started = true;

  onValue(roomRef, snap => {
    const data = snap.val();
    if (!data) return;
    if (data.clientId === localClientId) return;
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

  document.getElementById("roomSeatStartBtn")?.addEventListener("click", () => {
    if (!selectedRoom || !selectedPlayer) return;
    overlay.classList.add("hidden");
    startFirebaseSync(selectedRoom, selectedPlayer);
  });

  refresh();
})();
