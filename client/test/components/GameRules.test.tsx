import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import i18n from '../../src/i18n';
import { renderWithProviders } from '../render';
import GameRules from '../../src/components/GameRules';

describe('GameRules', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('zh');
  });

  it('explains historical-brand yellow feedback and current-brand priority', async () => {
    const user = userEvent.setup();
    renderWithProviders(<GameRules />);

    await user.click(screen.getByRole('button', { name: '游戏规则' }));

    expect(screen.getByText('命中历史队伍、赛区相同或数值接近')).toBeInTheDocument();
    expect(screen.getByText(/当前队伍相同显示绿色/)).toHaveTextContent('当前队伍判定优先');
  });
});
