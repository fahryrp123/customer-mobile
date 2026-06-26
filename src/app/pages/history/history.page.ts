import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { RentalService } from '../../services/rental.service';
import { ToastController, AlertController, LoadingController } from '@ionic/angular';

import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-history',
  templateUrl: './history.page.html',
  styleUrls: ['./history.page.scss'],
  standalone: false
})
export class HistoryPage implements OnInit {


  history: any[] = [];
  branches: any[] = [];
  isLoading = true;

  // Segment and Polling state
  activeSegment = 'active';
  pollingInterval: any = null;
  isTicketModalOpen = false;
  selectedTicket: any = null;
  currentProfileName = 'Pelanggan';

  constructor(
    private route: ActivatedRoute,
    private rental: RentalService,
    private api: ApiService,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController
  ) { }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['tab']) {
        this.activeSegment = params['tab'];
      }
    });
  }

  ionViewWillEnter() {
    this.loadProfileName();
    
    // Only load history if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
      this.isLoading = false;
      this.history = [];
      return;
    }
    
    this.loadBranches();
    this.loadHistory();
    
    // Start Polling every 5 seconds
    if (!this.pollingInterval) {
      this.pollingInterval = setInterval(() => {
        this.loadHistorySilently();
      }, 5000);
    }
  }

  doRefresh(event: any) {
    this.loadHistory(event);
  }

  ionViewWillLeave() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  loadProfileName() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.currentProfileName = user.name || user.username || 'Pelanggan';
      } catch (e) {}
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
      }
    });
  }

  loadHistory(event?: any) {
    const token = localStorage.getItem('token');
    if (!token) {
      this.history = [];
      if (event) event.target.complete();
      return;
    }

    this.isLoading = !event;
    this.api.getCars().subscribe({
      next: (carsRes: any) => {
        const cars = carsRes.data?.data || carsRes.data || carsRes;
        
        this.rental.getHistory().subscribe({
          next: (res: any) => {
            const data = res.data || res;
            this.history = data.map((item: any) => {
              const matchedCar = cars.find((c: any) => Number(c.id) === Number(item.data_car_id));
              const matchedBranch = this.branches.find((b: any) => Number(b.id) === Number(item.branch_id));
              return {
                ...item,
                status: item.reservations_status || item.status,
                tanggal_mulai: item.start_date || item.tanggal_mulai,
                tanggal_selesai: item.end_date || item.tanggal_selesai,
                total_harga: item.total_price || item.total_harga,
                car: matchedCar || null,
                branch: matchedBranch || item.branch || null
              };
            }).sort((a: any, b: any) => b.id - a.id);
            this.isLoading = false;
            if (event) event.target.complete();
          },
          error: (err) => {
            console.error('Error fetching history items', err);
            this.isLoading = false;
            if (event) event.target.complete();
            if (err.status !== 401) {
              this.showToast('Gagal memuat riwayat.', 'danger');
            }
          }
        });
      },
      error: (err) => {
        console.error('Error fetching cars for history', err);
        this.isLoading = false;
        if (event) event.target.complete();
        if (err.status !== 401) {
          this.showToast('Gagal memuat katalog mobil.', 'danger');
        }
      }
    });
  }

  loadHistorySilently() {
    this.api.getCars().subscribe({
      next: (carsRes: any) => {
        const cars = carsRes.data?.data || carsRes.data || carsRes;
        
        this.rental.getHistory().subscribe({
          next: (res: any) => {
            const data = res.data || res;
            this.history = data.map((item: any) => {
              const matchedCar = cars.find((c: any) => Number(c.id) === Number(item.data_car_id));
              const matchedBranch = this.branches.find((b: any) => Number(b.id) === Number(item.branch_id));
              return {
                ...item,
                status: item.reservations_status || item.status,
                tanggal_mulai: item.start_date || item.tanggal_mulai,
                tanggal_selesai: item.end_date || item.tanggal_selesai,
                total_harga: item.total_price || item.total_harga,
                car: matchedCar || null,
                branch: matchedBranch || item.branch || null
              };
            }).sort((a: any, b: any) => b.id - a.id);

            // Update ticket in place if details modal is open
            if (this.isTicketModalOpen && this.selectedTicket) {
              const updated = this.history.find(h => h.id === this.selectedTicket.id);
              if (updated) {
                this.selectedTicket = updated;
              }
            }
          },
          error: (err) => {
            console.error('Silent fetch history error:', err);
          }
        });
      },
      error: (err) => {
        console.error('Silent fetch cars error:', err);
      }
    });
  }

  getActiveBookings(): any[] {
    return this.history.filter((item: any) => {
      const s = (item.status || '').toLowerCase();
      return s.includes('pending') || s.includes('approve') || s.includes('active') || s.includes('running') || s.includes('berjalan') || s.includes('jalan') || s.includes('ongoing') || s.includes('on-going') || s.includes('booked') || s.includes('waiting') || s.includes('confirm') || s.includes('konfirmasi') || s.includes('rented') || s.includes('disetujui');
    });
  }

  getHistoryBookings(): any[] {
    return this.history.filter((item: any) => {
      const s = (item.status || '').toLowerCase();
      return s.includes('cancel') || s.includes('reject') || s.includes('done') || s.includes('finish') || s.includes('selesai') || s.includes('completed');
    });
  }

  canCancel(item: any): boolean {
    if (!item) return false;
    const s = (item.status || '').toLowerCase();
    const isCancellableStatus = s.includes('pending') || s.includes('booked') || s.includes('waiting') || s.includes('approve') || s.includes('confirm') || s.includes('disetujui');
    
    return isCancellableStatus;
  }

  openTicketModal(ticket: any) {
    this.selectedTicket = ticket;
    this.isTicketModalOpen = true;
  }

  closeTicketModal() {
    this.isTicketModalOpen = false;
    this.selectedTicket = null;
  }

  async confirmCancel(id: string | number) {
    const item = this.history.find(h => h.id === id);
    if (item && item.tanggal_mulai) {
      const startDate = new Date(item.tanggal_mulai);
      startDate.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 1) {
        const alertH1 = await this.alertCtrl.create({
          header: 'Pembatalan Ditolak',
          message: 'Pesanan tidak dapat dibatalkan secara otomatis karena sudah memasuki H-1 atau hari keberangkatan. Silakan hubungi Admin.',
          buttons: ['Tutup']
        });
        await alertH1.present();
        return;
      }
    }

    const alert = await this.alertCtrl.create({
      header: 'Batalkan Sewa?',
      message: 'Apakah Anda yakin ingin membatalkan reservasi ini?',
      buttons: [
        { text: 'Tidak', role: 'cancel' },
        { text: 'Ya, Batalkan', handler: () => this.cancelReservation(id) }
      ]
    });
    await alert.present();
  }

  async cancelReservation(id: string | number) {
    const loading = await this.loadingCtrl.create({ message: 'Membatalkan...', spinner: 'circles' });
    await loading.present();

    this.rental.cancelReservation(id).subscribe({
      next: () => {
        loading.dismiss();
        this.showToast('Reservasi berhasil dibatalkan.', 'success');
        this.loadHistory(); 
      },
      error: (err) => {
        loading.dismiss();
        this.showToast(err.error?.message || 'Gagal membatalkan reservasi', 'danger');
      }
    });
  }

  async requestRefund(id: string | number) {
    const alert = await this.alertCtrl.create({
      header: 'Ajukan Refund',
      message: 'Karena proses refund memerlukan verifikasi bank manual, silakan hubungi Admin melalui WhatsApp untuk proses pengembalian dana Anda.',
      buttons: [
        { text: 'Nanti Saja', role: 'cancel' },
        { 
          text: 'Hubungi Admin', 
          handler: () => {
            window.open('https://wa.me/6285774080153?text=Halo%20Admin,%20saya%20ingin%20mengajukan%20refund%20untuk%20pesanan%20dengan%20ID%20' + id, '_blank');
          }
        }
      ]
    });
    await alert.present();
  }

  async processRefund(id: string | number) {
    // Deprecated. Handled by requestRefund directly now.
  }

  async showToast(msg: string, color: string) {
    const toast = await this.toastCtrl.create({ message: msg, duration: 2000, color: color, position: 'top' });
    toast.present();
  }

  getStatusColor(status: string): string {
    const s = (status || '').toLowerCase();
    if (s.includes('pending') || s.includes('booked') || s.includes('waiting')) {
      return 'bg-amber-100 text-amber-700 border-amber-200';
    } else if (s.includes('approv') || s.includes('active') || s.includes('success') || s.includes('berjalan') || s.includes('running') || s.includes('confirm') || s.includes('konfirmasi') || s.includes('rented') || s.includes('disetujui')) {
      return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    } else if (s.includes('cancel') || s.includes('reject') || s.includes('batal') || s.includes('tolak')) {
      return 'bg-rose-100 text-rose-700 border-rose-200';
    } else if (s.includes('finish') || s.includes('done') || s.includes('selesai') || s.includes('complet')) {
      return 'bg-blue-100 text-blue-700 border-blue-200';
    } else {
      return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  }

  getStatusText(status: string): string {
    const s = (status || '').toLowerCase();
    if (s.includes('pending_cash')) return 'Menunggu Tunai';
    if (s.includes('pending_transfer')) return 'Menunggu Transfer';
    if (s.includes('pending')) return 'Menunggu';
    if (s.includes('booked') || s.includes('waiting')) return 'Menunggu Konfirmasi';
    if (s.includes('approv') || s.includes('confirm') || s.includes('konfirmasi') || s.includes('disetujui')) return 'Dikonfirmasi';
    if (s.includes('active') || s.includes('berjalan') || s.includes('running') || s.includes('rented')) return 'Berjalan';
    if (s.includes('cancel') || s.includes('batal')) return 'Dibatalkan';
    if (s.includes('reject') || s.includes('tolak')) return 'Ditolak';
    if (s.includes('finish') || s.includes('done') || s.includes('selesai') || s.includes('complet')) return 'Selesai';
    // Uppercase first letter for others
    return status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Status Lainnya';
  }

}

