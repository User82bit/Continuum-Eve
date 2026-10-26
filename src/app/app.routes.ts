import { Routes } from '@angular/router';
import { Home } from './features/home/home';
import { Info } from './features/info/info';
import { Contato } from './features/contato/contato';
import { Controller } from './features/controller/controller';
import { Profile } from './features/profile/profile';
import { Login } from './features/pages/login/login';
import { Signup } from './features/pages/signup/signup';
import { AlteSenha } from './features/pages/alte-senha/alte-senha';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  { path: 'login', component: Login },
  { path: 'signup', component: Signup },
  { path: 'password-reset', component: AlteSenha },
  { path: 'home', component: Home, canActivate: [authGuard] },
  { path: 'info', component: Info, canActivate: [authGuard] },
  { path: 'contact', component: Contato, canActivate: [authGuard] },
  { path: 'profile', component: Profile, canActivate: [authGuard] },
  { path: 'controller', component: Controller, canActivate: [authGuard, adminGuard] },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' }
];
