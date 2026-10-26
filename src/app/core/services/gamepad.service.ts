import { isPlatformBrowser } from '@angular/common';
import { Injectable, OnDestroy, PLATFORM_ID, inject } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { GamepadCommand } from '../models/gamepad-command.model';

@Injectable({ providedIn: 'root' })
export class GamepadService implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);

  readonly command$ = new Subject<GamepadCommand>();
  readonly connected$ = new BehaviorSubject<boolean>(false);

  private active = false;
  private gamepadIndex = -1;
  private animFrameId = 0;
  private lastSentTime = 0;
  private lastCommand: GamepadCommand = { x: 0, y: 0, connected: false, gamepadId: '' };
  private readonly throttleMs = 50;
  private readonly deadzone = 0.12;

  private readonly onGamepadConnected = (event: GamepadEvent): void => {
    if (!this.active) return;
    this.gamepadIndex = event.gamepad.index;
    this.connected$.next(true);
    this.startPolling();
  };

  private readonly onGamepadDisconnected = (event: GamepadEvent): void => {
    if (!this.active || event.gamepad.index !== this.gamepadIndex) return;
    this.gamepadIndex = -1;
    this.connected$.next(false);
    this.stopPolling();
    this.emitStop();
  };

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      window.addEventListener('gamepadconnected', this.onGamepadConnected);
      window.addEventListener('gamepaddisconnected', this.onGamepadDisconnected);
    }
  }

  activate(): void {
    if (!isPlatformBrowser(this.platformId) || this.active) return;
    this.active = true;

    // Alguns navegadores só disparam gamepadconnected após um botão ser usado.
    // Também inspecionamos os controles já conectados quando a tela é aberta.
    const gamepads = navigator.getGamepads();
    const existing = Array.from(gamepads).find((gamepad) => gamepad?.connected);
    if (existing) {
      this.gamepadIndex = existing.index;
      this.connected$.next(true);
      this.startPolling();
    }
  }

  deactivate(): void {
    if (!this.active) return;
    // Garante parada antes de a tela de controle deixar de ouvir os comandos.
    this.emitStop();
    this.active = false;
    this.gamepadIndex = -1;
    this.connected$.next(false);
    this.stopPolling();
  }

  private startPolling(): void {
    this.stopPolling();
    this.poll();
  }

  private stopPolling(): void {
    if (this.animFrameId !== 0 && isPlatformBrowser(this.platformId)) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = 0;
    }
  }

  private poll = (): void => {
    if (!isPlatformBrowser(this.platformId) || !this.active || this.gamepadIndex < 0) return;
    const gamepad = navigator.getGamepads()[this.gamepadIndex];

    if (!gamepad) {
      this.gamepadIndex = -1;
      this.connected$.next(false);
      this.emitStop();
      this.animFrameId = 0;
      return;
    }

    const rawX = gamepad.axes[0] ?? 0;
    const rawY = (gamepad.buttons[7]?.value ?? 0) - (gamepad.buttons[6]?.value ?? 0);
    const x = this.applyDeadzone(rawX);
    const y = this.applyDeadzone(rawY);
    const now = performance.now();
    const changed = x !== this.lastCommand.x || y !== this.lastCommand.y;
    const throttlePassed = now - this.lastSentTime >= this.throttleMs;
    const stopping = x === 0 && y === 0 && (this.lastCommand.x !== 0 || this.lastCommand.y !== 0);

    if ((changed && throttlePassed) || stopping) {
      const command: GamepadCommand = { x, y, connected: true, gamepadId: gamepad.id };
      this.command$.next(command);
      this.lastCommand = command;
      this.lastSentTime = now;
    }

    this.animFrameId = requestAnimationFrame(this.poll);
  };

  private emitStop(): void {
    const stopCommand: GamepadCommand = { x: 0, y: 0, connected: false, gamepadId: '' };
    this.command$.next(stopCommand);
    this.lastCommand = stopCommand;
    this.lastSentTime = isPlatformBrowser(this.platformId) ? performance.now() : 0;
  }

  private applyDeadzone(value: number): number {
    if (Math.abs(value) < this.deadzone) return 0;
    const sign = value > 0 ? 1 : -1;
    return sign * ((Math.abs(value) - this.deadzone) / (1 - this.deadzone));
  }

  ngOnDestroy(): void {
    this.deactivate();
    this.stopPolling();
    if (isPlatformBrowser(this.platformId)) {
      window.removeEventListener('gamepadconnected', this.onGamepadConnected);
      window.removeEventListener('gamepaddisconnected', this.onGamepadDisconnected);
    }
    this.command$.complete();
    this.connected$.complete();
  }
}
