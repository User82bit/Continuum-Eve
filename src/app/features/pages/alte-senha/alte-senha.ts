import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../../core/services/auth.service';

interface ChangePasswordForm {
  code: FormControl<string | null>;
  newPassword: FormControl<string | null>;
  confirmPassword: FormControl<string | null>;
}

@Component({
  selector: 'app-alte-senha',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './alte-senha.html',
  styleUrl: './alte-senha.scss',
})
export class AlteSenha implements OnInit {
  passwordForm: FormGroup<ChangePasswordForm>;
  userEmail = '';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly authService: AuthService,
    private readonly toastService: ToastrService,
  ) {
    this.passwordForm = new FormGroup<ChangePasswordForm>({
      code: new FormControl('', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]),
      newPassword: new FormControl('', [Validators.required, Validators.minLength(6)]),
      confirmPassword: new FormControl('', [Validators.required]),
    }, { validators: this.matchPasswords });
  }

  ngOnInit(): void {
    this.userEmail = this.route.snapshot.queryParamMap.get('email') || '';
    if (!this.userEmail) {
      this.toastService.warning('Sessão inválida. Reinicie a recuperação de senha.');
      void this.router.navigate(['/login']);
    }
  }

  matchPasswords(control: AbstractControl): ValidationErrors | null {
    const newPassword = control.get('newPassword')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;
    return newPassword && confirmPassword && newPassword !== confirmPassword
      ? { passwordMismatch: true }
      : null;
  }

  submit(): void {
    if (this.passwordForm.invalid) {
      if (this.passwordForm.hasError('passwordMismatch')) {
        this.toastService.error('As senhas não coincidem.');
      } else {
        this.toastService.error('Preencha todos os campos corretamente.');
      }
      return;
    }

    const { code, newPassword } = this.passwordForm.getRawValue();
    if (!code || !newPassword || !this.userEmail) return;

    this.toastService.info('Processando alteração...');
    this.authService.resetPassword(this.userEmail, code, newPassword).subscribe({
      next: () => {
        this.toastService.success('Senha alterada com sucesso! Faça login com a nova senha.');
        void this.router.navigate(['/login']);
      },
      error: (error: { error?: { message?: string } }) => {
        this.toastService.error(error.error?.message || 'Código inválido ou expirado.');
      },
    });
  }
}
