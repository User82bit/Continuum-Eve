import { Component } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { DefaultLoginLayout } from '../../../shared/layout/default-login-layout/default-login-layout';
import { PrimaryInput } from '../../../shared/ui/primary-input/primary-input';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../../core/services/auth.service';

interface SignupForm {
  username: FormControl<string | null>;
  email: FormControl<string | null>;
  password: FormControl<string | null>;
  passwordConfirme: FormControl<string | null>;
}

const matchingPasswords: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const password = control.get('password')?.value;
  const confirmation = control.get('passwordConfirme')?.value;
  return password && confirmation && password !== confirmation ? { passwordMismatch: true } : null;
};

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [DefaultLoginLayout, ReactiveFormsModule, PrimaryInput],
  templateUrl: './signup.html',
  styleUrl: './signup.scss',
})
export class Signup {
  SignupForm: FormGroup<SignupForm>;

  constructor(
    private readonly router: Router,
    private readonly authService: AuthService,
    private readonly toastService: ToastrService,
  ) {
    this.SignupForm = new FormGroup<SignupForm>({
      username: new FormControl('', [Validators.required, Validators.minLength(3)]),
      email: new FormControl('', [Validators.required, Validators.email]),
      password: new FormControl('', [Validators.required, Validators.minLength(6)]),
      passwordConfirme: new FormControl('', [Validators.required, Validators.minLength(6)]),
    }, { validators: matchingPasswords });
  }

  handleEnter(event: Event): void {
    const input = event.target as HTMLInputElement;
    const inputs = Array.from(input.form?.querySelectorAll('input') ?? []);
    const currentIndex = inputs.indexOf(input);

    if (currentIndex < 0) return;
    event.preventDefault();

    if (currentIndex < inputs.length - 1) {
      inputs[currentIndex + 1].focus();
      return;
    }
    this.submit();
  }

  submit(): void {
    if (this.SignupForm.invalid) {
      if (this.SignupForm.hasError('passwordMismatch')) {
        this.toastService.error('As senhas não coincidem.');
      }
      return;
    }

    const { username, email, password } = this.SignupForm.getRawValue();
    if (!username || !email || !password) return;

    this.authService.register(username, email, password).subscribe({
      next: (response) => {
        this.toastService.success('Conta criada! Bem-vindo, ' + response.username + '!');
        void this.router.navigate(['/home']);
      },
      error: (error: { status?: number }) => {
        if (error.status === 409) {
          this.toastService.error('Este e-mail já está em uso.');
        } else {
          this.toastService.error('Erro ao criar conta. Tente novamente.');
        }
      },
    });
  }

  navigate(): void {
    void this.router.navigate(['/login']);
  }
}
