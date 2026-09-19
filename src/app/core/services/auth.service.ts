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

  // ── Register ────────────────────────────────────────────────────────────────
  register(username: string, email: string, password: string) {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/register`, { username, email, password })
      .pipe(
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
        tap((response) => {
          this.saveSession(response);
        })
      );
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
        response.email, // Assume email is in response, adjust if not
        response.username,
        response.userId.toString(),
        response.imgUrl,
        response.createAt
    );
  }
}
