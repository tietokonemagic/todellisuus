
(() => {
  "use strict";

  const W = 170;
  const H = 237;
  const MAX_CM = 45;
  const GAUGE_TOP = 22;
  const GAUGE_BOTTOM = 472;
  const PX_PER_CM = (GAUGE_BOTTOM - GAUGE_TOP) / MAX_CM;

  const TUNE = {
    globalSpeed: 1,
    torqueBase: 1.8,
    torquePower: 40,
    torqueEdge: 2.4,
    torqueCornerBoost: 0.55,
    centerEaseZone: 0.23,
    centerEaseStrength: 0.68,
    fingerEnabled: 1,
    fingerX: 1,
    fingerY: 20,
    fingerWorldX: 1068.4376220703125,
    fingerWorldY: 519.5085144042969,
    fingerWidth: 0.46,
    fingerPower: 33,
    fingerLift: 1,
    fingerSlide: 1.7,
    airDriftAfterFlip: 0.52,
    spinDriftAmount: 0.36,
    landingSkid: 1.9,
    badAngleBounce: 0.6,
    smoothImpulseFrames: 22,
    smoothDriftEase: 0.38,
    smoothLandingEase: 0.38,
    yawNaturalAmount: 0.64,
    yawLandingTwist: 1.04,
    yawDamping: 0.894,
    fingerHitWindow: 0.2,
    fingerTipRadius: 0.23,
    fingerPivotFrames: 8,
    fingerPivotDrop: 0.85,
    fingerPivotRelease: 0.5,
    stageFingerScale: 0.82,
    dt: 0.14,
    gravity: 0.095,
    liftBase: 0.45,
    liftPower: 4.6,
    linearX: 2.3,
    linearY: 1.45,
    airDriftX: 0.8,
    airDriftY: 0.8,
    dropBounce: 0.15,
    dropSlide: 0.28,
    flatSlide: 0.18,
    settleSpeed: 1.35,
    settleDelay: 6,
    clothFriction: 0.52,
    angularKill: 0.28,
    maxDropFrames: 90
  };

  let root;
  let card;
  let frontImg;
  let backImg;
  let shadow;
  let hand;
  let forceDot;
  let panel;
  let heightLabel;
  let gauge;
  let cardArrow;
  let handArrow;
  let powerInner;
  let frontImage = "chaosfront.png";
  let flipOwner = "p1";
  let dragCard = null;
  let dragHand = null;
  let dragPanel = null;
  let remoteControlled = false;
  let lastPublish = 0;

  const st = {
    x: 0,
    y: 0,
    h: 30,

    vx: 0,
    vy: 0,
    vh: 0,

    driftVX: 0,
    driftVY: 0,
    impulseVX: 0,
    impulseVY: 0,
    impulseVH: 0,
    impulseFrames: 0,

    yaw: -8,
    roll: 0,
    pitch: 0,

    wRoll: 0,
    wPitch: 0,
    wYaw: 0,

    charging: false,
    chargeStart: 0,
    screenX: 0,
    screenY: 0,

    phase: "idle",
    settling: false,
    landingFrames: 0,
    dropFrames: 0,
    targetRoll: 0,
    targetPitch: 0,

    fingerHit: false,
    fingerPivoting: false,
    fingerPivotFramesLeft: 0,
    fingerPivotSide: 1,
    fingerRollOnly: false,
    fingerLockedRoll: 0,

    prevLowestHeight: 30,
    anim: null
  };

  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  function smoothstep(edge0, edge1, x) {
    const t = clamp((x - edge0) / (edge1 - edge0 || 0.0001), 0, 1);
    return t * t * (3 - 2 * t);
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function normDeg(a) {
    return ((a + 180) % 360 + 360) % 360 - 180;
  }

  function gaugeY(cm) {
    return GAUGE_BOTTOM - clamp(cm, 0, MAX_CM) * PX_PER_CM;
  }

  function flatTarget(angle) {
    return Math.round(angle / 180) * 180;
  }

  function currentActivePlayer() {
    const sel = document.getElementById("activePlayerSelect");
    return sel ? sel.value : "p1";
  }

  function ownerBaseRot() {
    return flipOwner === "p2" ? 180 : 0;
  }

  function tableCardWidth() {
    const battleCard = document.querySelector(".battle-card");
    if (battleCard) {
      const r = battleCard.getBoundingClientRect();
      if (r.width > 20) return r.width;
    }

    const probe = document.createElement("div");
    probe.className = "card battle-card";
    probe.style.position = "fixed";
    probe.style.left = "-9999px";
    probe.style.top = "-9999px";
    probe.style.visibility = "hidden";
    document.body.appendChild(probe);
    const w = probe.getBoundingClientRect().width || 118;
    probe.remove();
    return w;
  }

  function landingScale() {
    return tableCardWidth() / W;
  }

  function cardCornersCm() {
    const cardW = 6.3;
    const cardH = 8.8;
    return [
      {x:-cardW/2, y:-cardH/2},
      {x: cardW/2, y:-cardH/2},
      {x:-cardW/2, y: cardH/2},
      {x: cardW/2, y: cardH/2}
    ];
  }

  function cornerHeightOffset(c) {
    const r = st.roll * Math.PI / 180;
    const p = st.pitch * Math.PI / 180;
    return c.x * Math.sin(p) * Math.cos(r) + c.y * Math.sin(r);
  }

  function lowestContact() {
    let best = null;
    for (const c of cardCornersCm()) {
      const offset = cornerHeightOffset(c);
      if (!best || offset < best.offset) best = {...c, offset};
    }
    return best;
  }

  function lowestCornerOffsetCm() {
    return lowestContact().offset;
  }

  function addSmoothImpulse(vx, vy, vh, frames) {
    const n = Math.max(1, Math.round(frames));
    st.impulseVX += vx / n;
    st.impulseVY += vy / n;
    st.impulseVH += vh / n;
    st.impulseFrames = Math.max(st.impulseFrames, n);
  }

  function stepSmoothImpulse() {
    if (st.impulseFrames <= 0) return;
    st.vx += st.impulseVX;
    st.vy += st.impulseVY;
    st.vh += st.impulseVH;
    st.impulseFrames--;
    if (st.impulseFrames <= 0) {
      st.impulseVX = 0;
      st.impulseVY = 0;
      st.impulseVH = 0;
    }
  }

  function ensureOverlay() {
    if (root) return;

    root = document.createElement("div");
    root.id = "orbflipExternal";
    root.className = "hidden";
    root.innerHTML = `
      <div class="orbflip-shadow"></div>
      <div class="orbflip-card">
        <img class="orbflip-front" src="chaosfront.png" alt="">
        <img class="orbflip-back" src="lapi2.png" alt="">
      </div>
      <img class="orbflip-hand" src="skasi.png" alt="">
      <div class="orbflip-force"></div>
      <div class="orbflip-panel">
        <div class="orbflip-height">HEIGHT 30 CM</div>
        <div class="orbflip-gauge">
          <div class="orbflip-card-arrow"></div>
          <div class="orbflip-hand-arrow"></div>
        </div>
        <div class="orbflip-power"><div class="orbflip-power-inner"></div></div>
        <button type="button" class="orbflip-again">AGAIN</button>
        <button type="button" class="orbflip-close">CLOSE</button>
      </div>
    `;
    document.body.appendChild(root);

    shadow = root.querySelector(".orbflip-shadow");
    card = root.querySelector(".orbflip-card");
    frontImg = root.querySelector(".orbflip-front");
    backImg = root.querySelector(".orbflip-back");
    hand = root.querySelector(".orbflip-hand");
    forceDot = root.querySelector(".orbflip-force");
    panel = root.querySelector(".orbflip-panel");
    heightLabel = root.querySelector(".orbflip-height");
    gauge = root.querySelector(".orbflip-gauge");
    cardArrow = root.querySelector(".orbflip-card-arrow");
    handArrow = root.querySelector(".orbflip-hand-arrow");
    powerInner = root.querySelector(".orbflip-power-inner");

    for (let cm = 0; cm <= 45; cm += 5) {
      const y = gaugeY(cm);

      const tick = document.createElement("div");
      tick.className = "orbflip-tick";
      tick.style.top = `${y}px`;
      gauge.appendChild(tick);

      const label = document.createElement("div");
      label.className = "orbflip-label";
      label.textContent = String(cm);
      label.style.top = `${y}px`;
      gauge.appendChild(label);
    }

    bindOverlay();
  }


  function snapshot() {
    return {
      t: Date.now(),
      x: st.x, y: st.y, h: st.h,
      vx: st.vx, vy: st.vy, vh: st.vh,
      driftVX: st.driftVX, driftVY: st.driftVY,
      yaw: st.yaw, roll: st.roll, pitch: st.pitch,
      wRoll: st.wRoll, wPitch: st.wPitch, wYaw: st.wYaw,
      phase: st.phase,
      settling: st.settling,
      landingFrames: st.landingFrames,
      dropFrames: st.dropFrames,
      targetRoll: st.targetRoll,
      targetPitch: st.targetPitch,
      fingerWorldX: TUNE.fingerWorldX,
      fingerWorldY: TUNE.fingerWorldY,
      fingerY: TUNE.fingerY
    };
  }

  function applySnapshot(data, owner) {
    if (!data) return;
    flipOwner = owner || flipOwner;
    remoteControlled = true;
    Object.assign(st, {
      x: Number(data.x) || 0,
      y: Number(data.y) || 0,
      h: Number(data.h) || 0,
      vx: Number(data.vx) || 0,
      vy: Number(data.vy) || 0,
      vh: Number(data.vh) || 0,
      driftVX: Number(data.driftVX) || 0,
      driftVY: Number(data.driftVY) || 0,
      yaw: Number(data.yaw) || 0,
      roll: Number(data.roll) || 0,
      pitch: Number(data.pitch) || 0,
      wRoll: Number(data.wRoll) || 0,
      wPitch: Number(data.wPitch) || 0,
      wYaw: Number(data.wYaw) || 0,
      phase: data.phase || "idle",
      settling: !!data.settling,
      landingFrames: Number(data.landingFrames) || 0,
      dropFrames: Number(data.dropFrames) || 0,
      targetRoll: Number(data.targetRoll) || 0,
      targetPitch: Number(data.targetPitch) || 0
    });
    if (typeof data.fingerWorldX === "number") TUNE.fingerWorldX = data.fingerWorldX;
    if (typeof data.fingerWorldY === "number") TUNE.fingerWorldY = data.fingerWorldY;
    if (typeof data.fingerY === "number") TUNE.fingerY = data.fingerY;
    apply();
  }

  function publishSnapshot(force = false) {
    if (remoteControlled) return;
    const now = performance.now();
    if (!force && now - lastPublish < 90) return;
    lastPublish = now;
    if (window.CleanTablePublishOrbPhysics) window.CleanTablePublishOrbPhysics(snapshot());
  }

  function apply() {
    st.x = clamp(st.x, -W * 0.4, innerWidth - W * 0.6);
    st.y = clamp(st.y, -H * 0.4, innerHeight - H * 0.6);
    st.h = clamp(st.h, 0, MAX_CM);

    const baseRot = ownerBaseRot();
    const baseScale = landingScale();
    const scale = baseScale * (1 + st.h / 75);

    card.style.left = `${st.x}px`;
    card.style.top = `${st.y}px`;
    card.style.transform =
      `perspective(900px) rotateZ(${baseRot + st.yaw}deg) rotateX(${-st.roll}deg) rotateY(${-st.pitch}deg) scale(${scale})`;

    frontImg.src = frontImage;
    backImg.src = "lapi2.png";

    shadow.style.left = `${st.x + W * 0.06}px`;
    shadow.style.top = `${st.y + H * 0.06}px`;
    shadow.style.transform = `rotate(${baseRot + st.yaw}deg) scale(${baseScale * (1 + st.h / 110)})`;
    shadow.style.opacity = String(Math.max(0.05, 0.28 - st.h / 165));

    const handScale = baseScale * (1 + TUNE.fingerY / 75) * TUNE.stageFingerScale;
    hand.style.left = `${TUNE.fingerWorldX}px`;
    hand.style.top = `${TUNE.fingerWorldY}px`;
    hand.style.transform = `rotate(${baseRot}deg) scale(${handScale})`;

    panel.style.transformOrigin = "50% 50%";
    panel.style.transform = `rotate(${baseRot}deg)`;
    heightLabel.textContent = `HEIGHT ${Math.round(st.h)} CM`;

    cardArrow.style.top = `${gaugeY(Math.max(0, st.h + lowestCornerOffsetCm())) - 7}px`;
    handArrow.style.top = `${gaugeY(TUNE.fingerY) - 7}px`;
  }

  function reset(front) {
    cancelAnimationFrame(st.anim);
    frontImage = front || frontImage;

    Object.assign(st, {
      x: innerWidth * 0.5 - W * 0.5,
      y: innerHeight * 0.5 - H * 0.5,
      h: 30,

      vx: 0,
      vy: 0,
      vh: 0,

      driftVX: 0,
      driftVY: 0,
      impulseVX: 0,
      impulseVY: 0,
      impulseVH: 0,
      impulseFrames: 0,

      yaw: -8,
      roll: 0,
      pitch: 0,

      wRoll: 0,
      wPitch: 0,
      wYaw: 0,

      charging: false,
      chargeStart: 0,
      screenX: 0,
      screenY: 0,

      phase: "idle",
      settling: false,
      landingFrames: 0,
      dropFrames: 0,
      targetRoll: 0,
      targetPitch: 0,

      fingerHit: false,
      fingerPivoting: false,
      fingerPivotFramesLeft: 0,
      fingerPivotSide: 1,
      fingerRollOnly: false,
      fingerLockedRoll: 0,

      prevLowestHeight: 30
    });

    card.classList.remove("dragging", "aiming", "flipping");
    forceDot.style.display = "none";
    powerInner.style.width = "0%";
    apply();
  }

  function open(front, owner) {
    ensureOverlay();
    flipOwner = owner || currentActivePlayer();
    remoteControlled = !!(window.CleanTable && window.FirebaseCleanSync && window.FirebaseCleanSync.playerId && flipOwner !== window.FirebaseCleanSync.playerId);
    root.classList.remove("hidden");
    reset(front);
    publishSnapshot(true);
  }

  function close() {
    if (!root) return;
    cancelAnimationFrame(st.anim);
    root.classList.add("hidden");
  }

  function power() {
    return st.charging ? Math.min(1, (performance.now() - st.chargeStart) / 1850) : 0;
  }

  function localClick() {
    const yawRad = st.yaw * Math.PI / 180;
    const rawX = Math.cos(yawRad) * st.screenX + Math.sin(yawRad) * st.screenY;
    const rawY = -Math.sin(yawRad) * st.screenX + Math.cos(yawRad) * st.screenY;
    return {x: rawX, y: rawY};
  }

  function launch() {
    const p = power();
    const local = localClick();
    const lx = local.x;
    const ly = local.y;

    st.charging = false;
    st.fingerHit = false;
    st.fingerPivoting = false;
    st.fingerRollOnly = false;
    card.classList.remove("aiming");
    forceDot.style.display = "none";
    powerInner.style.width = "0%";

    const shortEdge = Math.abs(lx);
    const longEdge = Math.abs(ly);

    const lrCenter = 1 - smoothstep(0, TUNE.centerEaseZone, longEdge);
    const tbCenter = 1 - smoothstep(0, TUNE.centerEaseZone, shortEdge);
    const rollCrossDamp = 1 - lrCenter * TUNE.centerEaseStrength;
    const pitchCrossDamp = 1 - tbCenter * TUNE.centerEaseStrength;
    const corner = Math.min(1, Math.hypot(lx, ly) / 0.70);

    st.vx = lx * (0.25 + p * TUNE.linearX);
    st.vy = ly * (0.20 + p * TUNE.linearY) - p * 0.12 - Math.abs(lx) * 0.10;
    st.vx += lx * p * TUNE.airDriftX;
    st.vy += ly * p * TUNE.airDriftY;
    st.vh = TUNE.liftBase + p * TUNE.liftPower;

    const torqueBase = TUNE.torqueBase + p * TUNE.torquePower;

    st.wPitch = Math.sign(lx || 0.1) * torqueBase * (0.25 + shortEdge * TUNE.torqueEdge);
    st.wPitch *= pitchCrossDamp;

    st.wRoll = -Math.sign(ly || 0.1) * torqueBase * (0.25 + longEdge * TUNE.torqueEdge);
    st.wRoll *= rollCrossDamp;

    st.wPitch *= 0.70 + corner * TUNE.torqueCornerBoost;
    st.wRoll *= 0.70 + corner * TUNE.torqueCornerBoost;
    st.wYaw = (lx * ly) * (4.0 + p * 8.0);

    if (shortEdge < 0.08 && longEdge < 0.08) {
      st.wRoll = (Math.random() > 0.5 ? 1 : -1) * (2.0 + p * 4.0);
      st.wPitch = (Math.random() > 0.5 ? 1 : -1) * (1.6 + p * 3.0);
    }

    st.phase = "flipping";
    st.settling = false;
    st.landingFrames = 0;
    animate();
    publishSnapshot(true);
  }

  function stageFingerTip() {
    const baseScale = landingScale();
    const scale = baseScale * (1 + TUNE.fingerY / 75) * TUNE.stageFingerScale;
    const visualH = 250 * 0.58 * scale;
    return {
      x: TUNE.fingerWorldX,
      y: TUNE.fingerWorldY + visualH * 0.5,
      scale
    };
  }

  function syncFingerGaugeFromWorld() {
    const tip = stageFingerTip();
    const cardCx = st.x + W * 0.5;
    TUNE.fingerX = clamp((tip.x - cardCx) / 150, -1, 1);
  }

  function tryFingerContact() {
    if (!TUNE.fingerEnabled || st.fingerHit || st.settling) return;

    syncFingerGaugeFromWorld();

    const tip = stageFingerTip();

    const currentHeight = Math.max(0, st.h + lowestCornerOffsetCm());
    const previousHeight = Math.max(0, st.prevLowestHeight);
    const minH = Math.min(previousHeight, currentHeight) - TUNE.fingerHitWindow;
    const maxH = Math.max(previousHeight, currentHeight) + TUNE.fingerHitWindow;
    const heightMatches = TUNE.fingerY >= minH && TUNE.fingerY <= maxH;
    const fallingOrNear =
      st.vh <= 0.15 ||
      Math.abs(currentHeight - TUNE.fingerY) <= TUNE.fingerHitWindow;

    if (!heightMatches || !fallingOrNear) return;

    const cardLeft = st.x;
    const cardRight = st.x + W * landingScale();
    const cardTop = st.y;
    const cardBottom = st.y + H * landingScale();

    const withinY =
      tip.y >= cardTop - TUNE.fingerHitWindow * 2 &&
      tip.y <= cardBottom + TUNE.fingerHitWindow * 2;

    const distRight = Math.abs(tip.x - cardRight);
    const distLeft = Math.abs(tip.x - cardLeft);

    const hitRight = withinY && distRight <= (18 + TUNE.fingerTipRadius * 45);
    const hitLeft = withinY && distLeft <= (18 + TUNE.fingerTipRadius * 45);

    if (!hitRight && !hitLeft) return;

    const side = hitRight ? 1 : -1;

    st.fingerHit = true;
    st.fingerPivoting = true;
    st.fingerRollOnly = true;
    st.fingerLockedRoll = st.roll;
    st.fingerPivotFramesLeft = Math.round(TUNE.fingerPivotFrames);
    st.fingerPivotSide = side;

    st.wRoll = 0;
    st.wYaw = 0;
    st.vh = Math.max(st.vh, TUNE.fingerLift * 0.35);
    st.wPitch = side * TUNE.fingerPower;

    addSmoothImpulse(
      side * Math.abs(TUNE.fingerSlide) * 0.12,
      -Math.abs(TUNE.fingerSlide) * 0.08,
      TUNE.fingerLift * 0.65,
      TUNE.smoothImpulseFrames
    );

    st.wYaw += side * TUNE.yawNaturalAmount * 2.2;
  }

  function stepFingerPivot() {
    if (!st.fingerPivoting) return false;

    st.fingerPivotFramesLeft--;

    const side = st.fingerPivotSide;
    const push = TUNE.fingerPivotDrop * TUNE.globalSpeed;

    st.roll = st.fingerLockedRoll;
    st.wRoll = 0;
    st.wYaw = 0;

    st.vh = Math.max(st.vh, TUNE.fingerPivotRelease);
    st.wPitch += side * push;

    addSmoothImpulse(TUNE.fingerX * 0.018, 0, 0, TUNE.smoothImpulseFrames);

    if (st.fingerPivotFramesLeft <= 0) st.fingerPivoting = false;

    return true;
  }

  function edgeState() {
    const rollEdge = Math.abs(Math.cos(st.roll * Math.PI / 180));
    const pitchEdge = Math.abs(Math.cos(st.pitch * Math.PI / 180));
    return {
      side: rollEdge < 0.55 || pitchEdge < 0.70,
      corner: rollEdge < 0.55 && pitchEdge < 0.70
    };
  }

  function startLanding() {
    const contact = lowestContact();
    st.h = Math.max(0, -contact.offset);
    st.settling = true;
    st.landingFrames = 0;
    st.dropFrames = 0;

    const edge = edgeState();
    const impact = Math.abs(st.vh);

    st.targetRoll = st.fingerRollOnly ? st.fingerLockedRoll : flatTarget(st.roll);
    st.targetPitch = flatTarget(st.pitch);

    if (edge.corner || edge.side) {
      const bounceMultiplier = edge.corner ? TUNE.dropBounce * 1.6 : TUNE.dropBounce;
      const slideMultiplier = edge.corner ? 0.35 : 0.25;
      const missScale = 5;
      const targetVH = impact * bounceMultiplier * (1 + TUNE.badAngleBounce);

      const skidVX =
        Math.sign(contact.x || st.vx || 1) *
        impact * slideMultiplier *
        TUNE.landingSkid * missScale;

      const skidVY =
        Math.sign(contact.y || st.vy || 1) *
        impact * slideMultiplier *
        TUNE.landingSkid * missScale;

      const badAngleBoost = 1 + TUNE.badAngleBounce * 2;

      st.vh = lerp(st.vh, targetVH, TUNE.smoothLandingEase);
      st.vx = lerp(st.vx, st.vx * TUNE.dropSlide + skidVX * badAngleBoost, TUNE.smoothLandingEase);
      st.vy = lerp(st.vy, st.vy * TUNE.dropSlide + skidVY * badAngleBoost, TUNE.smoothLandingEase);

      st.wRoll *= edge.corner ? 0.30 : 0.18;
      st.wPitch *= edge.corner ? 0.30 : 0.18;

      st.wYaw += Math.sign((contact.x || 0.1) * (contact.y || 0.1)) * impact * TUNE.yawLandingTwist * 0.08;
      st.wYaw *= TUNE.yawDamping;
    } else {
      st.vh = 0;
      st.vx *= TUNE.flatSlide;
      st.vy *= TUNE.flatSlide;
      st.wRoll = 0;
      st.wPitch = 0;
      st.wYaw = 0;
    }
  }

  function stepLanding() {
    if (!st.settling) return true;

    st.landingFrames++;
    st.dropFrames++;

    if (st.vh > 0.002) {
      st.h += st.vh;
      st.vh -= TUNE.gravity * TUNE.globalSpeed;
      if (st.h + lowestCornerOffsetCm() <= 0) {
        st.h = Math.max(0, -lowestCornerOffsetCm());
        st.vh = 0;
      }
    } else {
      st.h = Math.max(0, -lowestCornerOffsetCm());
    }

    if (st.dropFrames >= TUNE.settleDelay) {
      if (st.fingerRollOnly) {
        st.roll = st.fingerLockedRoll;
        st.wRoll = 0;
        st.wYaw = 0;
      } else {
        st.roll += normDeg(st.targetRoll - st.roll) * Math.min(0.35, TUNE.settleSpeed * 0.018);
      }

      st.pitch += normDeg(st.targetPitch - st.pitch) * Math.min(0.35, TUNE.settleSpeed * 0.018);
      st.h = Math.max(0, -lowestCornerOffsetCm());
    }

    stepSmoothImpulse();

    st.x += st.vx;
    st.y += st.vy;

    st.vx *= TUNE.clothFriction;
    st.vy *= TUNE.clothFriction;
    st.wYaw *= TUNE.yawDamping;

    const done =
      Math.abs(normDeg(st.targetRoll - st.roll)) < 1.2 &&
      Math.abs(normDeg(st.targetPitch - st.pitch)) < 1.2 &&
      Math.hypot(st.vx, st.vy) < 0.012 &&
      Math.abs(st.vh) < 0.006 &&
      st.dropFrames >= TUNE.settleDelay;

    if (done || st.landingFrames > TUNE.maxDropFrames) {
      st.roll = st.targetRoll;
      st.pitch = st.targetPitch;
      st.h = 0;
      st.vx = 0;
      st.vy = 0;
      st.vh = 0;
      st.wRoll = 0;
      st.wPitch = 0;
      st.wYaw = 0;
      st.settling = false;
      st.phase = "landed";
      card.classList.remove("flipping");
      apply();
      return true;
    }

    return false;
  }

  function animate() {
    card.classList.add("flipping");
    st.phase = "flipping";

    function step() {
      st.prevLowestHeight = Math.max(0, st.h + lowestCornerOffsetCm());

      if (st.settling) {
        if (stepLanding()) return;
        apply();
        st.anim = requestAnimationFrame(step);
        return;
      }

      const dt = TUNE.dt * TUNE.globalSpeed;

      stepSmoothImpulse();

      st.x += st.vx * dt;
      st.y += st.vy * dt;
      st.h += st.vh * dt;

      if (!st.settling && st.h > 0.001) {
        st.roll += st.wRoll * dt;
        st.pitch += st.wPitch * dt;
        st.yaw += st.wYaw * dt;
      }

      if (st.fingerRollOnly && !st.settling) {
        st.roll = st.fingerLockedRoll;
        st.wRoll = 0;
        st.wYaw = 0;
      }

      st.vh -= TUNE.gravity;

      tryFingerContact();
      stepFingerPivot();

      if (st.h + lowestCornerOffsetCm() <= 0) {
        st.h = Math.max(0, -lowestCornerOffsetCm());
        startLanding();
      } else {
        st.vx *= 0.994;
        st.vy *= 0.994;
        st.wRoll *= 0.994;
        st.wPitch *= 0.994;
        st.wYaw *= 0.991;

        const spinMag = Math.min(1.8, (Math.abs(st.wRoll) + Math.abs(st.wPitch)) / 70);
        const driftScale = 6;
        const targetDriftVX =
          Math.sin((st.roll + st.pitch) * Math.PI / 180) *
          TUNE.spinDriftAmount * spinMag * TUNE.globalSpeed * driftScale;

        const targetDriftVY =
          Math.cos(st.yaw * Math.PI / 180) *
          TUNE.airDriftAfterFlip * spinMag * TUNE.globalSpeed * driftScale;

        st.driftVX = lerp(st.driftVX, targetDriftVX, TUNE.smoothDriftEase);
        st.driftVY = lerp(st.driftVY, targetDriftVY, TUNE.smoothDriftEase);

        st.x += st.driftVX;
        st.y += st.driftVY;

        st.wYaw += Math.sin((st.roll - st.pitch) * Math.PI / 180) * spinMag * TUNE.yawNaturalAmount * 0.018;
        st.wYaw *= TUNE.yawDamping;

        st.vy += 0.0005;
      }

      apply();
      publishSnapshot();
      st.anim = requestAnimationFrame(step);
    }

    step();
  }

  function bindOverlay() {
    card.addEventListener("pointerdown", e => {
      if (remoteControlled) { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); return; }
      if (st.phase === "flipping") return;

      const r = card.getBoundingClientRect();

      if (!e.shiftKey) {
        dragCard = {
          dx: e.clientX - r.left,
          dy: e.clientY - r.top
        };
        card.classList.add("dragging");
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return;
      }

      st.charging = true;
      st.chargeStart = performance.now();
      st.screenX = (e.clientX - r.left) / r.width - 0.5;
      st.screenY = (e.clientY - r.top) / r.height - 0.5;

      card.classList.add("aiming");
      forceDot.style.display = "block";
      forceDot.style.left = `${e.clientX}px`;
      forceDot.style.top = `${e.clientY}px`;

      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    }, true);

    hand.addEventListener("pointerdown", e => {
      if (remoteControlled) { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); return; }
      const r = hand.getBoundingClientRect();
      dragHand = {
        dx: e.clientX - r.left,
        dy: e.clientY - r.top
      };
      hand.style.cursor = "grabbing";
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    }, true);

    panel.addEventListener("pointerdown", e => {
      if (e.target && e.target.tagName === "BUTTON") return;

      const r = panel.getBoundingClientRect();
      dragPanel = {
        dx: e.clientX - r.left,
        dy: e.clientY - r.top
      };

      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    }, true);

    root.querySelector(".orbflip-again").addEventListener("click", e => {
      e.preventDefault();
      reset(frontImage);
    });

    root.querySelector(".orbflip-close").addEventListener("click", e => {
      e.preventDefault();
      close();
    });
  }

  document.addEventListener("pointermove", e => {
    if (!root || root.classList.contains("hidden")) return;

    if (dragCard) {
      st.x = e.clientX - dragCard.dx;
      st.y = e.clientY - dragCard.dy;
      apply();
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    }

    if (dragHand) {
      TUNE.fingerWorldX = clamp(e.clientX - dragHand.dx, 0, innerWidth - 40);
      TUNE.fingerWorldY = clamp(e.clientY - dragHand.dy, 0, innerHeight - 40);
      syncFingerGaugeFromWorld();
      apply();
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    }

    if (dragPanel) {
      panel.style.left = `${clamp(e.clientX - dragPanel.dx, 0, innerWidth - 80)}px`;
      panel.style.top = `${clamp(e.clientY - dragPanel.dy, 0, innerHeight - 80)}px`;
      panel.style.right = "auto";
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    }

    if (st.charging) {
      forceDot.style.left = `${e.clientX}px`;
      forceDot.style.top = `${e.clientY}px`;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    }
  }, true);

  document.addEventListener("pointerup", e => {
    if (!root || root.classList.contains("hidden")) return;

    if (dragCard) {
      dragCard = null;
      card.classList.remove("dragging");
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return;
    }

    if (dragHand) {
      dragHand = null;
      hand.style.cursor = "grab";
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return;
    }

    if (dragPanel) {
      dragPanel = null;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return;
    }

    if (st.charging) {
      launch();
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    }
  }, true);

  document.addEventListener("keydown", e => {
    if (!root || root.classList.contains("hidden")) return;

    if (e.key === "Escape") {
      close();
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return;
    }

    if (e.shiftKey && e.key === "ArrowUp") {
      TUNE.fingerY = clamp(TUNE.fingerY + 1, 0, MAX_CM);
      apply();
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return;
    }

    if (e.shiftKey && e.key === "ArrowDown") {
      TUNE.fingerY = clamp(TUNE.fingerY - 1, 0, MAX_CM);
      apply();
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return;
    }

    if (e.key === "ArrowUp") {
      st.h = clamp(st.h + 1, 0, MAX_CM);
      apply();
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return;
    }

    if (e.key === "ArrowDown") {
      st.h = clamp(st.h - 1, 0, MAX_CM);
      apply();
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    }
  }, true);

  document.addEventListener("click", e => {
    // Main app owns MENU flip buttons so the event can be synced to Firebase.
    // This listener intentionally does not intercept them.
  }, true);


  window.OrbFlipExternal = {
    open,
    close,
    applyRemoteState: applySnapshot,
    getState: snapshot,
    isOpen() {
      return !!root && !root.classList.contains("hidden");
    }
  };

  (function chargeLoop() {
    if (root && !root.classList.contains("hidden") && st.charging) {
      powerInner.style.width = `${power() * 100}%`;
    }
    requestAnimationFrame(chargeLoop);
  })();
})();
