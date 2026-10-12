import { Pipe, PipeTransform } from '@angular/core';

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
];

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

/** "in 2 days", "3 hours ago", "yesterday". Pure: recalculates only when the input changes. */
@Pipe({ name: 'relativeTime' })
export class RelativeTimePipe implements PipeTransform {
  transform(value: string | number | Date | null | undefined): string {
    if (value === null || value === undefined || value === '') return '—';
    const diffSec = (new Date(value).getTime() - Date.now()) / 1000;
    for (const [unit, sec] of UNITS) {
      if (Math.abs(diffSec) >= sec) return rtf.format(Math.round(diffSec / sec), unit);
    }
    return 'just now';
  }
}
