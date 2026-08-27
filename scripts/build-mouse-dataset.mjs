// 把 eloshapes 鼠标快照转换成 mousedle 的数据集格式。
// 猜测列:品牌/产地/形状/大小/重量/长度/宽度/高度/无线/传感器;
// 揭晓补充:hump/握持/连接细分。侧键、DPI、轮询率不参与猜测。
// 用法: node scripts/build-mouse-dataset.mjs [eloshapes快照.json] [输出mice.json]
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const inputPath =
  process.argv[2] ??
  fileURLToPath(new URL('../data/eloshapes/eloshapes_mouse_catalog.json', import.meta.url));
const outputPath =
  process.argv[3] ?? fileURLToPath(new URL('../server/src/db/seeds/mice.json', import.meta.url));

// 品牌 -> 品牌所属公司/总部所在国。没把握的标记 UNKNOWN,不做猜测。
const BRAND_COUNTRY = {
  Logitech: '瑞士', Pulsar: '韩国', Razer: '新加坡', ATK: '中国', Zowie: '中国台湾',
  MCHOSE: '中国', Rapoo: '中国', Corsair: '美国', ASUS: '中国台湾', ROG: '中国台湾', Keychron: '中国',
  'G-Wolves': '中国', EWEADN: '中国', PMM: '泰国', SteelSeries: '丹麦', Glorious: '美国',
  'Attack Shark': '中国', AJAZZ: '中国', Finalmouse: '美国', VGN: '中国', LAMZU: '中国',
  Darmoshark: '中国', Redragon: '中国', VAXEE: '中国台湾', Kysona: '中国', Bloody: '中国台湾',
  Delux: '中国', AULA: '中国', Dareu: '中国台湾', 'Endgame Gear': '德国', HyperX: '美国',
  ROCCAT: '德国', Akko: '中国', WLMOUSE: '中国', Incott: '中国', Pwnage: '美国',
  RAWM: '中国', 'Cooler Master': '中国台湾', 'Ardor Gaming': '俄罗斯', Zaopin: '中国',
  ThundeRobot: '中国', Hator: '乌克兰', VXE: '中国', Ninjutso: '新加坡', Xinmeng: '中国',
  Ausdom: '中国', 'Turtle Beach': '美国', RAKK: '菲律宾', Mionix: '瑞典', Waizowl: '中国',
  Xtrfy: '瑞典', Microsoft: '美国', ELECOM: '日本', Metaphyuni: '中国',
  Epomaker: '中国', MACHENIKE: '中国', Kreo: '印度', SOLAKAKA: '中国', Vancer: '中国',
  Monka: '中国', Lenovo: '中国', GravaStar: '中国',
  MSI: '中国台湾', Xiaomi: '中国', Edifier: '中国', A4Tech: '中国台湾', Cherry: '德国',
  Fnatic: '英国', Nintendo: '日本', Apple: '美国', Alienware: '美国', Acer: '中国台湾',
  NZXT: '美国', '8BitDo': '中国', Ducky: '中国台湾', REDMAGIC: '中国', 'RK Royal Kludge': '中国',
  Madlions: '中国', Mountain: '德国', Zaunkoenig: '德国', PureTrak: '美国', 'SPC Gear': '波兰',
  Xenics: '韩国', Pichau: '巴西', Fallen: '巴西', Drevo: '中国', Realforce: '日本',
  INZONE: '日本', Swiftpoint: '新西兰', Nixeus: '美国', Irocks: '中国台湾', 'The G-Lab': '法国',
  'be quiet!': '德国', Scyrox: '中国',
  ABKO: '韩国', AIM1: '日本', ANTGAMER: '中国', ARYE: '中国香港', Aigo: '中国', Amazon: '美国',
  'Angry Miao': '中国', Aqirys: '罗马尼亚', 'Arbiter Studio': '美国', Atompalm: '美国',
  CC: 'UNKNOWN', COMMATECH: '中国', CRDRAKO: '中国', CROCIRIS: '中国', Chaos: '中国',
  Chilkey: '中国', CryoMods: '美国', Cybeart: '加拿大', 'Dark Project': '塞浦路斯', Dornfinger: '德国',
  'Dream Machines': '波兰', EVGA: '美国', Fantech: '印度尼西亚', Fiberaim: '英国', FineMax: '中国',
  Flick: '美国', Flickshot: 'UNKNOWN', Freewolf: '中国', GANSS: '中国', GITOPER: '中国', Gamesense: '美国',
  'HK Gaming': '中国香港', 'HUO JI': '中国', HaunterWell: '巴西', Higround: '美国', Hitscan: '美国',
  IFYOO: '中国', INPHIC: '中国', IPI: '中国', IROK: '中国', IXILAB: '中国', IYX: '中国',
  Imecoo: '中国', Ironcat: '中国', JamesDonkey: '中国', KlasseGear: '土耳其', LTC: '中国香港',
  'Lethal Gaming Gear': '美国', Lofree: '中国', LunaFury: '中国', MAMBASNAKE: '中国', MLOONG: '中国',
  MelGeek: '中国', 'Midnight Thread': '泰国', 'Mighty Mouse': 'UNKNOWN', Motospeed: '中国',
  'Nitrite Labs': 'UNKNOWN', Noir: '印度尼西亚', Nyfter: '德国', OYREIN: 'UNKNOWN', Orbital: '泰国',
  PALMLAB: '中国香港', PHYLINA: '中国', 'Precision GG': 'UNKNOWN', 'Press Play': '印度尼西亚',
  'Project W': 'UNKNOWN', Rampage: '土耳其', Rexus: '印度尼西亚', Santali: 'UNKNOWN', Sprime: '中国香港',
  SyLical: '摩洛哥', TMKB: '中国', Teamwolf: '中国', Tecware: '新加坡', Teevolution: '中国',
  TenTen: 'UNKNOWN', UNIUS: '中国', UluGames: '土耳其', VARO: '韩国', Vaidemi: 'UNKNOWN',
  Valkyrie: '中国', VortexSeries: '印度尼西亚', Wraith: '土耳其', XBAB: '美国', XIBERIA: '中国',
  Xinshuntian: '中国', Xyder: '中国', YUNZII: '中国', cOoLm0Dz: '意大利', strayfe: '德国', xtro: '印度',
  zeromouse: '澳大利亚',
};

const COUNTRY_CONTINENT = {
  '瑞士': '欧洲', '丹麦': '欧洲', '瑞典': '欧洲', '德国': '欧洲', '英国': '欧洲', '法国': '欧洲', '乌克兰': '欧洲', '波兰': '欧洲', '意大利': '欧洲',
  '中国': '亚洲', '中国台湾': '亚洲', '韩国': '亚洲', '日本': '亚洲', '新加坡': '亚洲', '泰国': '亚洲', '印度': '亚洲', '菲律宾': '亚洲',
  '美国': '美洲', '巴西': '美洲',
  '俄罗斯': '欧洲', '新西兰': '大洋洲',
  '罗马尼亚': '欧洲', '塞浦路斯': '欧洲', '加拿大': '美洲', '中国香港': '亚洲', '摩洛哥': '非洲',
  '土耳其': '亚洲', '印度尼西亚': '亚洲', '澳大利亚': '大洋洲',
};

// 品牌别名归一:同品牌在快照里的不同写法统一成一个名字。
const BRAND_ALIASES = new Map([['Cherry Xtrfy', 'Xtrfy']]);

// 华硕的游戏鼠按产品线拆牌:ROG 系独立成牌(玩家认知),TUF/ProArt 留在 ASUS。
function resolveBrand(rawBrand, model) {
  const brand = BRAND_ALIASES.get(rawBrand) ?? rawBrand;
  if (brand === 'ASUS' && model?.startsWith('ROG ')) return 'ROG';
  return brand;
}

// 难度分档按瞄准圈知名度:beginner 是圈内人尽皆知的品牌,easy 再加一圈,normal 全量。
const BEGINNER_BRANDS = new Set([
  'Logitech', 'Razer', 'Zowie', 'Pulsar', 'Finalmouse', 'LAMZU', 'VAXEE', 'ATK', 'VXE', 'G-Wolves',
]);
const EASY_BRANDS = new Set([
  ...BEGINNER_BRANDS,
  'MCHOSE', 'Ninjutso', 'WLMOUSE', 'VGN', 'Darmoshark', 'Kysona', 'Waizowl', 'RAWM',
  'Corsair', 'ASUS', 'ROG', 'HyperX', 'SteelSeries', 'Glorious', 'Xtrfy', 'Endgame Gear',
  'Rapoo', 'EWEADN', 'Attack Shark', 'Scyrox',
]);

// 形状/尺寸按 eloshapes 原始细分保留(不再强制归并)。
// shape_v2: symmetrical 对称 / ergonomic 人体工学 / asymmetrical 非对称 / vertical 垂直
// size_category: small 小型 / medium 中型 / large 大型 / fingertip 指尖
const SHAPE_ZH = {
  symmetrical: '对称',
  ergonomic: '人体工学',
  asymmetrical: '非对称',
  vertical: '垂直',
};
const SIZE_ZH = {
  small: '小型',
  fingertip: '指尖',
  medium: '中型',
  large: '大型',
};
const HAND_ZH = { right: '右手', left: '左手', ambidextrous: '双手' };

// 数据纯净:以下品牌产地无法可靠确认,且不属于主流外设品牌,从数据集剔除。
const EXCLUDED_BRANDS = new Set([
  'Flickshot', 'CC', 'Nitrite Labs', 'LORGAR', 'Ragnok', 'Mighty Mouse', 'NovelKeys',
  'OYREIN', 'Precision GG', 'Project W', 'Santali', 'TenTen', 'Vaidemi',
]);
const HUMP_ZH = {
  center: '居中',
  'back - minimal': '靠后·轻微',
  'back - moderate': '靠后·中等',
  'back - aggressive': '靠后·激进',
};

const snapshot = JSON.parse(await readFile(inputPath, 'utf-8'));
const entries = Array.isArray(snapshot) ? snapshot : snapshot.entries ?? [];

const mice = [];
const skipped = [];
const unmatchedBrands = new Set();

for (const e of entries) {
  const brand = resolveBrand(e.general__brand_names?.[0], e.general__model);
  const model = e.general__model;
  if (!brand || !model || !e.mouse__length || !e.mouse__weight || !e.mouse__shape_v2 || !e.mouse__size_category) {
    skipped.push(`${brand ?? '?'} ${model ?? e.general__handle ?? '?'}`);
    continue;
  }
  if (EXCLUDED_BRANDS.has(brand)) {
    skipped.push(`${brand} ${model} (excluded brand)`);
    continue;
  }
  const country = BRAND_COUNTRY[brand] ?? null;
  if (!country) unmatchedBrands.add(brand);
  const continent = country && country !== 'UNKNOWN' ? COUNTRY_CONTINENT[country] ?? '其他' : null;

  const variant = e.general__variant;
  const image = e.general__images?.find((i) => i.default)?.urls?.[0] ?? e.general__images?.[0]?.urls?.[0] ?? null;
  const sensorBrand = e.mouse__sensor_brand_names?.[0] ?? '';
  const sensorModel = e.mouse__sensor_model ?? '';
  const sensor = [sensorBrand, sensorModel].filter(Boolean).join(' ') || null;

  // 连接方式展示串(揭晓卡片用)
  const conn = [];
  if (e.mouse__is_wireless_2_4_ghz) conn.push('2.4G 无线');
  if (e.mouse__is_bluetooth) conn.push('蓝牙');
  if (e.mouse__is_wired) conn.push('有线');

  const difficulties = ['normal'];
  if (EASY_BRANDS.has(brand)) difficulties.push('easy');
  if (BEGINNER_BRANDS.has(brand)) difficulties.push('beginner');

  mice.push({
    name: [brand, model, variant].filter(Boolean).join(' '),
    brand,
    country,
    continent,
    shape: SHAPE_ZH[e.mouse__shape_v2] ?? '对称',
    size: SIZE_ZH[e.mouse__size_category] ?? '中型',
    weight: Math.round(e.mouse__weight),
    length: Math.round(e.mouse__length),
    side_buttons: e.mouse__side_buttons ?? 0,
    wireless: Boolean(e.mouse__is_wireless_2_4_ghz || e.mouse__is_bluetooth),
    // 揭晓卡片展示字段(hump/握持等,不全部参与猜测)
    display: {
      sensor,
      dpi: e.mouse__dpi,
      polling_rate: e.mouse__polling_rate,
      hump: HUMP_ZH[e.mouse__hump_placement] ?? null,
      hand: HAND_ZH[e.mouse__hand_compatibility] ?? null,
      width: e.mouse__width,
      height: e.mouse__height,
      connection: conn.join(' · ') || '有线',
      image,
    },
    difficulties,
    is_enabled: true,
    handle: e.general__handle,
  });
}

// 批内按规范化名称去重(同名不同条目保留首条),避免种子插入撞唯一约束
const seen = new Set();
const deduped = [];
for (const m of mice) {
  const key = m.name.toLowerCase('en-US').replace(/[_-]/g, '');
  if (seen.has(key)) continue;
  seen.add(key);
  deduped.push(m);
}
const duplicates = mice.length - deduped.length;
mice.length = 0;
mice.push(...deduped);

mice.sort((a, b) => a.name.localeCompare(b.name, 'en'));

await writeFile(outputPath, JSON.stringify(mice, null, 2) + '\n', 'utf-8');

const beginnerCount = mice.filter((m) => m.difficulties.includes('beginner')).length;
const easyCount = mice.filter((m) => m.difficulties.includes('easy')).length;
console.log(`total: ${entries.length} -> ${mice.length} (skipped ${skipped.length}, duplicates ${duplicates})`);
console.log(`beginner: ${beginnerCount}, easy: ${easyCount}, normal: ${mice.length}`);
console.log(`country known: ${mice.filter((m) => m.country && m.country !== 'UNKNOWN').length}/${mice.length}`);
if (skipped.length) console.log(`skipped:`, skipped.slice(0, 6).join(' | '), skipped.length > 6 ? '...' : '');
