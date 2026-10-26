import { ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { LayoutMainInterface } from '../../shared/layout/layout-main-interface/layout-main-interface';
import { Card } from '../../shared/ui/card/card';
import { MapInfoComponent } from '../../shared/ui/map-info-component/map-info-component';
import { RobotConnectionState, RobotService } from '../../core/services/robot.service';

@Component({
  selector: 'app-home',
  imports: [LayoutMainInterface, Card, MapInfoComponent, CommonModule],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit, OnDestroy {
  private readonly robotService = inject(RobotService);
  private robotDataSubscription?: Subscription;
  private connectionSubscription?: Subscription;

  status = 'Conectando...';
  isOnline = false;
  battery: number | null = null;
  distance: number | null = null;
  totalPlanted: number | null = null;
  isMapTrue = false;

  constructor(private readonly ngZone: NgZone, private readonly cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.connectionSubscription = this.robotService.connectionState$.subscribe((state) => {
      this.ngZone.run(() => {
        this.status = this.connectionText(state);
        this.isOnline = state === 'connected';
        this.cdr.markForCheck();
      });
    });

    this.robotDataSubscription = this.robotService.robotData$.subscribe((data) => {
      const payload = this.toRecord(data);
      if (!payload) return;

      this.ngZone.run(() => {
        const distance = this.readNumber(payload, ['distance', 'Distance', 'distancia', 'Distancia']);
        const battery = this.readNumber(payload, ['battery', 'Battery', 'batteryPercent', 'BatteryPercent', 'nivelBateria', 'NivelBateria']);
        const planted = this.readNumber(payload, ['totalPlanted', 'TotalPlanted', 'plantsPlanted', 'PlantsPlanted', 'plantasPlantadas', 'PlantasPlantadas']);

        if (distance !== null) this.distance = Math.max(0, distance);
        if (battery !== null) this.battery = Math.max(0, Math.min(100, battery));
        if (planted !== null) this.totalPlanted = Math.max(0, planted);
        this.cdr.markForCheck();
      });
    });
  }

  ngOnDestroy(): void {
    this.robotDataSubscription?.unsubscribe();
    this.connectionSubscription?.unsubscribe();
  }

  private connectionText(state: RobotConnectionState): string {
    const labels: Record<RobotConnectionState, string> = {
      connecting: 'Conectando...',
      connected: 'Conectado',
      reconnecting: 'Reconectando...',
      disconnected: 'Desconectado',
    };
    return labels[state];
  }

  private toRecord(data: unknown): Record<string, unknown> | null {
    let payload = data;
    if (typeof payload === 'string') {
      try { payload = JSON.parse(payload) as unknown; } catch { return null; }
    }
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
    return payload as Record<string, unknown>;
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

  ToggleMap(): void { this.isMapTrue = true; }
  closeMap(): void { this.isMapTrue = false; }
}
