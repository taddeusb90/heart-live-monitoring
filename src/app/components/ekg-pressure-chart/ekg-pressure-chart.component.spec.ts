import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EkgPressureChartComponent } from './ekg-pressure-chart.component';

describe('EkgPressureChartComponent', () => {
  let component: EkgPressureChartComponent;
  let fixture: ComponentFixture<EkgPressureChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EkgPressureChartComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EkgPressureChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
