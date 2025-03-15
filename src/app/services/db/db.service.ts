import { Injectable } from '@angular/core';
import moment from 'moment';
import { ArduinoSensorData } from '../arduino-serial/arduino-serial.service';

/**
 * Example interfaces. Adjust to your needs.
 */
export interface Session {
  id?: number;
  sessionName: string;
  startTime: Date;
  endTime?: Date | null; // can be null if session hasn't ended
}

export interface SessionFile {
  id?: number;
  sessionId: number;
  filePath: string;
  fileType: string; // e.g. "bmp", "jpg", "pointcloud"
  createdAt: Date;
}

export interface SensorReading {
  id?: number;
  sessionId: number | null; // can be null if no session is active
  ekg: number;
  pressure: number;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root',
})
export class DbService {
  private sqlite: any;
  private sqlite3: any;
  private db: any;

  /**
   * In the constructor, we open the DB and create tables if needed.
   */
  constructor() {
    if ((window as any).require) {
      this.sqlite = (window as any).require('sqlite');
      this.sqlite3 = (window as any).require('sqlite3').verbose();
    } else {
      console.warn('[DbService] Not running in Electron => sqlite might be unavailable.');
      return;
    }

    // Call init to open DB and create tables
    this.initDB();
  }

  private async initDB(): Promise<void> {
    try {
      // Set your preferred DB path. If you have a global config for your "WORK_FOLDER", use that
      const dbPath = 'C:/myAppData/heart-experiments.db'; 
      // Or e.g. `${WORK_FOLDER}/heart-experiments.db`

      this.db = await this.sqlite.open({
        filename: dbPath,
        driver: this.sqlite3.Database,
      });

      console.log('[DbService] DB opened at', dbPath);

      // Create tables if they don't exist
      await this.createTables();
    } catch (err) {
      console.error('[DbService] Error initializing DB:', err);
    }
  }

  /**
   * Create our example tables, if they don't exist.
   * Adjust schema as needed.
   */
  private async createTables(): Promise<void> {
    // Sessions table
    await this.db.run(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_name TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT
      )
    `);

    // Session files table
    await this.db.run(`
      CREATE TABLE IF NOT EXISTS session_files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        file_path TEXT NOT NULL,
        file_type TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY(session_id) REFERENCES sessions(id)
      )
    `);

    // Sensor readings table
    await this.db.run(`
      CREATE TABLE IF NOT EXISTS sensor_readings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER,
        ekg REAL NOT NULL,
        pressure REAL NOT NULL,
        timestamp TEXT NOT NULL,
        FOREIGN KEY(session_id) REFERENCES sessions(id)
      )
    `);

    console.log('[DbService] Tables ensured (sessions, session_files, sensor_readings).');
  }

  /**
   * --------------------------------------------------------------------
   *   SESSION METHODS
   * --------------------------------------------------------------------
   */
  public async createSession(session: Session): Promise<number> {
    if (!this.db) throw new Error('DB not initialized');
    const { sessionName, startTime } = session;
    const endTime = session.endTime ? moment(session.endTime).format('YYYY-MM-DD HH:mm:ss') : null;
    const result = await this.db.run(
      `INSERT INTO sessions (session_name, start_time, end_time)
       VALUES (?, ?, ?)`,
      [sessionName, moment(startTime).format('YYYY-MM-DD HH:mm:ss'), endTime],
    );
    // result.lastID is the new session ID
    return result.lastID;
  }

  public async endSession(sessionId: number, endTime: Date): Promise<void> {
    if (!this.db) throw new Error('DB not initialized');
    await this.db.run(
      `UPDATE sessions SET end_time = ? WHERE id = ?`,
      [moment(endTime).format('YYYY-MM-DD HH:mm:ss'), sessionId],
    );
  }

  public async getSessionById(sessionId: number): Promise<Session | null> {
    if (!this.db) throw new Error('DB not initialized');
    const row = await this.db.get(`SELECT * FROM sessions WHERE id = ?`, [sessionId]);
    if (!row) return null;
    return {
      id: row.id,
      sessionName: row.session_name,
      startTime: new Date(row.start_time),
      endTime: row.end_time ? new Date(row.end_time) : null,
    };
  }

  public async getAllSessions(): Promise<Session[]> {
    if (!this.db) throw new Error('DB not initialized');
    const rows = await this.db.all(`SELECT * FROM sessions ORDER BY start_time DESC`);
    return rows.map((row: any) => ({
      id: row.id,
      sessionName: row.session_name,
      startTime: new Date(row.start_time),
      endTime: row.end_time ? new Date(row.end_time) : null,
    }));
  }

  /**
   * --------------------------------------------------------------------
   *   SESSION FILE METHODS
   *   (Used for storing references to .bmp/.jpg or pointcloud data, etc.)
   * --------------------------------------------------------------------
   */
  public async insertSessionFile(file: SessionFile): Promise<number> {
    if (!this.db) throw new Error('DB not initialized');
    const result = await this.db.run(
      `INSERT INTO session_files (session_id, file_path, file_type, created_at)
       VALUES (?, ?, ?, ?)`,
      [
        file.sessionId,
        file.filePath,
        file.fileType,
        moment(file.createdAt).format('YYYY-MM-DD HH:mm:ss'),
      ],
    );
    return result.lastID;
  }

  public async getFilesForSession(sessionId: number): Promise<SessionFile[]> {
    if (!this.db) throw new Error('DB not initialized');
    const rows = await this.db.all(
      `SELECT * FROM session_files WHERE session_id = ? ORDER BY created_at ASC`,
      [sessionId],
    );

    return rows.map((row: any) => ({
      id: row.id,
      sessionId: row.session_id,
      filePath: row.file_path,
      fileType: row.file_type,
      createdAt: new Date(row.created_at),
    }));
  }

  /**
   * --------------------------------------------------------------------
   *   SENSOR READINGS METHODS
   *   (EKG/Pressure from Arduino, associated with sessions)
   * --------------------------------------------------------------------
   */
  public async insertSensorReading(data: ArduinoSensorData): Promise<void> {
    // Implement DB insertion logic
    console.log('Storing sensor reading:', data);
  }

  public async getSensorReadingsForSession(sessionId: number): Promise<SensorReading[]> {
    if (!this.db) throw new Error('DB not initialized');
    const rows = await this.db.all(
      `SELECT * FROM sensor_readings WHERE session_id = ? ORDER BY timestamp ASC`,
      [sessionId],
    );
    return rows.map((row: any) => ({
      id: row.id,
      sessionId: row.session_id,
      ekg: row.ekg,
      pressure: row.pressure,
      timestamp: new Date(row.timestamp),
    }));
  }

  /**
   * Example method: get all sensor readings (regardless of session).
   */
  public async getAllSensorReadings(): Promise<SensorReading[]> {
    if (!this.db) throw new Error('DB not initialized');
    const rows = await this.db.all(`SELECT * FROM sensor_readings ORDER BY timestamp ASC`);
    return rows.map((row: any) => ({
      id: row.id,
      sessionId: row.session_id,
      ekg: row.ekg,
      pressure: row.pressure,
      timestamp: new Date(row.timestamp),
    }));
  }
}
