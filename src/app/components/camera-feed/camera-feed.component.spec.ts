import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CameraFeedComponent } from './camera-feed.component';

describe('CameraFeedComponent', () => {
  let component: CameraFeedComponent;
  let fixture: ComponentFixture<CameraFeedComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CameraFeedComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CameraFeedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
