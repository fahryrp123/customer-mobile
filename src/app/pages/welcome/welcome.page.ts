import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.page.html',
  styleUrls: ['./welcome.page.scss'],
  standalone: false
})
export class WelcomePage implements OnInit {

  @ViewChild('slider', { static: false }) slider!: ElementRef;
  currentSlide = 0;

  slides = [
    {
      title: 'Armada Premium',
      description: 'Rasakan sensasi berkendara dengan koleksi mobil mewah terbaik untuk setiap momen spesial Anda.',
      image: 'https://images.pexels.com/photos/120049/pexels-photo-120049.jpeg?auto=compress&cs=tinysrgb&w=800'
    },
    {
      title: 'Pesan Tanpa Ribet',
      description: 'Proses reservasi instan dari genggaman. Pilih mobil, tentukan waktu, dan langsung berangkat.',
      image: 'https://images.pexels.com/photos/170811/pexels-photo-170811.jpeg?auto=compress&cs=tinysrgb&w=800'
    },
    {
      title: 'Eksklusivitas',
      description: 'Layanan VIP 24/7 dan asuransi menyeluruh memastikan ketenangan pikiran di setiap perjalanan.',
      image: 'https://images.pexels.com/photos/3729464/pexels-photo-3729464.jpeg?auto=compress&cs=tinysrgb&w=800'
    }
  ];

  constructor(private router: Router) { }

  ngOnInit() {
  }

  onScroll(event: any) {
    const scrollLeft = event.target.scrollLeft;
    const clientWidth = event.target.clientWidth;
    this.currentSlide = Math.round(scrollLeft / clientWidth);
  }

  nextSlide() {
    if (this.currentSlide < this.slides.length - 1) {
      const el = this.slider.nativeElement;
      el.scrollTo({
        left: el.scrollLeft + el.clientWidth,
        behavior: 'smooth'
      });
    }
  }

  finishWelcome() {
    localStorage.setItem('hasSeenWelcome', 'true');
    this.router.navigateByUrl('/home', { replaceUrl: true });
  }
}
