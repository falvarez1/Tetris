# Tetris VFX

A visually stunning Tetris-style game with advanced WebGL shader effects, synthwave aesthetics, and multiple game modes.

## Features

### Visual Effects
- **CRT Shader** - Authentic retro CRT monitor effect with scanlines, chromatic aberration, and screen curvature
- **Synthwave Background** - Animated neon grid with perspective and glow effects
- **Boid System** - Ambient particle swarm that reacts to gameplay
- **Particle Effects** - Line clear explosions, lock flash, and combo celebrations
- **Screen Effects** - Screen shake, flash effects, and smooth transitions

### Gameplay
- **Classic Tetris Mechanics** - Standard guideline-compliant rotation (SRS) with wall kicks
- **Ghost Piece** - Shows where the current piece will land
- **Hold System** - Store a piece for later use
- **Next Queue** - Preview upcoming pieces (5 pieces)
- **Scoring System** - Points for soft drops, hard drops, line clears, combos, T-Spins, and Back-to-Back bonuses
- **Perfect Clear** - Bonus points for clearing the entire board
- **Dynamic Difficulty** - Speed increases with level progression

### Game Modes
- **Classic** - Traditional endless Tetris with increasing speed
- **Sprint** - Clear 40 lines as fast as possible
- **Ultra** - Score as many points as possible in 3 minutes
- **Chaos** - Random events like gravity surges, wind gusts, board shake, blackouts, and garbage rain

### Audio
- **Background Music** - Playlist of tracks with shuffle and crossfade support
- **Dynamic Music Speed** - Music tempo increases as the stack gets higher
- **Special Tracks** - Dedicated music for menus and high score entry
- **Sound Effects** - Distinct sounds for moves, rotations, locks, line clears, and more

### Leaderboard
- **Local High Scores** - Persistent leaderboard stored in browser
- **Name Entry** - Enter your initials for the hall of fame
- **Per-Mode Rankings** - Separate leaderboards for each game mode

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/tetris-vfx.git
cd tetris-vfx

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Controls

### Movement
| Action | Keys |
|--------|------|
| Move Left | `Arrow Left` / `A` |
| Move Right | `Arrow Right` / `D` |
| Soft Drop | `Arrow Down` / `S` |
| Hard Drop | `Space` |

### Rotation
| Action | Keys |
|--------|------|
| Rotate Clockwise | `Arrow Up` / `X` |
| Rotate Counter-clockwise | `Z` / `Ctrl` |
| Rotate 180 | `W` |

### Other
| Action | Keys |
|--------|------|
| Hold Piece | `C` / `Shift` |
| Pause | `Escape` / `P` |
| Restart | `R` |
| Toggle CRT Effect | `F2` / `` ` `` |
| Toggle Debug Panel | `F3` |
| Toggle Music | `M` |
| Next Track | `N` |

## Adding Music

Place MP3 files in the `public/music/` folder and create a `playlist.json`:

```json
{
  "tracks": [
    "track1.mp3",
    "track2.mp3"
  ],
  "special": {
    "menu": "intro.mp3",
    "highScore": "high_score.mp3"
  }
}
```

## Tech Stack

- **TypeScript** - Type-safe game logic
- **PixiJS 8** - WebGL rendering engine
- **Vite** - Fast development and build tool
- **Howler.js** - Audio playback
- **Custom GLSL Shaders** - CRT and visual effects

## Project Structure

```
src/
├── audio/          # Music and sound effect managers
├── core/           # Game logic (board, collision, rotation, scoring)
│   ├── chaos/      # Chaos mode event system
│   ├── engine/     # Game loop and mechanics
│   └── types/      # TypeScript type definitions
├── input/          # Keyboard input handling with DAS/ARR
├── rendering/      # PixiJS rendering pipeline
│   ├── BoidSystem.ts
│   ├── CRTFilter.ts
│   ├── ParticleSystem.ts
│   ├── RenderPipeline.ts
│   ├── ScreenEffects.ts
│   └── SynthwaveBackground.ts
├── storage/        # Leaderboard persistence
├── ui/             # Menus, dialogs, and HUD
├── Game.ts         # Main game orchestrator
└── main.ts         # Entry point
```

## License

MIT
