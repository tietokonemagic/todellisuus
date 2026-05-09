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
import {
  getDatabase,
  ref,
  set,
  onValue,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const params = new URLSearchParams(window.location.search);
const ROOM_ID = params.get("room") || "room1";
const CLIENT_ID = (() => {
  const key = "oldschoolTabletopClientId";
  let id = localStorage.getItem(key);
  if (!id) {
    id = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));
    localStorage.setItem(key, id);
  }
  return id;
})();

const roomRef = ref(db, "rooms/" + ROOM_ID + "/tabletopState");
let lastAppliedRevision = 0;
let pushTimer = null;
let firebaseReady = false;

function syncStatus(text) {
  // Deliberately console-only: do not alter the existing UI.
  console.log("[firebase sync]", text);
}

window.__oldschoolPushSyncState = function (stateObj) {
  if (!firebaseReady || !stateObj) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    const revision = Date.now();
    lastAppliedRevision = Math.max(lastAppliedRevision, revision);
    set(roomRef, {
      revision,
      clientId: CLIENT_ID,
      updatedAt: serverTimestamp(),
      state: stateObj
    }).catch(err => console.error("Firebase sync push failed", err));
  }, 60);
};

onValue(roomRef, snap => {
  firebaseReady = true;
  const data = snap.val();
  if (!data || !data.state) {
    const current = window.__oldschoolGetSyncState && window.__oldschoolGetSyncState();
    if (current) window.__oldschoolPushSyncState(current);
    syncStatus("empty room, published current local state to " + ROOM_ID);
    return;
  }

  if (data.clientId === CLIENT_ID) return;
  if (data.revision && data.revision <= lastAppliedRevision) return;
  lastAppliedRevision = data.revision || Date.now();

  if (window.__oldschoolApplySyncState) {
    window.__oldschoolApplySyncState(data.state);
    syncStatus("applied remote state from " + ROOM_ID);
  }
}, err => {
  console.error("Firebase sync listen failed", err);
});
