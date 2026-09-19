import { Injectable, Inject, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class SessionService {
  isAdminSignal = signal<boolean>(false);
  tokenSignal = signal<string | null>(null);
  userSignal = signal<{
    username: string | null;
    email: string | null;
    userId: string | null;
    imgUrl: string | null;
    createAt: string | null;
  }>({
    username: null,
    email: null,
    userId: null,
    imgUrl: null,
    createAt: null
  });

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    if (isPlatformBrowser(this.platformId)) {
      this.loadFromStorage();
    }
  }

  private loadFromStorage() {
    this.tokenSignal.set(localStorage.getItem('auth-token'));
    this.isAdminSignal.set(localStorage.getItem('isAdmin') === 'true');
    this.userSignal.set({
      username: localStorage.getItem('username'),
      email: localStorage.getItem('email'),
      userId: localStorage.getItem('userId'),
      imgUrl: localStorage.getItem('imgUrl'),
      createAt: localStorage.getItem('dateCreate')
    });
  }

  get isAdmin() { return this.isAdminSignal(); }
  get token() { return this.tokenSignal(); }
  get user() { return this.userSignal(); }

  setSession(token: string, isAdmin: boolean, email: string, username: string, userId: string, imgUrl: string, createAt: string) {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('auth-token', token);
      localStorage.setItem('isAdmin', String(isAdmin));
      localStorage.setItem('email', email);
      localStorage.setItem('username', username);
      localStorage.setItem('userId', userId);
      localStorage.setItem('imgUrl', imgUrl);
      localStorage.setItem('dateCreate', createAt);
    }
    this.tokenSignal.set(token);
    this.isAdminSignal.set(isAdmin);
    this.userSignal.set({ username, email, userId, imgUrl, createAt });
  }

  clearSession() {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('auth-token');
      localStorage.removeItem('isAdmin');
      localStorage.removeItem('email');
      localStorage.removeItem('username');
      localStorage.removeItem('userId');
      localStorage.removeItem('imgUrl');
      localStorage.removeItem('dateCreate');
    }
    this.tokenSignal.set(null);
    this.isAdminSignal.set(false);
    this.userSignal.set({ username: null, email: null, userId: null, imgUrl: null, createAt: null });
  }
}
