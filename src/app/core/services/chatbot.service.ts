import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface ChatbotReply {
  reply: string;
}

@Injectable({ providedIn: 'root' })
export class ChatbotService {
  private readonly http = inject(HttpClient);

  // Mantém o mesmo endereço local usado pelos serviços atuais do Adan-Stella.
  // Para produção, substitua pelo domínio público da API quando o backend for hospedado.
  private readonly endpoint = 'http://localhost:5171/api/chatbot/chat';

  sendMessage(message: string): Observable<ChatbotReply> {
    return this.http.post<ChatbotReply>(this.endpoint, { message });
  }
}
