import { TestBed } from '@angular/core/testing';
import { MysqlQueryService } from '@keira/shared/db-layer';
import { of } from 'rxjs';
import { WorldEditorService } from './world-editor.service';

describe('WorldEditorService', () => {
  const setup = () => {
    const queryService = {
      query: vi.fn(),
      getMaxId: vi.fn(),
      getCreatureNameById: vi.fn().mockResolvedValue('Marshal McBride'),
      getGameObjectNameById: vi.fn().mockResolvedValue('Mailbox'),
    };
    TestBed.configureTestingModule({ providers: [{ provide: MysqlQueryService, useValue: queryService }] });
    return { service: TestBed.inject(WorldEditorService), queryService };
  };

  it('loads creatures and gameobjects in the area around the camera', async () => {
    const { service, queryService } = setup();
    queryService.query.mockImplementation((sql: string) =>
      of(
        sql.includes('FROM creature c')
          ? [{ guid: '1', entry: 197, name: 'Marshal', map: 0, x: 1, y: 2, z: 3, o: 0.5, pathId: 10 }]
          : [{ guid: 2, entry: 3, name: null, map: 0, x: 4, y: 5, z: 6, o: 0, pathId: 0 }],
      ),
    );

    const spawns = await service.loadSpawns(0, { x: -8913.4567, y: -137, z: 80 }, 100);

    expect(spawns).toEqual([
      { type: 'creature', guid: 1, entry: 197, name: 'Marshal', map: 0, x: 1, y: 2, z: 3, o: 0.5, pathId: 10 },
      { type: 'gameobject', guid: 2, entry: 3, name: '', map: 0, x: 4, y: 5, z: 6, o: 0, pathId: 0 },
    ]);
    const creatureSql = queryService.query.mock.calls[0][0] as string;
    expect(creatureSql).toContain('c.map = 0 AND c.position_x BETWEEN -9013.46 AND -8813.46 AND c.position_y BETWEEN -237 AND -37');
    expect(creatureSql).toContain('LEFT JOIN creature_addon ca ON ca.guid = c.guid');
    expect(creatureSql).toContain('LIMIT 3000');
  });

  it('treats missing results as empty', async () => {
    const { service, queryService } = setup();
    queryService.query.mockReturnValue(of(undefined));
    expect(await service.loadSpawns(1, { x: 0, y: 0, z: 0 })).toEqual([]);
    expect(await service.loadWaypoints([1])).toEqual([]);
    expect(await service.searchTele('x')).toEqual([]);
  });

  it('loads the waypoints of the given paths', async () => {
    const { service, queryService } = setup();
    expect(await service.loadWaypoints([])).toEqual([]);
    expect(queryService.query).not.toHaveBeenCalled();

    queryService.query.mockReturnValue(of([{ pathId: '10', point: '1', x: '1.5', y: 2, z: 3, delay: '1000' }]));
    expect(await service.loadWaypoints([10, 10, 20])).toEqual([{ pathId: 10, point: 1, x: 1.5, y: 2, z: 3, delay: 1000 }]);
    expect(queryService.query.mock.calls[0][0]).toContain('WHERE id IN (10, 20) ORDER BY id, point');
  });

  it('reads the highest guid', async () => {
    const { service, queryService } = setup();
    queryService.getMaxId.mockReturnValueOnce(of([{ max: 5300678 }])).mockReturnValueOnce(of([]));
    expect(await service.getMaxGuid('creature')).toBe(5300678);
    expect(queryService.getMaxId).toHaveBeenCalledWith('creature', 'guid');
    expect(await service.getMaxGuid('gameobject')).toBe(0);
    expect(queryService.getMaxId).toHaveBeenCalledWith('gameobject', 'guid');
  });

  it('resolves entry names', async () => {
    const { service } = setup();
    expect(await service.getEntryName('creature', 197)).toBe('Marshal McBride');
    expect(await service.getEntryName('gameobject', 1)).toBe('Mailbox');
  });

  it('searches game_tele with a bound parameter', async () => {
    const { service, queryService } = setup();
    queryService.query.mockReturnValue(of([{ id: 1, name: 'Northshire', map: 0, x: 1, y: 2, z: 3 }]));
    expect(await service.searchTele("Northshire'")).toEqual([{ id: 1, name: 'Northshire', map: 0, x: 1, y: 2, z: 3 }]);
    expect(queryService.query).toHaveBeenCalledWith(expect.stringContaining('WHERE name LIKE ?'), ["%Northshire'%"]);
  });

  it('executes SQL', async () => {
    const { service, queryService } = setup();
    queryService.query.mockReturnValue(of([]));
    await service.execute('DELETE FROM creature WHERE guid = 1;');
    expect(queryService.query).toHaveBeenCalledWith('DELETE FROM creature WHERE guid = 1;');
  });
});
