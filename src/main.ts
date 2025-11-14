// main.ts — D3.c enabled (Flyweight + Memento for modified cells)

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

// --- Victory overlay (already used in D3.b) ---
const victoryDiv = document.createElement("div");
victoryDiv.id = "victoryOverlay";
victoryDiv.style.display = "none";
victoryDiv.textContent = "🎉 You won! 🎉";
document.body.append(victoryDiv);

// --- Types ---
type CellState = {
  // value === null => explicitly empty (player removed token)
  // value === number => token value placed or merged here
  value: number | null;
  // optional metadata could be added later, e.g. timestamp, owner, etc.
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
// Only store cells that have been modified by the player.
// Key format: "i,j"
const modifiedCells = new Map<string, CellState>();

// --- Deterministic generation params (for unmodified cells) ---
const TOKEN_PROBABILITY = 0.1;
const TOKEN_VALUES = [2, 4];

// --- Player marker ---
const playerMarker = L.marker([playerLat, playerLng], {
  title: "You are here!",
}).addTo(map);

// --- Utility: cell key ---
function cellKey(i: number, j: number) {
  return `${i},${j}`;
}

// --- Helper: deterministic token generation (no memory) ---
// This returns a token object (value) for unmodified cells, but
// does NOT save the result to modifiedCells; it is memoryless.
function deterministicTokenFor(i: number, j: number): { value: number } | null {
  const keySeed = `${i},${j}`;
  const r = luck(keySeed);
  if (r < TOKEN_PROBABILITY) {
    const valueIndex = Math.floor(luck(keySeed + "_v") * TOKEN_VALUES.length);
    return { value: TOKEN_VALUES[valueIndex] };
  }
  return null;
}

// --- Coordinate helpers ---
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

// --- Range check ---
function isInRange(i: number, j: number) {
  const playerCell = latLngToCell(playerLat, playerLng);
  const di = Math.abs(i - playerCell.i);
  const dj = Math.abs(j - playerCell.j);
  return di <= INTERACTION_RADIUS_CELLS && dj <= INTERACTION_RADIUS_CELLS;
}

// --- Interaction: click handling (uses modifiedCells) ---
function onMapClick(e: L.LeafletMouseEvent) {
  const { lat, lng } = e.latlng;
  const { i, j } = latLngToCell(lat, lng);

  if (!isInRange(i, j)) return; // ignore distant clicks

  const key = cellKey(i, j);
  // Determine cell state: prefer modifiedCells (memento), otherwise ephemeral deterministic
  const saved = modifiedCells.get(key);
  const ephemeral = deterministicTokenFor(i, j);
  const cellHasToken = saved ? saved.value !== null : ephemeral !== null;

  // CASE 1: empty hand + token available -> pick up
  if (!heldToken && cellHasToken) {
    // Determine token value
    const tokenValue = saved
      ? (saved.value as number)
      : (ephemeral as { value: number }).value;

    heldToken = { value: tokenValue };

    // Persist that this cell is now empty (memento). This prevents deterministic respawn.
    modifiedCells.set(key, { value: null });

    updateStatus();
    drawGrid();
    return;
  }

  // CASE 2: holding token
  if (heldToken) {
    const held = heldToken;
    if (!cellHasToken) {
      // Place token on empty cell: persist in modifiedCells
      modifiedCells.set(key, { value: held.value });
      heldToken = null;
      updateStatus();
      drawGrid();
      return;
    } else {
      // cell has token: get its value (from saved or ephemeral)
      const cellValue = saved
        ? saved.value
        : (ephemeral as { value: number }).value;

      // If equal → merge
      if (cellValue === held.value) {
        const newValue = cellValue! * 2;
        modifiedCells.set(key, { value: newValue });
        heldToken = null;
        updateStatus();
        drawGrid();

        // Win check
        if (newValue >= WIN_VALUE) showVictory();
        return;
      } else {
        // incompatible — do nothing
        return;
      }
    }
  }
}

// --- Draw visible grid with tokens (always recreates visual objects) ---
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
        // Persisted state: might be empty or have a token
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
        // Not modified: generate deterministically (ephemeral)
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

// --- Player movement (buttons) ---
function movePlayer(dLat: number, dLng: number) {
  playerLat += dLat;
  playerLng += dLng;
  playerMarker.setLatLng([playerLat, playerLng]);
  map.setView([playerLat, playerLng]);
  drawGrid();
  updateStatus();
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

// --- Map event bindings ---
map.on("moveend", drawGrid);
map.on("zoomend", drawGrid);
map.on("click", onMapClick);

// --- Initialize ---
updateStatus();
drawGrid();
