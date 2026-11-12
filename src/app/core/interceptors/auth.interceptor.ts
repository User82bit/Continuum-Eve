import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const apiBaseUrl = environment.apiBaseUrl.trim();
  const token = inject(AuthService).getToken();

  // Never forward the Adan-Stella JWT to Vercel assets or unrelated APIs.
  if (!token || !apiBaseUrl) return next(req);

  let apiOrigin: string;
  let requestOrigin: string;
  try {
    apiOrigin = new URL(apiBaseUrl).origin;
    requestOrigin = new URL(req.url, apiBaseUrl).origin;
  } catch {
    return next(req);
  }

  if (requestOrigin !== apiOrigin) return next(req);

  return next(req.clone({
    setHeaders: { Authorization: `Bearer ${token}` },
  }));
};
