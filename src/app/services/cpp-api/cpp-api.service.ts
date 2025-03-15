import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Subject, Observable, Subscription } from 'rxjs';

// Example interface for messages from your C++ WebSocket:
export interface CppWsMessage {
  // For images or point cloud
  filename?: string;
  fileType?: string;  // e.g. "bmp", "jpg", "ply", or "pointcloud-json"
  session?: string;
  payload?: string;   // base64 (for images) or JSON string (for pointcloud)
  // Extend as needed...
}

@Injectable({
  providedIn: 'root',
})
export class CppApiService implements OnDestroy {
  // Update these to match your server config
  private httpBaseUrl = 'http://localhost:8080'; // your C++ server’s HTTP port
  private wsUrl = 'ws://localhost:9002';         // your C++ server’s WebSocket port

  // Internal WebSocket reference
  private ws: WebSocket | null = null;

  // Subjects to broadcast different incoming data
  // You can add more for depth, color, or combine them if you prefer
  private bmpSubject = new Subject<{ filename: string; base64: string; session: string }>();
  private jpgSubject = new Subject<{ filename: string; base64: string; session: string }>();
  private pointCloudSubject = new Subject<{
    filename: string;
    session: string;
    // Could be raw JSON or a parsed structure
    data: any;
  }>();

  // If you need a single stream for *all* messages, you can also keep a general subject:
  private rawMessageSubject = new Subject<CppWsMessage>();

  constructor(private http: HttpClient) {
    // Optionally, you can open the WebSocket immediately:
    this.connectWebSocket();
  }

  /**
   * ---------------------------------------------------------------------
   *  WEB SOCKET HANDLING
   * ---------------------------------------------------------------------
   */
  public connectWebSocket(): void {
    if (this.ws) {
      // Close existing if open
      this.ws.close();
      this.ws = null;
    }

    this.ws = new WebSocket(this.wsUrl);

    this.ws.onopen = () => {
      console.log('[CppApiService] WebSocket connected.');
    };

    this.ws.onclose = () => {
      console.warn('[CppApiService] WebSocket closed. Attempting to reconnect in 5s...');
      // Auto-reconnect logic if desired:
      setTimeout(() => {
        this.connectWebSocket();
      }, 5000);
    };

    this.ws.onerror = (err) => {
      console.error('[CppApiService] WebSocket error:', err);
    };

    this.ws.onmessage = (event: MessageEvent) => {
      this.handleWsMessage(event.data);
    };
  }

  private handleWsMessage(data: any): void {
    let msg: CppWsMessage;
    try {
      msg = JSON.parse(data);
    } catch (e) {
      console.error('[CppApiService] Error parsing WebSocket message:', e);
      return;
    }

    // Emit the raw message if others need it
    this.rawMessageSubject.next(msg);

    // Destructure fields from server's JSON
    const { fileType, payload, filename, session } = msg;

    if (!fileType || !payload) {
      console.warn('[CppApiService] Missing fileType/payload in message:', msg);
      return;
    }

    switch (fileType) {
      case 'bmp':
        // We have a BMP image in base64
        this.bmpSubject.next({
          filename: filename || 'unknown.bmp',
          base64: payload,
          session: session || '',
        });
        break;

      case 'jpg':
        // We have a JPG image in base64
        this.jpgSubject.next({
          filename: filename || 'unknown.jpg',
          base64: payload,
          session: session || '',
        });
        break;

      case 'ply':
        // If your server still sends ASCII PLY as base64, you could decode or store it
        // but your plan is to fix this to a JSON-based point cloud. If it’s still “.ply”
        // in base64, handle it here:
        console.warn('[CppApiService] Received PLY file as base64. Large payload?');
        // You might store it on disk or parse it. For now, just emit it:
        this.pointCloudSubject.next({
          filename: filename || 'cloud.ply',
          session: session || '',
          data: payload, // possibly base64 or ASCII text
        });
        break;

      case 'pointcloud-json':
        // If the server sends a JSON-based point cloud, parse it:
        try {
          const pcData = JSON.parse(payload); // array of {x,y,z,nx,ny,nz}
          this.pointCloudSubject.next({
            filename: filename || 'cloud.json',
            session: session || '',
            data: pcData,
          });
        } catch (e) {
          console.error('[CppApiService] Error parsing pointcloud JSON:', e);
        }
        break;

      default:
        console.log('[CppApiService] Unhandled fileType:', fileType);
        break;
    }
  }

  /** 
   * Expose Observables so components can subscribe
   */
  public onBmp(): Observable<{ filename: string; base64: string; session: string }> {
    return this.bmpSubject.asObservable();
  }

  public onJpg(): Observable<{ filename: string; base64: string; session: string }> {
    return this.jpgSubject.asObservable();
  }

  public onPointCloud(): Observable<{
    filename: string;
    session: string;
    data: any;
  }> {
    return this.pointCloudSubject.asObservable();
  }

  public onRawMessage(): Observable<CppWsMessage> {
    return this.rawMessageSubject.asObservable();
  }

  /**
   * ---------------------------------------------------------------------
   *  HTTP / REST ENDPOINTS
   * ---------------------------------------------------------------------
   * The C++ service provides various REST endpoints (start, stop, etc.).
   * Adjust the URLs and payloads as needed. 
   * We return Observables for standard Angular patterns.
   */

  /**
   * POST /start => starts streaming
   */
  public startStreams(): Observable<any> {
    return this.http.post(`${this.httpBaseUrl}/start`, {});
  }

  /**
   * POST /stop => stops streaming
   */
  public stopStreams(): Observable<any> {
    return this.http.post(`${this.httpBaseUrl}/stop`, {});
  }

  /**
   * POST /session/start?name=someName
   * Creates a new session on the C++ side
   */
  public startSession(sessionName: string): Observable<any> {
    // We encode the sessionName as a query param
    // The server might handle it as /session/start?name=...
    const options = { params: { name: sessionName } };
    return this.http.post(`${this.httpBaseUrl}/session/start`, {}, options);
  }

  /**
   * POST /session/stop => stops the current session
   */
  public stopSession(): Observable<any> {
    return this.http.post(`${this.httpBaseUrl}/session/stop`, {});
  }

  /**
   * POST /reconnect => reconnect camera
   */
  public reconnectCamera(): Observable<any> {
    return this.http.post(`${this.httpBaseUrl}/reconnect`, {});
  }

  /**
   * POST /trigger => set hardware trigger mode
   * Must pass ?enable=1 or 0
   */
  public setHardwareTrigger(enable: boolean): Observable<any> {
    const options = { params: { enable: enable ? '1' : '0' } };
    return this.http.post(`${this.httpBaseUrl}/trigger`, {}, options);
  }

  /**
   * POST /laser => turn IR laser on/off
   * Must pass ?on=1 or 0
   */
  public setLaser(on: boolean): Observable<any> {
    const options = { params: { on: on ? '1' : '0' } };
    return this.http.post(`${this.httpBaseUrl}/laser`, {}, options);
  }

  /**
   * GET /status => retrieve streaming counters
   */
  public getStatus(): Observable<any> {
    return this.http.get(`${this.httpBaseUrl}/status`);
  }

  /**
   * Clean up resources
   */
  ngOnDestroy(): void {
    // Close the WebSocket if service is destroyed
    if (this.ws) {
      this.ws.close();
    }
  }
}
