import { TILE_SIZE, TileCoord, UNIT_SIZE, tileOrigin } from './coords';

/** One MCNK of an ADT: NW corner in server coordinates, the 145 MCVT heights (relative to position[2]) and hole bits. */
export interface TerrainChunk {
  position: ArrayLike<number>;
  vertexHeights: ArrayLike<number>;
  holes: number;
}

/** Geometry of a whole ADT tile in scene coordinates, with UVs spanning the tile (for its minimap texture). */
export interface TerrainMeshData {
  tile: TileCoord;
  positions: Float32Array;
  uvs: Float32Array;
  indices: Uint32Array;
  minHeight: number;
  maxHeight: number;
}

const OUTER = 9;
const INNER = 8;
const ROW_STRIDE = OUTER + INNER;
export const CHUNK_VERTEX_COUNT = OUTER * OUTER + INNER * INNER;

const outerIndex = (row: number, col: number): number => row * ROW_STRIDE + col;
const innerIndex = (row: number, col: number): number => row * ROW_STRIDE + OUTER + col;

/** Low-resolution MCNK holes: 16 bits, one per 2 × 2 block of the chunk's 8 × 8 cells. */
export function isHole(holes: number, row: number, col: number): boolean {
  return (holes & (1 << ((row >> 1) * 4 + (col >> 1)))) !== 0;
}

/**
 * Builds the terrain of one tile. Each MCVT stores 17 interleaved rows (9 outer vertices, then 8 inner ones at
 * cell centres); rows step south (−x) and columns step west→east (−y). Each cell becomes 4 triangles around its
 * centre, wound counter-clockwise when seen from above.
 */
export function buildTerrainMesh(tile: TileCoord, chunks: TerrainChunk[]): TerrainMeshData {
  const origin = tileOrigin(tile);
  const positions = new Float32Array(chunks.length * CHUNK_VERTEX_COUNT * 3);
  const uvs = new Float32Array(chunks.length * CHUNK_VERTEX_COUNT * 2);
  const indices: number[] = [];
  let minHeight = Infinity;
  let maxHeight = -Infinity;

  chunks.forEach((chunk, chunkIndex) => {
    const base = chunkIndex * CHUNK_VERTEX_COUNT;
    const [chunkX, chunkY, chunkZ] = [chunk.position[0], chunk.position[1], chunk.position[2]];

    for (let i = 0; i < CHUNK_VERTEX_COUNT; i++) {
      const row = Math.floor(i / ROW_STRIDE);
      const inRow = i % ROW_STRIDE;
      const inner = inRow >= OUTER;
      const offset = inner ? 0.5 : 0;
      const col = inner ? inRow - OUTER : inRow;

      const x = chunkX - (row + offset) * UNIT_SIZE;
      const y = chunkY - (col + offset) * UNIT_SIZE;
      const z = chunkZ + (chunk.vertexHeights[i] ?? 0);
      minHeight = Math.min(minHeight, z);
      maxHeight = Math.max(maxHeight, z);

      const p = (base + i) * 3;
      positions[p] = -y;
      positions[p + 1] = z;
      positions[p + 2] = -x;
      const t = (base + i) * 2;
      uvs[t] = (origin.y - y) / TILE_SIZE;
      uvs[t + 1] = (origin.x - x) / TILE_SIZE;
    }

    for (let row = 0; row < INNER; row++) {
      for (let col = 0; col < INNER; col++) {
        if (isHole(chunk.holes, row, col)) {
          continue;
        }
        const c = base + innerIndex(row, col);
        const tl = base + outerIndex(row, col);
        const tr = base + outerIndex(row, col + 1);
        const bl = base + outerIndex(row + 1, col);
        const br = base + outerIndex(row + 1, col + 1);
        indices.push(c, tr, tl, c, br, tr, c, bl, br, c, tl, bl);
      }
    }
  });

  return {
    tile,
    positions,
    uvs,
    indices: Uint32Array.from(indices),
    minHeight: chunks.length ? minHeight : 0,
    maxHeight: chunks.length ? maxHeight : 0,
  };
}
