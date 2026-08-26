import type { Knex } from 'knex';
import { z } from 'zod';
import { db } from '../db/knex';
import { isKnownDifficultyKey } from '../difficulties';
import { HttpError } from '../middleware/common';
import { invalidatePlayerCache } from './playerCache';

const mouseShapes = ['对称', '人体工学', '非对称', '垂直'] as const;
const mouseSizes = ['小型', '中型', '大型', '指尖'] as const;
const difficultyKeySchema = z.string().trim().regex(/^[a-z0-9][a-z0-9_-]{0,31}$/);
const difficultyListSchema = z.array(difficultyKeySchema)
  .min(1)
  .max(20)
  .refine((keys) => new Set(keys).size === keys.length);

export const playerSchema = z.object({
  name: z.string().trim().min(1).max(96),
  brand: z.string().trim().min(1).max(64),
  country: z.string().trim().max(32).default(''),
  continent: z.string().trim().max(32).default(''),
  shape: z.enum(mouseShapes).default('对称'),
  size: z.enum(mouseSizes).default('中型'),
  weight: z.number().int().min(5).max(600),
  length_mm: z.number().int().min(40).max(200),
  side_buttons: z.number().int().min(0).max(20).default(2),
  wireless: z.boolean().default(true),
  is_enabled: z.boolean().default(true),
  difficulties: difficultyListSchema.optional(),
});

export const importedPlayerSchema = playerSchema.extend({
  is_enabled: z.boolean().optional(),
});

export const playerUpdateSchema = playerSchema.partial().strict()
  .refine((values) => Object.keys(values).length > 0);

export const playerImportSchema = z.object({
  players: z.array(importedPlayerSchema)
    .min(1)
    .max(2000)
    .refine((players) => new Set(players.map((player) => player.name)).size === players.length),
});

export type PlayerInput = z.infer<typeof playerSchema>;
export type PlayerUpdateInput = z.infer<typeof playerUpdateSchema>;
export type ImportedPlayerInput = z.infer<typeof importedPlayerSchema>;

export function assertDifficultyKeys(keys: string[]): void {
  const unique = [...new Set(keys)];
  if (unique.some((key) => !isKnownDifficultyKey(key))) {
    throw new HttpError(400, 'INVALID_DIFFICULTY');
  }
}

export async function replacePlayerDifficulties(
  executor: Knex | Knex.Transaction,
  mouseId: number,
  keys: string[]
): Promise<void> {
  const unique = [...new Set(keys)];
  await executor('mouse_difficulties').where({ mouse_id: mouseId }).del();
  if (unique.length) {
    await executor('mouse_difficulties').insert(
      unique.map((key) => ({ mouse_id: mouseId, difficulty_key: key }))
    );
  }
}

export async function createPlayer(input: PlayerInput): Promise<number> {
  const exists = await db('mice').where({ name: input.name }).first('id');
  if (exists) throw new HttpError(409, 'NICKNAME_TAKEN');
  const difficulties = input.difficulties ?? ['normal'];
  assertDifficultyKeys(difficulties);
  const { difficulties: _difficulties, ...values } = input;
  const id = await db.transaction(async (trx) => {
    const [createdId] = await trx('mice')
      .insert(values)
      .returning('id')
      .then((rows) => rows.map((row: unknown) => (
        typeof row === 'object' && row !== null && 'id' in row ? row.id : row
      )));
    const mouseId = Number(createdId);
    await replacePlayerDifficulties(trx, mouseId, difficulties);
    return mouseId;
  });
  await invalidatePlayerCache();
  return id;
}

export async function updatePlayer(id: number, input: PlayerUpdateInput): Promise<void> {
  await db.transaction(async (trx) => {
    const exists = await trx('mice').where({ id }).first('id');
    if (!exists) throw new HttpError(404, 'PLAYER_NOT_FOUND');
    await applyPlayerUpdate(trx, id, input);
  });
  await invalidatePlayerCache();
}

export async function applyPlayerUpdate(
  executor: Knex | Knex.Transaction,
  id: number,
  input: PlayerUpdateInput
): Promise<void> {
  const { difficulties, ...values } = input;
  if (difficulties) assertDifficultyKeys(difficulties);
  if (Object.keys(values).length) await executor('mice').where({ id }).update(values);
  if (difficulties) await replacePlayerDifficulties(executor, id, difficulties);
}

export async function deletePlayer(id: number): Promise<void> {
  const player = await db('mice').where({ id }).first('id', 'is_enabled');
  if (!player) throw new HttpError(404, 'PLAYER_NOT_FOUND');
  if (Boolean(player.is_enabled)) throw new HttpError(409, 'PLAYER_MUST_BE_DISABLED');
  const [usedInGame, usedInDailyChallenge] = await Promise.all([
    db('games').where({ target_mouse_id: id }).first('id'),
    db('daily_challenges').where({ target_mouse_id: id }).first('id'),
  ]);
  if (usedInGame || usedInDailyChallenge) throw new HttpError(409, 'PLAYER_HAS_HISTORY');
  const count = await db('mice').where({ id }).del();
  if (!count) throw new HttpError(404, 'PLAYER_NOT_FOUND');
  await invalidatePlayerCache();
}

export async function importPlayers(
  players: ImportedPlayerInput[]
): Promise<{ created: number; updated: number }> {
  let created = 0;
  let updated = 0;
  await db.transaction(async (trx) => {
    const nicknames = players.map((player) => player.name);
    const existing = await trx('mice')
      .whereIn('name', nicknames)
      .select('id', 'name', 'is_enabled');
    const existingNames = new Set(existing.map((player) => String(player.name)));
    const existingEnabled = new Map(
      existing.map((player) => [String(player.name), Boolean(player.is_enabled)])
    );
    updated = players.filter((player) => existingNames.has(player.name)).length;
    created = players.length - updated;
    const desiredDifficulties = new Map<string, string[] | null>();
    const importedPlayers = players.map((player) => {
      const { difficulties, ...values } = player;
      const desired = difficulties ?? (existingNames.has(player.name) ? null : ['normal']);
      desiredDifficulties.set(player.name, desired);
      return {
        ...values,
        is_enabled: player.is_enabled ?? existingEnabled.get(player.name) ?? true,
      };
    });
    assertDifficultyKeys([...new Set(
      [...desiredDifficulties.values()].flatMap((keys) => keys ?? [])
    )]);
    const chunkSize = 200;
    for (let index = 0; index < importedPlayers.length; index += chunkSize) {
      await trx('mice')
        .insert(importedPlayers.slice(index, index + chunkSize))
        .onConflict('name')
        .merge();
    }
    const savedPlayers = await trx('mice')
      .whereIn('name', nicknames)
      .select('id', 'name');
    const replacementIds: number[] = [];
    const replacementMemberships: Array<{ mouse_id: number; difficulty_key: string }> = [];
    for (const player of savedPlayers) {
      const difficulties = desiredDifficulties.get(String(player.name));
      if (!difficulties) continue;
      const mouseId = Number(player.id);
      replacementIds.push(mouseId);
      replacementMemberships.push(
        ...[...new Set(difficulties)].map((difficultyKey) => ({
          mouse_id: mouseId,
          difficulty_key: difficultyKey,
        }))
      );
    }
    if (replacementIds.length) {
      await trx('mouse_difficulties').whereIn('mouse_id', replacementIds).del();
      for (let index = 0; index < replacementMemberships.length; index += 500) {
        await trx('mouse_difficulties').insert(replacementMemberships.slice(index, index + 500));
      }
    }
  });
  await invalidatePlayerCache();
  return { created, updated };
}
