import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-splash',
  templateUrl: './splash.page.html',
  styleUrls: ['./splash.page.scss'],
  standalone: false
})
export class SplashPage implements OnInit {

  showLogo = false;
  showText = false;
  showSubtitle = false;
  showProgress = false;
  animateProgress = false;
  isLeaving = false;

  constructor(private router: Router) { }

  ngOnInit() {
    this.startAnimation();
  }

  startAnimation() {
    // Sequence animations
    setTimeout(() => { this.showLogo = true; }, 300);
    setTimeout(() => { this.showText = true; }, 1000);
    setTimeout(() => { this.showSubtitle = true; }, 1400);
    
    // Start progress
    setTimeout(() => { 
      this.showProgress = true;
      this.animateProgress = true; 
    }, 1800);

    // End splash and navigate
    setTimeout(() => {
      this.isLeaving = true;
      setTimeout(() => {
        const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
        if (!hasSeenWelcome) {
          this.router.navigateByUrl('/welcome', { replaceUrl: true });
        } else {
          // Go straight to dashboard (home) since the app can be accessed without login
          this.router.navigateByUrl('/home', { replaceUrl: true });
        }
      }, 500);
    }, 4000);
  }

}
