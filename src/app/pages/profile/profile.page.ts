import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { Router } from '@angular/router';
import { ToastController, LoadingController, AlertController } from '@ionic/angular';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: false
})
export class ProfilePage implements OnInit {

  profile: any = null;
  isLoading = true;

  ktpFile: File | null = null;
  simFile: File | null = null;
  profilePhotoFile: File | null = null;
  profilePhotoPreview: string | null = null;

  constructor(
    private api: ApiService,
    private router: Router,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController,
    private alertCtrl: AlertController
  ) { }

  ngOnInit() {
  }

  ionViewWillEnter() {
    this.loadProfile();
  }

  loadProfile() {
    const token = localStorage.getItem('token');
    if (!token) {
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    this.api.getProfile().subscribe({
        next: (res: any) => {
          this.profile = res.data || res;
          if (this.profile && !this.profile.id_card_url && this.profile.id_card) {
            this.profile.id_card_url = this.profile.id_card;
          }
          if (this.profile && !this.profile.drive_licence_url && this.profile.drive_licence) {
            this.profile.drive_licence_url = this.profile.drive_licence;
          }
          this.isLoading = false;
        },
      error: (err) => {
        console.error(err);
        this.isLoading = false;
        if (err.status !== 401) {
          this.showToast('Gagal memuat profil', 'danger');
        }
      }
    });
  }

  getProfileImageUrl() {
    if (this.profilePhotoPreview) return this.profilePhotoPreview;
    if (this.profile) {
      const path = this.profile.avatar_url || this.profile.profile_picture || this.profile.profile_photo_path || this.profile.photo || this.profile.avatar;
      if (path) {
        let finalPath = path;
        if (finalPath.includes('localhost') || finalPath.includes('127.0.0.1')) {
          finalPath = finalPath.replace(/http:\/\/(localhost|127\.0\.0\.1)(:\d+)?/, 'https://sewamobilyuk-api.exponic.site');
        }
        if (finalPath.startsWith('http')) return finalPath;
        return 'https://sewamobilyuk-api.exponic.site/storage/' + finalPath;
      }
    }
    return 'https://ui-avatars.com/api/?name=' + (this.profile?.name || 'User') + '&background=2563eb&color=fff&size=200';
  }

  onKtpChange(event: any) {
    if (event.target.files && event.target.files.length > 0) {
      this.ktpFile = event.target.files[0];
    }
  }

  onSimChange(event: any) {
    if (event.target.files && event.target.files.length > 0) {
      this.simFile = event.target.files[0];
    }
  }

  onProfilePhotoChange(event: any) {
    if (event.target.files && event.target.files.length > 0) {
      this.profilePhotoFile = event.target.files[0];
      // Show preview immediately
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.profilePhotoPreview = e.target.result;
      };
      reader.readAsDataURL(this.profilePhotoFile!);
    }
  }

  async saveProfile() {
    const loading = await this.loadingCtrl.create({ message: 'Menyimpan profil...', spinner: 'circles' });
    await loading.present();

    const formData = new FormData();
    formData.append('name', this.profile.name || '');
    formData.append('username', this.profile.username || '');
    formData.append('email', this.profile.email || '');
    formData.append('number_phone', this.profile.number_phone || '');
    formData.append('address', this.profile.address || '');

    if (this.ktpFile) {
      formData.append('id_card', this.ktpFile);
    }
    if (this.simFile) {
      formData.append('drive_licence', this.simFile);
    }
    if (this.profilePhotoFile) {
      formData.append('avatar', this.profilePhotoFile);
      formData.append('profile_picture', this.profilePhotoFile); // fallback just in case
    }

    this.api.updateProfile(formData).subscribe({
      next: () => {
        loading.dismiss();
        this.showToast('Profil berhasil diperbarui!', 'success');
        this.loadProfile(); // Reload
      },
      error: (err) => {
        loading.dismiss();
        this.showToast(err.error?.message || 'Gagal menyimpan profil', 'danger');
      }
    });
  }

  async logout() {
    const alert = await this.alertCtrl.create({
      header: 'Konfirmasi Keluar',
      message: 'Apakah Anda yakin ingin keluar dari akun?',
      buttons: [
        { text: 'Batal', role: 'cancel' },
        { 
          text: 'Keluar', 
          role: 'destructive',
          handler: () => {
            this.api.logout();
            this.router.navigate(['/login']);
          }
        }
      ]
    });
    await alert.present();
  }

  viewWelcomePage() {
    this.router.navigate(['/welcome']);
  }
  async deleteAccount() {
    const alert = await this.alertCtrl.create({
      header: 'Hapus Akun',
      message: 'Apakah Anda yakin ingin menghapus akun Anda secara permanen? Tindakan ini tidak dapat dibatalkan.',
      buttons: [
        { text: 'Batal', role: 'cancel' },
        {
          text: 'Hapus',
          role: 'destructive',
          handler: async () => {
            const loading = await this.loadingCtrl.create({ message: 'Menghapus akun...', spinner: 'circles' });
            await loading.present();
            
            this.api.deleteAccount().subscribe({
              next: () => {
                loading.dismiss();
                this.api.logout();
                this.showToast('Akun Anda berhasil dihapus.', 'success');
                this.router.navigate(['/welcome']);
              },
              error: (err) => {
                loading.dismiss();
                this.showToast(err.error?.message || 'Gagal menghapus akun.', 'danger');
              }
            });
          }
        }
      ]
    });
    await alert.present();
  }

  async showToast(msg: string, color: string) {
    const toast = await this.toastCtrl.create({ message: msg, duration: 2000, color: color, position: 'top' });
    toast.present();
  }
}
