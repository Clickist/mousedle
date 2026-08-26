import http from 'http';
import express from 'express';
import { AddressInfo } from 'net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { db } from '../../src/db/knex';
import { initDb } from '../../src/db/init';
import { errorHandler } from '../../src/middleware/common';
import { signToken, userNameFromUsername } from '../../src/middleware/auth';
import { initRedis } from '../../src/redis';
import { initPlayerCache } from '../../src/services/playerCache';
import adminRoutes from '../../src/routes/admin';
import externalPlayerRoutes, { externalPlayerAuth } from '../../src/routes/externalPlayers';

let server: http.Server;
let baseUrl: string;

async function request(path: string, init: RequestInit = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
  return { response, data: await response.json() };
}

describe('player change submissions', () => {
  beforeAll(async () => {
    await initDb();
    await initRedis();
    await initPlayerCache();
    const app = express();
    app.use('/api/external', externalPlayerAuth);
    app.use(express.json());
    app.use('/api/admin', adminRoutes);
    app.use('/api/external', externalPlayerRoutes);
    app.use(errorHandler);
    server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('stores field-level changes and protects against stale approvals', async () => {
    const stamp = Date.now();
    const username = `player-change-admin-${stamp}`;
    const name = `player-change-${stamp}`;
    const insertedAdmin = await db('users').insert({
      username,
      display_id: userNameFromUsername(username),
      password_hash: 'test',
      role: 'admin',
      token_version: 0,
    }).returning(['id', 'token_version']);
    const admin = insertedAdmin[0];
    const [mouseId] = await db('mice').insert({
      name,
      country: 'Denmark',
      brand: 'Old Team',
      weight: 24,
      length_mm: 120,
      side_buttons: 1,
      wireless: true,
      is_enabled: true,
    }).returning('id');
    const id = typeof mouseId === 'object' ? mouseId.id : mouseId;
    await db('mouse_difficulties').insert({ mouse_id: id, difficulty_key: 'normal' });
    let tokenId: number | null = null;
    let submissionId: number | null = null;
    try {
      const cookie = `csgofriberg_session=${signToken(admin)}`;
      const tokenResponse = await request('/api/admin/api-tokens', {
        method: 'POST', headers: { Cookie: cookie },
        body: JSON.stringify({ name: 'change sync', expiresInDays: 30 }),
      });
      tokenId = Number(tokenResponse.data.id);
      const authorization = { Authorization: `Bearer ${tokenResponse.data.token}` };
      const submitted = await request('/api/external/player-change-submissions', {
        method: 'POST', headers: authorization,
        body: JSON.stringify({ players: [{ mouseId: Number(id), changes: {
          brand: 'New Team', weight: 25, wireless: false,
        } }] }),
      });
      submissionId = Number(submitted.data.submissionId);
      expect(submitted.response.status).toBe(201);
      expect(submitted.data.submitted).toBe(3);
      expect((await db('mice').where({ id }).first()).brand).toBe('Old Team');

      const pending = await request(`/api/admin/player-change-submissions?status=pending&page=1&pageSize=50&search=${encodeURIComponent(name)}`, { headers: { Cookie: cookie } });
      expect(pending.data.items).toHaveLength(3);
      const ageItem = pending.data.items.find((item: { field: string }) => item.field === 'weight');
      const teamItem = pending.data.items.find((item: { field: string }) => item.field === 'brand');
      const activeItem = pending.data.items.find((item: { field: string }) => item.field === 'wireless');

      await db('mice').where({ id }).update({ brand: 'Manual Team' });
      const approved = await request('/api/admin/player-change-submissions/review', {
        method: 'POST', headers: { Cookie: cookie },
        body: JSON.stringify({ itemIds: [ageItem.id, teamItem.id], decision: 'approve' }),
      });
      expect(approved.data).toMatchObject({ approved: 1, conflict: 1 });
      expect((await db('mice').where({ id }).first()).weight).toBe(25);
      expect((await db('mice').where({ id }).first()).brand).toBe('Manual Team');

      const rejected = await request('/api/admin/player-change-submissions/review', {
        method: 'POST', headers: { Cookie: cookie },
        body: JSON.stringify({ itemIds: [activeItem.id], decision: 'reject' }),
      });
      expect(rejected.data).toMatchObject({ rejected: 1 });
      const history = await request(`/api/admin/player-change-submissions?status=all&page=1&pageSize=50&search=${encodeURIComponent(name)}`, { headers: { Cookie: cookie } });
      expect(history.data.items.map((item: { status: string }) => item.status).sort()).toEqual(['approved', 'conflict', 'rejected']);
    } finally {
      await db('mouse_change_items').where({ mouse_id: id }).del();
      if (submissionId) await db('mouse_change_submissions').where({ id: submissionId }).del();
      await db('mouse_difficulties').where({ mouse_id: id }).del();
      await db('mice').where({ id }).del();
      if (tokenId) await db('api_tokens').where({ id: tokenId }).del();
      await db('users').where({ id: admin.id }).del();
    }
  });
});
