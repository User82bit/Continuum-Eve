import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NavFloat } from '../../ui/nav-float/nav-float';
import { SessionService } from '../../../core/services/session.service';

@Component({
  selector: 'app-layout-main-interface',
  imports: [RouterLink, NavFloat],
  templateUrl: './layout-main-interface.html',
  styleUrl: './layout-main-interface.scss',
})
export class LayoutMainInterface {
  private readonly sessionService = inject(SessionService);
  readonly avatarUrl = computed(() => this.sessionService.userSignal().imgUrl);
}
