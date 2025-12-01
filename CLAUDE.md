# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server on port 3000
npm run build    # TypeScript check + production build
npm run preview  # Preview production build
```

No test suite is configured.

## Architecture

### Core Systems

**Game.ts** - Main orchestrator that wires together all systems:
- Creates and manages `GameState` (immutable state updates)
- Runs fixed-timestep game loop (60 updates/sec via `GameLoop.ts`)
- Routes input from `InputManager` to game logic
- Dispatches events from `EventBus` to audio/rendering
- Manages app phases: `menu` → `playing` → `gameOver`

**Event-Driven Architecture** - Game logic emits events, renderer/audio react:
- `EventBus` (pub/sub) in `src/core/types/events.ts`
- Events: `piece-spawn`, `piece-lock`, `lines-clear`, `level-up`, `game-over`, etc.
- Game.ts subscribes to events and triggers AudioManager/RenderPipeline effects

**State Management** - Immutable game state in `src/core/types/gameState.ts`:
- `GameState` contains board, active piece, score, phase, timers
- All updates return new state objects
- Modes: `classic`, `sprint`, `ultra`, `chaos`

### Rendering (PixiJS 8)

**RenderPipeline.ts** - Main renderer orchestrating layers:
- Background → Board → Pieces → UI → Effects → CRT filter
- Manages PixiJS Application lifecycle
- Contains countdown, game over overlays, name entry dialog

**Visual Systems** (each in `src/rendering/`):
- `CRTFilter` - Custom WebGL shader for retro CRT effect
- `SynthwaveBackground` - Animated neon grid
- `BoidSystem` - Ambient particle swarm
- `ParticleSystem` - Line clear/combo effects
- `ScreenEffects` - Shake, flash, transitions

### Audio

**Singleton Managers** (use `getAudioManager()` / `getMusicManager()`):
- `AudioManager` - Sound effects via Howler.js
- `MusicManager` - Background music with playlist, crossfade, special tracks

Music files go in `public/music/` with `playlist.json` manifest.

### Input

**InputManager.ts** - Keyboard handling with DAS/ARR:
- DAS (Delayed Auto Shift): 167ms before repeat
- ARR (Auto Repeat Rate): 33ms between repeats
- Queues trigger actions (rotate, hard drop) to prevent missed inputs

## Important Patterns

**Path Aliases** - Configured in both `tsconfig.json` and `vite.config.ts`:
```typescript
import { something } from '@core/types/gameState';  // src/core/...
import { something } from '@rendering/CRTFilter';   // src/rendering/...
```

**Base URL** - Vite configured with `base: '/Tetris/'` for GitHub Pages deployment. All asset paths must account for this (use `import.meta.env.BASE_URL`).

**GLSL Shaders** - Import `.glsl`, `.vert`, `.frag` files directly via vite-plugin-glsl.

**Tetromino Rotation** - Uses SRS (Super Rotation System) with wall kicks in `src/core/engine/Rotation.ts`.
