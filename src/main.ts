import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./style.css";

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

// Layer group to hold the grid rectangles
const gridLayer = L.layerGroup().addTo(map);

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
      const rect = L.rectangle(
        [
          [i * TILE_DEGREES, j * TILE_DEGREES],
          [(i + 1) * TILE_DEGREES, (j + 1) * TILE_DEGREES],
        ],
        {
          color: "#555",
          weight: 1,
          fillOpacity: 0,
        },
      );

      rect.addTo(gridLayer);
    }
  }
}

// Initial grid draw
drawGrid();

// Redraw grid when map moves or zoom changes (dynamic coverage)
map.on("moveend", drawGrid);
map.on("zoomend", drawGrid);
