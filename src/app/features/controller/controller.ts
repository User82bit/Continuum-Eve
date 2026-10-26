import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { DecimalPipe } from '@angular/common';
import { LayoutMainInterface } from '../../shared/layout/layout-main-interface/layout-main-interface';
import { GamepadService } from '../../core/services/gamepad.service';
import { RobotService } from '../../core/services/robot.service';
import { GamepadCommand } from '../../core/models/gamepad-command.model';

@Component({
  selector: 'app-controller',
  standalone: true,
  imports: [LayoutMainInterface, DecimalPipe],
  templateUrl: './controller.html',
  styleUrl: './controller.scss',
})
export class Controller implements OnInit, OnDestroy {
  private readonly gamepadService = inject(GamepadService);
  private readonly robotService = inject(RobotService);

  readonly currentCommand = signal<GamepadCommand>({ x: 0, y: 0, connected: false, gamepadId: '' });
  readonly isConnected = signal(false);
  readonly virtualActive = signal(false);
  readonly direction = signal('Parado');

  private commandSub?: Subscription;
  private connectedSub?: Subscription;

  ngOnInit(): void {
    this.connectedSub = this.gamepadService.connected$.subscribe((connected) => {
      this.isConnected.set(connected);
      if (!connected) {
        this.currentCommand.set({ x: 0, y: 0, connected: false, gamepadId: '' });
        this.direction.set('Parado');
      }
    });

    // A telemetria visual e o envio HTTP usam a mesma emissão de comando.
    this.commandSub = this.gamepadService.command$.subscribe((command) => {
      this.currentCommand.set(command);
      this.direction.set(this.calculateDirection(command));
      this.robotService.sendCommand(command);
    });

    this.gamepadService.activate();
  }

  ngOnDestroy(): void {
    // Mantém o listener ativo durante a ordem final de parada.
    this.gamepadService.deactivate();
    this.commandSub?.unsubscribe();
    this.connectedSub?.unsubscribe();
  }

  private calculateDirection(command: GamepadCommand): string {
    const moving = Math.abs(command.y) > 0.05;
    const turning = Math.abs(command.x) > 0.05;
    if (!moving && !turning) return 'Parado';

    const parts: string[] = [];
    if (moving) parts.push(command.y > 0 ? 'Frente' : 'Ré');
    if (turning) parts.push(command.x > 0 ? 'Direita' : 'Esquerda');
    return parts.join(' + ');
  }

  toPercent(value: number): number {
    return Math.round(Math.min(1, Math.abs(value)) * 100);
  }

  toOffsetPercent(value: number): number {
    return Math.round(Math.max(-1, Math.min(1, value)) * 100);
  }

  sendVirtualCommand(x: number, y: number): void {
    const command: GamepadCommand = { x, y, connected: false, gamepadId: 'Controle virtual' };
    this.virtualActive.set(true);
    this.currentCommand.set(command);
    this.direction.set(this.calculateDirection(command));
    this.robotService.sendCommand(command);
  }

  stopVirtualCommand(): void {
    if (this.currentCommand().x === 0 && this.currentCommand().y === 0) return;
    this.sendVirtualCommand(0, 0);
  }
}
