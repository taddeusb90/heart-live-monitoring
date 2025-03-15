import { Component } from '@angular/core';
import { Router } from '@angular/router';
@Component({
  selector: 'app-main-view',
  imports: [],
  templateUrl: './main-view.component.html',
  styleUrl: './main-view.component.scss'
})
export class MainViewComponent {
  constructor(private router: Router) {}

  goToLiveSession() {
    this.router.navigate(['/live-session']);
  }

  goToSessionHistory() {
    this.router.navigate(['/session-history']);
  }
}
