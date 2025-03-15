import { Injectable } from '@angular/core';
import { BehaviorSubject, Subscription } from 'rxjs';

import { CppApiService } from '../cpp-api/cpp-api.service';
import { ArduinoSerialService } from '../arduino-serial/arduino-serial.service';
import { DbService, Session, SessionFile } from '../db/db.service';

/**
 * Example interface for local state about the currently active session
 */
interface ActiveSessionState {
  sessionId: number | null;  // Database ID of the active session
  sessionName: string | null;
  started: boolean;
  // ... add other flags or data you need
}

@Injectable({
  providedIn: 'root',
})
export class SessionManagerService {
  /**
   * Observables / subjects
   * - we use a BehaviorSubject so components can easily know the current session state
   */
  private activeSessionSubject = new BehaviorSubject<ActiveSessionState>({
    sessionId: null,
    sessionName: null,
    started: false,
  });
  public activeSession$ = this.activeSessionSubject.asObservable();

  /**
   * Subscriptions to the C++ server’s WebSocket streams
   */
  private bmpSub!: Subscription;
  private jpgSub!: Subscription;
  private pointCloudSub!: Subscription;

  constructor(
    private dbService: DbService,
    private cppApiService: CppApiService,
    private arduinoSerialService: ArduinoSerialService,
  ) {
    // Optionally, we can automatically subscribe to the C++ server’s streams here:
    this.subscribeToCppServer();
  }

  /**
   * Subscribe to the streams from the C++ server (images, pointcloud, etc.)
   * Then store references in the DB for the active session.
   */
  private subscribeToCppServer(): void {
    // BMP images
    this.bmpSub = this.cppApiService.onBmp().subscribe((bmpData) => {
      this.handleNewFile(bmpData.filename, 'bmp', bmpData.base64, bmpData.session);
    });

    // JPG images
    this.jpgSub = this.cppApiService.onJpg().subscribe((jpgData) => {
      this.handleNewFile(jpgData.filename, 'jpg', jpgData.base64, jpgData.session);
    });

    // Point cloud (may be ASCII or JSON)
    this.pointCloudSub = this.cppApiService.onPointCloud().subscribe((pcData) => {
      // If the C++ server is sending it as base64 or raw JSON, you can store that or a file reference
      // For now, treat it as a "file" of type 'pointcloud'
      this.handleNewFile(pcData.filename, 'pointcloud', pcData.data, pcData.session);
    });
  }

  /**
   * Called whenever we receive a new file from the C++ server.
   * For images, you might store them on disk or keep them in memory. 
   * For pointcloud, decide how you want to store it.
   *
   * In this example, we simply store a reference in session_files with a pseudo-file path.
   */
  private async handleNewFile(
    filename: string,
    fileType: string,
    payload: any,
    sessionFolder: string,
  ): Promise<void> {
    // If no session is active, we might skip. Or store it anyway if the C++ side is using a session folder.
    const { sessionId, started } = this.activeSessionSubject.value;
    if (!started || !sessionId) {
      console.warn('[SessionManager] Received file while no active session. Skipping DB insert.');
      return;
    }

    // Example approach: create a local path (assuming the C++ server also saved it to disk
    // under some folder: e.g. "C:/heart_experiments/sessions/<sessionFolder>/<filename>"
    // That path might come from the server. For now, we just store "sessionFolder/filename"
    const filePath = `${sessionFolder}/${filename}`;

    const now = new Date();
    try {
      const sessionFile: SessionFile = {
        sessionId,
        filePath,       // or a real local absolute path if known
        fileType,       // e.g. "bmp", "jpg", "pointcloud"
        createdAt: now,
      };
      await this.dbService.insertSessionFile(sessionFile);
      console.log('[SessionManager] Inserted file record:', filePath);
    } catch (err) {
      console.error('[SessionManager] Error inserting file reference:', err);
    }
  }

  /**
   * Start a new session:
   * 1) Create DB row
   * 2) Inform Arduino of new session ID
   * 3) Call C++ server to start session streaming
   */
  public async startSession(sessionName: string): Promise<void> {
    try {
      // 1) Insert row in DB
      const newSession: Session = {
        sessionName,
        startTime: new Date(),
        endTime: null,
      };
      const sessionId = await this.dbService.createSession(newSession);

      // 2) Remember in local state
      this.activeSessionSubject.next({
        sessionId,
        sessionName,
        started: true,
      });

      // 3) Arduino: we can set the sessionId so sensor readings get stored under this session
      this.arduinoSerialService.setSessionId(sessionId);

      // 4) Call the C++ server’s /session/start?name=...
      this.cppApiService.startSession(sessionName).subscribe({
        next: (res) => {
          console.log('[SessionManager] C++ server started session:', res);
        },
        error: (err) => {
          console.error('[SessionManager] Error starting session on C++ server:', err);
        },
      });

      // 5) Optionally also start the camera streams if not already started
      this.cppApiService.startStreams().subscribe({
        next: (res) => {
          console.log('[SessionManager] Streams started:', res);
        },
        error: (err) => {
          console.error('[SessionManager] Error starting streams:', err);
        },
      });

    } catch (err) {
      console.error('[SessionManager] Error in startSession:', err);
    }
  }

  /**
   * Stop the current session:
   * 1) Call C++ server /session/stop
   * 2) Optionally also stop streams
   * 3) Mark session as ended in DB
   * 4) Clear local state
   */
  public async stopSession(): Promise<void> {
    const { sessionId, started } = this.activeSessionSubject.value;
    if (!started || !sessionId) {
      console.warn('[SessionManager] No active session to stop.');
      return;
    }

    // 1) Stop session on C++ side
    this.cppApiService.stopSession().subscribe({
      next: (res) => {
        console.log('[SessionManager] C++ server stopped session:', res);
      },
      error: (err) => {
        console.error('[SessionManager] Error stopping session on C++ server:', err);
      },
    });

    // 2) Optionally stop streams if desired
    this.cppApiService.stopStreams().subscribe({
      next: (res) => console.log('[SessionManager] Stopped camera streams:', res),
      error: (err) => console.error('[SessionManager] Error stopping streams:', err),
    });

    // 3) Mark session ended in DB
    try {
      await this.dbService.endSession(sessionId, new Date());
      console.log('[SessionManager] Session ended in DB:', sessionId);
    } catch (err) {
      console.error('[SessionManager] DB error ending session:', err);
    }

    // 4) Clear local state
    this.activeSessionSubject.next({
      sessionId: null,
      sessionName: null,
      started: false,
    });

    // Arduino might want to setSessionId(null) so new sensor data isn't saved
    this.arduinoSerialService.setSessionId(0);
  }

  /**
   * If you want a method to re-connect or start streaming again
   * or handle other advanced triggers, you can add them here.
   */
  public reconnectCamera(): void {
    this.cppApiService.reconnectCamera().subscribe({
      next: (res) => {
        console.log('[SessionManager] Reconnected camera:', res);
      },
      error: (err) => {
        console.error('[SessionManager] Error reconnecting camera:', err);
      },
    });
  }

  /**
   * Helper: Access the current active session state (sync).
   */
  public getActiveSessionState(): ActiveSessionState {
    return this.activeSessionSubject.value;
  }

  /**
   * Cleanup if needed
   */
  public dispose(): void {
    // Unsubscribe from Observables
    if (this.bmpSub) this.bmpSub.unsubscribe();
    if (this.jpgSub) this.jpgSub.unsubscribe();
    if (this.pointCloudSub) this.pointCloudSub.unsubscribe();
  }
}