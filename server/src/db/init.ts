import { clearLegacyPlayerSchema } from './legacy';
import { ensureSchema } from './schema';
import { seedMiceIfEmpty } from './seedMice';
import { db } from './knex';

export { seedMiceIfEmpty };

export async function initDb(): Promise<void> {
  const clearedLegacy = await clearLegacyPlayerSchema(db);
  if (clearedLegacy) console.log('[migrate] 已清理旧版选手玩法数据');
  await ensureSchema();
  const seeded = await seedMiceIfEmpty();
  if (seeded) console.log(`[seed] 已导入 ${seeded} 只鼠标`);
}
