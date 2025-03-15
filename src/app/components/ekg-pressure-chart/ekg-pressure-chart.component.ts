import { Component, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import * as d3 from 'd3';

import {
  ArduinoSerialService,
  ArduinoSensorData,
} from '../../services/arduino-serial/arduino-serial.service';

/**
 * We'll keep a local interface for our chart data points.
 * They will contain a timestamp (Date) plus EKG & Pressure readings.
 */
interface EkgPressurePoint {
  time: Date;
  ekg: number;
  pressure: number;
}
@Component({
  selector: 'app-ekg-pressure-chart',
  imports: [],
  templateUrl: './ekg-pressure-chart.component.html',
  styleUrl: './ekg-pressure-chart.component.scss'
})
export class EkgPressureChartComponent {
  @ViewChild('chartContainer', { static: true }) chartContainer!: ElementRef;

  private sensorSub!: Subscription;
  private data: EkgPressurePoint[] = [];

  // D3-related
  private svg: any;
  private margin = { top: 10, right: 60, bottom: 20, left: 50 };
  private width = 600;
  private height = 300;

  // We'll define two y-scales: one for EKG, one for Pressure
  private xScale!: d3.ScaleTime<number, number>;
  private yScaleEkg!: d3.ScaleLinear<number, number>;
  private yScalePressure!: d3.ScaleLinear<number, number>;

  // Lines
  private lineEkg!: d3.Line<EkgPressurePoint>;
  private linePressure!: d3.Line<EkgPressurePoint>;

  private maxPoints = 200; // how many points we keep in the rolling buffer

  constructor(private arduinoService: ArduinoSerialService) {}

  ngOnInit(): void {
    this.initChart();
    // Subscribe to Arduino sensor data
    this.sensorSub = this.arduinoService.onSensorData().subscribe((reading: ArduinoSensorData) => {
      this.handleNewReading(reading);
    });
  }

  ngOnDestroy(): void {
    if (this.sensorSub) {
      this.sensorSub.unsubscribe();
    }
  }

  /**
   * Called whenever a new EKG/Pressure reading arrives from Arduino
   */
  private handleNewReading(reading: ArduinoSensorData): void {
    const point: EkgPressurePoint = {
      time: reading.timestamp,
      ekg: reading.ekg,
      pressure: reading.pressure,
    };

    // Add to our data array, limit size
    this.data.push(point);
    if (this.data.length > this.maxPoints) {
      this.data.shift(); // remove oldest
    }

    // Redraw the chart with updated data
    this.updateChart();
  }

  /**
   * Initialize chart elements once
   */
  private initChart(): void {
    // Basic svg setup
    const g = this.svg
      .append('g')
      .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

    // X scale => time
    this.xScale = d3.scaleTime().range([0, this.width]);

    // Y scale for EKG => left axis
    this.yScaleEkg = d3.scaleLinear().range([this.height, 0]);

    // Y scale for Pressure => right axis
    this.yScalePressure = d3.scaleLinear().range([this.height, 0]);

    // EKG line generator
    this.lineEkg = d3
      .line<EkgPressurePoint>()
      .x((d) => this.xScale(d.time))
      .y((d) => this.yScaleEkg(d.ekg));

    // Pressure line generator
    this.linePressure = d3
      .line<EkgPressurePoint>()
      .x((d) => this.xScale(d.time))
      .y((d) => this.yScalePressure(d.pressure));

    // Append path for EKG
    g.append('path')
      .attr('class', 'ekg-line')
      .style('fill', 'none')
      .style('stroke', 'steelblue')
      .style('stroke-width', '1.5px');

    // Append path for Pressure
    g.append('path')
      .attr('class', 'pressure-line')
      .style('fill', 'none')
      .style('stroke', 'tomato')
      .style('stroke-width', '1.5px');

    // X axis group
    g.append('g').attr('class', 'x-axis').attr('transform', `translate(0,${this.height})`);

    // Y axis for EKG (left)
    g.append('g').attr('class', 'y-axis-ekg');

    // Y axis for Pressure (right)
    g.append('g').attr('class', 'y-axis-pressure').attr('transform', `translate(${this.width},0)`);
  }

  /**
   * Redraw chart with new data
   */
  private updateChart(): void {
    const g = this.svg.select('g'),
          timeDomain = d3.extent(this.data, (d) => d.time) as [Date, Date],
          ekgExtent = d3.extent(this.data, (d) => d.ekg) as [number, number],
          pressureExtent = d3.extent(this.data, (d) => d.pressure) as [number, number];

    if (!timeDomain[0]) {
      return; // no data yet
    }
    this.xScale.domain(timeDomain);

    // EKG domain
    if (ekgExtent[0] == null || ekgExtent[1] == null) {
      return;
    }
    // Add padding if you like
    this.yScaleEkg.domain([ekgExtent[0] - 10, ekgExtent[1] + 10]);

    // Pressure domain
    if (pressureExtent[0] == null || pressureExtent[1] == null) {
      return;
    }
    this.yScalePressure.domain([pressureExtent[0] - 10, pressureExtent[1] + 10]);

    // Update the EKG path
    g.select('.ekg-line').datum(this.data).attr('d', this.lineEkg);

    // Update the Pressure path
    g.select('.pressure-line').datum(this.data).attr('d', this.linePressure);

    // Update the axes
    g.select('.x-axis').call(d3.axisBottom(this.xScale).ticks(5));
    g.select('.y-axis-ekg').call(d3.axisLeft(this.yScaleEkg).ticks(5));

    g.select('.y-axis-pressure').call(d3.axisRight(this.yScalePressure).ticks(5));
  }
}
