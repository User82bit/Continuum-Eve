import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import {
  EffectRef,
  Injectable,
  OnDestroy,
  PLATFORM_ID,
  effect,
  inject,
} from '@angular/core';
import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from '@microsoft/signalr';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { GamepadCommand } from '../models/gamepad-command.model';
import type { RobotContextSnapshot } from '../models/robot-context.model';
import { SessionService } from './session.service';

export type RobotConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

export interface RobotTelemetrySnapshot {
  receivedAt: string;
  batteryPercent: number | null;
  distanceCm: number | null;
  totalPlanted: number | null;
}

@Injectable({ providedIn: 'root' })
export class RobotService implements OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly sessionService = inject(SessionService);
  private readonly apiBaseUrl = environment.apiBaseUrl.replace(/\/+$/, '');
  private readonly commandUrl = `${this.apiBaseUrl}/api/robot/command`;
  private readonly robotHubUrl = `${this.apiBaseUrl}/robotHub`;
  private readonly hubConnection: HubConnection | null;
  private readonly sessionEffect: EffectRef | null = null;
  private hubStarting = false;

  readonly telemetry$ = new BehaviorSubject<RobotTelemetrySnapshot | null>(null);
  readonly connectionState$ = new BehaviorSubject<RobotConnectionState>('disconnected');

  private lastTelemetryAt: string | null = null;
  private latestBattery: number | null = null;
  private latestDistance: number | null = null;
  private latestTotalPlanted: number | null = null;

  constructor() {
    if (!isPlatformBrowser(this.platformId)) {
      this.hubConnection = null;
      return;
    }

    this.hubConnection = new HubConnectionBuilder()
      .withUrl(this.robotHubUrl, {
        // The backend accepts access_token only on /robotHub and /controllerHub.
        accessTokenFactory: () => this.sessionService.token ?? '',
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    this.hubConnection.on('ReceiveRobotData', (data: unknown) => {
      this.captureDashboardTelemetry(data);
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

    // RobotHub is AdminOnly. Wait for the authenticated admin session instead
    // of making an unauthenticated connection during application startup.
    this.sessionEffect = effect(() => {
      const token = this.sessionService.tokenSignal();
      const isAdmin = this.sessionService.isAdminSignal();
      if (token && isAdmin) this.startHub();
      else this.stopHub();
    });
  }

  private startHub(): void {
    const hub = this.hubConnection;
    if (!hub || this.hubStarting) return;
    if (hub.state !== HubConnectionState.Disconnected) return;

    this.hubStarting = true;
    this.connectionState$.next('connecting');
    void hub.start()
      .then(() => this.connectionState$.next('connected'))
      .catch((error: unknown) => {
        this.connectionState$.next('disconnected');
        console.error('[RobotService] Erro ao conectar ao hub autenticado:', error);
      })
      .finally(() => {
        this.hubStarting = false;
        if (this.sessionService.token && this.sessionService.isAdmin &&
            hub.state === HubConnectionState.Disconnected) {
          // A session may have changed while a previous connection was starting.
          this.startHub();
        }
      });
  }

  private stopHub(): void {
    const hub = this.hubConnection;
    if (!hub || hub.state === HubConnectionState.Disconnected ||
        hub.state === HubConnectionState.Disconnecting) {
      this.connectionState$.next('disconnected');
      return;
    }

    void hub.stop()
      .catch((error: unknown) => console.warn('[RobotService] Falha ao encerrar o hub:', error))
      .finally(() => {
        this.connectionState$.next('disconnected');
        if (this.sessionService.token && this.sessionService.isAdmin) this.startHub();
      });
  }

  /**
   * Builds a read-only summary using only telemetry already received by the dashboard.
   * Raw MQTT payloads, camera images and movement commands are never sent to UmbrellA.
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
    const root = this.toRecord(data);
    if (!root) return;

    const records = this.collectTelemetryRecords(root);
    const distance = this.readNumber(records, [
      'distance', 'Distance', 'distancia', 'Distancia',
      'distanceCm', 'DistanceCm', 'distance_cm', 'distanciaCm', 'DistanciaCm', 'distancia_cm',
    ]);
    const battery = this.readNumber(records, [
      'battery', 'Battery', 'batteryPercent', 'BatteryPercent', 'battery_percent',
      'batteryLevel', 'BatteryLevel', 'nivelBateria', 'NivelBateria', 'nivel_bateria',
    ]);
    const planted = this.readNumber(records, [
      'totalPlanted', 'TotalPlanted', 'total_planted',
      'plantsPlanted', 'PlantsPlanted', 'plantasPlantadas', 'PlantasPlantadas',
    ]);

    if (distance === null && battery === null && planted === null) return;

    if (distance !== null) this.latestDistance = Math.max(0, distance);
    if (battery !== null) this.latestBattery = Math.max(0, Math.min(100, battery));
    if (planted !== null) this.latestTotalPlanted = Math.max(0, planted);

    this.lastTelemetryAt = new Date().toISOString();
    this.telemetry$.next({
      receivedAt: this.lastTelemetryAt,
      batteryPercent: this.latestBattery,
      distanceCm: this.latestDistance,
      totalPlanted: this.latestTotalPlanted,
    });
  }

  private toRecord(data: unknown): Record<string, unknown> | null {
    let payload = data;

    if (typeof payload === 'string') {
      try {
        payload = JSON.parse(payload) as unknown;
      } catch {
        return null;
      }
    }

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
    return payload as Record<string, unknown>;
  }

  /**
   * The ESP payload can wrap readings in data/telemetry/sensorData or Ultrasonic.
   * Resolve those known containers without treating unrelated application data as telemetry.
   */
  private collectTelemetryRecords(root: Record<string, unknown>): Record<string, unknown>[] {
    const records: Record<string, unknown>[] = [root];
    const visited = new Set<Record<string, unknown>>([root]);
    const containers = [
      'data', 'Data', 'payload', 'Payload', 'telemetry', 'Telemetry',
      'sensorData', 'SensorData', 'ultrasonic', 'Ultrasonic',
      'ultrassonico', 'Ultrassonico', 'robot', 'Robot',
    ];

    for (let index = 0; index < records.length; index++) {
      const current = records[index];

      for (const key of containers) {
        const nested = current[key];
        if (!nested || typeof nested !== 'object' || Array.isArray(nested)) continue;

        const nestedRecord = nested as Record<string, unknown>;
        if (visited.has(nestedRecord)) continue;

        visited.add(nestedRecord);
        records.push(nestedRecord);
      }
    }

    return records;
  }

  private readNumber(records: Record<string, unknown>[], keys: string[]): number | null {
    for (const record of records) {
      for (const key of keys) {
        const value = record[key];
        if (value === null || value === undefined || value === '') continue;

        const numericValue = typeof value === 'number' ? value : Number(value);
        if (Number.isFinite(numericValue)) return Math.round(numericValue);
      }
    }

    return null;
  }

  sendCommand(command: GamepadCommand): void {
    if (!this.sessionService.token || !this.sessionService.isAdmin) {
      console.warn('[RobotService] Comando ignorado: é necessária uma sessão administrativa válida.');
      return;
    }

    const x = Number(command.x.toFixed(2));
    const y = Number(command.y.toFixed(2));

    this.http.post(this.commandUrl, { x, y }).subscribe({
      error: (error: unknown) => console.error('[RobotService] Erro ao enviar comando:', error),
    });
  }

  ngOnDestroy(): void {
    this.sessionEffect?.destroy();
    this.telemetry$.complete();
    this.connectionState$.complete();
    this.stopHub();
  }
}
