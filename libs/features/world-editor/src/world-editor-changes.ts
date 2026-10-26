import {
  CREATURE_SPAWN_ADDON_TABLE,
  CREATURE_SPAWN_TABLE,
  CreatureSpawn,
  GAMEOBJECT_SPAWN_ADDON_TABLE,
  GAMEOBJECT_SPAWN_TABLE,
  GameobjectSpawn,
  WAYPOINT_DATA_TABLE,
} from '@keira/shared/acore-world-model';
import { squelConfig } from '@keira/shared/config';
import squel from 'squel';
import { pathKey, Placement, SpawnRecord, spawnKey, SpawnType, WaypointRecord } from './world-editor.model';

const round = (value: number): number => Math.round(value * 10_000) / 10_000;
const NEW_SPAWN_RESPAWN_SECS = 300;
const MOVEMENT_TYPE_WAYPOINT = 2;

const tableOf = (type: SpawnType): string => (type === 'creature' ? CREATURE_SPAWN_TABLE : GAMEOBJECT_SPAWN_TABLE);
const addonTableOf = (type: SpawnType): string => (type === 'creature' ? CREATURE_SPAWN_ADDON_TABLE : GAMEOBJECT_SPAWN_ADDON_TABLE);
const waypointKey = (pathId: number, point: number): string => `${pathKey(pathId)}#${point}`;

/** Yaw-only quaternion stored in gameobject.rotation0..3 (what `.gobject turn` writes). */
export function gameobjectRotation(orientation: number): { rotation0: number; rotation1: number; rotation2: number; rotation3: number } {
  return { rotation0: 0, rotation1: 0, rotation2: round(Math.sin(orientation / 2)), rotation3: round(Math.cos(orientation / 2)) };
}

function placementFields(type: SpawnType, p: Placement): Record<string, number> {
  const fields: Record<string, number> = {
    position_x: round(p.x),
    position_y: round(p.y),
    position_z: round(p.z),
    orientation: round(p.o),
  };
  return type === 'gameobject' ? { ...fields, ...gameobjectRotation(p.o) } : fields;
}

const samePlacement = (a: Placement, b: Placement): boolean =>
  round(a.x) === round(b.x) && round(a.y) === round(b.y) && round(a.z) === round(b.z) && round(a.o) === round(b.o);

/**
 * Edits made in the 3D world editor that are not saved yet. Edits on the same object merge: moving a spawn placed in
 * this session changes its INSERT, deleting it drops the INSERT, moving a spawn back to where it was drops the UPDATE.
 */
export class WorldEditorChanges {
  private readonly insertedSpawns = new Map<string, SpawnRecord>();
  private readonly movedSpawns = new Map<string, { original: SpawnRecord; current: Placement }>();
  private readonly deletedSpawns = new Map<string, SpawnRecord>();
  private readonly insertedWaypoints = new Map<string, WaypointRecord>();
  private readonly movedWaypoints = new Map<string, { original: WaypointRecord; current: WaypointRecord }>();
  private readonly deletedWaypoints = new Map<string, WaypointRecord>();
  private readonly createdPaths = new Map<number, number>();

  get count(): number {
    return (
      this.insertedSpawns.size +
      this.movedSpawns.size +
      this.deletedSpawns.size +
      this.insertedWaypoints.size +
      this.movedWaypoints.size +
      this.deletedWaypoints.size +
      this.createdPaths.size
    );
  }

  clear(): void {
    this.insertedSpawns.clear();
    this.movedSpawns.clear();
    this.deletedSpawns.clear();
    this.insertedWaypoints.clear();
    this.movedWaypoints.clear();
    this.deletedWaypoints.clear();
    this.createdPaths.clear();
  }

  // ---------------------------------------------------------------- spawns

  placeSpawn(spawn: SpawnRecord): void {
    this.insertedSpawns.set(spawnKey(spawn.type, spawn.guid), { ...spawn });
  }

  isNewSpawn(key: string): boolean {
    return this.insertedSpawns.has(key);
  }

  /** `original` is the spawn as loaded from the database (or as placed in this session). */
  moveSpawn(original: SpawnRecord, placement: Placement): void {
    const key = spawnKey(original.type, original.guid);
    const inserted = this.insertedSpawns.get(key);
    if (inserted) {
      this.insertedSpawns.set(key, { ...inserted, ...placement });
      return;
    }
    const base = this.movedSpawns.get(key)?.original ?? original;
    if (samePlacement(base, placement)) {
      this.movedSpawns.delete(key);
    } else {
      this.movedSpawns.set(key, { original: base, current: { ...placement } });
    }
  }

  deleteSpawn(spawn: SpawnRecord): void {
    const key = spawnKey(spawn.type, spawn.guid);
    if (spawn.type === 'creature') {
      this.createdPaths.delete(spawn.guid);
    }
    if (this.insertedSpawns.delete(key)) {
      return;
    }
    const original = this.movedSpawns.get(key)?.original ?? spawn;
    this.movedSpawns.delete(key);
    this.deletedSpawns.set(key, original);
  }

  /** Applies pending edits to spawns loaded from the database; new spawns of `map` are appended. */
  applyToSpawns(loaded: SpawnRecord[], map: number): SpawnRecord[] {
    const result: SpawnRecord[] = [];
    for (const spawn of loaded) {
      const key = spawnKey(spawn.type, spawn.guid);
      if (this.deletedSpawns.has(key) || this.insertedSpawns.has(key)) {
        continue;
      }
      const moved = this.movedSpawns.get(key);
      const pathId = this.createdPaths.get(spawn.guid) ?? spawn.pathId;
      result.push(moved ? { ...spawn, ...moved.current, pathId } : { ...spawn, pathId });
    }
    for (const spawn of this.insertedSpawns.values()) {
      if (spawn.map === map) {
        result.push({ ...spawn, pathId: this.createdPaths.get(spawn.guid) ?? spawn.pathId });
      }
    }
    return result;
  }

  // ---------------------------------------------------------------- paths & waypoints

  createPath(creatureGuid: number, pathId: number): void {
    this.createdPaths.set(creatureGuid, pathId);
  }

  addWaypoint(waypoint: WaypointRecord): void {
    const key = waypointKey(waypoint.pathId, waypoint.point);
    if (this.deletedWaypoints.has(key)) {
      const original = this.deletedWaypoints.get(key) as WaypointRecord;
      this.deletedWaypoints.delete(key);
      this.moveWaypoint(original, waypoint);
      return;
    }
    this.insertedWaypoints.set(key, { ...waypoint });
  }

  moveWaypoint(original: WaypointRecord, position: { x: number; y: number; z: number }): void {
    const key = waypointKey(original.pathId, original.point);
    const inserted = this.insertedWaypoints.get(key);
    if (inserted) {
      this.insertedWaypoints.set(key, { ...inserted, x: position.x, y: position.y, z: position.z });
      return;
    }
    const base = this.movedWaypoints.get(key)?.original ?? original;
    const current = { ...base, x: position.x, y: position.y, z: position.z };
    if (samePlacement({ ...base, o: 0 }, { ...current, o: 0 })) {
      this.movedWaypoints.delete(key);
    } else {
      this.movedWaypoints.set(key, { original: base, current });
    }
  }

  deleteWaypoint(waypoint: WaypointRecord): void {
    const key = waypointKey(waypoint.pathId, waypoint.point);
    if (this.insertedWaypoints.delete(key)) {
      return;
    }
    const original = this.movedWaypoints.get(key)?.original ?? waypoint;
    this.movedWaypoints.delete(key);
    this.deletedWaypoints.set(key, original);
  }

  /** Applies pending edits to the waypoints of `pathIds` loaded from the database, sorted by path and point. */
  applyToWaypoints(loaded: WaypointRecord[], pathIds: number[]): WaypointRecord[] {
    const wanted = new Set(pathIds);
    const result = new Map<string, WaypointRecord>();
    for (const waypoint of loaded) {
      const key = waypointKey(waypoint.pathId, waypoint.point);
      if (!this.deletedWaypoints.has(key)) {
        result.set(key, this.movedWaypoints.get(key)?.current ?? waypoint);
      }
    }
    for (const [key, waypoint] of this.insertedWaypoints) {
      if (wanted.has(waypoint.pathId)) {
        result.set(key, waypoint);
      }
    }
    return [...result.values()].sort((a, b) => a.pathId - b.pathId || a.point - b.point);
  }

  // ---------------------------------------------------------------- output

  /** Human readable list of the pending edits. */
  describe(): string[] {
    const label = (s: SpawnRecord): string => `${s.type} ${s.guid}${s.name ? ` (${s.name})` : ''}`;
    return [
      ...[...this.deletedSpawns.values()].map((s) => `Delete ${label(s)}`),
      ...[...this.insertedSpawns.values()].map((s) => `Place ${label(s)}`),
      ...[...this.movedSpawns.values()].map(({ original }) => `Move ${label(original)}`),
      ...[...this.createdPaths].map(([guid, pathId]) => `Create path ${pathId} for creature ${guid}`),
      ...[...this.deletedWaypoints.values()].map((w) => `Delete waypoint ${w.pathId} #${w.point}`),
      ...[...this.insertedWaypoints.values()].map((w) => `Add waypoint ${w.pathId} #${w.point}`),
      ...[...this.movedWaypoints.values()].map(({ original: w }) => `Move waypoint ${w.pathId} #${w.point}`),
    ];
  }

  toSql(): string {
    const statements: string[] = [];

    for (const spawn of this.deletedSpawns.values()) {
      statements.push(this.deleteQuery(tableOf(spawn.type), { guid: spawn.guid }));
      statements.push(this.deleteQuery(addonTableOf(spawn.type), { guid: spawn.guid }));
    }
    for (const spawn of this.insertedSpawns.values()) {
      statements.push(this.insertSpawnQuery(spawn));
    }
    for (const { original, current } of this.movedSpawns.values()) {
      statements.push(this.updateQuery(tableOf(original.type), placementFields(original.type, current), { guid: original.guid }));
    }
    for (const [guid, pathId] of this.createdPaths) {
      statements.push(
        `INSERT INTO \`${CREATURE_SPAWN_ADDON_TABLE}\` (\`guid\`, \`path_id\`) VALUES (${guid}, ${pathId}) ON DUPLICATE KEY UPDATE \`path_id\` = ${pathId};`,
      );
      statements.push(this.updateQuery(CREATURE_SPAWN_TABLE, { MovementType: MOVEMENT_TYPE_WAYPOINT }, { guid }));
    }
    for (const waypoint of this.deletedWaypoints.values()) {
      statements.push(this.deleteQuery(WAYPOINT_DATA_TABLE, { id: waypoint.pathId, point: waypoint.point }));
    }
    for (const waypoint of this.insertedWaypoints.values()) {
      const fields = {
        id: waypoint.pathId,
        point: waypoint.point,
        position_x: round(waypoint.x),
        position_y: round(waypoint.y),
        position_z: round(waypoint.z),
        delay: waypoint.delay,
      };
      statements.push(`${squel.insert(squelConfig).into(WAYPOINT_DATA_TABLE).setFields(fields).toString()};`);
    }
    for (const { original, current } of this.movedWaypoints.values()) {
      const fields = { position_x: round(current.x), position_y: round(current.y), position_z: round(current.z) };
      statements.push(this.updateQuery(WAYPOINT_DATA_TABLE, fields, { id: original.pathId, point: original.point }));
    }
    return statements.join('\n');
  }

  private insertSpawnQuery(spawn: SpawnRecord): string {
    const placement = placementFields(spawn.type, spawn);
    const row =
      spawn.type === 'creature'
        ? Object.assign(
            new CreatureSpawn(),
            { guid: spawn.guid, id: spawn.entry, map: spawn.map, spawntimesecs: NEW_SPAWN_RESPAWN_SECS },
            placement,
          )
        : Object.assign(
            new GameobjectSpawn(),
            { guid: spawn.guid, id: spawn.entry, map: spawn.map, spawntimesecs: NEW_SPAWN_RESPAWN_SECS },
            placement,
          );
    return `${squel
      .insert(squelConfig)
      .into(tableOf(spawn.type))
      .setFields({ ...row })
      .toString()};`;
  }

  private updateQuery(table: string, fields: Record<string, number>, where: Record<string, number>): string {
    const query = squel.update(squelConfig).table(table).setFields(fields);
    Object.entries(where).forEach(([field, value]) => query.where(`\`${field}\` = ${value}`));
    return `${query.toString()};`;
  }

  private deleteQuery(table: string, where: Record<string, number>): string {
    const query = squel.delete(squelConfig).from(table);
    Object.entries(where).forEach(([field, value]) => query.where(`\`${field}\` = ${value}`));
    return `${query.toString()};`;
  }
}
