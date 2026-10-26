import { Service, signal } from '@angular/core';

export interface WowDataPaths {
  /** WoW 3.3.5a client folder, the one containing `Wow.exe` and `Data/`. */
  clientPath: string;
  /** Optional worldserver `DataDir` (contains `dbc/`, `maps/`, `vmaps/`, `mmaps/`). */
  serverDataPath: string;
}

export const WOW_DATA_SETTINGS_KEY = 'keira3.worldEditor.paths';

@Service()
export class WowDataSettingsService {
  private readonly _paths = signal<WowDataPaths>(this.load());
  readonly paths = this._paths.asReadonly();

  isConfigured(): boolean {
    return this._paths().clientPath.trim().length > 0;
  }

  save(paths: WowDataPaths): void {
    const cleaned: WowDataPaths = { clientPath: trimPath(paths.clientPath), serverDataPath: trimPath(paths.serverDataPath) };
    this._paths.set(cleaned);
    localStorage.setItem(WOW_DATA_SETTINGS_KEY, JSON.stringify(cleaned));
  }

  private load(): WowDataPaths {
    const empty: WowDataPaths = { clientPath: '', serverDataPath: '' };
    try {
      const stored = JSON.parse(localStorage.getItem(WOW_DATA_SETTINGS_KEY) ?? '{}') as Partial<WowDataPaths>;
      return {
        clientPath: typeof stored.clientPath === 'string' ? stored.clientPath : '',
        serverDataPath: typeof stored.serverDataPath === 'string' ? stored.serverDataPath : '',
      };
    } catch {
      return empty;
    }
  }
}

/** Trims whitespace, surrounding quotes and trailing slashes (pasted Windows paths often carry them). */
export function trimPath(path: string): string {
  return path
    .trim()
    .replace(/^"(.*)"$/, '$1')
    .replace(/[\\/]+$/, '');
}
