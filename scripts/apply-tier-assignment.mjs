// 把 tier-editor.html 导出的分级名单应用到鼠标种子数据。
// 用法: node scripts/apply-tier-assignment.mjs [tier-assignment.json 路径]
// 名单里没出现的品牌默认进扫地僧(hard)。
// modelOverrides 提供型号级微调,键为鼠标全名(如 "Logitech B100"),值为
// easy/normal/hard/disabled(小白/潮男/扫地僧/禁用),优先级高于品牌档;禁用会同时置
// is_enabled=false。
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const assignmentPath =
  process.argv[2] ?? fileURLToPath(new URL('../tier-assignment.json', import.meta.url));
const seedsPath =
  fileURLToPath(new URL('../server/src/db/seeds/mice.json', import.meta.url));

const assignment = JSON.parse(await readFile(assignmentPath, 'utf8'));
const mice = JSON.parse(await readFile(seedsPath, 'utf8'));

const BRAND_TIERS = ['easy', 'normal', 'disabled'];
const MODEL_TIERS = ['easy', 'normal', 'hard', 'disabled'];

const tierByBrand = new Map();
for (const [tier, brands] of Object.entries(assignment)) {
  if (tier === 'modelOverrides') continue;
  if (!BRAND_TIERS.includes(tier)) {
    throw new Error(`未知的分级键: ${tier}`);
  }
  for (const brand of brands) tierByBrand.set(brand, tier);
}

const overrides = assignment.modelOverrides ?? {};
for (const [name, tier] of Object.entries(overrides)) {
  if (!MODEL_TIERS.includes(tier)) {
    throw new Error(`型号覆写档位不合法: ${name} -> ${tier}`);
  }
}

// 档位 -> 种子的 difficulties/is_enabled。与 build-mouse-dataset.mjs 的品牌级
// 逻辑保持一致:disabled 只是移出游戏池,difficulties 留 ['hard'] 占位。
function applyTier(mouse, tier) {
  mouse.difficulties = ['hard'];
  if (tier === 'normal' || tier === 'easy') mouse.difficulties.push('normal');
  if (tier === 'easy') mouse.difficulties.push('easy');
  mouse.is_enabled = tier !== 'disabled';
}

const unknownBrands = [...tierByBrand.keys()].filter(
  (brand) => !mice.some((mouse) => mouse.brand === brand)
);
if (unknownBrands.length) {
  throw new Error(`名单里有种子中不存在的品牌: ${unknownBrands.join(', ')}`);
}

const unknownModels = Object.keys(overrides).filter(
  (name) => !mice.some((mouse) => mouse.name === name)
);
if (unknownModels.length) {
  throw new Error(`型号覆写里有种子中不存在的鼠标: ${unknownModels.join(', ')}`);
}

const before = { easy: 0, normal: 0, hard: 0, enabled: 0 };
for (const mouse of mice) {
  for (const key of mouse.difficulties) before[key] = (before[key] ?? 0) + 1;
  if (mouse.is_enabled !== false) before.enabled++;
}

for (const mouse of mice) {
  applyTier(mouse, tierByBrand.get(mouse.brand) ?? 'hard');
}
for (const [name, tier] of Object.entries(overrides)) {
  applyTier(mice.find((mouse) => mouse.name === name), tier);
}

const after = { easy: 0, normal: 0, hard: 0, enabled: 0 };
for (const mouse of mice) {
  for (const key of mouse.difficulties) after[key]++;
  if (mouse.is_enabled) after.enabled++;
}

await writeFile(seedsPath, JSON.stringify(mice, null, 2) + '\n');

const overrideCount = Object.keys(overrides).length;
console.log(`应用完成（品牌: 小白 ${assignment.easy.length} / 潮男 ${assignment.normal.length} / 禁用 ${assignment.disabled.length}，其余进扫地僧；型号覆写 ${overrideCount} 条）`);
console.log(`小白(easy):   ${before.easy} → ${after.easy} 只`);
console.log(`潮男(normal): ${before.normal} → ${after.normal} 只`);
console.log(`扫地僧(hard): ${before.hard} → ${after.hard} 只`);
console.log(`可用鼠标总数: ${before.enabled} → ${after.enabled} 只（禁用 ${mice.length - after.enabled} 只不进游戏）`);
