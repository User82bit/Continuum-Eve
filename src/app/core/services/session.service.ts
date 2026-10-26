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
    const token = localStorage.getItem('auth-token');
    const storedEmail = localStorage.getItem('email');
    const email = storedEmail || this.readEmailFromToken(token);

    // Migra o e-mail para localStorage nas sessões antigas, quando o backend
    // já o tinha incluído no JWT mas a resposta de login não foi persistida.
    if (email && !storedEmail) {
      localStorage.setItem('email', email);
    }

    this.tokenSignal.set(token);
    this.isAdminSignal.set(localStorage.getItem('isAdmin') === 'true');
    this.userSignal.set({
      username: localStorage.getItem('username') || null,
      email,
      userId: localStorage.getItem('userId') || null,
      imgUrl: localStorage.getItem('imgUrl') || null,
      createAt: localStorage.getItem('dateCreate') || null
    });
  }

  private readEmailFromToken(token: string | null): string | null {
    if (!token) return null;

    try {
      const encodedPayload = token.split('.')[1];
      if (!encodedPayload) return null;

      const base64 = encodedPayload.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
      const binary = atob(padded);
      const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
      const payload = JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>;
      const email = payload['email'] ?? payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'];

      return typeof email === 'string' && email.trim() ? email.trim() : null;
    } catch {
      return null;
    }
  }

  get isAdmin() { return this.isAdminSignal(); }
  get token() { return this.tokenSignal(); }
  get user() { return this.userSignal(); }

  setSession(token: string, isAdmin: boolean, email: string | null, username: string, userId: string, imgUrl: string | null, createAt: string | null) {
    const normalizedEmail = email?.trim() || null;
    const normalizedImage = imgUrl || null;
    const normalizedUsername = username?.trim() || null;
    const normalizedUserId = userId || null;
    const normalizedCreatedAt = createAt || null;

    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('auth-token', token);
      localStorage.setItem('isAdmin', String(isAdmin));
      if (normalizedEmail) localStorage.setItem('email', normalizedEmail);
      else localStorage.removeItem('email');
      if (normalizedUsername) localStorage.setItem('username', normalizedUsername);
      else localStorage.removeItem('username');
      if (normalizedUserId) localStorage.setItem('userId', normalizedUserId);
      else localStorage.removeItem('userId');
      if (normalizedImage) localStorage.setItem('imgUrl', normalizedImage);
      else localStorage.removeItem('imgUrl');
      if (normalizedCreatedAt) localStorage.setItem('dateCreate', normalizedCreatedAt);
      else localStorage.removeItem('dateCreate');
    }

    this.tokenSignal.set(token);
    this.isAdminSignal.set(isAdmin);
    this.userSignal.set({
      username: normalizedUsername,
      email: normalizedEmail,
      userId: normalizedUserId,
      imgUrl: normalizedImage,
      createAt: normalizedCreatedAt
    });
  }

  updateProfileImage(imgUrl: string): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('imgUrl', imgUrl);
    }
    this.userSignal.update(user => ({ ...user, imgUrl }));
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
