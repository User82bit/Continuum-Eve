import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import {
  ChatbotHistoryMessage,
  ChatbotService,
} from '../../../core/services/chatbot.service';

type ChatRole = 'assistant' | 'user';

interface ChatMessage {
  id: number;
  role: ChatRole;
  content: string;
  isError?: boolean;
}

@Component({
  selector: 'app-chatbot-island',
  standalone: true,
  templateUrl: './chatbot-island.html',
  styleUrl: './chatbot-island.scss',
})
export class ChatbotIsland {
  private readonly chatbotService = inject(ChatbotService);
  private readonly destroyRef = inject(DestroyRef);
  private nextMessageId = 1;

  readonly isOpen = signal(false);
  readonly isSending = signal(false);
  readonly draft = signal('');
  readonly messages = signal<ChatMessage[]>([
    {
      id: 0,
      role: 'assistant',
      content: 'Olá! Sou o chatbot do Projeto Éden. O que você gostaria de saber?',
    },
  ]);
  readonly canSend = computed(() => this.draft().trim().length > 0 && !this.isSending());

  toggle(): void {
    this.isOpen.update((open) => !open);
  }

  close(): void {
    this.isOpen.set(false);
  }

  onDraftInput(event: Event): void {
    this.draft.set((event.currentTarget as HTMLInputElement).value);
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    this.sendMessage();
  }

  private sendMessage(): void {
    const message = this.draft().trim();
    if (!message || this.isSending()) return;

    const history = this.getCompletedHistory();
    this.messages.update((current) => [
      ...current,
      { id: this.nextMessageId++, role: 'user', content: message },
    ]);
    this.draft.set('');
    this.isSending.set(true);

    this.chatbotService
      .sendMessage(message, history)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSending.set(false)),
      )
      .subscribe({
        next: (result) => {
          const reply = result?.reply?.trim();
          this.messages.update((current) => [
            ...current,
            {
              id: this.nextMessageId++,
              role: 'assistant',
              content: reply || 'Não recebi uma resposta válida do chatbot.',
            },
          ]);
        },
        error: (error: unknown) => {
          this.messages.update((current) => [
            ...current,
            {
              id: this.nextMessageId++,
              role: 'assistant',
              isError: true,
              content: this.describeError(error),
            },
          ]);
        },
      });
  }

  private getCompletedHistory(): ChatbotHistoryMessage[] {
    const transcript = this.messages().slice(1);
    const completedTurns: ChatbotHistoryMessage[] = [];

    for (let index = 0; index < transcript.length - 1; index++) {
      const userMessage = transcript[index];
      const assistantMessage = transcript[index + 1];

      if (
        userMessage.role === 'user' &&
        assistantMessage.role === 'assistant' &&
        !assistantMessage.isError
      ) {
        completedTurns.push(
          { role: 'user', content: userMessage.content },
          { role: 'assistant', content: assistantMessage.content },
        );
        index++;
      }
    }

    // O modelo tem uma janela curta de tokens: envia apenas os dois turnos mais recentes.
    return completedTurns.slice(-4);
  }

  private describeError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const payload = error.error as { error?: unknown } | null;
      if (typeof payload?.error === 'string' && payload.error.trim()) {
        return payload.error;
      }

      if (error.status === 0) {
        return 'Não consegui conectar ao Adan-Stella. Verifique se a API está em execução e se o endereço configurado está correto.';
      }

      if (error.status === 401 || error.status === 403) {
        return 'Sua sessão não foi autorizada. Entre novamente no Continuum-Eve e tente outra vez.';
      }

      if (error.status === 503) {
        return 'O chatbot está temporariamente indisponível porque o modelo ainda não foi carregado.';
      }
    }

    return 'Não foi possível enviar sua mensagem. Tente novamente.';
  }
}
