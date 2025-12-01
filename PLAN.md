# Tetris VFX - Epic Polish Implementation Plan

## Selected Features (User Priority Order)

### 1. Game Flow & Menus
Create a polished main menu and game flow system.

**Implementation:**
- Create `src/ui/MainMenu.ts` - PixiJS-based menu with synthwave styling
  - Title screen with animated logo
  - Mode selection: Classic, Marathon, Chaos
  - Settings button
  - Leaderboard button (local storage)
- Create `src/ui/SettingsMenu.ts` - Audio/visual settings
  - Master volume slider
  - Music volume slider
  - SFX volume slider
  - CRT toggle
  - Key bindings display
- Create `src/ui/GameOverScreen.ts` - Enhanced game over with stats
  - Final score display
  - Lines cleared, level reached
  - Play again / Main menu buttons
- Update `src/Game.ts` - Add menu state management
  - New phases: 'menu', 'settings', 'playing', 'paused', 'gameOver'
  - Transition handling between states

### 2. Chaos Mode Events
Implement random chaos events that disrupt gameplay.

**Events to implement (in `src/core/chaos/`):**
1. **Gravity Surge** - Pieces fall 3x faster for 10 seconds
2. **Garbage Rain** - Random garbage lines rise from bottom
3. **Piece Freeze** - Current piece freezes for 2 seconds
4. **Board Shake** - Screen shakes violently, harder to see
5. **Blackout** - Board goes dark except for active piece
6. **Speed Flip** - Controls temporarily reversed
7. **Giant Piece** - Next piece is 2x size
8. **Clear Bonus** - All gray blocks clear instantly

**Implementation:**
- Create `src/core/chaos/ChaosManager.ts` - Event scheduler
  - Random event every 15-30 seconds
  - Event duration tracking
  - Visual/audio warnings before event
- Create `src/core/chaos/ChaosEvent.ts` - Base event interface
- Create individual event files for each chaos type
- Update `src/Game.ts` to integrate chaos system in chaos mode

### 3. Visual Polish
Enhance visual effects for more impact.

**Implementation:**
- Create `src/rendering/shaders/DissolveShader.ts` - Line clear dissolve
  - Particles break apart and float away
  - Color-matched to cleared blocks
- Update `src/rendering/ScreenEffects.ts` - Add transitions
  - Fade in/out between screens
  - Flash effects on events
- Update `src/rendering/ParticleSystem.ts` - More particle types
  - Sparkles on Tetris clear
  - Dust particles on hard drop
  - Glow trails on moving pieces
- Add screen wipe transitions for menu navigation

### 4. MP3 Background Music System
Allow user to drop MP3 files into a folder for background music.

**Implementation:**
- Create `public/music/` folder for MP3 files
- Create `src/audio/MusicManager.ts` - Background music handler
  - Scan/load MP3s from public/music folder
  - Shuffle playlist
  - Crossfade between tracks
  - Volume control (separate from SFX)
  - Pause/resume with game state
- Update `src/audio/AudioManager.ts` - Integrate music manager
- Add music controls to settings menu

**Usage:** User drops MP3 files into `public/music/` folder, game auto-loads them.

---

## Implementation Order

1. **MP3 Music System** (Quick win, user specifically requested)
2. **Main Menu** (Foundation for game flow)
3. **Visual Polish** (Enhances existing experience)
4. **Chaos Mode Events** (Most complex, builds on everything else)

## File Structure After Implementation

```
src/
├── audio/
│   ├── AudioManager.ts (existing)
│   └── MusicManager.ts (new)
├── core/
│   ├── chaos/
│   │   ├── ChaosManager.ts (new)
│   │   ├── ChaosEvent.ts (new)
│   │   └── events/ (new folder with event implementations)
│   └── ...
├── ui/
│   ├── DebugPanel.ts (existing)
│   ├── MainMenu.ts (new)
│   ├── SettingsMenu.ts (new)
│   └── GameOverScreen.ts (new)
├── rendering/
│   ├── shaders/
│   │   └── DissolveShader.ts (new)
│   └── ... (existing)
public/
└── music/ (new - user drops MP3s here)
```
