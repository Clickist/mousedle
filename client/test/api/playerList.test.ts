import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../src/api/client';
import {
  clearPlayerListCache,
  getPlayerList,
  searchPlayerList,
  subscribePlayerList,
} from '../../src/api/playerList';

vi.mock('../../src/api/client', () => ({
  api: { get: vi.fn() },
}));

const get = vi.mocked(api.get);

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('playerList cache', () => {
  beforeEach(() => {
    clearPlayerListCache();
    localStorage.clear();
    get.mockReset();
  });

  it('returns stored players immediately and revalidates once in the background', async () => {
    const cached = [{ id: 1, name: 'cached' }];
    const updated = [{ id: 2, name: 'updated' }];
    localStorage.setItem('player-list-v2', JSON.stringify({ version: '1', players: cached }));
    const request = deferred<any>();
    get.mockReturnValue(request.promise);
    const listener = vi.fn();
    const unsubscribe = subscribePlayerList(listener);

    await expect(getPlayerList()).resolves.toEqual(cached);
    await expect(getPlayerList()).resolves.toEqual(cached);
    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith('/players/list', expect.objectContaining({
      headers: { 'If-None-Match': '"players-1"' },
    }));
    expect(listener).not.toHaveBeenCalled();

    request.resolve({ status: 200, data: { version: '2', players: updated } });
    await vi.waitFor(() => expect(listener).toHaveBeenCalledWith(updated));
    await expect(getPlayerList()).resolves.toEqual(updated);

    unsubscribe();
  });

  it('matches leet nicknames while keeping direct matches ahead of equivalents', () => {
    const players = [
      { id: 1, name: 's1mple' },
      { id: 2, name: 'simplex' },
      { id: 3, name: 'B1t' },
      { id: 4, name: 'bitwise' },
      { id: 5, name: 'f0rest' },
      { id: 6, name: 'fl1t' },
      { id: 7, name: 'lucky' },
    ];

    expect(searchPlayerList(players, 'simple').map((player) => player.name))
      .toEqual(['s1mple', 'simplex']);
    expect(searchPlayerList(players, 'bit').map((player) => player.name))
      .toEqual(['B1t', 'bitwise']);
    expect(searchPlayerList(players, 'forest').map((player) => player.name))
      .toEqual(['f0rest']);
    expect(searchPlayerList(players, 'slmple').map((player) => player.name))
      .toEqual(['s1mple']);
    expect(searchPlayerList(players, 'fllt').map((player) => player.name))
      .toEqual(['fl1t']);
    expect(searchPlayerList(players, '1ucky').map((player) => player.name))
      .toEqual(['lucky']);
    expect(searchPlayerList([{ id: 8, name: 'lily' }], 'iily'))
      .toEqual([]);
  });
});
