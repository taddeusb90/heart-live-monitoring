import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PointcloudViewerComponent } from './pointcloud-viewer.component';

describe('PointcloudViewerComponent', () => {
  let component: PointcloudViewerComponent;
  let fixture: ComponentFixture<PointcloudViewerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PointcloudViewerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PointcloudViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
