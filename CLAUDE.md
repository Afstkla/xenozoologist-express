# Xenozoologist Express

Vibe Jam 2026 entry. Multiplayer alien planet exploration game.

## Quick Reference

- **Dev:** `npm run dev` (runs server + client concurrently)
- **Build:** `npm run build` (builds client to client/dist/)
- **Test:** `npm test`
- **Server port:** 7755 (production), proxied from Vite at 5180 (dev)
- **PM2 name:** vibejam
- **Domain:** vibejam.afstkla.nl
- **Spec:** docs/superpowers/specs/2026-04-02-xenozoologist-express-design.md

## Architecture

- `server/` — Express backend: signaling (WebSocket), catalog API (REST), SQLite
- `client/src/` — Three.js game client, vanilla TypeScript
- Networking: WebRTC via PeerJS, one player hosts the game logic
- All procedural generation is deterministic from a seed, runs client-side

## Conventions

- No React — vanilla TypeScript + DOM manipulation for UI
- No textures — vertex colors and procedural geometry only
- Everything is procedural from a seed — terrain, creatures, flora, palettes
- PeerJS for WebRTC, ws for server WebSockets
- Express 5, better-sqlite3, tsx for server runtime
