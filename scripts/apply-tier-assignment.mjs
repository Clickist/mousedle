// 把 tier-editor.html 导出的品牌分级应用到鼠标种子数据。
// 用法: node scripts/apply-tier-assignment.mjs [tier-assignment.json 路径]
// 名单里没出现的品牌默认进扫地僧(normal)。
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const assignmentPath =
  process.argv[2] ?? fileURLToPath(new URL('../tier-assignment.json', import.meta.url));
const seedsPath =
  fileURLToPath(new URL('../server/src/db/seeds/mice.json', import.meta.url));

const assignment = JSON.parse(await readFile(assignmentPath, 'utf8'));
const mice = JSON.parse(await readFile(seedsPath, 'utf8'));

const tierByBrand = new Map();
for (const [tier, brands] of Object.entries(assignment)) {
  if (!['beginner', 'easy', 'disabled'].includes(tier)) {
    throw new Error(`未知的分级键: ${tier}`);
  }
  for (const brand of brands) tierByBrand.set(brand, tier);
}

const unknownBrands = [...tierByBrand.keys()].filter(
  (brand) => !mice.some((mouse) => mouse.brand === brand)
);
if (unknownBrands.length) {
  throw new Error(`名单里有种子中不存在的品牌: ${unknownBrands.join(', ')}`);
}

const before = { beginner: 0, easy: 0, normal: 0, enabled: 0 };
for (const mouse of mice) {
  for (const key of mouse.difficulties) before[key] = (before[key] ?? 0) + 1;
  if (mouse.is_enabled !== false) before.enabled++;
}

const after = { beginner: 0, easy: 0, normal: 0, enabled: 0, disabledBrands: 0 };
for (const mouse of mice) {
  const tier = tierByBrand.get(mouse.brand) ?? 'normal';
  mouse.difficulties = ['normal'];
  if (tier === 'easy' || tier === 'beginner') mouse.difficulties.push('easy');
  if (tier === 'beginner') mouse.difficulties.push('beginner');
  mouse.is_enabled = tier !== 'disabled';
  for (const key of mouse.difficulties) after[key]++;
  if (mouse.is_enabled) after.enabled++;
}
after.disabledBrands = tierByBrand.size
  ? new Set(mice.filter((m) => !m.is_enabled).map((m) => m.brand)).size
  : 0;

await writeFile(seedsPath, JSON.stringify(mice, null, 2) + '\n');

console.log(`应用完成（品牌: 小白 ${assignment.beginner.length} / 潮男 ${assignment.easy.length} / 禁用 ${assignment.disabled.length}，其余进扫地僧）`);
console.log(`小白:   ${before.beginner} → ${after.beginner} 只`);
console.log(`潮男:   ${before.easy} → ${after.easy} 只`);
console.log(`扫地僧: ${before.normal} → ${after.normal} 只（含禁用的 ${mice.length - after.enabled} 只，不进游戏）`);
console.log(`可用鼠标总数: ${before.enabled} → ${after.enabled} 只`);
