import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NavFloat } from '../../ui/nav-float/nav-float';

@Component({
  selector: 'app-layout-main-interface',
  imports: [RouterLink, NavFloat],
  templateUrl: './layout-main-interface.html',
  styleUrl: './layout-main-interface.scss',
})
export class LayoutMainInterface {}
