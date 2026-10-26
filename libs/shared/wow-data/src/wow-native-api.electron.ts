import type * as fs from 'fs';
import type { StormModule, WowNativeApi } from './wow-native-api';

/**
 * Electron implementation of {@link WowNativeApi}: Node `fs` plus StormJS loaded through `require` (`window.require` in
 * the renderer, like `mysql2` and `sqlite3`).
 */
export function createWowNativeApi(
  nodeFs: typeof fs,
  requireModule: (id: string) => unknown,
  env: Record<string, string | undefined>,
): WowNativeApi {
  let storm: StormModule | undefined;

  const loadStorm = (): StormModule => {
    // StormJS picks its (very chatty) debug build unless NODE_ENV is "production" at load time.
    const previous = env['NODE_ENV'];
    env['NODE_ENV'] = 'production';
    try {
      return requireModule('@wowserhq/stormjs') as StormModule;
    } finally {
      if (previous === undefined) {
        delete env['NODE_ENV'];
      } else {
        env['NODE_ENV'] = previous;
      }
    }
  };

  return {
    exists: (path) => nodeFs.existsSync(path),
    isDirectory: (path) => nodeFs.existsSync(path) && nodeFs.statSync(path).isDirectory(),
    readdir: (path) => nodeFs.readdirSync(path),
    readFile: (path) => new Uint8Array(nodeFs.readFileSync(path)),
    loadStorm: () => (storm ??= loadStorm()),
  };
}
