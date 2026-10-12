import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '@core/http/api.service';
import { ParentRequest } from '@core/models';
import { ContextService } from '@core/services/context.service';
import { ToastService } from '@core/services/toast.service';
import { action, loader } from '@core/state/loader';
import { Icon, LoadState, PageHeader, StatusBadge } from '@shared/ui';

/** Parent → Requests: Leave / Special Request, with status. */
@Component({
  selector: 'app-requests-page',
  imports: [ReactiveFormsModule, DatePipe, PageHeader, LoadState, StatusBadge, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <app-page-header heading="Requests" [subtitle]="'Leave and special requests for ' + (ctx.activeChild()?.name ?? 'your child') + '.'">
        <button type="button" class="btn btn--role" (click)="open.set(!open())" [attr.aria-expanded]="open()"><app-icon name="plus" [size]="16" /> {{ open() ? 'Close' : 'New request' }}</button>
      </app-page-header>

      @if (open()) {
        <section class="card" aria-labelledby="rq-t">
          <h2 id="rq-t" class="card__title">Leave / Special Request</h2>
          @if (save.error(); as err) { <p class="alert alert--danger mt-2" role="alert">{{ err.message }}</p> }
          <form class="form-grid mt-4" [formGroup]="form" (ngSubmit)="submit()" novalidate>
            <fieldset class="field span-2" style="border:0;padding:0;margin:0">
              <legend class="field__label">Type</legend>
              <div class="chip-group">
                <label class="chip" [class.is-active]="form.value.type === 'leave'"><input type="radio" class="sr-only" formControlName="type" value="leave" /> Leave</label>
                <label class="chip" [class.is-active]="form.value.type === 'special'"><input type="radio" class="sr-only" formControlName="type" value="special" /> Special request</label>
              </div>
            </fieldset>
            <div class="field"><label for="rq-from">From</label><input id="rq-from" type="date" class="input" formControlName="fromDate" /></div>
            <div class="field"><label for="rq-to">To</label><input id="rq-to" type="date" class="input" formControlName="toDate" [min]="form.value.fromDate ?? ''" /></div>
            <div class="field span-2"><label for="rq-r">Reason</label><textarea id="rq-r" class="textarea" formControlName="reason"></textarea>
              @if (form.controls.reason.invalid && form.controls.reason.touched) { <span class="field__error">Please give a reason.</span> }</div>
            <div class="form-actions span-2"><button class="btn btn--role" type="submit" [disabled]="save.pending()">{{ save.pending() ? 'Submitting…' : 'Submit request' }}</button></div>
          </form>
        </section>
      }

      <app-load-state [loader]="requests" emptyTitle="No requests yet" />
      @if (requests.value()?.length) {
        <div class="table-wrap">
          <table class="table">
            <caption class="sr-only">Requests</caption>
            <thead><tr><th scope="col">Type</th><th scope="col">Dates</th><th scope="col">Reason</th><th scope="col">Status</th><th scope="col">Note</th></tr></thead>
            <tbody>
              @for (r of requests.value(); track r.id) {
                <tr>
                  <td>{{ r.type === 'leave' ? 'Leave' : 'Special' }}</td>
                  <td>{{ r.fromDate | date: 'MMM d' }}@if (r.toDate !== r.fromDate) { – {{ r.toDate | date: 'MMM d' }} }</td>
                  <td>{{ r.reason }}</td>
                  <td><app-status [value]="r.status" /></td>
                  <td class="text-sm muted">{{ r.decisionNote ?? '—' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
})
export class RequestsPage {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  protected readonly ctx = inject(ContextService);

  protected readonly open = signal(false);
  protected readonly requests = loader(() => this.ctx.activeChildId(), (studentId) => this.api.list<ParentRequest>('requests', { studentId, _sort: 'createdAt', _order: 'desc' }));
  protected readonly form = inject(NonNullableFormBuilder).group({
    type: ['leave' as ParentRequest['type']],
    fromDate: ['', Validators.required],
    toDate: ['', Validators.required],
    reason: ['', [Validators.required, Validators.minLength(5)]],
  });
  protected readonly save = action((body: object) => this.api.post<ParentRequest>('requests', body));

  protected submit(): void {
    const v = this.form.getRawValue();
    if (this.form.invalid || v.toDate < v.fromDate) {
      this.form.markAllAsTouched();
      if (v.toDate && v.toDate < v.fromDate) this.toast.show('"To" must be on or after "From".', 'warning');
      return;
    }
    this.save.run({ ...v, studentId: this.ctx.activeChildId() }, {
      success: (r) => {
        this.requests.update((list) => [r, ...list]);
        this.open.set(false);
        this.form.reset({ type: 'leave', fromDate: '', toDate: '', reason: '' });
        this.toast.success('Request submitted.');
      },
    });
  }
}
