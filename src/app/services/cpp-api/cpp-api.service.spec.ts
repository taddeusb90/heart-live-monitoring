import { TestBed } from '@angular/core/testing';

import { CppApiService } from './cpp-api.service';

describe('CppApiService', () => {
  let service: CppApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CppApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
