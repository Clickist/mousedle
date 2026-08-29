import { describe, expect, it } from 'vitest';
import i18n from '../../src/i18n';
import { mouseValueText } from '../../src/i18n/dataValues';

describe('mouse data value display translation', () => {
  it('translates known values in English', async () => {
    await i18n.changeLanguage('en');
    expect(mouseValueText('country', '瑞士')).toBe('Switzerland');
    expect(mouseValueText('country', '中国台湾')).toBe('Taiwan, China');
    expect(mouseValueText('shape', '对称')).toBe('Symmetric');
    expect(mouseValueText('size', '中型')).toBe('Medium');
    expect(mouseValueText('hand', '双手')).toBe('Ambidextrous');
    expect(mouseValueText('hump', '靠后·中等')).toBe('Rear · medium');
    expect(mouseValueText('continent', '美洲')).toBe('Americas');
    expect(mouseValueText('connection', '2.4G 无线 · 蓝牙 · 有线')).toBe('2.4G wireless · Bluetooth · Wired');
  });

  it('translates known values in Japanese', async () => {
    await i18n.changeLanguage('ja');
    expect(mouseValueText('country', '韩国')).toBe('韓国');
    expect(mouseValueText('country', '日本')).toBe('日本');
    expect(mouseValueText('shape', '人体工学')).toBe('エルゴノミクス');
    expect(mouseValueText('hand', '右手')).toBe('右利き用');
    expect(mouseValueText('hump', '居中')).toBe('中央');
    expect(mouseValueText('connection', '蓝牙 · 有线')).toBe('Bluetooth · 有線');
  });

  it('keeps raw values in Chinese', async () => {
    await i18n.changeLanguage('zh');
    expect(mouseValueText('country', '瑞士')).toBe('瑞士');
    expect(mouseValueText('shape', '对称')).toBe('对称');
    expect(mouseValueText('connection', '2.4G 无线 · 有线')).toBe('2.4G 无线 · 有线');
  });

  it('passes through unmapped and empty values untouched', async () => {
    await i18n.changeLanguage('en');
    expect(mouseValueText('country', 'Logitech')).toBe('Logitech');
    expect(mouseValueText('country', '新未知国别')).toBe('新未知国别');
    expect(mouseValueText(undefined, '瑞士')).toBe('瑞士');
    expect(mouseValueText('country', '')).toBe('');
    expect(mouseValueText('country', null)).toBe('');
    expect(mouseValueText('shape', undefined)).toBe('');
  });
});
