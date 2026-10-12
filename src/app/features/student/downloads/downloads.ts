import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { Material } from '@core/models';
import { LookupService } from '@core/services/lookup.service';
import { ToastService } from '@core/services/toast.service';
import { loader } from '@core/state/loader';
import { Icon, LoadState, PageHeader } from '@shared/ui';

const TYPE_ICON: Record<string, string> = { PDF: 'file', Video: 'video', PPT: 'presentation' };

/** Downloads (Study Material): list, subject filter, download / open where allowed. */
@Component({
  selector: 'app-downloads',
  imports: [DatePipe, PageHeader, LoadState, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <app-page-header heading="Downloads (Study Material)" subtitle="Notes, slides and videos shared by your teachers." />
      <div class="chip-group" role="group" aria-label="Filter by subject">
        <button type="button" class="chip" [attr.aria-pressed]="subject() === null" (click)="subject.set(null)">All subjects</button>
        @for (s of subjects(); track s) {
          <button type="button" class="chip" [attr.aria-pressed]="subject() === s" (click)="subject.set(s)">{{ lookup.subjectName(s) }}</button>
        }
      </div>
      <app-load-state [loader]="materials" emptyTitle="No study material yet" />
      <div class="grid-auto">
        @for (m of visible(); track m.id) {
          <article class="card stack-sm">
            <div class="between">
              <span class="icon-tile"><app-icon [name]="icon(m.type)" [size]="18" /></span>
              <span class="badge">{{ m.type }} · {{ m.size }}</span>
            </div>
            <h2 class="text-lg">{{ m.title }}</h2>
            <p class="text-sm muted">{{ lookup.subjectName(m.subjectId) }} · {{ m.uploadedBy }} · {{ m.uploadedAt | date: 'mediumDate' }}</p>
            @if (m.downloadable) {
              <button type="button" class="btn" (click)="download(m)"><app-icon name="download" [size]="16" /> Download</button>
            } @else {
              <button type="button" class="btn" (click)="open(m)"><app-icon name="eye" [size]="16" /> View online</button>
              <p class="text-xs muted">Download isn't allowed for this item.</p>
            }
          </article>
        }
      </div>
    </div>
  `,
})
export class Downloads {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  protected readonly lookup = inject(LookupService);

  protected readonly materials = loader(() => true, () => this.api.list<Material>('materials', { _sort: 'uploadedAt', _order: 'desc' }));
  protected readonly subject = signal<string | null>(null);
  protected readonly subjects = computed(() => [...new Set((this.materials.value() ?? []).map((m) => m.subjectId))]);
  protected readonly visible = computed(() => (this.materials.value() ?? []).filter((m) => !this.subject() || m.subjectId === this.subject()));

  protected icon(type: string): string {
    return TYPE_ICON[type] ?? 'file';
  }

  /** File storage/CDN is a backend decision; the mock produces a placeholder file. */
  protected download(m: Material): void {
    const url = URL.createObjectURL(new Blob([`${m.title}\n\nStudy material placeholder from the MiTRAA-Edu mock API.`], { type: 'text/plain' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `${m.title}.txt` });
    a.click();
    URL.revokeObjectURL(url);
  }

  protected open(m: Material): void {
    this.toast.show(`"${m.title}" would open in the secure viewer.`, 'info');
  }
}
