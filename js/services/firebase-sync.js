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
let unsubKickRequest = null;

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

async function joinRoom(nextRoom, nextPlayer, nicknameOverride = "") {
  roomId = nextRoom;
  playerId = nextPlayer;

  const lockedNickname = String(
    nicknameOverride || (window.CleanTableNickname ? window.CleanTableNickname() : "")
  ).trim().slice(0, 24);

  if (!lockedNickname) {
    throw new Error("Write your nickname first.");
  }

  await clearChatIfRoomEmpty(roomId);

  const seatRef = ref(db, "cleanRoomsV13/" + roomId + "/seats/" + playerId);
  const snap = await get(seatRef);
  const current = snap.val();
  if (current && current.clientId && current.clientId !== clientId && Date.now() - (current.updated || 0) < 20000) {
    throw new Error(playerId.toUpperCase() + " is occupied.");
  }

  // Write the visible lobby seat with the exact typed nickname before opening the table.
  // This prevents the old bug where the seat name appeared only after refresh/rejoin.
  await set(seatRef, { clientId, updated: Date.now(), nickname: lockedNickname });
  onDisconnect(seatRef).remove();

  const stateRef = ref(db, path("state"));
  const stateSnap = await get(stateRef);
  if (!stateSnap.exists() && window.CleanTable) {
    const initial = window.CleanTable.initialState();
    initial.playerNames = initial.playerNames || {};
    initial.playerNames[playerId] = lockedNickname;
    await set(stateRef, initial);
  } else {
    // Store the joining player's visible in-game name before the state listener opens.
    // Otherwise the first remote snapshot can overwrite the freshly typed name and it
    // appears only after leaving/refreshing/rejoining.
    await update(stateRef, { ["playerNames/" + playerId]: lockedNickname, updated: Date.now() });
  }

  if (unsubState) unsubState();
  if (unsubReset) unsubReset();

  // Enter the table immediately with the nickname that was just selected.
  // The state listener starts after this, so the first screen/chat render cannot
  // briefly use an old nickname from localStorage or from the previous table.
  if (window.CleanTable) window.CleanTable.setLocalSeat(roomId, playerId, lockedNickname);

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

  if (unsubKickRequest) unsubKickRequest();
  unsubKickRequest = onValue(ref(db, path("kickRequests/" + playerId)), snap => {
    const req = snap.val();
    if (req && window.CleanTable && typeof window.CleanTable.onKickRequest === "function") {
      window.CleanTable.onKickRequest(req);
    }
  });

}

// Bandwidth guard:
/// The game can call pushState many times while dragging cards.
/// Writing the entire room state on every mousemove makes Firebase re-send
/// a large snapshot to both players. This queue keeps the local game instant
/// but limits network writes to a smooth realtime cadence.
let pendingState = null;
let pendingJson = "";
let flushTimer = null;
let flushInFlight = false;
let lastFlushAt = 0;
let lastSeatHeartbeatAt = 0;

const STATE_FLUSH_MS = 160; // about 6 updates/sec; smooth enough, far cheaper than 60/sec
const SEAT_HEARTBEAT_MS = 5000;

function scheduleStateFlush(delay = STATE_FLUSH_MS) {
  if (flushTimer) return;
  flushTimer = setTimeout(flushQueuedState, Math.max(0, delay));
}

async function flushQueuedState() {
  flushTimer = null;
  if (!roomId || !playerId || suppress || !pendingState || flushInFlight) return;

  const now = Date.now();
  const wait = STATE_FLUSH_MS - (now - lastFlushAt);
  if (wait > 0) {
    scheduleStateFlush(wait);
    return;
  }

  const stateToWrite = pendingState;
  pendingState = null;
  flushInFlight = true;

  try {
    await set(ref(db, path("state")), stateToWrite);
    lastFlushAt = Date.now();

    if (Date.now() - lastSeatHeartbeatAt > SEAT_HEARTBEAT_MS) {
      lastSeatHeartbeatAt = Date.now();
      await update(ref(db, path("seats/" + playerId)), { updated: Date.now() });
    }
  } catch (err) {
    console.warn("Firebase state flush failed; retrying", err);
    pendingState = stateToWrite;
    scheduleStateFlush(500);
  } finally {
    flushInFlight = false;
    if (pendingState) scheduleStateFlush();
  }
}

async function pushState(state) {
  if (!roomId || !playerId || suppress) return;

  let json = "";
  try {
    json = JSON.stringify(state);
    if (json === pendingJson) return;
    pendingJson = json;
  } catch {}

  pendingState = state;
  scheduleStateFlush();
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


let unsubSeats = null;
function watchSeats(cb) {
  if (typeof cb !== "function") return;
  if (unsubSeats) unsubSeats();

  const rooms = ["room1", "room2"];
  const latest = { room1: {}, room2: {} };
  const unsubs = rooms.map(room =>
    onValue(ref(db, "cleanRoomsV13/" + room + "/seats"), snap => {
      latest[room] = snap.val() || {};
      cb({ room1: latest.room1 || {}, room2: latest.room2 || {} });
    })
  );

  unsubSeats = () => {
    for (const unsub of unsubs) {
      try { unsub(); } catch {}
    }
  };
}

async function kickSeat(r, p) {
  const requestId = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random());
  const requestRef = ref(db, "cleanRoomsV13/" + r + "/kickRequests/" + p);
  await set(requestRef, {
    id: requestId,
    fromClientId: clientId,
    created: Date.now(),
    expires: Date.now() + 20000
  });

  // If the player does not answer, the request owner enforces the 20s timeout.
  setTimeout(async () => {
    try {
      const snap = await get(requestRef);
      const current = snap.val();
      if (current && current.id === requestId) {
        await remove(ref(db, "cleanRoomsV13/" + r + "/seats/" + p));
        await remove(requestRef);
      }
    } catch (err) {
      console.warn("Kick timeout failed", err);
    }
  }, 20500);
}

async function answerKickRequest(agree, requestId) {
  if (!roomId || !playerId) return;
  const requestRef = ref(db, path("kickRequests/" + playerId));
  const snap = await get(requestRef);
  const current = snap.val();
  if (requestId && current && current.id !== requestId) return;

  await remove(requestRef);
  if (agree) {
    const leavingRoom = roomId;
    await remove(ref(db, path("seats/" + playerId)));
    await clearChatIfRoomEmpty(leavingRoom);
    location.reload();
  }
}

window.FirebaseCleanSync = {
  joinRoom,
  pushState,
  voteReset,
  clearResetVote,
  leaveRoom,
  kickRoom,
  kickSeat,
  answerKickRequest,
  watchSeats,
  get roomId() { return roomId; },
  get playerId() { return playerId; }
};
