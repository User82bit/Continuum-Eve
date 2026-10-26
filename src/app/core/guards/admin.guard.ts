import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { SessionService } from '../services/session.service';

export const adminGuard: CanActivateFn = () => {
  const sessionService = inject(SessionService);
  const router = inject(Router);

  if (sessionService.token && sessionService.isAdmin) {
    return true;
  }

  // A rota /access-denied não existe; devolve o usuário à área autenticada.
  return router.parseUrl(sessionService.token ? '/home' : '/login');
};
