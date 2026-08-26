import knex from 'knex';
import { afterEach, describe, expect, it } from 'vitest';
import { ensureSchema } from '../../src/db/schema';
import { insertMissingSeedMice } from '../../src/db/seedMice';
import miceData from '../../src/db/seeds/mice.json';

const instances: ReturnType<typeof knex>[] = [];

afterEach(async () => {
  await Promise.all(instances.splice(0).map((instance) => instance.destroy()));
});

describe('baseline mice seeds', () => {
  it('inserts every seed mouse with difficulty memberships, idempotently', async () => {
    const instance = knex({
      client: 'better-sqlite3',
      connection: { filename: ':memory:' },
      useNullAsDefault: true,
    });
    instances.push(instance);
    await ensureSchema(instance);

    const expected = (miceData as unknown[]).length;
    expect(await insertMissingSeedMice(instance)).toBe(expected);
    expect(await insertMissingSeedMice(instance)).toBe(0);
    expect(Number((await instance('mice').count({ count: '*' }).first())?.count)).toBe(expected);

    const gpx = await instance('mice').where({ name: 'Logitech G Pro X Superlight 2' }).first('id');
    expect(gpx).toBeTruthy();
    expect(await instance('mouse_difficulties')
      .where({ mouse_id: gpx.id })
      .orderBy('difficulty_key')
      .pluck('difficulty_key'))
      .toEqual(['beginner', 'easy', 'normal']);
  });
});
