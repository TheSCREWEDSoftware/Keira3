import { TableRow } from '@keira/shared/constants';

export type SpawnType = 'creature' | 'gameobject';

/** A creature or gameobject spawn as the world editor sees it. */
export interface SpawnRecord {
  type: SpawnType;
  guid: number;
  entry: number;
  name: string;
  map: number;
  x: number;
  y: number;
  z: number;
  o: number;
  /** Waypoint path (creature_addon.path_id, falling back to creature_template_addon.path_id), 0 if none. */
  pathId: number;
}

export interface WaypointRecord {
  pathId: number;
  point: number;
  x: number;
  y: number;
  z: number;
  delay: number;
}

export interface Placement {
  x: number;
  y: number;
  z: number;
  o: number;
}

export type EditorTool = 'select' | 'place-creature' | 'place-gameobject' | 'add-waypoint';

export interface LayerVisibility {
  creatures: boolean;
  gameobjects: boolean;
  waypoints: boolean;
}

/** Rows as returned by the spawn and waypoint queries. */
export interface SpawnRow extends TableRow {
  guid: number;
  entry: number;
  name: string;
  map: number;
  x: number;
  y: number;
  z: number;
  o: number;
  pathId: number;
}

export interface WaypointRow extends TableRow {
  pathId: number;
  point: number;
  x: number;
  y: number;
  z: number;
  delay: number;
}

export interface TeleRow extends TableRow {
  id: number;
  name: string;
  map: number;
  x: number;
  y: number;
  z: number;
}

export const spawnKey = (type: SpawnType, guid: number): string => `${type}:${guid}`;
export const pathKey = (pathId: number): string => `path:${pathId}`;

export function parseSpawnKey(key: string): { type: SpawnType; guid: number } | undefined {
  const match = /^(creature|gameobject):(\d+)$/.exec(key);
  return match ? { type: match[1] as SpawnType, guid: Number(match[2]) } : undefined;
}

/** Paths conventionally use `guid * 10` as id (as the in-game `.wp` commands do). */
export const defaultPathId = (guid: number): number => guid * 10;

/** Half-size of the square (in yards) around the camera whose spawns are loaded. */
export const SPAWN_LOAD_RADIUS = 450;
export const SPAWN_LOAD_LIMIT = 3000;
