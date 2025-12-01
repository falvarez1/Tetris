/**
 * Tetris VFX - Entry Point
 */

import { Game } from './Game';

// Global game instance
let game: Game | null = null;

/**
 * Initialize and start the game
 */
async function main(): Promise<void> {
  const container = document.getElementById('game-container');

  if (!container) {
    console.error('Game container not found!');
    return;
  }

  try {
    // Create game instance
    game = new Game({
      container,
      mode: 'classic',
    });

    // Initialize (will show main menu)
    await game.init(container);

    console.log('Tetris VFX initialized successfully!');
    console.log('Select a game mode from the menu to start playing!');
  } catch (error) {
    console.error('Failed to initialize game:', error);
  }
}

// Handle window resize
window.addEventListener('resize', () => {
  // Renderer handles resize internally
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  game?.destroy();
});

// Start the game when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
