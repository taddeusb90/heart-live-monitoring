// electron.service.ts
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ElectronService {
  public ipcRenderer: any;
  public webFrame: any;
  public remote: any;
  public childProcess: any;

  constructor() {
    if (this.isElectron()) {
      // Use window.require to pull in Electron APIs
      const electronWindow = window as any;
      this.ipcRenderer = electronWindow.require('electron').ipcRenderer;
      this.webFrame = electronWindow.require('electron').webFrame;
      // The remote module we installed
      this.remote = electronWindow.require('@electron/remote');
      this.childProcess = electronWindow.require('child_process');
    }
  }

  isElectron(): boolean {
    const userAgent = navigator.userAgent.toLowerCase();
    return userAgent.indexOf(' electron/') > -1;
  }

  // Add any electron-specific methods you need here
  // e.g. openDialog(), minimizeApp(), etc.
}
