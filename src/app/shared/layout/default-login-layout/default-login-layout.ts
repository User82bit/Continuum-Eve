import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-default-login-layout',
  imports: [RouterLink],
  standalone: true,
  templateUrl: './default-login-layout.html',
  styleUrl: './default-login-layout.scss',
})
export class DefaultLoginLayout {
  title = input<string>('');
  primaryButtonText = input<string>('');
  secondaryButtonText = input<string>('');
  disablePrimaryButton = input<boolean>(true);
  onSubmit = output<void>();
  onNavigate = output<void>();

  submit(): void {
    this.onSubmit.emit();
  }

  navigate(): void {
    this.onNavigate.emit();
  }
}
