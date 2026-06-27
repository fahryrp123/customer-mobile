import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { RentalService } from '../../services/rental.service';

import { ToastController, AlertController, LoadingController } from '@ionic/angular';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: false
})
export class HomePage implements OnInit {

  cars: any[] = [];
  filteredCars: any[] = [];
  isLoading = true;

  // Filter state
  showFilters = false;
  searchQuery = '';
  selectedTransmission = 'all';
  sortByPrice = 'none';

  // Dummy Banners
  banners = [
    { title: 'Diskon Akhir Pekan', discount: 'Diskon 20%', image: 'https://images.unsplash.com/photo-1503376760302-7c59af08ac32?q=80&w=600&auto=format&fit=crop', color: 'from-blue-600 to-blue-400' },
    { title: 'Sewa Bulanan', discount: 'Hemat 30%', image: 'https://images.unsplash.com/photo-1542282088-fe8426682b8f?q=80&w=600&auto=format&fit=crop', color: 'from-purple-600 to-purple-400' }
  ];

  // Dummy Categories
  categories = [
    { name: 'Semua', icon: 'apps-outline', active: true },
    { name: 'Hatchback', icon: 'car-sport-outline', active: false },
    { name: 'MPV', icon: 'car-outline', active: false },
    { name: 'SUV', icon: 'car-outline', active: false },
    { name: 'Sedan', icon: 'car-sport-outline', active: false }
  ];

  userName = 'Pelanggan';

  // Notifications state
  isNotificationsOpen = false;
  notifications: any[] = [];
  unreadNotificationsCount = 0;

  // Branches state
  isBranchesOpen = false;
  branches: any[] = [];
  selectedBranchName = localStorage.getItem('selectedBranch') || 'Karawang';

  rejectedReservationsCount = 0;
  activeRejectedTickets: any[] = [];

  constructor(
    private api: ApiService,
    private rental: RentalService,
    public router: Router,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController
  ) { }

  pollingInterval: any = null;

  ngOnInit() {
    this.loadBranchesSilent();
  }

  ionViewWillEnter() {
    this.loadCars();
    this.loadUser();
    this.loadUnreadCount();
    this.checkRejected();

    // Start Polling every 10 seconds
    if (!this.pollingInterval) {
      this.pollingInterval = setInterval(() => {
        this.loadCarsSilent();
        this.checkRejected();
      }, 10000);
    }
  }

  checkRejected() {
    const token = localStorage.getItem('token');
    if (!token) return;
    this.rental.getHistory().subscribe({
      next: async (res: any) => {
        const hist = res.data?.data || res.data || res || [];
        if (Array.isArray(hist)) {
          const rejectedTickets = hist.filter(t => {
            const st = (t.status || t.reservations_status || t.payment_status || '').toLowerCase();
            const isRefunded = (t.refund_status || '').toLowerCase() === 'refunded' || st.includes('refund');
            return (st.includes('reject') || st.includes('tolak')) && !isRefunded;
          });
          const dismissedIds = JSON.parse(localStorage.getItem('dismissedRejectedIds') || '[]');
          
          const activeRejected = rejectedTickets.filter(t => !dismissedIds.includes(t.id));
          
          this.activeRejectedTickets = activeRejected;
          this.rejectedReservationsCount = this.activeRejectedTickets.length;
        }
      },
      error: () => {}
    });
  }

  dismissRejectedBanner(event: Event) {
    event.stopPropagation();
    const dismissedIds = JSON.parse(localStorage.getItem('dismissedRejectedIds') || '[]');
    this.activeRejectedTickets.forEach(t => {
      if (!dismissedIds.includes(t.id)) dismissedIds.push(t.id);
    });
    localStorage.setItem('dismissedRejectedIds', JSON.stringify(dismissedIds));
    this.rejectedReservationsCount = 0;
  }

  ionViewWillLeave() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  loadUser() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.userName = user.name || user.username || 'Pelanggan';
      } catch (e) {}
    } else {
      this.userName = 'Pelanggan';
    }
  }

  loadCars(event?: any) {
    this.api.getCars().subscribe({
      next: (res: any) => {
        this.cars = res.data?.data || res.data || res || [];
        // Strictly follow database status as requested
        this.cars = this.cars.map(c => ({
          ...c,
          display_status: c.availability_status || c.status || 'available'
        }));
        this.filterCars();
        this.isLoading = false;
        if (event) {
          event.target.complete();
        }
      },
      error: (err) => {
        console.error('Error fetching cars', err);
        this.isLoading = false;
        if (event) {
          event.target.complete();
        }
      }
    });
  }

  loadCarsSilent() {
    this.api.getCars().subscribe({
      next: (res: any) => {
        let newData = res.data?.data || res.data || res || [];
        if (Array.isArray(newData)) {
          newData = newData.map((c: any) => ({
            ...c,
            display_status: c.availability_status || c.status || 'available'
          }));
        }

        // Cek secara spesifik field status dan ID untuk menghindari false positive (seperti perubahan updated_at)
        let changed = false;
        if (!this.cars || this.cars.length !== newData.length) {
          changed = true;
        } else {
          // Asumsi urutan data dari API konsisten
          for (let i = 0; i < this.cars.length; i++) {
            if (
              this.cars[i].id !== newData[i].id || 
              this.cars[i].display_status !== newData[i].display_status ||
              this.cars[i].harga_sewa !== newData[i].harga_sewa
            ) {
              changed = true;
              break;
            }
          }
        }

        if (changed) {
          this.cars = newData;
          this.filterCars();
        }
      },
      error: (err) => {
        console.error('Failed to load cars silently', err);
      }
    });
  }

  trackByCar(index: number, car: any) {
    return car.id;
  }

  doRefresh(event: any) {
    this.loadCars(event);
    this.loadUser();
    this.loadUnreadCount();
  }

  selectCategory(idx: number) {
    this.categories.forEach((c, i) => c.active = i === idx);
    this.filterCars();
  }

  toggleFilters() {
    this.showFilters = !this.showFilters;
  }

  filterCars() {
    let result = [...this.cars];

    // 1. Search Query
    if (this.searchQuery && this.searchQuery.trim() !== '') {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(car => 
        ((car.name_car || car.nama_mobil || car.type || '')?.toLowerCase().includes(q)) ||
        ((car.model || '')?.toLowerCase().includes(q)) ||
        ((car.kategori || '')?.toLowerCase().includes(q)) ||
        ((car.description || car.deskripsi || '')?.toLowerCase().includes(q))
      );
    }

    // 2. Category Pill Filter
    const activeCat = this.categories.find(c => c.active);
    if (activeCat && activeCat.name !== 'Semua') {
      const catName = activeCat.name.toLowerCase();
      result = result.filter(car => {
        const carCat = (car.kategori || '').toLowerCase();
        const carModel = (car.model || '').toLowerCase();
        const carName = (car.name_car || car.nama_mobil || car.type || '').toLowerCase();
        
        if (catName === 'premium') {
          return carCat.includes('premium') || carModel.includes('premium') || carModel.includes('sport') || Number(car.price || car.harga_sewa || 0) >= 500000;
        }
        return carCat.includes(catName) || carModel.includes(catName) || carName.includes(catName);
      });
    }

    // 3. Transmission Filter
    if (this.selectedTransmission && this.selectedTransmission !== 'all') {
      const trans = this.selectedTransmission.toLowerCase();
      result = result.filter(car => 
        (car.transmisi && car.transmisi.toLowerCase().includes(trans))
      );
    }

    // 4. Sorting by Price
    if (this.sortByPrice === 'low_to_high') {
      result.sort((a, b) => Number(a.price || a.harga_sewa || 0) - Number(b.price || b.harga_sewa || 0));
    } else if (this.sortByPrice === 'high_to_low') {
      result.sort((a, b) => Number(b.price || b.harga_sewa || 0) - Number(a.price || a.harga_sewa || 0));
    }

    this.filteredCars = result;
  }

  // ==========================================
  // NOTIFICATIONS LOGIC
  // ==========================================

  loadUnreadCount() {
    const isLoggedIn = !!localStorage.getItem('token');
    if (!isLoggedIn) {
      this.unreadNotificationsCount = 0;
      return;
    }

    this.api.getNotificationsUnreadCount().subscribe({
      next: (res: any) => {
        const apiCount = res.unread_count || res.data?.unread_count || res.count || 0;
        this.unreadNotificationsCount = apiCount + (this.activeRejectedTickets ? this.activeRejectedTickets.length : 0);
      },
      error: () => {
        this.unreadNotificationsCount = this.activeRejectedTickets ? this.activeRejectedTickets.length : 0;
      }
    });
  }

  async openNotifications() {
    const isLoggedIn = !!localStorage.getItem('token');
    if (!isLoggedIn) {
      const alert = await this.alertCtrl.create({
        header: 'Akses Terbatas',
        message: 'Silakan masuk atau daftar akun baru terlebih dahulu untuk melihat notifikasi Anda.',
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

    this.isNotificationsOpen = true;
    this.loadNotifications();
  }

  closeNotifications() {
    this.isNotificationsOpen = false;
  }

  loadNotifications() {
    this.api.getNotifications().subscribe({
      next: (res: any) => {
        let apiNotifs = res.data?.data || res.data || res || [];
        if (!Array.isArray(apiNotifs)) apiNotifs = [];

        // Manual injection for rejected notifications so they don't disappear
        if (this.activeRejectedTickets && this.activeRejectedTickets.length > 0) {
          const rejectedNotifs = this.activeRejectedTickets.map(t => ({
             id: 'rej_' + t.id,
             title: 'Pesanan Ditolak',
             message: `Pesanan Anda dengan ID #${t.id} telah ditolak oleh admin. Alasan: ${t.reason_rejected || t.alasan_ditolak || t.reason || t.alasan || 'Pemesanan tidak dapat dipenuhi saat ini.'}. Silakan ajukan pengembalian dana.`,
             is_read: false,
             created_at: t.updated_at || t.created_at || new Date().toISOString()
          }));
          
          this.notifications = [...rejectedNotifs, ...apiNotifs];
        } else {
          this.notifications = apiNotifs;
        }
      },
      error: (err) => {
        console.error('Error fetching notifications', err);
      }
    });
  }

  markNotificationAsRead(item: any) {
    if (item.read_at) return; // sudah dibaca

    this.api.markNotificationAsRead(item.id).subscribe({
      next: () => {
        item.read_at = new Date().toISOString();
        this.loadUnreadCount();
      },
      error: (err) => {
        console.error('Error marking notification read', err);
      }
    });
  }

  async clearAllNotifications() {
    // Mark all as read behind the scenes
    const unread = this.notifications.filter(n => !n.read_at);
    unread.forEach(n => {
      this.api.markNotificationAsRead(n.id).subscribe();
    });
    
    // Clear the array to give immediate visual feedback
    this.notifications = [];
    this.unreadNotificationsCount = 0;
  }

  // ==========================================
  // BRANCHES LOGIC
  // ==========================================

  loadBranchesSilent() {
    this.api.getBranches().subscribe({
      next: (res: any) => {
        let raw = res.data || res || [];
        this.branches = raw.map((b: any) => ({
          ...b,
          name: b.name || b.branch_name || b.nama_cabang
        }));
      },
      error: () => {}
    });
  }

  async openBranchesModal() {
    const loading = await this.loadingCtrl.create({ message: 'Memuat data cabang...', spinner: 'circles' });
    await loading.present();

    this.api.getBranches().subscribe({
      next: (res: any) => {
        loading.dismiss();
        let raw = res.data || res || [];
        this.branches = raw.map((b: any) => ({
          ...b,
          name: b.name || b.branch_name || b.nama_cabang
        }));
        this.isBranchesOpen = true;
      },
      error: (err) => {
        loading.dismiss();
        // fallback dummy branches (2 branches as per backend)
        this.branches = [
          { id: 1, name: 'Karawang Timur', address: 'Jl. Raya Karawang Timur No. 12' },
          { id: 2, name: 'Karawang Barat', address: 'Jl. Raya Karawang Barat No. 45' }
        ];
        this.isBranchesOpen = true;
      }
    });
  }

  closeBranchesModal() {
    this.isBranchesOpen = false;
  }

  selectBranch(branch: any) {
    this.selectedBranchName = branch.name;
    localStorage.setItem('selectedBranch', branch.name);
    this.isBranchesOpen = false;
    this.showToast(`Cabang terpilih: ${branch.name}`, 'success');
  }

  openMaps(branch: any) {
    const address = branch.address || branch.alamat || branch.name || 'SewaMobilYuk';
    const query = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_system');
  }

  async showToast(msg: string, color: string) {
    const toast = await this.toastCtrl.create({ message: msg, duration: 2000, color: color, position: 'top' });
    toast.present();
  }

}
