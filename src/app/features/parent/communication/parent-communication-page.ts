import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { PtmPage } from '@features/common/ptm/ptm-page';
import { ThreadsPage } from '@features/common/threads/threads-page';
import { PageHeader, Tabs } from '@shared/ui';

/** Parent → Communication: Message Teacher, Request PTM (within the selected child). */
@Component({
  selector: 'app-parent-communication-page',
  imports: [PageHeader, Tabs, ThreadsPage, PtmPage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <app-page-header heading="Communication" subtitle="Message your child's teachers or request a parent-teacher meeting." />
      <app-tabs [tabs]="tabs" [active]="tab()" (activeChange)="tab.set($event)" label="Communication" />
      @if (tab() === 'message') {
        <app-threads [embedded]="true" [threadTypes]="['parent-query', 'progress-share']" composeType="parent-query" composeLabel="Message teacher"
          subtitle="Conversations with teachers about the selected child." />
      } @else {
        <app-ptm [embedded]="true" [startBooking]="true" />
      }
    </div>
  `,
})
export class ParentCommunicationPage {
  protected readonly tabs = [{ key: 'message', label: 'Message Teacher' }, { key: 'ptm', label: 'Request PTM' }];
  protected readonly tab = signal('message');
}
