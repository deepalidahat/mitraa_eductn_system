import { DestroyRef, Signal, computed, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { EMPTY, Observable, Subject, catchError, distinctUntilChanged, finalize, map, merge, switchMap, tap } from 'rxjs';
import { ApiError, toApiError } from '../http/api-error';

interface LoaderState<T> {
  loading: boolean;
  value: T | undefined;
  error: ApiError | null;
}

export interface Loader<T> {
  readonly value: Signal<T | undefined>;
  readonly loading: Signal<boolean>;
  readonly error: Signal<ApiError | null>;
  /** True once a value has arrived and it is an empty array. */
  readonly empty: Signal<boolean>;
  /** Refetch with the current params, keeping the current value visible meanwhile. */
  reload(): void;
  /** Replace the value locally (e.g. with what the backend returned after a save). */
  set(value: T): void;
  update(fn: (value: T) => T): void;
}

/**
 * Signal-first data loading built on RxJS.
 *
 * - `params` is reactive: whenever the signals it reads change, the previous request is cancelled
 *   (switchMap) and the old value is cleared, so e.g. switching child never shows stale data.
 * - Return `null`/`undefined` from `params` to stay idle.
 * - Must be called in an injection context (field initializer / constructor).
 */
export function loader<P, T>(params: () => P | null | undefined, fetch: (params: P) => Observable<T>): Loader<T> {
  const destroyRef = inject(DestroyRef);
  const state = signal<LoaderState<T>>({ loading: true, value: undefined, error: null });
  const paramsSig = computed(params);
  const reload$ = new Subject<void>();

  const key = (p: unknown) => JSON.stringify(p ?? null);

  merge(
    toObservable(paramsSig).pipe(
      distinctUntilChanged((a, b) => key(a) === key(b)),
      map((p) => ({ p, reset: true })),
    ),
    reload$.pipe(map(() => ({ p: untracked(paramsSig), reset: false }))),
  )
    .pipe(
      switchMap(({ p, reset }) => {
        if (p === null || p === undefined) {
          state.set({ loading: false, value: undefined, error: null });
          return EMPTY;
        }
        state.update((s) => ({ loading: true, value: reset ? undefined : s.value, error: null }));
        return fetch(p).pipe(
          tap((value) => state.set({ loading: false, value, error: null })),
          catchError((err) => {
            state.update((s) => ({ loading: false, value: s.value, error: toApiError(err) }));
            return EMPTY;
          }),
        );
      }),
      takeUntilDestroyed(destroyRef),
    )
    .subscribe();

  return {
    value: computed(() => state().value),
    loading: computed(() => state().loading),
    error: computed(() => state().error),
    empty: computed(() => {
      const v = state().value;
      return Array.isArray(v) && v.length === 0;
    }),
    reload: () => reload$.next(),
    set: (value) => state.update((s) => ({ ...s, value, error: null })),
    update: (fn) => state.update((s) => (s.value === undefined ? s : { ...s, value: fn(s.value) })),
  };
}

export interface Action<A, R> {
  readonly pending: Signal<boolean>;
  readonly error: Signal<ApiError | null>;
  /** Runs the action unless one is already in flight (prevents double submission). */
  run(arg: A, handlers?: { success?: (result: R) => void; failure?: (error: ApiError) => void }): void;
  clearError(): void;
}

/** Wraps a mutation (save / submit / publish / approve) with pending + error state. */
export function action<A, R>(fn: (arg: A) => Observable<R>): Action<A, R> {
  const destroyRef = inject(DestroyRef);
  const pending = signal(false);
  const error = signal<ApiError | null>(null);

  return {
    pending: pending.asReadonly(),
    error: error.asReadonly(),
    clearError: () => error.set(null),
    run(arg, handlers) {
      if (pending()) return;
      pending.set(true);
      error.set(null);
      fn(arg)
        .pipe(
          finalize(() => pending.set(false)),
          takeUntilDestroyed(destroyRef),
        )
        .subscribe({
          next: (result) => handlers?.success?.(result),
          error: (err) => {
            const apiError = toApiError(err);
            error.set(apiError);
            handlers?.failure?.(apiError);
          },
        });
    },
  };
}
