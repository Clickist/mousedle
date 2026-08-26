import { ensureSchema } from './schema';
import { seedMiceIfEmpty } from './seedMice';

export { seedMiceIfEmpty };

export async function initDb(): Promise<void> {
  await ensureSchema();
  const seeded = await seedMiceIfEmpty();
  if (seeded) console.log(`[seed] 已导入 ${seeded} 名选手`);
}
