import { TestBed } from '@angular/core/testing';
import { ElectronService } from '@keira/shared/common-services';
import type * as fs from 'fs';
import { WOW_NATIVE_API } from './wow-native-api';
import { createWowNativeApi } from './wow-native-api.electron';

describe('WOW_NATIVE_API', () => {
  it('is undefined outside Electron', () => {
    TestBed.configureTestingModule({ providers: [{ provide: ElectronService, useValue: { isElectron: () => false } }] });
    expect(TestBed.inject(WOW_NATIVE_API)).toBeUndefined();
  });

  it('wraps Node fs under Electron', () => {
    const nodeFs = { existsSync: vi.fn().mockReturnValue(true) };
    window.require = vi.fn() as unknown as typeof window.require;
    window.process = { env: {} } as unknown as typeof window.process;
    TestBed.configureTestingModule({ providers: [{ provide: ElectronService, useValue: { isElectron: () => true, fs: nodeFs } }] });
    const api = TestBed.inject(WOW_NATIVE_API);
    expect(api?.exists('x')).toBe(true);
    expect(nodeFs.existsSync).toHaveBeenCalledWith('x');
  });
});

describe('createWowNativeApi', () => {
  const nodeFs = {
    existsSync: (path: string) => path !== '/missing',
    statSync: (path: string) => ({ isDirectory: () => path === '/dir' }),
    readdirSync: () => ['a', 'b'],
    readFileSync: () => Buffer.from([1, 2]),
  } as unknown as typeof fs;

  it('exposes file access', () => {
    const api = createWowNativeApi(nodeFs, vi.fn(), {});
    expect(api.exists('/dir')).toBe(true);
    expect(api.isDirectory('/dir')).toBe(true);
    expect(api.isDirectory('/file')).toBe(false);
    expect(api.isDirectory('/missing')).toBe(false);
    expect(api.readdir('/dir')).toEqual(['a', 'b']);
    expect(api.readFile('/file')).toEqual(new Uint8Array([1, 2]));
  });

  it('loads StormJS once in production mode and removes the temporary NODE_ENV', () => {
    const storm = { MPQ: {} };
    const env: Record<string, string | undefined> = {};
    const requireModule = vi.fn().mockImplementation(() => {
      expect(env['NODE_ENV']).toBe('production');
      return storm;
    });
    const api = createWowNativeApi(nodeFs, requireModule, env);

    expect(api.loadStorm()).toBe(storm);
    expect(api.loadStorm()).toBe(storm);
    expect(requireModule).toHaveBeenCalledTimes(1);
    expect(requireModule).toHaveBeenCalledWith('@wowserhq/stormjs');
    expect('NODE_ENV' in env).toBe(false);
  });

  it('restores a previous NODE_ENV even when loading fails', () => {
    const env: Record<string, string | undefined> = { NODE_ENV: 'development' };
    const api = createWowNativeApi(
      nodeFs,
      () => {
        throw new Error('missing module');
      },
      env,
    );
    expect(() => api.loadStorm()).toThrowError('missing module');
    expect(env['NODE_ENV']).toBe('development');
  });
});
