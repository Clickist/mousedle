import { describe, expect, it, beforeEach } from 'vitest';
import { Route } from 'react-router-dom';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SingleLobby from '../../src/pages/SingleLobby';
import { renderAtRoute } from '../render';

describe('SingleLobby', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to recommended easy with distinct card copy', () => {
    renderAtRoute(<SingleLobby />, { route: '/single', path: '/single' });

    const easy = screen.getByRole('button', { name: /小白/ });
    const normal = screen.getByRole('button', { name: /潮男/ });
    const hard = screen.getByRole('button', { name: /扫地僧/ });

    expect(easy).toHaveClass('active');
    expect(easy.querySelector('.single-difficulty-badge')).toHaveTextContent('推荐');
    expect(normal.querySelector('.single-difficulty-badge')).toBeNull();
    expect(hard.querySelector('.single-difficulty-badge')).toBeNull();
    expect(easy).toHaveTextContent('有热度的大牌产品，适合一般爱好者');
    expect(normal).toHaveTextContent('包含小众潮出水鼠标，适合外设潮男');
    expect(hard).toHaveTextContent('本难度连switch2 joycon都收录了，祝你好运');
  });

  it('keeps difficulty icon boxes neutral instead of event colors', () => {
    renderAtRoute(<SingleLobby />, { route: '/single', path: '/single' });

    const cards = screen.getAllByRole('button', { name: /小白|潮男|扫地僧/ });
    expect(cards).toHaveLength(3);
    for (const card of cards) {
      // 难度差异不借事件色:图标盒不再注入 --diff-color
      expect(card.style.getPropertyValue('--diff-color')).toBe('');
    }
    const recommended = screen.getByRole('button', { name: /小白/ });
    expect(recommended.querySelector('.single-difficulty-badge')).toHaveTextContent('推荐');
  });

  it('starts the selected difficulty and remembers the choice', async () => {
    const user = userEvent.setup();
    renderAtRoute(
      <SingleLobby />,
      {
        route: '/single',
        path: '/single',
        extraRoutes: (
          <Route path="/single/:mode" element={<div data-testid="game-route" />} />
        ),
      }
    );

    await user.click(screen.getByRole('button', { name: /扫地僧/ }));
    expect(screen.getByRole('button', { name: /扫地僧/ })).toHaveClass('active');
    await user.click(screen.getByRole('button', { name: /开始游戏/ }));

    expect(await screen.findByTestId('game-route')).toBeInTheDocument();
    expect(localStorage.getItem('csgofriberg.single-difficulty')).toBe('hard');
  });

  it('mobile start button remains a full-width primary action class', () => {
    renderAtRoute(<SingleLobby />, { route: '/single', path: '/single' });
    const start = screen.getByRole('button', { name: /开始游戏/ });
    expect(start).toHaveClass('btn', 'btn-lg');
  });
});
