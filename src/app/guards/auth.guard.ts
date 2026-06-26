import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { AlertController } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(
    private router: Router,
    private alertCtrl: AlertController
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Promise<boolean> | boolean {
    
    const isLoggedIn = !!localStorage.getItem('token');
    
    if (!isLoggedIn) {
      return this.showChoiceAlert();
    }
    return true;
  }

  async showChoiceAlert(): Promise<boolean> {
    return new Promise(async (resolve) => {
      const alert = await this.alertCtrl.create({
        header: 'Akses Terbatas',
        message: 'Silakan masuk atau daftar akun baru terlebih dahulu untuk mengakses fitur ini.',
        cssClass: 'custom-alert',
        buttons: [
          {
            text: 'Daftar (Register)',
            handler: () => {
              this.router.navigate(['/register']);
              resolve(false);
            }
          },
          {
            text: 'Masuk (Login)',
            handler: () => {
              this.router.navigate(['/login']);
              resolve(false);
            }
          },
          {
            text: 'Batal',
            role: 'cancel',
            handler: () => {
              resolve(false);
            }
          }
        ]
      });
      await alert.present();
    });
  }
}
