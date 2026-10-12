import { Injectable, computed, effect, inject, linkedSignal } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { StorageService } from '../state/storage.service';
import { LookupService } from './lookup.service';

const CHILD_KEY = 'ctx.child';
const CAMPUS_KEY = 'ctx.campus';
export const ALL_CAMPUSES = 'all';

/**
 * The authorized context the user is working in (Tenant -> Campus -> Class -> Relationship):
 * - parents: the selected child (every child page follows it)
 * - management/trustees: the selected campus (or all authorized campuses)
 * Kept per browser session and cleared on logout.
 */
@Injectable({ providedIn: 'root' })
export class ContextService {
  private readonly auth = inject(AuthService);
  private readonly lookup = inject(LookupService);
  private readonly storage = inject(StorageService);

  /** Children this guardian is authorized for (relationship layer). */
  readonly children = computed(() => {
    const ids = this.auth.user()?.childIds ?? [];
    return this.lookup.students().filter((s) => ids.includes(s.id));
  });

  readonly activeChildId = linkedSignal<string[], string | null>({
    source: () => this.children().map((c) => c.id),
    computation: (ids, previous) => {
      const preferred = previous?.value ?? this.storage.read<string>(CHILD_KEY, 'session');
      return preferred && ids.includes(preferred) ? preferred : ids[0] ?? null;
    },
  });

  readonly activeChild = computed(() => this.children().find((c) => c.id === this.activeChildId()) ?? null);

  /** Campuses this user is authorized for. */
  readonly campuses = computed(() => {
    const ids = this.auth.user()?.campusIds ?? [];
    return this.lookup.campuses().filter((c) => ids.includes(c.id));
  });

  readonly activeCampusId = linkedSignal<string[], string>({
    source: () => this.campuses().map((c) => c.id),
    computation: (ids, previous) => {
      const preferred = previous?.value ?? this.storage.read<string>(CAMPUS_KEY, 'session') ?? ALL_CAMPUSES;
      return preferred === ALL_CAMPUSES || ids.includes(preferred) ? preferred : ALL_CAMPUSES;
    },
  });

  /** Campus ids currently in scope for aggregate views. */
  readonly campusScope = computed(() => {
    const active = this.activeCampusId();
    return active === ALL_CAMPUSES ? this.campuses().map((c) => c.id) : [active];
  });

  constructor() {
    effect(() => {
      const child = this.activeChildId();
      if (child) this.storage.write(CHILD_KEY, child, 'session');
    });
    effect(() => this.storage.write(CAMPUS_KEY, this.activeCampusId(), 'session'));
    this.auth.onSessionEnd(() => this.storage.removeMatching('ctx.'));
  }

  selectChild(id: string): void {
    if (this.children().some((c) => c.id === id)) this.activeChildId.set(id);
  }

  selectCampus(id: string): void {
    if (id === ALL_CAMPUSES || this.campuses().some((c) => c.id === id)) this.activeCampusId.set(id);
  }
}
