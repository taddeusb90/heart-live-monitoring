import { Component, OnInit, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { SessionManagerService } from '../../services/session-manager/session-manager.service';

// Example constants for decellularization statuses
export const COMPLETE = 'COMPLETE';
export const INCOMPLETE = 'INCOMPLETE';


@Component({
  selector: 'app-session-controls',
  templateUrl: './session-controls.component.html',
  styleUrls: ['./session-controls.component.scss'],
  imports: [
    CommonModule,
    FormsModule
  ]
})
export class SessionControlsComponent {
  // This might be a user-chosen status in the UI
  @Input() selectedStatus: string = INCOMPLETE;

  public decellularizationStatuses: Array<any> = [
    {
      viewValue: 'Complete',
      value: COMPLETE,
    },
    {
      viewValue: 'Incomplete',
      value: INCOMPLETE,
    },
  ];

  // Local states or from your store
  // If you have an observable decellularization status from the SessionManager,
  // you can handle it here as well.
  constructor(private sessionManager: SessionManagerService) {}

  ngOnInit(): void {
    // If you want to do anything on init, or get the active session state
    const activeState = this.sessionManager.getActiveSessionState();
    // e.g. console.log('Current session state', activeState);
  }

  /**
   * You might have a method to set the decellularization status
   * in your SessionManager or DB. For now, let's keep it local.
   */
  public setDecellularizationStatus = (): void => {
    // If you do store it in the SessionManager or DB, call that method here
    console.log('[SessionControls] set status to', this.selectedStatus);
    // e.g. this.sessionManager.setDecellularizationStatus(this.selectedStatus);
  };

  /**
   * Start session => calls SessionManagerService
   */
  public begin = (): void => {
    const sessionName = this.createSessionName(); // or prompt the user
    this.sessionManager.startSession(sessionName);
  };

  /**
   * Continue session => might do partial logic
   * You can define a method in SessionManager for "resume" or "continue"
   */
  public continue = (): void => {
    // If you have a separate method, call it; otherwise, 
    // just do startSession again if it's paused logic, etc.
    console.log('[SessionControls] continue session => not implemented by default');
  };

  /**
   * Pause session => depends on how your SessionManager handles it
   * (If you have a method like `pauseSession()`, call it)
   */
  public pause = (): void => {
    console.log('[SessionControls] pause session => not implemented by default');
    // Example:
    // this.sessionManager.pauseSession();
  };

  /**
   * End session => call SessionManagerService.stopSession()
   */
  public end = (): void => {
    this.sessionManager.stopSession();
  };

  /**
   * Reset => might do some device reset logic?
   * If your SessionManager or your c++ server can handle a 'reset' call,
   * you can do it here.
   */
  public reset = (): void => {
    console.log('[SessionControls] reset => not implemented by default');
    // Example: this.sessionManager.resetMotorPosition();
  };

  /**
   * Hard Reset => if you had a special method
   */
  public hardReset = (): void => {
    console.log('[SessionControls] hard reset => not implemented by default');
    // Example: this.sessionManager.hardResetMotorPosition();
  };

  /**
   * Takes the initial photo => in your old code, you used `sessionService.takeInitialPhoto()`.
   * Now you could do something similar with sessionManager if you want that logic centralized.
   */
  public takeInitialPhoto = (): void => {
    console.log('[SessionControls] take initial photo => not implemented by default');
    // e.g. this.sessionManager.takeInitialPhoto();
  };

  /**
   * The next methods were used to enable/disable buttons in your old code.
   * You can keep them if you want dynamic button states based on the current session status.
   * Right now, they just return `false` or `true`.
   */

  public shouldEnableInitialPhotoButton = (): boolean => {
    // logic to decide if initial photo is allowed
    return true;
  };

  public shouldDisplayBeginButton = (): boolean => {
    // e.g. return true if no session is started
    const state = this.sessionManager.getActiveSessionState();
    return !state.started;
  };

  public shouldDisplayContinueButton = (): boolean => {
    // e.g. return true if session is paused
    return false;
  };

  public shouldEnableContinueButton = (): boolean => {
    return false;
  };

  public shouldEnablePauseButton = (): boolean => {
    return false;
  };

  public shouldEnableEndButton = (): boolean => {
    // e.g. only if session is currently started
    const state = this.sessionManager.getActiveSessionState();
    return !!state.started;
  };

  public shouldEnableResetButton = (): boolean => {
    return false;
  };

  /**
   * Utility to create a session name if none is provided by the user
   */
  private createSessionName(): string {
    const now = new Date();
    return `session_${now.getFullYear()}-${(now.getMonth() + 1)
      .toString()
      .padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}_${now
      .getHours()
      .toString()
      .padStart(2, '0')}-${now.getMinutes().toString().padStart(2, '0')}`;
  }
}
