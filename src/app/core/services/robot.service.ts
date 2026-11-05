import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Injectable, OnDestroy, PLATFORM_ID, inject } from '@angular/core';
import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { BehaviorSubject, Subject } from 'rxjs';
import { GamepadCommand } from '../models/gamepad-command.model';
import { RobotContextSnapshot } from '../models/robot-context.model';

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

  private lastTelemetryAt: string | null = null;
  private latestBattery: number | null = null;
  private latestDistance: number | null = null;
  private latestTotalPlanted: number | null = null;

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
      this.captureDashboardTelemetry(data);
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

  /**
   * Builds a small, read-only snapshot from fields already consumed by the dashboard.
   * No raw MQTT payload, camera image or motor command is forwarded to UmbrellA.
   */
  getUmbrellaContext(): RobotContextSnapshot {
    return {
      captured_at: new Date().toISOString(),
      connection_status: this.connectionState$.value,
      last_message_at: this.lastTelemetryAt,
      telemetry_received: this.lastTelemetryAt !== null,
      battery_percent: this.latestBattery,
      distance_cm: this.latestDistance,
      total_planted: this.latestTotalPlanted,
    };
  }

  private captureDashboardTelemetry(data: unknown): void {
    let payload = data;
    if (typeof payload === 'string') {
      try {
        payload = JSON.parse(payload) as unknown;
      } catch {
        return;
      }
    }

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return;
    const record = payload as Record<string, unknown>;
    let receivedKnownMetric = false;

    const distance = this.readNumber(record, ['distance', 'Distance', 'distancia', 'Distancia']);
    const battery = this.readNumber(record, [
      'battery',
      'Battery',
      'batteryPercent',
      'BatteryPercent',
      'nivelBateria',
      'NivelBateria',
    ]);
    const planted = this.readNumber(record, [
      'totalPlanted',
      'TotalPlanted',
      'plantsPlanted',
      'PlantsPlanted',
      'plantasPlantadas',
      'PlantasPlantadas',
    ]);

    if (distance !== null && distance >= 0) {
      this.latestDistance = distance;
      receivedKnownMetric = true;
    }
    if (battery !== null && battery >= 0 && battery <= 100) {
      this.latestBattery = battery;
      receivedKnownMetric = true;
    }
    if (planted !== null && planted >= 0) {
      this.latestTotalPlanted = planted;
      receivedKnownMetric = true;
    }

    if (receivedKnownMetric) this.lastTelemetryAt = new Date().toISOString();
  }

  private readNumber(record: Record<string, unknown>, keys: string[]): number | null {
    for (const key of keys) {
      const value = record[key];
      if (value === null || value === undefined || value === '') continue;
      const numericValue = typeof value === 'number' ? value : Number(value);
      if (Number.isFinite(numericValue)) return Math.round(numericValue);
    }
    return null;
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
