import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { RobotContextSnapshot } from '../models/robot-context.model';

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
  // Uses HttpClient so the auth interceptor supplies the logged-in Adan-Stella JWT.
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl.replace(/\/+$/, '');

  private url(path: string): string {
    return this.baseUrl + '/api/umbrella' + path;
  }

  listChats(): Observable<{ chats: ChatSessionSummary[] }> {
    return this.http.get<{ chats: ChatSessionSummary[] }>(this.url('/chats'));
  }

  createChat(title = 'Nova conversa'): Observable<ChatSessionDetail> {
    return this.http.post<ChatSessionDetail>(this.url('/chats'), { title });
  }

  getChat(chatId: string): Observable<ChatSessionDetail> {
    return this.http.get<ChatSessionDetail>(
      this.url('/chats/' + encodeURIComponent(chatId)),
    );
  }

  deleteChat(chatId: string): Observable<{ deleted: boolean; conversation_id: string }> {
    return this.http.delete<{ deleted: boolean; conversation_id: string }>(
      this.url('/chats/' + encodeURIComponent(chatId)),
    );
  }

  sendMessage(message: string, conversationId: string, robotContext?: RobotContextSnapshot): Observable<ChatbotReply> {
    return this.http.post<ChatbotReply>(this.url('/chat'), {
      message,
      conversationId,
      maxNewTokens: 160,
      ...(robotContext ? { robotContext } : {}),
    });
  }
}
