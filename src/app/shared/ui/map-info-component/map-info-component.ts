import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-map-info-component',
  templateUrl: './map-info-component.html',
  styleUrl: './map-info-component.scss',
})
export class MapInfoComponent {
  status = input('Aguardando telemetria');
  isOnline = input(false);
  distance = input<number | null>(null);
  battery = input<number | null>(null);
  isReturn = output<void>();

  return(): void {
    this.isReturn.emit();
  }
}
