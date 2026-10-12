import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ApiService } from '@core/http/api.service';
import { Performance } from '@core/models';
import { ContextService } from '@core/services/context.service';
import { LookupService } from '@core/services/lookup.service';
import { loader } from '@core/state/loader';
import { InitialsPipe } from '@shared/pipes/initials-pipe';
import { BarChart, Icon, LoadState, PageHeader } from '@shared/ui';

/** Parent → My Child(ren): Select Child, View Profile, Academic Summary. */
@Component({
  selector: 'app-my-children',
  imports: [DatePipe, PageHeader, LoadState, BarChart, Icon, InitialsPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <app-page-header heading="My Child(ren)" subtitle="Choose a child to view. Every page follows the child you select." />

      <ul class="kids" role="radiogroup" aria-label="Select child">
        @for (c of ctx.children(); track c.id) {
          <li>
            <button type="button" role="radio" class="card card--interactive kid" [attr.aria-checked]="ctx.activeChildId() === c.id" (click)="ctx.selectChild(c.id)">
              <span class="avatar" aria-hidden="true">{{ c.name | initials }}</span>
              <span class="kid__body">
                <span class="fw-700">{{ c.name }}</span>
                <span class="text-sm muted">{{ lookup.className(c.classId) }} · {{ lookup.campusName(c.campusId) }}</span>
              </span>
              @if (ctx.activeChildId() === c.id) { <span class="badge badge--accent"><app-icon name="check" [size]="12" /> Viewing</span> }
            </button>
          </li>
        }
      </ul>

      @if (ctx.activeChild(); as c) {
        <div class="split">
          <section class="card stack" aria-labelledby="prof-t">
            <h2 id="prof-t" class="card__title">Profile</h2>
            <dl class="kv">
              <dt>Name</dt><dd>{{ c.name }}</dd>
              <dt>Class</dt><dd>{{ lookup.className(c.classId) }}</dd>
              <dt>Roll no.</dt><dd>{{ c.rollNo }}</dd>
              <dt>Campus</dt><dd>{{ lookup.campusName(c.campusId) }}</dd>
              <dt>Date of birth</dt><dd>{{ c.dob | date: 'mediumDate' }}</dd>
              <dt>Blood group</dt><dd>{{ c.bloodGroup }}</dd>
            </dl>
          </section>
          <section class="card stack" aria-labelledby="sum-t">
            <h2 id="sum-t" class="card__title">Academic Summary</h2>
            <app-load-state [loader]="perf" [skeletons]="2" [height]="40" emptyTitle="No academic data yet" />
            @if (perf.value(); as p) {
              <div class="cluster">
                <span class="badge badge--info">Overall {{ p.overall }}%</span>
                <span class="badge badge--accent">Rank #{{ p.rank }}</span>
                <span class="badge" [class.badge--success]="p.attendancePct >= 90" [class.badge--warning]="p.attendancePct < 90">Attendance {{ p.attendancePct }}%</span>
              </div>
              <app-bar-chart [data]="bars(p)" unit="%" title="Subject scores" />
            }
          </section>
        </div>
      }
    </div>
  `,
  styles: `
    .kids { display: grid; gap: var(--sp-3); grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr)); margin: 0; padding: 0; list-style: none; }
    .kid { display: flex; align-items: center; gap: var(--sp-3); width: 100%; text-align: left; cursor: pointer; font: inherit; color: inherit; }
    .kid[aria-checked='true'] { border-color: var(--c-role); box-shadow: 0 0 0 2px var(--c-role-soft); }
    .kid__body { display: grid; flex: 1; }
    .avatar { display: grid; place-items: center; width: 48px; height: 48px; border-radius: 50%; background: var(--c-role); color: #fff; font-weight: 800; flex: none; }
  `,
})
export class MyChildren {
  private readonly api = inject(ApiService);
  protected readonly ctx = inject(ContextService);
  protected readonly lookup = inject(LookupService);

  protected readonly perf = loader(() => this.ctx.activeChildId(), (id) => this.api.get<Performance>(`performance/${id}`));
  protected bars(p: Performance) {
    return p.subjects.map((s) => ({ label: s.name, value: s.score }));
  }
}
