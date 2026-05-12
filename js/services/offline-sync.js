(() => {
  "use strict";

  if (location.protocol !== "file:") return;

  const STORAGE_PREFIX = "oldschoolOfflineRoomV1:";
  let roomId = null;
  let playerId = null;

  function key(path = "state") {
    return STORAGE_PREFIX + (roomId || "offline") + ":" + path;
  }

  function readState() {
    try {
      const raw = localStorage.getItem(key("state"));
      if (raw) return JSON.parse(raw);
    } catch {}
    return window.CleanTable?.initialState ? window.CleanTable.initialState() : null;
  }

  async function joinRoom(nextRoom, nextPlayer) {
    roomId = nextRoom || "offline";
    playerId = nextPlayer || "p1";

    let state = readState();
    if (!state && window.CleanTable?.initialState) state = window.CleanTable.initialState();
    if (state) localStorage.setItem(key("state"), JSON.stringify(state));

    if (!window.CleanTable) throw new Error("CleanTable not loaded.");
    window.CleanTable.setLocalSeat(roomId + " / OFFLINE", playerId);
    if (state) window.CleanTable.applyRemoteState(state);
  }

  async function pushState(state) {
    if (!roomId || !state) return;
    localStorage.setItem(key("state"), JSON.stringify(state));
  }

  async function voteReset() {}
  async function clearResetVote() {}
  async function leaveRoom() { location.reload(); }
  async function kickRoom(r) {
    const prefix = STORAGE_PREFIX + (r || "room1") + ":";
    Object.keys(localStorage).forEach(k => { if (k.startsWith(prefix)) localStorage.removeItem(k); });
  }

  window.FirebaseCleanSync = {
    offline: true,
    joinRoom,
    pushState,
    voteReset,
    clearResetVote,
    leaveRoom,
    kickRoom,
    get roomId() { return roomId; },
    get playerId() { return playerId; }
  };
})();
