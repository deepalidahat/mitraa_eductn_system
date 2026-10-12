import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormsModule, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '@core/auth/auth.service';
import { ApiService } from '@core/http/api.service';
import { User, roleMeta } from '@core/models';
import { AppConfigService } from '@core/services/app-config.service';
import { ContextService } from '@core/services/context.service';
import { LookupService } from '@core/services/lookup.service';
import { Preferences, PreferencesService } from '@core/services/preferences.service';
import { ToastService } from '@core/services/toast.service';
import { action } from '@core/state/loader';
import { InitialsPipe } from '@shared/pipes/initials-pipe';
import { Icon, PageHeader } from '@shared/ui';

/** My Profile & Settings - shared by every role. Only self-editable fields can be changed. */
@Component({
  selector: 'app-profile-page',
  imports: [ReactiveFormsModule, FormsModule, PageHeader, Icon, InitialsPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './profile-page.html',
  styles: `
    .hero { display: flex; align-items: center; gap: var(--sp-4); }
    .avatar { display: grid; place-items: center; width: 72px; height: 72px; border-radius: 50%; background: var(--c-role); color: #fff; font-size: var(--fs-xl); font-weight: 800; flex: none; }
    .seg { display: flex; flex-wrap: wrap; gap: var(--sp-2); margin: 0; padding: 0; border: 0; }
    .seg .chip { text-transform: capitalize; }
  `,
})
export class ProfilePage {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  protected readonly lookup = inject(LookupService);
  protected readonly ctx = inject(ContextService);
  protected readonly prefs = inject(PreferencesService);
  protected readonly config = inject(AppConfigService).config;

  protected readonly user = this.auth.user;
  protected readonly meta = computed(() => roleMeta(this.auth.role()!));
  protected readonly mfaOn = computed(() => {
    const u = this.user();
    return !!u && this.config().otpEnabled && (u.mfaEnabled || this.config().mfaRoles.includes(u.role));
  });

  protected readonly scopeLines = computed(() => {
    const u = this.user();
    if (!u) return [];
    const lines = [{ label: 'Campus', value: u.campusIds.map((c) => this.lookup.campusName(c)).join(', ') }];
    if (u.classId) lines.push({ label: 'Class', value: this.lookup.className(u.classId) });
    if (u.classIds?.length) lines.push({ label: 'Classes', value: u.classIds.map((c) => this.lookup.className(c)).join(', ') });
    if (u.subjectIds?.length) lines.push({ label: 'Subjects', value: u.subjectIds.map((s) => this.lookup.subjectName(s)).join(', ') });
    if (u.childIds?.length) lines.push({ label: 'Children', value: this.ctx.children().map((c) => c.name).join(', ') });
    return lines;
  });

  protected readonly form = inject(NonNullableFormBuilder).group({
    name: [this.user()?.name ?? '', [Validators.required, Validators.minLength(3)]],
    phone: [this.user()?.phone ?? '', [Validators.pattern(/^\+?[\d\s-]{10,16}$/)]],
    language: [this.user()?.language ?? 'en'],
  });

  protected readonly save = action((body: Partial<User>) => this.api.patch<User>(`users/${this.user()!.id}`, body));

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.save.run(this.form.getRawValue(), {
      success: (u) => {
        this.auth.patchUser({ name: u.name, phone: u.phone, language: u.language });
        this.prefs.set('language', u.language ?? 'en');
        this.form.markAsPristine();
        this.toast.success('Profile updated.');
      },
    });
  }

  protected setPref<K extends keyof Preferences>(key: K, value: Preferences[K]): void {
    this.prefs.set(key, value);
  }

  protected logout(): void {
    this.auth.logout();
  }
}
