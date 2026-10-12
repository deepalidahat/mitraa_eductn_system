import { Directive, TemplateRef, ViewContainerRef, effect, inject, input } from '@angular/core';
import { AuthService } from '@core/auth/auth.service';
import { Permission } from '@core/models';

/**
 * Renders content only when the user holds the permission:  <button *appCan="'notice:publish'">
 * UX only. The API still enforces every permission.
 */
@Directive({ selector: '[appCan]' })
export class HasPermission {
  private readonly auth = inject(AuthService);
  private readonly tpl = inject(TemplateRef);
  private readonly vcr = inject(ViewContainerRef);

  readonly appCan = input.required<Permission>();
  private rendered = false;

  constructor() {
    effect(() => {
      const allowed = this.auth.permissions().has(this.appCan());
      if (allowed && !this.rendered) {
        this.vcr.createEmbeddedView(this.tpl);
        this.rendered = true;
      } else if (!allowed && this.rendered) {
        this.vcr.clear();
        this.rendered = false;
      }
    });
  }
}
