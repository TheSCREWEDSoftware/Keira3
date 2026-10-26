import { DbcFile, parseMapDbc } from './dbc';
import { buildDbc } from './dbc.mock';

describe('DbcFile', () => {
  it('reads integer, float and string fields', () => {
    const floatBits = new DataView(new ArrayBuffer(4));
    floatBits.setFloat32(0, 1.5, true);
    const dbc = new DbcFile(buildDbc([[7, 'Hello', 0xffffffff, floatBits.getUint32(0, true)]]));

    expect(dbc.recordCount).toBe(1);
    expect(dbc.fieldCount).toBe(4);
    expect(dbc.recordSize).toBe(16);
    expect(dbc.getUint(0, 0)).toBe(7);
    expect(dbc.getString(0, 1)).toBe('Hello');
    expect(dbc.getInt(0, 2)).toBe(-1);
    expect(dbc.getFloat(0, 3)).toBe(1.5);
  });

  it('reads a string running to the end of the file', () => {
    const bytes = buildDbc([[1, 'abc']]);
    const truncatedTerminator = bytes.slice(0, bytes.length - 1);
    const view = new DataView(truncatedTerminator.buffer);
    view.setUint32(16, view.getUint32(16, true) - 1, true);
    expect(new DbcFile(truncatedTerminator).getString(0, 1)).toBe('abc');
  });

  it('rejects files that are not WDBC', () => {
    expect(() => new DbcFile(new TextEncoder().encode('WDB2' + '\0'.repeat(16)))).toThrowError(/Not a WDBC file/);
  });

  it('rejects truncated files', () => {
    const bytes = buildDbc([[1, 'abc']]);
    expect(() => new DbcFile(bytes.slice(0, bytes.length - 2))).toThrowError('Truncated WDBC file');
  });

  it('builds an empty file', () => {
    expect(new DbcFile(buildDbc([])).recordCount).toBe(0);
  });
});

describe('parseMapDbc', () => {
  const row = (id: number, directory: string, instanceType: number, nameField: number, name: string): (number | string)[] => {
    const fields: (number | string)[] = new Array(22).fill(0);
    fields[0] = id;
    fields[1] = directory;
    fields[2] = instanceType;
    fields[nameField] = name;
    return fields;
  };

  it('reads id, directory, instance type and the first non-empty localized name, sorted by id', () => {
    const dbc = new DbcFile(
      buildDbc([
        row(571, 'Northrend', 0, 5, 'Northrend'),
        row(0, 'Azeroth', 0, 7, 'Royaumes de l’Est'),
        row(36, 'DeadminesInstance', 1, 21, 'ignored'),
      ]),
    );
    expect(parseMapDbc(dbc)).toEqual([
      { id: 0, directory: 'Azeroth', name: 'Royaumes de l’Est', instanceType: 0 },
      { id: 36, directory: 'DeadminesInstance', name: 'DeadminesInstance', instanceType: 1 },
      { id: 571, directory: 'Northrend', name: 'Northrend', instanceType: 0 },
    ]);
  });
});
