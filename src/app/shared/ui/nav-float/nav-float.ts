import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { SessionService } from '../../../core/services/session.service';

@Component({
  selector: 'app-nav-float',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './nav-float.html',
  styleUrl: './nav-float.scss',
})
export class NavFloat {
  private sessionService = inject(SessionService);
  isAdmin = this.sessionService.isAdminSignal;
}
