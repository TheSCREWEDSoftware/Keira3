import { inject, Service } from '@angular/core';
import { MysqlQueryService } from '@keira/shared/db-layer';
import { WorldPosition } from '@keira/shared/wow-data';
import { firstValueFrom } from 'rxjs';
import {
  SPAWN_LOAD_LIMIT,
  SPAWN_LOAD_RADIUS,
  SpawnRecord,
  SpawnRow,
  SpawnType,
  TeleRow,
  WaypointRecord,
  WaypointRow,
} from './world-editor.model';

const num = (value: number): number => Math.round(value * 100) / 100;

/** Database access of the world editor (reads only; writes go through the generated SQL). */
@Service()
export class WorldEditorService {
  private readonly queryService = inject(MysqlQueryService);

  /** Creatures and gameobjects of `map` in a square of `radius` yards around `center`. */
  async loadSpawns(map: number, center: WorldPosition, radius = SPAWN_LOAD_RADIUS): Promise<SpawnRecord[]> {
    const area = (alias: string): string =>
      `${alias}.map = ${map}` +
      ` AND ${alias}.position_x BETWEEN ${num(center.x - radius)} AND ${num(center.x + radius)}` +
      ` AND ${alias}.position_y BETWEEN ${num(center.y - radius)} AND ${num(center.y + radius)}`;

    const creatures =
      "SELECT c.guid, c.id AS entry, IFNULL(ct.name, '') AS name, c.map, c.position_x AS x, c.position_y AS y, c.position_z AS z, c.orientation AS o, " +
      'IF(IFNULL(ca.path_id, 0) <> 0, ca.path_id, IFNULL(cta.path_id, 0)) AS pathId ' +
      'FROM creature c ' +
      'LEFT JOIN creature_template ct ON ct.entry = c.id ' +
      'LEFT JOIN creature_addon ca ON ca.guid = c.guid ' +
      'LEFT JOIN creature_template_addon cta ON cta.entry = c.id ' +
      `WHERE ${area('c')} LIMIT ${SPAWN_LOAD_LIMIT}`;

    const gameobjects =
      "SELECT g.guid, g.id AS entry, IFNULL(gt.name, '') AS name, g.map, g.position_x AS x, g.position_y AS y, g.position_z AS z, g.orientation AS o, " +
      '0 AS pathId ' +
      'FROM gameobject g ' +
      'LEFT JOIN gameobject_template gt ON gt.entry = g.id ' +
      `WHERE ${area('g')} LIMIT ${SPAWN_LOAD_LIMIT}`;

    const [creatureRows, gameobjectRows] = await Promise.all([
      firstValueFrom(this.queryService.query<SpawnRow>(creatures)),
      firstValueFrom(this.queryService.query<SpawnRow>(gameobjects)),
    ]);
    return [...toSpawns('creature', creatureRows), ...toSpawns('gameobject', gameobjectRows)];
  }

  async loadWaypoints(pathIds: number[]): Promise<WaypointRecord[]> {
    if (pathIds.length === 0) {
      return [];
    }
    const rows = await firstValueFrom(
      this.queryService.query<WaypointRow>(
        'SELECT id AS pathId, point, position_x AS x, position_y AS y, position_z AS z, delay FROM waypoint_data ' +
          `WHERE id IN (${[...new Set(pathIds)].join(', ')}) ORDER BY id, point`,
      ),
    );
    return (rows ?? []).map((row) => ({
      pathId: Number(row.pathId),
      point: Number(row.point),
      x: Number(row.x),
      y: Number(row.y),
      z: Number(row.z),
      delay: Number(row.delay),
    }));
  }

  async getMaxGuid(type: SpawnType): Promise<number> {
    const rows = await firstValueFrom(this.queryService.getMaxId(type === 'creature' ? 'creature' : 'gameobject', 'guid'));
    return Number(rows?.[0]?.max ?? 0);
  }

  getEntryName(type: SpawnType, entry: number): Promise<string> {
    return type === 'creature' ? this.queryService.getCreatureNameById(entry) : this.queryService.getGameObjectNameById(entry);
  }

  async searchTele(text: string): Promise<TeleRow[]> {
    const rows = await firstValueFrom(
      this.queryService.query<TeleRow>(
        'SELECT id, name, map, position_x AS x, position_y AS y, position_z AS z FROM game_tele WHERE name LIKE ? ORDER BY name LIMIT 25',
        [`%${text}%`],
      ),
    );
    return rows ?? [];
  }

  async execute(sql: string): Promise<void> {
    await firstValueFrom(this.queryService.query(sql));
  }
}

function toSpawns(type: SpawnType, rows: SpawnRow[] | undefined): SpawnRecord[] {
  return (rows ?? []).map((row) => ({
    type,
    guid: Number(row.guid),
    entry: Number(row.entry),
    name: String(row.name ?? ''),
    map: Number(row.map),
    x: Number(row.x),
    y: Number(row.y),
    z: Number(row.z),
    o: Number(row.o),
    pathId: Number(row.pathId),
  }));
}
