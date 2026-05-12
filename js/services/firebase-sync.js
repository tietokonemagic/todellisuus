import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, set, update, onValue, get, remove, onDisconnect } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

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
let unsubState = null;
let unsubReset = null;

function path(p = "") {
  return "cleanRoomsV13/" + roomId + (p ? "/" + p : "");
}

async function clearChatIfRoomEmpty(targetRoom = roomId) {
  if (!targetRoom) return;
  try {
    const seatsSnap = await get(ref(db, "cleanRoomsV13/" + targetRoom + "/seats"));
    const seats = seatsSnap.val() || {};
    const activeSeats = Object.values(seats).filter(s => s && Date.now() - (s.updated || 0) < 30000);
    if (activeSeats.length === 0) {
      const stateRef = ref(db, "cleanRoomsV13/" + targetRoom + "/state");
      const stateSnap = await get(stateRef);
      const current = stateSnap.val();
      if (current && Array.isArray(current.chat) && current.chat.length) {
        await update(stateRef, { chat: [] });
      }
    }
  } catch (err) {
    console.warn("Could not clear empty room chat", err);
  }
}

async function joinRoom(nextRoom, nextPlayer) {
  roomId = nextRoom;
  playerId = nextPlayer;

  await clearChatIfRoomEmpty(roomId);

  const seatRef = ref(db, "cleanRoomsV13/" + roomId + "/seats/" + playerId);
  const snap = await get(seatRef);
  const current = snap.val();
  if (current && current.clientId && current.clientId !== clientId && Date.now() - (current.updated || 0) < 20000) {
    throw new Error(playerId.toUpperCase() + " is occupied.");
  }

  await set(seatRef, { clientId, updated: Date.now() });
  onDisconnect(seatRef).remove();

  const stateRef = ref(db, path("state"));
  const stateSnap = await get(stateRef);
  if (!stateSnap.exists() && window.CleanTable) {
    await set(stateRef, window.CleanTable.initialState());
  }

  if (unsubState) unsubState();
  if (unsubReset) unsubReset();

  unsubState = onValue(stateRef, snap => {
    const data = snap.val();
    if (!data || !window.CleanTable) return;
    suppress = true;
    window.CleanTable.applyRemoteState(data);
    suppress = false;
  });

  unsubReset = onValue(ref(db, path("resetVote")), snap => {
    if (window.CleanTable) window.CleanTable.onResetVoteChanged(snap.val() || {});
  });

  window.CleanTable.setLocalSeat(roomId, playerId);
}

async function pushState(state) {
  if (!roomId || !playerId || suppress) return;
  await set(ref(db, path("state")), state);
  await update(ref(db, path("seats/" + playerId)), { updated: Date.now() });
}

async function voteReset(yes) {
  if (!roomId || !playerId) return;
  await update(ref(db, path("resetVote")), { [playerId]: !!yes });
}

async function clearResetVote() {
  if (!roomId) return;
  await remove(ref(db, path("resetVote")));
}

async function leaveRoom() {
  if (!roomId || !playerId) return;
  const leavingRoom = roomId;
  await remove(ref(db, path("seats/" + playerId)));
  await clearChatIfRoomEmpty(leavingRoom);
  location.reload();
}

async function kickRoom(r) {
  await remove(ref(db, "cleanRoomsV13/" + r + "/seats"));
  await remove(ref(db, "cleanRoomsV13/" + r + "/resetVote"));
  const stateRef = ref(db, "cleanRoomsV13/" + r + "/state");
  const stateSnap = await get(stateRef);
  const current = stateSnap.val();
  if (current) await update(stateRef, { chat: [] });
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
