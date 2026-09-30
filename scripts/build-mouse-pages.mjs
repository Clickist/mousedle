// 鼠标百科静态页生成器:从 seeds/mice.json 批量生成 /mice/<handle>/ 规格页。
// 纯构建期产物,零运行时依赖、零 JS。产品照为 EloShapes plain 风格(白底烘焙,
// 无透明版),以圆角产品卡呈现;照片缓存在 --cache 目录,只抓一次,构建时本地拷贝。
// 全量上线时可将图片同步到自有 R2 后用 --img-base 指过去,跳过本地拷贝。
//
// 用法:
//   node scripts/build-mouse-pages.mjs --out client/dist --site https://play.gearclickist.com
//   node scripts/build-mouse-pages.mjs --out /tmp/preview --only atk-a9,coolm0dz-qt1p --fetch-images

import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128 Safari/537.36';

// ---- 参数 ----
const args = process.argv.slice(2);
function arg(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}
const OUT = arg('out', 'client/dist');
const SITE = (arg('site', 'https://play.gearclickist.com')).replace(/\/+$/, '');
const DATA = arg('data', path.join(__dirname, '../server/src/db/seeds/mice.json'));
const CACHE = arg('cache', path.join(__dirname, '../data/mice-img')); // 照片持久缓存,进 .gitignore
const ONLY = arg('only', '');            // 逗号分隔 handle,仅生成样本
const IMG_BASE = arg('img-base', '');    // 照片 URL 前缀;空 = 本地 assets/img(从缓存拷贝)
const FETCH_IMAGES = args.includes('--fetch-images');

const PHOTO_TPL =
  'https://qyjffrmfirkwcwempawu.supabase.co/storage/v1/object/public/images/products/';

// sitemap 的固定路由;鼠标页由数据集展开(/mice/ 是本脚本生成的静态目录页,/about/ 在 client/public)
const FIXED_ROUTES = ['/', '/single', '/daily', '/multi', '/stats', '/leaderboard', '/announcement', '/search', '/about/', '/mice/'];

// ---- 数据 ----
const mice = JSON.parse(fs.readFileSync(DATA, 'utf8'));
const selected = ONLY
  ? ONLY.split(',').map((h) => h.trim()).filter(Boolean)
  : mice.map((m) => m.handle);
const byHandle = new Map(mice.map((m) => [m.handle, m]));

// ---- 文案与展示 ----
// v1 仅中文标签;规格数值本身语言中立,en/ja 前缀路径留待有流量数据后再加。
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const num = (v) => (Number.isFinite(v) ? String(v) : null);

// 部分数据的 name 已含品牌名(如 "ATK A9"),避免拼出 "ATK ATK A9"
function fullName(m) {
  return m.name.toLowerCase().startsWith(String(m.brand).toLowerCase())
    ? m.name
    : `${m.brand} ${m.name}`;
}

function specRows(m) {
  const d = m.display || {};
  const rows = [
    ['重量', num(m.weight) && `${m.weight} g`],
    ['长度', num(m.length) && `${m.length} mm`],
    ['宽度', num(d.width) && `${d.width} mm`],
    ['高度', num(d.height) && `${d.height} mm`],
    ['形状', m.shape],
    ['尺寸档', m.size],
    ['传感器', d.sensor],
    ['最高 DPI', num(d.dpi)],
    ['回报率', num(d.polling_rate) && `${d.polling_rate} Hz`],
    ['侧键', num(m.side_buttons) && `${m.side_buttons} 个`],
    ['连接', d.connection],
    ['适用握法', d.hand],
    ['驼峰位置', d.hump],
  ];
  return rows.filter(([, v]) => v != null && v !== '');
}

function metaDescription(m) {
  const d = m.display || {};
  const bits = [];
  if (num(m.weight)) bits.push(`重量 ${m.weight}g`);
  if (num(m.length)) bits.push(`长度 ${m.length}mm`);
  if (d.sensor) bits.push(`传感器 ${d.sensor}`);
  if (num(d.dpi)) bits.push(`最高 DPI ${d.dpi}`);
  if (num(d.polling_rate)) bits.push(`回报率 ${d.polling_rate}Hz`);
  return `${fullName(m)}:${bits.join('，')}。鼠一把鼠标百科。`;
}

// 一句话定位描述,给 AI 与搜索一个可引用的自然语言段落(规格表之外)
function positioning(m) {
  const d = m.display || {};
  const parts = [];
  if (num(m.weight)) parts.push(`${m.weight < 60 ? '轻量' : m.weight <= 90 ? '重量适中' : '偏重'}（${m.weight}g）`);
  if (m.shape) parts.push(`${m.shape}造型`);
  if (m.size) parts.push(`${m.size}尺寸`);
  if (d.hand) parts.push(`适合${d.hand}玩家`);
  if (d.sensor) parts.push(`搭载 ${d.sensor}`);
  if (num(d.polling_rate)) parts.push(`回报率 ${d.polling_rate}Hz`);
  if (parts.length === 0) return null;
  return `${fullName(m)} 是一款${parts.join('、')}的游戏鼠标。`;
}

function imgUrl(m) {
  const file = m.display && m.display.image;
  if (!file) return null;
  return IMG_BASE ? `${IMG_BASE}/${file}` : `../assets/img/${file}`;
}

// ---- 模板 ----
const STYLE = `
:root{color-scheme:dark;--bg:#141413;--surface:#1e1d1b;--text:#ece9e4;--muted:#a8a29a;
--line:rgba(255,255,255,.09);--accent:#8fb8e8;--btn-bg:#f7f5f0;--btn-text:#141413;
--font-ui:'Inter','PingFang SC','Microsoft YaHei','Noto Sans SC',system-ui,sans-serif;
--font-display:'Outfit','Inter','PingFang SC','Microsoft YaHei',sans-serif}
@media (prefers-color-scheme:light){:root{color-scheme:light;--bg:#f7f5f0;--surface:#fffdf8;
--text:#26241f;--muted:#6f6a61;--line:rgba(0,0,0,.09);--accent:#1769c2;--btn-bg:#141413;--btn-text:#f7f5f0}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);
font-family:var(--font-ui);font-size:14px;line-height:1.6}
main{max-width:40rem;margin:0 auto;padding:0 1.25rem 4rem}
.top{display:flex;justify-content:space-between;align-items:center;padding:1.1rem 0;
border-bottom:1px solid var(--line);margin-bottom:2rem}
.top b{font-family:var(--font-display);font-size:15px;letter-spacing:.02em}
.top a{color:inherit;text-decoration:none}.top a:hover{color:var(--accent)}
h1{font-family:var(--font-display);font-size:26px;margin:.4rem 0 .3rem;line-height:1.25}
.crumbs{color:var(--muted);font-size:12.5px;margin-top:1.4rem}
.crumbs a{color:var(--muted);text-decoration:none}.crumbs a:hover{color:var(--accent)}
.desc{margin:1rem 0 0;font-size:14px}
.sub{color:var(--muted);font-size:13px}
.photo{display:flex;justify-content:center;padding:1.6rem 0 .4rem}
.photo img{width:min(320px,80vw);height:auto;border-radius:10px;border:1px solid var(--line)}
.photo .missing{width:min(320px,80vw);aspect-ratio:1;display:flex;align-items:center;
justify-content:center;color:var(--muted);border:1px dashed var(--line);border-radius:10px;font-size:13px}
table{width:100%;border-collapse:collapse;margin:1.4rem 0 0}
td{padding:.55rem .2rem;border-bottom:1px solid var(--line);vertical-align:top}
td:first-child{color:var(--muted);width:7em}
.cta{margin:2.2rem 0;padding:1.1rem 1.25rem;background:var(--surface);border-radius:10px;
display:flex;justify-content:space-between;align-items:center;gap:1rem}
.cta p{margin:0;font-size:13.5px}
.btn{flex:none;display:inline-block;background:var(--btn-bg);color:var(--btn-text);
text-decoration:none;font-weight:600;font-size:13.5px;padding:.55rem 1.1rem;border-radius:999px}
.btn:active{transform:translateY(1px)}
.sec{margin-top:2rem}.sec h2{font-size:13px;color:var(--muted);font-weight:600;margin:0 0 .6rem}
.rel ul{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:.4rem .9rem}
.rel a{color:var(--text);text-decoration:none;border-bottom:1px solid var(--line)}
.rel a:hover{color:var(--accent);border-color:var(--accent)}
footer{margin-top:3rem;padding-top:1rem;border-top:1px solid var(--line);
color:var(--muted);font-size:12px}
footer a{color:inherit}
`;

function jsonLd(m) {
  const image = m.display && m.display.image
    ? (IMG_BASE ? `${IMG_BASE}/${m.display.image}` : `${SITE}/mice/assets/img/${m.display.image}`)
    : null;
  const graph = [
    {
      '@type': 'Product',
      name: fullName(m),
      ...(image ? { image } : {}),
      description: metaDescription(m),
      brand: { '@type': 'Brand', name: String(m.brand) },
      category: '游戏鼠标',
      additionalProperty: specRows(m).map(([k, v]) => ({
        '@type': 'PropertyValue',
        name: k,
        value: String(v),
      })),
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: '首页', item: `${SITE}/` },
        { '@type': 'ListItem', position: 2, name: '鼠标百科', item: `${SITE}/mice/` },
        { '@type': 'ListItem', position: 3, name: fullName(m) },
      ],
    },
  ];
  // < 转义防止 JSON 内容里出现 </script> 提前闭合标签
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');
}

function page(m, all) {
  const rows = specRows(m)
    .map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`)
    .join('\n');
  const src = imgUrl(m);
  const photo = src
    ? `<img src="${esc(src)}" alt="${esc(fullName(m))} 产品照" loading="lazy" width="448" height="448">`
    : `<div class="missing">暂无产品照</div>`;
  const related = all
    .filter((x) => x.handle !== m.handle && x.brand === m.brand)
    .slice(0, 4)
    .map((x) => `<li><a href="../${esc(x.handle)}/">${esc(x.name)}</a></li>`)
    .join('');
  const relBlock = related
    ? `<div class="sec rel"><h2>同品牌鼠标</h2><ul>${related}</ul></div>`
    : '';
  const desc = metaDescription(m);
  const pos = positioning(m);
  const title = `${m.name} 参数 · 鼠一把`;
  const ogImage = src
    ? `<meta property="og:image" content="${esc(
        IMG_BASE ? src : `${SITE}/mice/assets/img/${(m.display && m.display.image) || ''}`,
      )}">`
    : '';
  const ctaText = m.is_enabled
    ? '这只鼠标就在鼠一把的谜题库里，来试试能不能盲猜中它。'
    : '来鼠一把，看看换了它你还能不能认出全库的鼠标。';
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE}/mice/${esc(m.handle)}/">
<meta property="og:type" content="article">
<meta property="og:url" content="${SITE}/mice/${esc(m.handle)}/">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
${ogImage}
<meta name="twitter:card" content="summary">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="../assets/style.css">
<script type="application/ld+json">${jsonLd(m)}</script>
</head>
<body>
<main>
  <div class="top"><b>鼠一把</b><a href="${SITE}/">猜鼠标游戏 →</a></div>
  <nav class="crumbs"><a href="${SITE}/">首页</a> › <a href="../">鼠标百科</a> › ${esc(fullName(m))}</nav>
  <p class="sub">${esc(m.brand)} · ${esc(m.country || '')}${m.shape ? ' · ' + esc(m.shape) : ''}${m.size ? ' · ' + esc(m.size) : ''}</p>
  <h1>${esc(m.name)}</h1>
  ${pos ? `<p class="desc">${esc(pos)}</p>` : ''}
  <div class="photo">${photo}</div>
  <table>${rows}</table>
  <div class="cta">
    <p>${esc(ctaText)}</p>
    <a class="btn" href="${SITE}/single">去猜一猜</a>
  </div>
  ${relBlock}
  <footer>规格数据来自 <a href="https://www.eloshapes.com/" rel="noopener">EloShapes</a> 社区快照 · <a href="${SITE}">鼠一把 mousedle</a> · <a href="${SITE}/about/">关于与玩法</a></footer>
</main>
</body>
</html>
`;
}

function sitemapXml(list) {
  const lastmod = new Date().toISOString().slice(0, 10);
  const urls = FIXED_ROUTES.map(
    (r) => `  <url><loc>${SITE}${r}</loc><lastmod>${lastmod}</lastmod></url>`,
  )
    .concat(
      list.map(
        (m) => `  <url><loc>${SITE}/mice/${esc(m.handle)}/</loc><lastmod>${lastmod}</lastmod></url>`,
      ),
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

// /mice/ 目录页:按品牌分区列出全部规格页,给爬虫与 AI 一跳可达的全库入口
function hubPage(mice) {
  const byBrand = new Map();
  for (const m of mice) {
    const b = m.brand || '其他';
    if (!byBrand.has(b)) byBrand.set(b, []);
    byBrand.get(b).push(m);
  }
  const brands = [...byBrand.keys()].sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'));
  const sections = brands
    .map((b) => {
      const items = byBrand
        .get(b)
        .map(
          (m) =>
            `<li><a href="./${esc(m.handle)}/">${esc(fullName(m))}</a>${
              num(m.weight) ? ` <span class="w">${m.weight}g</span>` : ''
            }</li>`,
        )
        .join('');
      return `<section><h2>${esc(b)} <span class="cnt">${byBrand.get(b).length}</span></h2><ul>${items}</ul></section>`;
    })
    .join('\n');
  const title = '鼠标百科 · 全部游戏鼠标规格';
  const desc = `收录 ${mice.length} 款游戏鼠标的规格参数（重量、尺寸、传感器、最高 DPI、回报率、连接方式等），按品牌浏览，数据来自 EloShapes 社区快照。`;
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: '首页', item: `${SITE}/` },
          { '@type': 'ListItem', position: 2, name: '鼠标百科' },
        ],
      },
    ],
  }).replace(/</g, '\\u003c');
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE}/mice/">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="assets/style.css">
<style>
.list section{margin-top:1.8rem}
.list h2{font-size:14px;color:var(--text);margin:0 0 .5rem}
.list h2 .cnt{color:var(--muted);font-weight:400;font-size:12px;margin-left:.3rem}
.list ul{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(13.5rem,1fr));gap:.1rem 1rem}
.list a{color:var(--text);text-decoration:none;border-bottom:1px solid var(--line)}
.list a:hover{color:var(--accent);border-color:var(--accent)}
.list .w{color:var(--muted);font-size:12px}
</style>
<script type="application/ld+json">${jsonLd}</script>
</head>
<body>
<main>
  <div class="top"><b>鼠一把</b><a href="${SITE}/">猜鼠标游戏 →</a></div>
  <nav class="crumbs"><a href="${SITE}/">首页</a> › 鼠标百科</nav>
  <h1>鼠标百科</h1>
  <p class="desc">收录 ${mice.length} 款游戏鼠标的规格参数：重量、长度/宽度/高度、形状、传感器、最高 DPI、回报率、侧键数量与连接方式，按品牌分区浏览。每款鼠标一页，页内附「同品牌」关联跳转。数据来自 <a href="https://www.eloshapes.com/" rel="noopener">EloShapes</a> 社区快照。想检验对这些鼠标的手感？<a href="${SITE}/single">来鼠一把盲猜一局</a>，或先读<a href="${SITE}/about/">玩法规则</a>。</p>
  <div class="list">
${sections}
  </div>
  <footer>规格数据来自 <a href="https://www.eloshapes.com/" rel="noopener">EloShapes</a> 社区快照 · <a href="${SITE}">鼠一把 mousedle</a> · <a href="${SITE}/about/">关于与玩法</a></footer>
</main>
</body>
</html>
`;
}

// ---- 资产:照片持久缓存 + 拷贝到产物 ----
async function fetchOne(file) {
  const res = await fetch(`${PHOTO_TPL}${file}`, { headers: { 'User-Agent': UA } });
  if (!res.ok) {
    console.warn(`取照失败 ${file}: HTTP ${res.status}`);
    return false;
  }
  fs.writeFileSync(path.join(CACHE, file), Buffer.from(await res.arrayBuffer()));
  return true;
}

async function fetchPhotosToCache() {
  fs.mkdirSync(CACHE, { recursive: true });
  // 多个 handle 可能共用同一张照,按唯一文件名去重,避免重复抓取
  const missing = new Set();
  for (const handle of selected) {
    const m = byHandle.get(handle);
    const file = m && m.display && m.display.image;
    if (!file || fs.existsSync(path.join(CACHE, file))) continue;
    missing.add(file);
  }
  const list = [...missing];
  if (list.length === 0) return { fetched: 0, failed: 0 };
  // 小并发池:首次全量抓取不能串行慢慢磨,也不能把源站打太狠
  const POOL = 8;
  let done = 0;
  let failed = 0;
  let idx = 0;
  async function worker() {
    while (idx < list.length) {
      const file = list[idx++];
      const ok = await fetchOne(file);
      if (!ok) failed++;
      done++;
      if (done % 200 === 0) console.log(`照片进度 ${done}/${list.length}`);
    }
  }
  await Promise.all(Array.from({ length: Math.min(POOL, list.length) }, worker));
  return { fetched: done, failed };
}

function copyPhotosToDist(imgDir) {
  fs.mkdirSync(imgDir, { recursive: true });
  let copied = 0;
  for (const handle of selected) {
    const m = byHandle.get(handle);
    const file = m && m.display && m.display.image;
    if (!file) continue;
    const src = path.join(CACHE, file);
    if (!fs.existsSync(src)) continue;
    fs.copyFileSync(src, path.join(imgDir, file));
    copied++;
  }
  return copied;
}

// ---- 生成 ----
const dir = path.join(OUT, 'mice');
const imgDir = path.join(dir, 'assets/img');
fs.mkdirSync(imgDir, { recursive: true });
fs.writeFileSync(path.join(dir, 'assets/style.css'), STYLE.trim() + '\n');

if (FETCH_IMAGES) {
  const { fetched, failed } = await fetchPhotosToCache();
  console.log(`新抓照片 ${fetched} 张、失败 ${failed} 张(缓存 ${CACHE})`);
}
if (!IMG_BASE) copyPhotosToDist(imgDir);

let written = 0;
const missingImg = [];
for (const handle of selected) {
  const m = byHandle.get(handle);
  if (!m) {
    console.warn(`跳过:未知 handle ${handle}`);
    continue;
  }
  const pageDir = path.join(dir, handle);
  fs.mkdirSync(pageDir, { recursive: true });
  fs.writeFileSync(path.join(pageDir, 'index.html'), page(m, mice));
  written++;
  if (!m.display || !m.display.image) missingImg.push(handle);
}

// sitemap:固定路由 + 全部鼠标页(全量模式才接管;样本模式不覆盖现有 sitemap)
if (!ONLY) {
  fs.writeFileSync(path.join(OUT, 'sitemap.xml'), sitemapXml(mice));
  fs.writeFileSync(path.join(dir, 'index.html'), hubPage(mice));
  console.log(`已生成 sitemap.xml(${FIXED_ROUTES.length + mice.length} 个 URL)与 /mice/ 目录页`);
}

// 样本模式下额外生成一个预览入口页
if (ONLY) {
  const links = selected
    .map((h) => byHandle.get(h))
    .filter(Boolean)
    .map((m) => `<li><a href="mice/${esc(m.handle)}/">${esc(fullName(m))}</a></li>`)
    .join('');
  fs.writeFileSync(
    path.join(OUT, 'index.html'),
    `<!DOCTYPE html><html lang="zh-CN"><meta charset="utf-8"><title>鼠标百科样本预览</title>
<body style="font-family:system-ui;max-width:32rem;margin:4rem auto;line-height:2">
<h1>样本页(${selected.length})</h1><ul>${links}</ul></body>`,
  );
}

console.log(`已生成 ${written} 页 → ${dir}`);
if (missingImg.length) console.log(`缺产品照 ${missingImg.length}:${missingImg.join(', ')}`);
