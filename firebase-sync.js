import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getDatabase, ref, set, update, onValue, onDisconnect, get, remove
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

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

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let roomId = null;
let playerId = null;
let clientId = crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random();
let suppress = false;
let unsubRoom = null;

function roomPath(path = "") {
  return "cleanRooms/" + roomId + (path ? "/" + path : "");
}

async function joinRoom(nextRoom, nextPlayer) {
  roomId = nextRoom;
  playerId = nextPlayer;

  const seatRef = ref(db, "cleanRooms/" + roomId + "/seats/" + playerId);
  const snap = await get(seatRef);
  const current = snap.val();

  if (current && current.clientId && current.clientId !== clientId && Date.now() - (current.updated || 0) < 20000) {
    throw new Error(playerId.toUpperCase() + " is already occupied.");
  }

  await set(seatRef, { clientId, updated: Date.now() });
  onDisconnect(seatRef).remove();

  const stateSnap = await get(ref(db, roomPath("state")));
  if (!stateSnap.exists() && window.CleanTable) {
    await set(ref(db, roomPath("state")), window.CleanTable.getInitialSharedState());
  }

  if (unsubRoom) unsubRoom();
  unsubRoom = onValue(ref(db, roomPath("state")), snap => {
    const data = snap.val();
    if (!data || !window.CleanTable) return;
    suppress = true;
    window.CleanTable.applyRemoteState(data);
    suppress = false;
  });

  onValue(ref(db, roomPath("resetVote")), snap => {
    if (!window.CleanTable) return;
    window.CleanTable.onResetVoteChanged(snap.val() || {});
  });

  window.CleanTable.setLocalSeat(roomId, playerId);
}

async function pushState(state) {
  if (!roomId || !playerId || suppress) return;
  await set(ref(db, roomPath("state")), state);
  await update(ref(db, roomPath("seats/" + playerId)), { updated: Date.now() });
}

async function voteReset(yes) {
  if (!roomId || !playerId) return;
  await update(ref(db, roomPath("resetVote")), { [playerId]: !!yes });
}

async function clearResetVote() {
  if (!roomId) return;
  await remove(ref(db, roomPath("resetVote")));
}

async function leaveRoom() {
  if (!roomId || !playerId) return;
  await remove(ref(db, roomPath("seats/" + playerId)));
  location.reload();
}

async function kickRoom(r) {
  await remove(ref(db, "cleanRooms/" + r + "/seats"));
  await remove(ref(db, "cleanRooms/" + r + "/resetVote"));
}

window.FirebaseCleanSync = {
  joinRoom,
  pushState,
  voteReset,
  clearResetVote,
  leaveRoom,
  kickRoom,
  get roomId() { return roomId; },
  get playerId() { return playerId; }
};
