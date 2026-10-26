import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Injectable, OnDestroy, PLATFORM_ID, inject } from '@angular/core';
import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { BehaviorSubject, Subject } from 'rxjs';
import { GamepadCommand } from '../models/gamepad-command.model';

export type RobotConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

@Injectable({ providedIn: 'root' })
export class RobotService implements OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly commandUrl = 'http://localhost:5171/api/robot/command';
  private readonly robotHubUrl = 'http://localhost:5171/robotHub';
  private readonly hubConnection: HubConnection | null;

  readonly robotData$ = new Subject<unknown>();
  readonly connectionState$ = new BehaviorSubject<RobotConnectionState>('connecting');

  constructor() {
    if (!isPlatformBrowser(this.platformId)) {
      this.hubConnection = null;
      this.connectionState$.next('disconnected');
      return;
    }

    this.hubConnection = new HubConnectionBuilder()
      .withUrl(this.robotHubUrl)
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Information)
      .build();

    this.hubConnection.on('ReceiveRobotData', (data: unknown) => {
      this.robotData$.next(data);
    });

    this.hubConnection.onreconnecting(() => {
      this.connectionState$.next('reconnecting');
    });

    this.hubConnection.onreconnected(() => {
      this.connectionState$.next('connected');
    });

    this.hubConnection.onclose(() => {
      this.connectionState$.next('disconnected');
    });

    void this.hubConnection.start()
      .then(() => this.connectionState$.next('connected'))
      .catch((error: unknown) => {
        this.connectionState$.next('disconnected');
        console.error('[RobotService] Erro ao conectar ao hub:', error);
      });
  }

  sendCommand(command: GamepadCommand): void {
    const x = Number(command.x.toFixed(2));
    const y = Number(command.y.toFixed(2));

    this.http.post(this.commandUrl, { x, y }).subscribe({
      error: (error: unknown) => console.error('[RobotService] Erro ao enviar comando:', error),
    });
  }

  ngOnDestroy(): void {
    this.robotData$.complete();
    this.connectionState$.complete();
    void this.hubConnection?.stop();
  }
}
