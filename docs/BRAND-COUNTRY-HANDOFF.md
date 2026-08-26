# 任务：补齐 mousedle 鼠标品牌所属国家(产地)

## 项目背景
这是 mousedle 猜鼠标游戏（仓库 `/Users/clickist/Projects/mouseberg`）。种子数据
`server/src/db/seeds/mice.json` 里每只鼠标有 `brand`（品牌）、`country`（国家，中文）、
`continent`（大洲，中文）。目前有 **92 个品牌缺 `country`**。生成脚本
`/Users/clickist/Projects/mouseberg/scripts/build-mouse-dataset.mjs`
里的 `BRAND_COUNTRY` 映射（品牌→国家）负责填 country。

## 你要做的
给下面 92 个品牌确定**品牌所属公司/总部所在国家**（是品牌所属国，不是鼠标原产地/代工国）：
1. 读取 `server/src/db/seeds/mice.json` 确认品牌、以及 `build-mouse-dataset.mjs` 现有映射。
2. 逐个查证这 92 个品牌的归属国。
3. 更新 `build-mouse-dataset.mjs` 的 `BRAND_COUNTRY` 映射（以及需要时 `COUNTRY_CONTINENT`，见命名规范）。

## 会更好用的数据源（优先尝试）
- **eloshapes 鼠标数据集**（这是本项目的本源数据）。默认快照路径在另一台 Windows 机器：
  `C:/Users/袜子/Desktop/Aiming-cookie/artifacts/eloshapes/snapshots/eloshapes_mouse_catalog_2026-07-31T211736Z.json`
  eloshapes 的公开数据导出里通常**直接带品牌的所属国家/公司**字段，能一次批量解决。
  也可从 `https://www.eloshapes.com/` 或其数据下载入口找导出的 JSON。
- 其次才是逐个品牌官网 / 维基百科 / Rtings 等。

## 命名规范（必须遵守）
- `country` 用**中文国家名**，`continent` 用**中文大洲名**。
- 现有 `COUNTRY_CONTINENT`（国家→大洲）：
  - 欧洲：瑞士、丹麦、瑞典、德国、英国、法国、乌克兰、俄罗斯、波兰
  - 亚洲：中国、中国台湾、韩国、日本、新加坡、泰国、印度、菲律宾
  - 美洲：美国、巴西
  - 大洋洲：新西兰
- 如果查证到 `COUNTRY_CONTINENT` 里没有的新国家，需**同时新增**到该映射。

## 已覆盖品牌（不用再查，避免重复）
Logitech, Pulsar, Razer, ATK, Zowie, MCHOSE, Rapoo, Corsair, ASUS, Keychron, G-Wolves, EWEADN,
PMM, SteelSeries, Glorious, Attack Shark, AJAZZ, Finalmouse, VGN, LAMZU, Darmoshark, Redragon, VAXEE,
Kysona, Bloody, Delux, AULA, Dareu, Endgame Gear, HyperX, ROCCAT, Akko, WLMOUSE, Incott, Pwnage, RAWM,
Cooler Master, Ardor Gaming, Zaopin, ThundeRobot, Hator, VXE, Ninjutso, Xinmeng, Ausdom, Turtle Beach,
RAKK, Mionix, Waizowl, Xtrfy, Cherry Xtrfy, Microsoft, ELECOM, Metaphyuni, Epomaker, MACHENIKE, Kreo,
SOLAKAKA, Vancer, Monka, Lenovo, GravaStar, MSI, Xiaomi, Edifier, A4Tech, Cherry, Fnatic, Nintendo,
Apple, Alienware, Acer, NZXT, 8BitDo, Ducky, REDMAGIC, RK Royal Kludge, Madlions, Mountain, Zaunkoenig,
PureTrak, SPC Gear, Xenics, Pichau, Fallen, Drevo, Realforce, INZONE, Swiftpoint, Nixeus, Irocks,
The G-Lab, be quiet!, Scyrox

## 待补齐的 92 个品牌
ABKO, AIM1, ANTGAMER, ARYE, Aigo, Amazon, Angry Miao, Aqirys, Arbiter Studio, Atompalm, CC,
COMMATECH, CRDRAKO, CROCIRIS, Chaos, Chilkey, CryoMods, Cybeart, Dark Project, Dornfinger,
Dream Machines, EVGA, Fantech, Fiberaim, FineMax, Flick, Flickshot, Freewolf, GANSS, GITOPER,
Gamesense, HK Gaming, HUO JI, HaunterWell, Higround, Hitscan, IFYOO, INPHIC, IPI, IROK, IXILAB,
IYX, Imecoo, Ironcat, JamesDonkey, KlasseGear, LTC, Lethal Gaming Gear, Lofree, LunaFury, MAMBASNAKE,
MLOONG, MelGeek, Midnight Thread, Mighty Mouse, Motospeed, Nitrite Labs, Noir, Nyfter, OYREIN, Orbital,
PALMLAB, PHYLINA, Precision GG, Press Play, Project W, Rampage, Rexus, Santali, Sprime, SyLical, TMKB,
Teamwolf, Tecware, Teevolution, TenTen, UNIUS, UluGames, VARO, Vaidemi, Valkyrie, VortexSeries, Wraith,
XBAB, XIBERIA, Xinshuntian, Xyder, YUNZII, cOoLm0Dz, strayfe, xtro, zeromouse

## 已能确认的部分（供参考，请校准，不要照抄）
以下是我凭已知信息能判定的，Codex 应**验证**这些，其余请查证：
- 美国：EVGA（显卡/外设，已被 NVIDIA 收购）、Amazon（亚马逊自营）、Tecware（待核对）
- 中国：Lofree（洛斐）、JamesDonkey（贱驴）、Motospeed（魔豹）、Aigo（爱国者）、
  INPHIC（因科特）、IROK、Fantech（待核对，可能印尼）、Teamwolf（待核对）
- 不确定/强烈建议查证：Orbital, Flickshot, Dream Machines, VortexSeries, Press Play, Noir,
  Valkyrie, Dark Project, Gamesense, Higround, Lethal Gaming Gear, Mighty Mouse, Abel...

## 约束
- **只填确实查证过、有把握的国家**；没把握的**标 UNKNOWN 或留空**，绝不瞎猜——错误国家会直接污染游戏数据。
- 品牌名**原样保留**（大小写、空格都要对），才能匹配上 `mice.json` 的 brand。
- 修改后运行 `node scripts/build-mouse-dataset.mjs` 重新生成 `mice.json`（需要 eloshapes 快照，若没有则只更新映射不重新生成），
  并确认 `BRAND_COUNTRY` 里每个品牌都能映射到国家。
- 完成后请汇报：补了多少个、哪些标了 UNKNOWN、哪些有把握、哪些存疑。

## 验收
运行后，`server/src/db/seeds/mice.json` 中缺 `country` 的鼠标条数应大幅下降（目标：接近 0）。
