import { beforeAll, describe, expect, it } from 'vitest';
import { initDb } from '../../src/db/init';
import { initRedis, redis, redisKey } from '../../src/redis';
import { getDifficultyPlayers, initPlayerCache } from '../../src/services/playerCache';
import { pickTargetAvoidingRecent, rememberTargetSelection } from '../../src/services/targetSelection';

beforeAll(async () => {
  await initDb();
  await initRedis();
  await initPlayerCache();
});

describe('target selection', () => {
  it('avoids recent targets across both multiplayer identities', async () => {
    const stamp = Date.now();
    const identities = [`g:target-a-${stamp}`, `g:target-b-${stamp}`];
    const pool = getDifficultyPlayers('hard');
    expect(pool.length).toBeGreaterThan(2);
    try {
      await rememberTargetSelection({ mode: 'hard', identities: [identities[0]], mouseId: pool[0].id, now: stamp });
      await rememberTargetSelection({ mode: 'hard', identities: [identities[1]], mouseId: pool[1].id, now: stamp + 1 });

      const selected = await pickTargetAvoidingRecent({ mode: 'hard', identities, now: stamp + 2 });

      expect(selected).not.toBeNull();
      expect([pool[0].id, pool[1].id]).not.toContain(selected!.id);
    } finally {
      await redis()?.del(identities.map((identity) => redisKey(`target-history:hard:${identity}`)));
    }
  });

  it('keeps match-local exclusions until the pool is exhausted', async () => {
    const pool = getDifficultyPlayers('hard');
    const remaining = pool.at(-1)!;
    const selected = await pickTargetAvoidingRecent({
      mode: 'hard',
      identities: [],
      hardExcludedIds: pool.slice(0, -1).map((player) => player.id),
    });
    expect(selected?.id).toBe(remaining.id);

    const fallback = await pickTargetAvoidingRecent({
      mode: 'hard',
      identities: [],
      hardExcludedIds: pool.map((player) => player.id),
    });
    expect(pool.map((player) => player.id)).toContain(fallback?.id);
  });

  it('bounds each Redis history and assigns an expiry', async () => {
    const identity = `g:target-bounded-${Date.now()}`;
    const key = redisKey(`target-history:hard:${identity}`);
    try {
      for (let index = 1; index <= 25; index += 1) {
        await rememberTargetSelection({ mode: 'hard', identities: [identity], mouseId: index, now: 1_000 + index });
      }
      expect(await redis()!.zCard(key)).toBe(20);
      expect(await redis()!.ttl(key)).toBeGreaterThan(0);
      expect(await redis()!.ttl(key)).toBeLessThanOrEqual(7_200);
    } finally {
      await redis()?.del(key);
    }
  });
});
