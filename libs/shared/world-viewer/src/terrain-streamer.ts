import { RgbaImage, TerrainMeshData, TileCoord, tileKey, tilesAround, WorldPosition, worldToTile } from '@keira/shared/wow-data';
import { WorldScene } from './world-scene';

/** What the streamer needs from `WowClientService`. */
export interface TerrainSource {
  getMapTiles(directory: string): Promise<TileCoord[]>;
  getTerrain(directory: string, tile: TileCoord): Promise<TerrainMeshData | undefined>;
  getMinimap(directory: string, tile: TileCoord): Promise<RgbaImage | undefined>;
}

/**
 * Keeps the ADT tiles around the camera loaded: tiles within `radius` of the centre tile are loaded nearest first,
 * tiles further than `radius + 1` are dropped. Switching map cancels pending loads.
 */
export class TerrainStreamer {
  private directory?: string;
  private available = new Map<string, TileCoord>();
  private readonly loading = new Set<string>();
  private generation = 0;

  constructor(
    private readonly source: TerrainSource,
    private readonly scene: WorldScene,
    private readonly onTileLoaded: () => void,
    private readonly radius = 1,
  ) {}

  get mapDirectory(): string | undefined {
    return this.directory;
  }

  get availableTiles(): TileCoord[] {
    return [...this.available.values()];
  }

  get pendingCount(): number {
    return this.loading.size;
  }

  async setMap(directory: string | undefined): Promise<void> {
    const generation = ++this.generation;
    this.scene.clearTerrain();
    this.loading.clear();
    this.available.clear();
    this.directory = directory;
    if (!directory) {
      return;
    }
    const tiles = await this.source.getMapTiles(directory);
    if (generation === this.generation) {
      this.available = new Map(tiles.map((tile) => [tileKey(tile), tile]));
    }
  }

  async update(center: WorldPosition): Promise<void> {
    const directory = this.directory;
    if (!directory) {
      return;
    }
    const generation = this.generation;
    const centerTile = worldToTile(center.x, center.y);

    for (const key of this.scene.terrainKeys) {
      const [tx, ty] = key.split('_').map(Number);
      if (Math.max(Math.abs(tx - centerTile.tx), Math.abs(ty - centerTile.ty)) > this.radius + 1) {
        this.scene.removeTerrainTile(key);
      }
    }

    for (const tile of tilesAround(centerTile, this.radius)) {
      const key = tileKey(tile);
      if (!this.available.has(key) || this.loading.has(key) || this.scene.hasTerrainTile(key)) {
        continue;
      }
      this.loading.add(key);
      try {
        const [mesh, image] = await Promise.all([
          this.source.getTerrain(directory, tile),
          this.source.getMinimap(directory, tile).catch(() => undefined),
        ]);
        if (mesh && generation === this.generation) {
          this.scene.setTerrainTile(mesh, image);
          this.onTileLoaded();
        }
      } catch (error) {
        console.warn(`[World Editor] Could not load tile ${directory}_${key}: ${(error as Error).message}`);
      } finally {
        this.loading.delete(key);
      }
    }
  }
}
