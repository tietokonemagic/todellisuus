"use strict";

function bindDev() {
  const names = Object.keys(devDefaults);
  names.forEach(name => {
    const id = "dev" + name[0].toUpperCase() + name.slice(1);
    const input = document.getElementById(id);
    const val = document.getElementById(id + "Val");
    if (!input) return;
    input.value = dev[name];
    if (val) val.textContent = String(dev[name]);
    input.addEventListener("input", () => {
      dev[name] = input.type === "color" ? input.value : Number(input.value);
      if (val) val.textContent = String(dev[name]);
      saveDev();
      render();
    });
  });
  let dragDev = null;
  els.devDragHandle.addEventListener("pointerdown", e => {
    const r = els.devPanel.getBoundingClientRect();
    dragDev = { dx: e.clientX - r.left, dy: e.clientY - r.top };
    els.devPanel.classList.add("dragged");
    e.preventDefault();
  });
  document.addEventListener("pointermove", e => {
    if (!dragDev) return;
    els.devPanel.style.left = Math.max(0, Math.min(innerWidth - 80, e.clientX - dragDev.dx)) + "px";
    els.devPanel.style.top = Math.max(0, Math.min(innerHeight - 40, e.clientY - dragDev.dy)) + "px";
  });
  document.addEventListener("pointerup", () => { dragDev = null; renderHandDropZoneDebug(); renderHandSafeZoneDebug(); });
}

const PLAYMAT_FILES = ["zombi.png","vault.png","urzaglas.png","unicorn.png","terrain.png","terracorn.png","spawn.png","purge.png","phantom.png","pesti.png","mold.png","mire.png","miracle.png","mesa.png","life.png","kudzu.png","hordes.png","hell.png","grem2.png","grem1.png","golem.png","geddon.png","gate.png","flash2.png","flash.png","farm.png","dance.png","cross.png","cland.png","camel.png","boris.png","bluemana2.png","bluemana1.png","allergy2.png","allergy1.png"];
const TOKEN_FILES = ["wolf.png","wasp.png","thrull.png","tetravite.png","stangg.png","snake.png","saproling.png","sandwarrior.png","rukh.png","minordemon.png","goblin.png","djinn.png","copy.png","citizen.png","aieback.png","camarid.png"];

function populateGreenMenuLists() {
  if (els.playmatMenu && !els.playmatMenu.dataset.ready) {
    PLAYMAT_FILES.forEach(file => {
      const b = document.createElement("button");
      b.textContent = file.replace(".png","");
      b.onclick = () => { state.playmats[localPlayer] = file; push(); };
      els.playmatMenu.appendChild(b);
    });
    els.playmatMenu.dataset.ready = "1";
  }
  if (els.tokenMenu && !els.tokenMenu.dataset.ready) {
    TOKEN_FILES.forEach(file => {
      if (file === "aieback.png") return;
      const b = document.createElement("button");
      b.textContent = file.replace(".png","");
      b.onclick = () => addToken(file);
      els.tokenMenu.appendChild(b);
    });
    els.tokenMenu.dataset.ready = "1";
  }
}

function toggleSection(el, btn) {
  if (!el) return;
  el.classList.toggle("hidden");
  if (btn) btn.classList.toggle("menu-toggle-active", !el.classList.contains("hidden"));
}

function addToken(file) {
  const card = { id: uid(), owner: localPlayer, zone: "battlefield", x: 960, y: localPlayer === "p1" ? 720 : 360, z: 1000 + state.cards.length, tapped: false, faceDown: false, marked: false, name: file.replace(".png",""), typeLine: "Token", oracle: "", image: "token/" + file, isToken: true };
  state.cards.push(card); bringToFront(card); push();
}

function addCounterDie() {
  state.dice.push({ id: uid(), kind: "counter", owner: localPlayer, value: 3, color: "#25aa3d", pipColor: "#111111", x: 960, y: localPlayer === "p1" ? 720 : 360, z: 2000 });
  push();
}

let dieMenuTargetId = null;
function openDieMenu(e, die) {
  dieMenuTargetId = die.id;
  if (els.dieColorInput) els.dieColorInput.value = die.color || (die.kind === "counter" ? "#25aa3d" : "#eeeeee");
  if (els.diePipColorInput) els.diePipColorInput.value = die.pipColor || "#111111";
  els.dieMenu.style.left = e.clientX + "px";
  els.dieMenu.style.top = e.clientY + "px";
  els.dieMenu.classList.remove("hidden");
}

function syncSharedFlipOverlay() {
  if (!state.flipOverlay) state.flipOverlay = { active: false, front: "", nonce: 0 };
  const sig = state.flipOverlay.active ? `${state.flipOverlay.front}:${state.flipOverlay.nonce}` : "off";

  if (sig === localFlipOverlaySignature) return;
  localFlipOverlaySignature = sig;

  if (state.flipOverlay.active) {
    const btn = state.flipOverlay.front === "fallingstar.png" ? els.menuFlipStarBtn : els.menuFlipOrbBtn;
    if (btn) {
      btn.dataset.internalOrbflipOpen = "1";
      btn.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
      delete btn.dataset.internalOrbflipOpen;
    }
  } else {
    const close = document.querySelector("#orbflipExternal .orbflip-close");
    if (close) close.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  }

  updateMenuActiveStates();
}

function toggleSharedFlip(front) {
  if (!state.flipOverlay) state.flipOverlay = { active: false, front: "", nonce: 0 };
  if (state.flipOverlay.active && state.flipOverlay.front === front) {
    state.flipOverlay = { active: false, front: "", nonce: Date.now() };
  } else {
    state.flipOverlay = { active: true, front, nonce: Date.now() };
  }
  push();
}

function updateMenuActiveStates() {
  const flip = state.flipOverlay || {};
  if (els.inspectorToggleBtn) els.inspectorToggleBtn.classList.toggle("active", inspectorEnabled);
  if (els.menuFlipOrbBtn) els.menuFlipOrbBtn.classList.toggle("active", !!flip.active && flip.front === "chaosfront.png");
  if (els.menuFlipStarBtn) els.menuFlipStarBtn.classList.toggle("active", !!flip.active && flip.front === "fallingstar.png");
  if (els.helpBtn && els.helpOverlayV33) els.helpBtn.classList.toggle("active", !els.helpOverlayV33.classList.contains("hidden"));
  if (els.devTuningBtn && els.devPanel) els.devTuningBtn.classList.toggle("active", !els.devPanel.classList.contains("hidden"));
  if (els.playmatMenuBtn && els.playmatMenu) els.playmatMenuBtn.classList.toggle("active", !els.playmatMenu.classList.contains("hidden"));
  if (els.sleevesMenuBtn && els.sleevesMenu) els.sleevesMenuBtn.classList.toggle("active", !els.sleevesMenu.classList.contains("hidden"));
  if (els.addTokenMenuBtn && els.tokenMenu) els.addTokenMenuBtn.classList.toggle("active", !els.tokenMenu.classList.contains("hidden"));
  updateSleeveButtonsV33();
}
