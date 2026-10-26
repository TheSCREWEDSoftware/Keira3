import { decodeBlp, parseAdtChunks, parseWdtTiles, toArrayBuffer } from './formats';

const mocks = vi.hoisted(() => ({
  chunks: [] as { position: number[]; vertexHeights: Float32Array; holes: number; areaId: number }[],
  available: new Uint8Array(64 * 64),
  image: { width: 2, height: 1, data: [1, 2, 3, 4, 5, 6, 7, 8] },
  getImage: vi.fn(),
}));

vi.mock('@wowserhq/format', () => ({
  BLP_IMAGE_FORMAT: { IMAGE_ABGR8888: 2 },
  MapArea: class {
    load(): { chunks: typeof mocks.chunks } {
      return { chunks: mocks.chunks };
    }
  },
  Map: class {
    load(): { availableAreas: Uint8Array } {
      return { availableAreas: mocks.available };
    }
  },
  Blp: class {
    load(): { getImage: typeof mocks.getImage } {
      return { getImage: mocks.getImage };
    }
  },
}));

describe('formats', () => {
  it('extracts terrain chunks from an ADT', () => {
    const heights = new Float32Array(145);
    mocks.chunks = [{ position: [1, 2, 3], vertexHeights: heights, holes: 4, areaId: 12 }];
    expect(parseAdtChunks(new Uint8Array())).toEqual([{ position: [1, 2, 3], vertexHeights: heights, holes: 4 }]);
  });

  it('lists the tiles flagged in a WDT', () => {
    mocks.available.fill(0);
    mocks.available[48 * 64 + 32] = 1;
    mocks.available[0] = 1;
    expect(parseWdtTiles(new Uint8Array())).toEqual([
      { tx: 0, ty: 0 },
      { tx: 32, ty: 48 },
    ]);
  });

  it('decodes the top mip level of a BLP as RGBA', () => {
    mocks.getImage.mockReturnValue(mocks.image);
    const image = decodeBlp(new Uint8Array());
    expect(mocks.getImage).toHaveBeenCalledWith(0, 2);
    expect(image).toEqual({ width: 2, height: 1, data: Uint8Array.from(mocks.image.data) });
  });

  it('passes whole buffers through and copies views', () => {
    const whole = new Uint8Array([1, 2, 3]);
    expect(toArrayBuffer(whole)).toBe(whole.buffer);
    const view = whole.subarray(1);
    const copy = toArrayBuffer(view);
    expect(copy).not.toBe(whole.buffer);
    expect(Array.from(new Uint8Array(copy))).toEqual([2, 3]);
  });
});
