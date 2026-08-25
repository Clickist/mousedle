// 把 eloshapes 鼠标快照转换成 mousedle 的数据集格式。
// 用法: node scripts/build-mouse-dataset.mjs [eloshapes快照.json] [输出mice.json]
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const inputPath =
  process.argv[2] ??
  'C:/Users/袜子/Desktop/Aiming-cookie/artifacts/eloshapes/snapshots/eloshapes_mouse_catalog_2026-07-31T211736Z.json';
const outputPath =
  process.argv[3] ?? fileURLToPath(new URL('../server/src/db/seeds/mice.json', import.meta.url));

// 品牌 -> 总部/发源地国家。没把握的留空,不做猜测。
const BRAND_COUNTRY = {
  Logitech: '瑞士', Pulsar: '韩国', Razer: '新加坡', ATK: '中国', Zowie: '中国台湾',
  MCHOSE: '中国', Rapoo: '中国', Corsair: '美国', ASUS: '中国台湾', Keychron: '中国',
  'G-Wolves': '中国', EWEADN: '中国', PMM: '泰国', SteelSeries: '丹麦', Glorious: '美国',
  'Attack Shark': '中国', AJAZZ: '中国', Finalmouse: '美国', VGN: '中国', LAMZU: '中国',
  Darmoshark: '中国', Redragon: '中国', VAXEE: '中国台湾', Kysona: '中国', Bloody: '中国台湾',
  Delux: '中国', AULA: '中国', Dareu: '中国台湾', 'Endgame Gear': '德国', HyperX: '美国',
  ROCCAT: '德国', Akko: '中国', WLMOUSE: '中国', Incott: '中国', Pwnage: '美国',
  RAWM: '中国', 'Cooler Master': '中国台湾', 'Ardor Gaming': '俄罗斯', Zaopin: '中国',
  ThundeRobot: '中国', Hator: '乌克兰', VXE: '中国', Ninjutso: '新加坡', Xinmeng: '中国',
  Ausdom: '中国', 'Turtle Beach': '美国', RAKK: '菲律宾', Mionix: '瑞典', Waizowl: '中国',
  Xtrfy: '瑞典', 'Cherry Xtrfy': '德国', Microsoft: '美国', ELECOM: '日本', Metaphyuni: '中国',
  Epomaker: '中国', MACHENIKE: '中国', Kreo: '印度', SOLAKAKA: '中国', Vancer: '中国',
  Monka: '中国', Lenovo: '中国', GravaStar: '中国',
  MSI: '中国台湾', Xiaomi: '中国', Edifier: '中国', A4Tech: '中国台湾', Cherry: '德国',
  Fnatic: '英国', Nintendo: '日本', Apple: '美国', Alienware: '美国', Acer: '中国台湾',
  NZXT: '美国', '8BitDo': '中国', Ducky: '中国台湾', REDMAGIC: '中国', 'RK Royal Kludge': '中国',
  Madlions: '中国', Mountain: '德国', Zaunkoenig: '德国', PureTrak: '美国', 'SPC Gear': '波兰',
  Xenics: '韩国', Pichau: '巴西', Fallen: '巴西', Drevo: '中国', Realforce: '日本',
  INZONE: '日本', Swiftpoint: '新西兰', Nixeus: '美国', Irocks: '中国台湾', 'The G-Lab': '法国',
  'be quiet!': '德国', Scyrox: '中国',
};

// 难度分档按瞄准圈知名度:beginner 是圈内人尽皆知的品牌,easy 再加一圈,normal 全量。
const BEGINNER_BRANDS = new Set([
  'Logitech', 'Razer', 'Zowie', 'Pulsar', 'Finalmouse', 'LAMZU', 'VAXEE', 'ATK', 'VXE', 'G-Wolves',
]);
const EASY_BRANDS = new Set([
  ...BEGINNER_BRANDS,
  'MCHOSE', 'Ninjutso', 'WLMOUSE', 'VGN', 'Darmoshark', 'Kysona', 'Waizowl', 'RAWM',
  'Corsair', 'ASUS', 'HyperX', 'SteelSeries', 'Glorious', 'Xtrfy', 'Endgame Gear',
  'Rapoo', 'EWEADN', 'Attack Shark', 'Scyrox',
]);

const SIZE_ZH = { small: '小型', medium: '中型', large: '大型', fingertip: '指尖' };
const SHAPE_ZH = { symmetrical: '对称', ergonomic: '人体工学', hybrid: '混合' };
const HUMP_ZH = {
  center: '居中',
  'back - minimal': '靠后·轻微',
  'back - moderate': '靠后·中等',
  'back - aggressive': '靠后·激进',
};
const HAND_ZH = { right: '右手', left: '左手', ambidextrous: '双手' };

const snapshot = JSON.parse(await readFile(inputPath, 'utf-8'));
const entries = Array.isArray(snapshot) ? snapshot : snapshot.entries ?? [];

const mice = [];
const skipped = [];
const unmatchedBrands = new Set();

for (const e of entries) {
  const brand = e.general__brand_names?.[0];
  const model = e.general__model;
  if (!brand || !model || !e.mouse__length || !e.mouse__weight || !e.mouse__shape || !e.mouse__size_category) {
    skipped.push(`${brand ?? '?'} ${model ?? e.general__handle ?? '?'}`);
    continue;
  }
  const country = BRAND_COUNTRY[brand] ?? null;
  if (!country) unmatchedBrands.add(brand);

  const variant = e.general__variant;
  const image = e.general__images?.find((i) => i.default)?.urls?.[0] ?? e.general__images?.[0]?.urls?.[0] ?? null;
  const sensorBrand = e.mouse__sensor_brand_names?.[0] ?? '';
  const sensorModel = e.mouse__sensor_model ?? '';
  const sensor = [sensorBrand, sensorModel].filter(Boolean).join(' ') || null;

  const difficulties = ['normal'];
  if (EASY_BRANDS.has(brand)) difficulties.push('easy');
  if (BEGINNER_BRANDS.has(brand)) difficulties.push('beginner');

  mice.push({
    nickname: [brand, model, variant].filter(Boolean).join(' '),
    brand,
    country,
    sizeCategory: SIZE_ZH[e.mouse__size_category] ?? e.mouse__size_category,
    shape: SHAPE_ZH[e.mouse__shape] ?? e.mouse__shape,
    humpPlacement: HUMP_ZH[e.mouse__hump_placement] ?? e.mouse__hump_placement ?? null,
    handCompatibility: HAND_ZH[e.mouse__hand_compatibility] ?? e.mouse__hand_compatibility,
    weight: e.mouse__weight,
    length: e.mouse__length,
    width: e.mouse__width,
    height: e.mouse__height,
    wired: Boolean(e.mouse__is_wired),
    wireless24: Boolean(e.mouse__is_wireless_2_4_ghz),
    bluetooth: Boolean(e.mouse__is_bluetooth),
    dpi: e.mouse__dpi,
    pollingRate: e.mouse__polling_rate,
    sideButtons: e.mouse__side_buttons,
    sensor,
    difficulties,
    isActive: true,
    isEnabled: true,
    handle: e.general__handle,
    image,
  });
}

// 品牌内按名称排序,方便人工审阅
mice.sort((a, b) => a.nickname.localeCompare(b.nickname, 'en'));

await writeFile(outputPath, JSON.stringify(mice, null, 2) + '\n', 'utf-8');

const beginnerCount = mice.filter((m) => m.difficulties.includes('beginner')).length;
const easyCount = mice.filter((m) => m.difficulties.includes('easy')).length;
console.log(`total: ${entries.length} -> ${mice.length} (skipped ${skipped.length})`);
console.log(`beginner: ${beginnerCount}, easy: ${easyCount}, normal: ${mice.length}`);
console.log(`country known: ${mice.filter((m) => m.country).length}/${mice.length}`);
if (unmatchedBrands.size) console.log(`brands without country:`, [...unmatchedBrands].join(', '));
if (skipped.length) console.log(`skipped:`, skipped.slice(0, 10).join(' | '), skipped.length > 10 ? '...' : '');
