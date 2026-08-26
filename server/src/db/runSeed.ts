import { db } from './knex';
import { ensureSchema } from './schema';
import { insertMissingSeedMice } from './seedMice';

// 手动执行:补充种子数据中数据库尚不存在的鼠标(按名称去重)
async function run() {
  await ensureSchema();
  const inserted = await insertMissingSeedMice();
  console.log(`[seed] 新增 ${inserted} 只鼠标`);
  await db.destroy();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
