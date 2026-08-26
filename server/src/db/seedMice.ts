import type { Knex } from 'knex';
import { db } from './knex';
import miceData from './seeds/mice.json';

interface SeedMouse {
  name: string;
  brand: string;
  country: string | null;
  continent: string | null;
  shape: string;
  size: string;
  weight: number;
  length: number;
  side_buttons: number;
  wireless: boolean;
  display?: Record<string, unknown>;
  difficulties?: string[];
  is_enabled?: boolean;
}

const seedMice = miceData as SeedMouse[];
const normalizeName = (value: string) => value.toLocaleLowerCase('en-US').replace(/[_-]/g, '');

function difficulties(mouse: SeedMouse): string[] {
  return mouse.difficulties?.length ? [...new Set(mouse.difficulties)] : ['normal'];
}

function seedRow(mouse: SeedMouse) {
  return {
    name: mouse.name,
    brand: mouse.brand,
    country: mouse.country ?? '',
    continent: mouse.continent ?? '',
    shape: mouse.shape,
    size: mouse.size,
    weight: mouse.weight,
    length_mm: mouse.length,
    side_buttons: mouse.side_buttons,
    wireless: mouse.wireless,
    display: mouse.display ? JSON.stringify(mouse.display) : null,
    is_enabled: mouse.is_enabled ?? true,
  };
}

async function replaceDifficultyMemberships(
  trx: Knex.Transaction,
  mice: Array<{ id: number; name: string }>,
  seedsByName: Map<string, SeedMouse>
): Promise<void> {
  const mouseIds = mice.map((mouse) => mouse.id);
  if (mouseIds.length) {
    await trx('mouse_difficulties').whereIn('mouse_id', mouseIds).del();
  }
  const memberships = mice.flatMap((mouse) => {
    const seed = seedsByName.get(normalizeName(String(mouse.name)));
    return seed
      ? difficulties(seed).map((difficultyKey) => ({
          mouse_id: mouse.id,
          difficulty_key: difficultyKey,
        }))
      : [];
  });
  for (let i = 0; i < memberships.length; i += 200) {
    await trx('mouse_difficulties')
      .insert(memberships.slice(i, i + 200))
      .onConflict(['mouse_id', 'difficulty_key'])
      .ignore();
  }
}

export async function insertMissingSeedMice(instance: Knex = db): Promise<number> {
  const existing = new Set(
    (await instance('mice').select('name'))
      .map((mouse) => normalizeName(String(mouse.name)))
  );
  const additions = seedMice.filter(
    (mouse) => !existing.has(normalizeName(mouse.name))
  );
  if (!additions.length) return 0;

  await instance.transaction(async (trx) => {
    // SQLite 单条复合 INSERT 有表达式数上限,分块插入
    const rows = additions.map(seedRow);
    const CHUNK = 200;
    const inserted: Array<{ id: number; name: string }> = [];
    for (let i = 0; i < rows.length; i += CHUNK) {
      const batch = await trx('mice')
        .insert(rows.slice(i, i + CHUNK))
        .returning(['id', 'name']);
      inserted.push(...batch);
    }
    const seedByName = new Map(
      additions.map((mouse) => [normalizeName(mouse.name), mouse])
    );
    await replaceDifficultyMemberships(trx, inserted, seedByName);
  });
  return additions.length;
}

/** 按名称刷新已有种子鼠标的规格字段,并补入缺失条目。本地体验新字段时用。 */
export async function upsertSeedMice(instance: Knex = db): Promise<{ inserted: number; updated: number }> {
  const existingNames = new Set(
    (await instance('mice').select('name')).map((mouse) => normalizeName(String(mouse.name)))
  );
  const inserted = seedMice.filter((mouse) => !existingNames.has(normalizeName(mouse.name))).length;
  const updated = seedMice.length - inserted;

  await instance.transaction(async (trx) => {
    const CHUNK = 200;
    const rows = seedMice.map(seedRow);
    for (let i = 0; i < rows.length; i += CHUNK) {
      await trx('mice')
        .insert(rows.slice(i, i + CHUNK))
        .onConflict('name')
        .merge([
          'brand',
          'country',
          'continent',
          'shape',
          'size',
          'weight',
          'length_mm',
          'side_buttons',
          'wireless',
          'display',
          'is_enabled',
        ]);
    }
    const names = seedMice.map((mouse) => mouse.name);
    const seeded: Array<{ id: number; name: string }> = [];
    for (let i = 0; i < names.length; i += CHUNK) {
      seeded.push(
        ...(await trx('mice').select('id', 'name').whereIn('name', names.slice(i, i + CHUNK)))
      );
    }
    await replaceDifficultyMemberships(
      trx,
      seeded,
      new Map(seedMice.map((mouse) => [normalizeName(mouse.name), mouse]))
    );
  });

  return { inserted, updated };
}

export async function seedMiceIfEmpty(instance: Knex = db): Promise<number> {
  const row = await instance('mice').count<{ count: number | string }[]>({ count: '*' });
  if (Number(row[0]?.count ?? 0) > 0) return 0;
  return insertMissingSeedMice(instance);
}
