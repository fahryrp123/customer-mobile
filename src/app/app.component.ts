import { Component, OnInit } from '@angular/core';
import { ApiService } from './services/api.service';
import { RentalService } from './services/rental.service';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Geolocation } from '@capacitor/geolocation';
import { App } from '@capacitor/app';
import { AlertController, Platform } from '@ionic/angular';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit {
  private lastUnreadCount = 0;
  private lastRejectedIds: string[] = [];

  constructor(
    private api: ApiService, 
    private rental: RentalService,
    private alertCtrl: AlertController,
    private router: Router,
    private platform: Platform
  ) {
    this.initializeApp();
  }

  initializeApp() {
    this.platform.ready().then(() => {
      this.platform.backButton.subscribeWithPriority(10, async (processNextHandler) => {
        if (this.router.url === '/home' || this.router.url === '/login' || this.router.url === '/welcome') {
          const alert = await this.alertCtrl.create({
            header: 'Keluar Aplikasi',
            message: 'Apakah Anda yakin ingin keluar dari aplikasi SewaMobilYuk?',
            buttons: [
              { text: 'Batal', role: 'cancel' },
              { text: 'Ya, Keluar', handler: () => App.exitApp() }
            ]
          });
          await alert.present();
        } else {
          processNextHandler();
        }
      });
    });
  }

  async ngOnInit() {
    await LocalNotifications.requestPermissions();
    
    // Pengecekan Persetujuan Akses Lokasi (Disclosure) di awal
    const hasAgreed = localStorage.getItem('location_agreed');
    if (hasAgreed !== 'true') {
      const alert = await this.alertCtrl.create({
        header: 'Izinkan Akses Lokasi',
        message: '<b>SewaMobilYuk memerlukan akses lokasi untuk:</b><br><br>' +
                 '• Menentukan cabang rental terdekat.<br>' +
                 '• Menemukan daftar mobil di sekitar Anda.<br>' +
                 '• Menghitung biaya pengantaran jika memilih layanan antar.<br><br>' +
                 '<i>Lokasi hanya digunakan saat aplikasi berjalan.</i>',
        backdropDismiss: false,
        buttons: [
          { text: 'Mengerti', handler: async () => {
             localStorage.setItem('location_agreed', 'true');
             // Memicu prompt bawaan sistem secara transparan menembus ke OS
             try {
               await Geolocation.requestPermissions();
             } catch(e) {
               console.log('Error requesting location permission', e);
             }
          }}
        ]
      });
      await alert.present();
    }
    
    // Poll notifications every 10 seconds globally
    setInterval(() => {
      const token = localStorage.getItem('token');
      if (token) {
        // Poll backend notifications
        this.api.getNotificationsUnreadCount().subscribe({
          next: (res: any) => {
            const count = res.unread_count || res.data?.unread_count || res.count || 0;
            if (count > this.lastUnreadCount) {
              // New notification arrived!
              LocalNotifications.schedule({
                notifications: [
                  {
                    title: 'Pemberitahuan Baru',
                    body: 'Anda memiliki notifikasi baru dari SewaMobilYuk.',
                    id: new Date().getTime() % 100000,
                    schedule: { at: new Date(Date.now() + 1000) }
                  }
                ]
              });
            }
            this.lastUnreadCount = count;
          },
          error: () => {}
        });

        // Poll history for rejected tickets
        this.rental.getHistory().subscribe({
          next: (res: any) => {
            const hist = res.data?.data || res.data || res || [];
            if (Array.isArray(hist)) {
              const currentRejectedIds = hist.filter(t => {
                const st = (t.status || t.reservations_status || t.payment_status || '').toLowerCase();
                const isRefunded = (t.refund_status || '').toLowerCase() === 'refunded' || st.includes('refund');
                return (st.includes('reject') || st.includes('tolak')) && !isRefunded;
              }).map(t => String(t.id));

              const newRejections = currentRejectedIds.filter(id => !this.lastRejectedIds.includes(id));
              
              // Jika ada pesanan ditolak baru, dan ini bukan load pertama kali
              if (newRejections.length > 0 && this.lastRejectedIds.length > 0) {
                 LocalNotifications.schedule({
                   notifications: [{
                     title: 'Pesanan Ditolak',
                     body: `Pesanan Anda ada yang ditolak oleh admin. Silakan cek aplikasi.`,
                     id: new Date().getTime() % 100000 + 1,
                     schedule: { at: new Date(Date.now() + 1000) }
                   }]
                 });
              }
              
              if (this.lastRejectedIds.length === 0 && currentRejectedIds.length > 0) {
                 this.lastRejectedIds = currentRejectedIds;
              } else if (newRejections.length > 0) {
                 this.lastRejectedIds = [...new Set([...this.lastRejectedIds, ...currentRejectedIds])];
              }
            }
          },
          error: () => {}
        });
      }
    }, 10000);
  }
}
