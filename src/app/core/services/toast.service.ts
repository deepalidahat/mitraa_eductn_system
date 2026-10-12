import { Injectable, signal } from '@angular/core';
import { Tone } from '../models';

export interface Toast {
  id: number;
  message: string;
  tone: Tone;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private seq = 0;
  private readonly _toasts = signal<Toast[]>([]);
  readonly toasts = this._toasts.asReadonly();

  show(message: string, tone: Tone = 'info', durationMs = 4500): void {
    const id = ++this.seq;
    this._toasts.update((list) => [...list.slice(-3), { id, message, tone }]);
    if (durationMs > 0) setTimeout(() => this.dismiss(id), durationMs);
  }

  success(message: string): void {
    this.show(message, 'success');
  }

  error(message: string): void {
    this.show(message, 'danger', 7000);
  }

  dismiss(id: number): void {
    this._toasts.update((list) => list.filter((t) => t.id !== id));
  }
}
