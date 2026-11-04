import * as THREE from 'three';

export class OctagonArena {
  public root: THREE.Group;
  private matMesh!: THREE.Mesh;
  private fenceGroup: THREE.Group;
  private postsGroup: THREE.Group;
  private lightsGroup: THREE.Group;

  public arenaRadius: number = 9.0; // 3D world radius matching 18 units diameter
  public cageHeight: number = 2.6; // Cage height

  constructor() {
    this.root = new THREE.Group();
    this.root.name = 'OctagonArena3D';

    this.fenceGroup = new THREE.Group();
    this.postsGroup = new THREE.Group();
    this.lightsGroup = new THREE.Group();

    this.buildMat();
    this.buildCagePostsAndFencing();
    this.buildLighting();

    this.root.add(this.fenceGroup);
    this.root.add(this.postsGroup);
    this.root.add(this.lightsGroup);
  }

  /**
   * Generates a procedural high-friction canvas texture
   * with inner warning octagon lines and center circle emblem.
   */
  private createMatTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      // 1. Dark canvas / rubber high-friction floor
      ctx.fillStyle = '#09090b';
      ctx.fillRect(0, 0, 1024, 1024);

      // 2. High-friction texture micro-grit
      ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
      for (let i = 0; i < 6000; i++) {
        const x = Math.random() * 1024;
        const y = Math.random() * 1024;
        ctx.fillRect(x, y, 1.5, 1.5);
      }

      const centerX = 512;
      const centerY = 512;
      const sides = 8;
      const angleOffset = Math.PI / 8; // 22.5 deg rotation so flat sides align parallel

      // 3. Outer boundary warning ring (Red/Crimson line)
      const outerR = 480;
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 8;
      ctx.beginPath();
      for (let i = 0; i <= sides; i++) {
        const a = (i * 2 * Math.PI) / sides + angleOffset;
        const x = centerX + outerR * Math.cos(a);
        const y = centerY + outerR * Math.sin(a);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();

      // 4. Subtle inner cage apron line (Zinc-800)
      const innerR = 440;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = 0; i <= sides; i++) {
        const a = (i * 2 * Math.PI) / sides + angleOffset;
        const x = centerX + innerR * Math.cos(a);
        const y = centerY + innerR * Math.sin(a);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();

      // 5. Center Octagon Combat Ring
      const centerR = 170;
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      for (let i = 0; i <= sides; i++) {
        const a = (i * 2 * Math.PI) / sides + angleOffset;
        const x = centerX + centerR * Math.cos(a);
        const y = centerY + centerR * Math.sin(a);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();

      // Center crosshair / apex dots
      ctx.fillStyle = 'rgba(56, 189, 248, 0.5)';
      ctx.beginPath();
      ctx.arc(centerX, centerY, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  }

  /**
   * Builds the 8-sided regular polygonal mat mesh
   */
  private buildMat(): void {
    const matThickness = 0.4;
    // 8 radial segments gives an authentic regular octagon
    const matGeo = new THREE.CylinderGeometry(
      this.arenaRadius,
      this.arenaRadius + 0.3,
      matThickness,
      8
    );
    // Align flat sides parallel to view
    matGeo.rotateY(Math.PI / 8);

    const matTex = this.createMatTexture();
    const matMaterial = new THREE.MeshStandardMaterial({
      map: matTex,
      roughness: 0.85,
      metalness: 0.1,
    });

    this.matMesh = new THREE.Mesh(matGeo, matMaterial);
    this.matMesh.name = 'OctagonMatFloor';
    this.matMesh.position.y = -matThickness / 2; // Floor surface at Y = 0
    this.matMesh.receiveShadow = true;
    this.root.add(this.matMesh);

    // Dark stadium apron floor beneath the mat
    const apronGeo = new THREE.PlaneGeometry(60, 60);
    const apronMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#030305'),
      roughness: 0.95,
      metalness: 0.05,
    });
    const apronMesh = new THREE.Mesh(apronGeo, apronMat);
    apronMesh.rotation.x = -Math.PI / 2;
    apronMesh.position.y = -matThickness - 0.01;
    apronMesh.receiveShadow = true;
    this.root.add(apronMesh);
  }

  /**
   * Builds the 8 metallic posts, corner safety bumpers, and translucent wire fencing
   */
  private buildCagePostsAndFencing(): void {
    const sides = 8;
    const angleOffset = Math.PI / 8;
    const r = this.arenaRadius;
    const h = this.cageHeight;

    const postGeo = new THREE.CylinderGeometry(0.08, 0.09, h, 12);
    const postMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#27272a'),
      metalness: 0.85,
      roughness: 0.3,
    });

    const bumperGeo = new THREE.BoxGeometry(0.24, h * 0.9, 0.24);
    const redBumperMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#dc2626'),
      roughness: 0.4,
    });
    const blueBumperMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#2563eb'),
      roughness: 0.4,
    });
    const neutralBumperMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#18181b'),
      roughness: 0.5,
    });

    // Wire mesh texture for translucent chainlink fence
    const fenceCanvas = document.createElement('canvas');
    fenceCanvas.width = 64;
    fenceCanvas.height = 64;
    const fCtx = fenceCanvas.getContext('2d');
    if (fCtx) {
      fCtx.fillStyle = 'rgba(0,0,0,0)';
      fCtx.fillRect(0, 0, 64, 64);
      fCtx.strokeStyle = 'rgba(212, 212, 216, 0.55)';
      fCtx.lineWidth = 1.5;
      fCtx.beginPath();
      fCtx.moveTo(0, 0);
      fCtx.lineTo(64, 64);
      fCtx.moveTo(64, 0);
      fCtx.lineTo(0, 64);
      fCtx.stroke();
    }
    const fenceTex = new THREE.CanvasTexture(fenceCanvas);
    fenceTex.wrapS = THREE.RepeatWrapping;
    fenceTex.wrapT = THREE.RepeatWrapping;
    fenceTex.repeat.set(12, 6);

    const fenceMat = new THREE.MeshStandardMaterial({
      map: fenceTex,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      roughness: 0.5,
      metalness: 0.7,
      depthWrite: false,
    });

    const railMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#3f3f46'),
      metalness: 0.75,
      roughness: 0.25,
    });

    const vertices: THREE.Vector3[] = [];

    // Place 8 posts at each octagon vertex
    for (let i = 0; i < sides; i++) {
      const angle = (i * 2 * Math.PI) / sides + angleOffset;
      const x = r * Math.cos(angle);
      const z = r * Math.sin(angle);
      vertices.push(new THREE.Vector3(x, h / 2, z));

      const post = new THREE.Mesh(postGeo, postMat);
      post.position.set(x, h / 2, z);
      post.castShadow = true;
      this.postsGroup.add(post);

      // Corner foam bumper
      const bumperMat = i === 2 ? redBumperMat : i === 6 ? blueBumperMat : neutralBumperMat;
      const bumper = new THREE.Mesh(bumperGeo, bumperMat);
      bumper.position.set(x * 0.98, h * 0.45, z * 0.98);
      bumper.rotation.y = angle;
      bumper.castShadow = true;
      this.postsGroup.add(bumper);
    }

    // Connect vertices with fence panels and top rails
    for (let i = 0; i < sides; i++) {
      const nextIdx = (i + 1) % sides;
      const v1 = vertices[i];
      const v2 = vertices[nextIdx];

      const midX = (v1.x + v2.x) / 2;
      const midZ = (v1.z + v2.z) / 2;
      const panelLength = v1.distanceTo(v2);
      const angle = Math.atan2(v2.z - v1.z, v2.x - v1.x);

      // Fencing Plane
      const fencePanelGeo = new THREE.PlaneGeometry(panelLength, h);
      const fencePanel = new THREE.Mesh(fencePanelGeo, fenceMat);
      fencePanel.position.set(midX, h / 2, midZ);
      fencePanel.rotation.y = -angle;
      this.fenceGroup.add(fencePanel);

      // Top Steel Railing
      const railGeo = new THREE.CylinderGeometry(0.04, 0.04, panelLength, 8);
      railGeo.rotateZ(Math.PI / 2);
      const rail = new THREE.Mesh(railGeo, railMat);
      rail.position.set(midX, h, midZ);
      rail.rotation.y = -angle;
      rail.castShadow = true;
      this.postsGroup.add(rail);

      // Bottom kick bumper
      const bottomRailGeo = new THREE.CylinderGeometry(0.05, 0.05, panelLength, 8);
      bottomRailGeo.rotateZ(Math.PI / 2);
      const bottomRail = new THREE.Mesh(bottomRailGeo, railMat);
      bottomRail.position.set(midX, 0.08, midZ);
      bottomRail.rotation.y = -angle;
      this.postsGroup.add(bottomRail);
    }
  }

  /**
   * Sets up overhead lighting pipeline with soft contact shadows
   */
  private buildLighting(): void {
    // 1. Ambient lighting for clean base visibility
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.lightsGroup.add(ambientLight);

    // 2. Main directional overhead spotlight (casts soft contact shadows)
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.3);
    dirLight.position.set(4, 14, 5);
    dirLight.castShadow = true;

    // High quality shadow configuration
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 28;
    dirLight.shadow.bias = -0.0004;

    const shadowExtent = this.arenaRadius + 1;
    dirLight.shadow.camera.left = -shadowExtent;
    dirLight.shadow.camera.right = shadowExtent;
    dirLight.shadow.camera.top = shadowExtent;
    dirLight.shadow.camera.bottom = -shadowExtent;

    this.lightsGroup.add(dirLight);

    // 3. Four corner stadium spotlights pointing down into the octagon
    const spotPositions = [
      { x: -11, y: 12, z: -11, color: 0x38bdf8, intensity: 0.5 },
      { x: 11, y: 12, z: 11, color: 0xf59e0b, intensity: 0.5 },
      { x: -11, y: 12, z: 11, color: 0xffffff, intensity: 0.4 },
      { x: 11, y: 12, z: -11, color: 0xffffff, intensity: 0.4 },
    ];

    spotPositions.forEach((pos, idx) => {
      const spot = new THREE.SpotLight(pos.color, pos.intensity);
      spot.name = `ArenaSpot_${idx}`;
      spot.position.set(pos.x, pos.y, pos.z);
      spot.angle = Math.PI / 4;
      spot.penumbra = 0.6;
      spot.decay = 1.5;
      spot.distance = 32;
      spot.target.position.set(0, 0, 0);
      this.lightsGroup.add(spot);
      this.lightsGroup.add(spot.target);
    });
  }

  public dispose(): void {
    this.root.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.geometry?.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else {
          mesh.material?.dispose();
        }
      }
    });
  }
}
