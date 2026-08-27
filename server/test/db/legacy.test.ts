import knex from 'knex';
import { afterEach, describe, expect, it } from 'vitest';
import { clearLegacyPlayerSchema } from '../../src/db/legacy';

const instances: ReturnType<typeof knex>[] = [];

afterEach(async () => {
  await Promise.all(instances.splice(0).map((instance) => instance.destroy()));
});

describe('legacy player schema cleanup', () => {
  it('removes old gameplay tables while preserving shared account data', async () => {
    const instance = knex({ client: 'better-sqlite3', connection: { filename: ':memory:' }, useNullAsDefault: true });
    instances.push(instance);
    await instance.schema.createTable('users', (table) => {
      table.increments('id').primary();
      table.string('username').notNullable();
    });
    await instance.schema.createTable('players', (table) => {
      table.increments('id').primary();
      table.string('nickname').notNullable();
    });
    await instance.schema.createTable('games', (table) => {
      table.increments('id').primary();
      table.integer('target_player_id');
    });
    await instance('users').insert({ username: 'keep-me' });
    await instance('players').insert({ nickname: 'old-player' });
    await instance('games').insert({ target_player_id: 1 });

    expect(await clearLegacyPlayerSchema(instance)).toBe(true);
    expect(await instance.schema.hasTable('players')).toBe(false);
    expect(await instance.schema.hasTable('games')).toBe(false);
    expect(await instance('users').pluck('username')).toEqual(['keep-me']);
    expect(await clearLegacyPlayerSchema(instance)).toBe(false);
  });

  it('rejects a mixed legacy and current schema instead of deleting data', async () => {
    const instance = knex({ client: 'better-sqlite3', connection: { filename: ':memory:' }, useNullAsDefault: true });
    instances.push(instance);
    await instance.schema.createTable('players', (table) => table.increments('id').primary());
    await instance.schema.createTable('mice', (table) => table.increments('id').primary());

    await expect(clearLegacyPlayerSchema(instance)).rejects.toThrow('DATABASE_LEGACY_SCHEMA_CONFLICT');
    expect(await instance.schema.hasTable('players')).toBe(true);
  });
});
