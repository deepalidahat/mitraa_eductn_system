import { Injectable } from '@angular/core';

type Area = 'local' | 'session';

/** Storage access that never throws (private mode, blocked storage, quota). */
@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly prefix = 'mitraa.';

  read<T>(key: string, area: Area = 'local'): T | null {
    try {
      const raw = this.store(area)?.getItem(this.prefix + key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  write(key: string, value: unknown, area: Area = 'local'): void {
    try {
      this.store(area)?.setItem(this.prefix + key, JSON.stringify(value));
    } catch {
      /* storage unavailable: preference simply won't persist */
    }
  }

  remove(key: string, area?: Area): void {
    try {
      (area ? [area] : (['local', 'session'] as Area[])).forEach((a) => this.store(a)?.removeItem(this.prefix + key));
    } catch {
      /* ignore */
    }
  }

  /** Removes every key with the given prefix, e.g. all per-session context. */
  removeMatching(fragment: string): void {
    for (const area of ['local', 'session'] as Area[]) {
      try {
        const s = this.store(area);
        if (!s) continue;
        Object.keys(s)
          .filter((k) => k.startsWith(this.prefix + fragment))
          .forEach((k) => s.removeItem(k));
      } catch {
        /* ignore */
      }
    }
  }

  private store(area: Area): Storage | null {
    if (typeof window === 'undefined') return null;
    return area === 'local' ? window.localStorage : window.sessionStorage;
  }
}
