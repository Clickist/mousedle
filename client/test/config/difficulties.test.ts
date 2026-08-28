import { describe, expect, it } from 'vitest';
import { AVAILABLE_DIFFICULTIES, DIFFICULTIES } from '../../src/config/difficulties';

describe('difficulty config', () => {
  it('puts recommended easy first for lobby/leaderboard defaults', () => {
    expect(AVAILABLE_DIFFICULTIES.map((item) => item.key)).toEqual(['easy', 'normal', 'hard']);
    expect(AVAILABLE_DIFFICULTIES[0]?.recommended).toBe(true);
    expect(DIFFICULTIES.find((item) => item.key === 'easy')?.sortOrder).toBeLessThan(
      DIFFICULTIES.find((item) => item.key === 'normal')?.sortOrder ?? Infinity
    );
    expect(DIFFICULTIES.find((item) => item.key === 'normal')?.sortOrder).toBeLessThan(
      DIFFICULTIES.find((item) => item.key === 'hard')?.sortOrder ?? Infinity
    );
  });
});
