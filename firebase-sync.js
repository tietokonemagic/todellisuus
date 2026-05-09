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
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const params = new URLSearchParams(window.location.search);
const ROOM_ID = params.get("room") || "room1";
const CLIENT_ID_KEY = "osmagicClientId";
let clientId = sessionStorage.getItem(CLIENT_ID_KEY);
if(!clientId){
  clientId = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));
  sessionStorage.setItem(CLIENT_ID_KEY, clientId);
}

const roomRef = ref(db, "rooms/" + ROOM_ID);
let latestRemoteUpdated = 0;
let pushTimer = null;
let firstSnapshot = true;

function currentState(){
  if(typeof window.__OSM_EXPORT_STATE !== "function") return null;
  return window.__OSM_EXPORT_STATE();
}

function writeStateNow(state){
  if(!state) return;
  set(roomRef, {
    updated: Date.now(),
    clientId,
    state
  }).catch(err => console.error("Firebase write failed", err));
}

window.__OSM_PUSH_STATE = function(state){
  if(window.__OSM_APPLYING_REMOTE) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(()=>writeStateNow(state || currentState()), 90);
};

onValue(roomRef, snap => {
  const data = snap.val();

  if(!data){
    const local = currentState();
    if(local) writeStateNow(local);
    return;
  }

  if(data.clientId === clientId) return;
  if(data.updated && data.updated < latestRemoteUpdated) return;
  latestRemoteUpdated = data.updated || Date.now();

  if(!data.state) return;

  if(typeof window.__OSM_APPLY_REMOTE_STATE === "function"){
    window.__OSM_APPLY_REMOTE_STATE(data.state);
  }

  firstSnapshot = false;
});

setTimeout(()=>{
  if(firstSnapshot){
    const local = currentState();
    if(local) window.__OSM_PUSH_STATE(local);
  }
}, 1500);

window.OSMAGIC_ROOM_ID = ROOM_ID;
window.OSMAGIC_CLIENT_ID = clientId;
