import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SessionHistoryListComponent } from './session-history-list.component';

describe('SessionHistoryListComponent', () => {
  let component: SessionHistoryListComponent;
  let fixture: ComponentFixture<SessionHistoryListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SessionHistoryListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SessionHistoryListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
