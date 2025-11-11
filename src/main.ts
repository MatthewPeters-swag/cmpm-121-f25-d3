import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./style.css";

// Import luck function for deterministic randomness
import luck from "./_luck.ts";

// Create basic UI elements
const controlPanelDiv = document.createElement("div");
controlPanelDiv.id = "controlPanel";
document.body.append(controlPanelDiv);

const mapDiv = document.createElement("div");
mapDiv.id = "map";
document.body.append(mapDiv);

const statusPanelDiv = document.createElement("div");
statusPanelDiv.id = "statusPanel";
document.body.append(statusPanelDiv);

// Classroom location
const CLASSROOM_LATLNG = L.latLng(36.997936938057016, -122.05703507501151);

// Fixed zoom level
const ZOOM_LEVEL = 19;

// Create the map
const map = L.map(mapDiv, {
  center: CLASSROOM_LATLNG,
  zoom: ZOOM_LEVEL,
  minZoom: ZOOM_LEVEL,
  maxZoom: ZOOM_LEVEL,
  zoomControl: false,
  scrollWheelZoom: false,
});

// Add OpenStreetMap tiles
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution:
    '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);

// Grid parameters
const TILE_DEGREES = 0.0001; // size of each cell in degrees

// Token parameters
const TOKEN_PROBABILITY = 0.1; // chance a cell has a token
const TOKEN_VALUES = [2, 4]; // possible token values

// Layer group to hold the grid rectangles
const gridLayer = L.layerGroup().addTo(map);

// Map from cell keys to token info (persistent across redraws)
const tokenMap = new Map<string, { value: number }>();

// Function to get deterministic token for a cell
function getToken(i: number, j: number) {
  const key = `${i},${j}`;
  if (tokenMap.has(key)) {
    return tokenMap.get(key);
  }

  const r = luck(key);
  if (r < TOKEN_PROBABILITY) {
    // Pick value deterministically (based on key)
    const valueIndex = Math.floor(luck(key + "_value") * TOKEN_VALUES.length);
    const token = { value: TOKEN_VALUES[valueIndex] };
    tokenMap.set(key, token);
    return token;
  }

  return null;
}

// Function to draw grid cells in the current map bounds
function drawGrid() {
  // First remove existing grid rectangles
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
      const rectBounds: L.LatLngTuple[] = [
        [i * TILE_DEGREES, j * TILE_DEGREES],
        [(i + 1) * TILE_DEGREES, (j + 1) * TILE_DEGREES],
      ];

      L.rectangle(rectBounds, {
        color: "#555",
        weight: 1,
        fillOpacity: 0,
      }).addTo(gridLayer);

      // Display token if cell has one
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

// Initial grid draw
drawGrid();

// Redraw grid when map moves or zoom changes (dynamic coverage)
map.on("moveend", drawGrid);
map.on("zoomend", drawGrid);
