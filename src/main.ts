// main.ts — D3.c + D3.d (Full geolocation + button switching + New Game)

import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./style.css";
import luck from "./_luck.ts";

// --- UI setup ---
const controlPanelDiv = document.createElement("div");
controlPanelDiv.id = "controlPanel";
document.body.append(controlPanelDiv);

const mapDiv = document.createElement("div");
mapDiv.id = "map";
document.body.append(mapDiv);

const statusPanelDiv = document.createElement("div");
statusPanelDiv.id = "statusPanel";
document.body.append(statusPanelDiv);

// --- Victory overlay ---
const victoryDiv = document.createElement("div");
victoryDiv.id = "victoryOverlay";
victoryDiv.style.display = "none";
victoryDiv.textContent = "🎉 You won! 🎉";
document.body.append(victoryDiv);

// --- Types ---
type CellState = {
  value: number | null;
};

// --- Constants ---
const TILE_DEGREES = 0.0001;
const INTERACTION_RADIUS_CELLS = 3;
const ZOOM_LEVEL = 19;
const WIN_VALUE = 32;

// --- Player state ---
let playerLat = 36.997936938057016;
let playerLng = -122.05703507501151;
let heldToken: { value: number } | null = null;

// --- Map setup ---
const map = L.map(mapDiv, {
  center: [playerLat, playerLng],
  zoom: ZOOM_LEVEL,
  minZoom: ZOOM_LEVEL,
  maxZoom: ZOOM_LEVEL,
  zoomControl: false,
  scrollWheelZoom: false,
});

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution:
    '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);

// --- Layers ---
const gridLayer = L.layerGroup().addTo(map);

// --- Flyweight / Memento store ---
const modifiedCells = new Map<string, CellState>();

// --- Deterministic generation params ---
const TOKEN_PROBABILITY = 0.1;
const TOKEN_VALUES = [2, 4];

// --- Player marker ---
const playerMarker = L.marker([playerLat, playerLng], {
  title: "You are here!",
}).addTo(map);

// --- Utility ---
function cellKey(i: number, j: number) {
  return `${i},${j}`;
}

function deterministicTokenFor(i: number, j: number): { value: number } | null {
  const keySeed = `${i},${j}`;
  const r = luck(keySeed);
  if (r < TOKEN_PROBABILITY) {
    const valueIndex = Math.floor(luck(keySeed + "_v") * TOKEN_VALUES.length);
    return { value: TOKEN_VALUES[valueIndex] };
  }
  return null;
}

function latLngToCell(lat: number, lng: number) {
  return {
    i: Math.floor(lat / TILE_DEGREES),
    j: Math.floor(lng / TILE_DEGREES),
  };
}

function cellToCenter(i: number, j: number): [number, number] {
  const centerLat = i * TILE_DEGREES + TILE_DEGREES / 2;
  const centerLng = j * TILE_DEGREES + TILE_DEGREES / 2;
  return [centerLat, centerLng];
}

function isInRange(i: number, j: number) {
  const playerCell = latLngToCell(playerLat, playerLng);
  const di = Math.abs(i - playerCell.i);
  const dj = Math.abs(j - playerCell.j);
  return di <= INTERACTION_RADIUS_CELLS && dj <= INTERACTION_RADIUS_CELLS;
}

// --- Interaction ---
function onMapClick(e: L.LeafletMouseEvent) {
  const { lat, lng } = e.latlng;
  const { i, j } = latLngToCell(lat, lng);

  if (!isInRange(i, j)) return;

  const key = cellKey(i, j);
  const saved = modifiedCells.get(key);
  const ephemeral = deterministicTokenFor(i, j);
  const cellHasToken = saved ? saved.value !== null : ephemeral !== null;

  if (!heldToken && cellHasToken) {
    const tokenValue = saved
      ? (saved.value as number)
      : (ephemeral as { value: number }).value;
    heldToken = { value: tokenValue };
    modifiedCells.set(key, { value: null });
    updateStatus();
    drawGrid();
    saveGameState();
    return;
  }

  if (heldToken) {
    const held = heldToken;
    if (!cellHasToken) {
      modifiedCells.set(key, { value: held.value });
      heldToken = null;
      updateStatus();
      drawGrid();
      saveGameState();
      return;
    } else {
      const cellValue = saved
        ? saved.value
        : (ephemeral as { value: number }).value;
      if (cellValue === held.value) {
        const newValue = cellValue! * 2;
        modifiedCells.set(key, { value: newValue });
        heldToken = null;
        updateStatus();
        drawGrid();
        saveGameState();
        if (newValue >= WIN_VALUE) showVictory();
        return;
      } else {
        return;
      }
    }
  }
}

// --- Draw grid ---
function drawGrid() {
  gridLayer.clearLayers();

  const bounds = map.getBounds();
  const south = bounds.getSouth();
  const north = bounds.getNorth();
  const west = bounds.getWest();
  const east = bounds.getEast();

  const iStart = Math.floor(south / TILE_DEGREES);
  const iEnd = Math.ceil(north / TILE_DEGREES);
  const jStart = Math.floor(west / TILE_DEGREES);
  const jEnd = Math.ceil(east / TILE_DEGREES);

  for (let i = iStart; i <= iEnd; i++) {
    for (let j = jStart; j <= jEnd; j++) {
      const cellBounds: L.LatLngTuple[] = [
        [i * TILE_DEGREES, j * TILE_DEGREES],
        [(i + 1) * TILE_DEGREES, (j + 1) * TILE_DEGREES],
      ];

      const inRange = isInRange(i, j);
      const rectColor = inRange ? "#00f" : "#555";
      const rectWeight = inRange ? 2 : 1;

      L.rectangle(cellBounds, {
        color: rectColor,
        weight: rectWeight,
        fillOpacity: 0,
      }).addTo(gridLayer);

      const key = cellKey(i, j);
      const saved = modifiedCells.get(key);
      if (saved) {
        if (saved.value !== null) {
          const [centerLat, centerLng] = cellToCenter(i, j);
          L.marker([centerLat, centerLng], {
            icon: L.divIcon({
              className: "token-marker",
              html: `<div>${saved.value}</div>`,
              iconSize: [20, 20],
            }),
          }).addTo(gridLayer);
        }
      } else {
        const det = deterministicTokenFor(i, j);
        if (det) {
          const [centerLat, centerLng] = cellToCenter(i, j);
          L.marker([centerLat, centerLng], {
            icon: L.divIcon({
              className: "token-marker",
              html: `<div>${det.value}</div>`,
              iconSize: [20, 20],
            }),
          }).addTo(gridLayer);
        }
      }
    }
  }
}

// --- UI updates ---
function updateStatus() {
  const posInfo = `Lat: ${playerLat.toFixed(6)}, Lng: ${playerLng.toFixed(6)}`;
  if (heldToken) {
    statusPanelDiv.textContent = `Held token: ${heldToken.value} | ${posInfo}`;
  } else {
    statusPanelDiv.textContent = `Hand empty | ${posInfo}`;
  }
}

// --- Victory ---
function showVictory() {
  victoryDiv.style.display = "block";
}

// --- Movement interface & Facade ---
interface MovementFacade {
  start(): void;
  stop(): void;
}

class ButtonMovement implements MovementFacade {
  start() {/* button clicks are already wired below */}
  stop() {/* optional: remove button listeners */}
}

class GeolocationMovement implements MovementFacade {
  private watchId?: number;
  start() {
    if ("geolocation" in navigator) {
      this.watchId = navigator.geolocation.watchPosition(
        (pos) => {
          playerLat = pos.coords.latitude;
          playerLng = pos.coords.longitude;
          playerMarker.setLatLng([playerLat, playerLng]);
          map.setView([playerLat, playerLng]);
          drawGrid();
          updateStatus();
          saveGameState();
        },
        (err) => console.error(err),
        { enableHighAccuracy: true },
      );
    }
  }
  stop() {
    if (this.watchId !== undefined) {
      navigator.geolocation.clearWatch(this.watchId);
    }
  }
}

// --- Persistence ---
function saveGameState() {
  const state = {
    playerLat,
    playerLng,
    heldToken,
    modifiedCells: Array.from(modifiedCells.entries()),
  };
  localStorage.setItem("gridCrafterState", JSON.stringify(state));
}

function loadGameState() {
  const raw = localStorage.getItem("gridCrafterState");
  if (raw) {
    const state = JSON.parse(raw);
    playerLat = state.playerLat;
    playerLng = state.playerLng;
    heldToken = state.heldToken;
    modifiedCells.clear();
    state.modifiedCells.forEach(([key, cell]: [string, CellState]) =>
      modifiedCells.set(key, cell)
    );
  }
}

// --- Player movement (buttons) ---
function movePlayer(dLat: number, dLng: number) {
  playerLat += dLat;
  playerLng += dLng;
  playerMarker.setLatLng([playerLat, playerLng]);
  map.setView([playerLat, playerLng]);
  drawGrid();
  updateStatus();
  saveGameState();
}

// --- Movement buttons UI ---
const moveButtonsDiv = document.createElement("div");
moveButtonsDiv.id = "moveButtons";
moveButtonsDiv.innerHTML = `
  <button id="moveN">⬆️ North</button>
  <button id="moveS">⬇️ South</button>
  <button id="moveW">⬅️ West</button>
  <button id="moveE">➡️ East</button>
`;
controlPanelDiv.append(moveButtonsDiv);

(document.getElementById("moveN") as HTMLButtonElement).onclick = () =>
  movePlayer(TILE_DEGREES, 0);
(document.getElementById("moveS") as HTMLButtonElement).onclick = () =>
  movePlayer(-TILE_DEGREES, 0);
(document.getElementById("moveW") as HTMLButtonElement).onclick = () =>
  movePlayer(0, -TILE_DEGREES);
(document.getElementById("moveE") as HTMLButtonElement).onclick = () =>
  movePlayer(0, TILE_DEGREES);

// --- Runtime Movement Switching + New Game ---
const newGameBtn = document.createElement("button");
newGameBtn.textContent = "New Game";
controlPanelDiv.append(newGameBtn);
newGameBtn.onclick = () => {
  localStorage.removeItem("gridCrafterState");
  modifiedCells.clear();
  heldToken = null;
  playerLat = 36.997936938057016;
  playerLng = -122.05703507501151;
  victoryDiv.style.display = "none";
  updateStatus();
  drawGrid();
};

// Movement type selector
const movementSelect = document.createElement("select");
movementSelect.innerHTML = `
  <option value="buttons">Button Movement</option>
  <option value="geolocation">Geolocation Movement</option>
`;
controlPanelDiv.append(movementSelect);

let currentMovement: MovementFacade = new ButtonMovement();
movementSelect.onchange = () => {
  currentMovement.stop();
  if (movementSelect.value === "geolocation") {
    currentMovement = new GeolocationMovement();
  } else {
    currentMovement = new ButtonMovement();
  }
  currentMovement.start();
};

// --- Map event bindings ---
map.on("moveend", drawGrid);
map.on("zoomend", drawGrid);
map.on("click", onMapClick);

// --- Initialize ---
loadGameState();
updateStatus();
drawGrid();
currentMovement.start();
