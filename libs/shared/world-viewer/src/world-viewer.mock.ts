import { buildTerrainMesh, CHUNK_VERTEX_COUNT, TerrainMeshData, TileCoord } from '@keira/shared/wow-data';

/** A flat tile at the given height. */
export function flatTile(height = 50, tile: TileCoord = { tx: 32, ty: 48 }): TerrainMeshData {
  const origin = { x: (32 - tile.ty) * (1600 / 3), y: (32 - tile.tx) * (1600 / 3) };
  const chunks = [];
  for (let row = 0; row < 16; row++) {
    for (let col = 0; col < 16; col++) {
      chunks.push({
        position: [origin.x - (row * 100) / 3, origin.y - (col * 100) / 3, height],
        vertexHeights: new Float32Array(CHUNK_VERTEX_COUNT),
        holes: 0,
      });
    }
  }
  return buildTerrainMesh(tile, chunks);
}
