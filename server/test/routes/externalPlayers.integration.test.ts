import http from 'http';
import express from 'express';
import { AddressInfo } from 'net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { db } from '../../src/db/knex';
import { initDb } from '../../src/db/init';
import { errorHandler } from '../../src/middleware/common';
import { signToken, userNameFromUsername } from '../../src/middleware/auth';
import { requirePow } from '../../src/middleware/pow';
import { initRedis } from '../../src/redis';
import { getPlayer, initPlayerCache } from '../../src/services/playerCache';
import adminRoutes from '../../src/routes/admin';
import externalPlayerRoutes, { externalPlayerAuth } from '../../src/routes/externalPlayers';

let server: http.Server;
let baseUrl: string;

async function request(path: string, init: RequestInit = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  return { response, data: await response.json() };
}

describe('external player API tokens', () => {
  beforeAll(async () => {
    await initDb();
    await initRedis();
    await initPlayerCache();
    const app = express();
    app.use('/api/external', externalPlayerAuth);
    app.use(express.json());
    app.use('/api/admin', adminRoutes);
    app.use('/api/external', externalPlayerRoutes);
    app.use('/api', requirePow);
    app.use(errorHandler);
    server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    if (!server) return;
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('creates, uses, and revokes a hashed token for player mutations', async () => {
    const stamp = Date.now();
    const username = `external-api-admin-${stamp}`;
    const nickA = `external-a-${stamp}`;
    const nickB = `external-b-${stamp}`;
    const [admin] = await db('users')
      .insert({
        username,
        display_id: userNameFromUsername(username),
        password_hash: 'test',
        role: 'admin',
        token_version: 0,
      })
      .returning(['id', 'token_version']);
    const cookie = `csgofriberg_session=${signToken(admin)}`;

    try {
      const createdToken = await request('/api/admin/api-tokens', {
        method: 'POST',
        headers: { Cookie: cookie },
        body: JSON.stringify({ name: 'sync job', expiresInDays: 30 }),
      });
      expect(createdToken.response.status).toBe(201);
      expect(createdToken.data.token).toMatch(/^csgf_[A-Za-z0-9_-]{43}$/);
      expect(createdToken.data.prefix).toMatch(/^csgf_.+\.\.\.$/);

      const storedToken = await db('api_tokens').where({ id: createdToken.data.id }).first();
      expect(storedToken.token_hash).toMatch(/^[a-f0-9]{64}$/);
      expect(JSON.stringify(storedToken)).not.toContain(createdToken.data.token);

      const missingToken = await request('/api/external/players', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      expect(missingToken.response.status).toBe(401);
      expect(missingToken.data.code).toBe('API_TOKEN_REQUIRED');

      const missingExportToken = await request('/api/external/players/export');
      expect(missingExportToken.response.status).toBe(401);
      expect(missingExportToken.data.code).toBe('API_TOKEN_REQUIRED');

      const authorization = { Authorization: `Bearer ${createdToken.data.token}` };
      const createdPlayer = await request('/api/external/players', {
        method: 'POST',
        headers: authorization,
        body: JSON.stringify({
          name: nickA,
          country: 'Denmark',
          brand: 'API Team',
          weight: 25,
          length_mm: 120,
          side_buttons: 2,
          difficulties: ['hard'],
          wireless: true,
          display: { width: 63.5, height: 40, sensor: 'PAW3395', dpi: 26000 },
          is_enabled: true,
        }),
      });
      expect(createdPlayer.response.status).toBe(201);
      const mouseId = Number(createdPlayer.data.id);
      expect(getPlayer(mouseId)?.name).toBe(nickA);

      const updatedPlayer = await request(`/api/external/players/${mouseId}`, {
        method: 'PUT',
        headers: authorization,
        body: JSON.stringify({
          brand: 'Updated API Team',
          display: '{"sensor":"PAW3395","width":64,"height":40,"dpi":26000}',
          difficulties: ['hard', 'normal'],
        }),
      });
      expect(updatedPlayer.response.status).toBe(200);
      expect(getPlayer(mouseId)?.brand).toBe('Updated API Team');
      expect(await db('mouse_difficulties')
        .where({ mouse_id: mouseId })
        .orderBy('difficulty_key')
        .pluck('difficulty_key')).toEqual(['hard', 'normal']);

      const imported = await request('/api/external/players/import', {
        method: 'POST',
        headers: authorization,
        body: JSON.stringify({
          players: [
            {
              name: nickA,
              country: 'Denmark',
              brand: 'Bulk Updated',
              weight: 26,
              length_mm: 120,
              side_buttons: 3,
              wireless: true,
              display: { width: 64, height: 40, sensor: 'PAW3395', dpi: 26000 },
            },
            {
              name: nickB,
              brand: 'Razer',
              country: 'Sweden',
              weight: 23,
              length_mm: 124,
              difficulties: ['hard', 'normal'],
            },
          ],
        }),
      });
      expect(imported.response.status).toBe(200);
      expect(imported.data).toEqual({ created: 1, updated: 1 });
      expect(getPlayer(mouseId)?.brand).toBe('Bulk Updated');
      const importedPlayerId = await db('mice').where({ name: nickB }).first('id');
      expect(await db('mouse_difficulties')
        .where({ mouse_id: importedPlayerId.id })
        .orderBy('difficulty_key')
        .pluck('difficulty_key')).toEqual(['hard', 'normal']);

      const exported = await request('/api/external/players/export', {
        headers: authorization,
      });
      expect(exported.response.status).toBe(200);
      expect(exported.response.headers.get('content-disposition')).toContain('players.json');
      expect(exported.data.find((player: { name: string }) => player.name === nickA)).toEqual({
        mouseId,
        name: nickA,
        country: 'Denmark',
        continent: '',
        shape: '对称',
        size: '中型',
        brand: 'Bulk Updated',
        weight: 26,
        length_mm: 120,
        side_buttons: 3,
        difficulties: ['hard', 'normal'],
        wireless: true,
        display: { width: 64, height: 40, sensor: 'PAW3395', dpi: 26000 },
        is_enabled: true,
      });

      const revoked = await request(`/api/admin/api-tokens/${createdToken.data.id}`, {
        method: 'DELETE',
        headers: { Cookie: cookie },
      });
      expect(revoked.response.status).toBe(200);

      const afterRevoke = await request(`/api/external/players/${mouseId}`, {
        method: 'PUT',
        headers: authorization,
        body: JSON.stringify({ weight: 27 }),
      });
      expect(afterRevoke.response.status).toBe(401);
      expect(afterRevoke.data.code).toBe('API_TOKEN_INVALID');
    } finally {
      const playerIds = await db('mice').whereIn('name', [nickA, nickB]).pluck('id');
      if (playerIds.length) {
        await db('mouse_difficulties').whereIn('mouse_id', playerIds).del();
        await db('mice').whereIn('id', playerIds).del();
      }
      await db('api_tokens').where({ created_by_user_id: admin.id }).del();
      await db('users').where({ id: admin.id }).del();
    }
  });
});
