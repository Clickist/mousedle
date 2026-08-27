import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AnswerOverlay, { MouseInfoTable } from '../../src/components/AnswerOverlay';
import { renderWithProviders } from '../render';

const answer = {
  name: 'friberg',
  brand: 'NIP',
  country: '瑞典',
  shape: 'Rifler',
  lengthMm: 1,
  sideButtons: 12,
};

describe('AnswerOverlay', () => {
  it('exposes dialog semantics used by keyboard focus guards', () => {
    renderWithProviders(
      <AnswerOverlay title="结算" answer={answer} actions={<button type="button">查看</button>} />
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText('friberg')).toBeInTheDocument();
  });

  it('supports desktop Escape and mobile backdrop dismiss when onClose is provided', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { container } = renderWithProviders(
      <AnswerOverlay
        title="结算"
        answer={answer}
        onClose={onClose}
        actions={<button type="button">查看</button>}
      />
    );

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);

    const overlay = container.ownerDocument.querySelector('.overlay');
    expect(overlay).toBeTruthy();
    fireEvent.mouseDown(overlay!);
    expect(onClose).toHaveBeenCalledTimes(2);

    fireEvent.mouseDown(screen.getByRole('dialog'));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('does not close when onClose is omitted (match-over flow)', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <AnswerOverlay title="整场结算" answer={answer} actions={<button type="button">再来</button>} />
    );
    await user.keyboard('{Escape}');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('shows width, height, sensor and hump from display JSON', () => {
    renderWithProviders(
      <MouseInfoTable
        answer={{
          ...answer,
          weight: 63,
          wireless: true,
          display: JSON.stringify({
            width: 63.5,
            height: 40.1,
            sensor: 'PixArt PAW3395',
            hump: '靠后·中等',
            dpi: 26000,
            polling_rate: 8000,
          }),
        }}
      />
    );

    expect(screen.getByText('63.5 mm')).toBeInTheDocument();
    expect(screen.getByText('40.1 mm')).toBeInTheDocument();
    expect(screen.getByText('PixArt PAW3395')).toBeInTheDocument();
    expect(screen.getByText('靠后·中等')).toBeInTheDocument();
    expect(screen.queryByText(/26000 DPI/)).not.toBeInTheDocument();
    expect(screen.queryByText(/8000 Hz/)).not.toBeInTheDocument();
  });

  it('shows a player\'s difficulty memberships when provided', () => {
    renderWithProviders(
      <MouseInfoTable answer={{ ...answer, difficulties: ['beginner', 'normal'] }} />
    );

    expect(screen.getByText('所属难度')).toBeInTheDocument();
    expect(screen.getByText('小白, 扫地僧')).toBeInTheDocument();
  });
});
