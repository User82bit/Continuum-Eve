import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { tap, map, Observable, catchError, of } from 'rxjs';
import { AuthResponse } from '../../shared/types/auth-response.type';
import { SessionService } from './session.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private sessionService = inject(SessionService);

  // URL base do Adan-Stella
  private readonly apiUrl = 'http://localhost:5171/api/auth';
  private readonly profileApiUrl = 'http://localhost:5171/api/profile';

  // ── Register ────────────────────────────────────────────────────────────────
  register(username: string, email: string, password: string) {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/register`, { username, email, password })
      .pipe(
        map((response) => ({ ...response, email: response.email || email.trim() })),
        tap((response) => {
          this.saveSession(response);
        })
      );
  }

  // ── Login ───────────────────────────────────────────────────────────────────
  login(email: string, password: string) {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/login`, { email, password })
      .pipe(
        map((response) => ({ ...response, email: response.email || email.trim() })),
        tap((response) => {
          this.saveSession(response);
        })
      );
  }

  updateProfileImage(file: File): Observable<{ imgUrl: string }> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http.post<{ imgUrl: string }>(`${this.profileApiUrl}/avatar`, formData);
  }

  // ── Check Email Exists ──────────────────────────────────────────────────────
  checkEmailExists(email: string): Observable<boolean> {
    return this.http
      .post<{ exists: boolean }>(`${this.apiUrl}/check-email`, { email })
      .pipe(
        map(response => response.exists),
        catchError((error) => {
          console.error('Erro ao verificar e-mail:', error);
          // Distinguir erro de rede de "não encontrado" seria ideal,
          // mas seguindo a regra de não inventar APIs, retorno false apenas se for 404, 
          // ou trato o erro. Aqui simplifico para não propagar erro de rede como "inexistente".
          throw error; 
        })
      );
  }

  // ── Reset Password ──────────────────────────────────────────────────────────
  resetPassword(email: string, code: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/reset-password`, {
      email,
      code,
      newPassword
    });
  }

  // ── Logout ──────────────────────────────────────────────────────────────────
  logout(): void {
    this.sessionService.clearSession();
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────
  isLoggedIn(): boolean {
    return !!this.sessionService.token;
  }

  isAdmin(): boolean {
    return this.sessionService.isAdmin;
  }

  getToken(): string | null {
    return this.sessionService.token;
  }

  private saveSession(response: AuthResponse): void {
    this.sessionService.setSession(
        response.token, 
        response.isAdmin, 
        response.email || null,
        response.username,
        response.userId.toString(),
        response.imgUrl || null,
        response.createAt || null
    );
  }
}
