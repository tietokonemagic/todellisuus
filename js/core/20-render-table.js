"use strict";

function render() {
  if (!localPlayer) return;
  ensureState();
  renderPlaymats();
  document.documentElement.style.setProperty("--grave-height", `${dev.graveHeight}px`);
  document.documentElement.style.setProperty("--exile-height", `${dev.exileHeight}px`);
  document.documentElement.style.setProperty("--die-size", `${dev.dieSize}px`);
  document.documentElement.style.setProperty("--die-radius", `${dev.dieRadius}px`);
  document.documentElement.style.setProperty("--sel-width", `${dev.selWidth}px`);
  document.documentElement.style.setProperty("--sel-color", dev.selColor);
  renderPiles();
  renderCards();
  renderHands();
  renderDice();
  renderDragCard();
  renderHandDropZoneDebug();
  renderHandSafeZoneDebug();
  syncSharedFlipOverlay();
  updateMenuActiveStates();
}

function renderPlaymats() {
  const p1Mat = document.getElementById("p1Mat");
  const p2Mat = document.getElementById("p2Mat");
  if (state.playmats?.p1 && state.playmats.p1 !== "default-green") p1Mat.style.backgroundImage = `url("playmat/${state.playmats.p1}")`;
  if (state.playmats?.p2 && state.playmats.p2 !== "default-blue") p2Mat.style.backgroundImage = `url("playmat/${state.playmats.p2}")`;
}

function renderPiles() {
  els.pileLayer.innerHTML = "";
  for (const player of ["p1", "p2"]) {
    for (const kind of ["library", "grave", "exile"]) {
      const p = pileBase(player, kind);
      const pile = document.createElement("div");
      pile.className = `pile ${kind}`;
      pile.dataset.player = player;
      pile.dataset.kind = kind;
      pile.style.left = p.x + "px";
      pile.style.top = p.y + "px";
      pile.style.height = kind === "grave" ? dev.graveHeight + "px" : kind === "exile" ? dev.exileHeight + "px" : "198px";
      pile.style.transform = player === "p2" ? "rotate(180deg)" : "none";

      if (kind === "library") {
        const visual = document.createElement("div");
        visual.className = "pile-card";
        const top = ownerCards(player, "library").at(-1);
        if (top && (state.revealTop[player])) {
          visual.style.backgroundImage = top.image ? `url("${top.image}")` : 'url("lapi2.png")';
          visual.style.backgroundSize = "cover";
          visual.style.backgroundPosition = "center";
        }
        pile.appendChild(visual);
        pile.addEventListener("dblclick", () => { if (player === localPlayer) drawOne(player); });
        pile.addEventListener("contextmenu", e => { if (player !== localPlayer) return; e.preventDefault(); openLibraryMenu(e, player); });
      } else if (kind === "grave") {
        const box = document.createElement("div");
        box.className = "grave-drop";
        box.textContent = "GRAVE";
        pile.appendChild(box);

        const scroller = document.createElement("div");
        scroller.className = "grave-scroll";
        ownerCards(player, "grave").slice().reverse().forEach((card, i) => {
          const el = createCardEl(card, "grave-stack-card grave-scroll-card", card.faceDown);
          el.style.zIndex = String(1000 + i);
          scroller.appendChild(el);
        });
        pile.appendChild(scroller);
      } else {
        const box = document.createElement("div");
        box.className = "exile-box";
        box.textContent = `EXILE ${ownerCards(player, "exile").length}`;
        pile.appendChild(box);
        pile.addEventListener("dblclick", () => openExile(player));
      }

      const count = kind === "library" ? ownerCards(player, "library").length : kind === "grave" ? ownerCards(player, "grave").length : ownerCards(player, "exile").length;
      const label = document.createElement("div");
      label.className = "pile-label";
      label.textContent = `${kind.toUpperCase()} ${count}`;
      pile.appendChild(label);
      els.pileLayer.appendChild(pile);
    }
  }
}
