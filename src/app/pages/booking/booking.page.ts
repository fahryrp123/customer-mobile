import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { RentalService } from '../../services/rental.service';
import { ToastController, LoadingController, AlertController, NavController, Platform } from '@ionic/angular';
import { Geolocation } from '@capacitor/geolocation';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-booking',
  templateUrl: './booking.page.html',
  styleUrls: ['./booking.page.scss'],
  standalone: false
})
export class BookingPage implements OnInit {

  carId: string | null = null;
  car: any = null;
  isLoading = true;

  bookingData = {
    car_id: '',
    tanggal_mulai: '',
    tanggal_selesai: '',
    metode_pembayaran: 'Cash'
  };

  totalDays = 0;
  totalPrice = 0;
  deliveryFee = 0;
  paymentProofFile: File | null = null;
  
  isPaymentModalOpen = false;
  paymentId: any = null;
  minDate: string = new Date().toISOString().split('T')[0];

  branches: any[] = [];
  selectedBranchId: any = null;
  pickupMethod: string = 'cabang'; // 'cabang' or 'antar'
  deliveryAddress: string = '';
  
  private backButtonSub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private rental: RentalService,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController,
    private alertCtrl: AlertController,
    private navCtrl: NavController,
    private platform: Platform
  ) { }

  ngOnInit() {
    this.carId = this.route.snapshot.paramMap.get('id');
    if (this.carId) {
      this.bookingData.car_id = this.carId;
      this.loadCarDetail();
    }
    this.loadBranches();
  }

  ionViewDidEnter() {
    this.backButtonSub = this.platform.backButton.subscribeWithPriority(10, (processNextHandler) => {
      if (this.isPaymentModalOpen) {
        this.confirmCancelBooking();
      } else {
        // Panggil fungsi konfirmasi keluar
        this.goBack();
      }
    });
  }

  ionViewWillLeave() {
    if (this.backButtonSub) {
      this.backButtonSub.unsubscribe();
    }
  }

  async confirmCancelBooking() {
    const alert = await this.alertCtrl.create({
      header: 'Batalkan Pesanan?',
      message: 'Apakah Anda yakin ingin membatalkan pemesanan ini?',
      buttons: [
        { text: 'Tidak', role: 'cancel' },
        { 
          text: 'Ya, Batalkan', 
          handler: () => { 
            this.rental.cancelReservation(this.paymentId).subscribe({
              next: () => {
                this.isPaymentModalOpen = false;
                this.router.navigate(['/home']);
                this.showToast('Pesanan telah dibatalkan.', 'success');
              },
              error: () => {
                this.isPaymentModalOpen = false;
                this.router.navigate(['/home']);
                this.showToast('Pesanan dibatalkan.', 'success');
              }
            });
          } 
        }
      ]
    });
    await alert.present();
  }

  async goBack() {
    if (this.bookingData.tanggal_mulai || this.bookingData.tanggal_selesai || this.deliveryAddress.trim().length > 0) {
      const alert = await this.alertCtrl.create({
        header: 'Batalkan Pesanan?',
        message: 'Data formulir yang sudah Anda isi akan hilang. Yakin ingin keluar?',
        buttons: [
          { text: 'Tidak', role: 'cancel' },
          { text: 'Ya, Keluar', handler: () => { this.navCtrl.navigateBack('/home'); } }
        ]
      });
      await alert.present();
    } else {
      this.navCtrl.navigateBack('/home');
    }
  }

  loadBranches() {
    this.api.getBranches().subscribe({
      next: (res: any) => {
        let raw = res.data || res || [];
        this.branches = raw.map((b: any) => ({
          ...b,
          name: b.name || b.branch_name || b.nama_cabang
        }));
        this.autoSelectBranch();
      },
      error: () => {
        this.branches = [
          { id: 1, name: 'Karawang Timur', address: 'Jl. Raya Karawang Timur No. 12', map_link: 'https://maps.google.com' },
          { id: 2, name: 'Karawang Barat', address: 'Jl. Raya Karawang Barat No. 45', map_link: 'https://maps.google.com' }
        ];
        this.autoSelectBranch();
      }
    });
  }

  autoSelectBranch() {
    const savedName = localStorage.getItem('selectedBranch');
    if (savedName) {
      const b = this.branches.find(x => x.name === savedName);
      if (b) this.selectedBranchId = b.id;
    }
  }

  loadCarDetail() {
    this.isLoading = true;
    this.api.getCarById(this.carId!).subscribe({
      next: (res: any) => {
        this.car = res.data || res;
        this.isLoading = false;
        this.calculateTotal();
      },
      error: (err) => {
        this.isLoading = false;
        this.showToast('Gagal memuat data mobil', 'danger');
      }
    });
  }

  onPickupMethodChange() {
    this.calculateTotal();
    
    // Jika milih antar, otomatis pindah ke Transfer
    if (this.pickupMethod === 'antar' && this.bookingData.metode_pembayaran === 'Cash') {
      this.bookingData.metode_pembayaran = 'Transfer';
      this.showToast('Layanan Antar hanya melayani pembayaran via Transfer.', 'warning');
    }
  }

  calculateTotal() {
    if (!this.car) return;
    
    if (this.bookingData.tanggal_mulai && this.bookingData.tanggal_selesai) {
      const start = new Date(this.bookingData.tanggal_mulai);
      const end = new Date(this.bookingData.tanggal_selesai);
      
      // Jika tanggal selesai sebelum tanggal mulai
      if (end < start) {
        this.totalDays = 0;
        this.totalPrice = 0;
        return;
      }
      
      // Hitung selisih waktu
      const diffTime = end.getTime() - start.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      this.totalDays = diffDays > 0 ? diffDays : 1; 
    } else {
      this.totalDays = 1;
    }

    const price = this.car.harga_sewa || this.car.price || 0;
    this.totalPrice = price * this.totalDays;
  }

  onFileChange(event: any) {
    if (event.target.files && event.target.files.length > 0) {
      this.paymentProofFile = event.target.files[0];
    }
  }

  async getCurrentLocation(): Promise<{lat: number, lng: number} | null> {
    try {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000
      });
      return { lat: position.coords.latitude, lng: position.coords.longitude };
    } catch(err) {
      console.log('Gagal mendapatkan lokasi native, menggunakan fallback Karawang:', err);
      return { lat: -6.322731, lng: 107.337651 };
    }
  }

  async onSubmit(override: boolean = false) {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
      const alert = await this.alertCtrl.create({
        header: 'Login Diperlukan',
        message: 'Anda harus login terlebih dahulu untuk memesan mobil.',
        buttons: [
          { text: 'Batal', role: 'cancel' },
          { text: 'Login Sekarang', handler: () => this.router.navigate(['/login']) }
        ]
      });
      await alert.present();
      return;
    }

    if (!this.selectedBranchId) {
      this.showToast('Pilih cabang pengambilan mobil terlebih dahulu!', 'warning');
      return;
    }

    if (!this.bookingData.tanggal_mulai || !this.bookingData.tanggal_selesai) {
      this.showToast('Harap lengkapi tanggal mulai dan selesai!', 'warning');
      return;
    }

    if (this.totalDays < 1) {
      this.showToast('Durasi sewa tidak valid!', 'warning');
      return;
    }

    if (this.pickupMethod === 'antar' && !this.deliveryAddress.trim()) {
      this.showToast('Masukkan alamat pengiriman!', 'warning');
      return;
    }

    // Pengecekan Persetujuan Akses Lokasi (Disclosure) sudah dipindah ke app.component.ts saat awal buka aplikasi.
    // Kita langsung lanjutkan ke pemrosesan loading.

    const loading = await this.loadingCtrl.create({ message: 'Memproses pesanan...', spinner: 'circles' });
    await loading.present();

    if (!override) {
      try {
        const historyRes: any = await new Promise((resolve, reject) => {
          this.rental.getHistory().subscribe({ next: resolve, error: reject });
        });
        let rawData = historyRes.data || historyRes;
        if (rawData && rawData.data && Array.isArray(rawData.data)) rawData = rawData.data;
        if (!Array.isArray(rawData)) rawData = Object.values(rawData);
        
        const activeBookings = (Array.isArray(rawData) ? rawData : []).filter((b: any) => {
           const status = (b.reservations_status || b.status || '').toLowerCase();
           return status.includes('pending') || status.includes('booked') || status.includes('waiting') ||
                  status.includes('approv') || status.includes('confirm') || status.includes('konfirmasi') ||
                  status.includes('disetujui') || status.includes('active') || status.includes('rented') ||
                  status.includes('berjalan') || status.includes('running');
        });
        if (activeBookings.length > 0) {
            loading.dismiss();
            const alert = await this.alertCtrl.create({
                header: 'Peringatan!',
                message: 'Anda masih memiliki reservasi yang sedang aktif. Apakah Anda yakin ingin memesan mobil lagi?',
                buttons: [
                    { text: 'Batal', role: 'cancel' },
                    { text: 'Ya, Tetap Pesan', handler: () => { this.onSubmit(true); } }
                ]
            });
            await alert.present();
            return;
        }
      } catch(e) {
        console.error('Failed to check history:', e);
        // Lanjut jika gagal ambil history
      }
    }

    const loc = await this.getCurrentLocation();
    
    // Walaupun gagal get location, kita sudah handle dengan fallback di getCurrentLocation.
    // Jika tetap null karena suatu alasan sangat ekstrim, fallback lagi ke Karawang:
    const finalLat = loc?.lat || -6.322731;
    const finalLng = loc?.lng || 107.337651;

    let payload: any = {
      data_car_id: Number(this.bookingData.car_id),
      start_date: this.bookingData.tanggal_mulai,
      end_date: this.bookingData.tanggal_selesai,
      payment_method: this.bookingData.metode_pembayaran.toLowerCase(),
      latitude: finalLat,
      longitude: finalLng,
      pickupMethod: this.pickupMethod,
      branch_id: this.selectedBranchId,
      deliveryAddress: this.pickupMethod === 'antar' ? this.deliveryAddress : null
    };

    if (override) {
      payload.confirm_override = 1;
    }

    this.rental.addReservation(payload).subscribe({
      next: async (res: any) => {
        loading.dismiss();
        
        if (res.success === false || res.status === 'error' || res.status === false) {
           this.showToast(res.message || 'Gagal membuat reservasi. Periksa apakah mobil ini masih tersedia.', 'danger');
           return;
        }

        // Cek ID pembayaran dari response
        this.paymentId = res.payment?.id || res.data?.payment?.id || res.payment_id || res.data?.payment_id || res.id || res.data?.id; 

        // Ambil data ongkir jika ada
        let fetchedOngkir = res.data?.delivery_fee || res.delivery_fee || res.data?.reservation?.delivery_fee || res.reservation?.delivery_fee || 0;
        this.deliveryFee = Number(fetchedOngkir) || 0;

        if (this.bookingData.metode_pembayaran === 'Transfer') {
          // Buka modal QRIS
          this.isPaymentModalOpen = true;
        } else {
          // Cash payment atau tidak perlu upload
          this.showSuccessAlert();
        }
      },
      error: async (err) => {
        loading.dismiss();
        
        let msg = err.error?.message || 'Gagal membuat reservasi';
        if (msg.toLowerCase().includes('end date field must be a date after or equal to start date')) {
          msg = 'Tanggal selesai sewa harus setelah atau sama dengan tanggal mulai sewa.';
        }
        
        // Handle override / kondisi alert
        if (err.status === 409 || err.status === 400 || err.status === 422) {
           const lowerMsg = msg.toLowerCase();
           if (lowerMsg.includes('kondisi') || lowerMsg.includes('apakah') || lowerMsg.includes('tetap') || err.error?.requires_override || lowerMsg.includes('aktif') || lowerMsg.includes('reservasi aktif') || lowerMsg.includes('belum selesai')) {
             const alert = await this.alertCtrl.create({
               header: 'Perhatian Reservasi',
               message: msg + '<br><br>Apakah Anda tetap ingin melanjutkan reservasi?',
               buttons: [
                 { text: 'Batal', role: 'cancel' },
                 { text: 'Ya, Tetap Reservasi', handler: () => { this.onSubmit(true); } }
               ]
             });
             await alert.present();
             return;
           }
        }
        
        this.showToast(msg, 'danger');
      }
    });
  }

  async submitPaymentProof() {
    if (!this.paymentProofFile) {
      this.showToast('Harap unggah bukti pembayaran transfer Anda!', 'warning');
      return;
    }

    const loading = await this.loadingCtrl.create({ message: 'Mengunggah bukti...', spinner: 'circles' });
    await loading.present();

    const formData = new FormData();
    formData.append('proof_payment', this.paymentProofFile);

    this.rental.uploadPembayaran(this.paymentId, formData).subscribe({
      next: () => {
        loading.dismiss();
        this.isPaymentModalOpen = false;
        this.showSuccessAlert();
      },
      error: (err) => {
        loading.dismiss();
        this.showToast('Reservasi sukses, tapi gagal unggah bukti pembayaran.', 'warning');
        this.isPaymentModalOpen = false;
        this.router.navigate(['/history']);
      }
    });
  }

  skipPaymentProof() {
    this.isPaymentModalOpen = false;
    this.showSuccessAlert();
  }

  payLater() {
    this.isPaymentModalOpen = false;
    this.router.navigate(['/history']);
    this.showToast('Pesanan tersimpan di riwayat. Silakan lakukan pembayaran nanti.', 'success');
  }

  async showSuccessAlert() {
    this.router.navigate(['/home']);
    const alert = await this.alertCtrl.create({
      header: 'Pesanan Berhasil!',
      message: 'Permintaan sewa mobil Anda telah diterima dan sedang menunggu konfirmasi.',
      backdropDismiss: false,
      buttons: [
        {
          text: 'Lihat Riwayat',
          handler: () => {
            this.router.navigate(['/history']);
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
