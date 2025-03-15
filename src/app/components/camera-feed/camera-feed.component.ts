import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { CppApiService } from '../../services/cpp-api/cpp-api.service';

@Component({
  selector: 'app-camera-feed',
  imports: [],
  templateUrl: './camera-feed.component.html',
  styleUrl: './camera-feed.component.scss'
})
export class CameraFeedComponent {

  /**
   * Base64 data URLs for the latest images
   */
  public bmpSrc: string | null = null; // Depth image in BMP
  public jpgSrc: string | null = null; // Color image in JPG

  /**
   * Subscriptions to the C++ server streams
   */
  private bmpSub!: Subscription;
  private jpgSub!: Subscription;

  constructor(private cppApiService: CppApiService) {}

  ngOnInit(): void {
    // Subscribe to new BMP images
    this.bmpSub = this.cppApiService.onBmp().subscribe((bmpData) => {
      // Convert the base64 payload into a data URL for <img src>
      this.bmpSrc = 'data:image/bmp;base64,' + bmpData.base64;
    });

    // Subscribe to new JPG images
    this.jpgSub = this.cppApiService.onJpg().subscribe((jpgData) => {
      // Convert the base64 payload into a data URL for <img src>
      this.jpgSrc = 'data:image/jpeg;base64,' + jpgData.base64;
    });
  }

  ngOnDestroy(): void {
    // Unsubscribe to avoid memory leaks
    if (this.bmpSub) {
      this.bmpSub.unsubscribe();
    }
    if (this.jpgSub) {
      this.jpgSub.unsubscribe();
    }
  }
}
