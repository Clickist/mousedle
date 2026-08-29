/**
 * 鼠标数据字段值的按语言显示映射。
 * 种子数据(seeds/mice.json)中的国别/大洲/形状/尺寸/握持/驼峰/连接方式以中文存储,
 * 非中文界面下需经此映射显示,zh 直接使用原值。
 * 未收录的值(品牌名、传感器型号等拉丁字符值)原样返回,数据新增值漏配映射时不会开天窗。
 */
import i18n from './index';

interface ValueText {
  en: string;
  ja: string;
}

const COUNTRY: Record<string, ValueText> = {
  中国: { en: 'China', ja: '中国' },
  中国台湾: { en: 'Taiwan, China', ja: '台湾（中国）' },
  中国香港: { en: 'Hong Kong, China', ja: '香港（中国）' },
  韩国: { en: 'South Korea', ja: '韓国' },
  日本: { en: 'Japan', ja: '日本' },
  美国: { en: 'United States', ja: 'アメリカ' },
  罗马尼亚: { en: 'Romania', ja: 'ルーマニア' },
  俄罗斯: { en: 'Russia', ja: 'ロシア' },
  德国: { en: 'Germany', ja: 'ドイツ' },
  瑞典: { en: 'Sweden', ja: 'スウェーデン' },
  意大利: { en: 'Italy', ja: 'イタリア' },
  加拿大: { en: 'Canada', ja: 'カナダ' },
  波兰: { en: 'Poland', ja: 'ポーランド' },
  巴西: { en: 'Brazil', ja: 'ブラジル' },
  印度尼西亚: { en: 'Indonesia', ja: 'インドネシア' },
  英国: { en: 'United Kingdom', ja: 'イギリス' },
  乌克兰: { en: 'Ukraine', ja: 'ウクライナ' },
  土耳其: { en: 'Turkey', ja: 'トルコ' },
  印度: { en: 'India', ja: 'インド' },
  瑞士: { en: 'Switzerland', ja: 'スイス' },
  泰国: { en: 'Thailand', ja: 'タイ' },
  菲律宾: { en: 'Philippines', ja: 'フィリピン' },
  新加坡: { en: 'Singapore', ja: 'シンガポール' },
  丹麦: { en: 'Denmark', ja: 'デンマーク' },
  新西兰: { en: 'New Zealand', ja: 'ニュージーランド' },
  摩洛哥: { en: 'Morocco', ja: 'モロッコ' },
  法国: { en: 'France', ja: 'フランス' },
  澳大利亚: { en: 'Australia', ja: 'オーストラリア' },
};

const CONTINENT: Record<string, ValueText> = {
  亚洲: { en: 'Asia', ja: 'アジア' },
  欧洲: { en: 'Europe', ja: 'ヨーロッパ' },
  美洲: { en: 'Americas', ja: 'アメリカ大陸' },
  大洋洲: { en: 'Oceania', ja: 'オセアニア' },
  非洲: { en: 'Africa', ja: 'アフリカ' },
};

const SHAPE: Record<string, ValueText> = {
  对称: { en: 'Symmetric', ja: '左右対称' },
  人体工学: { en: 'Ergonomic', ja: 'エルゴノミクス' },
  非对称: { en: 'Asymmetric', ja: '非対称' },
  垂直: { en: 'Vertical', ja: 'バーティカル' },
};

const SIZE: Record<string, ValueText> = {
  小型: { en: 'Small', ja: '小型' },
  中型: { en: 'Medium', ja: '中型' },
  大型: { en: 'Large', ja: '大型' },
  指尖: { en: 'Fingertip', ja: '指先' },
};

const HAND: Record<string, ValueText> = {
  双手: { en: 'Ambidextrous', ja: '左右兼用' },
  右手: { en: 'Right-handed', ja: '右利き用' },
  左手: { en: 'Left-handed', ja: '左利き用' },
};

const HUMP: Record<string, ValueText> = {
  居中: { en: 'Centered', ja: '中央' },
  '靠后·轻微': { en: 'Rear · slight', ja: '後寄り・控えめ' },
  '靠后·中等': { en: 'Rear · medium', ja: '後寄り・標準' },
  '靠后·激进': { en: 'Rear · aggressive', ja: '後寄り・強め' },
};

/** 连接方式按「·」分段逐段翻译,数据新增组合时无需补整串映射 */
const CONNECTION_TOKENS: Record<string, ValueText> = {
  '2.4G 无线': { en: '2.4G wireless', ja: '2.4G ワイヤレス' },
  蓝牙: { en: 'Bluetooth', ja: 'Bluetooth' },
  有线: { en: 'Wired', ja: '有線' },
};

const TABLES = {
  country: COUNTRY,
  continent: CONTINENT,
  shape: SHAPE,
  size: SIZE,
  hand: HAND,
  hump: HUMP,
} satisfies Record<string, Record<string, ValueText>>;

export type MouseDataField = keyof typeof TABLES | 'connection';

function activeLanguage(): string {
  return i18n.language?.split('-')[0] ?? 'zh';
}

function lookup(table: Record<string, ValueText>, value: string): string {
  const language = activeLanguage();
  if (language === 'zh') return value;
  const entry = table[value];
  if (!entry) return value;
  return language === 'en' ? entry.en : entry.ja;
}

/**
 * 数据字段值按当前语言显示;品牌名/传感器型号等未收录值原样返回。
 * 调用组件需已被 useTranslation 订阅,语言切换才会触发重渲染。
 */
export function mouseValueText(field: MouseDataField | undefined, value: string | null | undefined): string {
  if (!field || value == null || value === '') return value ?? '';
  if (field === 'connection') {
    return value
      .split('·')
      .map((token) => lookup(CONNECTION_TOKENS, token.trim()))
      .join(' · ');
  }
  return lookup(TABLES[field], value);
}
