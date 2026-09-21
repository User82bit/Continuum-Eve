import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { SessionService } from '../services/session.service';

export const adminGuard: CanActivateFn = (route, state) => {
  const sessionService = inject(SessionService);
  const router = inject(Router);

  if (sessionService.token && sessionService.isAdmin) {
    return true;
  }

  // Acesso negado
  router.navigate(['/access-denied']); 
  return false;
};
