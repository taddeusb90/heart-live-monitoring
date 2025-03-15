import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';

import { AppComponent } from './app.component';
import { CppApiService } from './services/cpp-api/cpp-api.service';
import { SessionManagerService } from './services/session-manager/session-manager.service';
import { ArduinoSerialService } from './services/arduino-serial/arduino-serial.service';
import { DbService } from './services/db/db.service';

@NgModule({
  declarations: [
    AppComponent,
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
  ],
  providers: [CppApiService, SessionManagerService, ArduinoSerialService, DbService],
  bootstrap: [AppComponent]
})
export class AppModule { } 