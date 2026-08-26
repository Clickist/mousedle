import { db } from './knex';
import { ensureSchema } from './schema';
import { upsertSeedMice } from './seedMice';

// 手动执行:按名称刷新已有种子规格,并补入缺失鼠标
async function run() {
  await ensureSchema();
  const { inserted, updated } = await upsertSeedMice();
  console.log(`[seed] 新增 ${inserted} 只,刷新 ${updated} 只鼠标`);
  await db.destroy();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
