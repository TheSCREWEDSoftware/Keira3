/** Minimal reader for WotLK `WDBC` client database files (fixed 4-byte fields + string block). */
export class DbcFile {
  readonly recordCount: number;
  readonly fieldCount: number;
  readonly recordSize: number;
  private readonly view: DataView;
  private readonly bytes: Uint8Array;
  private readonly stringBlockOffset: number;
  private readonly decoder = new TextDecoder('utf-8');

  private static readonly HEADER_SIZE = 20;

  constructor(bytes: Uint8Array) {
    this.bytes = bytes;
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const magic = String.fromCharCode(...bytes.subarray(0, 4));
    if (magic !== 'WDBC') {
      throw new Error(`Not a WDBC file (magic "${magic}")`);
    }
    this.recordCount = this.view.getUint32(4, true);
    this.fieldCount = this.view.getUint32(8, true);
    this.recordSize = this.view.getUint32(12, true);
    const stringBlockSize = this.view.getUint32(16, true);
    this.stringBlockOffset = DbcFile.HEADER_SIZE + this.recordCount * this.recordSize;
    if (this.stringBlockOffset + stringBlockSize > bytes.byteLength) {
      throw new Error('Truncated WDBC file');
    }
  }

  private offset(record: number, field: number): number {
    return DbcFile.HEADER_SIZE + record * this.recordSize + field * 4;
  }

  getUint(record: number, field: number): number {
    return this.view.getUint32(this.offset(record, field), true);
  }

  getInt(record: number, field: number): number {
    return this.view.getInt32(this.offset(record, field), true);
  }

  getFloat(record: number, field: number): number {
    return this.view.getFloat32(this.offset(record, field), true);
  }

  getString(record: number, field: number): string {
    const start = this.stringBlockOffset + this.getUint(record, field);
    let end = start;
    while (end < this.bytes.length && this.bytes[end] !== 0) {
      end++;
    }
    return this.decoder.decode(this.bytes.subarray(start, end));
  }
}

export interface WowMap {
  id: number;
  directory: string;
  name: string;
  /** 0 = open world, 1 = dungeon, 2 = raid, 3 = battleground, 4 = arena. */
  instanceType: number;
}

/** Map.dbc (3.3.5a layout): 0 ID, 1 Directory, 2 InstanceType, 5..20 MapName_lang. */
export function parseMapDbc(dbc: DbcFile): WowMap[] {
  const maps: WowMap[] = [];
  for (let record = 0; record < dbc.recordCount; record++) {
    let name = '';
    for (let field = 5; field <= 20 && !name; field++) {
      name = dbc.getString(record, field);
    }
    const directory = dbc.getString(record, 1);
    maps.push({ id: dbc.getUint(record, 0), directory, name: name || directory, instanceType: dbc.getUint(record, 2) });
  }
  return maps.sort((a, b) => a.id - b.id);
}
