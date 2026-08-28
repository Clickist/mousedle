import { describe, expect, it } from 'vitest';
import { Flame, Gamepad2, GraduationCap } from 'lucide-react';
import i18n from '../../src/i18n';
import {
  difficultyDescription,
  difficultyIcon,
  difficultyLabel,
} from '../../src/utils/difficulty';

describe('difficulty helpers', () => {
  it('maps known difficulties to distinct icons', () => {
    expect(difficultyIcon('easy')).toBe(Flame);
    expect(difficultyIcon('normal')).toBe(Gamepad2);
    expect(difficultyIcon('hard')).toBe(GraduationCap);
    expect(difficultyIcon('unknown')).toBe(Gamepad2);
  });

  it('resolves localized labels and descriptions', () => {
    const t = i18n.t.bind(i18n);
    expect(difficultyLabel(t, 'easy')).toBe('小白');
    expect(difficultyDescription(t, 'easy')).toBe('有热度的大牌产品，适合一般爱好者');
    expect(difficultyLabel(t, 'normal')).toBe('潮男');
    expect(difficultyDescription(t, 'normal')).toBe('包含小众潮出水鼠标，适合外设潮男');
    expect(difficultyDescription(t, 'missing')).toBe('');
  });
});
