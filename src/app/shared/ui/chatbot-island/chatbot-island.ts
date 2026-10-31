import { HttpErrorResponse } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal, PLATFORM_ID } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { ChatSessionDetail, ChatSessionSummary, ChatbotService } from '../../../core/services/chatbot.service';

type ChatRole = 'assistant' | 'user';

interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  isError?: boolean;
}

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: 'Olá! Sou a UmbrellA do Projeto Éden. O que você gostaria de saber?',
};

@Component({
  selector: 'app-chatbot-island',
  standalone: true,
  templateUrl: './chatbot-island.html',
  styleUrl: './chatbot-island.scss',
})
export class ChatbotIsland {
  private readonly chatbotService = inject(ChatbotService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly isOpen = signal(false);
  readonly isSending = signal(false);
  readonly isLoadingChats = signal(false);
  readonly draft = signal('');
  readonly chats = signal<ChatSessionSummary[]>([]);
  readonly activeChatId = signal<string | null>(null);
  readonly messages = signal<ChatMessage[]>([WELCOME_MESSAGE]);
  readonly canSend = computed(() => this.draft().trim().length > 0 && !this.isSending());

  constructor() {
    if (this.isBrowser) this.loadChats();
  }

  toggle(): void {
    this.isOpen.update((open) => !open);
    if (this.isOpen() && this.isBrowser) this.loadChats();
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

  loadChats(): void {
    if (this.isLoadingChats()) return;
    this.isLoadingChats.set(true);
    this.chatbotService.listChats()
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.isLoadingChats.set(false)))
      .subscribe({
        next: (result) => {
          const chats = result?.chats ?? [];
          this.chats.set(chats);
          const current = this.activeChatId();
          if (current && chats.some((chat) => chat.id === current)) return;
          if (chats.length > 0) this.openChat(chats[0].id);
          else {
            this.activeChatId.set(null);
            this.messages.set([WELCOME_MESSAGE]);
          }
        },
        error: (error: unknown) => {
          // A falha de listagem não impede uma tentativa de iniciar uma conversa.
          console.warn('[UmbrellA] Não foi possível listar as conversas.', error);
        },
      });
  }

  createNewChat(): void {
    if (this.isSending()) return;
    this.chatbotService.createChat()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (chat) => {
          this.chats.update((current) => [chat, ...current.filter((item) => item.id !== chat.id)]);
          this.activeChatId.set(chat.id);
          this.messages.set([WELCOME_MESSAGE]);
        },
        error: (error: unknown) => this.appendError(this.describeError(error)),
      });
  }

  openChat(chatId: string): void {
    if (this.isSending() || chatId === this.activeChatId()) return;
    this.chatbotService.getChat(chatId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (chat: ChatSessionDetail) => {
          this.activeChatId.set(chat.id);
          const loaded = (chat.messages ?? [])
            .filter((message) => message.role !== 'system')
            .map((message) => ({
              id: String(message.id),
              role: message.role as ChatRole,
              content: message.content,
            }));
          this.messages.set(loaded.length ? loaded : [WELCOME_MESSAGE]);
        },
        error: (error: unknown) => this.appendError(this.describeError(error)),
      });
  }

  deleteChat(chatId: string, event: Event): void {
    event.stopPropagation();
    if (this.isSending()) return;
    this.chatbotService.deleteChat(chatId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          const remaining = this.chats().filter((chat) => chat.id !== chatId);
          this.chats.set(remaining);
          if (this.activeChatId() === chatId) {
            this.activeChatId.set(null);
            this.messages.set([WELCOME_MESSAGE]);
            if (remaining.length > 0) this.openChat(remaining[0].id);
          }
        },
        error: (error: unknown) => this.appendError(this.describeError(error)),
      });
  }

  private sendMessage(): void {
    const message = this.draft().trim();
    if (!message || this.isSending()) return;
    this.draft.set('');
    this.isSending.set(true);

    const send = (chatId: string) => {
      this.activeChatId.set(chatId);
      this.messages.update((current) => [
        ...current,
        { id: 'user-' + Date.now(), role: 'user', content: message },
      ]);
      this.chatbotService.sendMessage(message, chatId)
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          finalize(() => this.isSending.set(false)),
        )
        .subscribe({
          next: (result) => {
            this.messages.update((current) => [
              ...current,
              {
                id: 'assistant-' + Date.now(),
                role: 'assistant',
                content: result?.reply?.trim() || 'Não recebi uma resposta válida da UmbrellA.',
              },
            ]);
            this.loadChats();
          },
          error: (error: unknown) => this.appendError(this.describeError(error)),
        });
    };

    const currentId = this.activeChatId();
    if (currentId) {
      send(currentId);
      return;
    }

    this.chatbotService.createChat(message.slice(0, 64) || 'Nova conversa')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (chat) => {
          this.chats.update((current) => [chat, ...current]);
          send(chat.id);
        },
        error: (error: unknown) => {
          this.isSending.set(false);
          this.appendError(this.describeError(error));
        },
      });
  }

  private appendError(content: string): void {
    this.messages.update((current) => [
      ...current,
      { id: 'error-' + Date.now(), role: 'assistant', content, isError: true },
    ]);
  }

  private describeError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const payload = error.error as { error?: unknown; detail?: unknown } | null;
      if (typeof payload?.error === 'string' && payload.error.trim()) return payload.error;
      if (typeof payload?.detail === 'string' && payload.detail.trim()) return payload.detail;
      if (error.status === 0) {
        return 'Não consegui alcançar o Adan-Stella. Confira o endereço da API, HTTPS, CORS e se o backend está acessível pela rede.';
      }
      if (error.status === 503) {
        return 'A API do Adan-Stella respondeu, mas o runtime da UmbrellA está indisponível ou ainda não carregou o modelo.';
      }
      if (error.status === 404) return 'A conversa não foi encontrada. Atualize a lista de chats e tente novamente.';
    }
    return error instanceof Error ? error.message : 'Não foi possível concluir a operação com a UmbrellA.';
  }
}
