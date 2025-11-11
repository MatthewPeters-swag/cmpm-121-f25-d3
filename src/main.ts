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

// --- Constants ---
const CLASSROOM_LATLNG = L.latLng(36.997936938057016, -122.05703507501151);
const ZOOM_LEVEL = 19;
const TILE_DEGREES = 0.0001;
const INTERACTION_RADIUS_CELLS = 3;

// --- Map setup ---
const map = L.map(mapDiv, {
  center: CLASSROOM_LATLNG,
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
const tokenMap = new Map<string, { value: number }>();

// --- Token constants ---
const TOKEN_PROBABILITY = 0.1;
const TOKEN_VALUES = [2, 4];

// --- Player marker ---
L.marker(CLASSROOM_LATLNG, { title: "You are here!" }).addTo(map);

// --- Player state ---
let heldToken: { value: number } | null = null;

// --- Track permanently emptied cells (so tokens don't respawn) ---
const emptyCells = new Set<string>();

// --- Helper: deterministic token generation ---
function getToken(i: number, j: number) {
  const key = `${i},${j}`;
  if (tokenMap.has(key)) return tokenMap.get(key);
  if (emptyCells.has(key)) return null; // permanently empty

  const r = luck(key);
  if (r < TOKEN_PROBABILITY) {
    const valueIndex = Math.floor(luck(key + "_v") * TOKEN_VALUES.length);
    const token = { value: TOKEN_VALUES[valueIndex] };
    tokenMap.set(key, token);
    return token;
  }
  return null;
}

// --- Helper: coordinate conversions ---
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

// --- Helper: range check ---
function isInRange(i: number, j: number) {
  const playerCell = latLngToCell(CLASSROOM_LATLNG.lat, CLASSROOM_LATLNG.lng);
  const di = Math.abs(i - playerCell.i);
  const dj = Math.abs(j - playerCell.j);
  return di <= INTERACTION_RADIUS_CELLS && dj <= INTERACTION_RADIUS_CELLS;
}

// --- Interaction: click handling ---
function onMapClick(e: L.LeafletMouseEvent) {
  const { lat, lng } = e.latlng;
  const { i, j } = latLngToCell(lat, lng);

  if (!isInRange(i, j)) return; // ignore distant clicks

  const key = `${i},${j}`;
  const cellToken = tokenMap.get(key) || getToken(i, j);

  // CASE 1: player has empty hand, cell has token → pick it up
  if (!heldToken && cellToken) {
    heldToken = cellToken;
    tokenMap.delete(key); // remove from grid
    emptyCells.add(key); // mark as permanently empty
    updateStatus();
    drawGrid();
    return;
  }

  // CASE 2: player holding token
  if (heldToken) {
    if (!cellToken) {
      // place token on empty cell
      tokenMap.set(key, heldToken);
      emptyCells.delete(key); // make cell active again
      heldToken = null;
    } else if (cellToken.value === heldToken.value) {
      // merge same-value tokens
      tokenMap.set(key, { value: cellToken.value * 2 });
      heldToken = null;
    } else {
      // incompatible merge: do nothing
      return;
    }
    updateStatus();
    drawGrid();
  }
}

// --- Draw visible grid with tokens ---
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

      const key = `${i},${j}`;
      const token = tokenMap.get(key) || getToken(i, j);
      if (token) {
        const [centerLat, centerLng] = cellToCenter(i, j);
        L.marker([centerLat, centerLng], {
          icon: L.divIcon({
            className: "token-marker",
            html: `<div>${token.value}</div>`,
            iconSize: [20, 20],
          }),
        }).addTo(gridLayer);
      }
    }
  }
}

// --- UI update ---
function updateStatus() {
  if (heldToken) {
    statusPanelDiv.textContent = `Held token: ${heldToken.value}`;
  } else {
    statusPanelDiv.textContent = "Hand empty";
  }
}

// --- Initialize ---
updateStatus();
drawGrid();
map.on("moveend", drawGrid);
map.on("zoomend", drawGrid);
map.on("click", onMapClick);
