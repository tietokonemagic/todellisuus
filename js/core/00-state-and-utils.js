"use strict";

const TABLE_W = 1920;
const TABLE_H = 1080;
const CARD_W = 118;
const CARD_H = 165;
const GRID = 4;

const PIPS = { 1:[5], 2:[1,9], 3:[1,5,9], 4:[1,3,7,9], 5:[1,3,5,7,9], 6:[1,3,4,6,7,9] };

const els = {};
[
  "seatScreen","seatStatus","joinR1P1","joinR1P2","joinR2P1","joinR2P2","kickRoom1","kickRoom2",
  "game","viewport","world","pileLayer","cardLayer","dragLayer","diceLayer","myHand","opponentHand",
  "mainMenuBtn","mainMenu","playmatMenuBtn","playmatMenu","sleevesMenuBtn","sleevesMenu","ogBackSleeveBtn","colorSleeveBtn","sleeveColorInput","addTokenMenuBtn","tokenMenu","menuFlipOrbBtn","menuFlipStarBtn","addDiceBtn","sylvanPanel","sylvanMinus","sylvanPlus","sylvanCount","sylvanOk","dieMenu","dieColorInput","diePipColorInput","loadDeckBtn","helpOverlayV33","helpBtn","devTuningBtn","inspectorToggleBtn","resetVoteBtn","leaveBtn","roomInfo",
  "deckModal","deckText","coreSetSelect","doLoadDeck","closeDeckModal","deckStatus",
  "tutorModal","tutorGrid","tutorToHand","tutorToTable","closeTutor",
  "graveModal","graveGrid","closeGrave","exileModal","exileGrid","closeExile","helpModal","closeHelp",
  "libraryMenu","cardMenu","handCardMenu","resetPrompt","acceptReset","rejectReset",
  "inspector","inspectorHeader","inspectorMinus","inspectorPlus","inspectorName","inspectorType","inspectorOracle",
  "selectBox","devPanel","devDragHandle","devReset","devCopy","devClose","devOutput"
].forEach(id => els[id] = document.getElementById(id));

let localRoom = null;
let localPlayer = null;
let selectedIds = new Set();
let hoveredCardId = null;
let hoveredDieId = null;
let selectedTutorId = null;
let contextLibraryPlayer = null;
let contextCardId = null;
let contextHandCardId = null;
let drag = null;
let handDropPreview = null;
let handFan = { p1: 0, p2: 0 };
let handDepth = { p1: 1, p2: 1 };
let inspectorEnabled = true;
let currentInspectorCardId = null;
let inspectorFont = 15;
let sylvanCount = 3;
let localFlipOverlaySignature = null;
let boxSelect = null;

const devDefaults = {
  "p1LibraryX": 81,
  "p1LibraryY": -106,
  "p1GraveX": 77,
  "p1GraveY": -11,
  "p1ExileX": 77,
  "p1ExileY": -47,
  "p1DiceX": 98,
  "p1DiceY": -2,
  "p2LibraryX": -90,
  "p2LibraryY": 109,
  "p2GraveX": -81,
  "p2GraveY": -142,
  "p2ExileX": -81,
  "p2ExileY": 34,
  "p2DiceX": -249,
  "p2DiceY": 13,
  "graveHeight": 355,
  "exileHeight": 64,
  "dieSize": 33,
  "dieGap": 3,
  "dieRadius": 4,
  "selWidth": 1,
  "selColor": "#755929",
  "shuffleSpeed": 64,
  "shuffleLength": 650,
  "shuffleSpread": 8,
  "handArtX": -76,
  "handArtY": -133,
  "handArtSize": 164,
  "thumbMinX": 0,
  "thumbMaxX": 45,
  "thumbMinY": 0,
  "thumbMaxY": 0,
  "handDropZoneX": 0,
  "handDropZoneY": 82,
  "handDropZoneWidth": 690,
  "handDropZoneHeight": 77,
  "handSafeZoneX": 0,
  "handSafeZoneY": 58,
  "handSafeZoneWidth": 510,
  "handSafeZoneHeight": 260,
  "handScrollSensitivity": 1,
  "handScrollSpeed": 1,
  "handFanMaxSpread": 70
};
let dev = loadDev();

let state = initialState();

function uid() { return crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2); }
function clone(o) { return JSON.parse(JSON.stringify(o)); }
function otherPlayer() { return localPlayer === "p1" ? "p2" : "p1"; }
function snap(v) { return Math.round(v / GRID) * GRID; }
