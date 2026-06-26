import { Component, OnInit } from '@angular/core';
import { ApiService } from './services/api.service';
import { RentalService } from './services/rental.service';
import { LocalNotifications } from '@capacitor/local-notifications';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit {
  private lastUnreadCount = 0;
  private lastRejectedIds: string[] = [];

  constructor(private api: ApiService, private rental: RentalService) {}

  async ngOnInit() {
    await LocalNotifications.requestPermissions();
    
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
