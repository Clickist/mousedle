export const DIFFICULTY_LEVELS = [
  { key: 'easy', sortOrder: 5, isEnabled: true },
  { key: 'normal', sortOrder: 10, isEnabled: true },
  { key: 'hard', sortOrder: 20, isEnabled: true },
] as const;

const DIFFICULTY_KEYS = new Set<string>(DIFFICULTY_LEVELS.map((difficulty) => difficulty.key));

export function isKnownDifficultyKey(key: string): boolean {
  return DIFFICULTY_KEYS.has(key);
}
