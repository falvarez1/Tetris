/**
 * Leaderboard Storage
 * Manages high score persistence using localStorage
 * Separate leaderboards per game mode
 */

import { GameModeType } from '../core/types/gameState';

/**
 * Single leaderboard entry
 */
export interface LeaderboardEntry {
  name: string;
  score: number;
  level: number;
  lines: number;
  mode: string;
  date: string;
}

/**
 * Stored leaderboard data structure
 */
interface LeaderboardData {
  version: number;
  entries: Record<string, LeaderboardEntry[]>; // mode -> entries
}

const STORAGE_KEY = 'tetris_leaderboard_v1';
const MAX_ENTRIES_PER_MODE = 10;
const CURRENT_VERSION = 1;

/**
 * Leaderboard manager class
 */
export class Leaderboard {
  private data: LeaderboardData;

  constructor() {
    this.data = this.load();
  }

  /**
   * Load leaderboard from localStorage
   */
  private load(): LeaderboardData {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as LeaderboardData;
        if (parsed.version === CURRENT_VERSION) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to load leaderboard:', e);
    }

    // Return empty leaderboard
    return {
      version: CURRENT_VERSION,
      entries: {},
    };
  }

  /**
   * Save leaderboard to localStorage
   */
  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.warn('Failed to save leaderboard:', e);
    }
  }

  /**
   * Get entries for a specific mode
   */
  getEntries(mode: GameModeType | string): LeaderboardEntry[] {
    return this.data.entries[mode] || [];
  }

  /**
   * Get all entries across all modes
   */
  getAllEntries(): LeaderboardEntry[] {
    const all: LeaderboardEntry[] = [];
    for (const mode of Object.keys(this.data.entries)) {
      all.push(...this.data.entries[mode]);
    }
    return all.sort((a, b) => b.score - a.score);
  }

  /**
   * Check if a score qualifies for the leaderboard
   */
  qualifiesForLeaderboard(score: number, mode: GameModeType | string): boolean {
    if (score <= 0) return false;

    const entries = this.getEntries(mode);

    // Always qualifies if less than max entries
    if (entries.length < MAX_ENTRIES_PER_MODE) {
      return true;
    }

    // Qualifies if score is higher than the lowest entry
    const lowestScore = entries[entries.length - 1]?.score || 0;
    return score > lowestScore;
  }

  /**
   * Get the rank a score would have (1-indexed)
   * Returns -1 if doesn't qualify
   */
  getRank(score: number, mode: GameModeType | string): number {
    if (!this.qualifiesForLeaderboard(score, mode)) {
      return -1;
    }

    const entries = this.getEntries(mode);
    for (let i = 0; i < entries.length; i++) {
      if (score > entries[i].score) {
        return i + 1;
      }
    }
    return entries.length + 1;
  }

  /**
   * Add a new entry to the leaderboard
   * Returns true if the entry was added (qualified)
   */
  addEntry(entry: LeaderboardEntry): boolean {
    const mode = entry.mode;

    if (!this.qualifiesForLeaderboard(entry.score, mode)) {
      return false;
    }

    // Ensure mode array exists
    if (!this.data.entries[mode]) {
      this.data.entries[mode] = [];
    }

    // Add and sort entries
    this.data.entries[mode].push(entry);
    this.data.entries[mode].sort((a, b) => b.score - a.score);

    // Trim to max entries
    if (this.data.entries[mode].length > MAX_ENTRIES_PER_MODE) {
      this.data.entries[mode] = this.data.entries[mode].slice(0, MAX_ENTRIES_PER_MODE);
    }

    this.save();
    return true;
  }

  /**
   * Create a new entry object
   */
  createEntry(
    name: string,
    score: number,
    level: number,
    lines: number,
    mode: GameModeType | string
  ): LeaderboardEntry {
    return {
      name: name.toUpperCase().slice(0, 3).padEnd(3, ' '),
      score,
      level,
      lines,
      mode,
      date: new Date().toISOString(),
    };
  }

  /**
   * Clear all entries for a mode
   */
  clearMode(mode: GameModeType | string): void {
    delete this.data.entries[mode];
    this.save();
  }

  /**
   * Clear all leaderboard data
   */
  clearAll(): void {
    this.data.entries = {};
    this.save();
  }

  /**
   * Get the number of entries for a mode
   */
  getEntryCount(mode: GameModeType | string): number {
    return this.getEntries(mode).length;
  }

  /**
   * Check if leaderboard has any entries
   */
  hasEntries(mode?: GameModeType | string): boolean {
    if (mode) {
      return this.getEntryCount(mode) > 0;
    }
    return Object.keys(this.data.entries).length > 0;
  }
}

// Singleton instance
let leaderboardInstance: Leaderboard | null = null;

/**
 * Get the leaderboard singleton
 */
export function getLeaderboard(): Leaderboard {
  if (!leaderboardInstance) {
    leaderboardInstance = new Leaderboard();
  }
  return leaderboardInstance;
}
