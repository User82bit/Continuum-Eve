import { DatePipe, TitleCasePipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { LayoutMainInterface } from '../../shared/layout/layout-main-interface/layout-main-interface';
import { AuthService } from '../../core/services/auth.service';
import { SessionService } from '../../core/services/session.service';
import { ToastrService } from 'ngx-toastr';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [TitleCasePipe, DatePipe, LayoutMainInterface],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile {
  private readonly authService = inject(AuthService);
  private readonly sessionService = inject(SessionService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastrService);

  readonly username = this.sessionService.user.username || 'Usuário';
  readonly email = this.sessionService.user.email || 'E-mail não informado';
  readonly imgUrl = computed(() => this.sessionService.userSignal().imgUrl);
  isUploadingAvatar = false;
  readonly isAdmin = this.sessionService.isAdmin;
  readonly date = this.sessionService.user.createAt ? new Date(this.sessionService.user.createAt) : null;

  async onAvatarSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';

    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      this.toastService.error('Escolha uma imagem PNG, JPG ou WebP.');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      this.toastService.error('A imagem original deve ter no máximo 8 MB.');
      return;
    }

    this.isUploadingAvatar = true;
    try {
      const optimizedImage = await this.prepareAvatar(file);
      this.authService.updateProfileImage(optimizedImage)
        .pipe(finalize(() => this.isUploadingAvatar = false))
        .subscribe({
          next: (response) => {
            this.sessionService.updateProfileImage(response.imgUrl);
            this.toastService.success('Foto de perfil atualizada.');
          },
          error: () => this.toastService.error('Não foi possível salvar a foto. Tente novamente.'),
        });
    } catch {
      this.isUploadingAvatar = false;
      this.toastService.error('Não foi possível processar esta imagem. Escolha outra.');
    }
  }

  private async prepareAvatar(file: File): Promise<File> {
    const bitmap = await createImageBitmap(file);
    const maxDimension = 512;
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));

    const context = canvas.getContext('2d');
    if (!context) {
      bitmap.close();
      throw new Error('Não foi possível preparar a imagem.');
    }

    context.fillStyle = '#FFFFFF';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((value) => {
        if (value) resolve(value);
        else reject(new Error('Não foi possível comprimir a imagem.'));
      }, 'image/jpeg', 0.82);
    });

    return new File([blob], 'profile-photo.jpg', { type: 'image/jpeg', lastModified: Date.now() });
  }

  onLogout(): void {
    this.authService.logout();
    void this.router.navigate(['/login']);
  }
}
