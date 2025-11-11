import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./style.css";

// Import deterministic randomness function
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
const TILE_DEGREES = 0.0001; // each cell ≈ size of a house
const INTERACTION_RADIUS_CELLS = 3; // how many cells away player can interact

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
L.marker(CLASSROOM_LATLNG, {
  title: "You are here!",
}).addTo(map);

// --- Player interaction radius (visualized as circle) ---
//const interactionRadiusDegrees = INTERACTION_RADIUS_CELLS * TILE_DEGREES;
//L.circle(CLASSROOM_LATLNG, {
//  radius: interactionRadiusDegrees * 111_000, // convert degrees → meters
//  color: "blue",
//  weight: 1,
//  fillOpacity: 0.05,
//}).addTo(map);

// --- Helper: deterministic token generation ---
function getToken(i: number, j: number) {
  const key = `${i},${j}`;
  if (tokenMap.has(key)) return tokenMap.get(key);

  const r = luck(key);
  if (r < TOKEN_PROBABILITY) {
    const valueIndex = Math.floor(luck(key + "_v") * TOKEN_VALUES.length);
    const token = { value: TOKEN_VALUES[valueIndex] };
    tokenMap.set(key, token);
    return token;
  }

  return null;
}

// --- Helper: check if cell is within player range ---
function isInRange(i: number, j: number) {
  const playerI = Math.floor(CLASSROOM_LATLNG.lat / TILE_DEGREES);
  const playerJ = Math.floor(CLASSROOM_LATLNG.lng / TILE_DEGREES);
  const di = Math.abs(i - playerI);
  const dj = Math.abs(j - playerJ);
  return di <= INTERACTION_RADIUS_CELLS && dj <= INTERACTION_RADIUS_CELLS;
}

// --- Draw visible grid with tokens and highlights ---
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

      // Make nearby cells highlighted
      const rectColor = inRange ? "#00f" : "#555";
      const rectWeight = inRange ? 2 : 1;

      L.rectangle(cellBounds, {
        color: rectColor,
        weight: rectWeight,
        fillOpacity: 0,
      }).addTo(gridLayer);

      // Add token marker if cell has one
      const token = getToken(i, j);
      if (token) {
        const centerLat = i * TILE_DEGREES + TILE_DEGREES / 2;
        const centerLng = j * TILE_DEGREES + TILE_DEGREES / 2;

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

// --- Initial draw and updates ---
drawGrid();
map.on("moveend", drawGrid);
map.on("zoomend", drawGrid);
