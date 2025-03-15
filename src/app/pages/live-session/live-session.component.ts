import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { SessionManagerService } from '../../services/session-manager/session-manager.service';
@Component({
  selector: 'app-live-session',
  imports: [CommonModule],
  templateUrl: './live-session.component.html',
  styleUrl: './live-session.component.scss'
})
export class LiveSessionComponent {

  // Example: track if a session is active, or sessionId
  public sessionId: number | null = null;
  private sessionSub!: Subscription;

  constructor(private sessionManager: SessionManagerService) {}

  ngOnInit(): void {
    // Optionally subscribe to session changes
    this.sessionSub = this.sessionManager.activeSession$.subscribe((state: { sessionId: number | null; }) => {
      this.sessionId = state.sessionId;
    });
  }

  ngOnDestroy(): void {
    if (this.sessionSub) {
      this.sessionSub.unsubscribe();
    }
  }
}
