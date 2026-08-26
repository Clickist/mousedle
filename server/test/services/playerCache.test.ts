import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { initRedis, redis, redisKey } from '../../src/redis';
import { db } from '../../src/db/knex';
import { ensureSchema } from '../../src/db/schema';
import {
  getPublicPlayerList,
  isDifficultyAvailable,
  invalidatePlayerCache,
  pickCachedTarget,
  refreshPlayerCache,
} from '../../src/services/playerCache';

beforeAll(async () => {
  await ensureSchema();
  await initRedis();
});

afterAll(async () => {
  await db('mice').whereLike('name', 'cache-test-%').del();
});

describe('player cache invalidation', () => {
  it('removes a disabled player before invalidation returns and changes the list version', async () => {
    const name = `cache-test-${Date.now()}`;
    const [row] = await db('mice').insert({
      name,
      country: '测试',
      brand: '测试',
      weight: 26,
      length_mm: 0,
      side_buttons: 0,
      wireless: true,
      is_enabled: true,
    }).returning('id');
    const id = typeof row === 'object' ? row.id : row;

    await refreshPlayerCache();
    const before = await getPublicPlayerList();
    expect(before.players).toContainEqual({ id, name });

    await db('mice').where({ id }).update({ is_enabled: false });
    await invalidatePlayerCache();

    const after = await getPublicPlayerList();
    expect(after.version).not.toBe(before.version);
    expect(after.players).not.toContainEqual({ id, name });
  });

  it('refreshes a stale instance before serving the public list', async () => {
    const name = `cache-test-cross-instance-${Date.now()}`;
    const [row] = await db('mice').insert({
      name,
      country: '测试',
      brand: '测试',
      weight: 26,
      length_mm: 0,
      side_buttons: 0,
      wireless: true,
      is_enabled: true,
    }).returning('id');
    const id = typeof row === 'object' ? row.id : row;

    await refreshPlayerCache();
    expect((await getPublicPlayerList()).players).toContainEqual({ id, name });

    await db('mice').where({ id }).update({ is_enabled: false });
    await redis()!.incr(redisKey('players:revision'));

    expect((await getPublicPlayerList()).players).not.toContainEqual({ id, name });
  });

  it('serves targets from the beginner difficulty pool', async () => {
    const name = `cache-test-beginner-${Date.now()}`;
    const [row] = await db('mice').insert({
      name,
      country: '测试',
      brand: '测试',
      weight: 26,
      length_mm: 1,
      side_buttons: 1,
      wireless: true,
      is_enabled: true,
    }).returning('id');
    const id = typeof row === 'object' ? row.id : row;
    await db('mouse_difficulties').insert({ mouse_id: id, difficulty_key: 'beginner' });

    await refreshPlayerCache();

    expect(isDifficultyAvailable('beginner')).toBe(true);
    expect(pickCachedTarget('beginner')?.difficulties).toContain('beginner');
  });
});
