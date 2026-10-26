import { preferredPathId, parseSpawnKey, pathKey, spawnKey } from './world-editor.model';

describe('world editor keys', () => {
  it('builds and parses spawn keys', () => {
    expect(spawnKey('creature', 12)).toBe('creature:12');
    expect(parseSpawnKey('gameobject:7')).toEqual({ type: 'gameobject', guid: 7 });
    expect(parseSpawnKey('path:1#2')).toBeUndefined();
  });

  it('builds path keys and default path ids', () => {
    expect(pathKey(120)).toBe('path:120');
    expect(preferredPathId(12)).toBe(120);
  });
});
