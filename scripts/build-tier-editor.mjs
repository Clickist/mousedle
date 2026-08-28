// 从种子数据 + tier-assignment.json 重新生成 tier-editor.html 内嵌的品牌/型号数据块,
// 避免编辑器里烘焙的数据和线上名单脱节。换种子或改名单后重跑一次即可。
// 用法: node scripts/build-tier-editor.mjs
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const seedsPath =
  fileURLToPath(new URL('../server/src/db/seeds/mice.json', import.meta.url));
const assignmentPath =
  fileURLToPath(new URL('../tier-assignment.json', import.meta.url));
const editorPath =
  fileURLToPath(new URL('./tier-editor.html', import.meta.url));

// 分拣提示(仅供参考,不影响落库):
//   办公 —— 名字命中办公/非游戏鼠关键词,是否留在游戏池里值得看一眼;
//   SKU  —— 同壳不同销售代码的变体(如 Orbital Pathfinder AAH-000),玩家几乎无法区分。
const OFFICE_PATTERN =
  /Magic Mouse|Pebble|POP Mouse|ERGO |MX Anywhere|MX Master|MX Vertical|Lift Vertical|Wheel Mouse|Comfort Mouse|IntelliMouse|Pro Click|Atheris|Joy-Con|^Logitech (?:B100|M\d{2,3})|G705/;
const SKU_PATTERN = /\b[A-Z]{2,4}-\d{3}\b/;

const mice = JSON.parse(await readFile(seedsPath, 'utf8'));
const assignment = JSON.parse(await readFile(assignmentPath, 'utf8'));

const tierByBrand = new Map();
for (const [tier, brands] of Object.entries(assignment)) {
  if (tier === 'modelOverrides') continue;
  for (const brand of brands) tierByBrand.set(brand, tier);
}

// 种子里的 difficulties/is_enabled 是已落库的真实档位,据此反推每只鼠标的档。
function effectiveTier(mouse) {
  if (mouse.is_enabled === false) return 'disabled';
  if (mouse.difficulties?.includes('easy')) return 'easy';
  if (mouse.difficulties?.includes('normal')) return 'normal';
  return 'hard';
}

const byBrand = new Map();
for (const mouse of mice) {
  if (!byBrand.has(mouse.brand)) byBrand.set(mouse.brand, []);
  const short = mouse.name.startsWith(mouse.brand + ' ')
    ? mouse.name.slice(mouse.brand.length + 1).replace(/\s+/g, ' ')
    : mouse.name.replace(/\s+/g, ' ');
  const model = { n: mouse.name, s: short };
  if (mouse.display?.image) model.img = mouse.display.image;
  const hints = [OFFICE_PATTERN.test(mouse.name) && '办公', SKU_PATTERN.test(mouse.name) && 'SKU']
    .filter(Boolean);
  if (hints.length) model.h = hints;
  byBrand.get(mouse.brand).push({ model, tier: effectiveTier(mouse) });
}

const brands = [...byBrand.entries()]
  .map(([brand, entries]) => {
    const tier = tierByBrand.get(brand) ?? 'hard';
    const models = entries.map(({ model, tier: t }) =>
      t === tier ? model : { ...model, o: t }
    );
    return { brand, count: entries.length, tier, models };
  })
  .sort((a, b) => b.count - a.count);

const blob = JSON.stringify(brands);
const html = await readFile(editorPath, 'utf8');
const START = '/*__BRANDS_START__*/';
const END = '/*__BRANDS_END__*/';
const startAt = html.indexOf(START);
const endAt = html.indexOf(END);
if (startAt < 0 || endAt < 0 || endAt < startAt) {
  throw new Error('tier-editor.html 缺少数据块标记,请保留 /*__BRANDS_START__*/ 与 /*__BRANDS_END__*/');
}
const next =
  html.slice(0, startAt) +
  `${START}\nconst BRANDS = ${blob};\n${END}` +
  html.slice(endAt + END.length);
if (!next.includes('const BRANDS = [{"brand"')) {
  throw new Error('数据块替换后校验失败,未写入品牌数据');
}
await writeFile(editorPath, next);

const overrideTotal = brands.reduce(
  (sum, b) => sum + b.models.filter((m) => m.o).length,
  0
);
console.log(`编辑器数据块已更新: ${brands.length} 个品牌 / ${mice.length} 只鼠标 / 型号覆写 ${overrideTotal} 条`);
console.log('打开 scripts/tier-editor.html 即可开始分拣。');
