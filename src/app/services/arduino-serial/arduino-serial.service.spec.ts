import { TestBed } from '@angular/core/testing';

import { ArduinoSerialService } from './arduino-serial.service';

describe('ArduinoService', () => {
  let service: ArduinoSerialService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ArduinoSerialService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
