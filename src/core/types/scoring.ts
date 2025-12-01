/**
 * Scoring Types and Configuration
 */

/**
 * Types of line clears
 */
export type ClearType =
  | 'single'
  | 'double'
  | 'triple'
  | 'tetris'
  | 't-spin-mini'
  | 't-spin-single'
  | 't-spin-double'
  | 't-spin-triple'
  | 'perfect-clear';

/**
 * Score state
 */
export interface ScoreState {
  score: number;
  level: number;
  linesCleared: number;
  linesAtLevel: number;
  linesToNextLevel: number;
}

/**
 * Combo tracking state
 */
export interface ComboState {
  comboCount: number;        // Consecutive line clears
  backToBack: number;        // B2B difficult clears count
  backToBackActive: boolean; // Is B2B currently active
  perfectClears: number;     // Total perfect clears
}

/**
 * Streak/heat state for VFX intensity
 */
export interface StreakState {
  heatLevel: number;         // 0-1 normalized heat
  peakHeat: number;          // Max heat this session
  timeSinceLastClear: number;// ms since last clear
  recentClears: ClearEvent[];
}

/**
 * A line clear event
 */
export interface ClearEvent {
  type: ClearType;
  lines: number[];
  timestamp: number;
  backToBack: boolean;
  comboCount: number;
  points: number;
  heatContribution: number;
}

/**
 * Scoring configuration
 */
export interface ScoringConfig {
  basePoints: Record<ClearType, number>;
  softDropPoints: number;
  hardDropPoints: number;
  comboBonus: number;
  backToBackMultiplier: number;
  linesPerLevel: number;
  maxLevel: number;
}

/**
 * Default scoring configuration (guideline-style)
 */
export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  basePoints: {
    'single': 100,
    'double': 300,
    'triple': 500,
    'tetris': 800,
    't-spin-mini': 100,
    't-spin-single': 800,
    't-spin-double': 1200,
    't-spin-triple': 1600,
    'perfect-clear': 3000,
  },
  softDropPoints: 1,
  hardDropPoints: 2,
  comboBonus: 50,
  backToBackMultiplier: 1.5,
  linesPerLevel: 10,
  maxLevel: 15,
};

/**
 * Heat configuration for VFX intensity
 */
export interface HeatConfig {
  clearHeat: Record<ClearType, number>;
  comboMultiplier: number;
  backToBackMultiplier: number;
  decayPerSecond: number;
  maxHeat: number;
}

/**
 * Default heat configuration
 */
export const DEFAULT_HEAT_CONFIG: HeatConfig = {
  clearHeat: {
    'single': 0.08,
    'double': 0.15,
    'triple': 0.25,
    'tetris': 0.40,
    't-spin-mini': 0.20,
    't-spin-single': 0.30,
    't-spin-double': 0.45,
    't-spin-triple': 0.60,
    'perfect-clear': 0.80,
  },
  comboMultiplier: 0.05,
  backToBackMultiplier: 1.5,
  decayPerSecond: 0.08,
  maxHeat: 1.0,
};

/**
 * Heat level thresholds for VFX
 */
export const HEAT_THRESHOLDS = {
  cold: 0,
  warm: 0.25,
  hot: 0.5,
  fire: 0.75,
  inferno: 0.9,
} as const;

export type HeatLevel = keyof typeof HEAT_THRESHOLDS;

/**
 * Get heat level from heat value
 */
export function getHeatLevel(heat: number): HeatLevel {
  if (heat >= HEAT_THRESHOLDS.inferno) return 'inferno';
  if (heat >= HEAT_THRESHOLDS.fire) return 'fire';
  if (heat >= HEAT_THRESHOLDS.hot) return 'hot';
  if (heat >= HEAT_THRESHOLDS.warm) return 'warm';
  return 'cold';
}

/**
 * Calculate points for a clear
 */
export function calculateClearPoints(
  clearType: ClearType,
  level: number,
  comboCount: number,
  isBackToBack: boolean,
  config: ScoringConfig = DEFAULT_SCORING_CONFIG
): number {
  let points = config.basePoints[clearType] * level;

  // Combo bonus
  if (comboCount > 0) {
    points += config.comboBonus * comboCount * level;
  }

  // Back-to-back bonus (for tetrises and t-spins)
  if (isBackToBack) {
    points = Math.floor(points * config.backToBackMultiplier);
  }

  return points;
}

/**
 * Determine clear type from line count
 */
export function getClearType(lineCount: number, isTSpin: boolean = false, isMini: boolean = false): ClearType {
  if (isTSpin) {
    if (isMini) return 't-spin-mini';
    switch (lineCount) {
      case 1: return 't-spin-single';
      case 2: return 't-spin-double';
      case 3: return 't-spin-triple';
      default: return 't-spin-mini';
    }
  }

  switch (lineCount) {
    case 1: return 'single';
    case 2: return 'double';
    case 3: return 'triple';
    case 4: return 'tetris';
    default: return 'single';
  }
}

/**
 * Check if a clear type is "difficult" (for B2B tracking)
 */
export function isDifficultClear(clearType: ClearType): boolean {
  return clearType === 'tetris' || clearType.startsWith('t-spin');
}

/**
 * Calculate heat contribution from a clear
 */
export function calculateHeatContribution(
  clearType: ClearType,
  comboCount: number,
  isBackToBack: boolean,
  config: HeatConfig = DEFAULT_HEAT_CONFIG
): number {
  let heat = config.clearHeat[clearType];

  // Combo bonus
  heat += heat * config.comboMultiplier * comboCount;

  // B2B bonus
  if (isBackToBack) {
    heat *= config.backToBackMultiplier;
  }

  return Math.min(heat, config.maxHeat);
}

/**
 * Apply heat decay over time
 */
export function decayHeat(
  currentHeat: number,
  deltaMs: number,
  config: HeatConfig = DEFAULT_HEAT_CONFIG
): number {
  const decay = config.decayPerSecond * (deltaMs / 1000);
  return Math.max(0, currentHeat - decay);
}

/**
 * Create initial score state
 */
export function createScoreState(): ScoreState {
  return {
    score: 0,
    level: 1,
    linesCleared: 0,
    linesAtLevel: 0,
    linesToNextLevel: DEFAULT_SCORING_CONFIG.linesPerLevel,
  };
}

/**
 * Create initial combo state
 */
export function createComboState(): ComboState {
  return {
    comboCount: 0,
    backToBack: 0,
    backToBackActive: false,
    perfectClears: 0,
  };
}

/**
 * Create initial streak state
 */
export function createStreakState(): StreakState {
  return {
    heatLevel: 0,
    peakHeat: 0,
    timeSinceLastClear: 0,
    recentClears: [],
  };
}
