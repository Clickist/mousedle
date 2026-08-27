import { db } from '../db/knex';
import { parseMouseDisplay, type MouseDisplay } from './mouseDisplay';

export interface ExportedPlayer {
  mouseId: number;
  name: string;
  brand: string;
  country: string;
  continent: string;
  shape: string;
  size: string;
  weight: number;
  length_mm: number;
  side_buttons: number;
  difficulties: string[];
  wireless: boolean;
  display: MouseDisplay | null;
  is_enabled: boolean;
}

export async function exportPlayers(): Promise<ExportedPlayer[]> {
  const [players, memberships] = await Promise.all([
    db('mice')
      .select(
        'id',
        'name',
        'brand',
        'country',
        'continent',
        'shape',
        'size',
        'weight',
        'length_mm',
        'side_buttons',
        'wireless',
        'display',
        'is_enabled'
      )
      .orderBy('name'),
    db('mouse_difficulties')
      .orderBy('difficulty_key')
      .select('mouse_id', 'difficulty_key'),
  ]);
  const difficultiesByPlayer = new Map<number, string[]>();
  for (const membership of memberships) {
    const mouseId = Number(membership.mouse_id);
    const difficulties = difficultiesByPlayer.get(mouseId) ?? [];
    difficulties.push(String(membership.difficulty_key));
    difficultiesByPlayer.set(mouseId, difficulties);
  }
  return players.map((player) => ({
    mouseId: Number(player.id),
    name: String(player.name),
    brand: String(player.brand),
    country: String(player.country),
    continent: String(player.continent),
    shape: String(player.shape),
    size: String(player.size),
    weight: Number(player.weight),
    length_mm: Number(player.length_mm),
    side_buttons: Number(player.side_buttons),
    difficulties: difficultiesByPlayer.get(Number(player.id)) ?? [],
    wireless: Boolean(player.wireless),
    display: parseMouseDisplay(player.display),
    is_enabled: Boolean(player.is_enabled),
  }));
}
