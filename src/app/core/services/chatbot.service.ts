import { HttpBackend, HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type ChatbotRole = 'assistant' | 'user';

export interface ChatbotHistoryMessage {
  role: ChatbotRole;
  content: string;
}

export interface ChatbotReply {
  reply: string;
}

export interface ChatSessionSummary {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  last_message?: string | null;
}

export interface ChatSessionMessage {
  id: number;
  role: ChatbotRole | 'system';
  content: string;
  created_at: string;
}

export interface ChatSessionDetail extends ChatSessionSummary {
  messages: ChatSessionMessage[];
}

@Injectable({ providedIn: 'root' })
export class ChatbotService {
  // Bypass authInterceptor: UmbrellA is an anonymous, separate API and must not receive
  // the Continuum-Eve JWT.
  private readonly http = new HttpClient(inject(HttpBackend));
  private readonly baseUrl = environment.umbrellaApiBaseUrl.replace(/\/+$/, '');
  private readonly ownerId = this.getOwnerId();
  private readonly headers = new HttpHeaders({ 'X-Umbrella-Owner': this.ownerId });

  private getOwnerId(): string {
    if (typeof localStorage === 'undefined') return 'continuum-ssr';
    const key = 'continuum.umbrella.owner.v1';
    let value = localStorage.getItem(key);
    if (!value) {
      value = typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : 'continuum-' + Date.now() + '-' + Math.random().toString(36).slice(2);
      localStorage.setItem(key, value);
    }
    return value;
  }

  private url(path: string): string {
    return this.baseUrl + '/api/umbrella' + path;
  }

  listChats(): Observable<{ chats: ChatSessionSummary[] }> {
    return this.http.get<{ chats: ChatSessionSummary[] }>(this.url('/chats'), {
      headers: this.headers,
    });
  }

  createChat(title = 'Nova conversa'): Observable<ChatSessionDetail> {
    return this.http.post<ChatSessionDetail>(this.url('/chats'), { title }, {
      headers: this.headers,
    });
  }

  getChat(chatId: string): Observable<ChatSessionDetail> {
    return this.http.get<ChatSessionDetail>(
      this.url('/chats/' + encodeURIComponent(chatId)),
      { headers: this.headers },
    );
  }

  deleteChat(chatId: string): Observable<{ deleted: boolean; conversation_id: string }> {
    return this.http.delete<{ deleted: boolean; conversation_id: string }>(
      this.url('/chats/' + encodeURIComponent(chatId)),
      { headers: this.headers },
    );
  }

  sendMessage(message: string, conversationId: string): Observable<ChatbotReply> {
    return this.http.post<ChatbotReply>(this.url('/chat'), {
      message,
      conversationId,
      maxNewTokens: 160,
    }, { headers: this.headers });
  }
}
