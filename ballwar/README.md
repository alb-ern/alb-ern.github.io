# Ball VS Ball — Web Arena Edition

A 1v1 & 2v2 physics arena auto-battler web version inspired by Roblox **Ball VS Ball** (ATYS 3) and viral physics reels, featuring **100 unlocked iconic contenders** (including **Verity Ball**, **Duplicator Ball**, **Doubler Ball**, **Mach Ball**, **Titan Ball**, **Hydra Ball**, **Mirror Ball**, **Portal Ball**, **Omega Ball**, and more).

## Features

- **1v1 Classic (`600×600`) & 2v2 Teams (`740×740` Bigger Arena)**: Switch seamlessly between 1v1 duels and 2v2 duo brawls across VS Bot, Online P2P, Local 2-Player, and Sandbox! Teammates bounce cleanly with zero friendly fire and individual per-ball tuning attribution.
- **VS Bot (1v1 / 2v2)**: Best-of-3 Hearts matches with 3-card random Drafts (2 free Rerolls + All Balls picker), interactive Lock Aim trajectories, and tactical Bot opponents.
- **Online Multiplayer (WebRTC P2P)**: Serverless PeerJS room codes and shareable `?room=CODE` invite links — Best-of-3 Hearts Draft mode supporting both 1v1 and 2v2 with host-authoritative 60Hz simulation and 30Hz state snapshots. Works over localhost, LAN, Tailscale, or GitHub Pages.
- **Local 2-Player**: Same-device pass-and-play with secret Drafts and hidden Lock Aim shields.
- **Sandbox Lab (1v1 / 2v2)**: Pick any ball or 2v2 duo directly (including **Duplicator vs Titan**, **Mach vs Gravity**, and **Verity vs Spider** presets), configure Hearts & Sudden Death timing, or run 10 instant simulations.
- **Ball Dex**: Browse all 100 balls filtered by rarity (`Rare`, `Epic`, `Legendary`, `Mythic`, `Exclusive`) or keyword.
- **Zero-Asset Web Audio SFX & Procedural 2D Canvas Art**: Instant play with zero build tools required.

## Running Locally & Network Play

From `/home/alperen/Documents/project/ballwar`:

```bash
python3 -m http.server 8080 --bind 0.0.0.0
```

- **Localhost**: [http://localhost:8080](http://localhost:8080)
- **Live GitHub Pages**: [https://alb-ern.github.io/ballwar/](https://alb-ern.github.io/ballwar/)

## Controls

- **Draft Phase**: Click one of the 3 random ball cards (or use **Reroll** / **All Balls**). In 2v2 mode, draft your 1st ball and 2nd teammate back-to-back.
- **Lock Aim Phase**: Drag inside the arena, use `A` / `D` or `←` / `→` to adjust angle, and press **LOCK AIM** (`Space` / `Enter`) to launch. In 2v2, switch between Ball #1 and Ball #2 via the UI buttons, `1`/`2`/`Tab`, or by clicking directly near either friendly ball.
- **Combat Phase**: Balls bounce and trigger abilities autonomously until all opponents fall and one side loses all 3 Hearts!

## Verification & Auto-Balancing

Run the headless physics, ability, and P2P protocol test suite with GNOME JavaScript (`gjs`):

```bash
gjs -m tests/sim.test.mjs
```

Run the re-runnable all-pairs 10-match auto-balancer (keeps 100 HP standard with `Cell` at 15 HP, `Berserker` self-burn at 135 HP, and `Micro` at 80 HP; nerfs balls beating `>70%` of opponents, buffs weak balls via `dmgMult`, and saves multipliers to `src/sim/balanceTuning.js`):

```bash
gjs -m scripts/balance.mjs          # Run 1 pass (all 4,950 pairs x 10 matches) & tune
gjs -m scripts/balance.mjs --auto   # Iterate automatically up to 15 passes until balanced
gjs -m scripts/balance.mjs --dry-run # Inspect win rates without writing balanceTuning.js
gjs -m scripts/balance.mjs --reset  # Reset all ball multipliers to 1.0
```

