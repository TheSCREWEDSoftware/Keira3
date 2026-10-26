import { inject, InjectionToken } from '@angular/core';
import { ElectronService } from '@keira/shared/common-services';
import { createWowNativeApi } from './wow-native-api.electron';

/** Subset of `@wowserhq/stormjs` (StormLib compiled to WebAssembly) used by Keira. */
export interface StormFile {
  read(): Uint8Array;
  close(): void;
}

export interface StormArchive {
  hasFile(name: string): boolean;
  openFile(name: string): StormFile;
  close(): void;
}

export interface StormModule {
  FS: {
    filesystems: { NODEFS: unknown };
    mkdir(path: string): void;
    mount(type: unknown, options: { root: string }, mountpoint: string): void;
    unmount(mountpoint: string): void;
  };
  MPQ: { open(path: string, mode: string): Promise<StormArchive> };
}

/** Local file access needed to read game data. Only available under Electron. */
export interface WowNativeApi {
  exists(path: string): boolean;
  isDirectory(path: string): boolean;
  readdir(path: string): string[];
  readFile(path: string): Uint8Array;
  loadStorm(): StormModule;
}

export const WOW_NATIVE_API = new InjectionToken<WowNativeApi | undefined>('WOW_NATIVE_API', {
  providedIn: 'root',
  factory: () => {
    const electronService = inject(ElectronService);
    return electronService.isElectron() ? createWowNativeApi(electronService.fs, window.require, window.process.env) : undefined;
  },
});
