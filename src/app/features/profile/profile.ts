import { DatePipe, TitleCasePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { LayoutMainInterface } from '../../shared/layout/layout-main-interface/layout-main-interface';
import { AuthService } from '../../core/services/auth.service';
import { SessionService } from '../../core/services/session.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [TitleCasePipe, DatePipe, LayoutMainInterface],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile {
  private readonly authService = inject(AuthService);
  private readonly sessionService = inject(SessionService);
  private readonly router = inject(Router);

  readonly username = this.sessionService.user.username || 'Usuário';
  readonly email = this.sessionService.user.email || 'E-mail não informado';
  readonly imgUrl = this.sessionService.user.imgUrl;
  readonly isAdmin = this.sessionService.isAdmin;
  readonly date = this.sessionService.user.createAt ? new Date(this.sessionService.user.createAt) : null;

  onLogout(): void {
    this.authService.logout();
    void this.router.navigate(['/login']);
  }
}
