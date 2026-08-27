import type { Knex } from 'knex';

const LEGACY_GAMEPLAY_TABLES = [
  'player_change_items',
  'player_change_submissions',
  'mouse_change_items',
  'mouse_change_submissions',
  'daily_challenge_attempts',
  'daily_challenges',
  'match_reports',
  'match_players',
  'match_records',
  'games',
  'player_difficulties',
  'players',
] as const;

export async function clearLegacyPlayerSchema(instance: Knex): Promise<boolean> {
  if (!(await instance.schema.hasTable('players'))) return false;
  if (await instance.schema.hasTable('mice')) {
    throw new Error('DATABASE_LEGACY_SCHEMA_CONFLICT');
  }

  await instance.transaction(async (trx) => {
    for (const table of LEGACY_GAMEPLAY_TABLES) {
      if (await trx.schema.hasTable(table)) await trx.schema.dropTable(table);
    }
  });
  return true;
}
