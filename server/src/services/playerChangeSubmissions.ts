import { z } from 'zod';
import { db } from '../db/knex';
import { HttpError } from '../middleware/common';
import {
  applyPlayerUpdate,
  assertDifficultyKeys,
  playerUpdateSchema,
  type PlayerUpdateInput,
} from './playerMutations';
import { invalidatePlayerCache } from './playerCache';

export const playerChangeSubmissionSchema = z.object({
  players: z.array(z.object({
    mouseId: z.coerce.number().int().positive().optional(),
    name: z.string().trim().min(1).max(64).optional(),
    changes: playerUpdateSchema,
  }).strict().refine((value) => value.mouseId !== undefined || value.name !== undefined, {
    message: 'PLAYER_TARGET_REQUIRED',
  })).min(1).max(100),
}).strict();

export type PlayerChangeSubmissionInput = z.infer<typeof playerChangeSubmissionSchema>;
export type PlayerChangeStatus = 'pending' | 'approved' | 'rejected' | 'conflict';

const fields = [
  'name',
  'country',
  'continent',
  'brand',
  'shape',
  'size',
  'weight',
  'length_mm',
  'side_buttons',
  'wireless',
  'is_enabled',
  'difficulties',
] as const;
type PlayerChangeField = typeof fields[number];

function jsonValue(value: unknown): string {
  return JSON.stringify(value === undefined ? null : value);
}

function parseJsonValue(value: unknown): unknown {
  try {
    return JSON.parse(String(value));
  } catch {
    return null;
  }
}

function canonical(field: PlayerChangeField, value: unknown): unknown {
  if (field === 'difficulties') {
    return [...new Set(Array.isArray(value) ? value.map(String) : [])].sort();
  }
  if (['wireless', 'is_enabled'].includes(field)) return Boolean(value);
  if (['weight', 'length_mm', 'side_buttons'].includes(field)) return Number(value);
  return String(value ?? '');
}

function currentValue(field: PlayerChangeField, player: Record<string, unknown>, difficulties: string[]): unknown {
  return field === 'difficulties' ? difficulties : player[field];
}

function idFromReturning(value: unknown): number {
  if (typeof value === 'object' && value !== null && 'id' in value) return Number((value as { id: unknown }).id);
  return Number(value);
}

export async function createPlayerChangeSubmission(
  input: PlayerChangeSubmissionInput,
  apiToken: { id: number; name: string }
): Promise<{ submissionId: number | null; submitted: number; unchanged: number }> {
  let unchanged = 0;
  const result = await db.transaction(async (trx) => {
    const ids = input.players.flatMap((entry) => entry.mouseId === undefined ? [] : [entry.mouseId]);
    const names = input.players.flatMap((entry) => entry.name === undefined ? [] : [entry.name]);
    const rows = await trx('mice').where((query) => {
      if (ids.length) query.whereIn('id', ids);
      if (names.length) {
        if (ids.length) query.orWhereIn('name', names);
        else query.whereIn('name', names);
      }
    }).select(
      'id', 'name', 'brand', 'country', 'continent', 'shape', 'size', 'weight',
      'length_mm', 'side_buttons', 'wireless', 'is_enabled'
    );
    const byId = new Map(rows.map((row) => [Number(row.id), row]));
    const byName = new Map(rows.map((row) => [String(row.name), row]));
    const targetIds = new Set<number>();
    const resolved = input.players.map((entry) => {
      if (entry.changes.difficulties) assertDifficultyKeys(entry.changes.difficulties);
      const rowById = entry.mouseId === undefined ? undefined : byId.get(entry.mouseId);
      const rowByName = entry.name === undefined ? undefined : byName.get(entry.name);
      if (!rowById && !rowByName) throw new HttpError(404, 'PLAYER_NOT_FOUND');
      if (
        (entry.mouseId !== undefined && entry.name !== undefined && (!rowById || !rowByName))
        || (rowById && rowByName && Number(rowById.id) !== Number(rowByName.id))
      ) {
        throw new HttpError(400, 'PLAYER_TARGET_MISMATCH');
      }
      const row = rowById ?? rowByName!;
      const id = Number(row.id);
      if (targetIds.has(id)) throw new HttpError(400, 'DUPLICATE_PLAYER_CHANGE_TARGET');
      targetIds.add(id);
      return { entry, row };
    });
    const memberships = await trx('mouse_difficulties')
      .whereIn('mouse_id', [...targetIds])
      .select('mouse_id', 'difficulty_key');
    const difficultiesByPlayer = new Map<number, string[]>();
    for (const membership of memberships) {
      const list = difficultiesByPlayer.get(Number(membership.mouse_id)) ?? [];
      list.push(String(membership.difficulty_key));
      difficultiesByPlayer.set(Number(membership.mouse_id), list);
    }
    const items: Array<Record<string, unknown>> = [];
    for (const { entry, row } of resolved) {
      for (const field of fields) {
        if (!(field in entry.changes)) continue;
        const oldValue = canonical(field, currentValue(field, row as Record<string, unknown>, difficultiesByPlayer.get(Number(row.id)) ?? []));
        const newValue = canonical(field, (entry.changes as Record<string, unknown>)[field]);
        if (JSON.stringify(oldValue) === JSON.stringify(newValue)) {
          unchanged += 1;
          continue;
        }
        items.push({
          mouse_id: Number(row.id),
          mouse_name: String(row.name),
          field,
          old_value: jsonValue(oldValue),
          new_value: jsonValue(newValue),
          status: 'pending',
        });
      }
    }
    if (!items.length) return { submissionId: null, submitted: 0, unchanged };
    const [created] = await trx('mouse_change_submissions').insert({
      api_token_id: apiToken.id,
      api_token_name: apiToken.name,
    }).returning('id');
    const submissionId = idFromReturning(created);
    await trx('mouse_change_items').insert(items.map((item) => ({ ...item, submission_id: submissionId })));
    return { submissionId, submitted: items.length, unchanged };
  });
  return result;
}

export async function listPlayerChangeItems(options: {
  status: 'all' | PlayerChangeStatus;
  page: number;
  pageSize: number;
  search: string;
}) {
  const query = db('mouse_change_items as item')
    .join('mouse_change_submissions as submission', 'submission.id', 'item.submission_id')
    .leftJoin('users as handler', 'handler.id', 'item.handled_by_user_id');
  if (options.status !== 'all') query.where('item.status', options.status);
  if (options.search) {
    const term = `%${options.search}%`;
    query.where((builder) => builder
      .whereILike('item.mouse_name', term)
      .orWhereILike('item.field', term)
      .orWhereILike('submission.api_token_name', term));
  }
  const total = Number((await query.clone().count({ count: 'item.id' }).first())?.count ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / options.pageSize));
  const page = Math.min(options.page, totalPages);
  const rows = await query.clone()
    .select(
      'item.id', 'item.submission_id as submissionId', 'item.mouse_id as mouseId',
      'item.mouse_name as playerNickname', 'item.field', 'item.old_value as oldValue',
      'item.new_value as newValue', 'item.status', 'item.created_at as createdAt',
      'item.handled_at as handledAt', 'submission.api_token_name as source',
      'handler.username as handledBy'
    )
    .orderBy('item.created_at', 'desc').orderBy('item.id', 'desc')
    .limit(options.pageSize).offset((page - 1) * options.pageSize);
  return {
    items: rows.map((row) => ({
      id: Number(row.id), submissionId: Number(row.submissionId), mouseId: row.mouseId == null ? null : Number(row.mouseId),
      playerNickname: String(row.playerNickname), field: String(row.field),
      oldValue: parseJsonValue(row.oldValue), newValue: parseJsonValue(row.newValue),
      status: String(row.status) as PlayerChangeStatus, source: String(row.source),
      createdAt: row.createdAt, handledAt: row.handledAt, handledBy: row.handledBy ?? null,
    })),
    total, page, pageSize: options.pageSize, totalPages,
  };
}

export async function reviewPlayerChangeItems(
  itemIds: number[],
  decision: 'approve' | 'reject',
  handledByUserId: number
): Promise<{ approved: number; rejected: number; conflict: number; updated: number }> {
  let approved = 0;
  let rejected = 0;
  let conflict = 0;
  await db.transaction(async (trx) => {
    const items = await trx('mouse_change_items')
      .whereIn('id', itemIds).where({ status: 'pending' })
      .orderBy('id').forUpdate().select('*');
    for (const item of items) {
      if (decision === 'reject') {
        await trx('mouse_change_items').where({ id: item.id, status: 'pending' }).update({
          status: 'rejected', handled_by_user_id: handledByUserId, handled_at: trx.fn.now(),
        });
        rejected += 1;
        continue;
      }
      const player = item.mouse_id == null
        ? null
        : await trx('mice').where({ id: item.mouse_id }).forUpdate().first(
          'id', 'name', 'brand', 'country', 'continent', 'shape', 'size', 'weight',
          'length_mm', 'side_buttons', 'wireless', 'is_enabled'
        );
      const markConflict = async () => {
        await trx('mouse_change_items').where({ id: item.id, status: 'pending' }).update({
          status: 'conflict', handled_by_user_id: handledByUserId, handled_at: trx.fn.now(),
        });
        conflict += 1;
      };
      if (!player) {
        await markConflict();
        continue;
      }
      const difficulties = await trx('mouse_difficulties').where({ mouse_id: player.id }).pluck('difficulty_key');
      const field = String(item.field) as PlayerChangeField;
      if (!(fields as readonly string[]).includes(field)) {
        await markConflict();
        continue;
      }
      const oldValue = canonical(field, parseJsonValue(item.old_value));
      const actualValue = canonical(field, currentValue(field, player as Record<string, unknown>, difficulties.map(String)));
      if (JSON.stringify(oldValue) !== JSON.stringify(actualValue)) {
        await markConflict();
        continue;
      }
      const newValue = canonical(field, parseJsonValue(item.new_value));
      if (field === 'name') {
        const duplicate = await trx('mice').where({ name: newValue }).whereNot({ id: player.id }).first('id');
        if (duplicate) {
          await markConflict();
          continue;
        }
      }
      const update = { [field]: newValue } as PlayerUpdateInput;
      if (field === 'difficulties') assertDifficultyKeys(newValue as string[]);
      await applyPlayerUpdate(trx, Number(player.id), update);
      await trx('mouse_change_items').where({ id: item.id, status: 'pending' }).update({
        status: 'approved', handled_by_user_id: handledByUserId, handled_at: trx.fn.now(),
      });
      approved += 1;
    }
  });
  if (approved) await invalidatePlayerCache();
  return { approved, rejected, conflict, updated: approved + rejected + conflict };
}
