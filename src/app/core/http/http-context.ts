import { HttpContext, HttpContextToken } from '@angular/common/http';

/** Background requests (polling) that must not toggle the global progress bar or toast errors. */
export const SILENT_REQUEST = new HttpContextToken<boolean>(() => false);

export const silent = () => new HttpContext().set(SILENT_REQUEST, true);
