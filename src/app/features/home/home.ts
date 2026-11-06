import { ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { LayoutMainInterface } from '../../shared/layout/layout-main-interface/layout-main-interface';
import { Card } from '../../shared/ui/card/card';
import { MapInfoComponent } from '../../shared/ui/map-info-component/map-info-component';
import { RobotConnectionState, RobotService, RobotTelemetrySnapshot } from '../../core/services/robot.service';

@Component({
  selector: 'app-home',
  imports: [LayoutMainInterface, Card, MapInfoComponent, CommonModule],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit, OnDestroy {
  private readonly robotService = inject(RobotService);
  private telemetrySubscription?: Subscription;
  private connectionSubscription?: Subscription;

  status = 'Conectando...';
  isOnline = false;
  battery: number | null = null;
  distance: number | null = null;
  totalPlanted: number | null = null;
  lastTelemetryAt: string | null = null;
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

    // BehaviorSubject replays the most recent ESP packet when the user returns to Home.
    this.telemetrySubscription = this.robotService.telemetry$.subscribe((snapshot) => {
      if (!snapshot) return;

      this.ngZone.run(() => {
        this.applyTelemetry(snapshot);
        this.cdr.markForCheck();
      });
    });
  }

  ngOnDestroy(): void {
    this.telemetrySubscription?.unsubscribe();
    this.connectionSubscription?.unsubscribe();
  }

  private applyTelemetry(snapshot: RobotTelemetrySnapshot): void {
    this.battery = snapshot.batteryPercent;
    this.distance = snapshot.distanceCm;
    this.totalPlanted = snapshot.totalPlanted;
    this.lastTelemetryAt = snapshot.receivedAt;
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

  ToggleMap(): void { this.isMapTrue = true; }
  closeMap(): void { this.isMapTrue = false; }
}
