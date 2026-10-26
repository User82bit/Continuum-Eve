import { DestroyRef, Component, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly destroyRef = inject(DestroyRef);

  constructor(private readonly router: Router, private readonly title: Title) {
    this.updateTitle(this.router.url);
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => this.updateTitle(event.urlAfterRedirects));
  }

  private updateTitle(url: string): void {
    const route = url.split('?')[0].split('#')[0].split('/').filter(Boolean)[0] ?? '';
    const titles: Record<string, string> = {
      login: 'Entrar',
      signup: 'Criar conta',
      home: 'Painel',
      info: 'Sobre o Éden',
      contact: 'Contato',
      controller: 'Controle do robô',
      profile: 'Perfil',
      'password-reset': 'Recuperar senha',
    };

    const pageTitle = titles[route] ?? 'Projeto Éden';
    this.title.setTitle(pageTitle === 'Projeto Éden' ? 'Continuum-Eve · Projeto Éden' : pageTitle + ' · Continuum-Eve');
  }
}
