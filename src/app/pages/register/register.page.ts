import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { ToastController, LoadingController } from '@ionic/angular';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: false
})
export class RegisterPage implements OnInit {

  // State
  step: 'form' | 'otp' = 'form';
  
  // Data Register
  regData = {
    name: '',
    username: '',
    email: '',
    number_phone: '',
    password: ''
  };

  // Persetujuan Privasi
  acceptedPrivacyPolicy = false;

  // Data OTP
  otpCode = '';

  constructor(
    private api: ApiService,
    private router: Router,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController
  ) { }

  ngOnInit() {
  }

  async onRegister() {
    if (!this.regData.name || !this.regData.email || !this.regData.password || !this.regData.username) {
      this.showToast('Lengkapi semua data pendaftaran!', 'warning');
      return;
    }

    if (!this.acceptedPrivacyPolicy) {
      this.showToast('Anda harus menyetujui Kebijakan Privasi!', 'warning');
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: 'Mendaftarkan akun...',
      spinner: 'circles',
      cssClass: 'custom-loading'
    });
    await loading.present();

    this.api.register(this.regData).subscribe({
      next: (res: any) => {
        loading.dismiss();
        this.showToast('Registrasi berhasil! Silakan cek OTP Anda.', 'success');
        this.step = 'otp'; 
      },
      error: (err) => {
        loading.dismiss();
        this.showToast(err.error?.message || 'Gagal mendaftar', 'danger');
      }
    });
  }

  async onVerifyOtp() {
    if (!this.otpCode || this.otpCode.length < 6) {
      this.showToast('Masukkan 6 digit kode OTP!', 'warning');
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: 'Verifikasi OTP...',
      spinner: 'circles'
    });
    await loading.present();

    const otpPayload = {
      email: this.regData.email,
      otp: this.otpCode
    };

    this.api.verifyOtp(otpPayload).subscribe({
      next: (res: any) => {
        loading.dismiss();
        if (res.token) {
          this.api.setToken(res.token, res.user);
          this.showToast('Verifikasi sukses! Selamat datang.', 'success');
          this.router.navigate(['/home']);
        } else {
          this.showToast('Verifikasi berhasil, silakan login.', 'success');
          this.router.navigate(['/login']);
        }
      },
      error: (err) => {
        loading.dismiss();
        this.showToast(err.error?.message || 'OTP salah atau kadaluarsa', 'danger');
      }
    });
  }

  async showToast(msg: string, color: string) {
    const toast = await this.toastCtrl.create({
      message: msg,
      duration: 2500,
      color: color,
      position: 'top',
      cssClass: 'custom-toast'
    });
    toast.present();
  }
}
