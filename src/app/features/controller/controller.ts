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
  private lastSentDriveDirection = 'STOP';

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

    // A interface atualiza os eixos; o backend só recebe uma ordem quando
    // a direção WASD muda, evitando POSTs repetidos para a mesma direção.
    this.commandSub = this.gamepadService.command$.subscribe((command) => {
      this.currentCommand.set(command);
      this.direction.set(this.calculateDirection(command));
      this.sendIfDriveDirectionChanged(command);
    });

    this.gamepadService.activate();
  }

  ngOnDestroy(): void {
    const current = this.currentCommand();
    // O serviço só acompanha movimentos do gamepad físico. Se o comando
    // ativo veio do controle virtual, a tela é responsável pela parada final.
    if (current.gamepadId === 'Controle virtual' && (current.x !== 0 || current.y !== 0)) {
      this.robotService.sendCommand({ x: 0, y: 0, connected: false, gamepadId: 'Controle virtual' });
    }

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

  /**
   * Adan-Stella converts each HTTP command to one WASD/STOP MQTT message.
   * Sending only on direction changes avoids flooding the backend while an
   * analog stick reports tiny value variations.
   */
  private sendIfDriveDirectionChanged(command: GamepadCommand): void {
    const nextDirection = this.toDriveDirection(command);
    if (nextDirection === this.lastSentDriveDirection) return;

    this.lastSentDriveDirection = nextDirection;
    this.robotService.sendCommand(command);
  }

  private toDriveDirection(command: GamepadCommand): string {
    const threshold = 0.1;
    const x = Math.abs(command.x) <= threshold ? 0 : command.x;
    const y = Math.abs(command.y) <= threshold ? 0 : command.y;

    if (x === 0 && y === 0) return 'STOP';
    if (Math.abs(y) >= Math.abs(x)) return y > 0 ? 'W' : 'S';
    return x > 0 ? 'D' : 'A';
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
    this.sendIfDriveDirectionChanged(command);
  }

  stopVirtualCommand(): void {
    if (this.currentCommand().x === 0 && this.currentCommand().y === 0) return;
    this.sendVirtualCommand(0, 0);
  }
}
