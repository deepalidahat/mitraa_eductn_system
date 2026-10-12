import { DOCUMENT, Injectable, effect, inject, signal } from '@angular/core';
import { StorageService } from '../state/storage.service';

export type ThemePref = 'system' | 'light' | 'dark';

export interface Preferences {
  theme: ThemePref;
  highContrast: boolean;
  reducedMotion: boolean;
  fontScale: 1 | 1.125 | 1.25;
  language: string;
}

const DEFAULTS: Preferences = { theme: 'system', highContrast: false, reducedMotion: false, fontScale: 1, language: 'en' };

/** Device-level display & accessibility preferences (WCAG 2.2 support). Not protected data. */
@Injectable({ providedIn: 'root' })
export class PreferencesService {
  private readonly storage = inject(StorageService);
  private readonly root = inject(DOCUMENT).documentElement;

  readonly prefs = signal<Preferences>({ ...DEFAULTS, ...this.storage.read<Partial<Preferences>>('prefs') });

  constructor() {
    effect(() => {
      const p = this.prefs();
      this.storage.write('prefs', p);
      if (p.theme === 'system') this.root.removeAttribute('data-theme');
      else this.root.setAttribute('data-theme', p.theme);
      this.toggle('data-contrast', p.highContrast ? 'high' : null);
      this.toggle('data-motion', p.reducedMotion ? 'reduced' : null);
      this.root.style.setProperty('--font-scale', String(p.fontScale));
      this.root.lang = p.language;
    });
  }

  set<K extends keyof Preferences>(key: K, value: Preferences[K]): void {
    this.prefs.update((p) => ({ ...p, [key]: value }));
  }

  reset(): void {
    this.prefs.set(DEFAULTS);
  }

  private toggle(attr: string, value: string | null): void {
    if (value) this.root.setAttribute(attr, value);
    else this.root.removeAttribute(attr);
  }
}
