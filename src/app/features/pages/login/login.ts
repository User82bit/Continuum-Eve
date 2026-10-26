import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DefaultLoginLayout } from '../../../shared/layout/default-login-layout/default-login-layout';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { PrimaryInput } from '../../../shared/ui/primary-input/primary-input';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../../core/services/auth.service';

interface LoginForm {
  email: FormControl<string | null>;
  password: FormControl<string | null>;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [DefaultLoginLayout, ReactiveFormsModule, PrimaryInput, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  loginForm: FormGroup<LoginForm>;
  isDisabled = true;

  constructor(
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly authService: AuthService,
    private readonly toastService: ToastrService,
  ) {
    this.loginForm = new FormGroup({
      email: new FormControl('', [Validators.required, Validators.email]),
      password: new FormControl('', [Validators.required, Validators.minLength(6)]),
    });
  }

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      this.redirectAfterLogin();
      return;
    }

    this.loginForm.controls.email.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.isDisabled = !(value && value.length > 5 && this.loginForm.controls.email.valid);
      });
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

  handleForgotPassword(): void {
    if (this.isDisabled) return;

    const email = this.loginForm.controls.email.value;
    if (!email) return;

    this.toastService.info('Verificando e-mail no sistema...');
    this.authService.checkEmailExists(email).subscribe({
      next: (exists) => {
        if (exists) {
          this.toastService.success('E-mail localizado! Redirecionando...');
          void this.router.navigate(['/password-reset'], { queryParams: { email } });
        } else {
          this.toastService.error('Este e-mail não está cadastrado no sistema.');
        }
      },
      error: () => this.toastService.error('Erro ao validar o e-mail. Tente novamente mais tarde.'),
    });
  }

  submit(): void {
    if (this.loginForm.invalid) return;
    const { email, password } = this.loginForm.getRawValue();
    if (!email || !password) return;

    this.authService.login(email, password).subscribe({
      next: (response) => {
        this.toastService.success('Bem-vindo, ' + response.username + '!');
        this.redirectAfterLogin();
      },
      error: (error: { status?: number }) => {
        if (error.status === 401) {
          this.toastService.error('E-mail ou senha inválidos.');
        } else {
          this.toastService.error('Erro ao fazer login. Tente novamente.');
        }
      },
    });
  }

  navigate(): void {
    void this.router.navigate(['/signup']);
  }

  private redirectAfterLogin(): void {
    // Só aceita destinos locais para impedir redirecionamento para outro domínio.
    const target = this.route.snapshot?.queryParamMap?.get('returnUrl');
    if (target?.startsWith('/') && !target.startsWith('//')) {
      void this.router.navigateByUrl(target);
      return;
    }
    void this.router.navigate(['/home']);
  }
}
