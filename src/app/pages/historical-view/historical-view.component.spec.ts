import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HistoricalViewComponent } from './historical-view.component';

describe('HistoricalViewComponent', () => {
  let component: HistoricalViewComponent;
  let fixture: ComponentFixture<HistoricalViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HistoricalViewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HistoricalViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
