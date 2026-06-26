import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { ToastController, AlertController, LoadingController } from '@ionic/angular';

@Component({
  selector: 'app-car-detail',
  templateUrl: './car-detail.page.html',
  styleUrls: ['./car-detail.page.scss'],
  standalone: false
})
export class CarDetailPage implements OnInit {

  carId: string | null = null;
  car: any = null;
  isLoading = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController
  ) { }

  ngOnInit() {
    this.carId = this.route.snapshot.paramMap.get('id');
  }

  ionViewWillEnter() {
    if (this.carId) {
      this.loadCarDetail();
    }
  }

  loadCarDetail() {
    this.api.getCarById(this.carId!).subscribe({
      next: (res: any) => {
        this.car = res.data || res;
        this.car.display_status = this.car.availability_status || this.car.status || 'available';
        this.isLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.isLoading = false;
      }
    });
  }

  async checkProfileAndBook() {
    // 1. Cek apakah user sudah login
    const token = localStorage.getItem('token');
    const isLoggedIn = token && token !== 'null' && token !== 'undefined';
    if (!isLoggedIn) {
      const alert = await this.alertCtrl.create({
        header: 'Akses Terbatas',
        message: 'Silakan masuk atau daftar akun baru terlebih dahulu untuk melakukan reservasi.',
        buttons: [
          {
            text: 'Daftar (Register)',
            handler: () => {
              this.router.navigate(['/register']);
            }
          },
          {
            text: 'Masuk (Login)',
            handler: () => {
              this.router.navigate(['/login']);
            }
          },
          {
            text: 'Batal',
            role: 'cancel'
          }
        ]
      });
      await alert.present();
      return;
    }

    // 2. Cek apakah dokumen KTP dan SIM lengkap di Profile
    const loading = await this.loadingCtrl.create({ message: 'Memeriksa kelengkapan dokumen...', spinner: 'circles' });
    await loading.present();

    this.api.getProfile().subscribe({
      next: (res: any) => {
        loading.dismiss();
        const profile = res.data || res;

        // Pengecekan KTP dan SIM menggunakan properti asli database
        const hasKtp = profile.id_card_url || profile.id_card;
        const hasSim = profile.drive_licence_url || profile.drive_licence;
        if (!hasKtp || !hasSim) {
          this.promptUploadDocuments();
        } else {
          // Lanjut ke booking
          this.router.navigate(['/booking', this.carId]);
        }
      },
      error: async (err) => {
        loading.dismiss();
        if (err.status === 401) {
          localStorage.removeItem('token');
          this.showToast('Sesi Anda telah habis. Silakan login kembali.', 'warning');
          this.router.navigate(['/login']);
        } else {
          this.showToast('Gagal memuat profil, coba lagi nanti.', 'danger');
        }
      }
    });
  }

  async promptUploadDocuments() {
    const alert = await this.alertCtrl.create({
      header: 'Dokumen Belum Lengkap',
      message: 'Anda harus mengunggah KTP dan SIM sebelum dapat melakukan reservasi mobil.',
      buttons: [
        { text: 'Nanti', role: 'cancel' },
        { text: 'Unggah Sekarang', handler: () => this.router.navigate(['/profile']) }
      ]
    });
    await alert.present();
  }

  async showToast(msg: string, color: string) {
    const toast = await this.toastCtrl.create({ message: msg, duration: 2000, color: color, position: 'top' });
    toast.present();
  }

  contactWhatsApp() {
    window.open('https://wa.me/6285774080153', '_system');
  }

}
