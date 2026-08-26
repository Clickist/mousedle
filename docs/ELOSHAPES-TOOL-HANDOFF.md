# 交接提示词：创建 eloshapes 鼠标数据开源工具仓库

> 用途：在新项目/新 session 里，从零搭建一个**独立的开源仓库**，把「从 eloshapes 拉取 + 清洗鼠标数据 + 下载图片」整条管线打包成一个可自用、可分享的工具。
> 本文档是给新 session 的**唯一交接依据**，读完即可开工，不依赖任何其它会话记忆。

---

## 一、项目目标

创建一个新的 GitHub 开源仓库，功能是把 eloshapes 网站的鼠标数据（含图片）**爬取、清洗、输出为干净的结构化数据集**。它服务于：
- **自己用**：替代 mousedle 项目里现在散落的 `build-mouse-dataset.mjs` + 手动爬取。
- **开源分享**：别人 clone 后跑一个命令就能拿到完整、干净的鼠标数据集。

它**不依赖 mousedle 游戏本体**，是独立的工具仓库。

---

## 二、技术栈建议（可自选，但推荐 Node）

- **推荐 Node.js + TypeScript**：因为现有清洗逻辑是 `.mjs`（ESM），且 mousedle 是 Node/TS 技术栈，统一便于复用。
- 也可用 Python（现有取证脚本是 python），但需迁移清洗逻辑。
- 最终形态：`README.md` + `package.json` + `src/`（fetch / transform / brands / cli）+ `data/` + `LICENSE` + 可选的 `SKILL.md`。

---

## 三、数据源核心信息（已实测可用）

### 3.1 Supabase API key（anon key，静态、公开）
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5amZmcm1maXJrd2N3ZW1wYXd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY3NzAyNzgsImV4cCI6MjA0MjM0NjI3OH0.clLm3KrW9nuWtWRgL4VXz2dH0zohot2Q3XqQ1lSRelI
```
> 这是 eloshapes 网站的 Supabase 项目 `qyjffrmfirkwcwempawu` 的公开 anon key，发给前端的，静态不变。

### 3.2 数据端点
```
https://qyjffrmfirkwcwempawu.supabase.co/rest/v1/products_available_v18_8fev6
```
- 请求头必须带：`apikey: <KEY>` 和 `Authorization: Bearer <KEY>`（二者都带）
- 查询参数：`select=<字段表>` 、`general__category=eq.mouse` 、`order=general__status_edited_date.desc` 、`limit=1000` 、`offset=<分页>`
- 分页：用 `offset` + `limit=1000` 循环拉取，直到返回不足 1000 条。总计约 **1654 条**。
- 返回 `content-range: 0-1653/1654` 可确认总数。

### 3.3 完整 select 字段表（已验证有效）
```
general__id,general__handle,general__category,general__status_edited_date,
general__brand_handles,general__brand_names,general__brands_separator,general__model,general__variant,
general__images,general__affiliate_links,
mouse__size_rating,mouse__size_category,mouse__length,mouse__width,mouse__height,
mouse__shape_v2,mouse__hump_placement,mouse__front_flare,mouse__side_curvature,
mouse__hand_compatibility,mouse__thumb_rest,mouse__ring_finger_rest,
mouse__is_wired,mouse__is_wireless_2_4_ghz,mouse__is_bluetooth,
mouse__weight,mouse__dpi,mouse__polling_rate,mouse__side_buttons,mouse__middle_buttons,
mouse__material_handle_general,mouse__material_handle_specific,mouse__material_name_general,mouse__material_name_specific,
mouse__hot_swappable_battery,
mouse__sensor_id,mouse__sensor_parent_id,mouse__sensor_handle,mouse__sensor_is_specific,
mouse__sensor_brand_names,mouse__sensor_brands_separator,mouse__sensor_model,mouse__sensor_variant,
mouse__sensor_rank,mouse__sensor_type,mouse__sensor_dpi,mouse__sensor_tracking_speed,mouse__sensor_acceleration,
mouse__sensor_used_by,mouse__adjustable_sensor_position,mouse__sensor_position_x,mouse__sensor_position_x2,
mouse__sensor_position_y,mouse__sensor_position_y2,
mouse__mcu_id,mouse__mcu_is_specific,mouse__mcu_handle,mouse__mcu_brand_names,mouse__mcu_brands_separator,
mouse__mcu_model,mouse__mcu_variant,mouse__hot_swappable_switches,mouse__switch_objects,mouse__scroll_wheel_encoder_objects
```
> 注意：字段名是**新版** `mouse__shape_v2`（不是旧的 `mouse__shape`），后者会 400。

---

## 四、可参考的现有代码（在 mousedle 仓库）

mousedle 仓库路径：`/Users/clickist/Projects/mouseberg`

### 4.1 清洗转换脚本（务必参考/迁移）
- **`scripts/build-mouse-dataset.mjs`** —— 核心，含：
  - `BRAND_COUNTRY`（品牌→国家，约 120 个品牌）
  - `COUNTRY_CONTINENT`（国家→大洲）
  - `SHAPE_ZH` / `SIZE_ZH` / `HAND_ZH` / `HUMP_ZH`（枚举中文化）
  - `EXCLUDED_BRANDS`（要剔除的不认识品牌清单）
  - 主循环：解析字段 → 去重 → 输出 JSON
- 这份脚本**已跑通**，可直接作为新仓库的 transform 模块基础。

### 4.2 本地数据快照（可作样例/测试输入）
- `/Users/clickist/Projects/mouseberg/data/eloshapes/eloshapes_mouse_catalog.json`（7.1M，1654 条原始数据）
- 含全部 `general__images[].urls`，可作为测试输入，不必每次都重爬。

### 4.3 数据清洗规则（已确定）
- **形状 shape**（用 `mouse__shape_v2`）4 类：`symmetrical→对称`、`ergonomic→人体工学`、`asymmetrical→非对称`、`vertical→垂直`
- **尺寸 size**（用 `mouse__size_category`）4 类：`small→小型`、`fingertip→指尖`、`medium→中型`、`large→大型`
- **产地 country**：由 `BRAND_COUNTRY[品牌]` 决定；`UNKNOWN` 品牌要剔除（见 EXCLUDED_BRANDS）
- **大洲 continent**：由 `COUNTRY_CONTINENT[国家]` 决定；国家未知则 continent 为 null
- **剔除清单 EXCLUDED_BRANDS**：`Flickshot, CC, Nitrite Labs, LORGAR, Ragnok, Mighty Mouse, NovelKeys, OYREIN, Precision GG, Project W, Santali, TenTen, Vaidemi`
- **图片**：见下文第五节

---

## 五、图片下载方案（已逆向实测验证）

### 5.1 完整 URL 规律（公开桶，无需鉴权）
```
https://qyjffrmfirkwcwempawu.supabase.co/storage/v1/object/public/images/products/<文件名>
```
- **桶名** `images`，**前缀** `products/`
- 文件名**必须取自每条记录 `general__images[].urls[]`**（裸文件名，含扩展名 `.png`），**不是** `general__handle`
  - 实测 549/1641 条记录文件名与 handle 不一致；用 handle 拼会 400，用 `urls` 拼会 200
- **坑**：文件名含 `+`（如 `zowie-fk1+-b.png`）**必须原样传**，不要 percent-encode（`%2B` 会 404）
- 可选变换参数 `?width=&height=&resize=contain`（原图下载不需要）

### 5.2 已验证有效例子
```
.../objects/public/images/products/rawm-leviathan-v4-gt.png → 200, 65809 bytes, PNG 800x800
.../objects/public/images/products/attack-shark-v2-air.png → 200, 108136 bytes
```

### 5.3 批量下载
- 唯一文件名约 **1195 个**（多型号共用同一张图）
- 无专门批量接口（Storage `object/list` 在 anon key 下返回空）
- 方案：收集全部 `urls` 文件名的去重集合 → 对每个拼 `base/名称` → 用 `concurrent.futures` 线程池（16-32 并发）或 `xargs -P` 下载 → 失败重试 2-3 次 → 输出到 `data/eloshapes/images/`（用 urllib/curl 时**不要自动 quote `+`**）
- 图片输出建议目录：与快照同级的 `data/eloshapes/images/`

---

## 六、新仓库要做的事（清单）

1. `git init` + `package.json`（Node）或 `pyproject.toml`（Python）
2. 迁移/重写：
   - `src/fetch.js`（Supabase 分页爬取）
   - `src/transform.js`（清洗：字段映射、细分恢复、产地/大洲、去重、剔除）
   - `src/brands.js`（BRAND_COUNTRY + COUNTRY_CONTINENT + EXCLUDED_BRANDS）
   - `src/download-images.js`（图片并发下载）
   - `src/cli.js`（`fetch` / `transform` / `download-images` 子命令）
3. `README.md`：数据来源、API 说明、schema、CLI 用法、图片下载、License
4. `LICENSE`（建议 MIT 或 Apache-2.0）
5. 可选 `SKILL.md`：给 AI 用的"如何用这个工具"说明
6. `data/` 样例数据（或 gitignore 大数据文件）

---

## 七、环境与建仓提示

- 新 session 工作目录：另建（不要和 mousedle 混）。
- mousedle 仓库只读参考（`/Users/clickist/Projects/mouseberg`）。
- 建仓库用 `gh repo create <名字> --public --source . --push`（需 gh 已 login），或让用户手动建。
- 目标 GitHub 账号：`Clickist`（与 mousedle 同 org）或用户个人账号，待确认。
