import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { ToastController, LoadingController } from '@ionic/angular';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false
})
export class LoginPage implements OnInit {

  loginData = {
    email: '',
    password: ''
  };

  // Forgot Password Flow State
  isForgotPasswordOpen = false;
  forgotPasswordStep: 'email' | 'otp' | 'reset' = 'email';
  forgotEmail = '';
  forgotOtp = '';
  forgotNewPassword = '';
  forgotConfirmPassword = '';

  constructor(
    private api: ApiService,
    private router: Router,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController
  ) { }

  ngOnInit() {
  }

  openForgotPasswordModal() {
    this.forgotEmail = '';
    this.forgotOtp = '';
    this.forgotNewPassword = '';
    this.forgotConfirmPassword = '';
    this.forgotPasswordStep = 'email';
    this.isForgotPasswordOpen = true;
  }

  closeForgotPassword() {
    this.isForgotPasswordOpen = false;
  }

  async sendForgotOtp() {
    if (!this.forgotEmail) {
      this.showToast('Masukkan email Anda terlebih dahulu!', 'warning');
      return;
    }

    const loading = await this.loadingCtrl.create({ message: 'Mengirim OTP...', spinner: 'circles' });
    await loading.present();

    this.api.forgetPassword({ email: this.forgotEmail }).subscribe({
      next: (res: any) => {
        loading.dismiss();
        this.showToast('OTP berhasil dikirim ke email Anda!', 'success');
        this.forgotPasswordStep = 'otp';
      },
      error: (err) => {
        loading.dismiss();
        this.showToast(err.error?.message || 'Gagal mengirim OTP. Pastikan email terdaftar.', 'danger');
      }
    });
  }

  async verifyForgotOtp() {
    if (!this.forgotOtp || this.forgotOtp.length < 6) {
      this.showToast('Masukkan 6 digit kode OTP!', 'warning');
      return;
    }

    const loading = await this.loadingCtrl.create({ message: 'Memverifikasi OTP...', spinner: 'circles' });
    await loading.present();

    const payload = {
      email: this.forgotEmail,
      otp: this.forgotOtp
    };

    this.api.verifyOtpForgetPassword(payload).subscribe({
      next: (res: any) => {
        loading.dismiss();
        this.showToast('OTP berhasil diverifikasi!', 'success');
        this.forgotPasswordStep = 'reset';
      },
      error: (err) => {
        loading.dismiss();
        this.showToast(err.error?.message || 'Kode OTP salah atau kadaluarsa.', 'danger');
      }
    });
  }

  async resetPasswordSubmit() {
    if (!this.forgotNewPassword || !this.forgotConfirmPassword) {
      this.showToast('Password baru wajib diisi!', 'warning');
      return;
    }

    if (this.forgotNewPassword !== this.forgotConfirmPassword) {
      this.showToast('Password baru dan konfirmasi tidak cocok!', 'warning');
      return;
    }

    const loading = await this.loadingCtrl.create({ message: 'Mereset password...', spinner: 'circles' });
    await loading.present();

    const payload = {
      email: this.forgotEmail,
      otp: this.forgotOtp,
      password: this.forgotNewPassword,
      password_confirmation: this.forgotConfirmPassword
    };

    this.api.resetPassword(payload).subscribe({
      next: (res: any) => {
        loading.dismiss();
        this.showToast('Password berhasil direset! Silakan login.', 'success');
        this.isForgotPasswordOpen = false;
      },
      error: (err) => {
        loading.dismiss();
        this.showToast(err.error?.message || 'Gagal mereset password. Silakan coba lagi.', 'danger');
      }
    });
  }

  async onLogin() {
    if (!this.loginData.email || !this.loginData.password) {
      this.showToast('Email/Username dan password wajib diisi!', 'warning');
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: 'Sedang masuk...',
      spinner: 'circles'
    });
    await loading.present();

    const payload = {
      login: this.loginData.email,
      password: this.loginData.password
    };

    this.api.login(payload).subscribe({
      next: (res: any) => {
        if (res.token) {
          // Set token sementara untuk otorisasi getProfile
          this.api.setToken(res.token, null);
          
          this.api.getProfile().subscribe({
            next: (profileRes: any) => {
              loading.dismiss();
              const profile = profileRes.data || profileRes;
              this.api.setToken(res.token, profile);
              this.showToast('Login berhasil!', 'success');
              this.router.navigate(['/home']);
            },
            error: (err) => {
              loading.dismiss();
              this.showToast('Login berhasil, gagal memuat detail profil.', 'warning');
              this.router.navigate(['/home']);
            }
          });
        } else {
          loading.dismiss();
          this.showToast('Gagal masuk. Periksa kembali data Anda.', 'danger');
        }
      },
      error: (err) => {
        loading.dismiss();
        this.showToast(err.error?.message || 'Email/Username atau password salah', 'danger');
      }
    });
  }

  async showToast(msg: string, color: string) {
    const toast = await this.toastCtrl.create({
      message: msg,
      duration: 2000,
      color: color,
      position: 'top'
    });
    toast.present();
  }
}
