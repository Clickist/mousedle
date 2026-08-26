import { describe, it, expect } from 'vitest';
import { compareGuess } from '../../src/services/gameService';
import { Mouse } from '../../src/types';

function makeMouse(overrides: Partial<Mouse>): Mouse {
  return {
    id: 1,
    name: 'test',
    brand: 'Logitech',
    country: '瑞士',
    continent: '欧洲',
    shape: '对称',
    size: '中型',
    weight: 60,
    length_mm: 125,
    side_buttons: 2,
    wireless: true,
    created_at: '',
    ...overrides,
  };
}

describe('compareGuess', () => {
  const target = makeMouse({ id: 10, name: 'Logitech G Pro X Superlight 2' });

  it('猜中时所有属性 correct', () => {
    const fb = compareGuess(target, target);
    expect(fb.correct).toBe(true);
    expect(Object.values(fb.attributes).every((a) => a.level === 'correct')).toBe(true);
  });

  it('同大洲不同产地给 close', () => {
    const guess = makeMouse({ id: 2, country: '德国', continent: '欧洲' });
    expect(compareGuess(guess, target).attributes.country.level).toBe('close');
  });

  it('不同大洲的产地给 wrong', () => {
    const guess = makeMouse({ id: 2, country: '中国', continent: '亚洲' });
    const fb = compareGuess(guess, target);
    expect(fb.attributes.country.level).toBe('wrong');
  });

  it('品牌不同给 wrong,相同给 correct', () => {
    const guess = makeMouse({ id: 2, brand: 'Razer' });
    expect(compareGuess(guess, target).attributes.brand.level).toBe('wrong');
    const sameBrand = makeMouse({ id: 3, brand: 'Logitech' });
    expect(compareGuess(sameBrand, target).attributes.brand.level).toBe('correct');
  });

  it('重量相差 5g 给 close 并带方向提示', () => {
    const guess = makeMouse({ id: 2, weight: target.weight - 5 });
    const fb = compareGuess(guess, target);
    expect(fb.attributes.weight.level).toBe('close');
    // 猜的更轻,目标更重
    expect(fb.attributes.weight.hint).toBe('higher');
  });

  it('重量相差 6g 给 wrong', () => {
    const guess = makeMouse({ id: 2, weight: target.weight - 6 });
    expect(compareGuess(guess, target).attributes.weight.level).toBe('wrong');
  });

  it('长度相差 5mm 给 close 并带方向提示', () => {
    const guess = makeMouse({ id: 2, length_mm: target.length_mm - 5 });
    const fb = compareGuess(guess, target);
    expect(fb.attributes.lengthMm.level).toBe('close');
    expect(fb.attributes.lengthMm.hint).toBe('higher');
  });

  it('长度相差 6mm 给 wrong', () => {
    const guess = makeMouse({ id: 2, length_mm: target.length_mm + 6 });
    expect(compareGuess(guess, target).attributes.lengthMm.level).toBe('wrong');
  });

  it('侧键数只分对错,相差 1 也是 wrong 并带方向提示', () => {
    const guess = makeMouse({ id: 2, side_buttons: target.side_buttons + 1 });
    const fb = compareGuess(guess, target);
    expect(fb.attributes.sideButtons.level).toBe('wrong');
    expect(fb.attributes.sideButtons.hint).toBe('lower');
  });

  it('形状不同给 wrong', () => {
    const guess = makeMouse({ id: 2, shape: '人体工学' });
    expect(compareGuess(guess, target).attributes.shape.level).toBe('wrong');
  });

  it('大小档不同给 wrong', () => {
    const guess = makeMouse({ id: 2, size: '大型' });
    expect(compareGuess(guess, target).attributes.size.level).toBe('wrong');
  });

  it('无线状态不同给 wrong', () => {
    const guess = makeMouse({ id: 2, wireless: false });
    expect(compareGuess(guess, target).attributes.wireless.level).toBe('wrong');
  });
});
