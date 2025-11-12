# PLAN.md for D3: GridCrafter GO

-- Game Design Vision --
GridCrafter GO is a location-based crafting game that merges the mechanics of 4096/Threes with Pokémon GO.\
Players move around the real world (or, for this demo, a fixed map centered on the classroom) to find, collect, and merge tokens scattered across a latitude–longitude grid.\
Only nearby cells can be interacted with, so players are encouraged to move around to reach new cells.\
Tokens of the same value can be combined to create higher-value tokens, with the goal of crafting a high-value token (e.g. 8 or 16).

-- Technologies --

- TypeScript for main game code
- Leaflet.js for map rendering and interaction
- Luck library for deterministic token generation
- CSS (in shared style.css) for layout and visuals
- Deno + Vite for building and running the project
- GitHub Actions + GitHub Pages for automated deployment

-- Assignments --

-- D3.a: Core Mechanics (Token Collection and Crafting) --

Key Technical Challenge:\
Use Leaflet to render an interactive map with a grid overlay and deterministic token spawning.

Key Gameplay Challenge:\
Allow players to collect and merge nearby tokens into higher-value ones, following 4096-style rules.

-- Steps --

-- Initial Setup --

- [x] Create and commit PLAN.md file to project root
- [x] Copy main.ts to reference.ts for future reference
- [x] Delete starter code from main.ts
- [x] Set up Vite + Deno build environment
- [x] Import Leaflet and Luck libraries
- [x] Verify GitHub Pages deploy pipeline

-- Map Rendering --

- [x] Display a Leaflet map centered on the classroom coordinates
- [x] Disable panning limits so the map appears to cover the entire world
- [x] Implement fixed zoom level suitable for viewing the grid
- [x] Create and render grid cells using latitude/longitude spacing (≈0.0001° per side)
- [x] Draw visible borders for all cells
- [x] Ensure grid covers visible map area dynamically (not just a static patch)

-- Token System --

- [x] Use deterministic hashing (Luck library) to decide whether each cell spawns a token
- [x] Assign token values (e.g. 2 or 4) based on deterministic randomness
- [x] Display token values visually in each cell (text, icon, or canvas graphics)
- [x] Ensure token layout is consistent across page reloads

-- Player Representation --

- [x] Add a fixed “player” marker at the classroom coordinates
- [x] Define an interaction radius (about 3 cells away)
- [x] Highlight or activate nearby cells when in range

-- Interaction + Gameplay --

- [x] Allow player to click nearby cells to interact
- [x] If cell has token and player hand is empty → pick up token (remove from cell)
- [x] If player holds a token → clicking another nearby cell will attempt to place it

  - [x] If target cell empty → place token
  - [x] If target cell contains token of same value → merge into double-value token

- [x] Update on-screen UI to show player’s held token (or empty hand)

-- Persistence --

- [ ] Save player hand and grid token state to localStorage
- [ ] Load saved state on page refresh for consistent play sessions

-- Debug + Polish --

- [ ] Add a visual indicator for nearby/interactable cells
- [ ] Show token and grid debug info for testing
- [ ] Adjust grid density and radius for mobile comfort
- [ ] Basic UI styling pass for readability

-- Next Planned Steps --

- [ ] Finish implementing deterministic token generation and grid persistence
- [ ] Add player hand UI and nearby-cell interaction rules
- [ ] Test crafting logic and ensure merge rules follow 4096 pattern

-- D3.b: Globe-spanning Gameplay --

Key Technical Challenge:\
Implement global coordinate-based grid rendering with dynamic cell spawning and despawning as the player moves or pans across the map.

Key Gameplay Challenge:\
Allow players to travel across a near-infinite map, interacting only with nearby cells, while maintaining deterministic token generation and 4096-style crafting.

-- Steps --

-- Player Movement Simulation --

- [x] Add directional buttons (North, South, East, West) that move the player marker by one grid step (≈0.0001°)
- [x] Update interaction radius and nearby-cell highlighting to follow the new player position
- [x] Ensure map view recenters automatically after each movement step
- [x] Distinguish between player movement (via buttons) and manual map panning

-- Crafting and Victory Condition --

- [ ] Continue using 4096-style merge mechanics for tokens
- [ ] Set a new win condition requiring the player to craft a higher-value token (e.g., 32 or 64)
- [ ] Display a simple victory message or overlay when the target token is crafted

-- D3.c: UI and Feedback (placeholder) --
Will improve interface clarity, add merge animations, and visual polish.

-- D3.d: Polishing and Deployment (placeholder) --
Final bug fixes, performance tuning, and deployment automation.
