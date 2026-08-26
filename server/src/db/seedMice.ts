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
    const rows = additions.map((mouse) => ({
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
    }));
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
    const memberships = inserted.flatMap((mouse) => {
      const seed = seedByName.get(normalizeName(String(mouse.name)));
      return seed
        ? difficulties(seed).map((difficultyKey) => ({
            mouse_id: mouse.id,
            difficulty_key: difficultyKey,
          }))
        : [];
    });
    if (memberships.length) {
      for (let i = 0; i < memberships.length; i += 200) {
        await trx('mouse_difficulties')
          .insert(memberships.slice(i, i + 200))
          .onConflict(['mouse_id', 'difficulty_key'])
          .ignore();
      }
    }
  });
  return additions.length;
}

export async function seedMiceIfEmpty(instance: Knex = db): Promise<number> {
  const row = await instance('mice').count<{ count: number | string }[]>({ count: '*' });
  if (Number(row[0]?.count ?? 0) > 0) return 0;
  return insertMissingSeedMice(instance);
}
