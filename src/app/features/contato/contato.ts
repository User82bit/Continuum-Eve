import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LayoutMainInterface } from '../../shared/layout/layout-main-interface/layout-main-interface';
import { Card } from '../../shared/ui/card/card';
import { SessionService } from '../../core/services/session.service';

@Component({
  selector: 'app-contato',
  imports: [LayoutMainInterface, Card, FormsModule],
  templateUrl: './contato.html',
  styleUrl: './contato.scss',
})
export class Contato {
  message = '';
  readonly username: string;

  constructor(
    @Inject(DOCUMENT) private readonly document: Document,
    @Inject(PLATFORM_ID) private readonly platformId: object,
    sessionService: SessionService,
  ) {
    this.username = sessionService.user.username || 'Usuário';
  }

  SetMessageSuggestions(): void {
    const message = this.message.trim();
    if (message.length < 8 || !isPlatformBrowser(this.platformId)) return;

    const subject = encodeURIComponent('Sugestão sobre o Projeto Éden');
    const body = encodeURIComponent(
      'Olá, equipe do Projeto Éden.\n\n' + message + '\n\nEnviado por: ' + this.username,
    );
    const mailto = 'mailto:contato@projecteden.com?subject=' + subject + '&body=' + body;
    this.document.defaultView?.location.assign(mailto);
  }
}
