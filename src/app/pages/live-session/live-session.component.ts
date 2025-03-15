import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { SessionManagerService } from '../../services/session-manager/session-manager.service';
import { CameraFeedComponent } from '../../components/camera-feed/camera-feed.component';
import { PointcloudViewerComponent } from '../../components/pointcloud-viewer/pointcloud-viewer.component';
import { EkgPressureChartComponent } from '../../components/ekg-pressure-chart/ekg-pressure-chart.component';
import { SessionControlsComponent } from '../../components/session-controls/session-controls.component';

@Component({
  selector: 'app-live-session',
  imports: [CommonModule, CameraFeedComponent, PointcloudViewerComponent, EkgPressureChartComponent, SessionControlsComponent],
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
