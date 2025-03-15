import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { CppApiService } from '../../services/cpp-api/cpp-api.service';

import * as THREE from 'three';

interface PointCloudData {
  x: number;
  y: number;
  z: number;
  nx?: number;
  ny?: number;
  nz?: number;
}

@Component({
  selector: 'app-pointcloud-viewer',
  imports: [CommonModule],
  templateUrl: './pointcloud-viewer.component.html',
  styleUrl: './pointcloud-viewer.component.scss'
})
export class PointcloudViewerComponent {
  @ViewChild('threeCanvas', { static: true }) threeCanvasRef!: ElementRef<HTMLCanvasElement>;

  private pointCloudSub!: Subscription;

  // Three.js essentials
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private animationId!: number; // for requestAnimationFrame

  // Store the last received point cloud data so we can re-render if needed
  private latestPointCloud: PointCloudData[] | null = null;
  private pointCloudObject: THREE.Points | null = null;

  constructor(private cppApiService: CppApiService) {}

  ngOnInit(): void {
    // Set up Three.js scene
    this.initThree();

    // Subscribe to point cloud data from C++ server
    this.pointCloudSub = this.cppApiService.onPointCloud().subscribe(async (pcData) => {
      // pcData.data could be an array of {x, y, z, nx, ny, nz}
      // or a raw string you need to parse again
      // For example, if pcData.data is a string, you'd do:
      //   const parsed = JSON.parse(pcData.data);
      // but let's assume it's already an array of objects.

      const cloudArray = pcData.data as PointCloudData[];
      if (!Array.isArray(cloudArray) || cloudArray.length === 0) {
        console.warn('[PointcloudViewer] Received empty or invalid point cloud data');
        return;
      }

      console.log('[PointcloudViewer] Received point cloud with', cloudArray.length, 'points');
      this.latestPointCloud = cloudArray;

      // Rebuild the Three.js object
      this.buildPointCloudObject(cloudArray);
    });
  }

  private initThree(): void {
    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x222222);

    // Create camera
    const canvasWidth = 640;
    const canvasHeight = 480;
    this.camera = new THREE.PerspectiveCamera(45, canvasWidth / canvasHeight, 0.1, 50000);
    this.camera.position.set(0, 0, 2000); // Adjust as needed

    // Set up renderer
    const canvas = this.threeCanvasRef.nativeElement;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(canvasWidth, canvasHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio || 1);

    // Minimal lighting or environment
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.4);
    dirLight.position.set(0, 10, 10);
    this.scene.add(dirLight);

    // Start animation loop
    this.animate();
  }

  private buildPointCloudObject(data: PointCloudData[]): void {
    // Remove existing object if any
    if (this.pointCloudObject) {
      this.scene.remove(this.pointCloudObject);
      this.pointCloudObject.geometry.dispose();
      (this.pointCloudObject.material as THREE.Material).dispose();
      this.pointCloudObject = null;
    }

    // Convert data to typed arrays
    const positions = new Float32Array(data.length * 3);
    for (let i = 0; i < data.length; i++) {
      positions[i * 3 + 0] = data[i].x;
      positions[i * 3 + 1] = data[i].y;
      positions[i * 3 + 2] = data[i].z;
    }

    // Build geometry
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();

    // Make a simple points material
    const material = new THREE.PointsMaterial({
      color: 0x00ff00,
      size: 1.0, // tweak for your scale
      sizeAttenuation: true,
    });

    // Create points object
    const points = new THREE.Points(geometry, material);
    this.pointCloudObject = points;
    this.scene.add(points);

    // Optionally, reposition the camera based on bounding sphere
    if (geometry.boundingSphere) {
      const r = geometry.boundingSphere.radius;
      this.camera.position.set(r * 1.5, r * 0.5, r * 2);
      this.camera.lookAt(0, 0, 0);
    }
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);

    // (Optional) rotate scene for a simple effect
    if (this.pointCloudObject) {
      this.pointCloudObject.rotation.y += 0.001;
    }

    this.renderer.render(this.scene, this.camera);
  };

  ngOnDestroy(): void {
    // Unsubscribe
    if (this.pointCloudSub) {
      this.pointCloudSub.unsubscribe();
    }

    // Cancel animation loop
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    // Clean up Three.js objects
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
    this.renderer.dispose();
  }
}
