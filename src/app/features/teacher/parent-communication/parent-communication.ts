import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { PtmPage } from '@features/common/ptm/ptm-page';
import { ThreadsPage } from '@features/common/threads/threads-page';
import { PageHeader, Tabs } from '@shared/ui';

/** Teacher → Parent Communication: Respond to Queries, PTM Discussions, Share Progress. */
@Component({
  selector: 'app-parent-communication',
  imports: [PageHeader, Tabs, ThreadsPage, PtmPage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <app-page-header heading="Parent Communication" subtitle="Respond to parent queries, run PTM discussions and share progress." />
      <app-tabs [tabs]="tabs" [active]="tab()" (activeChange)="tab.set($event)" label="Parent communication" />
      @switch (tab()) {
        @case ('queries') {
          <app-threads [embedded]="true" [threadTypes]="['parent-query']" composeType="parent-query" composeLabel="Message a parent"
            subtitle="Questions from parents about their child." />
        }
        @case ('ptm') { <app-ptm [embedded]="true" /> }
        @case ('share') {
          <app-threads [embedded]="true" [threadTypes]="['progress-share']" composeType="progress-share" composeLabel="Share progress"
            subtitle="Send a progress update to a student's guardian." />
        }
      }
    </div>
  `,
})
export class ParentCommunication {
  protected readonly tabs = [
    { key: 'queries', label: 'Respond to Queries' },
    { key: 'ptm', label: 'PTM Discussions' },
    { key: 'share', label: 'Share Progress' },
  ];
  protected readonly tab = signal('queries');
}
