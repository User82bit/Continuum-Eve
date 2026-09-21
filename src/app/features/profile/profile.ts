import { DatePipe, TitleCasePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterLink } from "@angular/router";
import { NavFloat } from '../../shared/ui/nav-float/nav-float';
import { AuthService } from '../../core/services/auth.service'; // Ajuste o caminho se necessário

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [TitleCasePipe, DatePipe, NavFloat],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile {
  // Injeção de dependência usando o recurso do Angular (inject)
  private authService = inject(AuthService);
  private router = inject(Router);

  username = localStorage.getItem('username') || 'Usuário';
  isAdmin  = localStorage.getItem('isAdmin') === 'true';
  
  private dateStr = localStorage.getItem('dateCreate');
  date: Date | null = this.dateStr ? new Date(this.dateStr) : null;
 
  badge = this.isAdmin ? 'Administrador' : 'Membro';

  // Função que será disparada ao clicar no botão
  onLogout(): void {
    // 1. Limpa os dados de autenticação através do serviço que criamos
    this.authService.logout();

    // 2. Redireciona o usuário para a tela de login imediatamente
    this.router.navigate(['/login']);
  }
}