import { Injectable, OnDestroy } from '@angular/core';
import { Subject, Observable } from 'rxjs';

// If you have a separate DB service:
import { DbService } from '../db/db.service'; // Adjust to your actual path

// Example shape of the data we expect from Arduino
export interface ArduinoSensorData {
  ekg: number;        // EKG reading
  pressure: number;   // Pressure reading
  timestamp: Date;    // When we received it
  sessionId?: number; // If you want to associate with a session
}

@Injectable({
  providedIn: 'root',
})
export class ArduinoSerialService implements OnDestroy {
  private SerialPort: any;     // Will hold the `serialport` import
  private ReadlineParser: any; // Will hold the Readline parser
  private portInstance: any;   // Active serial port reference
  private parser: any;         // Reference to the read stream
  private isConnected = false;

  // Subject to broadcast new sensor data
  private sensorDataSubject = new Subject<ArduinoSensorData>();

  // Example: store the last known sessionId or a “current” session ID
  private currentSessionId: number | null = null;

  constructor(
    private dbService: DbService, // or remove if you plan to store data differently
  ) {
    // Because we’re in an Electron/Angular environment, we typically do:
    //    this.SerialPort = window.require('serialport');
    // but we can do a runtime check:
    if ((window as any).require) {
      try {
        this.SerialPort = (window as any).require('serialport');
      } catch (err) {
        console.error('Could not load serialport library:', err);
      }
    } else {
      console.warn('[ArduinoSerialService] Not running in Electron? serialport may be unavailable.');
    }

    // If serialport is loaded, you can auto-init
    if (this.SerialPort) {
      const { parsers } = this.SerialPort;
      this.ReadlineParser = parsers.Readline;
      this.initSerialPort();
    }
  }

  /**
   * Attempt to find and open the Arduino port
   */
  private initSerialPort(): void {
    this.SerialPort.list()
      .then((ports: any[]) => {
        console.log('[ArduinoSerialService] All available ports:', ports);

        // Example logic: find an Arduino by vendorId or manufacturer
        // (Adjust to your actual device details)
        const arduinoPortInfo = ports.find(
          (port) =>
            port.manufacturer?.toLowerCase().includes('arduino') ||
            (port.vendorId && port.vendorId.includes('2341')) // typical Arduino vendorId
        );

        if (!arduinoPortInfo) {
          console.warn('[ArduinoSerialService] No Arduino port found!');
          return;
        }

        console.log('[ArduinoSerialService] Found Arduino on:', arduinoPortInfo.path);

        // Create and open the port
        this.portInstance = new this.SerialPort(arduinoPortInfo.path, {
          baudRate: 9600,
        });

        // After a small delay, attach the parser
        setTimeout(() => {
          this.parser = this.portInstance.pipe(new this.ReadlineParser({ delimiter: '\r\n' }));
          this.parser.on('data', this.handleSerialData);
          this.isConnected = true;
          console.log('[ArduinoSerialService] Serial port is now open and reading data...');
        }, 1000);
      })
      .catch((err: any) => {
        console.error('[ArduinoSerialService] Error listing ports:', err);
      });
  }

  /**
   * Handle each incoming line from Arduino
   */
  private handleSerialData = (line: string): void => {
    // Example line: {"EKG":123,"Pressure":456}
    // Parse as JSON
    let obj: any;
    try {
      obj = JSON.parse(line);
    } catch (err) {
      console.warn('[ArduinoSerialService] Non-JSON line received:', line);
      return;
    }

    if (obj.EKG === undefined || obj.Pressure === undefined) {
      console.warn('[ArduinoSerialService] JSON missing EKG or Pressure:', obj);
      return;
    }

    const data: ArduinoSensorData = {
      ekg: Number(obj.EKG),
      pressure: Number(obj.Pressure),
      timestamp: new Date(),
      sessionId: this.currentSessionId || undefined,
    };

    // Emit to any subscribers
    this.sensorDataSubject.next(data);

    // Optionally store in DB
    // E.g. a method like: dbService.insertSensorReading(data)
    // Adjust your table/fields as needed
    this.dbService.insertSensorReading(data).catch((dbErr) => {
      console.error('[ArduinoSerialService] DB insertion error:', dbErr);
    });
  };

  /**
   * Set the current session ID so we can associate sensor readings with it
   */
  public setSessionId(sessionId: number): void {
    this.currentSessionId = sessionId;
  }

  /**
   * If you need to write something to Arduino, e.g. "commands"
   */
  public sendToArduino(message: string): void {
    if (!this.portInstance || !this.isConnected) {
      console.warn('[ArduinoSerialService] Not connected to any serial port');
      return;
    }
    // Write the message with newline
    this.portInstance.write(`${message}\r\n`, (err: any) => {
      if (err) {
        console.error('[ArduinoSerialService] Error writing to Arduino:', err);
      } else {
        console.log('[ArduinoSerialService] Message sent:', message);
      }
    });
  }

  /**
   * Observable so other parts of the app can subscribe
   */
  public onSensorData(): Observable<ArduinoSensorData> {
    return this.sensorDataSubject.asObservable();
  }

  /**
   * Cleanup
   */
  ngOnDestroy(): void {
    // Close the port if open
    if (this.portInstance) {
      this.portInstance.close((err: any) => {
        console.log('[ArduinoSerialService] Port closed.', err || '');
      });
    }
  }
}
