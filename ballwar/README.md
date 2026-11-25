# Ball VS Ball — Web Arena Edition

A 1v1 & 2v2 physics arena auto-battler web version inspired by Roblox **Ball VS Ball** (ATYS 3) and viral physics reels, featuring **120 unlocked iconic & meme contenders** (including **Hydrogen Bomb Ball**, **Coughing Baby Ball**, **Piñata Ball**, **Claude Ball**, **ChatGPT Ball**, **Gemini Ball**, **Hypergamy Ball**, **Israel Ball**, **Dondurma Ball**, **Doner Kebab Ball**, **Aura Ball**, **Nokia 3310 Ball**, **Impostor Ball**, **Brainrot Ball**, **Verity Ball**, **Duplicator Ball**, **Omega Ball**, and more).

## Features

- **Roguelike Gauntlet Tower (10 Boss Floors + 12 Stacking Run Relics)**: Single-player PvE tower climb with 3 Run Hearts, escalating enemies, 2v2 Boss Arenas on **Floor 5 (H-Bomb & Coughing Baby)**, **Floor 8 (Claude & Gemini)**, and **Floor 10 (Omega & Aura)**, and a 3-choice **Run Relic Draft** after every clear (e.g., *Overclocked Walls*, *Vampiric Core*, *Second Wind*, *Glass Cannon*, *Boss Slayer*, *Spark Magnet*). Relics apply strictly inside Gauntlet PvE — Online P2P & Quickmatch stay 100% fair!
- **Per-Ball Mastery (`Lv 1–5`)**: Earn Mastery XP on every ball you play across all modes to unlock strictly cosmetic **Bronze / Silver / Gold Crown / Neon Halo / Cosmic Ω** prestige rings, floating crowns, and orbiting starlight motes directly in the arena and Ball Dex.
- **Rank Ladder, Rotating Bounties & Cosmetic Armory**: Climb 6 Trophy tiers (**Bronze → Silver → Gold → Platinum → Diamond → Omega**), complete 3 rotating Bounties for **Sparks (✨)** & XP, unlock **6 Arena Themes** (*Classic Slate, Neon Cyber, Volcano Core, Notebook Doodle, Matrix Grid, Cosmic Omega*) and **6 Ball Trails** (*Classic, Flame, Rainbow, Glitch, Gold Dust, Void Lightning*), and back up progress via Base64 Save Codes (`localStorage`).
- **1v1 Classic (`600×600`) & 2v2 Teams (`740×740` Bigger Arena)**: Direct 1-click launch buttons on Lobby for 1v1 or 2v2 across **VS Bot**, **Local Pass & Play (`2P` / `4P`)**, **Online P2P (`2P` / `4P`)**, and **Sandbox**! Teammates bounce cleanly with zero friendly fire and per-ball tuning attribution.
- **VS Bot (1v1 / 2v2)**: Best-of-3 Hearts matches with 3-card random Drafts (2 free Rerolls + All Balls picker), interactive Lock Aim trajectories, and tactical Bot opponents.
- **Online Multiplayer (WebRTC P2P — Quickmatch 1v1 + Private 2P/4P Rooms)**: Tap **Quickmatch (1v1)** to match automatically with the next searching player (client-hosted via PeerJS queues), or create shareable `?room=CODE` links for 2-player 1v1 and 4-player 2v2 matches. Works over localhost, LAN, Tailscale, or GitHub Pages.
- **Local Pass & Play (2P 1v1 & 4P 2v2)**: Same-device pass-and-play with secret Drafts and hidden Lock Aim shields for 2 players (1v1) or 4 players (`P1 Blue #1` → `P2 Blue #2` → `P3 Red #1` → `P4 Red #2` in 2v2).
- **Sandbox Lab (1v1 / 2v2)**: Live search input bars for Blue & Red teams to filter all 120 balls, presets (including **H-Bomb vs Baby**), configurable Hearts & Sudden Death (`30s` default shrink), and 10-match instant simulator.
- **Ball Dex**: Browse all 120 balls filtered by rarity (`Rare`, `Epic`, `Legendary`, `Mythic`, `Exclusive`) or keyword, complete with Mastery badges.
- **Zero-Asset Web Audio SFX & Procedural 2D Canvas Art**: Instant play with zero build tools required.

## Running Locally & Network Play

From `/home/alperen/Documents/project/ballwar`:

```bash
python3 -m http.server 8080 --bind 0.0.0.0
```

- **Localhost**: [http://localhost:8080](http://localhost:8080)
- **Live GitHub Pages**: [https://alb-ern.github.io/ballwar/](https://alb-ern.github.io/ballwar/)

## Controls

- **Draft Phase**: Click one of the 3 random ball cards (or use **Reroll** / **All Balls**). In **VS Bot 2v2**, you draft both Blue teammates back-to-back; in **Local 2v2 (4P)** and **Online 2v2 (4P)**, each of the 4 players drafts their own ball individually.
- **Lock Aim Phase**: Drag inside the arena, use `A` / `D` or `←` / `→` to adjust angle, and press **LOCK AIM** (`Space` / `Enter`) to launch. In **VS Bot / Sandbox 2v2**, switch between Ball #1 and Ball #2 via the UI buttons, `1`/`2`/`Tab`, or by clicking directly near either friendly ball; in **Local / Online 2v2 (4P)**, each player aims only their assigned seat's ball.
- **Combat Phase**: Balls bounce and trigger abilities autonomously (walls begin shrinking at **30s Sudden Death**) until all opponents fall and one side loses all 3 Hearts!

## Verification & Auto-Balancing

Run the headless physics, ability, and P2P protocol test suite with GNOME JavaScript (`gjs`):

```bash
gjs -m tests/sim.test.mjs
```

Run the fast symmetric ring-tournament auto-balancer across all 120 balls (keeps 100 HP standard with `Cell` at 15 HP, `Coughing Baby` at 55 HP, `Micro` at 70 HP, and `Berserker` self-burn at 135 HP; saves multipliers to `src/sim/balanceTuning.js`):

```bash
gjs -m scripts/balance.mjs          # Run 1 fast pass (24 sampled opponents/ball x 4 matches) & tune
gjs -m scripts/balance.mjs --auto   # Run up to 6 fast passes (~90s total)
gjs -m scripts/balance.mjs --dry-run # Inspect win rates without writing balanceTuning.js
gjs -m scripts/balance.mjs --reset  # Reset all ball multipliers to 1.0
```

